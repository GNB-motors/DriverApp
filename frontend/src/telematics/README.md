# Telematics Driver, Fleet Manager and Owner demo (F1–F4)

Additive mobile UI and synthetic data services. Existing Nova tokens and UI primitives are reused without modifying them. No backend or ERP screen is changed. Password login now uses the dedicated `/api/app/v1/auth/login` endpoint without changing the shared API base for other resources.

From `DriverApp/frontend`, open the development gallery:

```sh
EXPO_PUBLIC_TELEMATICS_PREVIEW=true npx expo start --clear
```

Open on an iOS simulator or Android device using the normal Expo workflow. To return to the normal app, stop Metro and restart without this variable. This preview is gated by `__DEV__`; it is not a sign-in flow, a role switch or a production feature flag.

The gallery shows duty/KPI/vehicle/driver/alert components and Overview, Loading, Empty, Error, Stale GPS, Phone GPS and No truck scenarios. Tap an alert to acknowledge it locally. “Try again” exits the simulated error. Changes are in memory and reset on preview remount. No real GPS, operational network request, upload or emergency notification runs in the gallery. Existing app-level Sentry initialization still applies when configured.

`createMockTelematicsService({ identity })` creates an isolated in-memory session. `list(resource, { branchId })`, `assignTruck`, `acknowledgeAlert`, `submit('fuel' | 'issues', values)`, `setScenario`, `reset` and `dispose` form the initial service boundary. List results are copies, so screens cannot mutate stored fixtures. The Loading scenario is intentionally held by the gallery; ordinary list calls have a short fixed delay. Branch filters are fixture behavior, not authorization.

Future authenticated integration must key `TelematicsDemoProvider` by user and organization, unmount it on logout and use the authenticated role with `telematicsNavigation`. The dedicated app login URL is now integrated. Secure token storage migration and the remaining F0 account/session checks remain pending; the existing session storage is preserved in this phase. ERP/Khata have no entries in this demo configuration; Field Agent stays in the existing navigator.

Checks:

```sh
node scripts/check-telematics-foundation.mjs
npx expo export --platform ios --output-dir /tmp/telematics-f1-export
```

Device visual review and full role journeys remain pending. F2 adds workshop bills, support, document views and simulated SOS. Attachments are explicit sample placeholders; no camera or document upload runs. F3 delivers Manager screens; F4 adds the Owner shell and organization summary. No map SDK or new dependency is introduced in F1.


## Run the Driver flow

From `DriverApp/frontend`:

```sh
npx expo start --clear
```

Ensure `EXPO_PUBLIC_TELEMATICS_PREVIEW` is unset or `false` to leave the F1 gallery. Sign in with an existing DRIVER account. The new Driver navigator opens by default; its fixed synthetic driver identity is not the real driver’s operational record. All telematics screens use local fixtures. MANAGER opens the F3 fleet shell; OWNER opens the F4 organization shell. FIELD_AGENT retains its existing path.

Set `EXPO_PUBLIC_TELEMATICS_DEMO=false` and restart Metro to restore the preserved legacy Driver/ERP navigator. This client switch controls navigation only; it grants no permissions. Real login remains dedicated app login on either path.

Home, Trips, Inbox and More are tabs. The centre Add button opens the quick-add modal. More includes My truck, location explanation, documents, fuel history, issues, workshop bills, support and profile. Quick-add captures fuel/issues, simulated workshop scans, stop explanations and simulated SOS. Form entries, truck links, acknowledgements and display preference are session-only. Logout/account changes unmount and clear the demo provider.

Development builds expose **More → Demo scenarios** for empty/error/stale GPS/phone fallback/unassigned cases and reset. Initial requests and pull-to-refresh show loading. Error Retry restores the ready scenario. Scenarios are global fixture views and never modify real data.

The trip trail is an illustrative SVG diagram rather than a real map. Document details have no downloadable file. Bill/photo capture uses an explicitly labelled sample placeholder. No emergency is sent from SOS. These are intentional demo boundaries.

Additional verification:

```sh
node scripts/check-telematics-driver.mjs
npx expo export --platform all --output-dir /tmp/telematics-f2-export
```

Both native platform bundle exports and service/URL/driver-projection checks passed during implementation. No real-account login or device UI walkthrough was run; no test account was provided, and the local machine has no available `simctl`. Full F0 security/session work and F5 device checks are still required.


## Fleet Manager (F3)

Start Expo normally with the F1 preview flag unset and sign in using an existing MANAGER account. Home, Live, Drivers, Alerts and More are the five tabs. More includes Fleet, Duty board, Fleet trips, Maintenance, Fuel review, Fleet documents, and Settings & support.

Pune/Mumbai selectors control synthetic branches only. They do not represent real account branch permissions. Every list is fetched from the local service with the selected branch; while switching branches, the previous branch’s data is hidden. A detail opened under another branch shows “Not available in this branch.”

Try these demo journeys:

1. Home → Explore fleet → Vehicle detail → driver/truck details and illustrative trail.
2. Drivers → Driver detail → Link / change truck. Choose an occupied truck to confirm a handover: the displaced driver becomes unlinked and the previous truck is cleared. Available trucks support a direct link.
3. Alerts → alert details → acknowledge. The tab badge and pending list update locally.
4. More → Fuel review → review details → approve or reject. Rejection requires a note; completed decisions cannot be overwritten. Maintenance supports starting/resolving an issue and reviewing a sample workshop bill.
5. Switch to Mumbai and verify its vehicles, driver, fuel, alert, issue and document records. Switch back to see retained local changes.
6. Settings & support → Reset sample data or Log out. Both restore/clear local session state as described above.

The Live tab uses synthetic coordinates on an SVG schematic, not a geographic basemap or live GPS feed. Vehicle trails are illustrative. No telemetry stream, real evidence file, payment, assignment, notification or review request is sent. Support in F3 is an explanatory panel; support delivery is not connected.

Run `node scripts/check-telematics-manager.mjs` for branch filtering, local action guards, handover consistency and review-state checks. Existing Driver and foundation checks also remain applicable. Real-account and device verification remain pending.


## Owner (F4)

Start Expo with the F1 preview flag unset and sign in using an existing OWNER account. Today, Live, Fleet, Alerts and More are the five tabs. All branches is selected initially; Pune/Mumbai chips filter the same synthetic records across the summary, lists, reviews, digest, documents and fuel/AdBlue views.

Today shows organization counts, pending reviews, exceptions and branch drill-downs. More offers Drivers, Digest, Fuel & AdBlue, Duty board, Fleet trips, Maintenance, Fleet documents, Team & access, and Settings & support. Fleet and driver details, local alert acknowledgements, reviews, assignment confirmations and sample trails reuse F3 components. Owner all-branch reviews can act on either branch; a truck handover must still link a driver and vehicle in the same sample branch.

Digest is computed from current sample records. Fuel/AdBlue quantities and costs are sums of recorded fixture entries, including all review statuses; they do not claim real consumption, economy, savings or ERP financial balances. Team invitations and permission changes explicitly show as unavailable. No ERP ledger, sale bill, Khata or ERP finance workflow is mounted.

Run `node scripts/check-telematics-owner.mjs` to verify organization totals reconcile with branch totals, summary changes after local reviews/acknowledgements, handover scope, isolation, reset and empty views. F1–F3 checks remain applicable. Real-account and device UI verification remain pending.

F4 verification: all four check scripts, source syntax checks and Android/iOS Metro exports passed (`/tmp/telematics-f4-export`). No device walkthrough or real-account login was run.


## Verification and handoff (F5)

Run `npm run check:telematics` for syntax/source-boundary auditing and all four service/role check scripts. F5 also exports Android/iOS bundles. See [HANDOFF.md](HANDOFF.md) for exact scope, run/reset commands, outstanding account/device/runtime checks, preserved legacy behavior and remaining F0 work. See [API_INTEGRATION_CHECKLIST.md](API_INTEGRATION_CHECKLIST.md) for locally verified versus missing/unverified future contracts.

Automated verification and handoff are complete; real-account acceptance, device UI regression and runtime traffic capture remain pending. The F5 fixes prevent unsupported restored roles from falling through to Driver screens and prevent a repeated branch tap from invalidating a pending fetch.
