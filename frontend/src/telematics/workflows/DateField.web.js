import React from "react";
import { View } from "react-native";
import { AppText } from "../../components/ui";
export default function DateField({
  label,
  value,
  onChange,
  disabled,
  includeTime = true,
}) {
  const date = value ? new Date(value) : null;
  const local =
    date && !Number.isNaN(date.getTime())
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
      : "";
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="label" muted>
        {label}
      </AppText>
      {React.createElement("input", {
        type: includeTime ? "datetime-local" : "date",
        "aria-label": label,
        disabled,
        value: includeTime ? local : local.slice(0, 10),
        onChange: (event) => {
          const next = new Date(event.target.value);
          if (!Number.isNaN(next.getTime())) onChange(next.toISOString());
        },
        style: {
          padding: 14,
          borderRadius: 12,
          border: "1px solid #DDD",
          fontSize: 16,
          width: "100%",
          boxSizing: "border-box",
        },
      })}
    </View>
  );
}
