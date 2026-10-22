# Highway Sahayak — Design Implementation Plan

**Scope decided:** adopt the **blue "Nova SpiceKit"** design system across the whole app, and cover **all surfaces** — driver app (React Native), owner ERP + ops (existing web frontend).
**Source designs:** `DriverApp/design/bill-confirmation-wallet-loop/` — `Highway Sahayak All Screens.dc.html` (52 screens, master), `Driver Core/Rest SpiceKit.dc.html`, and the teal `Bill to Wallet.dc.html` (superseded reference).
**Date:** 2026-08-20

---

## 0. Two design systems — the decision that shapes everything

The design folder contains **two visually incompatible systems**. Verified by direct token counts:

| | `Bill to Wallet.dc.html` | The 3 SpiceKit files (incl. All Screens) |
|---|---|---|
| Brand color | Teal `#0F6E60` | **Blue `#4469F0`** (Nova Rage) |
| Fonts | Plus Jakarta Sans + Spline Sans Mono | **Inter + DM Sans + DM Mono** |
| Device frame | 390 × 844 | 412 × 892 |
| Matches current app `src/theme/tokens.js`? | Yes (app is teal today) | No |

**Chosen direction: adopt blue Nova SpiceKit everywhere.** The current RN app is built teal, so this is a **re-theme of the existing app** (Phase 0) before/alongside new screens — not just additive work. The teal `Bill to Wallet` file is kept only as a layout reference for the bill→wallet loop; its colors/fonts are discarded.

---

## 1. Gap analysis — design screen → current app

Legend: ✅ exists (restyle only) · 🟡 partial · 🔴 new build · ⚙️ needs backend

### Onboarding (blue)
| Design | Current app | Status |
|---|---|---|
| E1 Splash (brand) | `components/ui/SplashScreen.js` (loader only) | 🟡 rebuild as brand splash |
| E2 Language | `LanguageSelectionScreen.js` | ✅ restyle to radio-cards |
| E3 Phone + keypad | `LoginScreen.js` (OTP) | 🟡 add custom numeric keypad, country code |
| E4 OTP + resend timer | `LoginScreen.js` | 🟡 6-cell input + timer + SMS autoread |
| E5 Set PIN | — | 🔴 new (app-open + wallet gate) |

### Home & trips
| Design | Current app | Status |
|---|---|---|
| 01 Home on duty | `HomeScreen.js` | 🟡 add duty toggle, wallet hero, trip stage bar |
| 02 Home off duty | `HomeScreen.js` | 🟡 off-duty variant + licence warning banner |
| 03 Active trip (8-stage) | — | 🔴⚙️ new |
| 04 My trips (tabs+list) | — | 🔴⚙️ new |
| 05 Trip detail (closed) | — | 🔴⚙️ new |

### Wallet & bill loop — **the core ask**
| Design | Current app | Status |
|---|---|---|
| 06 Wallet · Bills | — | 🔴⚙️ new |
| 07 Wallet · Ledger | — | 🔴⚙️ new (reuse `khata` ledger API) |
| 08 Wallet · empty | — | 🔴 new |
| 09 Add bill | — | 🔴⚙️ new (clone Refuel capture template) |
| 10 Bill sent (pending) | `RefuelSuccessScreen.js` (pattern) | 🔴 new from template |
| 11 My advances | — | 🔴⚙️ new (reuse `erpAdvance` API) |

### Shell & account
| Design | Current app | Status |
|---|---|---|
| 12 Profile | `ProfileScreen.js` | 🟡 add wallet card + grouped rows |
| 13 Language (bottom sheet) | `ChooseLanguageScreen.js` | 🟡 convert to bottom sheet |
| 14 Alerts | — | 🔴⚙️ new (reuse `notifications`/`ownerAlerts`) |
| 15 Vehicles | `VehicleScreen.js` | 🟡 assigned-truck hero + papers + stats |
| 16 More (index) | — | 🔴 new |

### Fuel · repairs · docs · SOS · trip docs
| Design | Current app | Status |
|---|---|---|
| 17 Fuel capture (3 photos) | `UploadPhotosScreen.js` | 🟡 restyle to 2-step |
| 18 Fuel details (OCR) | `RefuelDetailsScreen.js` | 🟡 add "Paid by" segmented |
| 19 Fuel saved | `RefuelSuccessScreen.js` | 🟡 add mileage + wallet projection |
| 20 Fuel log (trend) | `FuelHistoryScreen.js` | 🟡 add bar chart + status pills |
| 21 Repairs | `RepairsMenuScreen.js`/`RepairLogsScreen.js` | 🟡 rewrite off legacy `COLORS` |
| 22 Log repair | `AddRepairScreen.js` | 🟡 rewrite off legacy `COLORS` |
| 23 Documents | `DocumentsScreen.js` | 🟡 validity pills + expiring banner |
| 24 SOS options (sheet) | `SOSOptionsScreen.js` | 🟡 4-type sheet restyle |
| 25 SOS active (red) | `SOSEmergencyActiveScreen.js` | 🟡 escalation checklist + live location |
| 26 Consignment note | — | 🔴⚙️ new (reuse `erpConsignment`) |
| 27 POD | — | 🔴⚙️ new (reuse `erpPod`) |

### Owner (O1–O10) & Ops (M1–M10) — **web ERP, mostly already built**
`main-frontend/frontend` (Vite + React 19 + MUI + Tailwind) already has pages for nearly all of these: `ErpApprovals`, `ErpHome`, `ErpTrips`, `ErpAdvances`, `ErpConsignments`, `ErpPods`, `ErpSaleBills`, `ErpLedger`, `KhataLedger`, `OwnerAlerts`, `Drivers`, `ErpDeliveryOrders`, `ErpUnloading`, `ErpPlacement`, `ErpFinance`. → **Status: mostly ✅ functional; work is backend-wiring for the driver bill loop + optional design alignment.** See Phase 8.

**Totals (driver app):** ~10 new screens 🔴, ~13 restyles 🟡, plus a full re-theme.

---

## 2. Architecture decisions

1. **Re-theme via tokens, not per-screen.** Every modern screen already imports from `theme/tokens.js` through the `components/ui` barrel. Rewriting `tokens.js` + the shared components propagates the blue system to all compliant screens for free. Only the **legacy Repair screens** (local hardcoded `COLORS`, raw `<Text>`) must be hand-migrated.
2. **Fonts swap** — add `@expo-google-fonts/inter`, `@expo-google-fonts/dm-sans`, `@expo-google-fonts/dm-mono`; keep Hind / Hind Siliguri for hi/bn. `AppText` API (`variant/weight/mono/color`) is unchanged — only the family strings behind it change.
3. **412×892 is a design canvas, not a target.** RN is responsive; no fixed sizing. Keep safe-area insets as today.
4. **Reuse the Refuel flow as the template** for every new capture flow (Add bill, CN, POD): `ScreenHeader` + overlapping white sheet + absolute footer `<Button size="lg">`; `compressImage → makeFileObj → multipart`; OCR/edit state in a `useReducer`; step wiring via `navigation.navigate(..., {params})`, camera merge with `merge:true`, finish with `navigation.reset(...)` into a success screen.
5. **Bill→wallet is backend-first.** The current `expense` model has **no status / receipt / rejection-reason** and its create route is gated by the owner-only `checkPermission('khataLedger')`. The loop needs a real driver-submitted-reimbursement lifecycle (see Phase 3).
6. **Owner/ops = existing web ERP + shared backend.** Do not build a second owner app unless a mobile owner surface is explicitly wanted later (open question Q3).

---

## 3. Phase 0 — Design-system foundation (blocks all visual work)

**Goal:** the app renders in blue Nova SpiceKit with no new screens yet.

- **`theme/tokens.js`** — replace color values:
  - `primary #4469F0`, primary border `#213EA7`, deep text `#2646BE`, tint `rgba(47,88,238,.10)`
  - gradient hero `['#213EA7','#2F58EE]` (180°); avatar gradient `['#F9A061','#E5686C]`
  - status: success `#187A32`/bg `#E7F4EA`/dot `#25BA4C`; warning `#C56200`/bg `#FDF3E0`/dot `#F0AA48`; error `#BB2626`/btn `#DD3030`/bg `#FBEAEA`; info-blue `#2666B8`/bg `#E8F1FD`
  - page bg `#F3F3F6`, surface `#FFFFFF`, card border `rgba(5,8,22,.05)`
- **`theme/fonts.js` + `tokens.fontFamily`** — Inter (display/UI), DM Sans (headings), DM Mono (numbers); update `FONT_MAP` and the `bodyFont/monoFont` resolvers.
- **Shared UI components** — verify against new tokens and patch hardcoded values: `Button` (border `#213EA7`), `ScreenHeader` (new gradient), `Badge` (remap tones to green/amber/red/info-blue vocab), `Chip`, `SegmentedControl`, `Card`.
- **Legacy migration** — rewrite `AddRepairScreen.js` + `RepairLogsScreen.js` onto `components/ui` + tokens (kills the local `COLORS`).
- **New shared components** the design needs (build once, reuse everywhere) — see §11.

**Exit:** existing screens (Home, Login, Refuel, Fuel history, Docs, Profile, SOS) look correct in blue with zero regressions.

---

## 4. Phase 1 — Onboarding (E1–E5)

- **E1 Splash** — brand hero (logo tile, 3 feature rows, Get started / Sign in).
- **E2 Language** — radio selection cards (script glyph tile + native/English + radio), sticky Continue. Backed by `LanguageContext`.
- **E3 Phone** — country-code selector, phone input, consent checkbox, **custom `NumericKeypad`**. Calls `AuthContext.sendOtp` → `requestDriverOtp` (exists).
- **E4 OTP** — 6-cell `OtpInput`, resend timer, SMS-autoread hint → `AuthContext.verifyOtp` → `verifyDriverOtp` (exists).
- **E5 Set PIN** — `PinDots` + keypad; store PIN in **`expo-secure-store`** (new dep); gate app open + wallet. Add `Skip`.

**Backend:** OTP endpoints exist. PIN is client-side only (no backend) for v1.
**Nav:** insert `Splash` before `Login`; add `SetPin`; PIN-gate on cold start in `AuthContext`.

---

## 5. Phase 2 — Home + navigation shell (01–02)

- **`FloatingTabBar` → 5-tab bar**: Home · Vehicles · **Trips (center raised FAB)** · Alerts (red count badge) · More. (Today it's Home/Repairs/Docs/Profile + Refuel FAB.)
- **HomeScreen** — duty-status card with **toggle** (on/off variants), **WalletHeroCard**, **active-trip card** (trip chip, In-transit badge, 8-node `StageProgressBar`, Open trip), quick-action grid (Fuel/Add bill/Docs/SOS), last-refuel card; off-duty adds the "no trip" empty card + **licence-expiry warning banner** + trips/distance stat pair.
- **Backend:** duty on/off → driver status (evaluate `driverLocation` / `trip` start-end). Wallet chip → wallet summary (Phase 3).

---

## 6. Phase 3 — Wallet + Bill confirmation loop (06–11) — **core deliverable** ⚙️

### Backend (do first)
Extend `app/modules/expense` into a driver-reimbursement lifecycle (or add a `driverBill` module wrapping it):
- Add fields: `status` (`PENDING|CONFIRMED|REJECTED`), `receiptUrl`/`receiptDocId`, `rejectionReason`, `submittedBy`, `confirmedBy`, `confirmedAt`, `source` (`DRIVER_BILL|FUEL_POCKET`).
- **Driver submit endpoint** — new route without `checkPermission('khataLedger')`; driver-auth only; multipart (photo) + fields; sets `status=PENDING`.
- **Owner confirm/reject endpoints** — reuse/extend `erpApproval`; on **confirm** post a **credit to the driver's khata/wallet ledger** (`khata`/`tripLedger`); on **reject** store reason, no ledger movement.
- **Wallet summary** — balance = Σ confirmed bills − Σ advances paid; expose `GET /wallet/summary` + reuse `GET /khata/drivers/:id/ledger` for screen 07.

### `services/api.js` additions
`submitDriverBill`, `resubmitDriverBill`, `fetchDriverBills(status?)`, `fetchWalletSummary`, `fetchWalletLedger`, `fetchMyAdvances`, `requestAdvance` — all following the `{ token }`-config + `res.data?.data` convention (+ optional `X-Org-Id`).

### Screens
- **08 Wallet empty** → **06 Bills** (segmented Bills/Ledger; Pending/Confirmed/Rejected rows; **rejected card** with reason + Re-submit) → **07 Ledger** (running balance rows + spend-by-category `HBarChart` + "balance moves only after confirm" note).
- **09 Add bill** — category chips, amount, description, date/trip, **photo uploader + OCR** (clone Refuel); footer "owner confirms before wallet". → **10 Bill sent** (success; explicitly "balance not changed yet"; Pending badge).
- **11 My advances** — featured advance breakdown + status rows (Paid/Approved/Rejected) via `erpAdvance`.

**Invariant across UI:** money is provisional until CONFIRMED; rejection always carries a reason + re-submit; rejected amounts render mono + strikethrough.

---

## 7. Phase 4 — Trips + trip documents (03–05, 26–27) ⚙️

- **03 Active trip** — 8-stage vertical stepper, trip-advance card, actions (Submit CN → 26, Record POD → 27, Add expense → 09).
- **04 My trips** — Active/Completed/Cancelled underline tabs + trip cards (status badges, earnings) + pull-to-refresh.
- **05 Trip detail** — route timeline, summary key/value table, documents tiles.
- **26 Consignment note** — load-details, note number, multi-page uploader with per-page quality badge, confirm checkbox, "upload unlocks gate-out".
- **27 POD** — delivery details, signed-POD uploader, condition segmented, receiver/remarks, "submit closes trip + releases earning".

**Backend:** `trip` module exists (start/end/submit/get/list); add **driver-facing stage progression**, and wire **`erpConsignment`** + **`erpPod`** uploads. Link fuel/bills to `tripId`.

---

## 8. Phase 5 — Fuel restyle + confirmation status (17–20)

Restyle the existing flow and fold fuel into the same confirmation loop:
- **17** two-step capture (odometer / pump / bill, 3 photos) with step bar; **18** OCR details + **"Paid by" segmented** (My pocket → goes to wallet loop; Fuel card/Credit → not); **19** success with mileage delta + **wallet projection**; **20** log with **bar-chart trend** + Pending/Confirmed pills.
- **Backend:** fuel logs exist; add owner-confirmation status so **pocket-paid fuel becomes a wallet bill** (shares Phase 3 lifecycle).

---

## 9. Phase 6 — Account & shell screens (12–16, 21–23)

- **12 Profile** (wallet card + grouped rows + logout), **13 Language** (bottom sheet), **14 Alerts** (Needs-action/All tabs, alert cards with deep-link CTAs — back by `notifications`/`ownerAlerts`), **15 Vehicles** (assigned-truck hero + papers validity + stats + service progress), **16 More** (menu index + SOS).
- **21 Repairs / 22 Log repair** (finish the legacy rewrite from Phase 0; KPI tiles, status pills, cost split, photo manager), **23 Documents** (validity pills, expiring banner, add-doc tile). Backend: `maintenance` + `document` modules exist.

---

## 10. Phase 7 — SOS (24–25)

- **24 SOS options** — dark-scrim bottom sheet, 4 emergency types (Accident/Breakdown/Theft/Medical), auto location chip.
- **25 SOS active** — full-red screen, pulsing icon, **escalation checklist** (owner notified → ops ack → mechanic assigning), live-location card, Call ops / I-am-safe.
- **Backend:** evaluate `fleetGuardian`/`ownerAlerts`/`notifications` for emergency dispatch + live status.

---

## 11. Phase 8 — Owner (O1–O10) & Ops (M1–M10)

**These are already built as web ERP pages** in `main-frontend/frontend` (MUI + Tailwind). Mapping:

| Design | Existing page |
|---|---|
| O1 Bills to confirm / O2 detail / O3 reject | `pages/ErpApprovals` (+ `KhataLedger`) |
| O4 Owner dashboard / O9 ERP overview | `pages/ErpHome` |
| O5 Money / O10 Company ledger | `pages/ErpLedger`, `pages/ErpFinance` |
| O6 Driver account | `pages/Drivers` |
| O7 Sale bills | `pages/ErpSaleBills` |
| O8 Fleet | (vehicles/fleet pages) |
| M1–M3 Ops home/trips/detail | `pages/ErpTrips` |
| M4 Approvals | `pages/ErpApprovals` |
| M5 Loads / M8 Delivery order / M9 Placements | `pages/ErpDeliveryOrders`, `ErpPlacement` |
| M6 Close trip / M7 Unloading | `pages/ErpTrips`, `ErpUnloading` |
| M10 Advances | `pages/ErpAdvances` |

**Work here is not net-new screens; it's:**
1. **Wire the driver-bill confirmation loop** into `ErpApprovals` (consume the confirm/reject endpoints from Phase 3) — this is what closes the driver's loop.
2. Optional **design alignment** — the mockups are mobile-framed Nova SpiceKit; the web ERP is desktop MUI. Decide (Q3) whether to build a mobile owner-lite surface or treat the web ERP as the owner implementation.

---

## 12. Backend work — consolidated

| Area | Module(s) | Change |
|---|---|---|
| Driver bill lifecycle | `expense` (+ new `driverBill`?) | add status/receipt/reason/audit; driver submit route; confirm/reject |
| Wallet | `khata`, `tripLedger` | credit on confirm; `GET /wallet/summary`; reuse ledger list |
| Advances | `erpAdvance` | driver list + request endpoints |
| Trips | `trip` | driver stage progression, list/detail for driver role |
| Trip docs | `erpConsignment`, `erpPod` | driver upload + gate-out unlock / trip close |
| Fuel | `fuelLog`/`mileage` | pocket-paid → wallet-bill status |
| Alerts | `notifications`, `ownerAlerts` | driver alert feed + deep-link types |
| Owner confirm | `erpApproval` | approve/reject driver bills → ledger |

---

## 13. New shared RN components (build in Phase 0, reuse everywhere)

`StatusBadge` (green/amber/red/info-blue) · `WalletHeroCard` (gradient + chevron) · `TabBar5` w/ center FAB + count badge · `StageProgressBar` (horizontal + vertical stepper) · `PhotoCaptureCard` / `PhotoUploader` (thumbnail + Camera/Gallery/Retake/Add-page + quality badge) · `BottomSheet` (light + dark scrim) · `NumericKeypad` · `OtpInput` · `PinDots` · `RadioCard` · `KeyValueTable` · `BarChart` + `HBarChart` · `AlertCard` · `SegmentedPill` (extend existing `SegmentedControl`) · `WarningBanner` (amber/blue/red variants).

---

## 14. Sequencing & milestones

1. **M0 — Foundation** (Phase 0): re-theme + shared components + legacy migration. *Blocks everything.*
2. **M1 — Entry** (Phase 1): onboarding + PIN.
3. **M2 — Shell** (Phase 2): tab bar + Home on/off duty.
4. **M3 — Wallet loop** (Phase 3, **backend-first**): the headline feature; ship with owner-confirm wired in `ErpApprovals` (Phase 8 item 1).
5. **M4 — Trips** (Phase 4) → **M5 — Fuel** (Phase 5, reuses loop) → **M6 — Account/shell** (Phase 6) → **M7 — SOS** (Phase 7).
6. **M8 — Owner/ops alignment** (Phase 8 item 2), only if a mobile owner surface is chosen.

**Critical path:** M0 → M3 backend → M3 screens → owner-confirm wiring. Fuel (M5) depends on the M3 lifecycle.

---

## 15. Risks & open questions

- **Q1 — Font licensing/bundle:** confirm Inter/DM Sans/DM Mono via `@expo-google-fonts` (adds ~4 families; keep only used weights, as today).
- **Q2 — `expense` vs new `driverBill` module:** extending `expense` reuses khata/reporting but risks touching owner ledger flows; a new module is cleaner but duplicates. **Recommend:** extend `expense` with a `source`/`status` discriminator.
- **Q3 — Owner/ops surface:** the O/M mockups are mobile-framed but the real owner tool is the desktop web ERP. Build a mobile owner app, or treat web ERP as the owner implementation and only wire the bill loop? **Recommend the latter for v1.**
- **Q4 — PIN scope:** client-only (`expo-secure-store`) vs backend-enforced. **Recommend client-only v1.**
- **Q5 — Duty toggle semantics:** does on/off duty drive trip assignment / location tracking, or is it presentational? Needs product confirmation.
- **Q6 — Regression coverage:** the re-theme touches every screen; snapshot/visual QA of existing flows before shipping M0.
