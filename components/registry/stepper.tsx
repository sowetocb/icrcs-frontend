"use client";

import { useI18n } from "@/app/i18n/localeProvider";
import { useMobileNav } from "@/components/layout/mobileNav";
import { Check, X } from "lucide-react";

const STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
// The Referees stage (7) accepts no user input, so it is removed from the wizard
// flow and not shown here. Internal step numbers are unchanged (kept 1:1 with the
// backend stages); only the visible badge numbering stays contiguous (1..8).
const REFEREE_STEP = 7;
const VISIBLE_STEPS = STEPS.filter((n) => n !== REFEREE_STEP);

function CheckIcon() {
  return <Check size={12} strokeWidth={3} aria-hidden="true" />;
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
  // On small screens the steps sidebar is an off-canvas drawer toggled by the
  // top-bar hamburger (shared MobileNav context); on lg+ it's always-visible.
  const { open, setOpen } = useMobileNav();

  // Selecting a step (or saving) closes the mobile drawer so the form is visible.
  function go(n: number) {
    onGo(n);
    setOpen(false);
  }

  return (
    <>
      {/* Mobile drawer is opened from the top-bar hamburger (DashboardTopbar) via
          the shared MobileNav context — no floating edge handle. */}

      {/* Backdrop — tap to dismiss the drawer (mobile only). */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        onMouseLeave={() => setOpen(false)}
        className={`flex w-64 shrink-0 flex-col overflow-y-auto bg-sidebar transition-transform duration-300 ease-in-out
          fixed inset-y-0 left-0 z-50 transform ${open ? "translate-x-0" : "-translate-x-full"}
          lg:sticky lg:top-20 lg:z-auto lg:h-[calc(100vh-5rem)] lg:translate-x-0 lg:self-start lg:overflow-hidden lg:shadow-none`}
      >
        {/* Gold institutional accent bar (matches the ICRCS portal masthead). */}
        <div className="h-1 w-full shrink-0 bg-gold" aria-hidden="true" />

        {/* Header badge + close (close is mobile-only). */}
        <div className="flex items-center justify-between px-3 pt-2 pb-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">
            {t("registry.stepsLabel")}
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("registry.closeSteps")}
            className="-mr-1 rounded-md p-1 text-white/60 transition hover:bg-sidebar-hover hover:text-white lg:hidden"
          >
            <X size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {/* Step list — uses flex on lg+ to distribute items evenly across the
            sidebar height. NOTE: min-h-0 is intentionally omitted so that each
            item keeps its natural content height (title + description); without
            this, flex-shrink can compress items below their content size and
            overflow-hidden clips the description text — the root cause of
            descriptions disappearing on Windows where fonts render taller. */}
        <ol className="flex-1 space-y-0 px-2 pb-1 lg:flex lg:flex-col">
          {VISIBLE_STEPS.map((n, idx) => {
            const active = n === current;
            // Ticked once submitted (or simply passed on the way forward), but the
            // step being edited shows as active rather than done.
            const done = !active && (submitted.has(n) || n < maxStep);
            // Reachable anywhere up to the furthest step visited — so the user can
            // jump back and forth between completed stages.
            const locked = n > maxStep;
            return (
              <li key={n} className="lg:flex lg:flex-1">
                <button
                  type="button"
                  onClick={() => go(n)}
                  disabled={locked}
                  className={`flex w-full gap-2 rounded-lg px-2 py-1.5 text-left transition lg:h-full ${
                    active
                      ? "bg-sidebar-active text-icrcs-navy shadow-sm"
                      : locked
                        ? "cursor-not-allowed opacity-40"
                        : "hover:bg-sidebar-hover"
                  }`}
                >
                  <span className="flex flex-col items-center self-stretch">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${
                        done
                          ? "bg-success text-white"
                          : active
                            ? "bg-icrcs-navy/15 text-icrcs-navy"
                            : "border border-white/20 text-white/60"
                      }`}
                    >
                      {done ? <CheckIcon /> : idx + 1}
                    </span>
                    {idx < VISIBLE_STEPS.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-white/10" />
                    )}
                  </span>
                  <span className="pb-1">
                    <span
                      className={`block text-[17px] font-semibold ${
                        active
                          ? "text-icrcs-navy"
                          : done
                            ? "text-white/90"
                            : "text-white/70"
                      }`}
                    >
                      {t(`registry.s${n}Title`)}
                    </span>
                    <span
                      className={`mt-0.5 block text-[14px] leading-snug ${
                        active ? "text-icrcs-navy/70" : "text-white/40"
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

        <div className="border-t border-white/10 p-1.5">
          <button
            type="button"
            onClick={() => {
              onSaveExit();
              setOpen(false);
            }}
            className="w-full rounded-lg border border-white/15 py-2 text-[15px] font-semibold text-white/70 transition hover:bg-sidebar-hover hover:text-white"
           >
            {t("registry.saveExit")}
          </button>
        </div>
      </aside>
    </>
  );
}
