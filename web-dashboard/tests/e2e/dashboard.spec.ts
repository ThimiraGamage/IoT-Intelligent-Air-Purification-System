import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routes = [
  "/",
  "/monitoring",
  "/analytics",
  "/control",
  "/automation",
  "/devices",
  "/notifications",
  "/maintenance",
  "/energy",
  "/settings",
  "/login",
  "/register",
  "/forgot-password",
];

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 2);
}

test("every route renders without browser errors or horizontal overflow", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      "Unexpected Application Error",
    );
    await expectNoHorizontalOverflow(page);
    await testInfo.attach(
      `route-${route.replaceAll("/", "") || "overview"}-${testInfo.project.name}`,
      {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      },
    );
  }
  expect(errors).toEqual([]);
});

test("analytics filters, comparisons, pagination and selected-range export work", async ({
  page,
}) => {
  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: "Analytics", exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await page
    .getByRole("combobox", { name: "Compare with", exact: true })
    .selectOption("co2");
  await expect(
    page.getByRole("columnheader", { name: "CO₂ (ppm)", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText(/Page 2 of/)).toBeVisible();
  await page.getByRole("button", { name: "Weekly", exact: true }).click();
  await expect(page.getByText(/Page 1 of/)).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("aeris-pm25-week");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const csv = await readFile(downloadPath!, "utf8");
  expect(csv.split("\r\n")[0]).toContain("PM2.5 (µg/m³)");
  expect(csv.split("\r\n")[0]).toContain("CO₂ (ppm)");
  expect(csv.split("\r\n").length).toBeGreaterThan(8);
  expect(csv).toContain('"simulated"');
  await page.getByRole("button", { name: "Custom", exact: true }).click();
  await page.getByLabel("From", { exact: true }).fill("2020-01-01");
  await page.getByLabel("To", { exact: true }).fill("2020-01-02");
  await expect(page.getByText("No readings in this interval")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export CSV", exact: true }),
  ).toBeDisabled();
});

test("keyboard users can reach an interactive control", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    visible:
      document.activeElement instanceof HTMLElement &&
      document.activeElement.offsetWidth > 0,
  }));
  expect(focus.visible).toBe(true);
  expect(["A", "BUTTON", "INPUT", "SELECT"]).toContain(focus.tag);
});

test("device commands are acknowledged and child lock protects controls", async ({
  page,
}) => {
  await page.goto("/control");
  const powerOff = page.getByRole("button", {
    name: "Turn purifier off",
    exact: true,
  });
  await powerOff.click();
  await expect(
    page.getByText("Command requested", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Turn purifier on", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Confirmed by demo device", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Turn purifier on", exact: true })
    .click();
  await expect(powerOff).toBeEnabled();
  await page.getByRole("button", { name: "turbo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "turbo", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "manual", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Fan speed", { exact: true }).focus();
  await page.keyboard.press("Home");
  await expect(page.getByLabel("Fan speed", { exact: true })).toHaveValue("1");
  await expect(
    page.getByRole("button", { name: "manual", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("switch", { name: "Child lock", exact: true }),
  ).toBeEnabled();
  await page.getByRole("switch", { name: "Child lock", exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "Child lock", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(powerOff).toBeDisabled();
  await page.getByRole("switch", { name: "Child lock", exact: true }).click();
  await expect(powerOff).toBeEnabled();
});

test("automation routines can be created, edited, toggled and removed", async ({
  page,
}) => {
  await page.goto("/automation");
  await page.getByRole("button", { name: "Create rule", exact: true }).click();
  await page
    .getByLabel("Rule name", { exact: true })
    .fill("QA evening routine");
  await page
    .getByRole("combobox", { name: "When", exact: true })
    .selectOption("time");
  await page.getByLabel("Local time", { exact: true }).fill("23:45");
  await page
    .getByRole("combobox", { name: "Then", exact: true })
    .selectOption("sleep");
  await page
    .getByRole("button", { name: "Create routine", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "QA evening routine", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit QA evening routine", exact: true })
    .click();
  await page.getByLabel("Rule name", { exact: true }).fill("QA night routine");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  const toggle = page.getByRole("switch", {
    name: "Enable QA night routine",
    exact: true,
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await page
    .getByRole("button", { name: "Delete QA night routine", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "QA night routine", exact: true }),
  ).toHaveCount(0);
});

test("pairing validates demo code and device metadata can be edited", async ({
  page,
}) => {
  await page.goto("/devices");
  await page.getByRole("button", { name: "Add device", exact: true }).click();
  await page
    .getByLabel("Device name", { exact: true })
    .fill("QA studio purifier");
  await page
    .getByRole("combobox", { name: "Room", exact: true })
    .fill("Studio");
  await page.getByLabel("Demo pairing code", { exact: true }).fill("INVALID");
  await page
    .getByRole("button", { name: "Pair demo device", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("DEMO-1234");
  await page.getByLabel("Demo pairing code", { exact: true }).fill("DEMO-1234");
  await page
    .getByRole("button", { name: "Pair demo device", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "QA studio purifier", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit QA studio purifier", exact: true })
    .click();
  await page.getByLabel("Device name", { exact: true }).fill("QA reading room");
  await page
    .getByRole("combobox", { name: "Room", exact: true })
    .fill("Reading room");
  await page.getByRole("button", { name: "Save device", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "QA reading room", exact: true }),
  ).toBeVisible();
});

test("notification read states and deletion work", async ({ page }) => {
  await page.goto("/notifications");
  await page
    .getByRole("button", { name: "Mark all read", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mark all read", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Unread (0)", exact: true }).click();
  await expect(page.getByText("No unread updates to show.")).toBeVisible();
  await page.getByRole("button", { name: "All updates", exact: true }).click();
  const notifications = page.locator("article.manage-notification");
  const count = await notifications.count();
  expect(count).toBeGreaterThan(0);
  await notifications
    .first()
    .getByRole("button", { name: /^Delete / })
    .click();
  await expect(notifications).toHaveCount(count - 1);
});

test("filter replacement requires confirmation and records a completed replacement", async ({
  page,
}) => {
  await page.goto("/maintenance");
  await page
    .getByRole("button", { name: "Record replacement", exact: true })
    .click();
  await expect(
    page.getByText("Have you replaced the filters?", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Yes, record replacement", exact: true })
    .click();
  await expect(
    page.getByRole("progressbar", {
      name: "HEPA filter estimated remaining life",
      exact: true,
    }),
  ).toHaveAttribute("aria-valuenow", "100");
  await expect(
    page.getByRole("cell", { name: "HEPA & activated carbon", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("cell", { name: "HEPA & activated carbon", exact: true }),
  ).toBeVisible();
});

test("connection interruptions disable controls and recover automatically", async ({
  page,
}) => {
  await page.goto("/devices");
  await page
    .getByRole("button", { name: "Simulate disconnection", exact: true })
    .click();
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("link", { name: "Device control", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Turn purifier (off|on)/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /Turn purifier (off|on)/ }),
  ).toBeEnabled({ timeout: 15000 });
});

test("settings persist profile, appearance and localization preferences", async ({
  page,
}, testInfo) => {
  await page.goto("/settings");
  const lightBackground = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
  );
  await page.getByLabel("Your name", { exact: true }).fill("QA Researcher");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("researcher@example.test");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("dark");
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--bg")
          .trim(),
      ),
    )
    .not.toBe(lightBackground);
  await testInfo.attach(`dark-settings-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await expectNoHorizontalOverflow(page);
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("si");
  await page.reload();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
    "QA Researcher",
  );
  await expect(page.getByLabel("Email address", { exact: true })).toHaveValue(
    "researcher@example.test",
  );
  await expect(
    page.getByRole("combobox", { name: "Theme", exact: true }),
  ).toHaveValue("dark");
  await expect(
    page.getByRole("combobox", { name: "Language", exact: true }),
  ).toHaveValue("si");
  if (
    await page
      .getByRole("button", { name: "Switch to light theme", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Switch to light theme", exact: true })
      .click();
  else
    await page
      .getByRole("combobox", { name: "Theme", exact: true })
      .selectOption("light");
  await expect(
    page.getByRole("combobox", { name: "Theme", exact: true }),
  ).toHaveValue("light");
  const notifications = page.getByRole("switch", {
    name: "In-app notifications",
    exact: true,
  });
  await notifications.click();
  await expect(notifications).toHaveAttribute("aria-checked", "false");
});

test("electricity rate and chart period are configurable", async ({ page }) => {
  await page.goto("/energy");
  await page.getByRole("button", { name: "30 days", exact: true }).click();
  await expect(
    page.getByRole("img", {
      name: "Simulated daily energy usage over the last 30 days",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Currency", exact: true })
    .selectOption("USD");
  await page.getByLabel("Price per kWh", { exact: true }).fill("0.27");
  await page.getByRole("button", { name: "Save rate", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(page.getByText(/USD .* estimated cost/).first()).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Currency", exact: true }),
  ).toHaveValue("USD");
  await expect(page.getByLabel("Price per kWh", { exact: true })).toHaveValue(
    "0.27",
  );
});

test("authentication forms demonstrate local flows without saving passwords", async ({
  page,
}) => {
  const madeUpPassword = "Demo-only-12345!";
  await page.goto("/register");
  await page.getByLabel("Your name", { exact: true }).fill("Demo Researcher");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("demo@example.test");
  await page.getByLabel("Password", { exact: true }).fill(madeUpPassword);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create demo profile", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  const browserStorage = await page.evaluate(() =>
    [...Object.values(localStorage), ...Object.values(sessionStorage)].join(
      " ",
    ),
  );
  expect(browserStorage).not.toContain(madeUpPassword);
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("demo@example.test");
  await page.getByLabel("Password", { exact: true }).fill(madeUpPassword);
  await page.getByRole("button", { name: "Enter demo", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/forgot-password");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("demo@example.test");
  await page
    .getByRole("button", { name: "Preview recovery", exact: true })
    .click();
  await expect(
    page.getByText("Recovery flow previewed", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/No email was sent/)).toBeVisible();
});

test("navigation and keyboard-dismissible help work", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (testInfo.project.name === "mobile") {
    await menu.click();
    await expect(
      page.getByRole("link", { name: "Analytics", exact: true }),
    ).toBeVisible();
  } else {
    await page
      .getByRole("button", { name: "Collapse sidebar", exact: true })
      .click();
    await expect(page.locator(".app-shell")).toHaveClass(/sidebar-collapsed/);
    await page
      .getByRole("button", { name: "Expand sidebar", exact: true })
      .click();
  }
  await page.getByRole("link", { name: "Analytics", exact: true }).click();
  await expect(page).toHaveURL("/analytics");
  if (testInfo.project.name === "mobile") await menu.click();
  await page
    .getByRole("button", { name: "Help & support", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByText("How is my air quality index calculated?", { exact: true })
    .click();
  await expect(
    page.getByText(/The demo particulate index uses EPA 2024/),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("overview controls, chart options and calculation explanation work", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Eco", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Eco", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("slider", { name: "Quick fan speed", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("slider", { name: "Quick fan speed", exact: true })
    .focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("slider", { name: "Quick fan speed", exact: true }),
  ).toHaveValue("5");
  await page
    .getByRole("combobox", { name: "Chart pollutant", exact: true })
    .selectOption("co2");
  await page.getByRole("button", { name: "7 days", exact: true }).click();
  await expect(
    page.getByText("Carbon dioxide (ppm)", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Demo particulate index/ }).click();
  await expect(
    page.getByText(/EPA 2024 particulate breakpoints applied/),
  ).toBeVisible();
});

test("experimental monitoring identifies unvalidated chemical channels", async ({
  page,
}) => {
  await page.goto("/monitoring");
  await expect(page.locator(".monitor-sensor-grid article")).toHaveCount(7);
  const experimental = page.getByRole("button", {
    name: /A little further, through research/,
  });
  await expect(experimental).toHaveAttribute("aria-expanded", "false");
  await experimental.click();
  await expect(experimental).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Benzene", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Research stage · Unavailable", { exact: true }),
  ).toHaveCount(3);
  await expect(
    page.getByText(/A total VOC sensor cannot identify benzene/),
  ).toBeVisible();
});
