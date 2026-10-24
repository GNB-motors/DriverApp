# Telematics API integration

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
workshop bill uploads, personal documents, fleet position maps, driver roster,
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
