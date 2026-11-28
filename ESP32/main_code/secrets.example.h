#pragma once

// Copy this file to secrets.h and fill in your local Wi-Fi and Firebase values.
// Never commit secrets.h to version control.

#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Firebase Realtime Database base URL (no trailing slash)
#define FIREBASE_DATABASE_URL "https://iot-air-purifier-8f165-default-rtdb.asia-southeast1.firebasedatabase.app"

// Optional: leave empty "" if using open test rules or authenticated token later
#define FIREBASE_AUTH_TOKEN ""

// Set to "AUTO" to use the ESP32's hardware-generated S/N (AERIS-XXXXXXXXXXXX)
// as the Firebase device ID, or set a custom ID like "aeris-living".
#define DEVICE_ID "AUTO"
