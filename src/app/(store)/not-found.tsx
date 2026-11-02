import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x flex flex-col items-center py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">404</p>
      <h1 className="mt-2 text-3xl font-semibold text-plum">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-muted">The dress may have sold out or moved. Have a look at the full collection.</p>
      <Link href="/shop" className="btn-primary mt-6">
        Browse the collection
      </Link>
    </div>
  );
}
