import { captureKindLabel, captureWarnings } from "../services/documentCapture";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import ApprovalsScreen from "./ApprovalsScreen";
import KhataLedgerScreen from "./KhataLedgerScreen";
import * as Speech from "expo-speech";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Select from "../../components/ui/SelectField";
import { reportMeta } from "../services/ownerPresentation";
import {
  AppText,
  Button,
  Card,
  TextField,
  Badge,
  SegmentedControl,
  colors,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useManagerData } from "../context/ManagerDataContext";
import { MenuRow } from "./DriverScreens";
import { FileLink } from "../workflows/OperationalScreens";
import { Choice, RequestState } from "../components/FormControls";
import {
  OwnerScreen as Screen,
  OwnerReportDashboard,
  OwnerSectionContent,
} from "../components/OwnerReportView";
import useOwnerRequest from "../hooks/useOwnerRequest";
import useOwnerWrite from "../hooks/useOwnerWrite";
import {
  yesterday,
  displayMetric,
  sectionNames,
  reportSpeech,
  trendSections,
  trendPointText,
  comparisonNotes,
} from "../services/ownerReport";

const RETAKE_REASONS = [
  ["BLURRY_OR_DARK", "Blurry or dark photo"],
  ["DOCUMENT_CROPPED", "Document or receipt cropped"],
  ["WRONG_DOCUMENT_TYPE", "Wrong document / slip"],
  ["INCOMPLETE_BILL", "Incomplete bill / missing pages"],
];

function useScope() {
  const { user } = useAuth();
  const context = useManagerData();
  const branch = context.branchId === "all" ? undefined : context.branchId;
  return {
    ...context,
    user,
    branch,
    key: `${user._id}:${typeof user.orgId === "object" ? user.orgId._id : user.orgId}:${branch || "all"}`,
  };
}
export function OwnerReport({ navigation, route }) {
  const { user } = useAuth();
  const { language: appLanguage, setLanguage: setAppLanguage } = useLanguage();
  const { service, branch, key, selectBranch, branchId, branches } = useScope();
  const [date, setDate] = useState(route.params?.date || yesterday());
  const [language, setLanguage] = useState(appLanguage || "en");
  const [speechError, setSpeechError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const speechSequence = useRef(0);
  useEffect(() => {
    if (appLanguage) setLanguage(appLanguage);
  }, [appLanguage]);
  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setAppLanguage(lang);
  };
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
  // The "Aaj ka hisab" boxes read the web Daily Digest's report, so app and web agree.
  const digest = useOwnerRequest(
    `${key}:${date}:digest`,
    () => service.dailyDigest(date, branch),
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
    <OwnerReportDashboard
      navigation={navigation}
      route={route}
      request={request}
      digest={digest}
      date={date}
      onDateChange={setDate}
      user={user}
      branchId={branchId}
      branches={branches}
      onBranchChange={selectBranch}
      language={language}
      onLanguageChange={handleLanguageChange}
      speaking={speaking}
      onListen={listen}
      onStop={() => Speech.stop()}
      speechError={speechError}
    />
  );
}
export function OwnerReportSection({ navigation, route }) {
  const { service, branch, key } = useScope();
  const { name, date } = route.params;
  const request = useOwnerRequest(`${key}:${date}:section:${name}`, () =>
    service.ownerDaily(date, branch),
  );
  const section = request.data?.sections?.[name];
  return (
    <Screen
      navigation={navigation}
      title={reportMeta[name]?.[0] || sectionNames[name] || name}
      subtitle={
        section?.sources?.some((source) => source.period?.at)
          ? "Current operational state"
          : `${date} · IST business day`
      }
    >
      <RequestState request={request} />
      {request.data && (
        <OwnerSectionContent
          key={`${key}:${date}:${name}`}
          name={name}
          section={section}
          onRecords={() =>
            section?.drilldown &&
            navigation.navigate(
              section.drilldown.route,
              section.drilldown.filters,
            )
          }
        />
      )}
    </Screen>
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
// Record approvals, owner calls and escalations are OWNER-only on the server. A manager
// reading the same report opens the branch screen that holds the same record instead.
function openAsManager(navigation, metric, row) {
  if (["diesel", "adblue", "fuelReviews"].includes(metric))
    navigation.navigate("Fuel logs", { vehicleId: row.vehicleId });
  else if (["expenses", "expenseReviews"].includes(metric))
    navigation.navigate("Manager approvals");
  else if (metric === "documents")
    navigation.navigate("Fleet documents", {
      vehicleId: row.entityType === "VEHICLE" ? row.entityId : undefined,
    });
  else if (metric === "people") navigation.navigate("Driver detail", { id: row._id });
  else if (metric === "inbox") navigation.navigate("Manager tabs", { screen: "Alerts" });
  else return false;
  return true;
}
export function OwnerReportRows({ navigation, route }) {
  const { service, branch, key, user } = useScope();
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
    if (user?.role !== "OWNER" && openAsManager(navigation, metric, row)) return;
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
      navigation.navigate("Owner record", { kind: "document", id: row._id });
    else if (metric === "people")
      navigation.navigate("Owner calls", { driverId: row._id });
    else if (metric === "inbox")
      navigation.navigate("Owner escalation", { id: row._id });
  }
  return (
    <Screen
      navigation={navigation}
      title={
        reportMeta[route.params.metric]?.[0] ||
        sectionNames[route.params.metric] ||
        route.params.metric
      }
      subtitle={`${route.params.date} · IST business day`}
    >
      <RequestState request={request} />
      {request.data && (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <AppText variant="small" muted>
              {request.data.total} matching records
            </AppText>
            <AppText variant="caption" mono muted>
              Page {page}
            </AppText>
          </View>
          {!request.data.items.length && (
            <AppText>No matching records.</AppText>
          )}
          {request.data.items.map((item) => (
            <Card key={item._id} style={{ gap: 10 }}>
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
          {(request.data.total > 30 || page > 1) && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Button
                label="Previous page"
                style={{ flex: 1 }}
                variant="secondary"
                disabled={page === 1}
                onPress={() => setPage(page - 1)}
              />
              <Button
                label="Next page"
                style={{ flex: 1 }}
                variant="secondary"
                disabled={page * 30 >= request.data.total}
                onPress={() => setPage(page + 1)}
              />
            </View>
          )}
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
export function OwnerCaptures(props) {
  return <ApprovalsScreen {...props} />;
}
export function OwnerRecord({ navigation, route }) {
  const { service, branch, key } = useScope();
  const { kind, id } = route.params;
  const request = useOwnerRequest(`${key}:record:${kind}:${id}`, () =>
    service.ownerRecord(kind, id, branch),
  );
  const write = useOwnerWrite(`${key}:review:${kind}:${id}`);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState(null); // null | "issue" | "correct" | "retake" | "dispute"
  const [corrections, setCorrections] = useState({});
  const [retakeReason, setRetakeReason] = useState("BLURRY_OR_DARK");
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => {
    setNote("");
    setMode(null);
    setCorrections({});
    setRetakeReason("BLURRY_OR_DARK");
    setConfirmation("");
  }, [key, kind, id]);
  const item = request.data;

  function startCorrecting() {
    setConfirmation("");
    setNote("");
    if (kind === "document") {
      setCorrections({ ...(item?.ocrData?.processedData || {}) });
    } else if (kind === "fuel") {
      setCorrections({
        litres: item?.litres != null ? String(item.litres) : "",
        amount:
          item?.totalAmount != null
            ? String(item.totalAmount)
            : item?.amount != null
              ? String(item.amount)
              : "",
        rate: item?.rate != null ? String(item.rate) : "",
        invoiceNumber:
          item?.invoiceNumber != null ? String(item.invoiceNumber) : "",
        odometerReading:
          item?.odometerReading != null ? String(item.odometerReading) : "",
      });
    } else if (kind === "expense") {
      setCorrections({
        amount: item?.amount != null ? String(item.amount) : "",
        category: item?.category != null ? String(item.category) : "",
        invoiceNumber:
          item?.invoiceNumber != null ? String(item.invoiceNumber) : "",
        description: item?.description != null ? String(item.description) : "",
      });
    }
    setMode("correct");
  }

  async function decide(action, extra = {}) {
    const actionNote = extra.note !== undefined ? extra.note : note;
    const actionCorrections =
      extra.corrections !== undefined
        ? extra.corrections
        : action === "CORRECT"
          ? corrections
          : undefined;
    const actionRetakeReason =
      extra.retakeReason !== undefined
        ? extra.retakeReason
        : action === "RETAKE"
          ? retakeReason
          : undefined;

    const payload = {
      action,
      note: actionNote,
      expectedUpdatedAt: item.updatedAt,
      ...(actionCorrections ? { corrections: actionCorrections } : {}),
      ...(actionRetakeReason ? { retakeReason: actionRetakeReason } : {}),
    };

    const result = await write.execute(payload, (body) =>
      service.ownerDecision(kind, id, body, branch),
    );
    if (result) {
      setNote("");
      setMode(null);
      setCorrections({});
      setConfirmation(
        action === "CORRECT"
          ? "Corrections saved."
          : action === "RETAKE"
            ? "Driver retake requested."
            : action === "DISPUTE"
              ? "Disagreement flagged on record."
              : kind === "document"
                ? (write.draft?.action || action) === "REJECT"
                  ? "Issue recorded. Verification status is unchanged."
                  : "Document verified."
                : "Decision saved.",
      );
      request.reload();
    }
  }
  return (
    <Screen
      navigation={navigation}
      title={
        kind === "document"
          ? "Document review"
          : kind === "fuel"
            ? "Fuel capture review"
            : "Financial bill review"
      }
    >
      <RequestState request={request} />
      {item && (
        <>
          <Card>
            <RecordSummary item={item} />
            <FileLink
              url={
                kind === "document"
                  ? item.fileUrl
                  : item.receipt?.publicUrl || item.receiptUrl
              }
              label={
                kind === "document"
                  ? "Open document evidence"
                  : "Open receipt evidence"
              }
            />
          </Card>
          <AppText muted>
            {kind === "document"
              ? "Verify after reviewing the document. Noting an issue records your concern without changing verification status."
              : kind === "fuel"
                ? "This reviews the recorded capture. It does not approve an expense or record payment."
                : "Confirmation includes this bill in the driver wallet. It is not payment."}
          </AppText>
          {confirmation ? <AppText>{confirmation}</AppText> : null}
          {kind === "document" && (
            <Card>
              <AppText weight="bold">
                {item.isVerified ? "Verified" : "Not verified"}
              </AppText>
              <AppText>
                {item.entityType === "USER"
                  ? "Driver document"
                  : "Vehicle document"}{" "}
                · {String(item.entityId)}
              </AppText>
              <AppText>
                Expiry:{" "}
                {item.expiryDate
                  ? new Date(item.expiryDate).toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })
                  : "Not recorded"}
              </AppText>
              {item.verifiedAt && (
                <AppText>
                  Verified on{" "}
                  {new Date(item.verifiedAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST
                </AppText>
              )}
              {!item.fileUrl && (
                <AppText muted>No document file is available.</AppText>
              )}
              {item.captureReview && (
                <>
                  <AppText>
                    Detected:{" "}
                    {captureKindLabel(item.captureReview.classifiedKind)} ·
                    confidence{" "}
                    {item.captureReview.kindConfidence ?? "unavailable"}
                  </AppText>
                  <AppText>
                    {captureWarnings(item.captureReview).join(" ")}
                  </AppText>
                  {item.captureReview.duplicateOf && (
                    <AppText>
                      Possible duplicate of an existing document. Both originals
                      are retained.
                    </AppText>
                  )}
                  <AppText weight="bold">
                    Suggested extraction — check against the original
                  </AppText>
                  {Object.entries(item.ocrData?.processedData || {})
                    .filter(([field]) => field !== "quality")
                    .map(([field, value]) => (
                      <AppText key={field}>
                        {field.replaceAll("_", " ")}:{" "}
                        {value == null
                          ? "Unknown"
                          : typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                      </AppText>
                    ))}
                  {!!item.ocrData?.missingFields?.length && (
                    <AppText>
                      Missing: {item.ocrData.missingFields.join(", ")}
                    </AppText>
                  )}
                </>
              )}
              {write.draft ? (
                <Button
                  label="Retry saved document action"
                  disabled={!write.ready}
                  loading={write.busy}
                  onPress={() => decide(write.draft.action)}
                />
              ) : mode === "correct" ? (
                <>
                  <AppText weight="bold">Correct extracted fields</AppText>
                  {Object.keys(corrections).map((field) => (
                    <TextField
                      key={field}
                      label={field.replaceAll("_", " ")}
                      value={String(corrections[field] ?? "")}
                      onChangeText={(val) =>
                        setCorrections((prev) => ({ ...prev, [field]: val }))
                      }
                      editable={!write.busy}
                    />
                  ))}
                  <TextField
                    label="Correction note (optional)"
                    value={note}
                    onChangeText={setNote}
                    maxLength={2000}
                    multiline
                    editable={!write.busy}
                  />
                  <Button
                    label="Save corrected extractions"
                    disabled={
                      !write.ready ||
                      write.busy ||
                      request.loading ||
                      !item.updatedAt
                    }
                    loading={write.busy}
                    onPress={() => decide("CORRECT")}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    disabled={write.busy}
                    onPress={() => {
                      setMode(null);
                      setNote("");
                      setCorrections({});
                    }}
                  />
                </>
              ) : mode === "retake" ? (
                <>
                  <Choice
                    label="Reason for retake"
                    value={retakeReason}
                    onChange={setRetakeReason}
                    options={RETAKE_REASONS}
                  />
                  <TextField
                    label="Retake instruction for driver"
                    value={note}
                    onChangeText={setNote}
                    maxLength={2000}
                    multiline
                    editable={!write.busy}
                  />
                  <Button
                    label="Send retake request"
                    disabled={
                      !write.ready ||
                      write.busy ||
                      request.loading ||
                      !item.updatedAt
                    }
                    loading={write.busy}
                    onPress={() => decide("RETAKE")}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    disabled={write.busy}
                    onPress={() => {
                      setMode(null);
                      setNote("");
                    }}
                  />
                </>
              ) : mode === "dispute" ? (
                <>
                  <TextField
                    label="Disagreement details / explanation"
                    value={note}
                    onChangeText={setNote}
                    maxLength={2000}
                    multiline
                    editable={!write.busy}
                  />
                  <Button
                    label="Record disagreement"
                    variant="danger"
                    disabled={
                      !write.ready ||
                      write.busy ||
                      request.loading ||
                      !item.updatedAt ||
                      !note.trim()
                    }
                    loading={write.busy}
                    onPress={() => decide("DISPUTE")}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    disabled={write.busy}
                    onPress={() => {
                      setMode(null);
                      setNote("");
                    }}
                  />
                </>
              ) : mode === "issue" ? (
                <>
                  <TextField
                    label="What is the issue?"
                    value={note}
                    onChangeText={setNote}
                    maxLength={2000}
                    multiline
                    editable={!write.busy}
                  />
                  <Button
                    label="Save issue note"
                    disabled={
                      !write.ready ||
                      write.busy ||
                      request.loading ||
                      !item.updatedAt ||
                      !note.trim()
                    }
                    loading={write.busy}
                    onPress={() => decide("REJECT")}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    disabled={write.busy}
                    onPress={() => {
                      setMode(null);
                      setNote("");
                    }}
                  />
                </>
              ) : (
                <>
                  {!item.isVerified && (
                    <Button
                      label="VERIFY"
                      disabled={
                        !write.ready ||
                        write.busy ||
                        request.loading ||
                        !item.updatedAt
                      }
                      onPress={() => decide("VERIFY")}
                    />
                  )}
                  {item.ocrData?.processedData &&
                    Object.keys(item.ocrData.processedData).length > 0 && (
                      <Button
                        label="Edit extractions"
                        variant="secondary"
                        disabled={!write.ready || write.busy}
                        onPress={startCorrecting}
                      />
                    )}
                  <Button
                    label="Request driver retake"
                    variant="secondary"
                    disabled={!write.ready || write.busy}
                    onPress={() => {
                      setConfirmation("");
                      setMode("retake");
                    }}
                  />
                  <Button
                    label="Note an issue"
                    variant="secondary"
                    disabled={!write.ready || write.busy}
                    onPress={() => {
                      setConfirmation("");
                      setMode("issue");
                    }}
                  />
                  <Button
                    label="Flag disagreement"
                    variant="secondary"
                    disabled={!write.ready || write.busy}
                    onPress={() => {
                      setConfirmation("");
                      setMode("dispute");
                    }}
                  />
                </>
              )}
            </Card>
          )}
          {(kind === "fuel"
            ? item.reviewStatus === "NEEDS_REVIEW"
            : kind === "expense" && item.status === "PENDING") && (
            <>
              {write.draft ? (
                <Button
                  label="Retry saved decision"
                  disabled={!write.ready}
                  loading={write.busy}
                  onPress={() => decide(write.draft.action)}
                />
              ) : mode === "correct" ? (
                <>
                  {kind === "fuel" ? (
                    <>
                      <TextField
                        label="Litres / Quantity"
                        value={corrections.litres || ""}
                        onChangeText={(val) =>
                          setCorrections((prev) => ({ ...prev, litres: val }))
                        }
                        keyboardType="decimal-pad"
                        editable={!write.busy}
                      />
                      <TextField
                        label="Total Amount (₹)"
                        value={corrections.amount || ""}
                        onChangeText={(val) =>
                          setCorrections((prev) => ({ ...prev, amount: val }))
                        }
                        keyboardType="decimal-pad"
                        editable={!write.busy}
                      />
                      <TextField
                        label="Rate per litre (₹)"
                        value={corrections.rate || ""}
                        onChangeText={(val) =>
                          setCorrections((prev) => ({ ...prev, rate: val }))
                        }
                        keyboardType="decimal-pad"
                        editable={!write.busy}
                      />
                      <TextField
                        label="Invoice / Slip number"
                        value={corrections.invoiceNumber || ""}
                        onChangeText={(val) =>
                          setCorrections((prev) => ({
                            ...prev,
                            invoiceNumber: val,
                          }))
                        }
                        editable={!write.busy}
                      />
                      <TextField
                        label="Odometer reading"
                        value={corrections.odometerReading || ""}
                        onChangeText={(val) =>
                          setCorrections((prev) => ({
                            ...prev,
                            odometerReading: val,
                          }))
                        }
                        keyboardType="numeric"
                        editable={!write.busy}
                      />
                    </>
                  ) : (
                    <>
                      <TextField
                        label="Total Amount (₹)"
                        value={corrections.amount || ""}
                        onChangeText={(val) =>
                          setCorrections((prev) => ({ ...prev, amount: val }))
                        }
                        keyboardType="decimal-pad"
                        editable={!write.busy}
                      />
                      <TextField
                        label="Category"
                        value={corrections.category || ""}
                        onChangeText={(val) =>
                          setCorrections((prev) => ({ ...prev, category: val }))
                        }
                        editable={!write.busy}
                      />
                      <TextField
                        label="Invoice / Bill number"
                        value={corrections.invoiceNumber || ""}
                        onChangeText={(val) =>
                          setCorrections((prev) => ({
                            ...prev,
                            invoiceNumber: val,
                          }))
                        }
                        editable={!write.busy}
                      />
                      <TextField
                        label="Description"
                        value={corrections.description || ""}
                        onChangeText={(val) =>
                          setCorrections((prev) => ({
                            ...prev,
                            description: val,
                          }))
                        }
                        editable={!write.busy}
                      />
                    </>
                  )}
                  <TextField
                    label="Correction note (optional)"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    editable={!write.busy}
                  />
                  <Button
                    label={
                      kind === "fuel"
                        ? "Save corrected fuel details"
                        : "Save corrected bill details"
                    }
                    disabled={
                      !write.ready ||
                      write.busy ||
                      request.loading ||
                      !item.updatedAt
                    }
                    loading={write.busy}
                    onPress={() => decide("CORRECT")}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    disabled={write.busy}
                    onPress={() => {
                      setMode(null);
                      setNote("");
                      setCorrections({});
                    }}
                  />
                </>
              ) : mode === "retake" ? (
                <>
                  <Choice
                    label="Reason for retake"
                    value={retakeReason}
                    onChange={setRetakeReason}
                    options={RETAKE_REASONS}
                  />
                  <TextField
                    label="Retake instruction for driver"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    editable={!write.busy}
                  />
                  <Button
                    label="Send retake request"
                    disabled={
                      !write.ready ||
                      write.busy ||
                      request.loading ||
                      !item.updatedAt
                    }
                    loading={write.busy}
                    onPress={() => decide("RETAKE")}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    disabled={write.busy}
                    onPress={() => {
                      setMode(null);
                      setNote("");
                    }}
                  />
                </>
              ) : mode === "dispute" ? (
                <>
                  <TextField
                    label="Disagreement details / explanation"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    editable={!write.busy}
                  />
                  <Button
                    label="Record disagreement"
                    variant="danger"
                    disabled={
                      !write.ready ||
                      write.busy ||
                      request.loading ||
                      !item.updatedAt ||
                      !note.trim()
                    }
                    loading={write.busy}
                    onPress={() => decide("DISPUTE")}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    disabled={write.busy}
                    onPress={() => {
                      setMode(null);
                      setNote("");
                    }}
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="Review note / rejection reason"
                    value={note}
                    onChangeText={setNote}
                    editable={!write.busy && !write.draft}
                    multiline
                  />
                  <Button
                    label="Approve"
                    disabled={!write.ready}
                    loading={write.busy}
                    onPress={() => decide("APPROVE")}
                  />
                  <Button
                    label="Reject with reason"
                    variant="danger"
                    disabled={!note.trim() || !write.ready || write.busy}
                    onPress={() => decide("REJECT")}
                  />
                  <Button
                    label="Correct values"
                    variant="secondary"
                    disabled={!write.ready || write.busy}
                    onPress={startCorrecting}
                  />
                  <Button
                    label="Request driver retake"
                    variant="secondary"
                    disabled={!write.ready || write.busy}
                    onPress={() => {
                      setConfirmation("");
                      setMode("retake");
                    }}
                  />
                  <Button
                    label="Flag disagreement"
                    variant="secondary"
                    disabled={!write.ready || write.busy}
                    onPress={() => {
                      setConfirmation("");
                      setMode("dispute");
                    }}
                  />
                </>
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
export function OwnerFinance(props) {
  return <KhataLedgerScreen {...props} />;
}
export { KhataLedgerScreen };
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

        {/* Top date range bar */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            paddingVertical: 14,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <Ionicons
            name="calendar"
            size={20}
            color="#4F46E5"
            style={{ marginRight: 12 }}
          />
          <AppText
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#0F172A",
              flex: 1,
            }}
          >
            {data.days[0].date} to {data.date} IST · selected branch
          </AppText>
          <Ionicons name="chevron-down" size={18} color="#0F172A" />
        </View>

        {/* Notice cards */}
        {data.notes.map((note, index) => {
          const isBulb =
            index === 1 ||
            note.toLowerCase().includes("average") ||
            note.toLowerCase().includes("compar");
          return (
            <View
              key={note}
              style={{
                backgroundColor: "#F5F3FF",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#DDD6FE",
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: isBulb ? "#FEF3C7" : "#E0E7FF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                {isBulb ? (
                  <Ionicons name="bulb" size={22} color="#D97706" />
                ) : (
                  <Ionicons name="stats-chart" size={20} color="#4F46E5" />
                )}
              </View>
              <AppText
                style={{
                  flex: 1,
                  fontSize: 12.5,
                  lineHeight: 18,
                  color: "#1E293B",
                }}
              >
                {note}
              </AppText>
            </View>
          );
        })}

        {/* Trend Section Cards */}
        {trendSections.map((name) => {
          const section = data.sections[name];
          if (!section) return null;
          const isTrips = name === "trips";
          const isDiesel = name === "diesel";
          return (
            <View
              key={name}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: isTrips
                      ? "#DBEAFE"
                      : isDiesel
                        ? "#D1FAE5"
                        : name === "expenses"
                          ? "#FFEDD5"
                          : "#F1F5F9",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  {isTrips ? (
                    <Ionicons name="car" size={24} color="#2563EB" />
                  ) : isDiesel ? (
                    <MaterialCommunityIcons
                      name="gas-station"
                      size={24}
                      color="#059669"
                    />
                  ) : name === "expenses" ? (
                    <Ionicons name="receipt" size={22} color="#EA580C" />
                  ) : (
                    <Ionicons name="analytics" size={22} color="#475569" />
                  )}
                </View>
                <View
                  style={{
                    width: 1,
                    height: 32,
                    backgroundColor: "#E2E8F0",
                    marginRight: 12,
                  }}
                />
                <AppText
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#0F172A",
                    flex: 1,
                  }}
                >
                  {sectionNames[name]}
                </AppText>
              </View>

              {section.availability === "unavailable" ? (
                <AppText muted style={{ marginTop: 8 }}>
                  {section.reasonCode === "NOT_ENABLED"
                    ? "Not enabled"
                    : section.status === "error"
                      ? "Could not load"
                      : "Source unavailable"}
                </AppText>
              ) : (
                Object.entries(section.metrics).map(
                  ([metric, trend], index) => {
                    let metricIcon = null;
                    if (metric === "ladenKm" || metric === "observedKm") {
                      metricIcon = (
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: "#F3E8FF",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 10,
                          }}
                        >
                          <Ionicons
                            name="location"
                            size={17}
                            color="#9333EA"
                          />
                        </View>
                      );
                    } else if (metric === "litres") {
                      metricIcon = (
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: "#D1FAE5",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 10,
                          }}
                        >
                          <Ionicons
                            name="water"
                            size={17}
                            color="#059669"
                          />
                        </View>
                      );
                    } else if (metric === "amount") {
                      metricIcon = (
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: "#D1FAE5",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 10,
                          }}
                        >
                          <MaterialCommunityIcons
                            name="currency-inr"
                            size={17}
                            color="#059669"
                          />
                        </View>
                      );
                    }

                    return (
                      <View key={metric}>
                        {index === 0 ? (
                          <View style={{ marginTop: 10 }}>
                            <AppText
                              style={{
                                fontSize: 14,
                                fontWeight: "700",
                                color: "#0F172A",
                              }}
                            >
                              {metric}:{" "}
                              {trendPointText(trend.series.at(-1), trend.unit)}
                            </AppText>
                            <AppText
                              style={{
                                fontSize: 12,
                                color: "#64748B",
                                marginTop: 3,
                              }}
                            >
                              Same weekday (
                              {trend.comparison.sameWeekday.date}):{" "}
                              {trendPointText(trend.series.at(-8), trend.unit)}{" "}
                              · 7-day average:{" "}
                              {displayMetric({
                                value:
                                  trend.comparison.previousSevenDays
                                    .dailyAverage,
                                unit: trend.unit,
                              })}
                            </AppText>
                          </View>
                        ) : (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginTop: 12,
                            }}
                          >
                            {metricIcon}
                            <View
                              style={{
                                width: 1,
                                height: 26,
                                backgroundColor: "#E2E8F0",
                                marginRight: 10,
                              }}
                            />
                            <View style={{ flex: 1 }}>
                              <AppText
                                style={{
                                  fontSize: 14,
                                  fontWeight: "700",
                                  color: "#0F172A",
                                }}
                              >
                                {metric.replace(/([A-Z])/g, " $1")}:{" "}
                                {trendPointText(
                                  trend.series.at(-1),
                                  trend.unit,
                                )}
                              </AppText>
                              <AppText
                                style={{
                                  fontSize: 12,
                                  color: "#64748B",
                                  marginTop: 2,
                                }}
                              >
                                Same weekday (
                                {trend.comparison.sameWeekday.date}):{" "}
                                {trendPointText(
                                  trend.series.at(-8),
                                  trend.unit,
                                )}{" "}
                                · 7-day average:{" "}
                                {displayMetric({
                                  value:
                                    trend.comparison.previousSevenDays
                                      .dailyAverage,
                                  unit: trend.unit,
                                })}
                              </AppText>
                            </View>
                          </View>
                        )}

                        {comparisonNotes(trend.comparison).map((note) => (
                          <AppText
                            key={note}
                            variant="caption"
                            color={colors.warning}
                            style={{ marginTop: 2 }}
                          >
                            {note}
                          </AppText>
                        ))}

                        {expanded === name &&
                          trend.series.map((point) => (
                            <AppText
                              key={point.date}
                              variant="caption"
                              style={{
                                color: "#475569",
                                marginTop: 2,
                                marginLeft: 4,
                              }}
                            >
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
                    );
                  },
                )
              )}

              {section.notes.map((note) => (
                <AppText
                  key={note}
                  variant="caption"
                  muted
                  style={{ marginTop: 4 }}
                >
                  {note}
                </AppText>
              ))}

              {section.availability === "available" && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    expanded === name ? "Hide 14 days" : "Show 14 days"
                  }
                  onPress={() =>
                    setExpanded(expanded === name ? null : name)
                  }
                  style={{
                    backgroundColor: "#EEF2FF",
                    borderRadius: 999,
                    paddingVertical: 7,
                    paddingHorizontal: 16,
                    alignSelf: "center",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 14,
                  }}
                >
                  <AppText
                    style={{
                      color: "#4F46E5",
                      fontWeight: "700",
                      fontSize: 13.5,
                      marginRight: 4,
                    }}
                  >
                    {expanded === name ? "Hide 14 days" : "Show 14 days"}
                  </AppText>
                  <Ionicons
                    name={expanded === name ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#4F46E5"
                  />
                </Pressable>
              )}
            </View>
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
  const { service, branches, key, user } = useScope();
  const { setLanguage: setAppLanguage } = useLanguage();
  const request = useOwnerRequest(`${key}:preferences`, () =>
    service.ownerPreferences(),
  );
  const [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (request.data)
      setForm({
        enabled: Boolean(request.data.enabled),
        time: request.data.time || "08:00",
        language: request.data.language || "en",
        branchId: request.data.branchId || null,
        emailEnabled: Boolean(request.data.emailEnabled),
        email: request.data.email ?? user?.email ?? "",
        whatsappEnabled: Boolean(request.data.whatsappEnabled),
        whatsappNumber: request.data.whatsappNumber ?? user?.phone ?? "",
      });
    else setForm(null);
  }, [request.data, user]);
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
          <Choice
            label="Email delivery"
            value={String(form.emailEnabled)}
            onChange={(value) =>
              setForm({ ...form, emailEnabled: value === "true" })
            }
            options={[
              ["true", "Enabled"],
              ["false", "Disabled"],
            ]}
          />
          {form.emailEnabled && (
            <TextField
              label="Recipient email"
              value={form.email}
              onChangeText={(email) => setForm({ ...form, email })}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
            />
          )}
          <Choice
            label="WhatsApp delivery"
            value={String(form.whatsappEnabled)}
            onChange={(value) =>
              setForm({ ...form, whatsappEnabled: value === "true" })
            }
            options={[
              ["true", "Enabled"],
              ["false", "Disabled"],
            ]}
          />
          {form.whatsappEnabled && (
            <TextField
              label="WhatsApp number"
              value={form.whatsappNumber}
              onChangeText={(whatsappNumber) =>
                setForm({ ...form, whatsappNumber })
              }
              keyboardType="phone-pad"
              maxLength={15}
            />
          )}
          <AppText muted>
            Opens yesterday's report. Historical reports are recomputed; device
            notification permission is also required for push delivery.
          </AppText>
          <Button
            label="Save preference"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                await service.ownerPreferences(form);
                if (form.language) setAppLanguage(form.language);
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
  useEffect(() => {
    setPage(1);
  }, [key]);
  return (
    <Screen
      navigation={navigation}
      title="Owner inbox"
      subtitle="The things that need your attention."
    >
      <SegmentedControl
        variant="pill"
        value={all ? "all" : "priority"}
        options={[
          { label: "Top priority", value: "priority" },
          { label: "All items", value: "all" },
        ]}
        onChange={(value) => {
          setAll(value === "all");
          setPage(1);
        }}
      />
      <RequestState request={request} />
      {request.data && (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <AppText variant="small" muted>
              {request.data.total} retained items
            </AppText>
            <Badge
              tone={request.data.activeCount ? "pending" : "neutral"}
              label={`${request.data.activeCount} active`}
            />
          </View>
          {!request.data.items.length && (
            <Card padding={28} style={{ alignItems: "center", gap: 12 }}>
              <View
                style={{
                  padding: 16,
                  borderRadius: 20,
                  backgroundColor: colors.blueTint,
                }}
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={30}
                  color={colors.primary}
                />
              </View>
              <AppText variant="h3" center>
                {request.data.activeCount === 0
                  ? "You’re all caught up"
                  : "No items in this view"}
              </AppText>
              <AppText variant="small" muted center>
                Fuel reviews, incidents and document alerts will appear here
                when they need a closer look.
              </AppText>
            </Card>
          )}
          {request.data.items.map((item) => (
            <Card
              key={item._id}
              onPress={() =>
                navigation.navigate("Owner escalation", { id: item._id })
              }
              style={{ gap: 12 }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Badge
                  tone={
                    item.severity === "critical"
                      ? "expired"
                      : item.severity === "caution"
                        ? "pending"
                        : "info"
                  }
                  label={
                    item.severity === "critical"
                      ? "Urgent"
                      : item.severity === "caution"
                        ? "Needs review"
                        : "Update"
                  }
                />
                <AppText
                  variant="caption"
                  muted
                  style={{ flex: 1, textAlign: "right" }}
                >
                  {String(item.ownerWorkflow?.state || item.status)
                    .replaceAll("_", " ")
                    .toLowerCase()}
                </AppText>
              </View>
              <AppText variant="h3">{item.label || item.condition}</AppText>
              <AppText variant="small" muted>
                {item.subjectLabel || item.subjectKey}
              </AppText>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  color={colors.rage700}
                  style={{ flex: 1 }}
                >
                  Review case
                </AppText>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.primary}
                />
              </View>
            </Card>
          ))}
          {all && request.data.total > 30 && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Button
                label="Previous"
                style={{ flex: 1 }}
                variant="secondary"
                disabled={page === 1}
                onPress={() => setPage(page - 1)}
              />
              <Button
                label="Next"
                style={{ flex: 1 }}
                variant="secondary"
                disabled={page * 30 >= request.data.total}
                onPress={() => setPage(page + 1)}
              />
            </View>
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
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              flexDirection: "row",
              marginBottom: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: "#EBF3FF",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
                position: "relative",
              }}
            >
              <MaterialCommunityIcons
                name="gas-station"
                size={26}
                color="#2563EB"
              />
              <View
                style={{
                  position: "absolute",
                  right: 5,
                  bottom: 5,
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: "#2563EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppText
                  style={{
                    color: "#FFFFFF",
                    fontSize: 9,
                    fontWeight: "900",
                    lineHeight: 11,
                  }}
                >
                  !
                </AppText>
              </View>
            </View>

            <View
              style={{
                width: 1,
                alignSelf: "stretch",
                backgroundColor: "#E2E8F0",
                marginRight: 14,
              }}
            />

            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <AppText
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#0F172A",
                    flex: 1,
                    marginRight: 8,
                  }}
                >
                  {item.label || item.condition}
                </AppText>
                <View
                  style={{
                    backgroundColor: "#FEE2E2",
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="alert-circle"
                    size={14}
                    color="#DC2626"
                  />
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: "#DC2626",
                      marginLeft: 4,
                    }}
                  >
                    High Priority
                  </AppText>
                </View>
              </View>

              <AppText
                style={{
                  fontSize: 13.5,
                  color: "#1E293B",
                  lineHeight: 19,
                  marginBottom: 4,
                }}
              >
                {item.wants}
              </AppText>
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#0F172A",
                  marginBottom: 4,
                }}
              >
                {item.subjectLabel || item.subjectKey}
              </AppText>
              <AppText
                style={{
                  fontSize: 12.5,
                  color: "#334155",
                  lineHeight: 18,
                  marginBottom: 4,
                }}
              >
                {item.ranking?.explanation}
              </AppText>
              <AppText
                style={{
                  fontSize: 12.5,
                  color: "#334155",
                  marginBottom: 2,
                }}
              >
                Score {item.ranking?.score} · confidence{" "}
                {item.ranking?.confidence} · stake{" "}
                {item.ranking?.stakeInr == null
                  ? "unassessed"
                  : `₹${item.ranking.stakeInr}`}
              </AppText>
              <AppText
                style={{
                  fontSize: 12.5,
                  color: "#334155",
                }}
              >
                Acknowledgement: {item.status}. Owner action:{" "}
                {item.ownerWorkflow?.state || "OPEN"}.
              </AppText>
            </View>
          </View>

          {item.sources.map((source, index) => {
            const isRefuel =
              source.code?.includes("REFUEL") || source.severity === "info";
            return (
              <View
                key={index}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  flexDirection: "row",
                  marginBottom: 16,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: "#EBF3FF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  {isRefuel ? (
                    <MaterialCommunityIcons
                      name="shield-alert"
                      size={28}
                      color="#2563EB"
                    />
                  ) : (
                    <Ionicons
                      name="warning"
                      size={26}
                      color="#2563EB"
                    />
                  )}
                </View>

                <View
                  style={{
                    width: 1,
                    alignSelf: "stretch",
                    backgroundColor: "#E2E8F0",
                    marginRight: 14,
                  }}
                />

                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: "#0F172A",
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      {source.source} · {source.code}
                    </AppText>
                    {isRefuel ? (
                      <View
                        style={{
                          backgroundColor: "#DBEAFE",
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name="information-circle"
                          size={14}
                          color="#2563EB"
                        />
                        <AppText
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: "#2563EB",
                            marginLeft: 4,
                          }}
                        >
                          Info
                        </AppText>
                      </View>
                    ) : (
                      <View
                        style={{
                          backgroundColor: "#FEF3C7",
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name="warning"
                          size={13}
                          color="#D97706"
                        />
                        <AppText
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: "#D97706",
                            marginLeft: 4,
                          }}
                        >
                          Warning
                        </AppText>
                      </View>
                    )}
                  </View>

                  <AppText
                    style={{
                      fontSize: 13,
                      color: "#1E293B",
                      lineHeight: 19,
                    }}
                  >
                    {source.detail}
                  </AppText>

                  {["incidents", "documents"].includes(source.source) &&
                    /^[a-f0-9]{24}$/i.test(
                      String(source.refId).split(":")[0],
                    ) && (
                      <Button
                        label="Open source evidence"
                        variant="secondary"
                        style={{ marginTop: 10 }}
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
                      style={{ marginTop: 10 }}
                      onPress={() =>
                        navigation.navigate("Owner report rows", {
                          metric: source.source,
                          date: yesterday(),
                        })
                      }
                    />
                  )}
                </View>
              </View>
            );
          })}
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
      <View style={{ marginBottom: 4 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Ionicons
            name="person"
            size={16}
            color="#2563EB"
            style={{ marginRight: 6 }}
          />
          <AppText
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#1E293B",
              letterSpacing: 0.5,
            }}
          >
            DRIVER
          </AppText>
        </View>
        <Select
          accessibilityLabel="Driver"
          selectedValue={driverId}
          onValueChange={setDriverId}
          enabled={!write.busy && !write.draft}
          triggerStyle={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}
          valueStyle={{
            fontSize: 16,
            fontWeight: "700",
            color: "#0F172A",
          }}
          chevronColor="#0F172A"
        >
          <Select.Item label="Choose..." value="" />
          {(roster.data?.items || []).map((d) => (
            <Select.Item
              key={d._id}
              label={`${d.firstName} ${d.lastName || ""}${d.mobileNumber ? "" : " · no phone"}`}
              value={d._id}
            />
          ))}
        </Select>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          write.draft ? "Retry saved call initiation" : "Open dialer"
        }
        disabled={!write.ready || !driverId || write.busy}
        onPress={dial}
        style={{
          backgroundColor: "#2563EB",
          borderRadius: 999,
          paddingVertical: 15,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginVertical: 12,
          opacity: !write.ready || !driverId || write.busy ? 0.6 : 1,
        }}
      >
        {write.busy ? (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
        ) : (
          <Ionicons
            name="call"
            size={19}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
        )}
        <AppText style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
          {write.draft ? "Retry saved call initiation" : "Open dialer"}
        </AppText>
      </Pressable>

      <View
        style={{
          backgroundColor: "#EBF3FF",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#BFDBFE",
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons
          name="information-circle"
          size={26}
          color="#2563EB"
          style={{ marginRight: 12 }}
        />
        <AppText
          style={{
            flex: 1,
            fontSize: 13,
            lineHeight: 18,
            color: "#1E293B",
          }}
        >
          Returning from the dialer does not prove that a call connected. Record
          the outcome yourself.
        </AppText>
      </View>

      <RequestState request={calls} />
      {calls.data?.items.map((call) => (
        <Pressable
          key={call._id}
          accessibilityRole="button"
          accessibilityLabel={`${call.phone}, ${call.outcome}`}
          onPress={() => {
            setSelected(call);
            setNote(call.note || "");
          }}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            marginBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "#EBF3FF",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
            }}
          >
            <Ionicons name="call" size={22} color="#2563EB" />
          </View>
          <View
            style={{
              width: 1,
              height: 32,
              backgroundColor: "#E2E8F0",
              marginRight: 14,
            }}
          />
          <View style={{ flex: 1, marginRight: 8 }}>
            <AppText
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 4,
              }}
            >
              {call.phone}
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color="#2563EB"
                style={{ marginRight: 5 }}
              />
              <AppText
                style={{ fontSize: 12, fontWeight: "600", color: "#64748B" }}
              >
                {call.outcome} · {new Date(call.createdAt).toLocaleString()}
              </AppText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#0F172A" />
        </Pressable>
      ))}

      {selected && (
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            marginBottom: 16,
            gap: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <AppText
            style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}
          >
            Record outcome for {selected.phone}
          </AppText>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save outcome"
            disabled={!outcomeWrite.ready || outcomeWrite.busy}
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
            style={{
              backgroundColor: "#2563EB",
              borderRadius: 999,
              paddingVertical: 14,
              paddingHorizontal: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              opacity: !outcomeWrite.ready || outcomeWrite.busy ? 0.6 : 1,
            }}
          >
            {outcomeWrite.busy ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
            ) : (
              <Ionicons
                name="checkmark"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
            )}
            <AppText
              style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}
            >
              Save outcome
            </AppText>
          </Pressable>
        </View>
      )}

      {write.error || outcomeWrite.error || error ? (
        <AppText color={colors.error}>
          {write.error || outcomeWrite.error || error}
        </AppText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous calls"
        disabled={page === 1}
        onPress={() => setPage(page - 1)}
        style={{
          backgroundColor: "#FFFFFF",
          borderWidth: 1.5,
          borderColor: "#BFDBFE",
          borderRadius: 999,
          paddingVertical: 14,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
          opacity: page === 1 ? 0.5 : 1,
        }}
      >
        <MaterialCommunityIcons
          name="history"
          size={20}
          color="#2563EB"
          style={{ marginRight: 8 }}
        />
        <AppText style={{ color: "#2563EB", fontWeight: "700", fontSize: 16 }}>
          Previous calls
        </AppText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More calls"
        disabled={!calls.data || page * 30 >= calls.data.total}
        onPress={() => setPage(page + 1)}
        style={{
          backgroundColor: "#FFFFFF",
          borderWidth: 1.5,
          borderColor: "#BFDBFE",
          borderRadius: 999,
          paddingVertical: 14,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          opacity: !calls.data || page * 30 >= calls.data.total ? 0.5 : 1,
        }}
      >
        <Ionicons
          name="ellipsis-horizontal-circle"
          size={22}
          color="#2563EB"
          style={{ marginRight: 8 }}
        />
        <AppText style={{ color: "#2563EB", fontWeight: "700", fontSize: 16 }}>
          More calls
        </AppText>
      </Pressable>
    </Screen>
  );
}
