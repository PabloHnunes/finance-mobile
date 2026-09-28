import { memo, useCallback, useMemo, useState } from "react";
import { View, Text, SectionList, RefreshControl, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ExpenseEntry } from "@/services/expense";
import { Bank } from "@/services/bank";
import { useExpenses } from "@/hooks/use-expenses";
import { useSalaries } from "@/hooks/use-salaries";
import { formatCurrency } from "@/utils/currency";
import { SkeletonRow } from "@/components/skeleton-row";
import { ExpenseItem } from "@/components/expense-item";
import { ExpenseEditCard } from "@/components/expense-edit-card";
import { SalaryEditCard } from "@/components/salary-edit-card";

interface Props {
  userId: string;
  month: number;
  year: number;
  banks: Bank[];
  width: number;
  hideValues?: boolean;
}

export const MonthPage = memo(function MonthPage({ userId, month, year, banks, width, hideValues }: Props) {
  const {
    data: expenses = [],
    isLoading: loading,
    refetch,
    removeFromCache,
    refetchAfterMutation,
  } = useExpenses(userId, month, year);

  const {
    data: salaries = [],
    refetch: refetchSalaries,
    invalidateAll: invalidateAllSalaries,
  } = useSalaries(userId, month, year);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const mask = (text: string) => (hideValues ? "••••••" : text);

  const showSkeleton = loading && expenses.length === 0;
  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount) * (e.userPart / e.splitParts),
    0,
  );
  const totalSalaries = salaries.reduce(
    (sum, s) => sum + Number(s.activeAmount ?? s.history?.[0]?.amount ?? 0),
    0,
  );
  const balanceMonth = totalSalaries - totalExpenses;
  const isPositive = balanceMonth >= 0;

  const sections = useMemo(() => {
    const map = new Map<string, ExpenseEntry[]>();
    for (const expense of expenses) {
      const key = expense.bankId ?? "__others__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(expense);
    }
    const sortByDate = (a: ExpenseEntry, b: ExpenseEntry) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    const groups: { title: string; data: ExpenseEntry[] }[] = [];
    for (const [key, items] of map) {
      if (key !== "__others__") {
        const bank = items[0]?.bank;
        const title = bank
          ? `${bank.name}${bank.documentType ? ` • ${bank.documentType}` : ""}`
          : "Banco";
        groups.push({ title, data: items.sort(sortByDate) });
      }
    }
    groups.sort((a, b) => a.title.localeCompare(b.title));
    const others = map.get("__others__");
    if (others?.length) groups.push({ title: "Outros", data: others.sort(sortByDate) });
    return groups;
  }, [expenses]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refetchSalaries()]);
    setRefreshing(false);
  }

  // Elemento (não função): passar uma função nova ao ListHeaderComponent a cada
  // render faz o header remontar e o TextInput perder o foco.
  const header = useMemo(
    () => (
      <View>
        {/* Receitas do mês */}
        {!showSkeleton && salaries.length > 0 && (
          <View className="mb-4">
            <Text className="text-gray-700 dark:text-gray-100 text-base font-bold mb-3">
              Receitas do mês
            </Text>
            <View className="gap-3">
              {salaries.map((salary) => {
                if (editingSalaryId === salary.id) {
                  return (
                    <SalaryEditCard
                      key={salary.id}
                      salary={salary}
                      userId={userId}
                      month={month}
                      year={year}
                      onClose={() => setEditingSalaryId(null)}
                      onMutated={invalidateAllSalaries}
                    />
                  );
                }

                const amount = Number(salary.activeAmount ?? salary.history?.[0]?.amount ?? 0);
                return (
                  <TouchableOpacity
                    key={salary.id}
                    className="bg-white dark:bg-gray-600 rounded-2xl p-4 flex-row items-center"
                    activeOpacity={0.7}
                    onPress={() => setEditingSalaryId(salary.id)}
                  >
                    <View className={`w-1 self-stretch rounded-full mr-3 ${salary.isMain ? "bg-green-500" : "bg-gray-200 dark:bg-gray-500"}`} />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-gray-700 dark:text-gray-100 text-sm font-bold">{salary.name}</Text>
                        {salary.isMain && (
                          <View className="bg-green-700 rounded-full px-2 py-0.5">
                            <Text className="text-white text-[10px] font-bold">Principal</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text className="text-green-500 text-sm font-bold">{mask(formatCurrency(amount))}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Total despesas */}
        <View className="bg-white dark:bg-gray-600 rounded-2xl p-4 mb-4 flex-row items-center justify-between">
          <Text className="text-gray-300 dark:text-gray-200 text-sm">Balanço do mês</Text>
          {showSkeleton ? (
            <View style={{ height: 28 }} />
          ) : (
            <Text className={`text-lg font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>{mask(formatCurrency(balanceMonth))}</Text>
          )}
        </View>
        {showSkeleton ? (
          <View className="gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonRow key={i} delay={i * 100} />
            ))}
          </View>
        ) : null}
      </View>
    ),
    [showSkeleton, balanceMonth, isPositive, salaries, editingSalaryId, hideValues, userId, month, year],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View className="flex-row items-center gap-3 mt-3 mb-2">
        <View className="h-px flex-1 bg-gray-200 dark:bg-gray-500" />
        <Text className="text-gray-300 dark:text-gray-200 text-xs font-bold uppercase">
          {section.title}
        </Text>
        <View className="h-px flex-1 bg-gray-200 dark:bg-gray-500" />
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item: expense }: { item: ExpenseEntry }) => (
      <View className="mb-3">
        {editingId === expense.id ? (
          <ExpenseEditCard
            expense={expense}
            userId={userId}
            month={month}
            year={year}
            banks={banks}
            onClose={() => setEditingId(null)}
            onMutated={refetchAfterMutation}
            onOptimisticRemove={removeFromCache}
          />
        ) : (
          <ExpenseItem expense={expense} onPress={() => setEditingId(expense.id)} hideValues={hideValues} />
        )}
      </View>
    ),
    [editingId, banks, hideValues, userId, month, year],
  );

  const renderEmpty = useCallback(() => {
    if (showSkeleton) return null;
    return (
      <View className="items-center mt-12">
        <Ionicons name="receipt-outline" size={48} color="#7C7C8A" />
        <Text className="text-gray-300 text-base mt-4">Nenhuma despesa neste mês</Text>
      </View>
    );
  }, [showSkeleton]);

  return (
    <View style={{ width }}>
      <SectionList
        sections={showSkeleton ? [] : sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 200 }}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={21}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00B37E" colors={["#00B37E"]} />
        }
      />
    </View>
  );
});
