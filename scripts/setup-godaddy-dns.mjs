import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DOMAIN = "leaflock.com.au";
const SUBDOMAIN = "wegrow";
const TARGET = "wegrow.onrender.com";
const DNS_URL = `https://dcc.godaddy.com/control/dnsmanagement?domainName=${DOMAIN}`;
const profile = path.join(root, ".edge-automation");

async function tryClick(page, locators) {
  for (const locator of locators) {
    try {
      const el = typeof locator === "string" ? page.locator(locator).first() : locator;
      if (await el.isVisible({ timeout: 2500 })) {
        await el.click();
        return true;
      }
    } catch {}
  }
  return false;
}

async function tryFill(page, locators, value) {
  for (const locator of locators) {
    try {
      const el = typeof locator === "string" ? page.locator(locator).first() : locator;
      if (await el.isVisible({ timeout: 2500 })) {
        await el.fill(value);
        return true;
      }
    } catch {}
  }
  return false;
}

async function main() {
  console.log("Launching Edge for GoDaddy DNS...");
  const context = await chromium.launchPersistentContext(profile, {
    channel: "msedge",
    headless: false,
    viewport: { width: 1400, height: 900 },
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.goto(DNS_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(6000);

  const existing = page.getByText(new RegExp(`${SUBDOMAIN}.*${TARGET.replace(/\./g, "\\.")}`, "i"));
  if (await existing.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log(`CNAME already exists: ${SUBDOMAIN} -> ${TARGET}`);
    await page.waitForTimeout(3000);
    await context.close();
    return;
  }

  await tryClick(page, [
    page.getByRole("button", { name: /add.*record/i }),
    page.getByRole("button", { name: /^add$/i }),
    page.getByRole("button", { name: /add/i }),
    "button:has-text('Add')",
    "text=Add New Record",
  ]);

  await page.waitForTimeout(2000);

  await tryClick(page, [
    page.getByLabel(/type/i),
    "select",
    "[data-testid*='type']",
  ]);

  await tryClick(page, [
    page.getByRole("option", { name: /^cname$/i }),
    page.getByText(/^CNAME$/i),
    "text=CNAME",
  ]);

  await tryFill(page, [
    page.getByLabel(/^name$/i),
    page.getByPlaceholder(/name/i),
    "input[name='name']",
    "input[aria-label*='Name']",
  ], SUBDOMAIN);

  await tryFill(page, [
    page.getByLabel(/value|points to|host/i),
    page.getByPlaceholder(/value|points to/i),
    "input[name='data']",
    "input[name='value']",
    "input[aria-label*='Value']",
    "input[aria-label*='Points to']",
  ], TARGET);

  const saved = await tryClick(page, [
    page.getByRole("button", { name: /save/i }),
    page.getByRole("button", { name: /add record/i }),
    "button:has-text('Save')",
    "button:has-text('Add Record')",
  ]);

  console.log(saved ? "DNS record saved!" : "Could not auto-save — finish manually in the browser window.");
  console.log(`Record: CNAME  ${SUBDOMAIN}  ->  ${TARGET}`);
  await page.waitForTimeout(saved ? 5000 : 45000);
  await context.close();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});