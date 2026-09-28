import { ExpenseForm } from "@/components/forms/expense-form";
import { FinancingForm } from "@/components/forms/financing-form";
import { SalaryForm } from "@/components/forms/salary-form";
import { ExpenseItem } from "@/components/expense-item";
import { ExpenseEditCard } from "@/components/expense-edit-card";
import { SalaryEditCard } from "@/components/salary-edit-card";
import { useAuth } from "@/contexts/auth";
import { useBalance } from "@/hooks/use-balance";
import { getDisplayMonth, useMonthCutoff } from "@/hooks/use-month-cutoff";
import { useBanks } from "@/hooks/use-banks";
import { useExpenses } from "@/hooks/use-expenses";
import { useSalaries } from "@/hooks/use-salaries";
import { useHideValues } from "@/hooks/use-hide-values";
import { ExpenseEntry } from "@/services/expense";
import { formatCurrency } from "@/utils/currency";
import { abbreviateName, getInitials } from "@/utils/name";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


type ActiveForm = null | "salary" | "expense" | "loan" | "financing";

const ACTIONS: {
  key: ActiveForm;
  label: string;
  icon: string;
  color: string;
}[] = [
  {
    key: "salary",
    label: "Renda",
    icon: "trending-up-outline",
    color: "bg-green-700",
  },
  {
    key: "expense",
    label: "Despesa",
    icon: "trending-down-outline",
    color: "bg-orange-600",
  },
  {
    key: "loan",
    label: "Empréstimo",
    icon: "cash-outline",
    color: "bg-purple-500",
  },
  {
    key: "financing",
    label: "Financiamento",
    icon: "home-outline",
    color: "bg-purple-700",
  },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const { cutoffDay } = useMonthCutoff();
  const { month: currentMonth, year: currentYear } = getDisplayMonth(cutoffDay);
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [showLists, setShowLists] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: balance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
    invalidateAll: invalidateAllBalance,
  } = useBalance(user?.id, currentMonth, currentYear);

  const {
    data: expenses = [],
    refetch: refetchExpenses,
    invalidateAll: invalidateAllExpenses,
    removeFromCache,
    refetchAfterMutation,
  } = useExpenses(user?.id, currentMonth, currentYear);

  const { data: banks = [] } = useBanks(user?.id);

  const {
    data: salaries = [],
    refetch: refetchSalaries,
    invalidateAll: invalidateAllSalaries,
  } = useSalaries(user?.id, currentMonth, currentYear);

  const loading = balanceLoading && !balance;

  const scrollRef = useRef<ScrollView>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);

  // Group expenses by bank
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

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => sub.remove();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchBalance(), refetchExpenses(), refetchSalaries()]);
    setRefreshing(false);
  }

  function handleSaved() {
    setActiveForm(null);
    setShowLists(false);
    setTimeout(() => {
      invalidateAllBalance();
      invalidateAllExpenses();
      invalidateAllSalaries();
      setShowLists(true);
    }, 100);
  }

  const { hidden, toggle: toggleHidden } = useHideValues();

  if (!user) return null;

  const displayName = abbreviateName(user.firstName, user.lastName);
  const initials = getInitials(user.firstName, user.lastName);
  const isPositive = (balance?.balance ?? 0) >= 0;
  const mask = (text: string) => (hidden ? "••••••" : text);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-gray-50 dark:bg-gray-700"
        contentContainerStyle={{
          paddingTop: 64,
          paddingHorizontal: 24,
          paddingBottom: 200,
        }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00B37E"
            colors={["#00B37E"]}
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.push("/profile")} activeOpacity={0.7}>
            {user.profileImageUrl ? (
              <Image
                source={{ uri: user.profileImageUrl }}
                className="w-14 h-14 rounded-full"
              />
            ) : (
              <View className="w-14 h-14 rounded-full bg-green-700 items-center justify-center">
                <Text className="text-white text-xl font-bold">{initials}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-gray-300 dark:text-gray-200 text-sm">
              Olá,
            </Text>
            <Text className="text-gray-700 dark:text-gray-100 text-lg font-bold">
              {displayName}
            </Text>
          </View>
          <TouchableOpacity onPress={toggleHidden} activeOpacity={0.7}>
            <Ionicons
              name={hidden ? "eye-off-outline" : "eye-outline"}
              size={24}
              color="#7C7C8A"
            />
          </TouchableOpacity>
        </View>

        {/* Carrossel de ações */}
        <Text className="text-gray-300 dark:text-gray-200 text-sm font-bold mt-6 mb-2">
          Adicionar:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className=""
          contentContainerStyle={{ gap: 8 }}
        >
          {ACTIONS.map((action) => {
            const isActive = activeForm === action.key;
            return (
              <TouchableOpacity
                key={action.key}
                onPress={() => setActiveForm(isActive ? null : action.key)}
                style={{ width: 80, height: 80 }}
                className={`rounded-2xl items-center justify-center px-2 ${
                  isActive
                    ? "border-2 border-gray-200 dark:border-gray-400 bg-transparent"
                    : action.color
                }`}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={(isActive ? "close" : action.icon) as any}
                  size={28}
                  color={isActive ? "#7C7C8A" : "#fff"}
                />
                <Text
                  className={`text-[11px] mt-1 text-center ${isActive ? "text-gray-300" : "text-white"}`}
                >
                  {isActive ? "Cancelar" : action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Card principal */}
        <View className="mt-5 bg-white dark:bg-gray-600 rounded-2xl p-6">
          {activeForm === "salary" ? (
            <SalaryForm userId={user.id} onSaved={handleSaved} />
          ) : activeForm === "expense" ? (
            <ExpenseForm userId={user.id} onSaved={handleSaved} />
          ) : activeForm === "loan" ? (
            <FinancingForm userId={user.id} mode="loan" onSaved={handleSaved} />
          ) : activeForm === "financing" ? (
            <FinancingForm
              userId={user.id}
              mode="financing"
              onSaved={handleSaved}
            />
          ) : loading ? (
            <ActivityIndicator color="#00B37E" />
          ) : (
            <>
              <Text className="text-gray-300 dark:text-gray-200 text-sm mb-1">
                Balanço de{" "}
                {balance
                  ? new Date(
                      balance.period.year,
                      balance.period.month - 1,
                    ).toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })
                  : "---"}
              </Text>
              <Text
                className={`text-3xl font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}
              >
                {mask(balance ? formatCurrency(balance.balance) : "R$ 0,00")}
              </Text>
              <View className="flex-row mt-6 gap-4">
                <View className="flex-1 bg-gray-50 dark:bg-gray-500 rounded-xl p-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View className="w-2 h-2 rounded-full bg-green-500" />
                    <Text className="text-gray-300 dark:text-gray-200 text-xs">
                      Receitas
                    </Text>
                  </View>
                  <Text className="text-green-500 text-base font-bold">
                    {mask(balance ? formatCurrency(balance.totalSalary) : "R$ 0,00")}
                  </Text>
                </View>
                <View className="flex-1 bg-gray-50 dark:bg-gray-500 rounded-xl p-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View className="w-2 h-2 rounded-full bg-red-500" />
                    <Text className="text-gray-300 dark:text-gray-200 text-xs">
                      Despesas
                    </Text>
                  </View>
                  <Text className="text-red-500 text-base font-bold">
                    {balance
                      ? mask(formatCurrency(balance.totalExpenses))
                      : "R$ 0,00"}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
        {/* Receitas do mês */}
        {!loading && showLists && salaries.length > 0 && (
          <View style={activeForm ? { display: 'none' } : undefined}>
          <View className="mt-6">
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
                      userId={user.id}
                      month={currentMonth}
                      year={currentYear}
                      onClose={() => setEditingSalaryId(null)}
                      onMutated={() => {
                        invalidateAllBalance();
                        invalidateAllSalaries();
                      }}
                    />
                  );
                }

                const amount =
                  salary.activeAmount ??
                  Number(salary.history?.[0]?.amount ?? 0);
                return (
                  <TouchableOpacity
                    key={salary.id}
                    className="bg-white dark:bg-gray-600 rounded-2xl p-4 flex-row items-center"
                    activeOpacity={0.7}
                    onPress={() => setEditingSalaryId(salary.id)}
                  >
                    <View
                      className={`w-1 self-stretch rounded-full mr-3 ${salary.isMain ? "bg-green-500" : "bg-gray-200 dark:bg-gray-500"}`}
                    />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-gray-700 dark:text-gray-100 text-sm font-bold">
                          {salary.name}
                        </Text>
                        {salary.isMain && (
                          <View className="bg-green-700 rounded-full px-2 py-0.5">
                            <Text className="text-white text-[10px] font-bold">
                              Principal
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text className="text-green-500 text-sm font-bold">
                      {mask(formatCurrency(amount))}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          </View>
        )}

        {/* Lista de despesas agrupada por banco */}
        {!loading && showLists && expenses.length > 0 && (
          <View style={activeForm ? { display: 'none' } : undefined}>
          <View className="mt-6">
            <Text className="text-gray-700 dark:text-gray-100 text-base font-bold mb-3">
              Despesas do mês
            </Text>
            {sections.map((section) => (
              <View key={section.title}>
                {/* Section header */}
                <View className="flex-row items-center gap-3 mt-3 mb-2">
                  <View className="h-px flex-1 bg-gray-200 dark:bg-gray-500" />
                  <Text className="text-gray-300 dark:text-gray-200 text-xs font-bold uppercase">
                    {section.title}
                  </Text>
                  <View className="h-px flex-1 bg-gray-200 dark:bg-gray-500" />
                </View>

                <View className="gap-3">
                  {section.data.map((expense) => {
                    if (editingId === expense.id) {
                      return (
                        <ExpenseEditCard
                          key={expense.id}
                          expense={expense}
                          userId={user.id}
                          month={currentMonth}
                          year={currentYear}
                          banks={banks}
                          onClose={() => setEditingId(null)}
                          onMutated={() => {
                            invalidateAllBalance();
                            refetchAfterMutation();
                          }}
                          onOptimisticRemove={removeFromCache}
                        />
                      );
                    }

                    return (
                      <View key={expense.id}>
                        <ExpenseItem
                          expense={expense}
                          onPress={() => setEditingId(expense.id)}
                          hideValues={hidden}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
