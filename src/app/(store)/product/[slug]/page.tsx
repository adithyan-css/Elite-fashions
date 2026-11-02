import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight, MessageCircle, Store, Truck, Wallet } from "lucide-react";
import { categoryName, getCatalog, getProductDetail, getSettings } from "@/lib/catalog";
import { discountPercent, formatPrice } from "@/lib/money";
import { waLink } from "@/lib/whatsapp";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductGallery } from "@/components/store/ProductGallery";
import { ProductPurchase } from "@/components/store/ProductPurchase";

export async function generateStaticParams() {
  const all = await getCatalog();
  return all.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductDetail(slug);
  if (!p) return { title: "Dress not found" };
  return {
    title: `${p.name} (D.No. ${p.designNo})`,
    description: `${p.description} ${formatPrice(p.pricePaise)} at Elite Fashions, Erode.`,
    openGraph: { images: [{ url: p.image }], title: `${p.name} · ${formatPrice(p.pricePaise)}` },
    alternates: { canonical: `/product/${p.slug}` },
  };
}

async function Detail({ params }: { params: PageProps<"/product/[slug]">["params"] }) {
  const { slug } = await params;
  const [p, s, all] = await Promise.all([getProductDetail(slug), getSettings(), getCatalog()]);
  if (!p) notFound();
  const off = discountPercent(p.pricePaise, p.mrpPaise);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const related = all.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.designNo,
    brand: { "@type": "Brand", name: p.brand },
    color: p.colour,
    image: p.images.map((i) => `${site}${i.url}`),
    description: p.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (p.pricePaise / 100).toFixed(2),
      availability: p.sizes.some((z) => z.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${site}/product/${p.slug}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="flex items-center gap-1 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-magenta">
          Shop
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/shop?category=${p.category}`} className="hover:text-magenta">
          {categoryName(p.category)}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-ink">{p.name}</span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={p.images} name={p.name} />
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">
            {p.brand} · D.No. {p.designNo}
          </p>
          <h1 className="mt-2 text-3xl leading-tight font-semibold text-plum sm:text-4xl">{p.name}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-ink">{formatPrice(p.pricePaise)}</span>
            {off > 0 && p.mrpPaise && (
              <>
                <span className="text-lg text-muted line-through">{formatPrice(p.mrpPaise)}</span>
                <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold">{off}% off</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">Price includes taxes where applicable</p>

          {p.variants.length > 1 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold">
                Colour <span className="font-normal text-muted">· {p.colour}</span>
              </p>
              <div className="flex gap-3">
                {p.variants.map((v) => (
                  <Link
                    key={v.slug}
                    href={`/product/${v.slug}`}
                    aria-label={`${v.colour} colour`}
                    aria-current={v.slug === p.slug ? "true" : undefined}
                    className={`relative h-20 w-16 overflow-hidden rounded-xl ring-2 ${v.slug === p.slug ? "ring-magenta" : "ring-sand hover:ring-magenta/50"}`}
                  >
                    <Image src={v.image} alt="" fill sizes="64px" className="object-cover object-top" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <ProductPurchase
              product={{ id: p.id, slug: p.slug, name: p.name, designNo: p.designNo, image: p.image, pricePaise: p.pricePaise }}
              sizes={p.sizes}
            />
          </div>

          <a
            href={waLink(s.whatsapp, `Hi ${s.store_name}! I'm interested in ${p.name} (D.No. ${p.designNo}). ${site}/product/${p.slug}`)}
            target="_blank"
            rel="noopener"
            className="btn-whatsapp mt-3 w-full"
          >
            <MessageCircle className="h-4 w-4" /> Ask about this dress on WhatsApp
          </a>

          <div className="mt-8 space-y-6">
            <section>
              <h2 className="font-sans text-sm font-semibold tracking-wider text-ink uppercase">About this dress</h2>
              <p className="mt-2 leading-relaxed text-muted">{p.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted">Brand</dt>
                <dd>{p.brand}</dd>
                <dt className="text-muted">Design no.</dt>
                <dd>{p.designNo}</dd>
                <dt className="text-muted">Style</dt>
                <dd>{categoryName(p.category)}</dd>
                <dt className="text-muted">Colour</dt>
                <dd>{p.colour}</dd>
              </dl>
            </section>
            <section className="rounded-2xl bg-cream p-4 text-sm">
              <h2 className="font-sans text-sm font-semibold">Size help</h2>
              <p className="mt-1 text-muted">Sizes follow the brand&apos;s size chart. Not sure which to pick? Send us her age and height on WhatsApp and we&apos;ll suggest the right size.</p>
            </section>
            <ul className="grid gap-3 text-sm sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-magenta" /> Pay by UPI on WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <Store className="h-4 w-4 text-magenta" /> Store pickup in Erode
              </li>
              <li className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-magenta" /> Delivery on request
              </li>
            </ul>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="rel-h">
          <h2 id="rel-h" className="text-2xl font-semibold text-plum">
            You may also like
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} p={r} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2" aria-hidden>
      <div className="aspect-[3/4] animate-pulse rounded-[var(--radius-card)] bg-sand/50" />
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded bg-sand/60" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-sand/60" />
        <div className="h-8 w-32 animate-pulse rounded bg-sand/60" />
      </div>
    </div>
  );
}

export default function ProductPage(props: PageProps<"/product/[slug]">) {
  return (
    <div className="container-x py-8">
      <Suspense fallback={<DetailSkeleton />}>
        <Detail params={props.params} />
      </Suspense>
    </div>
  );
}
