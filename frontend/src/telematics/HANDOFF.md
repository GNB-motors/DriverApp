# Telematics demo verification and handoff

Updated 23 October 2026. Scope: real password login plus synthetic Driver, Fleet Manager and Owner workspaces. No backend, web, ERP screen or production configuration change is included.

## Run and reset

From `DriverApp/frontend`:

```sh
npm run check:telematics
npx expo start --clear
```

Configure `EXPO_PUBLIC_API_URL` for your existing backend. The login URL helper accepts an origin, an `/api` base or an `/api/app/v1` base and resolves the dedicated app login. Keep the shared base appropriate for existing non-auth resources; only password login uses the normalized absolute URL. Do not put credentials in source or logs.

Unset `EXPO_PUBLIC_TELEMATICS_PREVIEW` (or set it to `false`) to use real sign-in. The existing account role chooses the workspace. No test account or dummy-login bypass is created.

- DRIVER: Home / Trips / Add / Inbox / More.
- MANAGER: Home / Live / Drivers / Alerts / More.
- OWNER: Today / Live / Fleet / Alerts / More.
- FIELD_AGENT: preserved existing workspace, outside the dummy-data demo boundary.
- Unsupported roles: explanatory screen with sign-out; they cannot fall through to the legacy Driver workspace.

`EXPO_PUBLIC_TELEMATICS_PREVIEW=true npx expo start --clear` opens the development-only F1 component gallery, without a signed-in role. `EXPO_PUBLIC_TELEMATICS_DEMO=false` restores the existing legacy fleet-role navigation. Restart Metro after changing these variables. The legacy and Field Agent paths can make their existing operational calls; the dummy-data boundary applies to the new telematics shells.

Demo entries live only in memory. Driver development controls: More → Demo scenarios → Reset demo data. Manager/Owner: Settings & support → Reset sample data. Logout, account/organization/role changes, or a full app reload dispose the session and discard sample changes. A normal background/resume is not guaranteed to recreate the session. None of these resets changes backend data.

## Automated evidence

`npm run check:telematics` runs:

- Babel parsing of telematics source and the shared app/navigation/API integration files. No existing lint or test runner script was configured in this checkout; this does not claim an ESLint run.
- A source boundary audit rejecting direct operational SDK, API-service, legacy-hook and network-constructor imports/calls in telematics code. AuthContext is an explicit shared authentication seam. This is a source audit, not a runtime network trace or a full transitive dependency proof. Existing app-level Sentry initialization remains enabled when configured.
- Foundation checks: result-copy isolation, session isolation/disposal, assignments, alert acknowledgements, branch-filtered fixtures, scenarios and reset.
- Driver checks: login URL normalization, actual role-selector behavior (including legacy/Field Agent/unsupported roles), own-driver projection, unassigned documents, local form validation and submissions.
- Manager checks: fixture branch filters, scope checks on local actions, confirmed displacement, consistent driver/truck links, approval/rejection/issue transitions and reset.
- Owner checks: all-branch totals reconcile with branch totals, summaries change after acknowledgements/reviews, same-branch handover rules and independent sessions.

Metro/Hermes export verification:

```sh
npx expo export --platform all --output-dir /tmp/telematics-f5-export
```

Android/iOS JavaScript bundle exports are not installed native builds, simulator launches or device tests. Artifacts stay in `/tmp`, outside the repository. `git diff --check` checks tracked patch whitespace.

F5 review fixed two issues: re-selecting an active branch no longer invalidates a pending fetch without starting another; unsupported restored roles no longer enter Driver legacy screens. Existing ERP screen implementations, Field Agent tab definitions and shared design tokens/components were preserved. Shared changes are the app demo-gallery entry, role selection in AppNavigator, the dedicated password-login URL, an auth comment and the verification npm script. New functionality is under `src/telematics` and `scripts`.

## Manual checks still pending

No account credentials were supplied, and no real-account login was attempted. The host has no usable iOS `simctl` and no `adb` command available. Therefore these checks remain unexecuted:

| Check | Expected result |
|---|---|
| Login as each supported role | Correct workspace; wrong password and network errors remain actionable |
| Restore/restart/logout/account change | Correct identity; no previous account’s sample entries remain after session disposal |
| Driver forms and navigation | Required values validate, keyboard/back behavior works, new entries appear in history |
| Driver truck change | Home and My truck update; occupied truck shows conflict |
| Driver Inbox / SOS | Acknowledgement updates locally; SOS explicitly simulates without sending anything |
| Fuel slip / workshop bill | Sample attachment is clearly labelled; no camera/gallery upload or real OCR runs |
| Manager branch switching | All lists match selection; old-branch details become unavailable; no stale results flash |
| Manager handover/reviews | Explicit confirmation for displacement; rejection needs a note; completed review cannot be overwritten |
| Owner organization/branch views | Totals reconcile; digest, fuel/AdBlue and drill-downs match selection |
| Runtime network capture | In new demo shells, telematics reads/writes, GPS, uploads, streams, push and SOS make no operational requests; login is real; configured Sentry may send diagnostics |
| UI/device review | Layout, font scaling, touch targets, safe areas, keyboard and back behavior on Android/iOS |
| Legacy / Field Agent regression | Existing screens still work when selected; their operational backend calls are outside demo isolation |

## Deliberate demo limits

Synthetic driver and fleet identities are not linked to real operational accounts. Maps/trails are illustrative SVG schematics. Fuel slips/bill photos are sample placeholders; no actual file is uploaded. Documents have no real files. SOS and support do not notify anyone. No background location, push, real pairing, real reviews, payment, ERP finance, Khata, DigiLocker or team invitations are implemented. Preferences/sample mutations are session-only. Cost summaries represent captured sample records across all statuses, not measured consumption or ledger balances.

The existing AsyncStorage authentication/session implementation remains. Secure token migration, restored-session validation, full org/permission restoration, session expiry behavior and the remaining F0 security work are unfinished. Backend security/data readiness from the production plan must be re-audited before real fleet integration. Nothing in F5 certifies a production rollout.

See `API_INTEGRATION_CHECKLIST.md` for the next integration boundaries.
