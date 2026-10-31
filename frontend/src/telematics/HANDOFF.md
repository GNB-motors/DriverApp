# Telematics API integration

> Current consolidated developer handoff: [DEVELOPER_HANDOFF.md](../../../DEVELOPER_HANDOFF.md). The sections below preserve the chronological implementation record; early unavailable/initial-slice statements may be superseded by later phases.

The authenticated Driver, Manager and Owner shells use `services/telematicsApi.js`.
Runtime fixtures, scenario controls, mock service, hard-coded driver identity and
preview/legacy data switches have been removed. Failed requests are displayed;
they never activate an in-memory data source.

Set `EXPO_PUBLIC_API_URL` to the same base as the web frontend. The API adapter
preserves a proxy prefix (for example `/v1`) and appends `/api`, consistent with
password login. Rebuild/restart Expo after environment changes.

## Connected in this first integration slice

- Driver: DVA-assigned truck and location source, duty summary, GPS trips,
  fuel history, vehicle documents, own incidents and support tickets.
- Driver writes: manual partial diesel fuel, optional GPS trip association;
  breakdown reporting; support ticket creation.
- Owner/manager: vehicle, trip, fuel and alert lists, branch header, alert acknowledgement.
- Account identity and Bearer token always come from the signed-in session.

The new `/driver/me/vehicle`, `/driver/me/assignment` and `/driver/me/fuel-logs`
endpoints require the companion backend branch. A server without these routes
will display an error; there is no automatic compatibility fallback.

## Still unavailable

Location-verified change-truck pairing, phone tracking, driver alerts, stop notes,
workshop bill uploads, personal documents, driver roster,
review writes, AdBlue and SOS escalation. These actions display an unavailable
state and never simulate success. Lists are currently bounded to 100 server rows;
summary counts describe loaded records, not whole-fleet totals.

This is the start of integration, not completion of the backend plan. Its remaining
P0 security work must finish before a driver release is deployed. No production
migration or deployment is performed by this change.

## Checks

`npm run check:telematics` validates authenticated requests, failure propagation,
GPS trip fuel payloads and absence of runtime mock dependencies.
`npx expo export --platform web` checks bundling. Real-account device verification
against the deployed backend remains required after deployment.

## Phase 2 maps and Owner Alerts

Web uses Google Maps JavaScript, reading EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.
Native uses react-native-maps; iOS defaults to Apple Maps. Android native builds
read EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY through app.config.js. Browser and
Android keys must have the appropriate platform/API restrictions. The local web
key is copied from the frontend; values are never committed.

Live positions read `/livetracking/positions` → data.records. VIN/registration
matching, marker details, search/status filters and recorded 24-hour trails are
wired. Trail gaps are not connected. Position polling runs every 30 seconds in
the foreground and stops on background/unmount/account changes.

The Alerts tab uses the actual `/owner-alerts` feed, with page navigation,
acknowledgement state, type/vehicle and 7/30/90-day filters. Pending badges use
the server count. Ack targets `/owner-alerts/:id/ack`. The operational inbox is
a different endpoint and is not a replacement for this feed.

Backend branch deployment is required for new branch enforcement. Real-account
parity and physical-device map verification remain pending; no deployment is
performed by this implementation. Remaining Phase 1 security blockers apply.

## Phase 3 driver pairing, journeys and location sharing

Driver Change Truck now searches nearby trucks using an explicit phone permission
and accurate fresh GPS, then captures a new fix to confirm the selected truck.
Backend `/driver/me/change-truck` and `/driver/me/change-truck/confirm` validate
proximity, tenant/branch and occupancy. DVA handover uses a transaction, so failed
confirmation preserves the old assignment. Another driver's truck cannot be taken
over. Truck telemetry matches VIN before plate aliases and must have a fresh event.

Trips now paginate with `/auto-trips`; details and `/auto-trips/:id/track` load by
ID, show recorded routes/stops and preserve the GPS trip in Add Fuel. Route errors
are shown separately; no invented coordinates or route lines are used.

More → Location Sharing provides foreground opt-in, optional native background
opt-in and stop controls. Both collectors use `/driver/location/batch` with a
persistent account-scoped queue. Network errors retain records; only acknowledged
batches are removed. Queue capacity is 5,000 fixes with an explicit full error and
recovery on reconnection. Do not clear account queues as part of logout. Background
credentials use SecureStore and are removed on logout/account change. Foreground
updates target two minutes; background scheduling depends on the OS.

Web and Expo Go support foreground sharing only. To test background tracking,
rebuild the native app after installing dependencies (`npx expo run:ios` or
`npx expo run:android`) and grant background/Always location permission. Existing
Expo Go builds do not acquire background support from a JavaScript reload.

Backend batch ingest now updates the latest snapshot/duty only from a newer,
fresh fix, so offline replay cannot masquerade as the current location. The driver
trail API is self-scoped and cursor-paginated; Trip Details displays the separate
truck trip track. Driver records refresh while active and on foreground resume.

Checks: API/JSX/no-runtime-mock and queue failure/replay checks pass; Expo Doctor
21/21; exports for web/iOS/Android pass. Physical-device GPS/background/logout
verification and test backend deployment remain required. Phase 1 release blockers
remain open. This implementation does not deploy the backend or push to main.

## Phase 4 operational workflows

New screens in `workflows/` connect real driver fuel capture/receipts, personal
and assigned-truck documents, workshop OCR evidence, own incidents and support
conversations/replies. Camera/photo/PDF selection uses Expo packages; uploads show
progress and server errors. Detail views request fresh signed links. No sample
receipt, fabricated OCR or simulated save is used.

Driver APIs live under `/driver/workflows`; incident reporting retains the
existing `/driver/incidents` API. Fuel preserves GPS autoTripId separately from
ERP tripId, validates the current/refuel-time assignment and requires odometer
for full-tank fills. Workshop scans are maintenance-domain extractions, not ERP
bills. FAILED/PARTIAL OCR remains visible and requires human review.

Owner/manager routes under `/fleet/workflows` enforce branch scope for roster,
DVA handover, documents, fuel, bills, maintenance and incidents. App screens can
choose/create a maintenance record and review individual bill fields. Review is
transactional and rejects stale edits. Incident acknowledgement/resolution uses
the existing lifecycle. APP fuel approval/rejection and full bill line-item review
remain pending; no field-agent or ERP approval API is substituted.

Submission UUIDs and payloads are saved per account before sending. Same-ID
retries do not repeat writes; changed payloads are rejected. A failed/indeterminate
attempt is not automatically executed again. Check history before intentionally
starting a separate entry. Missing browser/native cached files require reselecting
the same evidence. A saved response followed by refresh failure must stay saved.

Backend deployment needs the DriverOperation unique index, DVA indexes, MongoDB
replica-set transactions, real S3/signing and OCR. Verify the index before enabling
workflows. A process lost before creating its record can leave a reserved operation
requiring operator reconciliation; S3 and database writes are not one transaction.
No production deployment/index command is included in this implementation.

Checks: 134 backend tests passed across two focused runs; app contract checks cover
multipart bytes/authentication, UUIDs and scoped pagination, plus JSX/no-runtime-mock
and offline queue behavior. Expo Doctor 21/21 and web/iOS/Android exports pass.
Actual upload/OCR/device/relogin testing against a test deployment remains required.
Phase 1 security blockers and remaining Phase 4 exit checks still apply.
