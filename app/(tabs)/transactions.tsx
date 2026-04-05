import { MonthPage } from "@/components/month-page";
import { useAuth } from "@/contexts/auth";
import { useBanks } from "@/hooks/use-banks";
import { useHideValues } from "@/hooks/use-hide-values";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface MonthSlot {
  key: string;
  month: number;
  year: number;
  label: string;
}

function buildSlots(year: number): MonthSlot[] {
  return MONTH_LABELS.map((label, i) => ({
    key: `${i + 1}-${year}`,
    month: i + 1,
    year,
    label: `${label} ${year}`,
  }));
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function TransactionsScreen() {
  const { user } = useAuth();
  const { data: banks = [] } = useBanks(user?.id);
  const { hidden, toggle: toggleHidden } = useHideValues();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [slots, setSlots] = useState<MonthSlot[]>(() => {
    return [
      ...buildSlots(currentYear - 1),
      ...buildSlots(currentYear),
      ...buildSlots(currentYear + 1),
    ];
  });

  const initialIndex = 12 + currentMonth - 1;
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);
  const loadedYears = useRef(new Set([currentYear - 1, currentYear, currentYear + 1]));
  const isAdjusting = useRef(false);

  const activeSlot = slots[activeIndex] ?? slots[0];

  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      const m = now.getMonth() + 1;
      const y = now.getFullYear();
      const idx = slots.findIndex((s) => s.month === m && s.year === y);
      if (idx >= 0 && idx !== activeIndex) {
        setActiveIndex(idx);
        flatListRef.current?.scrollToIndex({ index: idx, animated: false });
      }
    }, [slots]),
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (isAdjusting.current || !viewableItems.length) return;
    const idx = viewableItems[0].index;
    setActiveIndex(idx);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // Detecta quando chega perto das bordas e expande
  const onMomentumScrollEnd = useCallback(() => {
    const idx = activeIndex;
    const slot = slots[idx];
    if (!slot) return;

    // Perto do início — adiciona ano anterior
    if (idx <= 2) {
      const yearToAdd = slots[0].year - 1;
      if (!loadedYears.current.has(yearToAdd)) {
        loadedYears.current.add(yearToAdd);
        const newSlots = [...buildSlots(yearToAdd), ...slots];
        const newIndex = idx + 12;
        isAdjusting.current = true;
        setSlots(newSlots);
        setActiveIndex(newIndex);
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: newIndex, animated: false });
          isAdjusting.current = false;
        }, 50);
      }
    }

    // Perto do fim — adiciona próximo ano
    if (idx >= slots.length - 3) {
      const yearToAdd = slots[slots.length - 1].year + 1;
      if (!loadedYears.current.has(yearToAdd)) {
        loadedYears.current.add(yearToAdd);
        setSlots((prev) => [...prev, ...buildSlots(yearToAdd)]);
      }
    }
  }, [activeIndex, slots]);

  function changeMonth(dir: number) {
    const next = activeIndex + dir;
    if (next >= 0 && next < slots.length) {
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    }
  }

  const renderPage = useCallback(
    ({ item }: { item: MonthSlot }) => {
      if (!user) return <View style={{ width: SCREEN_WIDTH }} />;
      return (
        <MonthPage
          userId={user.id}
          month={item.month}
          year={item.year}
          banks={banks}
          width={SCREEN_WIDTH}
          hideValues={hidden}
        />
      );
    },
    [user, banks, hidden],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  if (!user) return null;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-700">
      {/* Header fixo */}
      <View style={{ paddingTop: 64, paddingHorizontal: 24 }}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-gray-700 dark:text-gray-100 text-2xl font-bold">
            Transações
          </Text>
          <TouchableOpacity onPress={toggleHidden} activeOpacity={0.7}>
            <Ionicons
              name={hidden ? "eye-off-outline" : "eye-outline"}
              size={24}
              color="#7C7C8A"
            />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center justify-between bg-white dark:bg-gray-600 rounded-2xl px-4 py-3 mb-4">
          <TouchableOpacity onPress={() => changeMonth(-1)} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#7C7C8A" />
          </TouchableOpacity>
          <Text className="text-gray-700 dark:text-gray-100 text-base font-bold">
            {activeSlot.label}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={24} color="#7C7C8A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Pager de meses */}
      <FlatList
        ref={flatListRef}
        data={slots}
        renderItem={renderPage}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onMomentumScrollEnd={onMomentumScrollEnd}
        windowSize={3}
        maxToRenderPerBatch={1}
        removeClippedSubviews
      />
    </View>
  );
}
