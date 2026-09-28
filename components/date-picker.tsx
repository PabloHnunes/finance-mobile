import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface Props {
  label: string;
  /** YYYY-MM-DD */
  value: string;
  onChange: (value: string) => void;
}

function parse(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function DatePicker({ label, value, onChange }: Props) {
  const selected = parse(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: selected.year, month: selected.month });

  const daysInMonth = new Date(view.year, view.month, 0).getDate();
  const firstWeekday = new Date(view.year, view.month - 1, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function toggle() {
    if (!open) setView({ year: selected.year, month: selected.month });
    setOpen(!open);
  }

  function changeMonth(dir: number) {
    setView((p) => {
      const m = p.month + dir;
      if (m < 1) return { year: p.year - 1, month: 12 };
      if (m > 12) return { year: p.year + 1, month: 1 };
      return { ...p, month: m };
    });
  }

  function pick(day: number) {
    onChange(toIso(view.year, view.month, day));
    setOpen(false);
  }

  return (
    <View>
      <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">{label}</Text>
      <TouchableOpacity
        className="bg-gray-50 dark:bg-gray-500 rounded-lg px-4 py-3 flex-row items-center justify-between"
        activeOpacity={0.7}
        onPress={toggle}
      >
        <Text className="text-gray-700 dark:text-gray-100 text-base">
          {String(selected.day).padStart(2, '0')}/{String(selected.month).padStart(2, '0')}/{selected.year}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'calendar-outline'} size={20} color="#7C7C8A" />
      </TouchableOpacity>

      {open && (
        <View className="bg-gray-50 dark:bg-gray-500 rounded-lg p-3 mt-2">
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity onPress={() => changeMonth(-1)} activeOpacity={0.7} className="p-1">
              <Ionicons name="chevron-back" size={20} color="#7C7C8A" />
            </TouchableOpacity>
            <Text className="text-gray-700 dark:text-gray-100 text-sm font-bold">
              {MONTHS[view.month - 1]} {view.year}
            </Text>
            <TouchableOpacity onPress={() => changeMonth(1)} activeOpacity={0.7} className="p-1">
              <Ionicons name="chevron-forward" size={20} color="#7C7C8A" />
            </TouchableOpacity>
          </View>

          <View className="flex-row">
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={{ width: '14.285%' }} className="text-center text-gray-300 dark:text-gray-200 text-xs mb-1">
                {w}
              </Text>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {cells.map((day, i) => {
              const isSelected =
                day !== null &&
                day === selected.day &&
                view.month === selected.month &&
                view.year === selected.year;
              return (
                <View key={i} style={{ width: '14.285%' }} className="items-center py-0.5">
                  {day !== null && (
                    <TouchableOpacity
                      onPress={() => pick(day)}
                      className={`w-9 h-9 rounded-lg items-center justify-center ${isSelected ? 'bg-orange-600' : ''}`}
                      activeOpacity={0.7}
                    >
                      <Text className={`text-xs ${isSelected ? 'text-white font-bold' : 'text-gray-700 dark:text-gray-100'}`}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
