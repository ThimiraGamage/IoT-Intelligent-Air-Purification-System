# Aeris · Intelligent air, thoughtfully designed

A responsive React dashboard for the university research and commercialization project **Design and Development of an IoT-Based Intelligent Air Monitoring and Purification System**. The attached purifier prototype is the primary product visual; its white housing, charcoal grille, and teal display inform the interface.

The application is a fully interactive **demo frontend**. It does not contact hardware, a broker, a database, an authentication server, or an ML model.

## Start locally

Requires Node.js 22.12+ or a compatible newer release, and npm.

```bash
cd web-dashboard
npm install
npm run dev
```

Open the Vite URL printed in the terminal, normally `http://127.0.0.1:5173`. On Windows PowerShell installations that block `npm.ps1`, use `npm.cmd install` and `npm.cmd run dev`.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

The production output is `dist/`. The browser suite runs with `npm run test:e2e` and uses an installed Google Chrome by default. To use a Playwright-managed browser instead, run `npx playwright install chromium`, set `PLAYWRIGHT_BROWSER_CHANNEL=chromium` in your shell, then run the suite. See `playwright.config.ts` for local-server setup. Format source with `npm run format`; check formatting with `npm run format:check`.

## What works

- Overview, live monitoring, analytics, device controls, smart automation, devices, notifications, filter maintenance, energy, settings, and demo authentication routes.
- Periodic five-second sensor updates, seven sensor types, 32 days of reproducible historical readings, pollutant comparisons, date filters, summary statistics, and CSV exports.
- Multiple demo devices, room/name editing, device selection, and a local pairing flow.
- Power, purification modes, five fan speeds, brightness, aroma, child lock, and UV-C state with a simulated interlock requirement. Commands move through requested and acknowledged states before reported settings change.
- Threshold, filter, and time automation rules, read/unread notification management, estimated maintenance, configurable electricity tariff/currency including LKR, and local profile/privacy/notification preferences.
- Light, dark, and operating-system themes; desktop/sidebar and responsive mobile navigation; keyboard-accessible controls.
- Demo disconnection and reconnection with unavailable/stale data presentation. Corrupt or blocked local storage falls back safely to in-memory defaults.

Preferences, device metadata, rules, and notifications with read/deletion state persist in this browser. Telemetry regenerates on reload. No production credentials are embedded. English/Sinhala language preferences and typed settings prepare the application for localization; any untranslated copy remains English.

## Simulated and estimated

The persistent Demo Mode indicator applies to all readings, pairing, controls, command acknowledgements, insights, notifications, energy, and analytics. These values must not be submitted as collected research evidence. Power and costs are estimates derived from synthetic wattage, not an electricity meter. Filter life is an estimate, not a measured filter-health result. Before/after comparisons show illustrative time windows rather than a controlled efficacy experiment.

The circular AQI-style display uses EPA 2024 PM2.5/PM10 breakpoints on instantaneous demo data. It is labelled an instantaneous particulate demo index and is **not official daily AQI or EPA NowCast**. See [calculation details and primary sources](docs/AQI.md).

Experimental benzene, toluene, LPG, and other compound-specific sensors are unavailable until appropriate hardware is integrated and validated. A general VOC sensor cannot identify these compounds reliably. The research prototype is not a certified gas/fire alarm or a medical device.

Authentication screens are UI demonstrations. They do not create secure accounts, send recovery emails, or establish server-side sessions. Never enter a production password in the demo.

## Project structure

```text
src/
  components/   Shared controls, charts, cards, and indicators
  hooks/        AppProvider and typed service consumption
  layouts/      Responsive application shell
  mock/         Deterministic simulated telemetry and seed data
  pages/        Routes and feature workflows
  services/     Demo store, persistence, safety checks, backend interfaces
  types/        Shared TypeScript models
  theme/        Shared colors, typography, layout, and theme tokens
  utils/        Particulate index and safe CSV export
public/         Static product assets
docs/           Calculation and backend integration documentation
tests/          Browser integration tests
```

React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, and Lucide React provide the frontend. The design theme is defined with shared CSS tokens and the HTML theme attribute.

## Hardware and backend next steps

Implement the interfaces in `src/services/api.ts` using an authenticated Express REST/WebSocket backend. That backend can connect to an MQTT broker and MongoDB; ESP32 devices remain responsible for validated sensing, device identity, physical interlocks, and command acknowledgements. Keep secrets server-side. The `.env.example` contains only public URL examples and does not activate an unfinished backend adapter.

See [API and hardware integration](docs/API-INTEGRATION.md) for route suggestions, typed event examples, command safety, scheduling, authentication, and deployment expectations.

All changes are contained within `web-dashboard`; the repository's firmware, hardware, database, and research documentation are untouched. No changes are automatically pushed or merged.

## Validation

The implementation was checked with TypeScript, ESLint, a production build, 47 domain unit tests, and 30 Playwright browser tests across desktop (1440 px) and mobile (390 px). Browser coverage includes all 13 routes, chart filters/exports, device commands, child lock, automation CRUD, pairing, notifications, maintenance, connection recovery, persisted preferences, both themes, navigation, and demonstration account forms. Route checks reported no browser errors or horizontal overflow.

Use a feature branch for team contributions, commit the npm lockfile when dependencies change, and keep secrets out of `VITE_*` values. No commit, push, merge, or deployment is performed automatically.
