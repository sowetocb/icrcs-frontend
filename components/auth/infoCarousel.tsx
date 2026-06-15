"use client";

import { useI18n } from "@/app/i18n/localeProvider";

type IconProps = { className?: string };

function IdentityIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="48"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2.5" />
      <path d="M5.5 17a3.5 3.5 0 0 1 7 0" />
      <line x1="15" y1="9" x2="18" y2="9" />
      <line x1="15" y1="13" x2="18" y2="13" />
    </svg>
  );
}

function RegistryIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </svg>
  );
}

function BiometricIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    </svg>
  );
}

function BorderIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function PassportIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="10" r="3" />
      <path d="M9 16h6" />
    </svg>
  );
}

function StatusIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

const CARDS = [
  { key: "identity", Icon: IdentityIcon },
  { key: "registry", Icon: RegistryIcon },
  { key: "biometric", Icon: BiometricIcon },
  { key: "border", Icon: BorderIcon },
  { key: "passport", Icon: PassportIcon },
  { key: "status", Icon: StatusIcon },
] as const;

type CardDef = (typeof CARDS)[number];

function Card({ card }: { card: CardDef }) {
  const { t } = useI18n();
  const { key, Icon } = card;

  return (
    <article className="flex w-72 shrink-0 flex-col rounded-xl border border-line bg-card p-5 shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-50 text-gold-700">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-bold text-navy-700">
        {t(`infoCards.${key}Title`)}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        {t(`infoCards.${key}Body`)}
      </p>
    </article>
  );
}

/**
 * Auto-scrolling strip of information cards describing the
 * necessities of the ICRCS.
 */
export default function InfoCarousel() {
  const { t } = useI18n();

  return (
    <section className="mt-10 max-w-md" aria-label={t("infoCards.eyebrow")}>
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gold-700">
        {t("infoCards.eyebrow")}
      </p>

      <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        <div className="flex w-max gap-4 animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[...CARDS, ...CARDS].map((card, i) => (
            <Card key={`${card.key}-${i}`} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}