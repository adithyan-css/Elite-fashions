const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:3100";
const OUT = process.env.OUT || "audit/shots";
require("fs").mkdirSync(OUT, { recursive: true });
const results = [];
const ok = (name, cond, extra = "") => { results.push({ name, pass: !!cond, extra }); };

(async () => {
  const browser = await chromium.launch();
  for (const vp of [{ w: 390, h: 844, tag: "mobile" }, { w: 1280, h: 900, tag: "desktop" }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error" && !(m.location().url || "").includes("/product/nope")) errors.push(m.text() + " " + (m.location().url || "")); });
    page.on("pageerror", (e) => errors.push(String(e)));
    for (const [name, path] of [["home", "/"], ["shop", "/shop"], ["shop-lehenga", "/shop?category=lehenga-choli"], ["product", "/product/knk-7870-mauve-frill-top-lace-skirt"], ["notfound", "/product/nope"]]) {
      const res = await page.goto(BASE + path, { waitUntil: "load" });
      if (name !== "notfound") ok(`${vp.tag} ${name} status 200`, res.status() === 200, res.status());
      else ok(`${vp.tag} unknown product shows not-found`, await page.getByText("find that page").waitFor({ timeout: 5000 }).then(() => true, () => false));
      await page.screenshot({ path: `${OUT}/${vp.tag}-${name}.png`, fullPage: name !== "product" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`${vp.tag} ${name} no horizontal scroll`, overflow <= 0, overflow);
      const noAlt = await page.$$eval("img", (imgs) => imgs.filter((i) => !i.hasAttribute("alt")).length);
      ok(`${vp.tag} ${name} every img has alt`, noAlt === 0, noAlt);
    }
    ok(`${vp.tag} no console errors`, errors.length === 0, errors.slice(0, 3).join(" | "));
    await ctx.close();
  }

  // functional checks
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const count = async (path) => { await page.goto(BASE + path, { waitUntil: "load" }); await page.waitForSelector('[data-testid="result-count"]'); return page.locator('[data-testid="product-card"]').count(); };
  ok("shop shows all 21", (await count("/shop")) === 21);
  ok("lehenga filter = 4", (await count("/shop?category=lehenga-choli")) === 4);
  ok("skirt-top filter = 10", (await count("/shop?category=skirt-top")) === 10);
  ok("brand Kid n Kids = 10", (await count("/shop?brand=Kid%20n%20Kids")) === 10);
  ok("size 24 = 10 (only KnK)", (await count("/shop?size=24")) === 10);
  ok("search 7870 = 2", (await count("/shop?q=7870")) === 2);
  ok("search 'pink lehenga' >= 1", (await count("/shop?q=pink%20lehenga")) >= 1);
  ok("garbage sort ignored", (await count("/shop?sort=%3Cscript%3E")) === 21);
  // price sort order
  await page.goto(BASE + "/shop?sort=price-asc", { waitUntil: "load" });
  const prices = await page.$$eval('[data-testid="product-card"] .text-plum', (els) => els.map((e) => Number(e.textContent.replace(/[^\d]/g, ""))));
  ok("price-asc sorted", prices.every((p, i) => i === 0 || prices[i - 1] <= p), prices.slice(0, 5).join(","));
  // filter UI drives URL
  await page.goto(BASE + "/shop", { waitUntil: "load" });
  await page.selectOption('select[aria-label="Size"]', "24");
  await page.waitForURL(/size=24/);
  await page.waitForLoadState("load"); await page.waitForTimeout(300);
  ok("size select updates URL + results", (await page.locator('[data-testid="product-card"]').count()) === 10);
  // product page: variant link, wishlist toggle, add to cart requires size
  await page.goto(BASE + "/product/knk-7870-mauve-frill-top-lace-skirt", { waitUntil: "load" });
  ok("variant thumbnails shown", (await page.locator('a[aria-label$="colour"]').count()) === 2);
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  ok("add without size shows error", await page.getByText("Please choose a size").isVisible());
  await page.getByRole("radio", { name: "20" }).click();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  ok("cart badge = 1", (await page.getByRole("link", { name: /Cart, 1 items/ }).count()) === 1);
  await page.getByRole("button", { name: "Add to wishlist" }).click();
  ok("wishlist badge = 1", (await page.getByRole("link", { name: /Wishlist, 1 items/ }).count()) === 1);
  await page.reload({ waitUntil: "load" });
  ok("cart persists after reload", await page.getByRole("link", { name: /Cart, 1 items/ }).waitFor({ timeout: 5000 }).then(() => true, () => false));
  const ld = await page.$eval('script[type="application/ld+json"]', (s) => JSON.parse(s.textContent));
  ok("product JSON-LD present", ld["@type"] === "Product" && ld.offers.priceCurrency === "INR");
  const og = await page.$eval('meta[property="og:image"]', (m) => m.content).catch(() => "");
  ok("og:image present", !!og, og);
  await browser.close();

  const failed = results.filter((r) => !r.pass);
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : `  -> ${r.extra}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
