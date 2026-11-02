import Image from "next/image";
import Link from "next/link";
import { AtSign, MapPin, MessageCircle, Phone } from "lucide-react";
import { HeaderActions } from "./HeaderActions";
import { NAV } from "./nav";
import { waLink } from "@/lib/whatsapp";

export function AnnouncementBar({ text }: { text: string }) {
  return (
    <div className="bg-plum text-center text-xs font-medium tracking-wide text-gold-soft">
      <p className="container-x py-2">{text}</p>
    </div>
  );
}

export function Header({ storeName }: { storeName: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-sand/70 bg-ivory/90 backdrop-blur supports-[backdrop-filter]:bg-ivory/75">
      <div className="container-x relative flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-1.5 min-[390px]:gap-2 sm:gap-2.5" aria-label={`${storeName} home`}>
          <Image src="/brand/logo.png" alt="" width={40} height={40} className="h-8 w-8 shrink-0 rounded-full ring-2 ring-gold/60 min-[390px]:h-9 min-[390px]:w-9 sm:h-10 sm:w-10" priority />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-[15px] font-semibold whitespace-nowrap text-plum min-[390px]:text-lg sm:text-xl">{storeName}</span>
            <span className="block text-[10px] tracking-[0.2em] text-muted uppercase">Erode</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-sm font-medium text-ink/80 hover:bg-magenta-50 hover:text-magenta">
              {n.label}
            </Link>
          ))}
        </nav>
        <HeaderActions />
      </div>
    </header>
  );
}

export function Footer({ s }: { s: Record<string, string> }) {
  return (
    <footer className="mt-20 bg-plum text-white/85">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <Image src="/brand/logo.png" alt="" width={44} height={44} className="h-11 w-11 rounded-full ring-2 ring-gold/70" />
            <span className="font-display text-2xl font-semibold text-white">{s.store_name}</span>
          </div>
          <p className="mt-3 max-w-md text-sm text-white/70">{s.tagline}. Browse online, order on WhatsApp, pay by UPI, and pick up in store or get it delivered.</p>
          <a href={waLink(s.whatsapp, `Hi ${s.store_name}!`)} target="_blank" rel="noopener" className="btn-whatsapp mt-5">
            <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
          </a>
        </div>
        <div>
          <h3 className="font-sans text-sm font-semibold tracking-widest text-gold-soft uppercase">Shop</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV.slice(0, 5).map((n) => (
              <li key={n.href}>
                <Link className="inline-block py-1.5 hover:text-white" href={n.href}>
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link className="inline-block py-1.5 hover:text-white" href="/wishlist">
                Wishlist
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-sans text-sm font-semibold tracking-widest text-gold-soft uppercase">Visit us</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-soft" />
              <a href={s.map_url} target="_blank" rel="noopener" className="inline-block py-1.5 hover:text-white">
                {s.address_line}, {s.city}
              </a>
            </li>
            {s.phone_display && (
              <li className="flex gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-soft" />
                <a href={`tel:${s.phone_display.replace(/\s/g, "")}`} className="inline-block py-1.5 hover:text-white">
                  {s.phone_display}
                </a>
              </li>
            )}
            {s.timings && <li className="text-white/70">{s.timings}</li>}
            {s.instagram && (
              <li className="flex gap-2">
                <AtSign className="mt-0.5 h-4 w-4 shrink-0 text-gold-soft" />
                <a href={`https://www.instagram.com/${s.instagram}/`} target="_blank" rel="noopener" className="inline-block py-1.5 hover:text-white">
                  @{s.instagram}
                </a>
              </li>
            )}
            <li>
              <Link href="/about" className="inline-block py-1.5 text-gold-soft hover:text-white">
                Meet the owner →
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-x py-5 text-xs text-white/50">
          © {s.store_name}, {s.city}. Prices include taxes where applicable.
        </p>
      </div>
    </footer>
  );
}
