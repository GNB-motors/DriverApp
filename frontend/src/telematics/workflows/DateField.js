import React, { useState } from "react";
import { View, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AppText, Button } from "../../components/ui";
export default function DateField({
  label,
  value,
  onChange,
  disabled,
  includeTime = true,
}) {
  const [mode, setMode] = useState(null);
  const date = value ? new Date(value) : new Date();
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="label" muted>
        {label}
      </AppText>
      <Button
        label={value ? date.toLocaleString() : "Choose date"}
        disabled={disabled}
        variant="secondary"
        onPress={() =>
          setMode(Platform.OS === "ios" && includeTime ? "datetime" : "date")
        }
      />
      {includeTime && Platform.OS !== "ios" && (
        <Button
          label="Change time"
          disabled={disabled}
          variant="secondary"
          onPress={() => setMode("time")}
        />
      )}
      {mode && (
        <DateTimePicker
          value={date}
          mode={mode}
          onChange={(event, next) => {
            setMode(null);
            if (event.type !== "dismissed" && next)
              onChange(next.toISOString());
          }}
        />
      )}
    </View>
  );
}
