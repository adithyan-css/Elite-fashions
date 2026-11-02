const postgres = require("postgres").default ?? require("postgres");
const sql = postgres(process.env.AUDIT_DB || "postgres://postgres@127.0.0.1:5433/elite", { max: 20 });
(async () => {
  const r = await Promise.all(
    Array.from({ length: 20 }, () => sql`insert into counters(key,value) values('inv:race',1) on conflict(key) do update set value=counters.value+1 returning value`),
  );
  const v = r.map((x) => x[0].value);
  console.log(new Set(v).size, Math.max(...v));
  await sql`delete from counters where key='inv:race'`;
  await sql.end();
})();
