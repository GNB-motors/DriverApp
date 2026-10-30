# Server data only — 30 October 2026

Requested behavior: no runtime example data anywhere in DriverApp. Connected features use server results; unfinished features expose an unavailable state without example records or successful-looking local actions.

Removed the experience sandbox/provider, example navigation map/routes/POIs, driver/crew/SOS/duty/approval/document/earnings/site datasets, fabricated owner summary/report values, simulated paper/message/broadcast/receipt flows, simulated downloads and unused demonstration sign-in routes. Mock-oriented copy dictionaries were removed too.

Existing authenticated workflows remain available:

| Entry point | Data/behavior |
| --- | --- |
| Driver Trips and Inbox | Existing real trip and alert readers |
| Documents / My papers / paper records | Existing paginated document workflow; no fallback document validity |
| Capture / upload / diesel / truck issue | Existing persisted document, fuel, issue and workshop workflows |
| Crew & driving / handover | Existing versioned crew flow; corrected shared action URL; owner/manager select an actual truck first |
| Manager Home | Branch-scoped manager card API; explicit error/empty states; detail reads current cards and server evidence |
| Manager Live | Existing real fleet positions/map |
| Manager Drivers | Existing paginated driver assignment reader; no synthesized HOS, scores, plant states or fake drivers |
| Manager reviews | Links to existing fuel, document and maintenance records; no pretend approve/reject actions |
| Owner home/report | Existing connected fleet home and daily report; no sample report on failure |
| Messages and broadcasts | Existing connected conversation flow, including real recipient selection and receipts |
| Field-agent truck picker | Validated server options only; empty, error/retry and unconfigured states |
| Language / device voice / battery settings | Existing real language preference, device speech test and OS settings link |

Unfinished navigation, offline maps, site mode, earnings, combined money/status workflows, driver timeline, pre-trip inspection, standalone delivery/expense flows, separate road reporting and consent-management surfaces have no demonstration data or simulated mutations. Existing route aliases may show connected records or an explicit unavailable screen. This does not claim those roadmap features are implemented.

The legacy `useApi` hook no longer accepts populated fallback data. Disabled/failed requests clear the displayed result; query changes immediately mask old results; late responses cannot replace the newest request. Server response validation distinguishes an empty list from a malformed response.

Validation:

- `parse-check`, all five existing `check:*` scripts and new `check:live-data`.
- Full source ESLint: zero errors; existing warnings remain.
- Web, Android and iOS Expo exports.
- New regression check exercises the actual React hook for disabled requests, empty responses, failed refreshes, query changes, concurrent responses and unmount. It scans every runtime source file for example datasets/controls, undefined JSX components and missing navigator exports, and checks localized unavailable copy and malformed server lists. CI runs this check.
- Jest currently has no test suites; behavioral regressions above run through `check:live-data`.

No live customer writes, broadcasts, calls or production deployments were used for validation. Export success does not establish authenticated physical-device acceptance.
