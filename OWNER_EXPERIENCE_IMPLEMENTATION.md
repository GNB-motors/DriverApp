# Owner experience implementation

Base: DriverApp `Dev-Branch` at `20d9f69`; backend integration uses the matching `feat/owner-experience-completion` implementation based on backend main `82085f34`.

The active OwnerNavigator now opens the dated daily report from Today/Digest. It registers report evidence, fuel capture/financial bill review, finance evidence, trends, report schedule settings, ranked/full inbox, escalation details/history, calls/outcomes, direct/group conversations and broadcasts. Owner startup no longer downloads complete fuel/trip histories or a duplicate 30-day summary. Recent-trip context is bounded; the owner trip-history reader remains paginated and can filter a specific truck. Driver More also registers Messages and Conversation for replies and acknowledgements. Live classification uses the backend freshness policy; missing speed/ignition remains unknown rather than verified idle. Existing Team & access, fleet/map, workshop review, documents and handover remain available.

Report date/branch/account keys mask old responses immediately. Failed refreshes retain only same-scope data and explicitly identify it as previously loaded. Each supported headline carries backend filters to paginated rows. Recorded purchases, expenses confirmed, advances paid, billed margin and cash movement keep their distinct meanings. Source-dependent sections retain unavailable states rather than fabricated figures. Report history is explicitly recomputed and today is labelled partial.

Submissions are saved locally before sending with their full UUID/content. Lost responses retry the same operation. An in-progress 409 preserves that operation; a definite validation/version rejection can be corrected. Media drafts retain their local URI. Reopening a web browser may invalidate a browser blob URL; a message whose media is no longer accessible cannot be silently reconstructed or sent with changed bytes under the old ID.

Conversations support text, photo, recorded voice, explicit current location and structured updates. Broadcasts use a persisted recipient selection and are dispatched by the backend worker. Delivery/read/acknowledged and skipped receipts are separate. Manual membership can be edited; automatic branch/on-duty groups follow the actual backend roster/session sources. Crew/lane/plant groups require their source contracts rather than invented membership.

Native calls open the device dialer and record initiation separately from the selected outcome. Report notifications validate the account/organisation and report date/branch before opening. Narration uses installed English/Hindi/Bengali voices and preserves unknown/partial qualifications; a missing voice is shown as unavailable.

`expo-speech` and `expo-audio` are pinned to the installed Expo SDK's compatible versions. The audio config plugin supplies the microphone permission description. Expo app version is now **1.0.1**, so the existing `runtimeVersion: appVersion` policy separates the changed native dependency set from older binaries. Build a matching native binary before publishing an update for it. Bundles do not establish physical-device success.

Checks: existing `check:telematics`, `check:api`, `check:parity`, `check:push`, plus `check:owner` for IST boundaries, language/unknown narration, retry classification, scoped report/review/receipt contracts and native voice multipart.

The backend's `app/modules/ownerExperience/README.md` defines each source, feature gate, API and lifecycle. Optional email/WhatsApp distribution and navigation/crew-dependent business metrics are not presented as implemented by the mobile screens.

## Capture and team follow-up — 29 October 2026

Document upload now defaults to Detect from photo. It retains the existing identity-scoped persisted submission and retry ID. Backend AUTO capture stores the original, suggested classification/extraction, image-quality warnings and same-entity exact-content duplicate links. Unknown kinds and OCR outages remain reviewable; no expense or payment is created. Existing declared compliance document uploads remain supported.

Owner More → Capture reviews opens a paginated branch-scoped queue of unverified universal captures, including documents without expiry dates. Owner record shows original evidence, suggested fields, missing values and warnings; VERIFY confirms the document and Note an issue records a concern without changing verification. Driver document detail reports saved/awaiting review or verified state.

Team & access already supported roles, assignments and branch overrides. This follow-up adds employee creation and account-status changes through existing employee APIs, with explicit confirmation for status changes. Initial passwords are held in component memory only. Access mutations now carry selected branch headers.

Limits: duplicate detection compares exact bytes within the same entity; similar photos and cross-entity matches are not inferred. PDF image clarity is explicitly unavailable. Automatic recognition depends on deploying the updated Python OCR service; classification/extraction is always subject to owner review. Device camera, actual OCR/model output and live access changes need acceptance testing.

## Crew and driving handover — 29 October 2026

Driver Home/My truck/More now open Crew & driving. An invited driver accepts crew membership, then explicitly starts or ends driving. The current driver can request handover to an accepted co-driver; only that target can accept or dispute it, and the sender can cancel. Driver actions require acknowledgement that the person is safely stopped. Saved actions retain their UUID, expected version and original payload; online acceptance time is authoritative, so offline retries never invent earlier driving attribution.

Owner/manager Vehicle detail shows a crew summary and paginated interval/action history. Owners select up to two active drivers from the truck's branch and can clear disputes with a reason. Changing crew ends the active driving interval and cancels pending handover. Drivers must confirm again before a current driver is shown. Managers read only. Pending, disputed, expired and invalidated requests keep driving unconfirmed.

Crew invitations and handover reminders use the existing inbox/push pipeline; dispatch checks current membership, branch and expiry. Notification taps re-fetch current crew state. Views poll only while focused. This flow is separate from legacy truck pairing, location permissions and fuel/score attribution. Real two-phone and background-notification behavior still require acceptance testing.
