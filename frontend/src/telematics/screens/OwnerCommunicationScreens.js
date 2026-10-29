import React, { useCallback, useEffect, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image, Linking, Platform, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import {
  AppText,
  Button,
  Card,
  TextField,
  Badge,
  colors,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useTelematicsApi } from "../context/TelematicsApiContext";
import { useManagerData } from "../context/ManagerDataContext";
import { Choice, RequestState } from "../components/FormControls";
import {
  OwnerScreen as Screen,
  OwnerGroupRow,
  IconAction,
} from "../components/OwnerReportView";
import useOwnerRequest from "../hooks/useOwnerRequest";
import useOwnerWrite from "../hooks/useOwnerWrite";

function useCommunicationScope() {
  const { user } = useAuth();
  const service = useTelematicsApi();
  const manager = useManagerData();
  const branch =
    manager?.branchId && manager.branchId !== "all"
      ? manager.branchId
      : undefined;
  return {
    user,
    service,
    branch,
    key: `${user._id}:${typeof user.orgId === "object" ? user.orgId._id : user.orgId}:${branch || "all"}`,
  };
}
export function Messages({ navigation }) {
  const { user, service, branch, key } = useCommunicationScope();
  const [page, setPage] = useState(1);
  const request = useOwnerRequest(
    `${key}:conversations:${page}`,
    () => service.conversations(branch, page),
    15000,
  );
  useEffect(() => setPage(1), [key]);
  return (
    <Screen
      navigation={navigation}
      title="Messages"
      subtitle="Your team, one conversation away."
      action={
        user.role === "OWNER" ? (
          <IconAction
            icon="add"
            label="New conversation or broadcast"
            onPress={() => navigation.navigate("New conversation")}
          />
        ) : null
      }
    >
      <RequestState request={request} />
      {request.data && (
        <>
          {!request.data.items.length && (
            <Card padding={28} style={{ alignItems: "center", gap: 14 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: colors.blueTint,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={30}
                  color={colors.primary}
                />
              </View>
              <AppText variant="h3" center>
                Keep your team in sync
              </AppText>
              <AppText variant="small" muted center>
                {user.role === "OWNER"
                  ? "Start a direct conversation, create a group or send an update to your drivers."
                  : "Conversations with your owner and crew will appear here."}
              </AppText>
              {user.role === "OWNER" && (
                <Button
                  label="Start a conversation"
                  size="sm"
                  icon="add"
                  onPress={() => navigation.navigate("New conversation")}
                />
              )}
            </Card>
          )}
          {!!request.data.items.length && (
            <Card padding={0}>
              {request.data.items.map((thread, index) => (
                <OwnerGroupRow
                  key={thread._id}
                  title={thread.title}
                  subtitle={`${thread.type === "DIRECT" ? "Direct message" : thread.type === "BROADCAST" ? "Broadcast" : "Group"} · ${thread.members.length} people`}
                  icon={
                    thread.type === "GROUP"
                      ? "people-outline"
                      : thread.type === "BROADCAST"
                        ? "megaphone-outline"
                        : "chatbubble-outline"
                  }
                  last={index === request.data.items.length - 1}
                  right={
                    thread.state === "SCHEDULED" ? (
                      <Badge tone="pending" label="Scheduled" />
                    ) : undefined
                  }
                  onPress={() =>
                    navigation.navigate("Conversation", { id: thread._id })
                  }
                />
              ))}
            </Card>
          )}
          {request.data.total > 30 && (
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
export function NewConversation({ navigation, route }) {
  const { service, branch, key } = useCommunicationScope();
  const [type, setType] = useState(route.params?.id ? "GROUP" : "DIRECT"),
    [title, setTitle] = useState(""),
    [members, setMembers] = useState([]),
    [onDuty, setOnDuty] = useState(false),
    [text, setText] = useState(""),
    [scheduledAt, setScheduledAt] = useState(""),
    [membership, setMembership] = useState("MANUAL");
  const audience = useOwnerRequest(`${key}:audience:${onDuty}`, () =>
    service.ownerAudience({ driverOnly: true, onDuty }, branch),
  );
  const editing = route.params?.id;
  const existing = useOwnerRequest(`${key}:members:${editing || "new"}`, () =>
    editing
      ? service.conversationMessages(editing, {}, branch)
      : Promise.resolve(null),
  );
  const write = useOwnerWrite(`${key}:new-conversation:${editing || "new"}`);
  useEffect(() => {
    if (existing.data?.thread) {
      setType("GROUP");
      setTitle(existing.data.thread.title);
      setMembers(
        existing.data.thread.members.filter(
          (id) => String(id) !== String(existing.data.thread.createdBy),
        ),
      );
    }
  }, [existing.data]);
  useEffect(() => {
    setMembers([]);
  }, [key, onDuty, type]);
  function toggle(id) {
    setMembers((old) =>
      type === "DIRECT"
        ? [id]
        : old.includes(id)
          ? old.filter((v) => v !== id)
          : [...old, id],
    );
  }
  async function create() {
    if (editing) {
      const result = await write.execute(
        { members, expectedUpdatedAt: existing.data.thread.updatedAt },
        (body) => service.updateConversationMembers(editing, body, branch),
      );
      if (result) navigation.replace("Conversation", { id: editing });
      return;
    }
    const result = await write.execute(
      {
        type,
        title,
        members,
        ...(type === "GROUP" && { membership }),
        ...(type === "BROADCAST" && {
          text,
          ...(scheduledAt && { scheduledAt }),
        }),
      },
      (body) => service.createConversation(body, branch),
    );
    if (result) navigation.replace("Conversation", { id: result.record._id });
  }
  const locked = write.busy || !!write.draft;
  return (
    <Screen
      navigation={navigation}
      title={editing ? "Group members" : "New conversation"}
    >
      <RequestState request={existing} />
      <Choice
        label="Conversation type"
        value={type}
        onChange={setType}
        disabled={locked || !!editing}
        options={[
          ["DIRECT", "Direct message"],
          ["GROUP", "Manual group"],
          ["BROADCAST", "Broadcast"],
        ]}
      />
      {type === "GROUP" && (
        <Choice
          label="Group membership"
          value={membership}
          onChange={setMembership}
          disabled={locked || !!editing}
          options={[
            ["MANUAL", "Manual selection"],
            ["BRANCH", "Automatic branch drivers"],
            ["ON_DUTY", "Automatic ongoing duty sessions"],
          ]}
        />
      )}
      <TextField
        label="Title"
        value={title}
        onChangeText={setTitle}
        editable={!locked}
        maxLength={150}
      />
      <Choice
        label="Audience"
        value={String(onDuty)}
        onChange={(value) => setOnDuty(value === "true")}
        disabled={locked}
        options={[
          ["false", "Drivers in selected scope"],
          ["true", "Ongoing duty sessions"],
        ]}
      />
      <RequestState request={audience} />
      {audience.data && (
        <>
          <AppText>{audience.data.note}</AppText>
          <AppText weight="bold">
            {members.length} selected recipients. The send uses this fixed
            selection.
          </AppText>
          {type !== "DIRECT" && (
            <Button
              label="Select this audience"
              variant="secondary"
              disabled={locked}
              onPress={() => setMembers(audience.data.items.map((v) => v._id))}
            />
          )}
          {audience.data.items.map((person) => (
            <Button
              key={person._id}
              label={`${members.includes(person._id) ? "✓ " : ""}${person.firstName} ${person.lastName || ""}`}
              variant="secondary"
              disabled={locked}
              onPress={() => toggle(person._id)}
            />
          ))}
        </>
      )}
      {type === "BROADCAST" && (
        <>
          <TextField
            label="Broadcast message"
            value={text}
            onChangeText={setText}
            multiline
            editable={!locked}
            maxLength={5000}
          />
          <TextField
            label="Schedule (ISO timestamp with timezone; blank sends next minute)"
            value={scheduledAt}
            onChangeText={setScheduledAt}
            editable={!locked}
          />
          <AppText muted>
            Recipients may read and acknowledge a broadcast. Replies belong in a
            direct conversation.
          </AppText>
        </>
      )}
      <Button
        label={
          write.draft
            ? "Retry saved conversation"
            : "Create with selected recipients"
        }
        disabled={
          !write.ready ||
          (editing && !existing.data) ||
          (!write.draft &&
            (!title.trim() ||
              (!(type === "GROUP" && membership !== "MANUAL") &&
                !members.length) ||
              (type === "BROADCAST" && !text.trim())))
        }
        loading={write.busy}
        onPress={create}
      />
      {write.error ? (
        <AppText color={colors.error}>{write.error}</AppText>
      ) : null}
    </Screen>
  );
}
function VoicePlayer({ url }) {
  const [source, setSource] = useState(url);
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  useEffect(() => {
    if (!status.playing) setSource(url);
  }, [url, status.playing]);
  return (
    <>
      <Button
        label="Play voice note"
        variant="secondary"
        onPress={() => player.play()}
      />
      <Button
        label="Pause voice note"
        variant="ghost"
        onPress={() => player.pause()}
      />
    </>
  );
}
function CardMessage({ item, user, onExplain }) {
  const [explaining, setExplaining] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const canExplain = user.role === "DRIVER" && item.card?.escalationId && !done;
  async function submit() {
    if (!note.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await onExplain(item.card.escalationId, note.trim());
      setDone(true);
      setExplaining(false);
    } catch (failure) {
      setError(failure.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <>
      <AppText variant="h3">{item.card.title}</AppText>
      <AppText>{item.card.detail}</AppText>
      {done && (
        <AppText variant="caption" style={{ color: colors.success }}>
          Your explanation was submitted.
        </AppText>
      )}
      {canExplain && !explaining && (
        <Button
          label="Submit explanation"
          variant="secondary"
          onPress={() => setExplaining(true)}
        />
      )}
      {canExplain && explaining && (
        <>
          <TextField
            label="Your explanation"
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Describe what happened in your own words."
          />
          {!!error && (
            <AppText style={{ color: colors.error }}>{error}</AppText>
          )}
          <Button
            label={submitting ? "Submitting…" : "Submit"}
            disabled={submitting || !note.trim()}
            onPress={submit}
          />
          <Button
            label="Cancel"
            variant="secondary"
            disabled={submitting}
            onPress={() => {
              setExplaining(false);
              setNote("");
              setError("");
            }}
          />
        </>
      )}
    </>
  );
}
function MessageItem({ item, user, acknowledge, onExplain }) {
  const sent = String(item.senderId) === String(user._id);
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  return (
    <Card
      variant={sent ? "tinted" : "surface"}
      style={{
        gap: 10,
        maxWidth: "94%",
        alignSelf: sent ? "flex-end" : "flex-start",
        minWidth: "60%",
      }}
    >
      <AppText variant="caption" muted>
        {sent ? "You" : "Fleet colleague"} ·{" "}
        {new Date(item.createdAt).toLocaleString()}
      </AppText>
      {item.text ? <AppText>{item.text}</AppText> : null}
      {item.kind === "PHOTO" && item.mediaUrl && (
        <Image
          source={{ uri: item.mediaUrl }}
          style={{ width: "100%", height: 240 }}
          resizeMode="contain"
          accessibilityLabel="Message photo"
        />
      )}
      {item.kind === "VOICE" && item.mediaUrl && (
        <VoicePlayer url={item.mediaUrl} />
      )}
      {item.kind === "LOCATION" && (
        <>
          <AppText>
            {item.location.lat}, {item.location.lng}
          </AppText>
          <Button
            label="Open shared location"
            variant="secondary"
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${item.location.lat},${item.location.lng}`,
              ).catch(() => {})
            }
          />
        </>
      )}
      {item.kind === "CARD" && (
        <CardMessage item={item} user={user} onExplain={onExplain} />
      )}
      {sent ? (
        <>
          <AppText variant="caption">
            {item.recipients.filter((r) => r.deliveredAt).length}/
            {item.recipients.length} fetched ·{" "}
            {item.recipients.filter((r) => r.readAt).length} read ·{" "}
            {item.recipients.filter((r) => r.acknowledgedAt).length}{" "}
            acknowledged ·{" "}
            {item.recipients.filter((r) => r.skippedReason).length} skipped
          </AppText>
          <Button
            size="sm"
            fullWidth={false}
            label={receiptsOpen ? "Hide delivery details" : "Delivery details"}
            variant="ghost"
            onPress={() => setReceiptsOpen(!receiptsOpen)}
          />
          {receiptsOpen &&
            item.recipients.map((r) => (
              <AppText key={String(r.userId)} variant="caption" muted>
                {r.label || "Recipient"}:{" "}
                {r.skippedReason
                  ? "skipped: no longer active in this scope"
                  : r.acknowledgedAt
                    ? "acknowledged"
                    : r.readAt
                      ? "read"
                      : r.deliveredAt
                        ? "fetched"
                        : "waiting"}
              </AppText>
            ))}
        </>
      ) : (
        <Button
          label={
            item.recipients[0]?.acknowledgedAt
              ? "Acknowledged"
              : "Acknowledge message"
          }
          disabled={!!item.recipients[0]?.acknowledgedAt}
          variant="secondary"
          onPress={() => acknowledge(item._id)}
        />
      )}
    </Card>
  );
}
function AttachmentAction({ icon, label, text, disabled, onPress }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <IconAction
        icon={icon}
        label={label}
        disabled={disabled}
        onPress={onPress}
      />
      <AppText variant="caption" muted>
        {text}
      </AppText>
    </View>
  );
}
export function Conversation({ navigation, route }) {
  const { user, service, branch, key } = useCommunicationScope();
  const id = route.params.id;
  const [before, setBefore] = useState(null),
    [text, setText] = useState(""),
    [asset, setAsset] = useState(null),
    [kind, setKind] = useState("TEXT"),
    [error, setError] = useState("");
  const request = useOwnerRequest(
    `${key}:conversation:${id}:${before || "latest"}`,
    () =>
      service.conversationMessages(id, { ...(before && { before }) }, branch),
    15000,
  );
  const write = useOwnerWrite(`${key}:message:${id}`);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const liveKey = useRef(`${key}:${id}`);
  liveKey.current = `${key}:${id}`;
  useEffect(() => {
    setBefore(null);
    setText("");
    setAsset(null);
    setError("");
  }, [key, id]);
  useFocusEffect(
    useCallback(
      () => () => {
        if (recorder.isRecording) recorder.stop().catch(() => {});
        setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      },
      [recorder, key, id],
    ),
  );
  const thread = request.data?.thread;
  // Mark read only after the fetched messages have been rendered in this active screen.
  useEffect(() => {
    let active = true;
    const rows =
      request.data?.items?.filter(
        (m) =>
          String(m.senderId) !== String(user._id) &&
          !m.recipients[0]?.readAt &&
          !m.recipients[0]?.skippedReason,
      ) || [];
    Promise.all(
      rows.map((m) => service.messageReceipt(id, m._id, "READ", branch)),
    ).catch((failure) => {
      if (active) setError(failure.message);
    });
    return () => {
      active = false;
    };
  }, [request.data, user._id, service, id, branch]);
  async function pickPhoto() {
    const selectedKey = `${key}:${id}`;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Photo-library permission is required to attach a photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && liveKey.current === selectedKey) {
        const photo = result.assets[0];
        setAsset({
          uri: photo.uri,
          mimeType: photo.mimeType || "image/jpeg",
          name: photo.fileName || "message.jpg",
        });
        setKind("PHOTO");
      }
    } catch (failure) {
      setError(failure.message);
    }
  }
  async function record() {
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        if (recorder.uri) {
          setAsset({
            uri: recorder.uri,
            name: Platform.OS === "web" ? "voice.webm" : "voice.m4a",
            mimeType: Platform.OS === "web" ? "audio/webm" : "audio/mp4",
          });
          setKind("VOICE");
        }
      } else {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          setError("Microphone permission is required to record a voice note.");
          return;
        }
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
    } catch (failure) {
      setError(failure.message);
    }
  }
  async function send(extra = {}) {
    const result = await write.execute(
      { kind, text, ...(asset && { asset }), ...extra },
      ({ asset: attachment, ...body }) =>
        service.sendMessage(id, body, attachment, branch),
    );
    if (result) {
      setText("");
      setAsset(null);
      setKind("TEXT");
      setBefore(null);
      request.reload();
    }
  }
  async function location() {
    const selectedKey = `${key}:${id}`;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError(
          "Location permission is required to share your current position.",
        );
        return;
      }
      const fix = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (liveKey.current === selectedKey)
        await send({
          kind: "LOCATION",
          location: { lat: fix.coords.latitude, lng: fix.coords.longitude },
        });
    } catch (failure) {
      setError(failure.message);
    }
  }
  const writable =
    thread && thread.type !== "BROADCAST" && thread.state === "ACTIVE";
  const locked = write.busy || !!write.draft;
  return (
    <Screen navigation={navigation} title={thread?.title || "Conversation"}>
      <RequestState request={request} />
      {thread && (
        <>
          {thread.type === "GROUP" &&
            String(thread.createdBy) === String(user._id) &&
            (!thread.audience?.mode || thread.audience.mode === "MANUAL") && (
              <Button
                label="Manage group recipients"
                variant="secondary"
                onPress={() => navigation.navigate("New conversation", { id })}
              />
            )}
          <AppText>
            {
              {
                DIRECT: "Direct conversation",
                GROUP: "Group",
                BROADCAST: "Broadcast",
              }[thread.type]
            }{" "}
            ·{" "}
            {
              {
                ACTIVE: "Active",
                SCHEDULED: "Scheduled",
                SENT: "Sent",
                CANCELLED: "Cancelled",
              }[thread.state]
            }{" "}
            · {thread.audience?.memberCount ?? thread.members.length - 1} other
            participants
          </AppText>
          {thread.state === "SCHEDULED" &&
            String(thread.createdBy) === String(user._id) && (
              <>
                <AppText>{thread.scheduledText}</AppText>
                <AppText>{thread.scheduledAt}</AppText>
                <Button
                  label="Cancel scheduled broadcast"
                  variant="danger"
                  onPress={async () => {
                    try {
                      await service.cancelBroadcast(id, branch);
                      request.reload();
                    } catch (failure) {
                      setError(failure.message);
                    }
                  }}
                />
              </>
            )}
          {[...request.data.items].reverse().map((item) => (
            <MessageItem
              key={item._id}
              item={item}
              user={user}
              acknowledge={async (messageId) => {
                try {
                  await service.messageReceipt(
                    id,
                    messageId,
                    "ACKNOWLEDGE",
                    branch,
                  );
                  request.reload();
                } catch (failure) {
                  setError(failure.message);
                }
              }}
              onExplain={async (escalationId, note) => {
                await service.driverExplain(
                  escalationId,
                  { clientRequestId: Crypto.randomUUID(), note },
                  branch,
                );
              }}
            />
          ))}
          {request.data.hasMore && (
            <Button
              label="Older messages"
              disabled={!request.data.hasMore}
              variant="secondary"
              onPress={() => setBefore(request.data.before)}
            />
          )}
          {before && (
            <Button
              label="Latest messages"
              variant="secondary"
              onPress={() => setBefore(null)}
            />
          )}
          {writable && (
            <>
              <TextField
                label="Message"
                value={text}
                onChangeText={setText}
                multiline
                editable={!locked}
                maxLength={5000}
              />
              {asset && (
                <AppText>
                  {kind}: {asset.name}
                </AppText>
              )}
              <Button
                label={write.draft ? "Retry saved message" : "Send message"}
                loading={write.busy}
                disabled={
                  !write.ready ||
                  (!write.draft && !text.trim() && !asset) ||
                  recorderState.isRecording
                }
                onPress={() => send()}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <AttachmentAction
                  icon="image-outline"
                  label="Attach photo"
                  text="Photo"
                  disabled={locked || recorderState.isRecording}
                  onPress={pickPhoto}
                />
                <AttachmentAction
                  icon={
                    recorderState.isRecording
                      ? "stop-circle-outline"
                      : "mic-outline"
                  }
                  label={
                    recorderState.isRecording
                      ? "Stop and attach voice note"
                      : "Record voice note"
                  }
                  text={recorderState.isRecording ? "Stop" : "Voice"}
                  disabled={locked}
                  onPress={record}
                />
                <AttachmentAction
                  icon="location-outline"
                  label="Share current location"
                  text="Location"
                  disabled={locked || !!asset || recorderState.isRecording}
                  onPress={location}
                />
                <AttachmentAction
                  icon="document-text-outline"
                  label="Send structured update"
                  text="Update"
                  disabled={
                    locked ||
                    !text.trim() ||
                    !!asset ||
                    recorderState.isRecording
                  }
                  onPress={() =>
                    send({
                      kind: "CARD",
                      card: { title: "Fleet update", detail: text },
                    })
                  }
                />
              </View>
              {asset && (
                <Button
                  label="Remove attachment"
                  variant="ghost"
                  disabled={locked}
                  onPress={() => {
                    setAsset(null);
                    setKind("TEXT");
                  }}
                />
              )}
            </>
          )}
        </>
      )}
      {write.error || error ? (
        <AppText accessibilityRole="alert" color={colors.error}>
          {write.error || error}
        </AppText>
      ) : null}
    </Screen>
  );
}
