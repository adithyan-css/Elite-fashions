import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, ShoppingBag, Sparkles, Wallet } from "lucide-react";
import { categoryName, getCatalog, getSettings } from "@/lib/catalog";
import { CATEGORIES } from "@/db/seed-data";
import { ProductCard } from "@/components/store/ProductCard";
import { waLink } from "@/lib/whatsapp";

export default async function Home() {
  const [all, s] = await Promise.all([getCatalog(), getSettings()]);
  const featured = all.filter((p) => p.isFeatured).slice(0, 8);
  const newest = [...all].sort((a, b) => b.createdAt - a.createdAt || b.id - a.id).slice(0, 8);
  const heroImgs = (featured.length >= 3 ? featured : all).slice(0, 3);
  const tiles = CATEGORIES.map((c) => ({ ...c, p: all.find((p) => p.category === c.slug), count: all.filter((p) => p.category === c.slug).length })).filter(
    (t) => t.p,
  );

  return (
    <>
      {/* Hero */}
      <section className="festive-bg relative overflow-hidden text-white">
        <div className="container-x grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold-soft/40 bg-white/5 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-gold-soft uppercase">
              <Sparkles className="h-3.5 w-3.5" /> Festive collection
            </p>
            <h1 className="mt-5 text-4xl leading-[1.08] font-semibold sm:text-5xl lg:text-6xl">{s.banner_title}</h1>
            <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">{s.banner_subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn bg-gold-soft px-6 py-3 text-plum hover:bg-white">
                Shop the collection <ArrowRight className="h-4 w-4" />
              </Link>
              <a href={waLink(s.whatsapp, `Hi ${s.store_name}! I'd like to see the new Diwali collection.`)} target="_blank" rel="noopener" className="btn border border-white/30 px-6 py-3 text-white hover:bg-white/10">
                <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
              </a>
            </div>
            <p className="mt-6 text-sm text-white/60">
              {s.address_line}, {s.city}
            </p>
          </div>
          <div className="relative mx-auto grid w-full max-w-lg grid-cols-2 gap-3 sm:gap-4">
            {heroImgs.map((p, i) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                className={`relative overflow-hidden rounded-3xl ring-1 ring-white/20 ${i === 0 ? "row-span-2 aspect-[3/5]" : "aspect-[3/4]"}`}
              >
                <Image src={p.image} alt={p.imageAlt} fill priority sizes="(min-width: 1024px) 22vw, 45vw" className="object-cover object-top" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-x mt-14" aria-labelledby="cat-h">
        <div className="flex items-end justify-between gap-4">
          <h2 id="cat-h" className="text-2xl font-semibold text-plum sm:text-3xl">
            Shop by style
          </h2>
          <Link href="/shop" className="text-sm font-semibold text-magenta hover:underline">
            View all
          </Link>
        </div>
        <div className="no-scrollbar mt-6 -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
          {tiles.map((t) => (
            <Link key={t.slug} href={`/shop?category=${t.slug}`} className="group relative w-40 shrink-0 snap-start overflow-hidden rounded-3xl sm:w-auto">
              <div className="relative aspect-[3/4]">
                <Image src={t.p!.image} alt="" fill sizes="(min-width: 640px) 24vw, 160px" className="object-cover object-top transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-plum/85 via-plum/10 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="font-display text-lg leading-tight font-semibold">{categoryName(t.slug)}</p>
                <p className="text-xs text-white/75">{t.count} styles</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="container-x mt-16" aria-labelledby="feat-h">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">Diwali picks</p>
            <h2 id="feat-h" className="mt-2 text-3xl font-semibold text-plum sm:text-4xl">
              Loved this festive season
            </h2>
            <div className="gold-rule mx-auto mt-4 w-40" />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} p={p} priority={i < 2} />
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="container-x mt-20" aria-labelledby="how-h">
        <div className="card overflow-hidden bg-gradient-to-br from-white to-magenta-50/60 p-6 sm:p-10">
          <h2 id="how-h" className="text-2xl font-semibold text-plum sm:text-3xl">
            Order in three easy steps
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { icon: ShoppingBag, t: "Pick your dress", d: "Choose the size, add to cart or save it to your wishlist." },
              { icon: MessageCircle, t: "Send it on WhatsApp", d: "Your order is typed out for you. We confirm stock right away." },
              { icon: Wallet, t: "Pay by UPI, get your bill", d: "Pay with any UPI app. We send your bill and pack your order." },
            ].map((x, i) => (
              <li key={x.t} className="flex gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-magenta text-white">
                  <x.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-gold">Step {i + 1}</p>
                  <p className="font-semibold text-ink">{x.t}</p>
                  <p className="mt-1 text-sm text-muted">{x.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-x mt-20" aria-labelledby="new-h">
        <div className="flex items-end justify-between gap-4">
          <h2 id="new-h" className="text-2xl font-semibold text-plum sm:text-3xl">
            New arrivals
          </h2>
          <Link href="/shop?sort=new" className="text-sm font-semibold text-magenta hover:underline">
            See everything
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
          {newest.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* Owner teaser */}
      <section className="container-x mt-20" aria-labelledby="owner-h">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] bg-cream p-6 sm:grid-cols-[220px_1fr] sm:p-10">
          <div className="relative mx-auto aspect-[4/5] w-44 overflow-hidden rounded-[1.75rem] ring-4 ring-white sm:w-full">
            <Image src={s.owner_photo} alt={`${s.owner_name}, ${s.owner_title}`} fill sizes="220px" className="object-cover" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">Meet the owner</p>
            <h2 id="owner-h" className="mt-2 text-3xl font-semibold text-plum">
              Hi, I&apos;m {s.owner_name}
            </h2>
            <p className="mt-3 max-w-2xl text-muted">{s.owner_story.split("\n")[0]}</p>
            <Link href="/about" className="btn-outline mt-5">
              Our story <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
