# Owner experience implementation

Base: DriverApp `Dev-Branch` at `20d9f69`; backend integration uses the matching `feat/owner-experience-completion` implementation based on backend main `82085f34`.

The active OwnerNavigator now opens the dated daily report from Today/Digest. It registers report evidence, fuel capture/financial bill review, finance evidence, trends, report schedule settings, ranked/full inbox, escalation details/history, calls/outcomes, direct/group conversations and broadcasts. Owner startup no longer downloads complete fuel/trip histories or a duplicate 30-day summary. Recent-trip context is bounded; the owner trip-history reader remains paginated and can filter a specific truck. Driver More also registers Messages and Conversation for replies and acknowledgements. Live classification uses the backend freshness policy; missing speed/ignition remains unknown rather than verified idle. Existing Team & access, fleet/map, workshop review, documents and handover remain available.

Report date/branch/account keys mask old responses immediately. Failed refreshes retain only same-scope data and explicitly identify it as previously loaded. Each supported headline carries backend filters to paginated rows. Recorded purchases, expenses confirmed, advances paid, billed margin and cash movement keep their distinct meanings. Source-dependent sections retain unavailable states rather than fabricated figures. Report history is explicitly recomputed and today is labelled partial.

Submissions are saved locally before sending with their full UUID/content. Lost responses retry the same operation. An in-progress 409 preserves that operation; a definite validation/version rejection can be corrected. Media drafts retain their local URI. Reopening a web browser may invalidate a browser blob URL; a message whose media is no longer accessible cannot be silently reconstructed or sent with changed bytes under the old ID.

Conversations support text, photo, recorded voice, explicit current location and structured updates. Broadcasts use a persisted recipient selection and are dispatched by the backend worker. Delivery/read/acknowledged and skipped receipts are separate. Manual membership can be edited. Automatic branch/on-duty/crew/plant/lane groups expose scoped target pickers and recipient previews. Membership follows real crew, current fresh plant presence and active ERP route assignments; backend message permissions resolve it live.

Native calls open the device dialer and record initiation separately from the selected outcome. Report notifications validate the account/organisation and report date/branch before opening. Narration uses installed English/Hindi/Bengali voices and preserves unknown/partial qualifications; a missing voice is shown as unavailable.

`expo-speech` and `expo-audio` are pinned to the installed Expo SDK's compatible versions. The audio config plugin supplies the microphone permission description. Expo app version is now **1.0.1**, so the existing `runtimeVersion: appVersion` policy separates the changed native dependency set from older binaries. Build a matching native binary before publishing an update for it. Bundles do not establish physical-device success.

Checks: existing `check:telematics`, `check:api`, `check:parity`, `check:push`, plus `check:owner` for IST boundaries, language/unknown narration, retry classification, scoped report/review/receipt contracts and native voice multipart.

The backend's `app/modules/ownerExperience/README.md` defines each source, feature gate, API and lifecycle. Optional email/WhatsApp report opt-in and delivery history are implemented in Morning report settings; they require configured providers/account contact details. Unknown provider outcomes remain visible and are not automatically resent. Navigation-session coverage remains gated on the separate driver-navigation source.


Owner Today now includes observed odometer distance with coverage; exact-day bill/register/sensor reconciliation; versioned primary-destination punctuality; declared crew driving/rest; latest sampled driver trends; measured destination-specific ETA/e-way bill risks; posted trip revenue/hire contribution and owner-attested settled margin. New evidence rows preserve unknown values and source limitations.

`Crews` is registered in OwnerNavigator and linked from Today. Owners assign up to two drivers per truck, record the reason for changes and configure nullable company comparison thresholds. `Crew duty` is registered in DriverNavigator/More so drivers explicitly declare driving/rest/off duty. Pairing is not reinterpreted as at-wheel evidence. No statutory compliance or verified sleep is claimed.

Historical trip detail links to `Arrival promise` (future agreements on open trips; immutable history afterwards) and `Trip costs` (ERP-linked completed-trip evidence, additional actual allocations and cost-completeness statements). Trip margin evidence rows also open the cost workflow. Posted-bill changes invalidate prior closure; owners must review the new evidence and save another statement. Settled margin is owner-attested, and audited company net profit stays unavailable.
