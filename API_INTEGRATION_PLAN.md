# DriverApp ↔ Backend API Integration Plan

**Scope:** wire the UI-only React Native prototype (`DriverApp/frontend`) to the real `main-backend` API, reusing the same contracts the `main-frontend` web app already uses.
**Branches (cut from latest of each, 2026‑08‑22):** `feat/app-api-integration` in **DriverApp**, **main-backend**, **main-frontend**.
**Status of the app today:** fully UI‑only. There is **no `services/` layer** — all screens read `demo/mock.js` / `demo/ownerMock.js`. Step 1 of integration is re‑adding an API + auth layer.

---

## 0. Environment & base URL

- Backend: Express, global prefix **`/api`**, **no version segment** (`PORT=3000` → clients hit `http(s)://<host>:3000/api/...`).
- Web app points `VITE_API_BASE_URL` at `https://13.232.78.42.nip.io/v1` and then calls `/api/...` (so effective `…/v1/api/...`). The `/v1` is contradicted by code comments. **⚠️ Confirm the real deployed base** before hardcoding.
- Mobile: add **`EXPO_PUBLIC_API_URL`** (e.g. `https://13.232.78.42.nip.io/v1`); all calls append `/api/...`.

---

## 1. Auth contract (the immediate login task)

### Employee / owner / manager login — password
```
POST /api/auth/login          (public, rate-limited 10 / 15 min)
body:  { "emailOrMobile": <email OR mobile number>, "password": <string> }
200 :  { status:"success", data:{ user, token, organization, permissions } }
401 :  wrong credentials · 403 : SUSPENDED
```
- **One `emailOrMobile` field** matches against `email` OR `mobileNumber` (`$or`). There is **no** separate email vs phone param, and **no OTP** for employees.
- `token` = JWT (`{sub,userId,orgId,role}`, 7‑day). `user` carries `role`, `orgId`, `status`, name, `mobileNumber`. `permissions` = `{key:bool}` map for immediate UI gating.
- **⚠️ UI note:** our new `LoginScreen` collects **email + phone + password** as three fields. The backend wants one `emailOrMobile`. At wire‑up: send `emailOrMobile = email || '+91'+phone` (+ `password`). Either keep 3 fields (send whichever is filled) or simplify to a single "Email or mobile" field. **Decision needed.**

### Driver login — OTP (alternative, passwordless)
```
POST /api/auth/driver/request-otp   body { mobileNumber }
POST /api/auth/driver/verify-otp    body { mobileNumber, otp }  → { user, token, organization }  (30-day JWT)
```
- **Dev caveat:** OTP is hardcoded **`123456`** and SMS is disabled. Any driver number in the DB logs in with `123456`.
- Our current app flow uses **password** (per request); OTP screens are kept for the later switch‑back.

### Session
- `GET /api/auth/me` → `{ user, organization, permissions }` (branch‑scoped if `X‑Branch‑Id` sent). `PATCH /api/auth/me` updates own profile.
- `GET /api/me/orgs` (FIELD_AGENT only) → list orgs before selecting one.

### Headers every authed request must send
| Header | Value | Source |
|---|---|---|
| `Authorization` | `Bearer <token>` | login response |
| `X-Org-Id` | `user.orgId` | login response |
| `X-Branch-Id` | selected branch (omit = enterprise/all) | branch picker (optional) |

- **401 anywhere → clear stored auth + return to Login.** Decode JWT `exp` to pre‑empt expiry.
- **Roles:** `SUPER_ADMIN, OWNER, MANAGER, DRIVER, FIELD_AGENT, KAM, OPS_EXECUTIVE, ACCOUNTS, APPROVER`. Route to driver / owner / manager stack from `user.role` after login (matches our existing role‑split navigator).

---

## 2. What to build in the app for auth (Phase A)

1. **`src/services/api.js`** — axios instance on `EXPO_PUBLIC_API_URL`; request interceptor attaches `Authorization` + `X‑Org‑Id` (+ `X‑Branch‑Id`); response interceptor maps errors and triggers logout on 401. (The pre‑refactor app had exactly this shape — reinstate it.)
2. **`src/context/AuthContext.js`** — real `login({emailOrMobile,password})` → `POST /api/auth/login`; persist `token`/`user`/`orgId`/`permissions` in **expo‑secure‑store** (add dep) or AsyncStorage; expose `user`, `token`, `permissions`, `logout`, `hasPerm(key)`. Replace the demo `demoLogin`.
3. **Wire `LoginScreen`** → `AuthContext.login`; on success the role drives the existing stack switch. Keep `SetPin` as a local gate (client‑only).
4. **`GET /api/auth/me`** on cold start (with stored token) to restore session; on 401 clear + Login.

---

## 3. Backend endpoint inventory (integration‑relevant)

Guards: **A**=authenticated · roles via `authorize(...)` · `perm:x`=`checkPermission` · `feat:x`=org feature‑flag (404 if off). Note `auth('ROLE')` ignores its arg — role limits come only from `authorize`.

**Auth/session:** `POST /api/auth/login` · `POST /api/auth/driver/request-otp` · `/verify-otp` · `GET|PATCH /api/auth/me` · `GET /api/me/orgs`
**Employees:** `GET|POST /api/employees` · `PATCH|DELETE /api/employees/:id` · `/bulk` · `/:id/import` · `/:id/deactivate` (OWNER/MANAGER, perm:drivers)
**RBAC/roles:** `/api/rbac/*` (SUPER_ADMIN) · `/api/access-control/*` (OWNER/MANAGER) · `/api/roles` (OWNER/MANAGER)
**Khata (wallet/ledger):** `GET /api/khata/drivers` · `/drivers/:id/ledger` · `/drivers/:id/summary` · `/vehicles…` (A)
**Expenses:** `GET /api/expenses` · `/summary` · `POST /api/expenses` · `PUT|DELETE /:id` (A, **perm:khataLedger**)
**Trips (fleet):** `GET /api/trips` · `/:id` · `POST /:id/start` · `/:id/end` (MANAGER/**DRIVER**) · `initiate`/`submit`/`enter-*` (MANAGER/OWNER) · `GET /api/trips/vehicle/:vehicleId/last-fuel-log`
**Fuel/mileage:** `POST /api/fuel-logs` · `GET /api/fuel-logs[/unassigned]` · `POST /api/mileage/fuel-log[/from-photo]` · `GET /api/mileage/intervals` · `/last-odometer/:vehicleId`
**OCR:** `POST /api/ocr/scan[/odometer|/receipt|/weight-cert]`
**Documents:** `POST|GET /api/documents` · `GET|PATCH|DELETE /:id` (multipart + OCR)
**Maintenance/repairs:** `GET|POST /api/maintenance` · `/:id` · `/alerts` · `/options` (OWNER/MANAGER/**DRIVER**; delete owner/manager)
**Vehicles:** `GET /api/vehicles` · `/dashboard` · `GET /api/vehicles/:id/documents` (DRIVER/FIELD_AGENT can read); writes OWNER/MANAGER
**Driver location:** `POST /api/driver/location` (self) · `GET /api/drivers/locations` (manager)
**Consignment (CN):** `POST /api/erp/consignments/upload-bilty` (**DRIVER** can upload) · list/detail/`PATCH` (OWNER/MANAGER/OPS) — `feat:erpCnUpdation`
**POD:** `POST /api/erp/pods/upload` (**DRIVER** can upload) · list/`:id`/`PATCH`/`pending`/`ageing-report` — `feat:erpPod`
**ERP Approvals:** `GET /api/erp/approvals[/summary|/:id]` (OWNER/MANAGER/APPROVER/ACCOUNTS) · `POST /:id/decide` (OWNER/APPROVER)
**ERP Advances:** `GET|POST /api/erp/advances` · `/:id` · `/:id/pay` · `/cancel` · `/preview` · `/recoveries` (VIEWERS = OWNER/MANAGER/OPS/ACCOUNTS — **DRIVER not included**)
**ERP Trips:** `GET /api/erp/trips[/pending-close|/:id]` · `POST /:id/close` (OWNER/MANAGER/OPS)
**ERP DO / Placement / Unloading:** `/api/erp/delivery-orders*` · `/api/erp/placements*` (`/board`) · `/api/erp/unloading*` (`/calculate`)
**ERP Sale bills / Ledger / Finance / Dashboard:** `/api/erp/sale-bills*` (+`/outstanding`) · `/api/erp/ledger*` + `/api/erp/vouchers*` · `/api/erp/finance*` · `/api/erp/dashboard/summary`
**Owner alerts:** `GET /api/owner-alerts` · `PUT /:id/ack` (OWNER/MANAGER)
**Fleet dashboards / misc:** `/api/dashboard/*` · `/api/livetracking/positions` · `/api/owner-value/money`

---

## 4. Screen → endpoint mapping (confirm what needs building)

**All 52 design screens already exist in the app** — so there are **no net‑new *UI* screens** required for the core flows. Integration = replacing mock reads/writes with these calls. ✅ = endpoint ready · ⚠️ = backend gap.

### Driver
| Screen | Endpoint(s) | |
|---|---|---|
| Login | `POST /api/auth/login` | ✅ |
| Home | `GET /api/auth/me`, `/api/khata/drivers/:id/summary`, `/api/trips?driverId`, last‑fuel‑log | ✅ |
| Wallet · Bills | `GET /api/expenses?driverId` (+ status) | ⚠️ no status/receipt |
| Wallet · Ledger | `GET /api/khata/drivers/:id/ledger` | ✅ |
| Add bill → Bill sent | `POST /api/expenses` (+ receipt via `/api/documents`,`/api/ocr/scan/receipt`) | ⚠️ no submit/approve/receipt |
| My advances | driver‑scoped advances | ⚠️ DRIVER not in advance VIEWERS |
| Trips / Trip detail | `GET /api/trips`, `/api/trips/:id`, `POST /:id/start|end` | ✅ |
| Consignment note | `POST /api/erp/consignments/upload-bilty` | ✅ (feat gated) |
| POD | `POST /api/erp/pods/upload` | ✅ (feat gated) |
| Fuel capture/details/saved | `POST /api/mileage/fuel-log[/from-photo]`, `/api/ocr/scan/*` | ✅ |
| Fuel log | `GET /api/fuel-logs`, `/api/mileage/intervals` | ✅ |
| Repairs / Log repair | `GET|POST /api/maintenance` | ✅ |
| Documents | `GET|POST /api/documents?entityType=USER` | ✅ |
| Vehicles | `GET /api/vehicles`, `/dashboard`, `/:id/documents` | ✅ |
| Alerts | driver in‑app feed | ⚠️ none (ownerAlerts = owner/manager; notifications = admin) |
| SOS | emergency dispatch | ⚠️ verify (no obvious endpoint; `POST /api/driver/location` exists) |
| Profile / Language | `GET|PATCH /api/auth/me` / client | ✅ |

### Owner
| Screen | Endpoint(s) | |
|---|---|---|
| Dashboard | `/api/erp/dashboard/summary`, `/api/erp/approvals/summary`, `/api/dashboard/*` | ✅ |
| Approvals → Bill detail → Reject | `GET /api/erp/approvals[/:id]`, `POST /:id/decide` | ✅ (but see bill‑loop gap) |
| Money / Driver account | `/api/khata/drivers[/:id/ledger|summary]`, `/api/erp/advances` | ✅ |
| Sale bills | `/api/erp/sale-bills` (+`/outstanding`) | ✅ |
| Fleet | `/api/vehicles`, `/api/vehicles/dashboard`, `/api/livetracking/positions` | ✅ |
| ERP overview | `/api/erp/dashboard/summary`, `/api/erp/finance`, `/api/dashboard/financials` | ✅ |
| Company ledger | `/api/erp/ledger/{entries,statement,balance}` | ✅ |

### Manager / Ops
| Screen | Endpoint(s) | |
|---|---|---|
| Ops home | `/api/erp/approvals/summary`, `/api/erp/placements/board` | ✅ |
| Trips board / Trip detail | `/api/erp/trips[/:id]` | ✅ |
| Approvals | `/api/erp/approvals`, `POST /:id/decide` | ✅ |
| Loads / Delivery order | `/api/erp/delivery-orders*`, `/api/erp/placements*` | ✅ |
| Close trip | `GET /api/erp/trips/pending-close`, `POST /:id/close` | ✅ |
| Unloading | `/api/erp/unloading*` (`/calculate`) | ✅ |
| Placements | `/api/erp/placements/board` | ✅ |
| Advances | `/api/erp/advances`, `POST /:id/pay` | ✅ |

**Small NEW sub‑screens likely needed (not in the current build):** driver **Request Advance** form, **Edit Profile**, **Forgot Password**. Everything else is wiring, not new UI.

---

## 5. Backend gaps (need main-backend work on its branch)

1. **Driver bill → owner‑confirm → wallet loop (biggest).** `expense` has **no** `status` / `receiptUrl` / `rejectionReason`, is **not** linked to `erpApproval`, and `POST /api/expenses` needs `perm:khataLedger`. To deliver the designed loop: add `status(PENDING|CONFIRMED|REJECTED)` + receipt/document ref + `rejectionReason` to expense (or a new `driverBill` module), a **driver‑scoped submit** endpoint, and a **confirm/reject** that posts a khata credit on confirm — or route driver bills through `erpApproval`.
2. **Driver alerts feed.** No driver‑facing notifications endpoint (`ownerAlerts` is owner/manager; `notifications` is admin‑only). Add a driver feed or reuse.
3. **Driver advances view.** `erpAdvance` VIEWERS exclude `DRIVER`. Surface own advances via khata ledger or a driver‑scoped endpoint.
4. **SOS/emergency.** No clear dispatch endpoint found — verify `fleetGuardian`/`ownerAlerts` or build one.
5. **Login field shape.** Backend = single `emailOrMobile` + password; align the 3‑field UI (send whichever) or simplify.
6. **Base‑URL `/v1` ambiguity.** Confirm the deployed prefix.

---

## 6. Phased integration plan

- **Phase A — Auth foundation** *(do first)*: `services/api.js` + `AuthContext` (real login, secure token store, 3 headers, 401→logout, `me` restore) → wire `LoginScreen`. Role → stack.
- **Phase B — Read paths (GET, low risk):** profile/me, khata wallet+ledger, trips list/detail, fuel logs, vehicles, documents, maintenance, owner/ops dashboards & ERP lists. Swap mock reads for API per screen.
- **Phase C — Write paths:** fuel‑log create (+OCR), maintenance create, CN upload, POD upload, trip start/end.
- **Phase D — Bill→wallet loop:** coordinate the backend change (gap #1) on `main-backend`, then wire Add‑bill submit + owner Approvals decide.
- **Phase E — Gaps:** driver alerts feed, driver advances, SOS (gaps #2–4), + the small new sub‑screens.

**Suggested order of wiring by value:** Auth → Home/Wallet(read) → Trips → Fuel → Docs/Repairs/Vehicles → Owner/Ops dashboards → Bill loop (after backend) → gaps.

---

## 7. Open questions for you
1. **Login fields:** keep email + phone + password (send one as `emailOrMobile`), or switch to a single "Email or mobile" + password field?
2. **Driver auth:** password (current) or the driver **OTP** endpoints for the driver role specifically?
3. **Confirm base URL** (`/v1` or not) and provide a working `EXPO_PUBLIC_API_URL` for a test org.
4. **Bill loop:** extend `expense` vs new `driverBill` module vs route through `erpApproval` — which do you want on the backend branch?
5. Which flow do you want wired **first** (I recommend Auth → Wallet)?
