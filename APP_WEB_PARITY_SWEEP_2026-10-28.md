# Mobile versus web functionality sweep — 28 October 2026

## Reference and scope

Backend reference: remote `main` at `3a6b099b6400b9f9265a3b60d2e0185e2b15a82a`.
Web reference: remote `main` at `c28a68780766cc31604f984eb3d6072e26684bc8`.
Both tips were verified with `git ls-remote origin refs/heads/main`. Source comparisons used those immutable commits. DriverApp includes the current uncommitted fuel changes from this session.

This is a source, API-contract and local-build sweep of the active driver, manager, owner and field-agent navigation. SSH inspection verified deployed workflow delegation and organisation route registration. No production records were created or changed. No authenticated iPhone interaction was performed during this sweep.

## Confirmed defects fixed locally

| Defect | Impact | Correction |
| --- | --- | --- |
| `AuthContext` never called the shared client's `setSession()` or `clearSession()` | Screens using `services/client.js`, especially field-agent screens, made requests without bearer/organisation headers; this differs from the separately authenticated telematics client | Populate the shared session on login/restore and clear it on logout/invalidation |
| Shared-client HTTP 401 did not notify the existing session-expiry listener | Shared-client requests could fail while leaving an expired session visible | Notify expiry using the token actually sent, preserving the context's account-isolation guard |
| Telematics HTTP 400 handling discarded the server's message | Validation failures displayed only “Refresh and try again” | Preserve the backend validation message with the existing generic fallback |

Evidence: `frontend/src/context/AuthContext.js`, `frontend/src/services/client.js`, `frontend/src/services/sessionEvents.js`, `frontend/src/telematics/services/telematicsApi.js`.

## Remaining abnormalities and parity gaps

| Priority | Area | Confirmed difference | Evidence / next work |
| --- | --- | --- | --- |
| High | Field-agent organisation selection | Screen calls `/app/v1/auth/orgs`, but backend main registers `/me/orgs`. It also calls `setActiveOrg`, which `AuthContext` does not expose. Active organisation selection/persistence is missing | `screens/driver/account/FieldAgentOrgsScreen.js`; backend `app/routes.js`, `orgMembership.routes.js`; implement the complete selection/session contract |
| High | Manager/owner trip details | `Manager trip` filters the already-loaded trip list and renders current vehicle position. It does not fetch `/auto-trips/:id` or `/:id/track`. The map receives an unused `trail` prop; it expects `trailPoints` | `telematics/screens/ManagerScreens.js: Trips`; driver `TripDetail` already demonstrates historical detail/track retrieval |
| High | AdBlue / DEF | App derives AdBlue rows by filtering `/fuel-logs` for `ADBLUE`. Web main's current AdBlue destination is `/def-ledger`, backed by `/api/def-ledger`, with consumption/claims reconciliation | `telematics/services/telematicsApi.js: loadFleet`; web `FleetDataService.js`, `DefLedgerPage.jsx`; this is a different dataset and workflow |
| Medium | Stop explanations | Active “Explain a stop” route returns a placeholder and sends no mutation | `telematics/screens/DriverScreens.js: CaptureForm`; needs the appropriate permitted stop-answer contract and a real form |
| Medium | Team/access management | Owner's “Team & access” screen is explicitly deferred; web main has access-control screens | `telematics/screens/OwnerScreens.js: DeferredTeam`; web `dashboardRoutes.jsx` |
| Medium | CN / POD and ERP trip operations | Legacy app upload screens/services exist, but active driver navigation and GPS trip details do not expose them. Their existence does not establish a usable workflow | `telematics/DriverNavigator.js`, `services/consignmentService.js`, `services/podService.js`; establish the ERP trip linkage before adding actions |
| Medium | Fleet list completeness | Fleet bootstrap requests at most 100 vehicles/trips/drivers. Trip lists and per-vehicle fuel details assembled from those arrays can omit older/out-of-page records. Aggregate summary endpoints are separate and must not be equated with these lists | `telematics/services/telematicsApi.js: loadFleet`; add pagination/detail requests where lists promise completeness |
| Medium | Fuel route location search | New mobile fuel form selects saved source/destination locations. Web also offers Google Places search and creates a saved location from a selected result | Mobile `FuelLogFormScreen.js: LocationChoice`; web `LocationAutocomplete.jsx`; fuel core is aligned, location discovery is not complete parity |

## Shared core paths confirmed in source

Different mobile URLs are valid when they enforce mobile scope and delegate to the same backend service. Endpoint spelling alone is not a defect.

| Function | Current contract / shared core | Verification boundary |
| --- | --- | --- |
| Fuel entry | Common OCR, document upload, previous odometer and `/mileage/fuel-log` flow after this session's changes; shared `FuelLogService.createStandaloneLog()` and timestamp-based odometer fallback | Contract/retry tests and iOS export; current mobile save still needs device confirmation |
| Workshop bill OCR | `/driver/workflows/bills` delegates to `BillService.scanBill()` | Source and upload contract; actual image extraction not re-run |
| Bill review | `/fleet/workflows/bills/:id/review` delegates to `BillService.reviewExtraction()` with version and branch checks | Source and existing contract checks |
| Support and replies | Driver workflow delegates to `Support.createTicket()` and `Support.replyToTicket()` | Source and payload review; no production ticket sent |
| Maintenance creation | Fleet workflow delegates to `maintenance.service.createRecord()` | Source and contract review |
| Documents | Driver document route scopes owner/assigned truck, then stores through `DocumentService.createDocument()` | Scope/upload source; no assumption that every document type supports OCR |
| SOS/issues | `/driver/incidents`; acknowledgement/resolution through scoped fleet workflow | Existing contract and push checks; no emergency report sent |
| Driver truck change | Location-verified `/driver/me/change-truck` and confirmation endpoints | Contract checks; no assignment changed |
| Alerts | Driver `/driver/alerts` and owner `/owner-alerts` with their respective acknowledgement endpoints | Existing payload, account and branch checks |
| Live positions | Fleet uses the live-tracking positions/trail APIs; app polls positions every 30 seconds | Source only; feed freshness and phone-GPS versus truck-GPS integration need a separate live investigation |

## Validation

- `npm run check:api`: passed bearer/organisation headers, logout cleanup, API-prefix normalization and token-specific expiry checks.
- `npm run check:telematics`: passed authenticated request, multipart, fuel document retry, GPS, pagination/branch and offline queue checks; validation-message assertions included.
- `npm run check:push`: passed permission, account-change and registration cleanup checks.
- Source parse and `git diff --check`: passed.
- iOS Expo export: passed after the sweep fixes; bundle success does not verify device interaction.

The remaining rows are tracked findings, not completed implementations. Backend and web main were reference sources only; this sweep changed DriverApp files.
