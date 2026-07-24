# Preview & Declaration — implementation pattern

How the applicant portal's **Preview & Declaration** stage (registration Stage 9)
is built, written so the same pattern can be reproduced in the **CRCS Management
Portal** (e.g. an approval/review workspace).

Source of truth: [`app/registry/steps/stepPreviewDeclaration.tsx`](../app/registry/steps/stepPreviewDeclaration.tsx).

The stage solves one problem: let a user review a large, multi-section record
**without an endless page scroll**, and prove they actually looked at all of it
before they commit. It does that with a sticky horizontal tab strip, a panel that
scrolls inside itself, and a review gate on the submit action.

---

## 1. State — three pieces drive everything

```tsx
const STAGES = [1, 2, 3, 4, 5, 6];
const [activeStage, setActiveStage] = useState(1);
const [reviewed, setReviewed] = useState<Set<number>>(() => new Set([1]));
const allReviewed = STAGES.every((n) => reviewed.has(n));
const stageIdx = STAGES.indexOf(activeStage);

function selectStage(n: number) {
  setActiveStage(n);
  setReviewed((r) => (r.has(n) ? r : new Set(r).add(n))); // viewing == reviewed
}
const goPrev = () => stageIdx > 0 && selectStage(STAGES[stageIdx - 1]);
const goNext = () => stageIdx < STAGES.length - 1 && selectStage(STAGES[stageIdx + 1]);
```

- `reviewed` is a **Set**, seeded with stage 1 because it is visible on open.
- Selecting a stage marks it reviewed **as a side effect** — there is no separate
  "mark as read" control, so the gate can never disagree with what was shown.

---

## 2. Horizontal stage tabs (scrollable + sticky)

```tsx
<div className="sticky top-20 z-20 -mx-5 flex overflow-x-auto border-y border-line bg-card px-5 sm:-mx-6 sm:px-6">
  {STAGES.map((n) => {
    const isActive = activeStage === n;
    const done = reviewed.has(n);
    return (
      <button
        key={n}
        type="button"
        onClick={() => selectStage(n)}
        className={`flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap
                    border-b-2 px-4 py-3 text-center text-sm font-semibold transition sm:flex-1
                    ${isActive
                      ? "border-navy-700 text-navy-700"
                      : "border-transparent text-muted hover:text-navy-700"}`}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
            ${done
              ? "bg-success text-white"
              : isActive
                ? "bg-navy-700 text-white"
                : "border border-input-line text-navy-700"}`}
        >
          {done ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : n}
        </span>
        {t(`registry.s${n}Title`)}
      </button>
    );
  })}
</div>
```

Every class is load-bearing:

| Class | Why it is there |
|---|---|
| `overflow-x-auto` | The strip scrolls **inside itself** on narrow screens |
| `shrink-0` + `whitespace-nowrap` (buttons) | Without these, flex squashes the tabs and labels wrap instead of scrolling |
| `sm:flex-1` | Wide screens: tabs stretch to fill evenly. Mobile: natural width, so they scroll |
| `sticky top-20 z-20` | Pins the strip **below** the 5rem (`h-20`) masthead. `top-0` puts it *under* the topbar (`sticky top-0 z-30`), so it looks like it "disappears" |
| `-mx-5 px-5 sm:-mx-6 sm:px-6` | Bleeds the bar to the card edges (cancelling the card's `p-5`/`p-6`) so the sticky background covers the full width with no gap |
| `border-y` | Gives the bar edges once it detaches and floats over content |

**Three tab states:** numbered circle (unvisited) → filled navy circle (active) →
green circle with a check (reviewed).

---

## 3. Panel scrolls internally; the container never moves

```tsx
<div className="max-h-[52vh] overflow-y-auto pr-1">
  {/* all six PreviewSections */}
</div>
```

That is the whole mechanism:

- `max-h-[52vh]` caps the panel at roughly half the viewport.
- `overflow-y-auto` makes the overflow scroll **within** the panel.
- `pr-1` reserves room for the scrollbar so it never overlaps values.

Result: the sticky tabs above and the declaration checkbox below stay on screen
while long content scrolls. Review happens **horizontally** (via tabs), not by
scrolling a long page.

`52vh` is the only magic number — tune it to the surrounding chrome height.

---

## 4. Only the active stage renders

All sections stay in the tree; each self-suppresses:

```tsx
function PreviewSection({ title, step, onEdit, photo, active = true, children }) {
  if (!active) return null;
  return (
    <section className="rounded-xl border border-line bg-surface/30">
      <div className="flex items-end justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="font-display text-sm font-bold text-navy-700">{title}</h3>
        <div className="flex shrink-0 items-end gap-3">
          {photo && (
            <img src={photo} alt="" className="h-24 w-20 rounded-md border border-line object-cover shadow-sm" />
          )}
          <button type="button" onClick={() => onEdit(step)}>Edit</button>
        </div>
      </div>
      <dl className="divide-y divide-line px-4 py-2">{children}</dl>
    </section>
  );
}

// usage
<PreviewSection title={…} step={1} onEdit={edit} active={activeStage === 1} photo={photoUrl}>
```

Keeps the JSX declarative (no giant `switch`), and each section owns an **Edit**
button that jumps straight back to the corresponding wizard step.

---

## 5. The review gate (the reason the tabs exist)

```tsx
<button onClick={goPrev} disabled={stageIdx === 0}>← Previous</button>

<span className={allReviewed ? "text-success" : "text-muted"}>
  Reviewed {reviewed.size} of {STAGES.length}
</span>

<button onClick={goNext} disabled={stageIdx === STAGES.length - 1}>Next →</button>
```

- The declaration checkbox is **disabled until `allReviewed`**, and its label
  swaps to "Review all sections to agree".
- Submit is gated on that checkbox, so the user cannot submit without opening
  every tab.
- The agreement is **reset on mount**, so a resumed draft can never arrive
  pre-agreed:

```tsx
useEffect(() => {
  if (data.agree === true) set("agree", false);
}, []);
```

---

## 6. Row rendering rules

```tsx
function PreviewRow({ label, value, preserveCase = false }) {
  if (!value || !value.trim()) return null;              // empty fields vanish entirely
  return (
    <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-2 sm:gap-4">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`break-words text-sm text-ink${preserveCase ? "" : " uppercase"}`}>{value}</dd>
    </div>
  );
}
```

- **Empty → render nothing.** Repeatable groups filter first, e.g.
  `.filter((n) => s(\`ec${n}Type\`))`, so a half-filled second emergency contact
  never appears as a phantom block.
- **`break-words`** — a long unbroken token (email, document number) would
  otherwise force the whole page wider.
- Stacked on mobile, two columns from `sm:` up.
- `preserveCase` opts a row out of the default uppercasing (used for emails).

---

## 7. Page-layout prerequisites — do not skip

The internal scrolling only works if nothing upstream forces the page wider than
the viewport:

```tsx
<div className="flex min-h-screen flex-col overflow-x-clip bg-surface">  {/* app root */}
  <DashboardTopbar />                                                    {/* sticky top-0 z-30, h-20 */}
  <div className="flex flex-1">
    <Sidebar />
    <main className="min-w-0 flex-1 px-4 py-5">                          {/* min-w-0 is essential */}
      <div className="mx-auto w-full min-w-0 max-w-7xl">…</div>
    </main>
  </div>
</div>
```

Three rules, each learned from a real bug:

1. **`min-w-0` on every flex child** between the root and the tab strip. A flex
   item defaults to `min-width: auto`, so the `whitespace-nowrap` tab strip
   forces `<main>` wide and the **entire page** scrolls sideways instead of the
   strip scrolling internally. This was the single biggest gotcha.
2. **`overflow-x-clip` on the root** as a guard — use `clip`, **not** `hidden`.
   `overflow-x: hidden` forces `overflow-y` to `auto`, creating a scroll
   container that breaks `position: sticky` on the topbar *and* the tabs.
   `overflow-x: clip` creates no scroll container and leaves sticky intact.
3. Horizontal page scroll also drags the sticky topbar sideways (sticky pins the
   vertical axis only) — which is why a sideways-scrolling page looks like the
   header itself is "moving".

---

## 8. Porting checklist

1. Confirm the masthead height and set the tabs' `top-*` to match (here `h-20` → `top-20`).
2. Ensure the topbar's `z-index` is **above** the tabs' (30 vs 20).
3. Add `min-w-0` down the flex chain to the tab strip; `overflow-x-clip` on the root.
4. Copy the tab strip verbatim; swap `STAGES` and the label lookup.
5. Wrap the content panel in `max-h-[Nvh] overflow-y-auto pr-1`; tune `N`.
6. Match the card padding in the tabs' negative margins (`-mx-5 px-5` for a `p-5` card).
7. Keep the `reviewed` Set + `allReviewed` gate if the portal needs a
   "the reviewer saw everything" guarantee — for an approval workspace that is
   arguably more valuable than in the applicant flow.

---

## 9. Variant: the officer case-details view

Source: [`app/registry/people/officerPeopleList.tsx`](../app/registry/people/officerPeopleList.tsx)
(`DetailView`). This is the closest analogue to a management-portal case screen —
same tabbed shell, but rendering a **server record** rather than wizard form
state. It is the one to copy for an approval workspace.

### 9.1 Layout — only the data moves

The applicant preview caps its panel at `52vh`; the case view instead fills the
remaining viewport so the whole page never scrolls:

```tsx
{/* sticky, opaque, bleeds to the page edges */}
<div className="sticky top-20 z-20 -mx-6 flex overflow-x-auto border-b border-line bg-surface px-6 lg:-mx-10 lg:px-10">
  {tabs.map((tb) => (
    <button
      key={tb.key}
      type="button"
      onClick={() => setActiveTab(tb.key)}
      className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-center text-sm font-semibold transition sm:flex-1
        ${active?.key === tb.key
          ? "border-navy-700 text-navy-700"
          : "border-transparent text-muted hover:text-navy-700"}`}
    >
      {tb.label}
    </button>
  ))}
</div>

{/* ONLY this panel scrolls */}
<div className="max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
  {active?.content}
</div>
```

- The back link, title, Subject ID and **Download PDF** button sit *above* the
  strip and stay fixed, because the page itself no longer scrolls.
- `calc(100vh - 20rem)` = viewport minus the 5rem masthead, `<main>`'s vertical
  padding, and the header + tabs (~20rem total). It is expressed in **rem** so it
  scales with the root font-size on large monitors.
- The `bg-surface` + negative-margin bleed keeps the strip opaque edge-to-edge,
  so rows pass cleanly behind it on short viewports where the page can still
  scroll a little.

### 9.2 Tabs are built from the data, not hardcoded

Only sections that actually carry data become tabs:

```tsx
const tabs: { key: string; label: string; content: ReactNode }[] = [
  { key: "personal", label: "Personal", content: (…) },   // always present
];

if (arr(d.addresses).length > 0) tabs.push({ key: "address", … });
if (arr(d.parents).length > 0)   tabs.push({ key: "parents", … });
// …Education & Work, Emergency, Family, Documents
const active = tabs.find((tb) => tb.key === activeTab) ?? tabs[0];
```

An applicant with no recorded family simply has no **Family** tab — no empty
panels, and the `?? tabs[0]` fallback means a stale `activeTab` can never render
a blank screen.

### 9.3 Three rendering primitives

Everything on the screen is one of these:

**`Section`** — a titled white card:

```tsx
<div className="rounded-2xl border border-line bg-card p-5">
  <h3 className="mb-3 font-display text-base font-bold text-navy-700">{title}</h3>
  {children}
</div>
```

**`KeyGrid`** — an object rendered as a responsive label/value grid:

```tsx
<dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
  {rows.map((r, i) => (
    <div key={i} className="bg-card px-4 py-2.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{r.label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-navy-700">{r.value || "—"}</dd>
    </div>
  ))}
</dl>
```

The hairline dividers are a trick: `gap-px` + `bg-line` on the grid with
`bg-card` cells — the 1px gaps show the container colour, so no per-cell borders
are needed. 1 → 2 → 3 columns as the viewport widens.

**`CardsSection`** — an array of people/records as labelled sub-cards:

```tsx
<Section title={title}>
  <div className="space-y-5">
    {items.map((item, i) => (
      <div key={i}>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gold-700">
          {labelFor(item, i)}
        </p>
        <KeyGrid obj={item} />
      </div>
    ))}
  </div>
</Section>
```

`labelFor` derives a heading from the record itself, with an index fallback —
e.g. `(p, i) => S(p.parentType) || \`Parent ${i + 1}\``, or a person's joined
first/last name.

### 9.4 Generic field flattening (no per-field markup)

The backend payload is rendered generically, so a new field appears
automatically:

```tsx
const isCitizenshipKey = (k: string) => /citizenship/i.test(k);

function flattenPairs(o: Record<string, unknown>) {
  const rows: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(o)) {
    if (v === null || v === undefined || v === "" || isCitizenshipKey(k)) continue;
    if (isObj(v)) {
      // recurse exactly ONE level (e.g. an address `location` object)
      for (const [k2, v2] of Object.entries(v)) {
        if (v2 === null || v2 === undefined || v2 === "" || typeof v2 === "object" || isCitizenshipKey(k2)) continue;
        rows.push({ label: humanize(k2), value: S(v2) });
      }
    } else if (!Array.isArray(v)) {
      rows.push({ label: humanize(k), value: S(v) });
    }
  }
  return rows;
}

const humanize = (k: string) =>
  k.replace(/([a-z])([A-Z])/g, "$1 $2")   // camelCase → spaced
   .replace(/_/g, " ")
   .replace(/\bid\b/gi, "ID")
   .replace(/^./, (c) => c.toUpperCase());
```

Rules worth carrying over:

- **Empty values are dropped**, never rendered as blank rows.
- **One level of nesting** is inlined; arrays get their own `CardsSection`.
- **Labels are derived** from the key (`countryOfBirth` → "Country Of Birth"), so
  no label table to maintain.
- **Suppression is centralised.** Citizenship must never be displayed, so it is
  filtered here rather than at each call site — a new backend field mentioning
  citizenship can't leak into the UI. Put any field-level redaction in this one
  function.

### 9.5 Documents tab

Attachments list name, MIME type and a **View** action. The URL is rewritten
through the same-origin proxy:

```tsx
function officerFileUrl(raw: string): string | null {
  return toProxyUrl(raw); // GET /v1/files/view is public — no officer-specific endpoint
}
```

Documents are also **de-duplicated by type + number** before rendering, because
the same document can arrive from more than one stage.

### 9.6 Deriving the record

`DetailView` takes a `subjectId`, fetches the declaration once, and holds
`loading` / `error` / `data`. The three states render as: a centred spinner, a
danger-bordered error card, or the tabbed content — the tabs never render
half-built.

---

## Related

- Big-screen scaling (root `font-size` clamp + rem tokens): see
  [`app/globals.css`](../app/globals.css) — the `html { font-size: clamp(...) }`
  rule and the `@media (min-width: 1920px)` override. Because the whole UI is
  rem-based, this pattern scales with it; avoid hardcoded `px` font sizes, which
  stay frozen while everything else grows.
