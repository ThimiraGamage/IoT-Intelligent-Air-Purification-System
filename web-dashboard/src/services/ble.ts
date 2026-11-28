export const AERIS_BLE_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
export const AERIS_BLE_SERIAL_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
export const AERIS_BLE_WIFI_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a9";
export const AERIS_BLE_STATUS_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26aa";

interface BleCharacteristicLike {
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BleCharacteristicLike>;
  addEventListener(
    type: string,
    listener: (event: Event) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: (event: Event) => void,
  ): void;
  value?: DataView;
}

interface BleServiceLike {
  getCharacteristic(uuid: string): Promise<BleCharacteristicLike>;
}

interface BleServerLike {
  connected: boolean;
  connect(): Promise<BleServerLike>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BleServiceLike>;
}

export interface BleDeviceHandle {
  name?: string;
  gatt?: BleServerLike;
}

interface NavigatorBluetooth {
  requestDevice(options: {
    filters: Array<{ namePrefix?: string; services?: string[] }>;
    optionalServices?: string[];
  }): Promise<BleDeviceHandle>;
}

export interface DiscoveredAerisDevice {
  device: BleDeviceHandle;
  serialNumber: string;
  bleName: string;
}

export function isWebBluetoothSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "bluetooth" in navigator &&
    typeof (navigator as unknown as { bluetooth?: NavigatorBluetooth })
      .bluetooth?.requestDevice === "function"
  );
}

const decodeText = (view: DataView | undefined): string => {
  if (!view) return "";
  return new TextDecoder().decode(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)).trim();
};

export async function discoverAerisOverBluetooth(): Promise<DiscoveredAerisDevice> {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      "Web Bluetooth is not supported in this browser. Use Chrome or Edge on desktop/Android over HTTPS or localhost.",
    );
  }
  const bluetooth = (navigator as unknown as { bluetooth: NavigatorBluetooth })
    .bluetooth;

  const device = await bluetooth.requestDevice({
    filters: [{ namePrefix: "Aeris-" }, { services: [AERIS_BLE_SERVICE_UUID] }],
    optionalServices: [AERIS_BLE_SERVICE_UUID],
  });

  if (!device.gatt) {
    throw new Error("Selected Bluetooth device does not expose GATT.");
  }

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(AERIS_BLE_SERVICE_UUID);
  const serialChar = await service.getCharacteristic(AERIS_BLE_SERIAL_UUID);
  const serialValue = await serialChar.readValue();
  const serialNumber = decodeText(serialValue).toUpperCase();

  if (!serialNumber) {
    throw new Error("Could not read Serial Number from the ESP32 device.");
  }

  return {
    device,
    serialNumber,
    bleName: device.name || serialNumber,
  };
}

export async function provisionWifiOverBluetooth(
  device: BleDeviceHandle,
  ssid: string,
  password: string,
  onStatus?: (status: string) => void,
): Promise<{ serialNumber: string; ip?: string }> {
  if (!device.gatt) {
    throw new Error("Bluetooth GATT connection is unavailable.");
  }

  const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
  const service = await server.getPrimaryService(AERIS_BLE_SERVICE_UUID);
  const wifiChar = await service.getCharacteristic(AERIS_BLE_WIFI_UUID);
  const statusChar = await service.getCharacteristic(AERIS_BLE_STATUS_UUID);

  await statusChar.startNotifications();

  return await new Promise<{ serialNumber: string; ip?: string }>(
    (resolve, reject) => {
      const timeout = setTimeout(() => {
        statusChar.removeEventListener("characteristicvaluechanged", onNotify);
        reject(
          new Error(
            "Timed out waiting for ESP32 Wi-Fi confirmation. Verify 2.4 GHz SSID/password.",
          ),
        );
      }, 25000);

      const onNotify = (event: Event) => {
        const target = event.target as unknown as BleCharacteristicLike | null;
        const msg = decodeText(target?.value);
        if (!msg) return;
        onStatus?.(msg);

        if (msg.startsWith("CONNECTED|")) {
          clearTimeout(timeout);
          statusChar.removeEventListener("characteristicvaluechanged", onNotify);
          const [, serialNumber = "", ip] = msg.split("|");
          resolve({ serialNumber, ip });
        } else if (msg === "FAILED") {
          clearTimeout(timeout);
          statusChar.removeEventListener("characteristicvaluechanged", onNotify);
          reject(
            new Error(
              "ESP32 failed to connect to Wi-Fi. Check the 2.4 GHz SSID and password.",
            ),
          );
        }
      };

      statusChar.addEventListener("characteristicvaluechanged", onNotify);

      const payload = new TextEncoder().encode(
        JSON.stringify({ ssid: ssid.trim(), password }),
      );
      wifiChar.writeValue(payload).catch((err: unknown) => {
        clearTimeout(timeout);
        statusChar.removeEventListener("characteristicvaluechanged", onNotify);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    },
  );
}
