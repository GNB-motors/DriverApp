# Nova SpiceKit Design System

> SpiceKit is Nova's fundamental product-design backbone — built to inspire behavioural and visual consistency across Nova's restaurant-technology products and platforms.

## Brand in one line

**Nova** is a restaurant-tech company. Its flagship product is **Nova Edge Pro** — a POS / KDS / payments / printing stack for restaurants (kiosk, KDS, payment terminals, and back-office apps). **SpiceKit** is Nova's design system, named after the spice metaphor: "spices don't add much on their own but create magic when blended right."

- **Vision** — Inspire consistent interaction patterns.
- **Mission** — Provide the right mix of components in the right proportions to enable scalable design, accelerate go-to-market, and establish a style guide that ensures visual and behavioral consistency.
- **Design principles** — Efficient and agile; considered for scale; one voice across surfaces; reliable under operational load.

## Products covered by this system

| Product | Platform | Surface |
| --- | --- | --- |
| Nova Edge Pro (POS / Kiosk / KDS) | Android (Jetpack Compose) | `pl-mob-nova-sync-module/nova-design-token` + product modules (`kiosk/`, `kds/`, `app/`) |
| Nova Edge Pro (marketing / web) | Web | — branding & logo assets in Figma |
| Nova Payments / Print SDKs | Android libs | `nova-payments-sdk`, `nova-print-sdk`, `nova-connect-sdk` |

## Source materials (for human operators)

- **Figma file** — "Nova Design System - Core.fig" (mounted here as a read-only VFS). 48 pages, 224 top-level frames. Key pages: `/Cover`, `/Design-Principles`, `/Design-tokens`, `/Colors`, `/Typeface`, `/Icons`, `/Logos-and-Branding`, `/Spacing-and-grid`, `/Border-radius`, `/Breakpoints`, `/Dark-mode-rises`, and component pages (`/Buttons`, `/Inputs`, `/Tags-and-pills`, `/Dialog`, `/Dropzone`, `/Empty-states`, `/Tooltip`, `/Pagination`, `/PageFooter`, `/Selectors`, `/Stepper`, `/Breadcrumbs`, `/Select-inputs`, `/Notifications-UX`, `/Warning-dialog`, `/Tabular-data-representation`, `/Search-UX`, `/Color-picker`, `/Restaurant-selector-side-drawer`, `/Overflow-menu`, `/Time-picker`, `/Date-picker`, `/Hour-selectors`, `/DialogHouse`, `/Lists`).
- **Codebase** — `pl-mob-nova-sync-module/` — Kotlin multi-module POS codebase. The module `nova-design-token/` holds the canonical tokens:
  - `src/main/assets/design-tokens/Midnight-navy.tokens.json` · dark mode
  - `src/main/assets/design-tokens/Midnight-black.tokens.json` · light mode
  - `src/main/assets/design-tokens/Slate-grey.tokens.json` · alt theme
  - `src/main/assets/design-tokens/spacekit-spacing-token.json` · spacing / radius / type scale
  - `src/main/kotlin/com/nova/design/token/` · Jetpack Compose token bindings (`NovaColorScheme`, `NovaButtonColors`, `NovaInputColors`, etc.)
  - `src/main/res/font/inter_{regular,medium,semibold,bold}.ttf`

---

## Index

```
/
├── README.md                 ← you are here
├── SKILL.md                  ← Agent Skill entry point (if used standalone)
├── colors_and_type.css       ← design tokens as CSS vars + semantic type classes
├── assets/                   ← logos, hero imagery, icon svgs
├── fonts/                    ← self-hosted font files (Inter subset)
├── preview/                  ← cards rendered in the Design System tab
├── ui_kits/
│   └── edge-pro-pos/         ← POS / Kiosk UI kit (high-fidelity recreation)
└── slides/                   ← SpiceKit-style brand / deck templates
```

---

## CONTENT FUNDAMENTALS

**Voice.** Confident, precise, lightly human. Nova writes like a senior operator talking to another senior operator — short sentences, real numbers, no fluff. The Figma cover leads with "Inspire consistent interaction patterns"; the rationale for principles is written conversationally ("Help designers in faster decision making. Help engineers understand design decisions better."). The brand also leans on culinary metaphor: *SpiceKit*, "right mix of components in the right proportions."

**Tone by surface.**

- **Product UI** — functional and terse. Button labels are verbs. Empty / warning states state the fact, then the next action. Error messages describe what happened and how to resolve.
- **Marketing & brand decks** — aspirational and editorial. Big DM Sans headlines, Helvetica Neue eyebrow labels with wide tracking (0.44em), and the occasional Caveat-script annotation used as a designer's margin note (e.g. *"A design system is a product in itself. If built right, it can evolve to a system that supports faster GTM."*).
- **Developer / token docs** — technical. DM Mono token names shown literally (`color-action-background-primary-default`).

**Casing.**

- Sentence case for titles and buttons ("Save changes", "Add new item"), NOT Title Case.
- UPPERCASE only for eyebrows / category labels with heavy tracking (`VISION`, `DESIGN PRINCIPLE`, `ARCHITECTURE BASICS : DESIGN TOKENS`).
- Token names are `kebab-case` with `-` separators: `color-action-background-primary-default`, `spacing-4x`, `border-radius-ultra-soft`.
- Brand is **Nova** (title case). Product is **Nova Edge Pro**. System is **SpiceKit** (one word, capital S, capital K).

**Person.** Second person ("you") when addressing the operator; first person plural ("we", "our") in brand / principle copy. Never first person singular.

**Emoji.** Not used in the product. Exception: the Figma file has a lone 🦖 decorating one debug/legacy icon component — treat it as an easter egg, not a pattern. Do not ship emoji in product UI.

**Unicode characters.** Functional punctuation only — `→` for flow arrows, `·` for separators in labels ("Today · 2 open orders"). No emoji, no decorative symbols.

**Numbers & units.** Always show units next to numbers (`4 px`, `16 px`, `$12.50`). Currency follows the locale; money in the mockups uses `$` with two decimals and a thousands separator.

**Copy samples from Nova source.**

- Headline pattern — "Color palette" · kicker "Colors" · description "A meticulously designed color palette that ensures scalability, harmonizes with our extensive product range, and embodies aesthetic refinement, visual elegance, and balance at its core."
- Brand statement — "NOVA is bold, curious, and unapologetically future-focused — a brand fueled by empathy, driven by energy, and grounded in optimism."
- Detail rationale — "At NOVA, we thrive on attention to detail. Design must be precise — every stroke should inspire."

---

## VISUAL FOUNDATIONS

### Colors

The palette is a **core + semantic** system. Core families: **Nova Rage** (primary indigo-blue), **Midnight Navy** (dark surfaces), **Midnight Black** (near-black neutrals), **Morning Fog** (cool greys), **Nova Blush** (warm coral/pink), **Lilac Haze** (pale violet accent). Supplementary spot colors (`nova-gold`, `nova-bronze`, `nova-leaf`, `nova-fern`, `nova-sky`, `nova-deep`, `nova-nebula`, `nova-splash`) are used for status, category tags, and illustrative moments. Primary CTA is `nova-rage-400` on light surfaces; hover deepens to `nova-rage-700`, pressed to `-800`. Semantic success = `nova-fern` (`#187A32`); error/destructive = `nova-blaze` (`#E5686B`).

**Gradients are reserved for brand surfaces.** Two brand gradients exist — *nova-gradient-light* (`#F9A061 → #E5686C`, warm sunset) and *nova-gradient-dark* (`#E5686C → #6366F1`, sunset-to-night). Don't use them behind dense UI; they belong on logo plaques, hero art, section splash headers, or the favicon.

**Dark-mode surfaces** are literally *Midnight Navy* — `midnight-navy-800 (#0F1428)` canvas, `-700` for elevated cards, `-600` for input backgrounds, with rage-400 retaining brand equity.

### Typography

- **Primary UI** — **Inter** (Regular 400, Medium 500, Semi-Bold 600). Used for every screen.
- **Display / brand decks** — **DM Sans** (Regular, Medium, Bold). Big section titles, cover slides.
- **Mono / token references** — **DM Mono** (Regular). Token names, code, pill values.
- **Eyebrow labels** — **Helvetica Neue Medium** (substituted with `Helvetica, Arial` — flagged below). Uppercase with **0.44em tracking**.
- **Hand-annotation accent** — **Caveat**. Rare. Used for designer's margin comments on brand slides — avoid in product UI.

Type ramp is `xtreme-xs 8 · 3xs 10 · 2xs 12 · xs 14 · s 16 · m 18 · l 20 · xl 24 · 2xl 28 · 3xl 32 · 4xl 36 · 5xl 40`. Letter-spacing tokens run from `ultra-compact -0.25px` to `ultra-lounge 2px`; body copy uses `concise (-0.05)` for tight UI text or `default (+0.05)` for document-like content.

### Spacing & grid

Baseline is **4px**. The spacekit scale is `0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120`. Page gutters on brand surfaces are 60–112 px (1920-wide decks use 112 px). Cards typically use 16–24 px padding.

### Radii

Eleven-step radius system: **hard 0 · baseline 4 · m 8 · md 10 · l 12 · xl 16 · soft 24 · xtra-soft 32 · ultra-soft 44 · super-soft 64 · fully-rounded 999**. Buttons use `radius-m (8)` by default. Cards use `radius-l (12)` or `radius-xl (16)`. Brand slide containers use `radius-ultra-soft (44)`. Floating action / segmented controls use `radius-full (999)`.

### Borders, shadows & elevation

Borders are **thin** (1 px) and **low-contrast** — `rgba(5,8,22,.10)` on light, `rgba(248,248,251,.10)` on dark. Cards rely on **soft shadows with a blue-navy tint** (`rgba(30,34,56,.12)` recurs ~616× in the file) rather than hard-dropped blacks; the system reads as "paper on paper." Focus rings are a 3 px ring in `nova-rage-alpha-20`. There is a distinct **action-area gradient border** — a rage-400 → rage-alpha-20 stroke — used around primary CTA clusters and input fields when focused.

### Hover / press / disabled states

- **Primary button** — default `rage-400` → hover `rage-700` → pressed `rage-800` → disabled `rage-300`. Border color stays `rage-800`.
- **Secondary / ghost** — default transparent + `rage-alpha-10` on hover → `rage-alpha-20` pressed → `rage-alpha-05` disabled. Border uses `rage-alpha-base → alpha-05`.
- **Icon / link** — color shift only (no background), plus optional underline on link.
- No "lift" on hover. No rotation. No scale > 1.02.

### Backgrounds, imagery & illustration

- Product UI uses **flat, clean surfaces** — white (`#FFFFFF`) or `morning-fog-100` (`#F3F3F6`). No repeating patterns, no textures in the interior.
- Brand surfaces use **dramatic editorial photography** (warm, slightly desaturated — see the hero image in `/Design-Principles/Vision`) and **abstract geometric plates** (soft rounded rectangles, asymmetry-mapped logo lockups offset by 15°).
- **Noise** effects occasionally appear on cover art; the Figma file's "NOISE" effect tokens are approximate.
- No hand-drawn illustrations in product. The marketing/deck side uses **clean geometric vector art** paired with occasional Caveat hand-notation.

### Motion

- **Easing** — default `cubic-bezier(.2, 0, 0, 1)` (decelerate) for enters; `cubic-bezier(.4, 0, 1, 1)` (accelerate) for exits. Named in Compose as *nova-ease-standard*.
- **Duration** — 120 ms (micro), 200 ms (standard), 320 ms (dialog / sheet).
- Interactions favor fades and slide-ups; **no bounce**, no elastic springs, no rotation.
- Skeleton loaders use a 1.4 s shimmer with `midnight-navy-600` base and `-500` highlight.

### Transparency & blur

- Alpha tokens exist in 05 / 10 / 20 / 40 / 60 steps per color family. Used for tinted fills (secondary buttons, chips, selection).
- Background blur is used **only on system dialogs and the restaurant-selector side drawer** — a `backdrop-filter: blur(20px)` veil at 40–60% opacity over the scrim.

### Cards

- **Light surface**: `#FFFFFF`, `border: 1px solid rgba(5,8,22,.05)`, `border-radius: 12–16`, `box-shadow: var(--shadow-sm)`. Padding 16–24.
- **Dark surface**: `midnight-navy-700` fill, `midnight-navy-500` border, no shadow needed; occasionally a 1 px gradient rim (rage-alpha-20 → midnight-navy-700-alpha-05) for premium states.
- **Elevated / dialog**: `radius-xl`, `shadow-lg`, sometimes with a gradient rim.

### Layout rules

- Top app bars are fixed 60 px on web/tablet, 56 px on mobile.
- Primary sidebar is 240 px expanded, 64 px collapsed.
- Content max-width: 1280 px in marketing, full-bleed in POS / KDS.
- Grid: 12-column with 24 px gutter on tablet+, 4-column with 16 px gutter on mobile.

---

## ICONOGRAPHY

Nova ships a **custom 24×24 system icon set** — "SpiceKit Icons / System" and "SpiceKit Icons / Filled" — stored as Figma components (`/Icons/SpicekitIconsSystem`, `/Icons/SpiceKitIconsFilled`). Naming convention is `Icons24x24/Generic/<Name>` or `Icon16x16/<Name>`. Style: **1.75–2 px strokes, round joins, slightly softened corners, geometric but not mechanical** — think a cross between Phosphor and Lucide.

Because the raw SVGs live inside the .fig binary (not yet extracted), this design system **substitutes [Lucide](https://lucide.dev/) (CDN)** for icon rendering, matching the 24-px 1.75-stroke grid. Substitution flagged — see CAVEATS below. When you ship production, replace `<NovaIcon name="…">` with the actual SpiceKit sprite.

- **Format**: SVG, inline. 24×24 is default; 16×16 is used inside dense chrome (table rows, chip action).
- **Color**: inherits `currentColor` — pass any fg- token.
- **Emoji**: never in product. Accept-able in internal decks at most.
- **Unicode**: only `→` (flow arrow), `·` (bullet separator), `×` (close glyph in non-icon contexts).

### Logos

- **Primary wordmark** — `assets/nova-wordmark.png` (extracted from the Figma cover). Full brand word "nova" in a custom grotesk.
- **App tile / favicon** — brand uses a rounded-square "N" mark with a gradient fill (`nova-gradient-light`). Dimensions: 32×32, 180×180, 512×512 (Apple sizes present in `/Logos-and-Branding/FavIcons`, `NovaEdgePro*` frames).
- **On dark** — the wordmark appears in `#FFFFFF` on `midnight-navy-900` (`#050816`) backgrounds. Never on a pure black — use Midnight Navy.
- **On gradient** — wordmark stays monochrome (`#110303` over light gradient, `#FFFFFF` over dark gradient).

---

## Developer handoff pointers

- Tokens are exported as the **DTCG-JSON** format (`$type`, `$value`, `com.figma.variableId`) in `nova-design-token/src/main/assets/design-tokens/`. Two modes shipped: `Midnight-navy` (dark) and `Midnight-black` (light), plus experimental `Slate-grey`.
- Android composables consume tokens through `NovaColorScheme.kt` and `NovaColorSchemeMapper.kt` (Jetpack Compose).
- All component color slots are already tokenized (e.g. `NovaButtonColors.kt`, `NovaInputColors.kt`, `NovaChipColors.kt`, `NovaTabSelectorColors.kt`).
- On the web side, use `colors_and_type.css` in this design system as the canonical set until a native web package ships.

---

## CAVEATS & FLAGGED SUBSTITUTIONS

- **Helvetica Neue** — licensed font, not on Google Fonts. The CSS falls back to `Helvetica, Arial, sans-serif`. If you own a Helvetica Neue license, drop `HelveticaNeue-Medium.woff2` into `fonts/` and the eyebrow style will pick it up automatically.
- **SpiceKit system icons** — the native Figma icon set is currently substituted by **Lucide** from CDN, picked to match the 24-px / ~1.75-stroke visual weight. Please export the real SpiceKit SVGs when possible.
- **Motion specifics** — easing curves inferred from the Compose codebase conventions, not pulled verbatim from a Figma spec; confirm with the Android team.
- **`Slate-grey` theme** — parsed but not wired into the CSS; only Midnight-navy (dark) and Midnight-black (light) are exposed.
- **Component recreations** in `ui_kits/` are cosmetic re-implementations intended for high-fidelity mockups. They are not production code and deliberately skip full state machines, accessibility wiring, and edge-case handling.
