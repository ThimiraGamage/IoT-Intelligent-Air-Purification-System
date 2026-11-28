#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <SD.h>
#include <WiFi.h>
#include <Preferences.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <SensirionI2cSps30.h>
#include <SensirionI2cSht4x.h>

// Copy secrets.example.h -> secrets.h to set Firebase RTDB URL/token
#if __has_include("secrets.h")
#include "secrets.h"
#else
#include "secrets.example.h"
#endif

// --- Pin & timing configuration ---
#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22

// Standard ESP32 VSPI pins: SCK=18, MISO=19, MOSI=23, CS=5
#define SD_CS_PIN 5
#define SD_LOG_PATH "/air_quality_log.csv"

// Hold BOOT button (GPIO 0) for 3s to clear saved Wi-Fi and restart BLE provisioning
#define WIFI_RESET_PIN 0

// --- BLE GATT UUIDs (must match web-dashboard/src/services/ble.ts) ---
#define BLE_SERVICE_UUID      "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_CHAR_SERIAL_UUID  "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define BLE_CHAR_WIFI_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a9"
#define BLE_CHAR_STATUS_UUID  "beb5483e-36e1-4688-b7f5-ea07361b26aa"

static const unsigned long SAMPLE_INTERVAL_MS = 5000;   // 5s live cadence (matches web UI)
static const unsigned long HISTORY_INTERVAL_MS = 60000; // 60s history snapshot to RTDB
static const unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000;
static const unsigned long WIFI_RETRY_MS = 20000;

SensirionI2cSps30 sps30;
SensirionI2cSht4x sht4x;
Preferences prefs;

static BLECharacteristic* pSerialChar = nullptr;
static BLECharacteristic* pWifiChar = nullptr;
static BLECharacteristic* pStatusChar = nullptr;
static bool bleAdvertising = false;

static char errorMessage[64];
static int16_t error;

static bool sht41Available = false;
static bool sps30Available = false;
static bool sdCardReady = false;
static bool ntpConfigured = false;

static volatile bool pendingBleProvision = false;
static String pendingSsid = "";
static String pendingPass = "";

static String deviceSerial = "";
static String activeDeviceId = "";
static String savedSsid = "";
static String savedPass = "";

static unsigned long lastSampleMs = 0;
static unsigned long lastHistoryMs = 0;
static unsigned long lastWifiRetryMs = 0;
static unsigned long resetHoldStartMs = 0;

struct SensorSnapshot {
  bool sht41Ok;
  float temperature;
  float humidity;

  bool sps30Ok;
  float mc1p0;
  float mc2p5;
  float mc4p0;
  float mc10p0;
  float pm0p3To1p0;
  float pm1p0To2p5;
  float pm2p5To4p0;
  float pm4p0To10p0;
  float typicalParticleSize;
};

static String generateDeviceSerial() {
  uint64_t chipMac = ESP.getEfuseMac();
  char buf[20];
  snprintf(
    buf,
    sizeof(buf),
    "AERIS-%04X%08X",
    static_cast<uint16_t>((chipMac >> 32) & 0xFFFF),
    static_cast<uint32_t>(chipMac & 0xFFFFFFFF)
  );
  return String(buf);
}

static void notifyBleStatus(const String& status) {
  if (!pStatusChar) return;
  pStatusChar->setValue(status.c_str());
  pStatusChar->notify();
  Serial.println("BLE Status -> " + status);
}

static String extractJsonField(const String& json, const String& key) {
  String pattern = "\"" + key + "\"";
  int keyIdx = json.indexOf(pattern);
  if (keyIdx < 0) return "";
  int colonIdx = json.indexOf(':', keyIdx + pattern.length());
  if (colonIdx < 0) return "";
  int firstQuote = json.indexOf('"', colonIdx + 1);
  if (firstQuote < 0) return "";
  int secondQuote = firstQuote + 1;
  while (secondQuote < static_cast<int>(json.length())) {
    if (json[secondQuote] == '"' && json[secondQuote - 1] != '\\') break;
    secondQuote++;
  }
  if (secondQuote >= static_cast<int>(json.length())) return "";
  return json.substring(firstQuote + 1, secondQuote);
}

class WifiWriteCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) override {
    String raw = pCharacteristic->getValue().c_str();
    raw.trim();
    if (raw.isEmpty()) return;

    String ssid;
    String pass;
    if (raw.startsWith("{")) {
      ssid = extractJsonField(raw, "ssid");
      pass = extractJsonField(raw, "password");
    } else {
      int sep = raw.indexOf('\n');
      if (sep >= 0) {
        ssid = raw.substring(0, sep);
        pass = raw.substring(sep + 1);
      } else {
        ssid = raw;
      }
    }
    ssid.trim();
    pass.trim();

    if (!ssid.isEmpty()) {
      pendingSsid = ssid;
      pendingPass = pass;
      pendingBleProvision = true;
    }
  }
};

class AerisBleServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    (void)pServer;
    Serial.println("BLE client connected.");
  }
  void onDisconnect(BLEServer* pServer) override {
    (void)pServer;
    Serial.println("BLE client disconnected.");
    if (WiFi.status() != WL_CONNECTED) {
      BLEDevice::startAdvertising();
    }
  }
};

static void startBleProvisioning() {
  if (bleAdvertising) {
    BLEDevice::startAdvertising();
    return;
  }

  String bleName = "Aeris-" + deviceSerial.substring(deviceSerial.length() - 4);
  BLEDevice::init(bleName.c_str());
  BLEServer* pServer = BLEDevice::createServer();
  pServer->setCallbacks(new AerisBleServerCallbacks());

  BLEService* pService = pServer->createService(BLE_SERVICE_UUID);

  pSerialChar = pService->createCharacteristic(
    BLE_CHAR_SERIAL_UUID,
    BLECharacteristic::PROPERTY_READ
  );
  pSerialChar->setValue(activeDeviceId.c_str());

  pWifiChar = pService->createCharacteristic(
    BLE_CHAR_WIFI_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pWifiChar->setCallbacks(new WifiWriteCallback());

  pStatusChar = pService->createCharacteristic(
    BLE_CHAR_STATUS_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pStatusChar->addDescriptor(new BLE2902());
  String initialStatus = "READY|" + activeDeviceId;
  pStatusChar->setValue(initialStatus.c_str());

  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  BLEDevice::startAdvertising();

  bleAdvertising = true;
  Serial.printf("BLE Provisioning active: %s (S/N: %s)\n", bleName.c_str(), activeDeviceId.c_str());
}

static String getIsoUtcTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 10)) {
    return "";
  }
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}

static void loadWifiCredentials() {
  prefs.begin("aeris-wifi", true);
  savedSsid = prefs.getString("ssid", "");
  savedPass = prefs.getString("pass", "");
  prefs.end();

  if (savedSsid.isEmpty() && String(WIFI_SSID) != "YOUR_WIFI_SSID") {
    savedSsid = String(WIFI_SSID);
    savedPass = String(WIFI_PASSWORD);
  }
}

static void saveWifiCredentials(const String& ssid, const String& pass) {
  prefs.begin("aeris-wifi", false);
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  prefs.end();
  savedSsid = ssid;
  savedPass = pass;
}

static void clearWifiCredentials() {
  prefs.begin("aeris-wifi", false);
  prefs.clear();
  prefs.end();
  savedSsid = "";
  savedPass = "";
}

static bool connectSta(const String& ssid, const String& pass) {
  if (ssid.isEmpty()) return false;

  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), pass.c_str());

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi connected! IP: ");
    Serial.println(WiFi.localIP());
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    ntpConfigured = true;
    return true;
  }

  Serial.println("Wi-Fi connection failed.");
  return false;
}

static void initSdCard() {
  if (!SD.begin(SD_CS_PIN)) {
    Serial.println("SD card init failed (check wiring/card). Continuing without SD.");
    sdCardReady = false;
    return;
  }

  sdCardReady = true;
  if (!SD.exists(SD_LOG_PATH)) {
    File file = SD.open(SD_LOG_PATH, FILE_WRITE);
    if (file) {
      file.println(
        "uptime_ms,iso_utc,sht41_ok,temperature_c,humidity_rh,"
        "sps30_ok,pm1_0_ug_m3,pm2_5_ug_m3,pm4_0_ug_m3,pm10_0_ug_m3,"
        "pm_0p3_1p0,pm_1p0_2p5,pm_2p5_4p0,pm_4p0_10p0,typical_size_um"
      );
      file.close();
      Serial.println("SD card ready. Created " SD_LOG_PATH);
    } else {
      Serial.println("SD card warning: failed to create log header.");
    }
  } else {
    Serial.println("SD card ready. Appending to " SD_LOG_PATH);
  }
}

static void logToSdCard(const SensorSnapshot& s, unsigned long uptimeMs, const String& isoUtc) {
  if (!sdCardReady) return;

  File file = SD.open(SD_LOG_PATH, FILE_APPEND);
  if (!file) {
    Serial.println("SD write error: could not open " SD_LOG_PATH);
    return;
  }

  file.printf(
    "%lu,%s,%d,%.2f,%.2f,%d,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f\n",
    uptimeMs,
    isoUtc.c_str(),
    s.sht41Ok ? 1 : 0,
    s.temperature,
    s.humidity,
    s.sps30Ok ? 1 : 0,
    s.mc1p0,
    s.mc2p5,
    s.mc4p0,
    s.mc10p0,
    s.pm0p3To1p0,
    s.pm1p0To2p5,
    s.pm2p5To4p0,
    s.pm4p0To10p0,
    s.typicalParticleSize
  );
  file.close();
}

static void ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!ntpConfigured) {
      Serial.print("Wi-Fi connected! IP: ");
      Serial.println(WiFi.localIP());
      configTime(0, 0, "pool.ntp.org", "time.nist.gov");
      ntpConfigured = true;
    }
    return;
  }

  if (savedSsid.isEmpty()) return;

  unsigned long now = millis();
  if (now - lastWifiRetryMs < WIFI_RETRY_MS && lastWifiRetryMs != 0) {
    return;
  }
  lastWifiRetryMs = now;
  WiFi.begin(savedSsid.c_str(), savedPass.c_str());
}

static String buildFirebaseUrl(const String& path) {
  String url = String(FIREBASE_DATABASE_URL) + path + ".json";
  if (strlen(FIREBASE_AUTH_TOKEN) > 0) {
    url += "?auth=" + String(FIREBASE_AUTH_TOKEN);
  }
  return url;
}

static String buildLivePayload(const SensorSnapshot& s, unsigned long uptimeMs, const String& isoUtc) {
  String json = "{";
  json += "\"deviceId\":\"" + activeDeviceId + "\",";
  json += "\"serialNumber\":\"" + deviceSerial + "\",";
  json += "\"uptimeMs\":" + String(uptimeMs) + ",";
  if (isoUtc.length() > 0) {
    json += "\"updatedAt\":\"" + isoUtc + "\",";
  }

  json += "\"sensors\":{";
  json += "\"pm1\":" + (s.sps30Ok ? String(s.mc1p0, 2) : String("null")) + ",";
  json += "\"pm25\":" + (s.sps30Ok ? String(s.mc2p5, 2) : String("null")) + ",";
  json += "\"pm4\":" + (s.sps30Ok ? String(s.mc4p0, 2) : String("null")) + ",";
  json += "\"pm10\":" + (s.sps30Ok ? String(s.mc10p0, 2) : String("null")) + ",";
  json += "\"temperature\":" + (s.sht41Ok ? String(s.temperature, 2) : String("null")) + ",";
  json += "\"humidity\":" + (s.sht41Ok ? String(s.humidity, 2) : String("null")) + ",";
  json += "\"typicalParticleSize\":" + (s.sps30Ok ? String(s.typicalParticleSize, 2) : String("null"));
  json += "},";

  json += "\"available\":{";
  json += "\"pm1\":" + String(s.sps30Ok ? "true" : "false") + ",";
  json += "\"pm25\":" + String(s.sps30Ok ? "true" : "false") + ",";
  json += "\"pm10\":" + String(s.sps30Ok ? "true" : "false") + ",";
  json += "\"temperature\":" + String(s.sht41Ok ? "true" : "false") + ",";
  json += "\"humidity\":" + String(s.sht41Ok ? "true" : "false") + ",";
  json += "\"co2\":false,";
  json += "\"tvoc\":false";
  json += "},";

  json += "\"sdCard\":{";
  json += "\"ready\":" + String(sdCardReady ? "true" : "false") + ",";
  json += "\"logFile\":\"" SD_LOG_PATH "\"";
  json += "}";

  json += "}";
  return json;
}

static void sendToFirebase(const String& method, const String& path, const String& payload) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(10000);
  String url = buildFirebaseUrl(path);
  if (!http.begin(client, url)) {
    Serial.println("Firebase HTTP begin failed.");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  int httpCode = (method == "PUT") ? http.PUT(payload) : http.POST(payload);
  String response = http.getString();
  if (httpCode <= 0 || httpCode >= 400) {
    Serial.printf("Firebase %s error (%d): %s | %s\n",
                  method.c_str(), httpCode, http.errorToString(httpCode).c_str(), response.c_str());
  } else {
    Serial.printf("Firebase %s OK (%d) -> %s\n", method.c_str(), httpCode, path.c_str());
  }
  http.end();
}

static SensorSnapshot readAllSensors() {
  SensorSnapshot s = {};

  if (sht41Available) {
    error = sht4x.measureHighPrecision(s.temperature, s.humidity);
    if (error != 0) {
      Serial.print("SHT41 read error: ");
      errorToString(error, errorMessage, sizeof(errorMessage));
      Serial.println(errorMessage);
      s.sht41Ok = false;
    } else {
      s.sht41Ok = true;
      Serial.printf("Temp: %.2f C | Humidity: %.2f %%RH\n", s.temperature, s.humidity);
    }
  }

  if (sps30Available) {
    uint16_t dataReadyFlag = 0;
    error = sps30.readDataReadyFlag(dataReadyFlag);
    if (error != 0) {
      Serial.print("SPS30 flag error: ");
      errorToString(error, errorMessage, sizeof(errorMessage));
      Serial.println(errorMessage);
    } else if (dataReadyFlag) {
      float nc0p5, nc1p0, nc2p5, nc4p0, nc10p0;
      error = sps30.readMeasurementValuesFloat(
        s.mc1p0, s.mc2p5, s.mc4p0, s.mc10p0,
        nc0p5, nc1p0, nc2p5, nc4p0, nc10p0,
        s.typicalParticleSize
      );
      if (error != 0) {
        Serial.print("SPS30 read error: ");
        errorToString(error, errorMessage, sizeof(errorMessage));
        Serial.println(errorMessage);
      } else {
        s.sps30Ok = true;
        s.pm0p3To1p0 = fmaxf(0.0f, s.mc1p0);
        s.pm1p0To2p5 = fmaxf(0.0f, s.mc2p5 - s.mc1p0);
        s.pm2p5To4p0 = fmaxf(0.0f, s.mc4p0 - s.mc2p5);
        s.pm4p0To10p0 = fmaxf(0.0f, s.mc10p0 - s.mc4p0);

        Serial.printf("PM1.0: %.2f | PM2.5: %.2f | PM4.0: %.2f | PM10: %.2f ug/m3\n",
                      s.mc1p0, s.mc2p5, s.mc4p0, s.mc10p0);
        Serial.printf("Typical Particle Size: %.2f um\n", s.typicalParticleSize);
      }
    }
  }

  return s;
}

static void handlePendingBleProvision() {
  if (!pendingBleProvision) return;
  pendingBleProvision = false;

  notifyBleStatus("CONNECTING");
  if (connectSta(pendingSsid, pendingPass)) {
    saveWifiCredentials(pendingSsid, pendingPass);
    notifyBleStatus("CONNECTED|" + activeDeviceId + "|" + WiFi.localIP().toString());
  } else {
    notifyBleStatus("FAILED");
    BLEDevice::startAdvertising();
  }
}

static void checkWifiResetButton() {
  if (digitalRead(WIFI_RESET_PIN) == LOW) {
    if (resetHoldStartMs == 0) {
      resetHoldStartMs = millis();
    } else if (millis() - resetHoldStartMs >= 3000) {
      Serial.println("BOOT button held 3s: clearing saved Wi-Fi and starting BLE discovery...");
      clearWifiCredentials();
      WiFi.disconnect(true);
      ntpConfigured = false;
      startBleProvisioning();
      notifyBleStatus("READY|" + activeDeviceId);
      resetHoldStartMs = 0;
    }
  } else {
    resetHoldStartMs = 0;
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(WIFI_RESET_PIN, INPUT_PULLUP);

  deviceSerial = generateDeviceSerial();
  activeDeviceId =
    (strlen(DEVICE_ID) == 0 || String(DEVICE_ID) == "AUTO")
      ? deviceSerial
      : String(DEVICE_ID);
  Serial.printf("Device S/N: %s (RTDB ID: %s)\n", deviceSerial.c_str(), activeDeviceId.c_str());

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  sht4x.begin(Wire, 0x44);
  uint32_t serialNumber = 0;
  error = sht4x.serialNumber(serialNumber);
  if (error != 0) {
    Serial.print("SHT41 init error: ");
    errorToString(error, errorMessage, sizeof(errorMessage));
    Serial.println(errorMessage);
    sht41Available = false;
  } else {
    sht41Available = true;
    Serial.printf("SHT41 ready (Serial: 0x%08X)\n", serialNumber);
  }

  sps30.begin(Wire, SPS30_I2C_ADDR_69);
  sps30.stopMeasurement();
  error = sps30.startMeasurement(SPS30_OUTPUT_FORMAT_OUTPUT_FORMAT_FLOAT);
  if (error != 0) {
    Serial.print("SPS30 start error: ");
    errorToString(error, errorMessage, sizeof(errorMessage));
    Serial.println(errorMessage);
    sps30Available = false;
  } else {
    sps30Available = true;
    Serial.println("SPS30 ready.");
  }

  initSdCard();

  // Always start BLE provisioning service so the web app can auto-discover this device,
  // and connect to saved Wi-Fi if already provisioned.
  loadWifiCredentials();
  startBleProvisioning();
  if (connectSta(savedSsid, savedPass)) {
    notifyBleStatus("CONNECTED|" + activeDeviceId + "|" + WiFi.localIP().toString());
  }

  Serial.println("Setup complete. Waiting for sensors to stabilize...\n");
  delay(2000);
}

void loop() {
  checkWifiResetButton();
  handlePendingBleProvision();
  ensureWifiConnected();

  unsigned long now = millis();
  if (now - lastSampleMs < SAMPLE_INTERVAL_MS && lastSampleMs != 0) {
    delay(20);
    return;
  }
  lastSampleMs = now;

  SensorSnapshot snapshot = readAllSensors();
  String isoUtc = getIsoUtcTimestamp();

  logToSdCard(snapshot, now, isoUtc);

  if (WiFi.status() == WL_CONNECTED) {
    String livePayload = buildLivePayload(snapshot, now, isoUtc);
    sendToFirebase("PUT", "/devices/" + activeDeviceId + "/live", livePayload);

    if (now - lastHistoryMs >= HISTORY_INTERVAL_MS || lastHistoryMs == 0) {
      lastHistoryMs = now;
      sendToFirebase("POST", "/devices/" + activeDeviceId + "/history", livePayload);
    }
  }

  Serial.println("--------------------------------------------------");
}
