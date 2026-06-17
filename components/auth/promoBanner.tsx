"use client";

import { useState } from "react";
import Image from "next/image";
import { useI18n } from "@/app/i18n/localeProvider";
import { LOGO_EMBLEM } from "@/lib/assets";

// Wide promotional photos with a caption relevant to each image. Only real
// image files are listed so no empty placeholder tiles render; add more here as
// their files land in /public/info.
const PHOTOS = [
  { src: "/info/identity.png", captionKey: "promo.capIdentity" },
  { src: "/info/registry.png", captionKey: "promo.capRegistry" },
  { src: "/info/border.png", captionKey: "promo.capBorder" },
];

function Tile({ src, caption }: { src: string; caption: string }) {
  const [ok, setOk] = useState(true);
  return (
    <figure className="w-80 shrink-0 sm:w-96">
      <div className="relative h-52 w-full overflow-hidden rounded-xl bg-gradient-to-br from-navy-700 to-navy-500 shadow-sm sm:h-60">
        {ok ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={caption}
            onError={() => setOk(false)}
            className="h-full w-full object-cover"
          />
        ) : (
          <Image
            src={LOGO_EMBLEM}
            alt={caption}
            width={56}
            height={56}
            className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 object-contain opacity-50"
          />
        )}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-900/40 to-transparent" />
      </div>
      <figcaption className="mt-2 px-2 text-center text-sm font-semibold leading-snug text-navy-700">
        {caption}
      </figcaption>
    </figure>
  );
}

/**
 * Full-width auto-scrolling band of immigration photography sitting directly
 * below the app bar, promoting positive immigration in Tanzania. The track is
 * duplicated for a seamless marquee; it pauses on hover and stops under
 * prefers-reduced-motion.
 */
export default function PromoBanner() {
  const { t } = useI18n();
  return (
    <section
      aria-label={t("promo.title")}
      className="border-b border-line bg-gradient-to-b from-navy-50/60 to-surface"
    >
      <div className="mx-auto w-full max-w-7xl px-6 pt-8">
        <h2 className="font-display text-xl font-bold text-navy-700 sm:text-2xl">
          {t("promo.title")}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          {t("promo.subtitle")}
        </p>
      </div>

      {/* Edge-faded scrolling strip, constrained to the content container so it
          aligns with the cards (left) and the login form (right). */}
      <div className="mx-auto mt-5 w-full max-w-7xl px-6 pb-8">
        <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_2%,black_98%,transparent)]">
          <div className="flex w-max items-start gap-6 animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
            {[...PHOTOS, ...PHOTOS].map((photo, i) => (
              <Tile
                key={`${photo.src}-${i}`}
                src={photo.src}
                caption={t(photo.captionKey)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
