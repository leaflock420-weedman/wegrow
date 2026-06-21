import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SUBDOMAIN = "wegrow";
const TARGET = "wegrow.onrender.com";
const DNS_URL = "https://dcc.godaddy.com/control/dnsmanagement?domainName=leaflock.com.au";
const RENDER_URL = "https://dashboard.render.com/web/srv-wegrow";
const AUTOMATION_PROFILE = path.join(root, ".chrome-automation");

async function connectCdp() {
  for (const port of [9222, 9223, 9333]) {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    } catch {}
  }
  return null;
}

async function getPage(browserOrContext, pattern) {
  const contexts = browserOrContext.contexts?.() || [browserOrContext];
  for (const ctx of contexts) {
    const hit = ctx.pages().find((p) => pattern.test(p.url()));
    if (hit) return hit;
  }
  const ctx = contexts[0];
  return ctx.pages()[0] || (await ctx.newPage());
}

async function clickFirst(page, makers) {
  for (const make of makers) {
    try {
      const el = make(page).first();
      if (await el.isVisible({ timeout: 2000 })) {
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
      if (await el.isVisible({ timeout: 2000 })) {
        await el.fill(value);
        return true;
      }
    } catch {}
  }
  return false;
}

async function addGoDaddyRecord(page) {
  console.log("GoDaddy DNS...");
  await page.bringToFront();
  await page.goto(DNS_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(5000);

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

  await clickFirst(page, [(p) => p.getByLabel(/type/i), (p) => p.locator("select").first()]);
  await clickFirst(page, [(p) => p.getByRole("option", { name: /^cname$/i }), (p) => p.getByText(/^CNAME$/i)]);

  await fillFirst(page, [
    (p) => p.getByLabel(/^name$/i),
    (p) => p.getByPlaceholder(/name/i),
    (p) => p.locator("input[name='name']"),
  ], SUBDOMAIN);

  await fillFirst(page, [
    (p) => p.getByLabel(/value|points to|host/i),
    (p) => p.getByPlaceholder(/value|points to/i),
    (p) => p.locator("input[name='data']"),
    (p) => p.locator("input[name='value']"),
  ], TARGET);

  const saved = await clickFirst(page, [
    (p) => p.getByRole("button", { name: /save/i }),
    (p) => p.getByRole("button", { name: /add record/i }),
    (p) => p.locator("button:has-text('Save')"),
  ]);

  console.log(saved ? "DNS record saved" : "DNS form filled — click Save if needed");
  console.log(`CNAME  ${SUBDOMAIN}  ->  ${TARGET}`);
  return saved;
}

async function triggerRenderDeploy(page) {
  console.log("Render dashboard...");
  await page.goto("https://dashboard.render.com/", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(4000);

  const wegrowLink = page.getByRole("link", { name: /wegrow/i }).first();
  if (await wegrowLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await wegrowLink.click();
    await page.waitForTimeout(3000);
  } else {
    await page.goto("https://dashboard.render.com/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
  }

  const deployed = await clickFirst(page, [
    (p) => p.getByRole("button", { name: /manual deploy/i }),
    (p) => p.getByRole("menuitem", { name: /deploy latest commit/i }),
    (p) => p.getByText(/deploy latest commit/i),
    (p) => p.locator("button:has-text('Manual Deploy')"),
  ]);

  if (deployed) {
    await page.waitForTimeout(1000);
    await clickFirst(page, [
      (p) => p.getByRole("menuitem", { name: /deploy latest commit/i }),
      (p) => p.getByText(/deploy latest commit/i),
    ]);
    console.log("Triggered Manual Deploy on Render");
  } else {
    console.log("Open Render dashboard — click Manual Deploy → Deploy latest commit");
  }

  const domainBtn = page.getByRole("button", { name: /add custom domain/i });
  if (await domainBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await domainBtn.click();
    await fillFirst(page, [(p) => p.getByLabel(/domain/i), (p) => p.locator("input")], "wegrow.leaflock.com.au");
    await clickFirst(page, [(p) => p.getByRole("button", { name: /save|add/i })]);
    console.log("Added custom domain on Render");
  }
}

async function main() {
  let browser = await connectCdp();
  let context;
  let ownsContext = false;

  if (browser) {
    console.log("Connected to Chrome via CDP");
    context = browser.contexts()[0];
  } else {
    console.log("Launching Chrome automation profile...");
    const fs = await import("fs/promises");
    await fs.mkdir(AUTOMATION_PROFILE, { recursive: true });
    context = await chromium.launchPersistentContext(AUTOMATION_PROFILE, {
      channel: "chrome",
      headless: false,
      viewport: { width: 1440, height: 900 },
      args: ["--remote-debugging-port=9222", "--disable-blink-features=AutomationControlled"],
    });
    ownsContext = true;
  }

  const dnsPage = await getPage(context, /godaddy|dns/i);
  const renderPage = await getPage(context, /render/i);
  if (dnsPage === renderPage) {
    const extra = await context.newPage();
    await addGoDaddyRecord(dnsPage);
    await triggerRenderDeploy(extra);
  } else {
    await Promise.all([addGoDaddyRecord(dnsPage), triggerRenderDeploy(renderPage)]);
  }

  await new Promise((r) => setTimeout(r, 10000));
  if (ownsContext) await context.close();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});