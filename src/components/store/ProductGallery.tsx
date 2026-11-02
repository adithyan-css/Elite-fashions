"use client";

import Image from "next/image";
import { useState } from "react";
import { X, ZoomIn } from "lucide-react";

export function ProductGallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const cur = images[i] ?? images[0];
  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="group relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-card)] bg-cream"
        aria-label={`Zoom photo of ${name}`}
      >
        <Image src={cur.url} alt={cur.alt} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover object-top" />
        <span className="absolute right-3 bottom-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink shadow">
          <ZoomIn className="h-5 w-5" />
        </span>
      </button>
      {images.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto lg:w-20 lg:flex-col">
          {images.map((im, k) => (
            <button
              key={im.url}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Show photo ${k + 1}`}
              aria-current={k === i}
              className={`relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-xl ring-2 lg:w-full ${k === i ? "ring-magenta" : "ring-transparent"}`}
            >
              <Image src={im.url} alt="" fill sizes="80px" className="object-cover object-top" />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div className="fixed inset-0 z-[60] bg-black/90" role="dialog" aria-modal="true" aria-label="Photo zoom" onClick={() => setZoom(false)}>
          <button className="absolute top-4 right-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white" aria-label="Close zoom">
            <X className="h-6 w-6" />
          </button>
          <div className="absolute inset-0 overflow-auto">
            <Image src={cur.url} alt={cur.alt} width={1200} height={1800} sizes="100vw" className="mx-auto h-auto w-full max-w-3xl" />
          </div>
        </div>
      )}
    </div>
  );
}
