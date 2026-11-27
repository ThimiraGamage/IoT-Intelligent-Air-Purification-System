import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const directory = path.resolve("test-results", "preview");
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await desktop.newPage();
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
  await page.screenshot({
    path: path.join(directory, "overview-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await page.screenshot({
    path: path.join(directory, "overview-dark.png"),
    fullPage: true,
  });
  const mobile = await browser.newContext({
    ...devices["iPhone 13"],
    reducedMotion: "reduce",
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
  await mobilePage.screenshot({
    path: path.join(directory, "overview-mobile.png"),
    fullPage: true,
  });
  console.log(directory);
} finally {
  await browser.close();
}
