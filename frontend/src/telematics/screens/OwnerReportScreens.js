import React, { useEffect, useRef, useState } from "react";
import { View, Linking } from "react-native";
import * as Speech from "expo-speech";
import { AppText, Button, Card, TextField, colors } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useManagerData } from "../context/ManagerDataContext";
import { ManagerPage } from "./ManagerScreens";
import { MenuRow } from "./DriverScreens";
import { FileLink } from "../workflows/OperationalScreens";
import { Screen, Choice, RequestState } from "../components/FormControls";
import useOwnerRequest from "../hooks/useOwnerRequest";
import useOwnerWrite from "../hooks/useOwnerWrite";
import {
  yesterday,
  istDay,
  shiftDay,
  validBusinessDay,
  displayMetric,
  sectionNames,
  reportSpeech,
  trendSections,
  trendPointText,
  comparisonNotes,
} from "../services/ownerReport";

function useScope() {
  const { user } = useAuth();
  const context = useManagerData();
  const branch = context.branchId === "all" ? undefined : context.branchId;
  return {
    ...context,
    branch,
    key: `${user._id}:${typeof user.orgId === "object" ? user.orgId._id : user.orgId}:${branch || "all"}`,
  };
}
export function OwnerReport({ navigation, route }) {
  const { service, branch, key, selectBranch } = useScope();
  const [date, setDate] = useState(route.params?.date || yesterday());
  const [dateInput, setDateInput] = useState(date);
  useEffect(() => setDateInput(date), [date]);
  const [language, setLanguage] = useState("en");
  const [speechError, setSpeechError] = useState("");
  const [audioOptions, setAudioOptions] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const speechSequence = useRef(0);
  useEffect(() => {
    if (route.params?.date) setDate(route.params.date);
    if (
      route.params &&
      Object.prototype.hasOwnProperty.call(route.params, "branchId")
    )
      selectBranch(route.params.branchId || "all");
  }, [route.params, selectBranch]);
  const request = useOwnerRequest(
    `${key}:${date}:daily`,
    () => service.ownerDaily(date, branch),
    60000,
  );
  useEffect(() => {
    setSpeaking(false);
    return () => {
      speechSequence.current++;
      Speech.stop();
    };
  }, [key, date]);
  async function listen() {
    const sequence = ++speechSequence.current;
    const current = () => speechSequence.current === sequence;
    setSpeechError("");
    try {
      await Speech.stop();
      const lang = { en: "en-IN", hi: "hi-IN", bn: "bn-IN" }[language];
      const voices = await Speech.getAvailableVoicesAsync();
      if (!current()) return;
      const voice = voices.find((v) =>
        v.language?.toLowerCase().startsWith(lang.slice(0, 2)),
      );
      if (!voice) {
        setSpeechError(
          "Install a voice for this language in your device speech settings.",
        );
        return;
      }
      Speech.speak(reportSpeech(request.data, language), {
        language: lang,
        voice: voice.identifier,
        onStart: () => {
          if (current()) setSpeaking(true);
        },
        onDone: () => {
          if (current()) setSpeaking(false);
        },
        onStopped: () => {
          if (current()) setSpeaking(false);
        },
        onError: (error) => {
          if (current()) {
            setSpeaking(false);
            setSpeechError(
              error.message || "Audio is unavailable on this device.",
            );
          }
        },
      });
    } catch (error) {
      if (current()) setSpeechError(error.message);
    }
  }
  return (
    <ManagerPage
      allowEmpty
      showSourceErrors={false}
      navigation={navigation}
      title="Aaj ka hisaab"
      subtitle="Recorded business activity and fleet now."
    >
      <TextField
        label="Report date (IST, YYYY-MM-DD)"
        value={dateInput}
        onChangeText={setDateInput}
        maxLength={10}
      />
      <Button
        label="Show selected day"
        variant="secondary"
        disabled={!validBusinessDay(dateInput) || dateInput > istDay()}
        onPress={() => setDate(dateInput)}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label="Previous day"
          variant="secondary"
          onPress={() => setDate(shiftDay(date, -1))}
        />
        <Button
          label="Next day"
          variant="secondary"
          disabled={date >= istDay()}
          onPress={() => setDate(shiftDay(date, 1))}
        />
      </View>
      <RequestState request={request} />
      {request.data && (
        <>
          <AppText muted>
            Recomputed{" "}
            {new Date(request.data.generatedAt).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })}{" "}
            IST. Earlier reports can change as late records arrive. Current
            fleet and backlogs have their own timestamps.
          </AppText>
          {request.data.partialDay && (
            <AppText muted>
              Today is still in progress. These are partial-day recorded totals.
            </AppText>
          )}
          {audioOptions && (
            <Choice
              label="Listen in"
              value={language}
              onChange={(value) => {
                if (["en", "hi", "bn"].includes(value)) setLanguage(value);
              }}
              options={[
                ["en", "English"],
                ["hi", "हिन्दी"],
                ["bn", "বাংলা"],
              ]}
            />
          )}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              label={`Listen (${{ en: "English", hi: "हिन्दी", bn: "বাংলা" }[language]})`}
              icon="volume-high-outline"
              onPress={listen}
            />
            <Button
              label="Language"
              variant="ghost"
              onPress={() => setAudioOptions(!audioOptions)}
            />
          </View>
          {speaking && (
            <Button
              label="Stop narration"
              variant="ghost"
              onPress={() => Speech.stop()}
            />
          )}
          {speechError ? (
            <AppText color={colors.error}>{speechError}</AppText>
          ) : null}
          {[
            "fleet",
            "trips",
            "diesel",
            "adblue",
            "tolls",
            "expenses",
            "advances",
            "register",
            "sensorReconciliation",
            "people",
            "pairedDrivers",
            "finance",
            "fuelReviews",
            "workshopReviews",
            "expenseReviews",
            "issues",
            "issuesRaised",
            "inbox",
            "documents",
            "challans",
            "deviations",
            "deviationsRaised",
            "dataHealth",
            "onTime",
            "turnaround",
            "crew",
            "navigation",
            "tripMargin",
          ].map((name) => {
            const section = request.data.sections[name];
            if (!section) return null;
            return (
              <Card key={name}>
                <AppText variant="h3">{sectionNames[name]}</AppText>
                <AppText muted>
                  {section.availability === "unavailable"
                    ? section.reasonCode === "NOT_ENABLED"
                      ? "Not enabled"
                      : "Source unavailable"
                    : section.status === "error"
                      ? "Could not load"
                      : section.status === "empty"
                        ? "No matching records"
                        : "Recorded data available"}{" "}
                  · {section.coverage} coverage
                </AppText>
                {Object.entries(section.metrics).map(([metric, value]) => (
                  <View key={metric}>
                    <AppText weight="bold">
                      {metric.replace(/([A-Z])/g, " $1")}:{" "}
                      {displayMetric(value)}
                    </AppText>
                    <AppText variant="caption" muted>
                      {value.meaning}
                    </AppText>
                  </View>
                ))}
                {section.sources.map((source) => (
                  <AppText key={source.name} variant="caption" muted>
                    Source: {source.name} · observed{" "}
                    {source.observedAt
                      ? new Date(source.observedAt).toLocaleString()
                      : "no source timestamp"}{" "}
                    · checked {new Date(source.checkedAt).toLocaleString()}
                  </AppText>
                ))}
                {section.notes.map((note, index) => (
                  <AppText key={index} muted>
                    {note}
                  </AppText>
                ))}
                {section.drilldown && (
                  <Button
                    label="Open underlying records"
                    variant="secondary"
                    onPress={() =>
                      navigation.navigate(
                        section.drilldown.route,
                        section.drilldown.filters,
                      )
                    }
                  />
                )}
              </Card>
            );
          })}
          {request.data.notes.map((note) => (
            <AppText key={note} muted>
              {note}
            </AppText>
          ))}
        </>
      )}
      <MenuRow
        title="Owner escalations"
        icon="warning-outline"
        onPress={() => navigation.navigate("Owner escalations")}
      />
      <MenuRow
        title="Messages & broadcasts"
        icon="chatbubbles-outline"
        onPress={() => navigation.navigate("Messages")}
      />
      <MenuRow
        title="Trends and same weekday"
        icon="trending-up-outline"
        onPress={() => navigation.navigate("Owner trends", { date })}
      />
      <MenuRow
        title="Morning report settings"
        icon="settings-outline"
        onPress={() => navigation.navigate("Report settings")}
      />
      <Button
        label="Refresh report"
        variant="secondary"
        onPress={request.reload}
        disabled={request.loading}
      />
    </ManagerPage>
  );
}
function RecordSummary({ item }) {
  const at =
    item.expiryDate ||
    item.offenseDate ||
    item.detectedAt ||
    item.refuelTime ||
    item.completedAt ||
    item.paidAt ||
    item.expenseDate ||
    item.billDate ||
    item.invoiceDate ||
    item.voucherDate ||
    item.endAt ||
    item.observedAt ||
    item.createdAt;
  const amount =
    item.totalAmount ?? item.amount ?? item.netPayable ?? item.netAmount;
  return (
    <>
      <AppText variant="h3">
        {item.registrationNumber ||
          item.title ||
          item.advanceNumber ||
          item.challanNo ||
          item.docType ||
          item.billNumber ||
          item.invoiceNumber ||
          item.voucherNumber ||
          item.incidentNumber ||
          item.label ||
          [item.firstName, item.lastName].filter(Boolean).join(" ") ||
          "Recorded entry"}
      </AppText>
      {item.vehicleRegistration && (
        <AppText>{item.vehicleRegistration}</AppText>
      )}
      {at && (
        <AppText>
          {new Date(at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}{" "}
          IST
        </AppText>
      )}
      <AppText>{item.reviewStatus || item.status || item.state || ""}</AppText>
      {amount != null && (
        <AppText>
          Recorded amount: ₹{Number(amount).toLocaleString("en-IN")}
        </AppText>
      )}
      {item.litres != null && <AppText>{item.litres} litres</AppText>}
      {item.km?.laden != null && (
        <AppText>Laden distance: {item.km.laden} km</AppText>
      )}
      {item.spanMinutes != null && (
        <AppText>Completed visit: {item.spanMinutes} minutes</AppText>
      )}
      {item.outstandingAmount != null && (
        <AppText>Outstanding now: ₹{item.outstandingAmount}</AppText>
      )}
      {item.wants && <AppText>{item.wants}</AppText>}
      {item.offenseDescription && <AppText>{item.offenseDescription}</AppText>}
      {item.extraKmEstimate != null && (
        <AppText>
          Estimated deviation distance: {item.extraKmEstimate} km (
          {item.extraKmBasis || "basis unavailable"})
        </AppText>
      )}
      {item.unknownReason && (
        <AppText>Charge unavailable: {item.unknownReason}</AppText>
      )}
      {item.location && <AppText>{item.location}</AppText>}
      {item.plant && <AppText>At plant: {item.plant}</AppText>}
      {item.ongoingSessions && (
        <AppText>
          {item.ongoingSessions.length
            ? "Ongoing pairing session"
            : "No ongoing pairing session"}
        </AppText>
      )}
    </>
  );
}
export function OwnerReportRows({ navigation, route }) {
  const { service, branch, key } = useScope();
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [key, route.params.metric, route.params.date]);
  const request = useOwnerRequest(
    `${key}:rows:${route.params.metric}:${route.params.date}:${page}`,
    () =>
      service.ownerRows(
        { metric: route.params.metric, date: route.params.date, page },
        branch,
      ),
  );
  function open(row) {
    const metric = route.params.metric;
    if (["diesel", "adblue", "fuelReviews"].includes(metric))
      navigation.navigate("Owner record", { kind: "fuel", id: row._id });
    else if (["expenses", "expenseReviews"].includes(metric))
      navigation.navigate("Owner record", { kind: "expense", id: row._id });
    else if (metric === "trips")
      navigation.navigate("Manager trip", { id: row._id });
    else if (metric === "fleet")
      navigation.navigate("Vehicle detail", { id: row._id });
    else if (metric === "workshopReviews")
      navigation.navigate("Review detail", { kind: "bills", id: row._id });
    else if (metric === "issues")
      navigation.navigate("Review detail", { kind: "issues", id: row._id });
    else if (metric === "documents")
      navigation.navigate("Manager document", { id: row._id });
    else if (metric === "people")
      navigation.navigate("Owner calls", { driverId: row._id });
    else if (metric === "inbox")
      navigation.navigate("Owner escalation", { id: row._id });
  }
  return (
    <Screen
      navigation={navigation}
      title={sectionNames[route.params.metric] || route.params.metric}
    >
      <AppText>
        {route.params.date} IST · selected branch · Page {page}
      </AppText>
      <RequestState request={request} />
      {request.data && (
        <>
          <AppText>
            {request.data.total} matching records. Recomputed when opened.
          </AppText>
          {!request.data.items.length && (
            <AppText>No matching records.</AppText>
          )}
          {request.data.items.map((item) => (
            <Card key={item._id}>
              <RecordSummary item={item} />
              {[
                "diesel",
                "adblue",
                "fuelReviews",
                "expenses",
                "expenseReviews",
                "trips",
                "fleet",
                "workshopReviews",
                "issues",
                "inbox",
                "people",
                "documents",
              ].includes(route.params.metric) && (
                <Button
                  label="Open evidence"
                  variant="secondary"
                  onPress={() => open(item)}
                />
              )}
            </Card>
          ))}
          <Button
            label="Previous page"
            disabled={page === 1}
            onPress={() => setPage(page - 1)}
          />
          <Button
            label="Next page"
            disabled={page * 30 >= request.data.total}
            onPress={() => setPage(page + 1)}
          />
        </>
      )}
    </Screen>
  );
}
export function OwnerTripList({ navigation, route }) {
  const { service, branch, key } = useScope();
  const vehicleId = route.params?.vehicleId;
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [key, vehicleId]);
  const request = useOwnerRequest(
    `${key}:trip-history:${vehicleId || "all"}:${page}`,
    () => service.listTrips(page, branch, vehicleId),
  );
  return (
    <Screen navigation={navigation} title="Fleet trip history">
      <RequestState request={request} />
      {request.data && (
        <>
          <AppText>
            {request.data.total} matching GPS-detected trips · page {page}
          </AppText>
          {!request.data.items.length && <AppText>No matching trips.</AppText>}
          {request.data.items.map((trip) => (
            <MenuRow
              key={trip.id}
              title={`${trip.from} → ${trip.to}`}
              detail={`${trip.distanceKm ?? "Unknown"} km · ${trip.status}`}
              onPress={() =>
                navigation.navigate("Manager trip", { id: trip.id })
              }
            />
          ))}
          <Button
            label="Previous page"
            disabled={page === 1}
            onPress={() => setPage(page - 1)}
          />
          <Button
            label="Next page"
            disabled={page * 30 >= request.data.total}
            onPress={() => setPage(page + 1)}
          />
        </>
      )}
    </Screen>
  );
}
export function OwnerRecord({ navigation, route }) {
  const { service, branch, key } = useScope();
  const { kind, id } = route.params;
  const request = useOwnerRequest(`${key}:record:${kind}:${id}`, () =>
    service.ownerRecord(kind, id, branch),
  );
  const write = useOwnerWrite(`${key}:review:${kind}:${id}`);
  const [note, setNote] = useState("");
  const item = request.data;
  async function decide(action) {
    const result = await write.execute(
      { action, note, expectedUpdatedAt: item.updatedAt },
      (body) => service.ownerDecision(kind, id, body, branch),
    );
    if (result) {
      setNote("");
      request.reload();
    }
  }
  return (
    <Screen
      navigation={navigation}
      title={kind === "fuel" ? "Fuel capture review" : "Financial bill review"}
    >
      <RequestState request={request} />
      {item && (
        <>
          <Card>
            <RecordSummary item={item} />
            <FileLink
              url={item.receipt?.publicUrl || item.receiptUrl}
              label="Open receipt evidence"
            />
          </Card>
          <AppText muted>
            {kind === "fuel"
              ? "This reviews the recorded capture. It does not approve an expense or record payment."
              : "Confirmation includes this bill in the driver wallet. It is not payment."}
          </AppText>
          {(kind === "fuel"
            ? item.reviewStatus === "NEEDS_REVIEW"
            : item.status === "PENDING") && (
            <>
              <TextField
                label="Review note / rejection reason"
                value={note}
                onChangeText={setNote}
                editable={!write.busy && !write.draft}
                multiline
              />
              <Button
                label={write.draft ? "Retry saved decision" : "Approve"}
                disabled={!write.ready}
                loading={write.busy}
                onPress={() => decide("APPROVE")}
              />
              {!write.draft && (
                <Button
                  label="Reject with reason"
                  variant="danger"
                  disabled={!note.trim() || !write.ready || write.busy}
                  onPress={() => decide("REJECT")}
                />
              )}
            </>
          )}
          {item.driverId && (
            <Button
              label="Call driver"
              variant="secondary"
              onPress={() =>
                navigation.navigate("Owner calls", {
                  driverId:
                    typeof item.driverId === "object"
                      ? item.driverId._id
                      : item.driverId,
                })
              }
            />
          )}
        </>
      )}
      {write.error ? (
        <AppText color={colors.error}>{write.error}</AppText>
      ) : null}
    </Screen>
  );
}
export function OwnerFinance({ navigation, route }) {
  const date = route.params?.date || yesterday();
  return (
    <Screen navigation={navigation} title="Billing and cash evidence">
      <AppText>
        {date} IST. Billed margin excludes overheads; payments and purchases are
        separate.
      </AppText>
      {[
        ["billed", "Freight billed"],
        ["purchaseCosts", "Purchase bills"],
        ["supplierCosts", "Supplier invoices"],
        ["cashIn", "Cash received"],
        ["cashOut", "Cash paid"],
        ["receivables", "Outstanding receivables now"],
      ].map(([metric, label]) => (
        <MenuRow
          key={metric}
          title={label}
          onPress={() =>
            navigation.navigate("Owner report rows", { metric, date })
          }
        />
      ))}
    </Screen>
  );
}
export function OwnerTrends({ navigation, route }) {
  const { service, branch, key } = useScope();
  const date = route.params?.date || yesterday();
  const [expanded, setExpanded] = useState(null);
  const request = useOwnerRequest(`${key}:${date}:trends`, () =>
    service.ownerTrends(date, branch),
  );
  const data = request.data;
  if (data?.sections)
    return (
      <Screen navigation={navigation} title="Trends and same weekday">
        <RequestState request={request} />
        <AppText>
          {data.days[0].date} to {data.date} IST · selected branch
        </AppText>
        {data.notes.map((note) => (
          <AppText key={note} muted>
            {note}
          </AppText>
        ))}
        {trendSections.map((name) => {
          const section = data.sections[name];
          if (!section) return null;
          return (
            <Card key={name}>
              <AppText variant="h3">{sectionNames[name]}</AppText>
              {section.availability === "unavailable" ? (
                <AppText muted>
                  {section.reasonCode === "NOT_ENABLED"
                    ? "Not enabled"
                    : section.status === "error"
                      ? "Could not load"
                      : "Source unavailable"}
                </AppText>
              ) : (
                Object.entries(section.metrics).map(([metric, trend]) => (
                  <View key={metric}>
                    <AppText weight="bold">
                      {metric.replace(/([A-Z])/g, " $1")}:{" "}
                      {trendPointText(trend.series.at(-1), trend.unit)}
                    </AppText>
                    <AppText variant="caption" muted>
                      Same weekday ({trend.comparison.sameWeekday.date}):{" "}
                      {trendPointText(trend.series.at(-8), trend.unit)} · 7-day
                      average:{" "}
                      {displayMetric({
                        value: trend.comparison.previousSevenDays.dailyAverage,
                        unit: trend.unit,
                      })}
                    </AppText>
                    {comparisonNotes(trend.comparison).map((note) => (
                      <AppText
                        key={note}
                        variant="caption"
                        color={colors.warning}
                      >
                        {note}
                      </AppText>
                    ))}
                    {expanded === name &&
                      trend.series.map((point) => (
                        <AppText key={point.date} variant="caption">
                          {point.date}
                          {point.partialDay ? " (partial day)" : ""}:{" "}
                          {trendPointText(point, trend.unit)} · {point.rows}{" "}
                          rows
                          {point.missingRows
                            ? ` · ${point.missingRows} missing`
                            : ""}
                        </AppText>
                      ))}
                  </View>
                ))
              )}
              {section.notes.map((note) => (
                <AppText key={note} variant="caption" muted>
                  {note}
                </AppText>
              ))}
              {section.availability === "available" && (
                <Button
                  label={expanded === name ? "Hide days" : "Show 14 days"}
                  variant="ghost"
                  onPress={() => setExpanded(expanded === name ? null : name)}
                />
              )}
            </Card>
          );
        })}
        {data.notTrended.map((group) => (
          <AppText key={group.note} variant="caption" muted>
            {group.sections
              .map((name) => sectionNames[name] || name)
              .join(", ")}
            : {group.note}
          </AppText>
        ))}
      </Screen>
    );
  return (
    <Screen navigation={navigation} title="Recorded purchase trends">
      <RequestState request={request} />
      {data && (
        <>
          <AppText>
            INR · recorded purchase rows only. No rows means no recorded
            purchases; it does not prove no consumption.
          </AppText>
          <AppText>
            Compare {request.data.comparison.selected} with{" "}
            {request.data.comparison.sameWeekday}.
          </AppText>
          {request.data.series.map((day) => (
            <Card key={day.date}>
              <AppText weight="bold">
                {day.date}
                {day.partialDay ? " · partial day" : ""}
              </AppText>
              {Object.entries(day.values).map(([type, value]) => (
                <AppText key={type}>
                  {type}:{" "}
                  {value.value == null ? "Unavailable" : `₹${value.value}`} ·{" "}
                  {value.rows} rows · {value.status}
                </AppText>
              ))}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
export function ReportSettings({ navigation }) {
  const { service, branches, key } = useScope();
  const request = useOwnerRequest(`${key}:preferences`, () =>
    service.ownerPreferences(),
  );
  const [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (request.data)
      setForm({
        enabled: request.data.enabled,
        time: request.data.time,
        language: request.data.language,
        branchId: request.data.branchId || null,
      });
    else setForm(null);
  }, [request.data]);
  return (
    <Screen navigation={navigation} title="Morning report">
      <RequestState request={request} />
      {form && (
        <>
          <Choice
            label="Daily notification"
            value={String(form.enabled)}
            onChange={(value) =>
              setForm({ ...form, enabled: value === "true" })
            }
            options={[
              ["true", "Enabled"],
              ["false", "Disabled"],
            ]}
          />
          <TextField
            label="Time in IST (HH:mm)"
            value={form.time}
            onChangeText={(time) => setForm({ ...form, time })}
            maxLength={5}
          />
          <Choice
            label="Language"
            value={form.language}
            onChange={(language) => setForm({ ...form, language })}
            options={[
              ["en", "English"],
              ["hi", "हिन्दी"],
              ["bn", "বাংলা"],
            ]}
          />
          <Choice
            label="Report branch"
            value={form.branchId || "all"}
            onChange={(value) =>
              setForm({ ...form, branchId: value === "all" ? null : value })
            }
            options={branches.map((b) => [b.id, b.name])}
          />
          <AppText muted>
            Opens yesterday's report. Historical reports are recomputed; device
            notification permission is also required.
          </AppText>
          <Button
            label="Save preference"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                await service.ownerPreferences(form);
                request.reload();
              } catch (failure) {
                setError(failure.message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
      {error ? <AppText color={colors.error}>{error}</AppText> : null}
    </Screen>
  );
}
export function OwnerEscalations({ navigation, route }) {
  const { service, branch, key } = useScope();
  const [all, setAll] = useState(route?.name === "Alerts");
  const [page, setPage] = useState(1);
  const request = useOwnerRequest(
    `${key}:escalations:${all}:${page}`,
    () => service.ownerEscalations(branch, all, page),
    60000,
  );
  return (
    <Screen
      navigation={navigation}
      title={all ? "Full owner inbox" : "Top owner escalations"}
    >
      <Button
        label={all ? "Show top five" : "Open full inbox and history"}
        variant="secondary"
        onPress={() => {
          setAll(!all);
          setPage(1);
        }}
      />
      <RequestState request={request} />
      {request.data && (
        <>
          <AppText>
            {request.data.activeCount} active · {request.data.total} retained
            items
          </AppText>
          {!request.data.items.length && (
            <AppText>No items in this view.</AppText>
          )}
          {request.data.items.map((item) => (
            <MenuRow
              key={item._id}
              title={item.label || item.condition}
              detail={`${item.subjectLabel || item.subjectKey} · score ${item.ranking.score} · ${item.ownerWorkflow?.state || item.status}`}
              onPress={() =>
                navigation.navigate("Owner escalation", { id: item._id })
              }
            />
          ))}
          {all && (
            <>
              <Button
                label="Previous page"
                disabled={page === 1}
                onPress={() => setPage(page - 1)}
              />
              <Button
                label="Next page"
                disabled={page * 30 >= request.data.total}
                onPress={() => setPage(page + 1)}
              />
            </>
          )}
        </>
      )}
    </Screen>
  );
}
export function OwnerEscalation({ navigation, route }) {
  const { service, branch, key } = useScope();
  const id = route.params.id;
  const [historyPage, setHistoryPage] = useState(1);
  const request = useOwnerRequest(
    `${key}:escalation:${id}:${historyPage}`,
    () => service.ownerEscalation(id, branch, historyPage),
  );
  const write = useOwnerWrite(`${key}:alert:${id}`);
  const [note, setNote] = useState("");
  const [stake, setStake] = useState("");
  const [confidence, setConfidence] = useState("");
  const [urgentAt, setUrgentAt] = useState("");
  const item = request.data;
  async function act(action) {
    const result = await write.execute(
      {
        action,
        note,
        expectedUpdatedAt: item.updatedAt,
        ...(stake.trim() && { stakeInr: Number(stake) }),
        ...(confidence.trim() && { confidence: Number(confidence) }),
        ...(urgentAt.trim() && { urgentAt }),
        ...(action === "SNOOZED" && {
          snoozeUntil: new Date(Date.now() + 3600000).toISOString(),
        }),
      },
      (body) => service.ownerDecision("alert", id, body, branch),
    );
    if (result) {
      setNote("");
      request.reload();
    }
  }
  return (
    <Screen navigation={navigation} title="Owner escalation">
      <RequestState request={request} />
      {item && (
        <>
          <Card>
            <AppText variant="h3">{item.label || item.condition}</AppText>
            <AppText>{item.wants}</AppText>
            <AppText>{item.subjectLabel || item.subjectKey}</AppText>
            <AppText>{item.ranking.explanation}</AppText>
            <AppText>
              Score {item.ranking.score} · confidence {item.ranking.confidence}{" "}
              · stake{" "}
              {item.ranking.stakeInr == null
                ? "unassessed"
                : `₹${item.ranking.stakeInr}`}
            </AppText>
            <AppText>
              Acknowledgement: {item.status}. Owner action:{" "}
              {item.ownerWorkflow?.state || "OPEN"}.
            </AppText>
          </Card>
          {item.sources.map((source, index) => (
            <Card key={index}>
              <AppText>
                {source.source} · {source.code}
              </AppText>
              <AppText>{source.detail}</AppText>
              {["incidents", "documents"].includes(source.source) &&
                /^[a-f0-9]{24}$/i.test(String(source.refId).split(":")[0]) && (
                  <Button
                    label="Open source evidence"
                    variant="secondary"
                    onPress={() =>
                      navigation.navigate(
                        source.source === "incidents"
                          ? "Review detail"
                          : "Manager document",
                        {
                          id: String(source.refId).split(":")[0],
                          kind:
                            source.source === "incidents"
                              ? "issues"
                              : "documents",
                        },
                      )
                    }
                  />
                )}
              {["challans", "deviations"].includes(source.source) && (
                <Button
                  label="Open current source records"
                  variant="secondary"
                  onPress={() =>
                    navigation.navigate("Owner report rows", {
                      metric: source.source,
                      date: yesterday(),
                    })
                  }
                />
              )}
            </Card>
          ))}
          <TextField
            label="Assessed stake in rupees (optional)"
            value={stake}
            onChangeText={setStake}
            editable={!write.busy && !write.draft}
            keyboardType="decimal-pad"
          />
          <TextField
            label="Assessed confidence, 0 to 1 (optional)"
            value={confidence}
            onChangeText={setConfidence}
            editable={!write.busy && !write.draft}
            keyboardType="decimal-pad"
          />
          <TextField
            label="Urgent after (ISO timestamp with timezone, optional)"
            value={urgentAt}
            onChangeText={setUrgentAt}
            editable={!write.busy && !write.draft}
          />
          <TextField
            label="Action note or driver's explanation (recorded by owner)"
            value={note}
            onChangeText={setNote}
            editable={!write.busy && !write.draft}
            multiline
          />
          {write.draft ? (
            <Button
              label="Retry saved action"
              onPress={() => act(write.draft.action)}
              disabled={!write.ready}
              loading={write.busy}
            />
          ) : (
            [
              ["HANDLED", "Mark handled"],
              ["SNOOZED", "Snooze one hour"],
              ["ESCALATED", "Escalate"],
              ["OPEN", "Reopen"],
              ["EXPLANATION", "Record explanation"],
            ].map(([action, label]) => (
              <Button
                key={action}
                label={label}
                variant="secondary"
                disabled={
                  !write.ready ||
                  write.busy ||
                  (action === "EXPLANATION" && !note.trim())
                }
                onPress={() => act(action)}
              />
            ))
          )}
          <Button
            label="Call a driver about this issue"
            variant="secondary"
            onPress={() => navigation.navigate("Owner calls", { alertId: id })}
          />
          <AppText variant="h3">Action history</AppText>
          {item.history.map((event) => (
            <Card key={event._id}>
              <AppText>
                {event.action} · {new Date(event.createdAt).toLocaleString()}
              </AppText>
              <AppText>{event.note}</AppText>
            </Card>
          ))}
          <Button
            label="Earlier actions"
            disabled={historyPage * 30 >= item.historyTotal}
            onPress={() => setHistoryPage(historyPage + 1)}
          />
          <Button
            label="Newer actions"
            disabled={historyPage === 1}
            onPress={() => setHistoryPage(historyPage - 1)}
          />
        </>
      )}
      {write.error ? (
        <AppText color={colors.error}>{write.error}</AppText>
      ) : null}
    </Screen>
  );
}
export function OwnerCalls({ navigation, route }) {
  const { service, branch, key } = useScope();
  const [page, setPage] = useState(1),
    [driverId, setDriverId] = useState(route.params?.driverId || ""),
    [selected, setSelected] = useState(null),
    [outcome, setOutcome] = useState("REACHED"),
    [note, setNote] = useState(""),
    [error, setError] = useState("");
  const roster = useOwnerRequest(`${key}:call-roster`, () =>
    service.ownerAudience({ driverOnly: true }, branch),
  );
  const calls = useOwnerRequest(`${key}:calls:${page}`, () =>
    service.ownerCalls(branch, page),
  );
  const write = useOwnerWrite(
    `${key}:call:${route.params?.alertId || "general"}`,
  );
  const outcomeWrite = useOwnerWrite(
    `${key}:call-outcome:${selected?._id || "none"}`,
  );
  const dialled = useRef(new Set());
  useEffect(() => {
    setSelected(null);
    setDriverId(route.params?.driverId || "");
    setNote("");
  }, [key, route.params?.driverId]);
  async function dial() {
    const result = await write.execute(
      {
        driverId,
        ...(route.params?.alertId && { alertId: route.params.alertId }),
      },
      (body) => service.ownerStartCall(body, branch),
    );
    if (!result) return;
    setSelected(result.record);
    calls.reload();
    try {
      await Linking.openURL(
        `tel:${String(result.record.phone).replace(/[^+\d]/g, "")}`,
      );
    } catch {
      setError(
        "The dialer could not open. This record only means a call was initiated.",
      );
    }
  }
  useEffect(() => {
    const requestKey = `${key}:${route.params?.callRequest}`;
    if (
      !route.params?.autoDial ||
      !route.params?.callRequest ||
      !write.ready ||
      driverId !== route.params.driverId ||
      dialled.current.has(requestKey)
    )
      return;
    dialled.current.add(requestKey);
    dial();
    // The route nonce records an explicit tap, and must never redial on a rerender.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    key,
    route.params?.autoDial,
    route.params?.callRequest,
    route.params?.driverId,
    driverId,
    write.ready,
  ]);
  return (
    <Screen navigation={navigation} title="Calls and outcomes">
      <RequestState request={roster} />
      <Choice
        label="Driver"
        value={driverId}
        onChange={setDriverId}
        disabled={write.busy || !!write.draft}
        options={(roster.data?.items || []).map((d) => [
          d._id,
          `${d.firstName} ${d.lastName || ""}${d.mobileNumber ? "" : " · no phone"}`,
        ])}
      />
      <Button
        label={write.draft ? "Retry saved call initiation" : "Open dialer"}
        disabled={!write.ready || !driverId}
        loading={write.busy}
        onPress={dial}
      />
      <AppText muted>
        Returning from the dialer does not prove that a call connected. Record
        the outcome yourself.
      </AppText>
      <RequestState request={calls} />
      {calls.data?.items.map((call) => (
        <MenuRow
          key={call._id}
          title={call.phone}
          detail={`${call.outcome} · ${new Date(call.createdAt).toLocaleString()}`}
          onPress={() => {
            setSelected(call);
            setNote(call.note || "");
          }}
        />
      ))}
      {selected && (
        <Card>
          <AppText>{selected.phone}</AppText>
          <Choice
            label="Outcome"
            value={outcome}
            onChange={setOutcome}
            options={["REACHED", "NOT_REACHED", "RESOLVED", "FOLLOW_UP"].map(
              (v) => [v, v.replace(/_/g, " ")],
            )}
          />
          <TextField
            label="Outcome note"
            value={note}
            onChangeText={setNote}
            multiline
          />
          <Button
            label="Save outcome"
            disabled={!outcomeWrite.ready}
            loading={outcomeWrite.busy}
            onPress={async () => {
              setError("");
              const result = await outcomeWrite.execute(
                {
                  outcome,
                  note,
                  expectedUpdatedAt: selected.updatedAt,
                  ...(outcome === "FOLLOW_UP" && {
                    followUpAt: new Date(Date.now() + 3600000).toISOString(),
                  }),
                },
                ({ clientRequestId: _requestId, ...body }) =>
                  service.ownerCallOutcome(selected._id, body, branch),
              );
              if (result) {
                setSelected(result);
                calls.reload();
              }
            }}
          />
        </Card>
      )}
      {write.error || outcomeWrite.error || error ? (
        <AppText color={colors.error}>
          {write.error || outcomeWrite.error || error}
        </AppText>
      ) : null}
      <Button
        label="Previous calls"
        disabled={page === 1}
        onPress={() => setPage(page - 1)}
      />
      <Button
        label="More calls"
        disabled={!calls.data || page * 30 >= calls.data.total}
        onPress={() => setPage(page + 1)}
      />
    </Screen>
  );
}
