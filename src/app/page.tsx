import { getCatalog } from "@/lib/catalog";

export default async function Home() {
  const products = await getCatalog();
  return (
    <main className="festive-bg flex min-h-screen items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-4xl font-semibold">Elite Fashions</h1>
        <p className="mt-2 text-gold-soft">{products.length} dresses in the catalogue</p>
      </div>
    </main>
  );
}
