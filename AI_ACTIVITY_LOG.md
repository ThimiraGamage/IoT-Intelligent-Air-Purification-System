# AI Bot Activity Log

This file tracks work performed with AI coding assistants/bots across the **IoT-Intelligent-Air-Purification-System** repository.

## How to Update

Add a new row to the log table (or a detailed entry below it) whenever an AI bot generates, modifies, or reviews code, documentation, or configuration in this repository:

- **Date**: ISO date (`YYYY-MM-DD`)
- **Developer**: Git author / team member supervising or prompting the AI bot
- **AI Bot / Model**: Name of the AI assistant/tool and model used (e.g., `Antigravity (Gemini 4 Hydrogen (Medium))`, `GitHub Copilot`, `ChatGPT`, etc.)
- **Branch / Scope**: Git branch and affected directory or module
- **What Was Done**: Concise summary of changes made by the AI bot

---

## Activity Log

| Date | Developer | AI Bot / Model | Branch / Scope | What Was Done |
| :--- | :--- | :--- | :--- | :--- |
| 2026-11-28 | Sasmitha Fernando | Antigravity (`Gemini 4 Hydrogen (Medium)`) | `feature/aeris-web-dashboard` · `web-dashboard/` | Updated Vite dev script to bind `localhost:5173` (authorized by default in Firebase Auth), added clear `auth/unauthorized-domain` guidance in `Auth.tsx`, and ensured Google/email sign-in saves user profiles to `/users/{uid}/profile` in Firebase RTDB. |
| 2026-11-28 | Sasmitha Fernando | Antigravity (`Gemini 4 Hydrogen (Medium)`) | `feature/aeris-web-dashboard` · `web-dashboard/` | Replaced remaining `"demo"` / `"Create a demo profile"` / `"DEMONSTRATION PAIRING"` / `"Demo telemetry"` UI copy across `Auth.tsx`, `Devices.tsx`, `Settings.tsx`, `Monitoring.tsx`, `Overview.tsx`, and `Layout.tsx` with production-ready account and live telemetry wording. |
| 2026-11-28 | Sasmitha Fernando | Antigravity (`Gemini 4 Hydrogen (Medium)`) | `feature/aeris-web-dashboard` · `web-dashboard/` | Added Google Sign-In (`GoogleAuthProvider` + `signInWithPopup`) alongside Email/Password in `firebase.ts` and `Auth.tsx`. |
| 2026-11-28 | Sasmitha Fernando | Antigravity (`Gemini 4 Hydrogen (Medium)`) | `feature/aeris-web-dashboard` · `web-dashboard/` | Enabled open guest access to the simulated presentation dashboard (`Layout.tsx`, `demoService.ts`) without requiring an account, while signed-in Firebase accounts load their own connected ESP32 purifiers and live RTDB telemetry. |
| 2026-11-28 | Sasmitha Fernando | Antigravity (`Gemini 4 Hydrogen (Medium)`) | `feature/aeris-web-dashboard` · `web-dashboard/` | Implemented account-first buyer onboarding flow: unauthenticated users are directed to Firebase Login/Register (`Layout.tsx`), signed-in accounts load only their own `/users/{uid}/devices` from Firebase RTDB (`demoService.ts`), users with 0 devices are guided to connect via Bluetooth auto-discovery or manual S/N entry (`Devices.tsx`), and selecting a connected device opens all dashboard features. |
| 2026-11-28 | Sasmitha Fernando | Antigravity (`Gemini 4 Hydrogen (Medium)`) | `feature/aeris-web-dashboard` · `web-dashboard/` | Removed Demo Mode UI/flows across `Auth.tsx`, `Devices.tsx`, `Layout.tsx`, `Overview.tsx`, and `Settings.tsx`; wired Firebase Authentication for user login, Bluetooth/S/N device registration, live ESP32 readings, and full settings persistence under `/users/{uid}/settings` in Firebase RTDB. |
| 2026-11-28 | Sasmitha Fernando | Antigravity (`Gemini 4 Hydrogen (Medium)`) | `feature/aeris-web-dashboard` · `web-dashboard/` | Synced Firebase-authenticated user profiles and registered ESP32 devices (`/users/{uid}/devices/{S/N}`) with `DemoAirService` so all ESP32 telemetry lives in the shared `/devices/{S/N}` RTDB path while user accounts store and restore their own paired devices across logins. |
| 2026-11-28 | Sasmitha Fernando | Antigravity (`Gemini 4 Hydrogen (Medium)`) | `feature/aeris-web-dashboard` · `firebase.json`, `ESP32/`, `web-dashboard/` | Added Firebase Hosting config (`firebase.json`, `.firebaserc`), replaced ESP32 open-Wi-Fi AP with BLE GATT provisioning (`Aeris-XXXX` service/serial/wifi/status characteristics), added Firebase Authentication (`Auth.tsx`, `firebase.ts`) and iCSee-style Web Bluetooth auto-discovery & Wi-Fi provisioning wizard (`ble.ts`, `Devices.tsx`) with user device registration in RTDB. |
| 2026-11-28 | Sasmitha Fernando | Antigravity (`Gemini 4 Hydrogen (Medium)`) | `feature/aeris-web-dashboard` · `ESP32/` | Added open Wi-Fi captive portal (`Aeris-Setup-XXXX` at `192.168.4.1`) with Wi-Fi network scan, SSID/password setup form, NVS persistence (`Preferences`), BOOT-button Wi-Fi reset, and post-connect Device S/N display page to `ESP32/main_code/main_code.ino`. |
| 2026-11-28 | Sasmitha Fernando | Antigravity (`Gemini 4 Hydrogen (Medium)`) | `feature/aeris-web-dashboard` · `ESP32/` & `web-dashboard/` | Added hardware eFuse MAC S/N generator (`AERIS-XXXXXXXXXXXX`) to `ESP32/main_code/main_code.ino` (with `DEVICE_ID "AUTO"` default in `secrets.example.h`) and updated `Devices.tsx` + `DemoAirService` to pair ESP32 devices by S/N and subscribe to their live Firebase RTDB stream. |
| 2026-11-28 | Sasmitha Fernando | Antigravity (`Gemini 4 Hydrogen (Medium)`) | `feature/aeris-web-dashboard` · `ESP32/` & `web-dashboard/` | Updated `ESP32/main_code/main_code.ino` to log all SHT41/SPS30 readings to an SPI SD card (`/air_quality_log.csv`), track per-sensor availability, and push 5s live / 60s history payloads to Firebase RTDB using gitignored `secrets.h` (`secrets.example.h` template). Wired `DemoAirService` to subscribe to RTDB live readings and updated `Overview`, `Monitoring`, and `SensorCard` to dynamically adapt to available sensors. |
| 2026-11-28 | Sasmitha Fernando | Antigravity (`Gemini 4 Hydrogen (Medium)`) | `feature/aeris-web-dashboard` · `web-dashboard/` | Installed `firebase` SDK, added Firebase Realtime Database configuration to gitignored `web-dashboard/.env` and placeholder keys to `web-dashboard/.env.example`, added `VITE_FIREBASE_*` env typings in `web-dashboard/src/vite-env.d.ts`, created `web-dashboard/src/services/firebase.ts` (RTDB + optional Analytics) and `web-dashboard/src/services/firebase.test.ts` with no hardcoded API keys in source. |
| 2026-11-28 | Sasmitha Fernando | Antigravity (`Gemini 4 Hydrogen (Medium)`) | `feature/aeris-web-dashboard` · `AI_ACTIVITY_LOG.md` | Created and initialized `AI_ACTIVITY_LOG.md` to track date, developer, AI bot/model, and AI-assisted changes across the project. |
| 2026-11-28 | Thimira Gamage | *Not recorded in git* | `feature/aeris-web-dashboard` · `web-dashboard/` | Added the Aeris intelligent air dashboard demo frontend (`web-dashboard/`), including 13 routes, simulated telemetry/controls, documentation (`README.md`, `docs/AQI.md`, `docs/API-INTEGRATION.md`), unit tests, and Playwright E2E tests (commit `f660ddf`). |

---

## Detailed Notes

### 2026-11-28 — Sasmitha Fernando (`Antigravity · Gemini 4 Hydrogen (Medium)`)
- Inspected repository branches, git history, and existing Markdown documentation.
- Created `AI_ACTIVITY_LOG.md` at the repository root with a structured table, update guidelines, and initial entries.
