const { chromium } = require("playwright");
const { execSync } = require("child_process");
const BASE = process.env.BASE || "http://localhost:3100";
const EMAIL = "sivaani@elitefashions.test";
const PW = process.env.ADMIN_PW || "Sivaani-Store-2026";
const results = [];
const ok = (name, cond, extra = "") => results.push({ name, pass: !!cond, extra });
const report = () => { for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : `  -> ${r.extra}`}`); const f = results.filter((r) => !r.pass).length; console.log(`\n${results.length - f}/${results.length} checks passed`); return f; };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    // About page
    const res = await page.goto(BASE + "/about", { waitUntil: "load" });
    ok("/about 200", res.status() === 200);
    ok("owner name Sivaani shown", (await page.getByTestId("owner-name").textContent()).trim() === "Sivaani");
    const img = page.getByTestId("owner-photo");
    ok("owner photo loaded", await img.evaluate((i) => i.complete && i.naturalWidth > 100));
    ok("owner photo alt text", (await img.getAttribute("alt")).includes("Sivaani"));
    ok("map iframe present", (await page.locator('iframe[title^="Map to"]').count()) === 1);
    await page.screenshot({ path: "audit/shots/mobile-about.png", fullPage: true });

    // headers + SEO files
    const h = res.headers();
    ok("CSP header", (h["content-security-policy"] || "").includes("frame-ancestors 'none'"));
    ok("X-Frame-Options DENY", h["x-frame-options"] === "DENY");
    ok("nosniff", h["x-content-type-options"] === "nosniff");
    ok("no X-Powered-By", !h["x-powered-by"]);
    const robots = await (await page.request.get(BASE + "/robots.txt")).text();
    ok("robots blocks /admin and /order", robots.includes("Disallow: /admin") && robots.includes("Disallow: /order"));
    const sm = await (await page.request.get(BASE + "/sitemap.xml")).text();
    ok("sitemap lists 21 products", (sm.match(/\/product\//g) || []).length === 21);
    const adminHead = await page.request.get(BASE + "/admin/login");
    ok("admin pages noindex", (adminHead.headers()["x-robots-tag"] || "").includes("noindex"));

    // settings
    const a = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await a.goto(BASE + "/admin/login", { waitUntil: "load" });
    await a.waitForTimeout(800);
    await a.fill("#email", EMAIL); await a.fill("#password", PW);
    await a.getByRole("button", { name: "Sign in" }).click();
    await a.waitForURL(/\/admin$/);
    await a.goto(BASE + "/admin/settings", { waitUntil: "load" });
    await a.getByRole("button", { name: "Save settings" }).waitFor();
    await a.waitForTimeout(1500);
    await a.fill("#gstin", "12345");
    await a.getByRole("button", { name: "Save settings" }).click();
    await a.getByText("GSTIN should be 15 characters").waitFor();
    ok("bad GSTIN refused", true);
    await a.fill("#gstin", "");
    await a.fill("#whatsapp", "abc");
    await a.getByRole("button", { name: "Save settings" }).click();
    await a.getByText("Enter the WhatsApp number with country code").waitFor();
    ok("bad WhatsApp refused", true);
    await a.fill("#whatsapp", "91 98765 43210");
    await a.fill("#upi_id", "elitefashions@okaxis");
    await a.fill("#timings", "Mon–Sat 10 am – 9 pm");
    await a.fill("#banner_title", "Diwali Sale · Up to 20% off");
    await a.getByRole("button", { name: "Save settings" }).click();
    await a.getByText("Settings saved").waitFor();
    ok("settings saved", true);
    const home = await (await page.request.get(BASE + "/")).text();
    ok("home banner updated immediately", home.includes("Up to 20% off"));
    ok("WhatsApp links use new number", home.includes("wa.me/919876543210"));
    const about = await (await page.request.get(BASE + "/about")).text();
    ok("timings shown on About", about.includes("Mon–Sat 10 am – 9 pm"));
    ok("no page errors", errors.length === 0, errors.join(" | "));
    // restore
    await a.fill("#banner_title", "Diwali Sale · New Collection");
    await a.fill("#whatsapp", "919999999999");
    await a.getByRole("button", { name: "Save settings" }).click();
    await a.getByText("Settings saved").waitFor();
  } catch (e) {
    console.log("CRASH", String(e).split("\n")[0]);
  }
  await browser.close();
  process.exit(report() ? 1 : 0);
})();
