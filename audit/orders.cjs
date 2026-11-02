const { chromium } = require("playwright");
const { execSync } = require("child_process");
const BASE = process.env.BASE || "http://localhost:3100";
const EMAIL = "sivaani@elitefashions.test";
const PW = process.env.ADMIN_PW || "Sivaani-Store-2026";
const psql = (q) => execSync(`psql -h 127.0.0.1 -p 5433 -U postgres -d elite -tAc "${q}"`).toString().trim();
const results = [];
const ok = (name, cond, extra = "") => results.push({ name, pass: !!cond, extra });
const report = () => { for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : `  -> ${r.extra}`}`); const f = results.filter((r) => !r.pass).length; console.log(`\n${results.length - f}/${results.length} checks passed`); return f; };
const stockOf = (slug, size) => psql(`select stock from product_sizes z join products p on p.id=z.product_id where p.slug='${slug}' and z.label='${size}'`);

async function placeOrder(browser, slug, size, qty, phone) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/product/${slug}`, { waitUntil: "load" });
  await p.waitForTimeout(800);
  await p.getByRole("radio", { name: size }).click();
  for (let i = 1; i < qty; i++) await p.getByRole("button", { name: "Increase quantity" }).click();
  await p.getByRole("button", { name: "Add to cart" }).click();
  await p.goto(`${BASE}/checkout`, { waitUntil: "load" });
  await p.waitForTimeout(800);
  await p.fill("#customerName", "Kavya S"); await p.fill("#phone", phone);
  await p.getByRole("button", { name: /Place order/ }).click();
  await p.waitForURL(/\/order\/EF-/);
  const u = new URL(p.url());
  return { ctx, page: p, orderNo: u.pathname.split("/").pop(), token: u.searchParams.get("t") };
}

(async () => {
  const browser = await chromium.launch();
  const admin = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const a = await admin.newPage();
  try {
    const o1 = await placeOrder(browser, "tulip-es-8322-p-pink-sharara", "20", 2, "9840011122");
    const o2 = await placeOrder(browser, "knk-7870-mauve-frill-top-lace-skirt", "22", 1, "9840011133");
    ok("two orders placed", o1.orderNo && o2.orderNo, `${o1.orderNo} ${o2.orderNo}`);
    ok("stock untouched before payment", stockOf("tulip-es-8322-p-pink-sharara", "20") === "3");

    await a.goto(BASE + "/admin/login", { waitUntil: "load" });
    await a.waitForTimeout(800);
    await a.fill("#email", EMAIL); await a.fill("#password", PW);
    await a.getByRole("button", { name: "Sign in" }).click();
    await a.waitForURL(/\/admin$/);
    await a.goto(BASE + "/admin/orders?status=awaiting_payment", { waitUntil: "load" });
    ok("orders list filtered shows 2", (await a.locator('[data-testid="admin-order"]').count()) === 2);
    const id1 = psql(`select id from orders where order_no='${o1.orderNo}'`);
    await a.goto(`${BASE}/admin/orders/${id1}`, { waitUntil: "load" });
    await a.waitForTimeout(1200);
    const payHref = await a.getByRole("link", { name: /Send payment request/ }).getAttribute("href");
    const payMsg = decodeURIComponent(payHref.split("text=")[1]);
    ok("payment request goes to customer's WhatsApp", payHref.startsWith("https://wa.me/919840011122?text="));
    ok("payment request has amount + order no", payMsg.includes("Rs. 3,598") && payMsg.includes(o1.orderNo), payMsg.slice(0, 80));

    // wrong amount refused
    await a.fill("#amount", "100");
    await a.getByRole("button", { name: /Payment received/ }).click();
    await a.locator("[role=alert]").filter({ hasText: "match the order total" }).waitFor();
    ok("wrong amount refused", true);

    // double submit from two tabs -> exactly one bill
    const a2 = await admin.newPage();
    await a2.goto(`${BASE}/admin/orders/${id1}`, { waitUntil: "load" });
    await a2.waitForTimeout(1200);
    await a.fill("#amount", "3598"); await a.fill("#reference", "UPI 4455");
    await Promise.all([a.getByRole("button", { name: /Payment received/ }).click(), a2.getByRole("button", { name: /Payment received/ }).click()]);
    await a.waitForTimeout(2500);
    ok("only one payment + one bill despite double click", psql(`select (select count(*) from payments p join orders o on o.id=p.order_id where o.order_no='${o1.orderNo}')||'|'||(select count(*) from invoices i join orders o on o.id=i.order_id where o.order_no='${o1.orderNo}')`) === "1|1");
    ok("stock taken out exactly once (3 -> 1)", stockOf("tulip-es-8322-p-pink-sharara", "20") === "1", stockOf("tulip-es-8322-p-pink-sharara", "20"));
    ok("first bill number is INV/2026-27/0001", psql(`select invoice_no from invoices i join orders o on o.id=i.order_id where o.order_no='${o1.orderNo}'`) === "INV/2026-27/0001");
    await a.reload({ waitUntil: "load" });
    await a.getByTestId("admin-order-status").filter({ hasText: "Paid" }).waitFor();
    ok("admin shows Paid", true);
    const billWa = await a.getByRole("link", { name: /Send bill on WhatsApp/ }).getAttribute("href");
    ok("bill WhatsApp message carries bill link", decodeURIComponent(billWa).includes(`/api/bill/${o1.orderNo}?t=${o1.token}`));

    // bill PDF access rules
    const pdfOk = await a.request.get(`${BASE}/api/bill/${o1.orderNo}`); // admin cookie, no token
    ok("admin can open bill", pdfOk.status() === 200 && pdfOk.headers()["content-type"] === "application/pdf");
    const anon = await browser.newContext();
    const r1 = await anon.request.get(`${BASE}/api/bill/${o1.orderNo}?t=${o1.token}`);
    const pdfBuf = await r1.body();
    ok("customer token opens bill", r1.status() === 200);
    ok("no token -> 404", (await anon.request.get(`${BASE}/api/bill/${o1.orderNo}`)).status() === 404);
    ok("wrong token -> 404", (await anon.request.get(`${BASE}/api/bill/${o1.orderNo}?t=${"x".repeat(24)}`)).status() === 404);
    ok("unpaid order has no bill", (await anon.request.get(`${BASE}/api/bill/${o2.orderNo}?t=${o2.token}`)).status() === 404);
    require("fs").writeFileSync("audit/shots/sample-bill.pdf", pdfBuf);
    const text = execSync("pdftotext -layout audit/shots/sample-bill.pdf -").toString();
    ok("PDF has bill no, order no, total, words", text.includes("INV/2026-27/0001") && text.includes(o1.orderNo) && text.includes("3,598.00") && text.includes("Three Thousand Five Hundred Ninety Eight"), text.slice(0, 200));
    ok("PDF says BILL (no GSTIN set)", /\bBILL\b/.test(text) && !text.includes("TAX INVOICE"));

    // customer status page shows bill + paid
    await o1.page.goto(`${BASE}/order/${o1.orderNo}?t=${o1.token}`, { waitUntil: "load" });
    ok("customer sees Paid + bill link", (await o1.page.getByTestId("order-status").textContent()).includes("Paid") && (await o1.page.getByTestId("bill-link").count()) === 1);

    // status flow + invalid jump
    await a.goto(`${BASE}/admin/orders/${id1}`, { waitUntil: "load" });
    await a.waitForTimeout(1200);
    await a.getByRole("button", { name: "Mark packed" }).click();
    await a.getByTestId("admin-order-status").filter({ hasText: "Packed" }).waitFor();
    await a.getByRole("button", { name: "Mark ready for pickup" }).click();
    await a.getByTestId("admin-order-status").filter({ hasText: "Ready for pickup" }).waitFor();
    await a.getByRole("button", { name: "Mark delivered" }).click();
    await a.getByTestId("admin-order-status").filter({ hasText: "Delivered" }).waitFor();
    ok("status flow packed -> pickup -> delivered", psql(`select count(*) from order_events e join orders o on o.id=e.order_id where o.order_no='${o1.orderNo}'`) === "5");
    ok("no actions left after delivered", (await a.getByRole("button", { name: /Mark|Cancel/ }).count()) === 0);

    // pay + cancel order 2 -> stock returned
    const id2 = psql(`select id from orders where order_no='${o2.orderNo}'`);
    await a.goto(`${BASE}/admin/orders/${id2}`, { waitUntil: "load" });
    await a.waitForTimeout(1200);
    await a.selectOption("#method", "cash");
    await a.getByRole("button", { name: /Payment received/ }).click();
    await a.getByTestId("admin-order-status").filter({ hasText: "Paid" }).waitFor();
    ok("second bill is 0002", psql(`select invoice_no from invoices i join orders o on o.id=i.order_id where o.order_no='${o2.orderNo}'`) === "INV/2026-27/0002");
    ok("stock 3 -> 2 after paying order 2", stockOf("knk-7870-mauve-frill-top-lace-skirt", "22") === "2");
    await a.getByRole("button", { name: "Cancel order" }).click();
    await a.getByRole("button", { name: "Tap again to cancel order" }).click();
    await a.getByTestId("admin-order-status").filter({ hasText: "Cancelled" }).waitFor();
    ok("cancel returns stock (2 -> 3)", stockOf("knk-7870-mauve-frill-top-lace-skirt", "22") === "3");
    await a.screenshot({ path: "audit/shots/admin-order.png", fullPage: true });

    // dashboard numbers
    await a.goto(`${BASE}/admin`, { waitUntil: "load" });
    await a.getByText("Vanakkam").waitFor();
    const sales = await a.getByTestId("stat-Sales this month").textContent();
    ok("dashboard month sales = 3,598 (cancelled excluded)", sales.replace(/\D/g, "") === "3598", sales);
  } catch (e) {
    console.log("CRASH", String(e).split("\n")[0]); await a.screenshot({ path: "/tmp/claude-0/crash.png" }); console.log("at", a.url());
  }
  await browser.close();

  // atomic invoice counter under concurrency (direct SQL, 20 parallel connections)
  const out = execSync("node audit/counter-race.cjs").toString().trim();
  ok("20 parallel bill numbers are all unique", out === "20 20", out);
  process.exit(report() ? 1 : 0);
})();
