import { captureKindLabel, captureWarnings } from "../services/documentCapture";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, View, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Picker from "../../components/ui/SelectField";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppText, Button, Card, TextField, colors } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useDriverData } from "../context/DriverDataContext";
import { Page, MenuRow } from "../screens/DriverScreens";
import AttachmentPicker from "./AttachmentPicker";
import { formatLitres } from "../../utils/format";
import DateField from "./DateField";
import FuelLogFormScreen from "../../screens/driver/fuel/FuelLogFormScreen";
const labels = {
  fuel: "Fuel history",
  bills: "Workshop bills",
  documents: "Documents",
  support: "Support",
  issues: "My issues",
};
const kindFor = (route) =>
  route.params?.kind ||
  {
    "Add fuel": "fuel",
    "Workshop bill": "bills",
    "Report issue": "issues",
    "New support ticket": "support",
    "Upload document": "documents",
    "Reply to support": "reply",
  }[route.name];
const idOf = (row) => row.id || row._id;
const titleOf = (row, kind) =>
  kind === "fuel"
    ? row.location || "Fuel entry"
    : kind === "documents"
      ? row.docType
      : kind === "support"
        ? row.subject
        : kind === "issues"
          ? row.report?.note || row.type
          : "Workshop bill";
const statusOf = (row, kind) =>
  kind === "bills"
    ? `${row.scanStatus} · ${row.reviewedAt ? "Reviewed" : "Awaiting review"}`
    : kind === "documents"
      ? `${row.isVerified ? "Verified" : "Not verified"}${row.expiryDate ? ` · Expires ${new Date(row.expiryDate).toLocaleDateString()}` : ""}`
      : row.status || row.reviewStatus || "Recorded";
export function FileLink({ url, label = "Open attached file" }) {
  const [error, setError] = useState("");
  return url ? (
    <>
      <Button
        label={label}
        variant="secondary"
        onPress={() => {
          if (!/^https?:\/\//i.test(url)) {
            setError("File link is unavailable. Refresh this record.");
            return;
          }
          Linking.openURL(url).catch((failure) => setError(failure.message));
        }}
      />
      {error && <AppText color={colors.error}>{error}</AppText>}
    </>
  ) : null;
}
function Select({ label, value, onChange, values, disabled }) {
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="label" muted>
        {label}
      </AppText>
      <Picker
        accessibilityLabel={label}
        enabled={!disabled}
        selectedValue={value}
        onValueChange={onChange}
      >
        {values.map(([code, name]) => (
          <Picker.Item key={code} value={code} label={name} />
        ))}
      </Picker>
    </View>
  );
}
export function RecordList({ navigation, route }) {
  const { service } = useDriverData();
  const kind =
    route.params?.kind ||
    {
      "Fuel history": "fuel",
      "Workshop bills": "bills",
      "My issues": "issues",
      Documents: "documents",
      Support: "support",
    }[route.name];
  const [scope, setScope] = useState("personal");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setBusy(true);
      setError("");
      setResult(null);
      const job =
        kind === "issues"
          ? service.ownIssues(page)
          : service.workflowList(
              kind,
              page,
              kind === "documents" ? scope : undefined,
            );
      job
        .then((value) => {
          if (active) {
            if (!Array.isArray(value?.items) || !Number.isFinite(value.total))
              throw new Error("Invalid record list response.");
            setResult(value);
          }
        })
        .catch((failure) => {
          if (active) setError(failure.message);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
      return () => {
        active = false;
      };
    }, [service, kind, page, scope, revision]),
  );
  const createRoute = {
    fuel: "Add fuel",
    bills: "Workshop bill",
    issues: "Report issue",
    documents: "Upload document",
    support: "New support ticket",
  }[kind];
  return (
    <Page navigation={navigation} title={labels[kind]} allowEmpty>
      <Button
        label={`Add ${kind === "documents" ? "document" : kind === "support" ? "support ticket" : kind === "issues" ? "issue" : kind === "bills" ? "workshop bill" : "fuel"}`}
        onPress={() => navigation.navigate(createRoute, { scope })}
      />
      {kind === "documents" && (
        <Select
          label="Document owner"
          value={scope}
          onChange={(value) => {
            setScope(value);
            setPage(1);
          }}
          values={[
            ["personal", "My documents"],
            ["vehicle", "Assigned truck"],
          ]}
        />
      )}
      {busy && <AppText muted>Loading records…</AppText>}
      {error && (
        <>
          <AppText color={colors.error}>{error}</AppText>
          <Button
            label="Retry"
            onPress={() => setRevision((value) => value + 1)}
          />
        </>
      )}
      {result && (
        <>
          <AppText muted>
            {result.total} records · Page {page}
          </AppText>
          {result.items.map((row) => (
            <MenuRow
              key={idOf(row)}
              title={titleOf(row, kind)}
              detail={statusOf(row, kind)}
              onPress={() =>
                navigation.navigate("Operation detail", { kind, id: idOf(row) })
              }
            />
          ))}
          {!result.items.length && (
            <AppText muted>No records in this view.</AppText>
          )}
          <Button
            label="Previous page"
            disabled={page === 1}
            onPress={() => setPage((value) => value - 1)}
          />
          <Button
            label="Next page"
            disabled={page * 30 >= result.total}
            onPress={() => setPage((value) => value + 1)}
          />
        </>
      )}
    </Page>
  );
}
export function RecordDetail({ navigation, route }) {
  const { service } = useDriverData();
  const kind = route.params?.kind || "documents";
  const id = route.params?.id;
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setBusy(true);
      setRecord(null);
      setError("");
      (kind === "issues"
        ? service.ownIssue(id)
        : service.workflowDetail(kind, id)
      )
        .then((value) => {
          if (active) setRecord(value);
        })
        .catch((failure) => {
          if (active) setError(failure.message);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
      return () => {
        active = false;
      };
    }, [service, kind, id, revision]),
  );
  return (
    <Page navigation={navigation} title="Record details" allowEmpty>
      {busy && <AppText muted>Loading…</AppText>}
      {error && (
        <>
          <AppText color={colors.error}>{error}</AppText>
          <Button
            label="Reload record"
            onPress={() => setRevision((value) => value + 1)}
          />
        </>
      )}
      {record && (
        <>
          <MenuRow
            title={titleOf(record, kind)}
            detail={statusOf(record, kind)}
          />
          {kind === "fuel" && (
            <Card>
              <AppText>
                {formatLitres(record.litres)} L · ₹{record.totalAmount} ·{" "}
                {record.fuelType} · {record.fillingType}
              </AppText>
              <AppText muted>
                {new Date(record.refuelTime).toLocaleString()}
              </AppText>
              {record.odometerReading != null && (
                <AppText>Odometer: {record.odometerReading} km</AppText>
              )}
              <FileLink url={record.receipt?.publicUrl} />
            </Card>
          )}
          {kind === "documents" && (
            <>
              <FileLink url={record.publicUrl} />
              {record.captureReview && (
                <Card>
                  <AppText>
                    {record.isVerified
                      ? "Verified"
                      : "Saved · Awaiting owner review"}
                  </AppText>
                  <AppText>
                    Detected:{" "}
                    {captureKindLabel(record.captureReview.classifiedKind)}
                  </AppText>
                  <AppText>
                    {captureWarnings(record.captureReview)
                      .filter(
                        (line) =>
                          !record.isVerified ||
                          line !== "Awaiting owner review",
                      )
                      .join(" ")}
                  </AppText>
                  <AppText muted>
                    These are suggestions from the photo. No expense or payment
                    has been created.
                  </AppText>
                </Card>
              )}
            </>
          )}
          {kind === "bills" && (
            <>
              <FileLink url={record.sourceFile?.publicUrl} />
              {record.scanStatus === "FAILED" && (
                <AppText color={colors.error}>
                  Photo stored; OCR could not read the bill. Fleet review is
                  required.
                </AppText>
              )}
              {record.fields?.map((field) => (
                <MenuRow
                  key={field.field}
                  title={field.label || field.field}
                  detail={`${field.confirmedValue ?? field.value ?? "Not read"} · ${field.status}${field.confidence != null ? ` · ${field.confidence}% confidence` : ""}`}
                />
              ))}
            </>
          )}
          {kind === "issues" && (
            <>
              <AppText>
                {record.pairingHeadline || "Truck pairing unavailable"}
              </AppText>
              {record.dispatch?.resolutionNote && (
                <AppText>{record.dispatch.resolutionNote}</AppText>
              )}
              {record.photos?.map((photo, index) => (
                <FileLink
                  key={photo.fileKey || index}
                  url={photo.url || photo.publicUrl}
                  label={`Open photo ${index + 1}`}
                />
              ))}
            </>
          )}
          {kind === "support" && (
            <>
              <AppText>{record.description}</AppText>
              {record.attachments?.map((file, index) => (
                <FileLink
                  key={file.fileKey || index}
                  url={file.url || file.publicUrl}
                  label={file.originalName || "Open attachment"}
                />
              ))}
              {record.purgedAt && (
                <AppText muted>
                  This conversation has been purged by the support retention
                  policy.
                </AppText>
              )}
              {record.messages?.map((message) => (
                <Card key={idOf(message)}>
                  <AppText weight="bold">
                    {message.author?.name || "Support"}
                  </AppText>
                  <AppText>{message.body}</AppText>
                  {message.attachments?.map((file, index) => (
                    <FileLink
                      key={file.fileKey || index}
                      url={file.url || file.publicUrl}
                      label="Open reply attachment"
                    />
                  ))}
                </Card>
              ))}
              {!record.purgedAt && (
                <Button
                  label="Reply"
                  onPress={() =>
                    navigation.navigate("Reply to support", { ticketId: id })
                  }
                />
              )}
            </>
          )}
        </>
      )}
    </Page>
  );
}
export function OperationalForm({ navigation, route }) {
  if (kindFor(route) === "fuel")
    return <FuelLogFormScreen navigation={navigation} route={route} />;
  return <OtherOperationalForm navigation={navigation} route={route} />;
}
function OtherOperationalForm({ navigation, route }) {
  const { service, data, refresh } = useDriverData();
  const { user } = useAuth();
  const kind = kindFor(route);
  const org = typeof user.orgId === "object" ? user.orgId?._id : user.orgId;
  const draftKey = `workflow:${org}:${user._id}:${kind}:${route.params?.tripId || route.params?.ticketId || route.params?.scope || ""}`;
  const [fields, setFields] = useState({
    station: "",
    litres: "",
    amountInr: "",
    fuelType: "DIESEL",
    fillingType: "PARTIAL",
    odometerReading: "",
    refuelTime: new Date().toISOString(),
    scope: route.params?.scope || "personal",
    docType: "AUTO",
    expiryDate: "",
    title: "",
    description: "",
    category: "OTHER",
    priority: "MEDIUM",
  });
  const [asset, setAsset] = useState(null);
  const [saved, setSaved] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [warning, setWarning] = useState("");
  const sending = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(draftKey)
      .then((value) => {
        if (!active) return;
        if (value) {
          const draft = JSON.parse(value);
          setSaved(draft);
          setFields(draft.fields);
          setAsset(draft.asset);
        }
        setReady(true);
      })
      .catch(() =>
        setError(
          "Saved submission could not be restored. Check your history before starting a new entry.",
        ),
      );
    return () => {
      active = false;
    };
  }, [draftKey]);
  const locked = !!saved || busy;
  const update = (key, value) => setFields((old) => ({ ...old, [key]: value }));
  async function pick(camera = false, document = false) {
    setError("");
    try {
      let result;
      if (document)
        result = await DocumentPicker.getDocumentAsync({
          type: ["image/*", "application/pdf"],
          copyToCacheDirectory: true,
        });
      else {
        if (
          camera &&
          (await ImagePicker.requestCameraPermissionsAsync()).status !==
            "granted"
        )
          throw new Error("Camera permission is required to take a photo.");
        result = await (
          camera
            ? ImagePicker.launchCameraAsync
            : ImagePicker.launchImageLibraryAsync
        )({ mediaTypes: ["images"], quality: 0.85 });
      }
      if (!result.canceled) {
        const item = result.assets[0];
        if ((item.size || item.fileSize || 0) > 10 * 1024 * 1024)
          throw new Error("Choose a file smaller than 10 MB.");
        const selected = {
          ...item,
          name: item.name || item.fileName || "photo.jpg",
        };
        setAsset(selected);
      }
    } catch (failure) {
      setError(failure.message);
    }
  }
  function payload() {
    const requestId = Crypto.randomUUID();
    if (kind === "documents") {
      if (!asset) throw new Error("Select a document file.");
      return {
        clientRequestId: requestId,
        scope: fields.scope,
        docType: fields.docType,
        ...(fields.expiryDate && { expiryDate: fields.expiryDate }),
      };
    }
    if (kind === "bills") {
      if (!asset || !data?.vehicle)
        throw new Error("Select a bill photo and link a truck.");
      return { clientRequestId: requestId, vehicleId: data.vehicle.id };
    }
    if (kind === "issues") {
      if (fields.description.trim().length < 3)
        throw new Error("Describe the issue.");
      return {
        clientIncidentId: requestId,
        type: "BREAKDOWN",
        note: fields.description.trim(),
        reportedAt: new Date().toISOString(),
      };
    }
    if (kind === "reply") {
      if (!fields.description.trim()) throw new Error("Write your reply.");
      return { clientRequestId: requestId, body: fields.description.trim() };
    }
    if (fields.title.trim().length < 5 || fields.description.trim().length < 10)
      throw new Error(
        "Enter a subject of at least 5 characters and a description of at least 10 characters.",
      );
    return {
      clientRequestId: requestId,
      subject: fields.title.trim(),
      description: fields.description.trim(),
      category: fields.category,
      priority: fields.priority,
    };
  }
  async function submit() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    setWarning("");
    try {
      const frozen = saved || {
        payload: payload(),
        fields,
        asset: asset
          ? { uri: asset.uri, name: asset.name, mimeType: asset.mimeType }
          : null,
      };
      await AsyncStorage.setItem(draftKey, JSON.stringify(frozen));
      setSaved(frozen);
      const path =
        kind === "issues"
          ? "incident"
          : kind === "reply"
            ? `support/${route.params.ticketId}/messages`
            : kind;
      const response = await service.uploadWorkflow(
        path,
        frozen.payload,
        asset,
        (event) =>
          setProgress(
            event.total ? Math.round((event.loaded / event.total) * 100) : null,
          ),
      );
      setDone(kind === "issues" ? response : response.record);
      setWarning(response.warning || "");
      await AsyncStorage.removeItem(draftKey).catch(() =>
        setWarning(
          "Saved on the server. Local draft cleanup failed; check history before creating another entry.",
        ),
      );
      await refresh().catch(() =>
        setWarning(
          "Saved on the server. Refresh your history to see the entry.",
        ),
      );
    } catch (failure) {
      setError(
        `${failure.message} Retry keeps the same submission ID. Check history before starting another entry.`,
      );
    } finally {
      sending.current = false;
      setBusy(false);
      setProgress(null);
    }
  }
  const fileFirst = ["fuel", "bills", "documents"].includes(kind);
  const attachment = (
    <AttachmentPicker
      title={
        { fuel: "Fuel receipt", bills: "Workshop bill", documents: "Document" }[
          kind
        ] || "Attachment"
      }
      hint={
        {
          fuel: "Take a clear photo of the pump bill or receipt.",
          bills:
            "The original workshop bill. OCR proposes values for your fleet to review.",
          documents: "A clear photo or PDF of the original document.",
        }[kind] || "Optional photo or PDF."
      }
      asset={asset}
      locked={!!saved}
      disabled={busy}
      onCamera={() => pick(true)}
      onGallery={() => pick(false)}
      onFile={() => pick(false, true)}
      onRemove={() => setAsset(null)}
    />
  );
  const text = (key, label, options = {}) => (
    <TextField
      key={key}
      label={label}
      accessibilityLabel={label}
      value={fields[key]}
      onChangeText={(value) => update(key, value)}
      editable={!locked}
      {...options}
    />
  );
  function newEntry() {
    const reset = async () => {
      await AsyncStorage.removeItem(draftKey);
      setSaved(null);
      setDone(null);
      setReady(true);
      setError("");
      setAsset(null);
    };
    const message =
      "Check history first. A timed-out submission may already have been saved.";
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-undef
      if (window.confirm(message))
        reset().catch((failure) => setError(failure.message));
    } else
      Alert.alert("Start a new entry?", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start new entry",
          onPress: () => reset().catch((failure) => setError(failure.message)),
        },
      ]);
  }

  return (
    <Page navigation={navigation} title={route.name} allowEmpty>
      {done ? (
        <>
          <Card>
            <AppText variant="h2">Saved on the server</AppText>
            <AppText>
              {kind === "bills"
                ? `Bill photo stored. OCR status: ${done.scanStatus}. Extracted values need fleet review.`
                : kind === "documents" && done.captureReview
                  ? `Photo saved as ${captureKindLabel(done.captureReview.classifiedKind)}. Awaiting owner review.`
                  : "Your entry was confirmed by the server."}
            </AppText>
            {kind === "documents" &&
              done.captureReview &&
              captureWarnings(done.captureReview).map((line) => (
                <AppText key={line} muted>
                  {line}
                </AppText>
              ))}
            {warning && <AppText color={colors.error}>{warning}</AppText>}
          </Card>
          <Button label="Done" onPress={() => navigation.goBack()} />
        </>
      ) : (
        <>
          {!ready ? (
            <AppText muted>Restoring submission…</AppText>
          ) : (
            <>
              {saved && (
                <AppText muted>
                  Retrying your saved submission. Its content stays fixed to
                  prevent duplicate entries.
                </AppText>
              )}
              {fileFirst && attachment}
              {warning ? <AppText muted>{warning}</AppText> : null}
              {kind === "documents" && (
                <>
                  <Select
                    label="Document owner"
                    value={fields.scope}
                    onChange={(value) => {
                      update("scope", value);
                      update("docType", "AUTO");
                    }}
                    disabled={locked}
                    values={[
                      ["personal", "My document"],
                      ["vehicle", "Assigned truck"],
                    ]}
                  />
                  <Select
                    label="Document type"
                    value={fields.docType}
                    onChange={(value) => update("docType", value)}
                    disabled={locked}
                    values={[
                      ["AUTO", "Detect from photo"],
                      ...(fields.scope === "personal"
                        ? ["DRIVER_LICENSE", "PAN", "AADHAAR"]
                        : ["RC", "PUC", "FITNESS_CERTIFICATE"]
                      ).map((value) => [value, value.replaceAll("_", " ")]),
                    ]}
                  />
                  <DateField
                    label="Expiry date (optional)"
                    includeTime={false}
                    value={fields.expiryDate}
                    onChange={(value) => update("expiryDate", value)}
                    disabled={locked}
                  />
                </>
              )}
              {kind === "support" && (
                <>
                  {text("title", "Subject")}
                  {text("description", "Describe the problem", {
                    multiline: true,
                  })}
                  <Select
                    label="Category"
                    value={fields.category}
                    onChange={(value) => update("category", value)}
                    disabled={locked}
                    values={[
                      "FUEL",
                      "TRIPS",
                      "VEHICLES",
                      "DRIVERS",
                      "ACCOUNT_ACCESS",
                      "DATA_ISSUE",
                      "OTHER",
                    ].map((value) => [value, value.replaceAll("_", " ")])}
                  />
                </>
              )}
              {(kind === "issues" || kind === "reply") &&
                text(
                  "description",
                  kind === "reply" ? "Your reply" : "Describe the issue",
                  { multiline: true },
                )}
              {!fileFirst && attachment}
              {progress != null && <AppText>Uploading: {progress}%</AppText>}
              <Button
                label={
                  saved
                    ? "Retry same submission"
                    : kind === "bills"
                      ? "Upload bill for OCR"
                      : "Save entry"
                }
                loading={busy}
                onPress={submit}
              />
            </>
          )}
          {error && (
            <AppText accessibilityRole="alert" color={colors.error}>
              {error}
            </AppText>
          )}
          {(saved || !ready) && (
            <Button
              label="Start a separate entry"
              variant="secondary"
              disabled={busy}
              onPress={newEntry}
            />
          )}
        </>
      )}
    </Page>
  );
}
