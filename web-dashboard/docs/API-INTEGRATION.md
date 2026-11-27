# Backend and hardware integration

## Current boundary

`src/hooks/useApp.tsx` consumes `DemoAirService`. The service supplies immutable snapshots, subscriptions, typed device actions, and periodically refreshed data. All telemetry, command acknowledgements, pairing, forecasts/insights, energy readings, and historical data are simulated. Browser-local settings are stored under `aeris.dashboard.v1`. No backend or physical purifier is contacted.

`src/services/api.ts` defines the future `BackendApi`, telemetry envelope, command request, and acknowledgement types. Implement an adapter there and replace the service instantiated by `AppProvider`; keep the frontend `AppContextValue` contract to preserve pages.

```text
ESP32 + calibrated sensors + hardware interlocks
    ↕ MQTT over TLS, unique device identity and topic ACLs
Node.js / Express ingestion and command service
    ↕ MongoDB time-series collections, command/event audit log
    ↕ Authenticated REST + WebSocket
React dashboard
```

The browser must never connect to a public MQTT broker with shared credentials. Keep database passwords, signing keys, broker credentials, and Wi-Fi credentials in server-side or device provisioning storage. `VITE_*` values are public. Use HTTPS/WSS in production; the `.env.example` WebSocket URL is for local backend development only.

## Suggested REST contract

| Method                | Route                                                 | Behaviour                                                                             |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| GET                   | `/api/v1/devices`                                     | Authenticated owner's devices and last reported state                                 |
| POST                  | `/api/v1/devices/pair`                                | Exchange short-lived device pairing proof; rate limit and bind ownership              |
| PATCH                 | `/api/v1/devices/:id`                                 | Validate owner and editable room/name metadata                                        |
| GET                   | `/api/v1/devices/:id/telemetry?from=&to=&resolution=` | UTC timestamps, calibrated values, units, quality flags, pagination                   |
| POST                  | `/api/v1/devices/:id/commands`                        | Validate command and authorization; return 202 pending with command ID                |
| GET                   | `/api/v1/devices/:id/commands/:commandId`             | Pending, confirmed, rejected, or timed-out command state                              |
| GET/POST/PATCH/DELETE | `/api/v1/automations`                                 | Durable, owner-scoped rules executed server-side                                      |
| GET/PATCH             | `/api/v1/preferences`                                 | Profile, localization, tariff, theme, and notification preferences                    |
| GET/POST              | `/api/v1/devices/:id/maintenance`                     | Durable replacement and cleaning events                                               |
| GET                   | `/api/v1/events`                                      | Upgrade authenticated WebSocket for telemetry, presence, alerts, and acknowledgements |

Example telemetry:

```json
{
  "schemaVersion": 1,
  "type": "telemetry",
  "deviceId": "owned-device-id",
  "sequence": 1582,
  "sampledAt": "2026-11-27T14:30:00.000Z",
  "receivedAt": "2026-11-27T14:30:00.250Z",
  "source": "esp32",
  "values": {
    "pm1": 2.8,
    "pm25": 4.3,
    "pm10": 12.3,
    "co2": 648,
    "tvoc": 108,
    "temperature": 24.6,
    "humidity": 48
  },
  "sensorHealth": { "pm25": "ok", "co2": "ok", "tvoc": "warming" }
}
```

This JSON is an example contract, not measured data. The real payload should also carry sensor model/calibration provenance and explicit measurement units. A `measuredPowerWatts` field is optional; when absent, energy must remain labelled estimated. Deduplicate sequence numbers, reject malformed frames, track clock skew, and distinguish sampled time from receive time. Keep unavailable or stale readings visible with quality labels; never silently invent missing real measurements.

## Command and safety model

An HTTP success or MQTT publish confirms receipt by an intermediary, not execution by the purifier. Send a unique idempotency ID, target device, expiry, and desired fields. Keep requested state separate from device-reported state until an authenticated matching acknowledgement arrives. Revalidate permissions and device safety at execution, time out commands, and handle reordered/duplicate acknowledgements. Do not retry hazardous operations blindly after a reconnect.

UV-C must have independent physical enclosure/door interlocks and hardware fail-safe power control. Device firmware must reject UV-C when the interlock is open, and immediately switch it off if the enclosure opens. Neither a browser setting nor an automation may disable those protections. Frontend indicators merely reflect reported interlock state. The simulator rejects UV-C with an open interlock or power off, revalidates before acknowledgement, and turns UV-C off with purifier power.

The demo tracks pending commands independently per device. Switching devices cannot redirect an acknowledgement, and a device can have only one pending mock command. Auto mode simulates firmware fan adjustment from the most recent PM2.5 sample (product demo thresholds, not exposure limits). Sleep mode sets fan level 1 and brightness 20%; turning power off stops simulated UV-C and aroma diffusion.

## Automation and machine learning

Demo rules are browser-local, apply to the currently selected purifier, and run only while the application is open. Thresholds are evaluated every five seconds. A ten-minute cooldown prevents repeated alerts; a time rule uses the browser's local clock and a twenty-hour cooldown. A real backend should store device targeting and IANA timezone explicitly, deduplicate executions, handle daylight saving transitions, validate command capabilities, and execute schedules when the UI is closed.

There is no trained ML model in this project. Demo insights illustrate future presentation only. Before exposing real predictions, version the model and training data, evaluate forecast accuracy and uncertainty, monitor drift, and label prediction horizon/provenance. Do not derive individual hazardous chemical concentrations from a general TVOC response.

## Authentication and deployment

Login, registration, and recovery screens are demonstrations. Implement a real identity provider or hardened backend authentication with server-validated sessions, secure HttpOnly cookies, CSRF defenses where applicable, authorization per device, rate limits, and genuine password-reset email delivery. Do not save production tokens or passwords in localStorage.

For static hosting, build `dist/`, serve over HTTPS, and rewrite frontend routes to `/index.html`. Configure CSP appropriate to local assets and API origin, security headers, dependency updates, and error monitoring. No database, broker, Express server, email service, or deployment is included.
