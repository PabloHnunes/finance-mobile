import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { formatCurrency } from "@/utils/currency";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  hideValues?: boolean;
}

export function DonutChart({
  data,
  size = 140,
  strokeWidth = 24,
  hideValues,
}: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;
  const slices = data.map((d) => {
    const pct = d.value / total;
    const offset = circumference * (1 - accumulated) + circumference * 0.25;
    accumulated += pct;
    return {
      ...d,
      pct,
      dashArray: `${circumference * pct} ${circumference * (1 - pct)}`,
      dashOffset: offset,
    };
  });

  return (
    <View className="flex-row items-center gap-4">
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#E1E1E6"
          strokeWidth={strokeWidth}
        />
        {slices.map((s, i) => (
          <Circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeWidth}
            strokeDasharray={s.dashArray}
            strokeDashoffset={s.dashOffset}
            strokeLinecap="butt"
          />
        ))}
      </Svg>

      {/* Legend */}
      <View className="flex-1 gap-3">
        {slices.map((s, i) => (
          <View key={i} className="flex-row items-center gap-2">
            <View
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <View className="flex-1">
              <Text
                className="text-gray-700 dark:text-gray-100 text-xs font-medium"
                numberOfLines={1}
              >
                {s.label}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-gray-700 dark:text-gray-100 text-xs font-bold">
                  {hideValues ? "••••••" : formatCurrency(s.value)}
                </Text>
                <Text className="text-gray-300 dark:text-gray-200 text-[10px]">
                  {hideValues ? "" : `${Math.round(s.pct * 100)}%`}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
