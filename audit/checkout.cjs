const { chromium } = require("playwright");
const { execSync } = require("child_process");
const BASE = process.env.BASE || "http://localhost:3100";
const psql = (q) => execSync(`psql -h 127.0.0.1 -p 5433 -U postgres -d elite -tAc "${q}"`).toString().trim();
const results = [];
const ok = (name, cond, extra = "") => results.push({ name, pass: !!cond, extra });

const report = () => { for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : `  -> ${r.extra}`}`); };
(async () => {
  const browser = await chromium.launch();
  try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // 1. add two items, view cart
  await page.goto(BASE + "/product/tulip-es-8322-p-pink-sharara", { waitUntil: "load" });
  await page.getByRole("radio", { name: "20" }).click();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await page.goto(BASE + "/product/knk-7080-sage-collared-skirt-set", { waitUntil: "load" });
  await page.getByRole("radio", { name: "24" }).click();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await page.goto(BASE + "/cart", { waitUntil: "load" });
  await page.waitForSelector('[data-testid="cart-line"]');
  ok("cart shows 2 lines", (await page.locator('[data-testid="cart-line"]').count()) === 2);
  ok("cart total = 1799*2 + 999", (await page.textContent('[data-testid="cart-total"]')).replace(/\D/g, "") === "4597");

  // 2. tamper: price set to 1 rupee in local storage -> cart refresh restores real price; order uses server price
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("ef-cart"));
    raw.state.lines = raw.state.lines.map((l) => ({ ...l, pricePaise: 100 }));
    localStorage.setItem("ef-cart", JSON.stringify(raw));
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(1500);
  ok("tampered prices restored by server", (await page.textContent('[data-testid="cart-total"]')).replace(/\D/g, "") === "4597");

  // 3. checkout validation
  await page.goto(BASE + "/checkout", { waitUntil: "load" });
  await page.getByRole("button", { name: /Place order/ }).click();
  await page.waitForTimeout(800);
  ok("empty form shows phone error", await page.getByText("Enter a valid 10-digit mobile number").isVisible());
  await page.fill("#customerName", "Priya Ramesh");
  await page.fill("#phone", "98765 43210");
  await page.getByRole("radio", { name: /Home delivery/ }).click();
  await page.getByRole("button", { name: /Place order/ }).click();
  await page.waitForTimeout(800);
  ok("delivery without address refused", await page.getByText("Please enter the full delivery address").isVisible());
  await page.fill("#address", "12, Gandhi Nagar, Perundurai Road, Erode 638011");
  await page.fill("#note", "Needed before Saturday");
  await page.getByRole("button", { name: /Place order/ }).click();
  await page.waitForURL(/\/order\/EF-\d{4}-\d{4}\?t=/, { timeout: 15000 });
  const url = new URL(page.url());
  const orderNo = url.pathname.split("/").pop();
  const token = url.searchParams.get("t");
  ok("redirected to order page", !!orderNo && token.length === 24, orderNo);
  ok("order total on page = 4597", (await page.textContent('[data-testid="order-total"]')).replace(/\D/g, "") === "4597");
  const wa = await page.locator('[data-testid="send-on-whatsapp"] a').getAttribute("href");
  const text = decodeURIComponent(wa.split("text=")[1]);
  ok("wa.me link targets store number", wa.startsWith("https://wa.me/919999999999?text="), wa.slice(0, 40));
  ok("message has order no, items and total", text.includes(orderNo) && text.includes("Size 20 x 2 = Rs. 3,598") && text.includes("Total: Rs. 4,597") && text.includes(token));
  ok("cart cleared after order", (await page.getByRole("link", { name: /Cart, 0 items/ }).count()) === 1);
  ok("db row saved with server total", psql(`select total_paise||'|'||status||'|'||phone from orders where order_no='${orderNo}'`) === "459700|awaiting_payment|9876543210");
  ok("db has 2 items + 1 event", psql(`select (select count(*) from order_items i join orders o on o.id=i.order_id where o.order_no='${orderNo}')||'|'||(select count(*) from order_events e join orders o on o.id=e.order_id where o.order_no='${orderNo}')`) === "2|1");

  // 4. private link: wrong / missing token
  await page.goto(`${BASE}/order/${orderNo}?t=wrongtokenwrongtokenwron`, { waitUntil: "load" });
  ok("wrong token hides order", (await page.getByText("Order not found").count()) === 1 && !(await page.content()).includes("Priya"));
  await page.goto(`${BASE}/order/${orderNo}`, { waitUntil: "load" });
  ok("missing token hides order", (await page.getByText("Order not found").count()) === 1);
  await page.goto(`${BASE}/order/${orderNo}?t=${token}`, { waitUntil: "load" });
  ok("right token (no new flag) shows status", (await page.textContent('[data-testid="order-status"]')).includes("Awaiting payment"));

  // 5. out-of-stock size is refused even if forced into the cart
  psql("update product_sizes set stock=0 where label='22' and product_id=(select id from products where slug='tulip-ea-7065-magenta-lehenga')");
  const pid = psql("select id from products where slug='tulip-ea-7065-magenta-lehenga'");
  await page.goto(BASE + "/checkout", { waitUntil: "load" });
  await page.evaluate((pid) => {
    localStorage.setItem("ef-cart", JSON.stringify({ state: { lines: [{ key: `${pid}:22`, productId: Number(pid), slug: "tulip-ea-7065-magenta-lehenga", name: "x", designNo: "EA-7065", image: "/brand/logo.png", sizeLabel: "22", qty: 1, pricePaise: 100 }] }, version: 1 }));
  }, pid);
  await page.reload({ waitUntil: "load" });
  await page.fill("#customerName", "Test Buyer");
  await page.fill("#phone", "9123456780");
  await page.getByRole("button", { name: /Place order/ }).click();
  await page.waitForTimeout(1500);
  ok("out-of-stock order refused", await page.getByText(/no longer available/).isVisible());
  ok("no order created for it", psql("select count(*) from orders where phone='9123456780'") === "0");
  psql("update product_sizes set stock=3 where label='22' and product_id=" + pid);

  // 6. pages render
  for (const p of ["/wishlist", "/cart", "/checkout"]) {
    const r = await page.goto(BASE + p, { waitUntil: "load" });
    ok(`${p} 200`, r.status() === 200);
  }
  ok("no page errors", errors.length === 0, errors.join(" | "));
  await page.screenshot({ path: "audit/shots/mobile-checkout.png", fullPage: true });
  } catch (e) { report(); console.log('CRASH', String(e).split('\n')[0]); const pg = browser.contexts()[0]?.pages()[0]; if (pg) { console.log('at', pg.url()); await pg.screenshot({ path: '/tmp/claude-0/crash.png' }); } process.exit(1); }
  await browser.close();
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : `  -> ${r.extra}`}`);
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
