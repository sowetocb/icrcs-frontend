#!/usr/bin/env python3
"""Generate ICRCS-Frontend-Architecture-Review.docx using only the stdlib.

A .docx is a ZIP of WordprocessingML parts; we emit minimal valid XML.
"""
import zipfile
from xml.sax.saxutils import escape

OUT = "ICRCS-Frontend-Architecture-Review.docx"

# ---------- run-level markup: **bold**, `code` ----------
def runs(text):
    out = []
    # split on ** first (bold), then handle ` inside each chunk
    bold = False
    for chunk in text.split("**"):
        if chunk:
            out += code_runs(chunk, bold)
        bold = not bold
    return "".join(out)

def code_runs(text, bold):
    out = []
    mono = False
    for chunk in text.split("`"):
        if chunk:
            rpr = ""
            if bold:
                rpr += "<w:b/>"
            if mono:
                rpr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:color w:val="A3260D"/>'
            rpr = f"<w:rPr>{rpr}</w:rPr>" if rpr else ""
            out.append(f'<w:r>{rpr}<w:t xml:space="preserve">{escape(chunk)}</w:t></w:r>')
        mono = not mono
    return out

def para(text, style=None):
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    return f"<w:p>{ppr}{runs(text)}</w:p>"

def bullet(text):
    ppr = '<w:pPr><w:pStyle w:val="ListBullet"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>'
    return f"<w:p>{ppr}{runs(text)}</w:p>"

def cell(text, header=False, width=2600):
    shade = '<w:shd w:val="clear" w:fill="0D1F33"/>' if header else ""
    body = runs(("**" + text + "**") if header else text)
    color = '<w:rPr><w:color w:val="FFFFFF"/><w:b/></w:rPr>' if header else ""
    if header:
        body = f'<w:r>{color}<w:t xml:space="preserve">{escape(text)}</w:t></w:r>'
    return (f'<w:tc><w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>{shade}'
            f'<w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/>'
            f'<w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>'
            f'</w:tcPr><w:p>{body}</w:p></w:tc>')

def table(rows, widths):
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    trs = []
    for i, row in enumerate(rows):
        cells = "".join(cell(c, header=(i == 0), width=widths[j]) for j, c in enumerate(row))
        trs.append(f"<w:tr>{cells}</w:tr>")
    return (
        '<w:tbl><w:tblPr><w:tblStyle w:val="Grid"/><w:tblW w:w="0" w:type="auto"/>'
        '<w:tblBorders>'
        '<w:top w:val="single" w:sz="4" w:color="C9CFDA"/>'
        '<w:left w:val="single" w:sz="4" w:color="C9CFDA"/>'
        '<w:bottom w:val="single" w:sz="4" w:color="C9CFDA"/>'
        '<w:right w:val="single" w:sz="4" w:color="C9CFDA"/>'
        '<w:insideH w:val="single" w:sz="4" w:color="C9CFDA"/>'
        '<w:insideV w:val="single" w:sz="4" w:color="C9CFDA"/>'
        '</w:tblBorders></w:tblPr>'
        f'<w:tblGrid>{grid}</w:tblGrid>{"".join(trs)}</w:tbl>'
        '<w:p/>'
    )

body = []
A = body.append

A(para("ICRCS Tanzania — Frontend Architecture Review", "Title"))
A(para("Integrated Citizen Registry and Control System", "Subtitle"))
A(para("Prepared 8 June 2026 · Focus: front-end implementation, technologies & libraries", "Quote"))

A(para("Executive summary", "Heading1"))
A(para("The entire ICRCS front end runs on three runtime dependencies only — **next**, **react**, and **react-dom** (confirmed in package.json). Every other concern — state management, internationalization, theming, authentication, HTTP, and forms — is custom-built with no third-party libraries. This is a deliberate zero-runtime-dependency architecture on Next.js 16 / Tailwind CSS v4 / React 19."))

A(para("Core stack & tooling", "Heading1"))
A(table([
    ["Concern", "Technology", "Version / notes"],
    ["Framework", "Next.js (App Router, Turbopack)", "16.2.4"],
    ["UI runtime", "React", "19.2.4"],
    ["Language", "TypeScript (strict)", "^5"],
    ["Styling", "Tailwind CSS v4 (CSS-first)", "^4 via @tailwindcss/postcss — no tailwind.config.js"],
    ["Linting", "ESLint 9 + eslint-config-next", "flat config"],
    ["Fonts", "next/font/google", "Montserrat + JetBrains Mono, self-hosted at build"],
    ["Config", "next.config.ts (TS-typed)", "—"],
], [2200, 3200, 3800]))

A(para("Routing — Next.js App Router (file-based)", "Heading1"))
A(para("Flat app/ directory (not src/), with @/* → ./* path alias. The root app/layout.tsx wraps all routes."))
A(bullet("Public routes: /, /login, /create-profile, /forgot, /registry, /registry/people, /registry/status"))
A(bullet("Authenticated routes: /dashboard, /dashboard/profile (own nested layout with sidebar + topbar)"))
A(bullet("API route handlers: app/api/proxy/[...path]/route.ts (catch-all same-origin proxy) and app/api/registration/email-id/route.ts"))
A(para("Next 16 specifics handled: route-handler params is a Promise (await ctx.params). Navigation uses next/link and useRouter from next/navigation. No external router library."))

A(para("Rendering model", "Heading1"))
A(para("Server Components by default; the \"use client\" directive is applied only where interactivity or browser APIs are needed (forms, providers, anything touching localStorage/window). Pages are thin Server Components that export metadata and delegate to client view components."))

A(para("State management — React Context + useState (no store library)", "Heading1"))
A(para("No Redux, Zustand, or Jotai. Three hand-rolled Context providers carry cross-cutting state:"))
A(bullet("LocaleProvider — active language + the t() translator"))
A(bullet("ThemeProvider — dark/light mode"))
A(bullet("WizardProvider — the registry wizard's shared { data, set, errors, locked, isFirstPerson }"))
A(para("Local UI state is useState; persistent/cross-cutting state is Context backed by localStorage."))

A(para("Data fetching / HTTP — custom fetch wrapper (no Axios / React Query)", "Heading1"))
A(para("lib/api/client.ts provides apiGet / apiPost / apiPut / apiDelete / apiUpload (multipart), an ApiError class, and getErrorMessage(). There is no query/caching library; the single cache is a hand-written Map in lib/api/lookup.ts."))
A(para("A same-origin proxy (app/api/proxy/[...path]/route.ts) lets the browser call /api/proxy/* while the server forwards to BACKEND_API_BASE_URL — eliminating CORS. It includes idempotent retry and per-attempt timeouts."))
A(para("API modules: lib/api/auth.ts (auth + profile), lib/api/registration.ts (staged submit — submitStage1..6 plus editStage1..4 for amendments), lib/api/lookup.ts (cascading geography + enumerations). All honor a NEXT_PUBLIC_AUTH_BYPASS flag for a mock mode."))

A(para("Authentication & session — custom (no NextAuth)", "Heading1"))
A(para("Token-based auth: lib/auth/session.ts (access/refresh tokens in localStorage) and lib/auth/profile.ts. Custom flows cover register → OTP verify → login → refresh → logout → forgot/reset. Silent token refresh-and-retry on 401/403 via withFreshAuth, with a SessionExpiredError that redirects to /login. Security note: storing tokens in localStorage is a known XSS trade-off versus httpOnly cookies, and is flagged in session.ts."))

A(para("Internationalization — custom (no next-intl / i18next)", "Heading1"))
A(para("app/i18n/messages.ts holds typed en and sw dictionaries where sw is type-checked against en (const sw: typeof en), so a missing Swahili key fails the TypeScript build. t(\"dot.path\") resolves via localeProvider.tsx; the choice persists to localStorage and syncs the <html lang> attribute. Full English/Swahili coverage."))

A(para("Theming / styling — Tailwind v4 @theme + token overrides", "Heading1"))
A(para("app/globals.css declares design tokens in @theme (navy/gold brand plus semantic surface/card/line/ink/muted colors). Dark mode is a .dark class that overrides those CSS variables, so every semantic utility adapts with zero component edits, plus a no-flash inline script in the root layout. Animations (the marquee) are registered via @theme --animate-* tokens because Lightning CSS prunes hand-written keyframes/classes. Icons are inline SVGs (no Lucide); motion uses CSS transitions (no Framer Motion)."))

A(para("Forms & validation — controlled inputs + manual validation (no RHF / Zod)", "Heading1"))
A(para("The six-step registry wizard (registryWizard.tsx) and the auth forms use controlled useState, per-step missingFields() validation, live date-of-birth/age rules, and conditional required-field logic. Custom primitives in components/registry/field.tsx (TextInput / Select / DateInput / FileInput) bind to the wizard Context. Reusable blocks include blocks.tsx, a searchable flag-based countrySelect.tsx, phoneInput.tsx, and the live WardCascade (Country → Region → District → Ward driven by the lookup API)."))

A(para("Persistence", "Heading1"))
A(para("Per-concern localStorage wrappers: icrcs-session, icrcs-profile (plus icrcs-profile-photo data-URL cache), icrcs-registration (draft/resume), icrcs-people, icrcs-locale, icrcs-theme. No IndexedDB or cookies."))

A(para("Not implemented (known gaps)", "Heading1"))
A(bullet("Charts / maps (Recharts, react-simple-maps) — dashboard analytics & national heatmap"))
A(bullet("Automated tests — no Jest, React Testing Library, or Playwright"))

A(para("Deliberate non-dependencies", "Heading1"))
A(para("The concept document recommended shadcn/Radix, Zustand, React Query, React Hook Form + Zod, next-intl, NextAuth, Axios, Lucide, and Framer Motion. None were installed; each is replaced by a custom equivalent above, in keeping with the zero-runtime-dependency Next 16 / Tailwind v4 / React 19 stack."))

document = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    f'<w:body>{"".join(body)}'
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>'
    '</w:body></w:document>'
)

def style(sid, name, size, color, bold, spacing_before=200, based="Normal", outline=None):
    b = "<w:b/>" if bold else ""
    ol = f'<w:outlineLvl w:val="{outline}"/>' if outline is not None else ""
    return (f'<w:style w:type="paragraph" w:styleId="{sid}"><w:name w:val="{name}"/>'
            f'<w:basedOn w:val="{based}"/>'
            f'<w:pPr><w:spacing w:before="{spacing_before}" w:after="80"/>{ol}</w:pPr>'
            f'<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>{b}'
            f'<w:color w:val="{color}"/><w:sz w:val="{size}"/></w:rPr></w:style>')

styles = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>'
    '<w:sz w:val="21"/></w:rPr></w:rPrDefault></w:docDefaults>'
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>'
    '<w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr>'
    '<w:rPr><w:color w:val="1A1A2E"/></w:rPr></w:style>'
    + style("Title", "Title", "52", "0D1F33", True, 0)
    + style("Subtitle", "Subtitle", "28", "8A6C14", False, 0)
    + style("Quote", "Quote", "19", "64748B", False, 0)
    + style("Heading1", "heading 1", "30", "0D1F33", True, 320, outline=0)
    + style("ListBullet", "List Bullet", "21", "1A1A2E", False, 40)
    + '<w:style w:type="table" w:styleId="Grid"><w:name w:val="Table Grid"/></w:style>'
    '</w:styles>'
)

numbering = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/>'
    '<w:lvlText w:val="&#8226;"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr>'
    '<w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/></w:rPr></w:lvl></w:abstractNum>'
    '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>'
)

content_types = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
    '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
    '</Types>'
)

rels = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    '</Relationships>'
)

doc_rels = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'
    '</Relationships>'
)

with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", content_types)
    z.writestr("_rels/.rels", rels)
    z.writestr("word/document.xml", document)
    z.writestr("word/styles.xml", styles)
    z.writestr("word/numbering.xml", numbering)
    z.writestr("word/_rels/document.xml.rels", doc_rels)

print("wrote", OUT)
