"use client";

import { useI18n } from "@/app/i18n/localeProvider";

const STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function Stepper({
  current,
  maxStep,
  submitted,
  onGo,
  onSaveExit,
}: {
  current: number;
  /** Furthest step reached — anything up to here is navigable. */
  maxStep: number;
  /** Stages already submitted to the backend — shown with a tick. */
  submitted: Set<number>;
  onGo: (n: number) => void;
  onSaveExit: () => void;
}) {
  const { t } = useI18n();

  return (
    <aside className="hidden w-72 shrink-0 flex-col bg-sidebar lg:flex">
      {/* Header badge */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-200/50">
          {t("registry.stepsLabel")}
        </p>
      </div>

      <ol className="flex-1 space-y-0.5 px-3 pb-4">
        {STEPS.map((n) => {
          const active = n === current;
          // Ticked once submitted (or simply passed on the way forward), but the
          // step being edited shows as active rather than done.
          const done = !active && (submitted.has(n) || n < maxStep);
          // Reachable anywhere up to the furthest step visited — so the user can
          // jump back and forth between completed stages.
          const locked = n > maxStep;
          return (
            <li key={n}>
              <button
                type="button"
                onClick={() => onGo(n)}
                disabled={locked}
                className={`flex w-full gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                  active
                    ? "bg-sidebar-active text-white shadow-sm"
                    : locked
                      ? "cursor-not-allowed opacity-40"
                      : "hover:bg-sidebar-hover"
                }`}
              >
                <span className="flex flex-col items-center self-stretch">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done
                        ? "bg-success text-white"
                        : active
                          ? "bg-white/20 text-white"
                          : "border border-blue-200/20 text-blue-200/60"
                    }`}
                  >
                    {done ? <CheckIcon /> : n}
                  </span>
                  {n < STEPS.length && (
                    <span className="mt-1 w-px flex-1 bg-white/10" />
                  )}
                </span>
                <span className="pb-5">
                  <span
                    className={`block text-sm font-semibold ${
                      active
                        ? "text-white"
                        : done
                          ? "text-blue-100/90"
                          : "text-blue-200/70"
                    }`}
                  >
                    {t(`registry.s${n}Title`)}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs leading-snug ${
                      active ? "text-blue-100/70" : "text-blue-200/40"
                    }`}
                  >
                    {t(`registry.s${n}Desc`)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onSaveExit}
          className="w-full rounded-lg border border-white/15 py-2.5 text-sm font-semibold text-blue-200/70 transition hover:bg-sidebar-hover hover:text-white"
        >
          {t("registry.saveExit")}
        </button>
      </div>
    </aside>
  );
}
