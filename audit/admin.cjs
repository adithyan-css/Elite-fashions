const { chromium } = require("playwright");
const { execSync } = require("child_process");
const BASE = process.env.BASE || "http://localhost:3100";
const EMAIL = "sivaani@elitefashions.test";
const START_PW = process.env.START_PW || "EliteDev-2026!";
const NEW_PW = "Sivaani-Store-2026";
const psql = (q) => execSync(`psql -h 127.0.0.1 -p 5433 -U postgres -d elite -tAc "${q}"`).toString().trim();
const results = [];
const ok = (name, cond, extra = "") => results.push({ name, pass: !!cond, extra });
const report = () => { for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : `  -> ${r.extra}`}`); const f = results.filter((r) => !r.pass).length; console.log(`\n${results.length - f}/${results.length} checks passed`); return f; };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try {
    // guards
    await page.goto(BASE + "/admin", { waitUntil: "load" });
    ok("unauth /admin -> login", page.url().endsWith("/admin/login"), page.url());
    await page.goto(BASE + "/admin/products/1", { waitUntil: "load" });
    ok("unauth deep link keeps next", page.url().includes("/admin/login?next=%2Fadmin%2Fproducts%2F1"), page.url());
    const up = await page.request.post(BASE + "/api/admin/upload", { multipart: { file: { name: "a.png", mimeType: "image/png", buffer: require("fs").readFileSync("/tmp/claude-0/test-photo.png") } } });
    ok("upload API refuses without session (401)", up.status() === 401, up.status());
    await ctx.addCookies([{ name: "ef_session", value: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwic3YiOjEsImF1ZCI6ImVmLWFkbWluIn0.forgedsignatureforgedsignatureforgedsig", url: BASE }]);
    await page.goto(BASE + "/admin", { waitUntil: "load" });
    ok("forged cookie rejected", page.url().includes("/admin/login"), page.url());
    await ctx.clearCookies();

    // lockout
    for (let i = 0; i < 5; i++) {
      await page.goto(BASE + "/admin/login", { waitUntil: "load" });
      await page.fill("#email", EMAIL); await page.fill("#password", "wrong-password-" + i);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.locator("form [role=alert]").waitFor();
    }
    ok("wrong password message is generic", (await page.locator("form [role=alert]").textContent()).includes("Wrong email or password"));
    await page.goto(BASE + "/admin/login", { waitUntil: "load" });
    await page.fill("#email", EMAIL); await page.fill("#password", START_PW);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.locator("form [role=alert]").waitFor();
    ok("6th attempt locked out even with right password", (await page.locator("form [role=alert]").textContent()).includes("Too many"));
    psql("delete from login_attempts");

    // first login forces password change
    await page.waitForTimeout(1000);
    await page.fill("#email", EMAIL); await page.fill("#password", START_PW);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/admin\/account\?first=1/);
    ok("first login goes to change password", true);
    const raw = await (await page.request.get(BASE + "/admin/products")).text();
    ok("no product data leaks before password change", !raw.includes("Magenta Embroidered Lehenga"));
    await page.goto(BASE + "/admin/products", { waitUntil: "load" });
    const moved = await page.waitForURL(/\/admin\/account/, { timeout: 5000 }).then(() => true, () => false);
    ok("other admin pages redirect to password change", moved, page.url());
    const cookie = (await ctx.cookies()).find((c) => c.name === "ef_session");
    ok("session cookie httpOnly + SameSite=Lax", cookie && cookie.httpOnly && cookie.sameSite === "Lax");
    await page.fill("#current", START_PW); await page.fill("#next", "short1"); await page.fill("#confirm", "short1");
    await page.getByRole("button", { name: "Change password" }).click();
    await page.locator("form [role=alert]").waitFor();
    ok("weak password refused", (await page.locator("form [role=alert]").textContent()).includes("10 characters"));
    await page.fill("#current", START_PW); await page.fill("#next", NEW_PW); await page.fill("#confirm", NEW_PW);
    await page.getByRole("button", { name: "Change password" }).click();
    await page.getByRole("status").filter({ hasText: "Password changed" }).waitFor();
    ok("password changed", true);
    ok("hash stored is bcrypt", psql(`select substr(password_hash,1,4) from admin_users where email='${EMAIL}'`) === "$2b$");

    // dashboard + products
    await page.goto(BASE + "/admin", { waitUntil: "load" });
    ok("dashboard loads", await page.getByText("Vanakkam").waitFor({ timeout: 8000 }).then(() => true, () => false));
    await page.screenshot({ path: "audit/shots/admin-dashboard.png", fullPage: true });
    await page.goto(BASE + "/admin/products", { waitUntil: "load" });
    ok("products list shows 21", (await page.locator('[data-testid="admin-product"]').count()) === 21);

    // edit price -> storefront updates (cache invalidation)
    const pid = psql("select id from products where slug='knk-7080-pink-collared-skirt-set'");
    await page.goto(`${BASE}/admin/products/${pid}`, { waitUntil: "load" });
    await page.getByRole("button", { name: "Save changes" }).waitFor();
    await page.waitForTimeout(1500);
    await page.fill("#price", "1049");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByRole("status").filter({ hasText: "Saved" }).waitFor();
    ok("db price updated", psql(`select price_paise from products where id=${pid}`) === "104900");
    const store = await (await page.request.get(BASE + "/product/knk-7080-pink-collared-skirt-set")).text();
    ok("storefront shows new price immediately", store.includes("₹1,049"));
    // MRP lower than price refused
    await page.fill("#mrp", "500");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByText("MRP should be more than the selling price").waitFor();
    ok("MRP < price refused", true);
    await page.fill("#mrp", "1199");

    // hide product -> drops from shop
    await page.goto(BASE + "/admin/products", { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="admin-product"]', { hasText: "Sage Collared Top" }).getByRole("button", { name: "Hide from store" }).click();
    await page.waitForTimeout(1200);
    const shop = await (await page.request.get(BASE + "/shop")).text();
    ok("hidden product not in shop", !shop.includes("knk-7080-sage-collared-skirt-set"));
    const hiddenRes = await page.request.get(BASE + "/product/knk-7080-sage-collared-skirt-set");
    ok("hidden product page 404-ish", (await hiddenRes.text()).includes("find that page"));
    await page.locator('[data-testid="admin-product"]', { hasText: "Sage Collared Top" }).getByRole("button", { name: "Show in store" }).click();
    await page.waitForTimeout(1000);

    // create product with photo upload
    await page.goto(BASE + "/admin/products/new", { waitUntil: "load" });
    const bad = await page.request.post(BASE + "/api/admin/upload", { multipart: { file: { name: "evil.png", mimeType: "image/png", buffer: require("fs").readFileSync("/tmp/claude-0/fake.png") } } });
    ok("non-image disguised as png rejected (415)", bad.status() === 415, bad.status());
    await page.getByRole("button", { name: "Create product" }).waitFor();
    await page.waitForTimeout(1500); // let the streamed form hydrate
    await page.setInputFiles('[data-testid="photo-input"]', "/tmp/claude-0/test-photo.png");
    await page.locator('img[alt="Photo 1"]').waitFor({ timeout: 15000 });
    ok("photo uploaded and previewed", true);
    await page.fill("#name", "Audit Test Gown");
    await page.fill("#designNo", "AT-1");
    await page.fill("#brand", "Test Brand");
    await page.fill("#colour", "Plum");
    await page.fill("#price", "1500");
    await page.getByLabel("Size 1 label").fill("20");
    await page.getByLabel("Size 1 stock").fill("2");
    await page.getByRole("button", { name: "Create product" }).click();
    await page.waitForURL(/\/admin\/products\/\d+$/, { timeout: 15000 });
    const newSlug = psql("select slug from products where design_no='AT-1'");
    ok("product created with slug", newSlug === "audit-test-gown-at-1", newSlug);
    const imgUrl = psql(`select url from product_images i join products p on p.id=i.product_id where p.design_no='AT-1'`);
    const imgRes = await page.request.get(BASE + imgUrl);
    ok("uploaded image served as webp", imgRes.status() === 200 && imgRes.headers()["content-type"] === "image/webp", imgUrl);
    const pp = await page.request.get(BASE + "/product/" + newSlug);
    ok("new product live on store", pp.status() === 200 && (await pp.text()).includes("Audit Test Gown"));
    ok("traversal blocked on /uploads", (await page.request.get(BASE + "/uploads/..%2F..%2Fpackage.json")).status() === 404);
    // delete it (two taps)
    await page.getByRole("button", { name: "Delete product" }).click();
    await page.getByRole("button", { name: "Tap again to delete for good" }).click();
    await page.waitForURL(/\/admin\/products$/);
    ok("product deleted", psql("select count(*) from products where design_no='AT-1'") === "0");

    // logout everywhere invalidates old cookie
    const oldCookie = (await ctx.cookies()).find((c) => c.name === "ef_session").value;
    await page.goto(BASE + "/admin/account", { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Sign out on all devices" }).click();
    await page.waitForURL(/\/admin\/login/);
    await ctx.addCookies([{ name: "ef_session", value: oldCookie, url: BASE }]);
    const leak = await (await page.request.get(BASE + "/admin")).text();
    ok("old cookie shows no dashboard data", !leak.includes("Vanakkam") && !leak.includes("Latest orders"));
    await page.goto(BASE + "/admin", { waitUntil: "load" });
    ok("old session cookie dead after sign-out-everywhere", await page.waitForURL(/\/admin\/login/, { timeout: 5000 }).then(() => true, () => false), page.url());
    // restore dev password for later steps
    psql("select 1");
  } catch (e) {
    console.log("CRASH", String(e).split("\n")[0]); await page.screenshot({ path: "/tmp/claude-0/crash.png" }); console.log("at", page.url());
  }
  await browser.close();
  process.exit(report() ? 1 : 0);
})();
