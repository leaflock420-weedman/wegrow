import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SUBDOMAIN = "wegrow";
const TARGET = "wegrow.onrender.com";
const DNS_URL = "https://dcc.godaddy.com/control/dnsmanagement?domainName=leaflock.com.au";
const CHROME_PROFILE = path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "User Data");
const AUTOMATION_PROFILE = path.join(root, ".chrome-automation");

async function connectCdp() {
  for (const port of [9222, 9223, 9333]) {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    } catch {}
  }
  return null;
}

async function launchChrome() {
  const fs = await import("fs/promises");
  try {
    await fs.access(AUTOMATION_PROFILE);
  } catch {
    await fs.mkdir(AUTOMATION_PROFILE, { recursive: true });
  }

  return chromium.launchPersistentContext(AUTOMATION_PROFILE, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: [
      "--disable-blink-features=AutomationControlled",
      `--user-data-dir=${AUTOMATION_PROFILE}`,
    ],
  });
}

async function clickFirst(page, makers) {
  for (const make of makers) {
    try {
      const el = make(page).first();
      if (await el.isVisible({ timeout: 2500 })) {
        await el.click();
        return true;
      }
    } catch {}
  }
  return false;
}

async function fillFirst(page, makers, value) {
  for (const make of makers) {
    try {
      const el = make(page).first();
      if (await el.isVisible({ timeout: 2500 })) {
        await el.fill(value);
        return true;
      }
    } catch {}
  }
  return false;
}

async function addRecord(page) {
  await page.bringToFront();
  await page.goto(DNS_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(6000);

  const html = await page.content();
  if (new RegExp(`${SUBDOMAIN}.*${TARGET.replace(/\./g, "\\.")}`, "i").test(html)) {
    console.log("CNAME already exists");
    return true;
  }

  await clickFirst(page, [
    (p) => p.getByRole("button", { name: /add.*record/i }),
    (p) => p.getByRole("button", { name: /^add$/i }),
    (p) => p.locator("button:has-text('Add')"),
    (p) => p.getByText("Add New Record"),
  ]);

  await page.waitForTimeout(1500);

  await clickFirst(page, [
    (p) => p.getByLabel(/type/i),
    (p) => p.locator("select").first(),
  ]);

  await clickFirst(page, [
    (p) => p.getByRole("option", { name: /^cname$/i }),
    (p) => p.getByText(/^CNAME$/i),
  ]);

  await fillFirst(page, [
    (p) => p.getByLabel(/^name$/i),
    (p) => p.getByPlaceholder(/name/i),
    (p) => p.locator("input[name='name']"),
    (p) => p.locator("input[aria-label*='Name']"),
  ], SUBDOMAIN);

  await fillFirst(page, [
    (p) => p.getByLabel(/value|points to|host/i),
    (p) => p.getByPlaceholder(/value|points to/i),
    (p) => p.locator("input[name='data']"),
    (p) => p.locator("input[name='value']"),
    (p) => p.locator("input[aria-label*='Value']"),
    (p) => p.locator("input[aria-label*='Points to']"),
  ], TARGET);

  const saved = await clickFirst(page, [
    (p) => p.getByRole("button", { name: /save/i }),
    (p) => p.getByRole("button", { name: /add record/i }),
    (p) => p.locator("button:has-text('Save')"),
    (p) => p.locator("button:has-text('Add Record')"),
  ]);

  console.log(saved ? "DNS record saved in Chrome" : "Fill complete — click Save in Chrome if needed");
  console.log(`CNAME  ${SUBDOMAIN}  ->  ${TARGET}`);
  return saved;
}

async function main() {
  let browser = await connectCdp();
  if (browser) {
    console.log("Connected to existing Chrome");
    const context = browser.contexts()[0];
    let page = context.pages().find((p) => /godaddy|dns|render/i.test(p.url()));
    if (!page) page = context.pages()[0] || (await context.newPage());
    await addRecord(page);
    await page.waitForTimeout(5000);
    return;
  }

  console.log("Opening Chrome for GoDaddy DNS...");
  const context = await launchChrome();
  const page = context.pages()[0] || (await context.newPage());
  await addRecord(page);
  await page.waitForTimeout(8000);
  await context.close();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});