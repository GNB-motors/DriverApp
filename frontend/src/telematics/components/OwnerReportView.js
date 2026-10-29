import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  AppText,
  Card,
  Button,
  Badge,
  BottomSheet,
  TextField,
  SegmentedControl,
  BackHeader,
  SectionHeader,
  colors,
  spacing,
  radius,
} from "../../components/ui";
import { Choice } from "./FormControls";
import {
  istDay,
  yesterday,
  shiftDay,
  validBusinessDay,
  displayMetric,
  sectionNames,
} from "../services/ownerReport";
import {
  reportMeta,
  friendlyLabel,
  metricValue,
  shortNumber,
  sectionState,
  groupSections,
} from "../services/ownerPresentation";

export function OwnerScreen({ navigation, title, subtitle, action, children }) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const back = navigation.getState().type === "stack" && navigation.canGoBack();
  return (
    <View style={s.screen}>
      {focused && <StatusBar style="dark" />}
      <BackHeader
        title={title}
        subtitle={subtitle}
        onBack={back ? () => navigation.goBack() : undefined}
        right={action}
      />
      <KeyboardAvoidingView
        style={s.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            s.detailBody,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
export function IconAction({ icon, label, onPress, disabled, light = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.iconAction,
        light && s.iconLight,
        (disabled || pressed) && s.dim,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={light ? colors.white : colors.text}
      />
    </Pressable>
  );
}
export function OwnerGroupRow({
  title,
  subtitle,
  icon,
  right,
  onPress,
  last = false,
  expanded,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={expanded == null ? undefined : { expanded }}
      onPress={onPress}
      style={({ pressed }) => [
        s.groupRow,
        !last && s.rowBorder,
        pressed && s.dim,
      ]}
    >
      {icon && (
        <View style={s.rowIcon}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
      )}
      <View style={s.grow}>
        <AppText variant="small" weight="semibold">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" muted style={s.rowSub}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      <Ionicons
        name={
          expanded == null
            ? "chevron-forward"
            : expanded
              ? "chevron-up"
              : "chevron-down"
        }
        size={16}
        color={colors.fog300}
      />
    </Pressable>
  );
}
function DateSelector({ date, onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(date);
  useEffect(() => setDraft(date), [date, open]);
  const title =
    date === yesterday()
      ? "Yesterday"
      : date === istDay()
        ? "Today"
        : new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            timeZone: "Asia/Kolkata",
          });
  return (
    <>
      <View style={s.dateRow}>
        <View>
          <AppText variant="caption" muted>
            DAILY REPORT
          </AppText>
          <AppText variant="small" weight="semibold">
            {new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "Asia/Kolkata",
            })}{" "}
            <AppText variant="caption" muted>
              · IST
            </AppText>
          </AppText>
        </View>
        <View style={s.dateActions}>
          <IconAction
            icon="chevron-back"
            label="Previous day"
            onPress={() => onChange(shiftDay(date, -1))}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose report date"
            onPress={() => setOpen(true)}
            style={s.dateChip}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={colors.primary}
            />
            <AppText variant="small" weight="semibold" color={colors.primary}>
              {title}
            </AppText>
          </Pressable>
          <IconAction
            icon="chevron-forward"
            label="Next day"
            disabled={date >= istDay()}
            onPress={() => onChange(shiftDay(date, 1))}
          />
        </View>
      </View>
      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <View style={s.sheetHeading}>
          <AppText variant="h2">Report date</AppText>
          <IconAction
            icon="close"
            label="Close date picker"
            onPress={() => setOpen(false)}
          />
        </View>
        <AppText variant="small" muted>
          Choose a business day in Indian Standard Time.
        </AppText>
        <SegmentedControl
          variant="pill"
          value={draft}
          options={[
            { label: "Yesterday", value: yesterday() },
            { label: "Today", value: istDay() },
          ]}
          onChange={setDraft}
        />
        {Platform.OS === "web" ? (
          <TextField
            label="Report date (YYYY-MM-DD)"
            value={draft}
            onChangeText={setDraft}
            maxLength={10}
          />
        ) : (
          <DateTimePicker
            value={
              new Date(
                `${validBusinessDay(draft) ? draft : date}T12:00:00+05:30`,
              )
            }
            maximumDate={new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            timeZoneName="Asia/Kolkata"
            themeVariant="light"
            onChange={(event, value) => {
              if (event.type !== "dismissed" && value) setDraft(istDay(value));
            }}
          />
        )}
        <Button
          label="Show report"
          disabled={!validBusinessDay(draft) || draft > istDay()}
          onPress={() => {
            onChange(draft);
            setOpen(false);
          }}
        />
      </BottomSheet>
    </>
  );
}
function Highlight({ label, icon, value, unit, caption, onPress }) {
  return (
    <Card
      padding={14}
      onPress={onPress}
      accessibilityLabel={`${label}: ${value == null ? "unavailable" : shortNumber(value, unit === "INR")}`}
      style={s.highlight}
    >
      <View style={s.highlightTop}>
        <Ionicons name={icon} size={17} color={colors.primary} />
        <Ionicons name="arrow-forward" size={15} color={colors.fog300} />
      </View>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText
        mono
        weight="medium"
        style={s.highlightValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {shortNumber(value, unit === "INR")}
        {value != null && unit === "km" ? (
          <AppText variant="small" mono muted>
            {" "}
            km
          </AppText>
        ) : null}
      </AppText>
      <AppText variant="caption" muted>
        {value == null ? "Data unavailable" : caption}
      </AppText>
    </Card>
  );
}
function FleetHero({ section, onOpen }) {
  const moving = metricValue(section, "moving"),
    total = metricValue(section, "total");
  const observation = section?.sources?.find(
    (source) => source.observedAt,
  )?.observedAt;
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel="Fleet right now"
    >
      <LinearGradient
        colors={colors.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={s.spread}>
          <AppText
            variant="label"
            color={colors.onPrimaryMuted}
            style={s.heroEyebrow}
          >
            Fleet right now
          </AppText>
          <View style={s.heroTag}>
            <Ionicons name="radio-outline" size={12} color={colors.white} />
            <AppText variant="caption" color={colors.white}>
              Truck telemetry
            </AppText>
          </View>
        </View>
        <View style={s.heroMain}>
          <View style={s.grow}>
            <View style={s.heroNumbers}>
              <AppText mono color={colors.white} style={s.heroValue}>
                {shortNumber(moving)}
              </AppText>
              <AppText mono color={colors.onPrimaryMuted} style={s.heroTotal}>
                / {shortNumber(total)}
              </AppText>
            </View>
            <AppText variant="small" color={colors.onPrimaryMuted}>
              trucks moving
            </AppText>
          </View>
          <View style={s.heroArrow}>
            <Ionicons name="arrow-forward" size={21} color={colors.white} />
          </View>
        </View>
        <View style={s.heroStats}>
          {[
            ["parked", "Parked"],
            ["idling", "Idling"],
            ["offline", "Offline"],
            ["unknown", "Unknown"],
          ].map(([key, label]) => (
            <View style={s.heroStat} key={key}>
              <AppText
                variant="small"
                mono
                weight="medium"
                color={colors.white}
              >
                {shortNumber(metricValue(section, key))}
              </AppText>
              <AppText variant="caption" color={colors.onPrimaryMuted}>
                {label}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" color={colors.onPrimaryMuted}>
          {observation
            ? `Latest observation ${new Date(observation).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST`
            : "Truck observation time unavailable"}
        </AppText>
      </LinearGradient>
    </Pressable>
  );
}
function ReportRow({ name, section, onOpen, last }) {
  const meta = reportMeta[name] || [
    sectionNames[name] || friendlyLabel(name),
    "analytics-outline",
    "count",
  ];
  const metric = section?.metrics?.[meta[2]];
  const state = sectionState(section);
  return (
    <OwnerGroupRow
      title={meta[0]}
      icon={meta[1]}
      subtitle={state.label}
      last={last}
      onPress={onOpen}
      right={
        <AppText mono variant="small" weight="medium" style={s.rowAmount}>
          {metricValue(section, meta[2]) == null
            ? "—"
            : shortNumber(metric.value, metric.unit === "INR")}
          {metricValue(section, meta[2]) != null && metric.unit === "L"
            ? " L"
            : ""}
        </AppText>
      }
    />
  );
}
export function OwnerReportDashboard({
  navigation,
  request,
  date,
  onDateChange,
  branchId,
  branches = [],
  onBranchChange,
  user,
  language,
  onLanguageChange,
  speaking,
  onListen,
  onStop,
  speechError,
}) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [tab, setTab] = useState("Summary");
  const [branchOpen, setBranchOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const sections = request.data?.sections || {};
  const detail = (name) =>
    navigation.navigate("Owner report section", { name, date });
  const group = groupSections(sections, tab);
  const branchName =
    branches.find((b) => b.id === branchId)?.name || "All branches";
  const distanceSection = sections.distance ? "distance" : "trips";
  const highlights = [
    [
      "trips",
      "count",
      "Completed trips",
      "navigate-outline",
      "records",
      "Marked complete",
    ],
    [
      distanceSection,
      sections.distance ? "observedKm" : "ladenKm",
      sections.distance ? "Observed distance" : "Laden trip distance",
      "speedometer-outline",
      "km",
      sections.distance ? "Recorded intervals" : "Of completed trips",
    ],
    [
      "diesel",
      "amount",
      "Diesel purchases",
      "water-outline",
      "INR",
      "Recorded, not paid",
    ],
    [
      "expenses",
      "amount",
      "Driver bills",
      "receipt-outline",
      "INR",
      "Submitted for review",
    ],
  ];
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {focused && <StatusBar style="dark" />}
      <ScrollView
        key={tab}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.dashboard,
          { paddingBottom: spacing.xl + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={request.loading && !!request.data}
            onRefresh={request.reload}
            tintColor={colors.primary}
          />
        }
      >
        <View style={s.spread}>
          <View style={s.grow}>
            <AppText variant="caption" color={colors.primary} weight="semibold">
              {user?.firstName
                ? `${user.firstName}’s workspace`
                : "OWNER WORKSPACE"}
            </AppText>
            <AppText variant="h1" style={s.title}>
              Aaj ka hisaab
            </AppText>
          </View>
          <IconAction
            icon="headset-outline"
            label="Listen to report"
            onPress={() => setAudioOpen(true)}
          />
          <IconAction
            icon="settings-outline"
            label="Morning report settings"
            onPress={() => navigation.navigate("Report settings")}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose branch"
          onPress={() => setBranchOpen(true)}
          style={s.branchChip}
        >
          <Ionicons
            name="business-outline"
            size={14}
            color={colors.textMuted}
          />
          <AppText
            variant="small"
            weight="medium"
            style={s.grow}
            numberOfLines={1}
          >
            {branchName}
          </AppText>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>
        <DateSelector date={date} onChange={onDateChange} />
        <SegmentedControl
          variant="pill"
          options={["Summary", "Money", "Work", "People"]}
          value={tab}
          onChange={setTab}
        />
        {request.error && (
          <Card variant="outline" style={s.block}>
            <AppText variant="small" weight="semibold">
              {request.data
                ? "Could not refresh this report"
                : "Your report could not load"}
            </AppText>
            <AppText variant="small" muted>
              {request.data
                ? "Showing your last loaded figures for this date and branch."
                : request.error}
            </AppText>
            <Button
              label="Try again"
              size="sm"
              variant="secondary"
              onPress={request.reload}
            />
          </Card>
        )}
        {request.loading && !request.data && (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Loading report"
            style={s.block}
          >
            <View style={[s.skeleton, { height: 190 }]} />
            <View style={s.grid}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[s.skeleton, s.highlight, { height: 130 }]}
                />
              ))}
            </View>
            <AppText variant="small" muted>
              Loading your fleet report…
            </AppText>
          </View>
        )}
        {request.data && (
          <>
            {request.data.partialDay && (
              <View style={s.notice}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={colors.warning}
                />
                <AppText
                  variant="caption"
                  color={colors.warning}
                  style={s.grow}
                >
                  Today is still in progress. Daily totals are partial.
                </AppText>
              </View>
            )}
            {tab === "Summary" ? (
              <>
                <FleetHero
                  section={sections.fleet}
                  onOpen={() => detail("fleet")}
                />
                <SectionHeader
                  label="The day at a glance"
                  right={
                    <AppText variant="caption" muted>
                      Selected day
                    </AppText>
                  }
                />
                <View style={s.grid}>
                  {highlights.map(
                    ([name, metric, label, icon, unit, caption]) => (
                      <Highlight
                        key={`${name}-${metric}`}
                        label={label}
                        icon={icon}
                        unit={unit}
                        caption={caption}
                        value={metricValue(sections[name], metric)}
                        onPress={() => detail(name)}
                      />
                    ),
                  )}
                </View>
                <SectionHeader
                  label="Needs your review"
                  right={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Open full inbox"
                      onPress={() => navigation.navigate("Owner escalations")}
                      hitSlop={8}
                    >
                      <AppText
                        variant="small"
                        weight="semibold"
                        color={colors.rage700}
                      >
                        View inbox
                      </AppText>
                    </Pressable>
                  }
                />
                <Card padding={0}>
                  {[
                    ["fuelReviews", "Fuel captures", "water-outline"],
                    ["expenseReviews", "Driver bills", "receipt-outline"],
                    ["documents", "Papers & renewals", "document-text-outline"],
                  ].map(([name, title, icon], index) => {
                    const count = metricValue(sections[name], "count");
                    return (
                      <OwnerGroupRow
                        key={name}
                        title={title}
                        icon={icon}
                        subtitle={
                          count == null
                            ? "Review data unavailable"
                            : count === 0
                              ? "No items in this queue"
                              : "Current review queue"
                        }
                        right={
                          <Badge
                            tone={count > 0 ? "pending" : "neutral"}
                            label={count == null ? "—" : String(count)}
                          />
                        }
                        onPress={() => detail(name)}
                        last={index === 2}
                      />
                    );
                  })}
                </Card>
                <SectionHeader label="Your workspace" />
                <View style={s.quickActions}>
                  {[
                    ["Messages", "chatbubbles-outline", "Messages"],
                    ["Reviews", "documents-outline", "Capture reviews"],
                    ["Crew", "people-outline", "Crew & driving"],
                    ["Trends", "trending-up-outline", "Owner trends"],
                  ].map(([label, icon, route]) => (
                    <Pressable
                      key={label}
                      accessibilityRole="button"
                      accessibilityLabel={
                        label === "Messages" ? "Messages & broadcasts" : label
                      }
                      onPress={() =>
                        navigation.navigate(
                          route,
                          route === "Owner trends" ? { date } : undefined,
                        )
                      }
                      style={s.quickAction}
                    >
                      <View style={s.quickIcon}>
                        <Ionicons
                          name={icon}
                          size={21}
                          color={colors.primary}
                        />
                      </View>
                      <AppText variant="caption" weight="semibold">
                        {label}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                {sections.dataHealth && (
                  <Card
                    padding={14}
                    onPress={() => detail("dataHealth")}
                    accessibilityLabel="View data health"
                  >
                    <View style={s.row}>
                      <Ionicons
                        name="pulse-outline"
                        size={19}
                        color={colors.primary}
                      />
                      <View style={s.grow}>
                        <AppText variant="small" weight="semibold">
                          Know what’s behind the numbers
                        </AppText>
                        <AppText variant="caption" muted>
                          Coverage, source times & missing data
                        </AppText>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.fog300}
                      />
                    </View>
                  </Card>
                )}
              </>
            ) : (
              <>
                <SectionHeader
                  label={
                    tab === "Money"
                      ? "Recorded money & evidence"
                      : tab === "People"
                        ? "Drivers & duty"
                        : "Fleet & operations"
                  }
                />
                <Card padding={0}>
                  {group.map((name, i) => (
                    <ReportRow
                      key={name}
                      name={name}
                      section={sections[name]}
                      onOpen={() => detail(name)}
                      last={i === group.length - 1}
                    />
                  ))}
                  {!group.length && (
                    <View style={s.empty}>
                      <AppText variant="small" muted>
                        No report sections available in this view.
                      </AppText>
                    </View>
                  )}
                </Card>
                <AppText variant="caption" muted>
                  Tap a row for its figures, coverage and supporting records.
                  Unavailable figures are shown as —.
                </AppText>
              </>
            )}
            <View style={s.footer}>
              <Ionicons name="sync-outline" size={13} color={colors.fog300} />
              <AppText variant="caption" muted style={s.grow}>
                Report checked{" "}
                {new Date(request.data.generatedAt).toLocaleTimeString(
                  "en-IN",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Kolkata",
                  },
                )}{" "}
                IST · pull to refresh
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="About this report"
              onPress={() => setAboutOpen(true)}
              style={{
                minHeight: 44,
                justifyContent: "center",
                alignSelf: "flex-start",
              }}
            >
              <AppText
                variant="caption"
                weight="semibold"
                color={colors.rage700}
              >
                About this report
              </AppText>
            </Pressable>
          </>
        )}
      </ScrollView>
      <BottomSheet visible={branchOpen} onClose={() => setBranchOpen(false)}>
        <View style={s.sheetHeading}>
          <AppText variant="h2">Your branches</AppText>
          <IconAction
            icon="close"
            label="Close branch selector"
            onPress={() => setBranchOpen(false)}
          />
        </View>
        <ScrollView style={s.sheetList}>
          {branches.map((b) => (
            <OwnerGroupRow
              key={b.id}
              icon="business-outline"
              title={b.name}
              right={
                branchId === b.id ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                ) : null
              }
              onPress={() => {
                onBranchChange(b.id);
                setBranchOpen(false);
              }}
            />
          ))}
        </ScrollView>
      </BottomSheet>
      <BottomSheet visible={aboutOpen} onClose={() => setAboutOpen(false)}>
        <View style={s.sheetHeading}>
          <AppText variant="h2">About this report</AppText>
          <IconAction
            icon="close"
            label="Close report information"
            onPress={() => setAboutOpen(false)}
          />
        </View>
        <AppText variant="small" muted>
          Daily figures use the selected IST business day. Fleet state and
          review queues describe now. — means data is unavailable, not zero.
        </AppText>
        {(request.data?.notes || []).map((note, index) => (
          <AppText key={index} variant="small" muted>
            {note}
          </AppText>
        ))}
      </BottomSheet>
      <BottomSheet visible={audioOpen} onClose={() => setAudioOpen(false)}>
        <View style={s.sheetHeading}>
          <AppText variant="h2">Listen to your report</AppText>
          <IconAction
            icon="close"
            label="Close audio options"
            onPress={() => setAudioOpen(false)}
          />
        </View>
        <AppText variant="small" muted>
          A spoken summary of the selected business day, including missing-data
          qualifications.
        </AppText>
        <Choice
          label="Report language"
          value={language}
          onChange={onLanguageChange}
          options={[
            ["en", "English"],
            ["hi", "हिन्दी"],
            ["bn", "বাংলা"],
          ]}
        />
        {speechError ? (
          <AppText variant="small" color={colors.error}>
            {speechError}
          </AppText>
        ) : null}
        <Button
          label={speaking ? "Stop narration" : "Listen to report"}
          icon={speaking ? "stop-outline" : "volume-high-outline"}
          disabled={!request.data}
          onPress={speaking ? onStop : onListen}
        />
      </BottomSheet>
    </View>
  );
}
export function OwnerSectionContent({ name, section, onRecords }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const state = sectionState(section);
  return (
    <>
      <View style={s.row}>
        <Badge label={state.label} tone={state.tone} />
        <AppText variant="caption" muted>
          {section?.coverage || "Unknown"} coverage
        </AppText>
      </View>
      {section?.availability !== "unavailable" &&
        section?.status !== "error" && (
          <Card padding={0}>
            {Object.entries(section?.metrics || {}).map(([key, metric], i) => (
              <View key={key} style={[s.metricRow, i > 0 && s.metricBorder]}>
                <View style={s.grow}>
                  <AppText variant="small" weight="semibold">
                    {key === "count"
                      ? name === "trips"
                        ? "Completed trips"
                        : "Matching records"
                      : friendlyLabel(key)}
                  </AppText>
                  <AppText variant="caption" muted style={s.rowSub}>
                    {metric.meaning}
                  </AppText>
                </View>
                <AppText
                  mono
                  variant="small"
                  weight="medium"
                  style={s.metricValue}
                >
                  {displayMetric(metric)}
                </AppText>
              </View>
            ))}
          </Card>
        )}
      {section?.drilldown && (
        <Button
          label="View supporting records"
          icon="list-outline"
          onPress={onRecords}
        />
      )}
      {(section?.notes || []).length > 0 && (
        <Card variant="tinted" style={s.block}>
          <AppText variant="small" weight="semibold">
            About these figures
          </AppText>
          {section.notes.map((note, i) => (
            <AppText variant="small" muted key={i}>
              {note}
            </AppText>
          ))}
        </Card>
      )}
      <Card padding={0}>
        <OwnerGroupRow
          title="Sources & freshness"
          expanded={sourcesOpen}
          icon="information-circle-outline"
          subtitle="Where these figures come from"
          onPress={() => setSourcesOpen(!sourcesOpen)}
          last
        />
        {sourcesOpen && (
          <View style={s.sourceBody}>
            {(section?.sources || []).map((source, i) => (
              <View style={s.block} key={i}>
                <AppText variant="small" weight="semibold">
                  {source.name}
                </AppText>
                <AppText variant="caption" muted>
                  Last source observation:{" "}
                  {source.observedAt
                    ? new Date(source.observedAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      }) + " IST"
                    : "Unavailable"}
                </AppText>
                <AppText variant="caption" muted>
                  Checked:{" "}
                  {source.checkedAt
                    ? new Date(source.checkedAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      }) + " IST"
                    : "Unavailable"}
                </AppText>
              </View>
            ))}
            {!section?.sources?.length && (
              <AppText variant="small" muted>
                No source records are connected for this section.
              </AppText>
            )}
          </View>
        )}
      </Card>
    </>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  grow: { flex: 1, minWidth: 0 },
  dashboard: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 16,
  },
  detailBody: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    padding: 20,
    gap: 16,
  },
  title: { marginTop: 3 },
  spread: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLight: { backgroundColor: colors.onPrimaryFaint },
  dim: { opacity: 0.4 },
  branchChip: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  dateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  dateActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  hero: { padding: 16, borderRadius: radius.lg, gap: 10 },
  heroEyebrow: { fontSize: 10, letterSpacing: 1.1 },
  heroTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: colors.onPrimaryFaint,
    borderRadius: radius.full,
  },
  heroMain: { flexDirection: "row", alignItems: "center" },
  heroNumbers: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  heroValue: { fontSize: 36, lineHeight: 42 },
  heroTotal: { fontSize: 20, lineHeight: 28 },
  heroArrow: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.onPrimaryFaint,
    justifyContent: "center",
    alignItems: "center",
  },
  heroStats: {
    flexDirection: "row",
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onPrimaryFaint,
  },
  heroStat: { flex: 1, gap: 3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  highlight: { width: "48%", flexGrow: 1, flexBasis: "46%", gap: 5 },
  highlightTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  highlightValue: { fontSize: 23, lineHeight: 29 },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    minHeight: 66,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.blueTint,
    alignItems: "center",
    justifyContent: "center",
  },
  rowSub: { marginTop: 3 },
  rowAmount: { maxWidth: "30%", textAlign: "right" },
  quickActions: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    minHeight: 68,
  },
  quickIcon: {
    width: 42,
    height: 42,
    backgroundColor: colors.blueTint,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.pendingBg,
  },
  sheetHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetList: { maxHeight: 340 },
  block: { gap: 10 },
  empty: { padding: 20 },
  skeleton: { borderRadius: radius.lg, backgroundColor: colors.fog700 },
  metricRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    padding: 16,
  },
  metricBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  metricValue: { maxWidth: "42%", textAlign: "right" },
  sourceBody: {
    padding: 16,
    gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
