import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AtSign, Clock, Globe, MapPin, MessageCircle, Phone, Sparkles } from "lucide-react";
import { getSettings } from "@/lib/catalog";
import { waLink } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: `About us · Meet ${s.owner_name}`,
    description: `${s.store_name} on ${s.address_line}, ${s.city}, run by ${s.owner_name}. Festive and party wear for girls.`,
    openGraph: { images: [{ url: s.owner_photo }] },
  };
}

export default async function AboutPage() {
  const s = await getSettings();
  const paragraphs = s.owner_story.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const mapQuery = encodeURIComponent(`${s.store_name}, ${s.address_line}, ${s.city}`);
  return (
    <>
      <section className="festive-bg text-white">
        <div className="container-x grid items-center gap-10 py-14 sm:py-20 md:grid-cols-[minmax(0,340px)_1fr]">
          <div className="relative mx-auto w-64 sm:w-72 md:w-full">
            <div className="absolute -inset-3 rounded-[2.25rem] bg-gradient-to-br from-gold-soft/70 via-gold/30 to-transparent blur-sm" aria-hidden />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] ring-4 ring-gold-soft/80">
              <Image src={s.owner_photo} alt={`${s.owner_name}, ${s.owner_title}`} fill priority sizes="(min-width: 768px) 340px, 288px" className="object-cover" data-testid="owner-photo" />
            </div>
          </div>
          <div className="text-center md:text-left">
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-gold-soft uppercase">
              <Sparkles className="h-3.5 w-3.5" /> Meet the owner
            </p>
            <h1 className="mt-3 text-4xl font-semibold sm:text-5xl" data-testid="owner-name">
              {s.owner_name}
            </h1>
            <p className="mt-2 text-lg text-gold-soft">{s.owner_title}</p>
            <div className="mt-6 space-y-4 text-white/85">
              {paragraphs.map((p, i) => (
                <p key={i} className="leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              <a href={waLink(s.whatsapp, `Hi ${s.owner_name}! I'd like to know more about the collection.`)} target="_blank" rel="noopener" className="btn-whatsapp px-6 py-3">
                <MessageCircle className="h-4 w-4" /> Message {s.owner_name}
              </a>
              <Link href="/shop" className="btn border border-white/30 px-6 py-3 text-white hover:bg-white/10">
                See the collection
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x mt-14 grid gap-6 lg:grid-cols-[1fr_1.2fr]" aria-labelledby="visit-h">
        <div className="card p-6">
          <h2 id="visit-h" className="text-2xl font-semibold text-plum">
            Visit the store
          </h2>
          <ul className="mt-5 space-y-4 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-magenta" />
              <span>
                {s.store_name}
                <br />
                {s.address_line}
                <br />
                {s.city}
                <br />
                <a href={s.map_url} target="_blank" rel="noopener" className="font-semibold text-magenta hover:underline">
                  Get directions
                </a>
              </span>
            </li>
            {s.timings && (
              <li className="flex gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-magenta" />
                {s.timings}
              </li>
            )}
            {s.phone_display && (
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-magenta" />
                <a href={`tel:${s.phone_display.replace(/\s/g, "")}`} className="hover:text-magenta">
                  {s.phone_display}
                </a>
              </li>
            )}
            {s.instagram && (
              <li className="flex gap-3">
                <AtSign className="mt-0.5 h-5 w-5 shrink-0 text-magenta" />
                <a href={`https://www.instagram.com/${s.instagram}/`} target="_blank" rel="noopener" className="hover:text-magenta">
                  Instagram @{s.instagram}
                </a>
              </li>
            )}
            {s.blog_url && (
              <li className="flex gap-3">
                <Globe className="mt-0.5 h-5 w-5 shrink-0 text-magenta" />
                <a href={s.blog_url} target="_blank" rel="noopener" className="hover:text-magenta">
                  {s.blog_url.replace(/^https?:\/\//, "")}
                </a>
              </li>
            )}
          </ul>
        </div>
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-sand/70 bg-cream">
          <iframe
            title={`Map to ${s.store_name}`}
            src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
            className="h-80 w-full lg:h-full lg:min-h-80"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </>
  );
}
