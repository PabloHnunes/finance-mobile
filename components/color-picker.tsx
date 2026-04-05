import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

const PRESET_COLORS = [
  "#8A05BE", // Nubank
  "#EE4D2D", // Inter
  "#FF5000", // Itaú
  "#003882", // Caixa
  "#FFCC00", // BB
  "#EC0000", // Santander
  "#00A650", // Sicredi
  "#1D1D1B", // C6
  "#0033A0", // Bradesco
  "#F37021", // PagBank
  "#00B37E", // Verde app
  "#7C7C8A", // Cinza
];

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: Props) {
  const [hexInput, setHexInput] = useState(value ? value.replace("#", "") : "");

  function handleTextChange(text: string) {
    const clean = text.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
    setHexInput(clean);
    if (clean.length === 6) {
      onChange(`#${clean.toUpperCase()}`);
    }
  }

  function selectPreset(color: string) {
    const selected = value === color ? "" : color;
    onChange(selected);
    setHexInput(selected.replace("#", ""));
  }

  const isValid = /^[0-9a-fA-F]{6}$/.test(hexInput);
  const previewColor = isValid ? `#${hexInput}` : value || "#7C7C8A";

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {PRESET_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => selectPreset(c)}
            className={`w-9 h-9 rounded-full items-center justify-center ${value === c ? "border-2 border-gray-700 dark:border-white" : ""}`}
            style={{ backgroundColor: c }}
            activeOpacity={0.7}
          />
        ))}
      </View>
      <View className="flex-row items-center gap-3">
        <View
          className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-400"
          style={{ backgroundColor: previewColor }}
        />
        <View className="flex-1 bg-gray-50 dark:bg-gray-500 rounded-lg px-4 py-3 flex-row items-center">
          <Text className="text-gray-300 dark:text-gray-200 text-base mr-1">
            #
          </Text>
          <TextInput
            className="flex-1 text-gray-700 dark:text-gray-100 text-base p-0"
            value={hexInput}
            onChangeText={handleTextChange}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="000000"
            placeholderTextColor="#7C7C8A"
          />
        </View>
      </View>
    </View>
  );
}
