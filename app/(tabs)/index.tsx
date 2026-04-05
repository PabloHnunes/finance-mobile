import { ExpenseForm } from "@/components/forms/expense-form";
import { FinancingForm } from "@/components/forms/financing-form";
import { SalaryForm } from "@/components/forms/salary-form";
import { ExpenseItem } from "@/components/expense-item";
import { useAuth } from "@/contexts/auth";
import { useBalance } from "@/hooks/use-balance";
import { useBanks } from "@/hooks/use-banks";
import { useExpenses } from "@/hooks/use-expenses";
import { useSalaries } from "@/hooks/use-salaries";
import { useHideValues } from "@/hooks/use-hide-values";
import {
  ExpenseCategory,
  ExpenseEntry,
  PaymentType,
  deleteExpense,
  settleInstallments,
  updateExpense,
} from "@/services/expense";
import {
  deleteRecurringExpense,
  updateRecurringExpense,
} from "@/services/recurring-expense";
import { updateFinancing } from "@/services/financing";
import { deleteSalary, updateSalary, SalaryWithAmount } from "@/services/salary";
import { formatCurrency } from "@/utils/currency";
import { currencyToNumber, maskCurrency } from "@/utils/currency-input";
import { abbreviateName, getInitials } from "@/utils/name";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";


type ActiveForm = null | "salary" | "expense" | "loan" | "financing";

const CATEGORY_LABELS: Record<string, string> = {
  GROCERIES: "Alimentação",
  TRANSPORTATION: "Transporte",
  HEALTHCARE: "Saúde",
  EDUCATION: "Educação",
  LEISURE: "Lazer",
  UTILITIES: "Contas",
  LOAN: "Empréstimo",
  FINANCING_PROPERTY: "Financ. Imóvel",
  FINANCING_VEHICLE: "Financ. Veículo",
};

const PAYMENT_LABELS: Record<string, string> = {
  PIX: "Pix",
  CREDIT: "Crédito",
  DEBIT: "Débito",
  CASH: "Dinheiro",
  TRANSFER: "Transferência",
  BOLETO: "Boleto",
};

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "GROCERIES", label: "Alimentação" },
  { value: "TRANSPORTATION", label: "Transporte" },
  { value: "HEALTHCARE", label: "Saúde" },
  { value: "EDUCATION", label: "Educação" },
  { value: "LEISURE", label: "Lazer" },
  { value: "UTILITIES", label: "Contas" },
];

const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: "PIX", label: "Pix" },
  { value: "CREDIT", label: "Crédito" },
  { value: "DEBIT", label: "Débito" },
  { value: "CASH", label: "Dinheiro" },
  { value: "TRANSFER", label: "Transferência" },
  { value: "BOLETO", label: "Boleto" },
];

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
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
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

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    amount: "0,00",
    category: "" as ExpenseCategory | "",
    paymentType: "" as PaymentType | "",
    isPriority: false,
    bankId: "",
    dueDay: 1,
    splitParts: "1",
    userPart: "1",
  });
  const [saving, setSaving] = useState(false);

  // Salary edit state
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [salaryForm, setSalaryForm] = useState({
    name: "",
    amount: "0,00",
    isMain: false,
  });
  const [savingSalary, setSavingSalary] = useState(false);

  // Group expenses by bank
  const sections = useMemo(() => {
    const map = new Map<string, ExpenseEntry[]>();
    for (const expense of expenses) {
      const key = expense.bankId ?? "__others__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(expense);
    }
    const sortByDate = (a: ExpenseEntry, b: ExpenseEntry) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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

  function startEdit(expense: ExpenseEntry) {
    setEditForm({
      name: expense.recurringExpense?.name ?? "",
      amount: maskCurrency(String(Math.round(Number(expense.amount) * 100))),
      category: expense.expenseCategory ?? "",
      paymentType: expense.paymentType ?? "",
      isPriority: expense.isPriority,
      bankId: expense.bankId ?? "",
      dueDay: new Date(expense.createdAt).getDate(),
      splitParts: String(expense.splitParts),
      userPart: String(expense.userPart),
    });
    setEditingId(expense.id);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit() {
    if (!editingId || !user) return;
    const expense = expenses.find((e) => e.id === editingId);
    const isRecurring = !!expense?.recurringExpenseId;
    const isFinancing = !!expense?.financingDetail;

    const amount = currencyToNumber(editForm.amount);
    if (!isFinancing && amount <= 0)
      return Alert.alert("Atenção", "Informe um valor válido.");

    setSaving(true);
    try {
      if (isFinancing && expense) {
        await updateFinancing(editingId, user.id, {
          splitParts: parseInt(editForm.splitParts) || 1,
          userPart: parseInt(editForm.userPart) || 1,
          fromMonth: currentMonth,
          fromYear: currentYear,
        });
      } else if (isRecurring) {
        await updateRecurringExpense(expense!.recurringExpenseId!, user.id, {
          name: editForm.name || undefined,
          amount,
          expenseCategory: editForm.category || undefined,
          paymentType: editForm.paymentType || undefined,
          isPriority: editForm.isPriority,
          bankId: editForm.bankId || null,
          dueDay: editForm.dueDay,
          splitParts: parseInt(editForm.splitParts) || 1,
          userPart: parseInt(editForm.userPart) || 1,
          fromMonth: currentMonth,
          fromYear: currentYear,
        });
      } else {
        await updateExpense(editingId, user.id, {
          amount,
          expenseCategory: editForm.category || undefined,
          paymentType: editForm.paymentType || undefined,
          bankId: editForm.bankId || null,
          splitParts: parseInt(editForm.splitParts) || 1,
          userPart: parseInt(editForm.userPart) || 1,
        });
      }
      setEditingId(null);
      invalidateAllBalance();
      refetchAfterMutation();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ?? "Não foi possível salvar.";
      Alert.alert("Erro", Array.isArray(msg) ? msg.join("\n") : msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expense: ExpenseEntry) {
    if (!user) return;
    const cat =
      expense.recurringExpense?.name ??
      (expense.expenseCategory
        ? (CATEGORY_LABELS[expense.expenseCategory] ?? "")
        : "Despesa");
    const isInstallment = expense.installmentCount > 1;
    const isRecurring = !!expense.recurringExpenseId;

    if (isInstallment || isRecurring) {
      Alert.alert(
        isRecurring
          ? "Remover despesa recorrente"
          : "Remover despesa parcelada",
        isInstallment
          ? `Parcela ${expense.installmentNumber}/${expense.installmentCount} - ${formatCurrency(Number(expense.amount))}`
          : `${cat} - ${formatCurrency(Number(expense.amount))}`,
        [
          { text: "Voltar", style: "cancel" },
          {
            text: "Só esta",
            onPress: async () => {
              try {
                removeFromCache(expense.id);
                await deleteExpense(expense.id, user.id);
                invalidateAllBalance();
                refetchAfterMutation();
              } catch {
                Alert.alert("Erro", "Não foi possível remover.");
              }
            },
          },
          {
            text: isRecurring ? "Esta e todas futuras" : "Esta e futuras",
            style: "destructive",
            onPress: async () => {
              try {
                removeFromCache(expense.id, expense.recurringExpenseId);
                if (isRecurring) {
                  await deleteRecurringExpense(
                    expense.recurringExpenseId!,
                    user.id,
                    currentMonth,
                    currentYear,
                  );
                } else {
                  await deleteExpense(expense.id, user.id, true);
                }
                invalidateAllBalance();
                refetchAfterMutation();
              } catch {
                Alert.alert("Erro", "Não foi possível remover.");
              }
            },
          },
        ],
      );
    } else {
      Alert.alert(
        "Remover despesa",
        `${cat} - ${formatCurrency(Number(expense.amount))}`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Remover",
            style: "destructive",
            onPress: async () => {
              try {
                removeFromCache(expense.id);
                await deleteExpense(expense.id, user.id);
                invalidateAllBalance();
                refetchAfterMutation();
              } catch {
                Alert.alert("Erro", "Não foi possível remover.");
              }
            },
          },
        ],
      );
    }
  }

  async function handleSettle(expense: ExpenseEntry) {
    if (!user) return;
    Alert.alert(
      "Quitar parcelas",
      `Deseja quitar todas as parcelas restantes a partir da ${expense.installmentNumber}/${expense.installmentCount}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          onPress: async () => {
            try {
              await settleInstallments(expense.id, user.id);
              setEditingId(null);
              invalidateAllBalance();
              refetchAfterMutation();
              Alert.alert("Sucesso", "Parcelas quitadas!");
            } catch (error: any) {
              const msg =
                error?.response?.data?.message ??
                "Não foi possível quitar.";
              Alert.alert(
                "Erro",
                Array.isArray(msg) ? msg.join("\n") : msg,
              );
            }
          },
        },
      ],
    );
  }

  // ── Salary edit handlers ─────────────────────────────────────────
  function startEditSalary(salary: SalaryWithAmount) {
    const amount = Number(salary.activeAmount ?? salary.history?.[0]?.amount ?? 0);
    setSalaryForm({
      name: salary.name,
      amount: maskCurrency(String(Math.round(amount * 100))),
      isMain: salary.isMain,
    });
    setEditingSalaryId(salary.id);
  }

  function cancelEditSalary() {
    setEditingSalaryId(null);
  }

  async function handleSaveSalary() {
    if (!editingSalaryId || !user) return;
    const amount = currencyToNumber(salaryForm.amount);
    if (!salaryForm.name.trim())
      return Alert.alert("Atenção", "Preencha o nome.");
    if (amount <= 0)
      return Alert.alert("Atenção", "Informe um valor válido.");

    setSavingSalary(true);
    try {
      await updateSalary(editingSalaryId, user.id, {
        name: salaryForm.name,
        amount,
        isMain: salaryForm.isMain,
        month: currentMonth,
        year: currentYear,
      });
      setEditingSalaryId(null);
      invalidateAllBalance();
      invalidateAllSalaries();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ?? "Não foi possível salvar.";
      Alert.alert("Erro", Array.isArray(msg) ? msg.join("\n") : msg);
    } finally {
      setSavingSalary(false);
    }
  }

  async function handleDeleteSalary(salary: SalaryWithAmount) {
    if (!user) return;
    Alert.alert("Remover receita", `Deseja remover "${salary.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSalary(salary.id, user.id);
            invalidateAllBalance();
            invalidateAllSalaries();
          } catch {
            Alert.alert("Erro", "Não foi possível remover.");
          }
        },
      },
    ]);
  }

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

  const inputClass =
    "bg-gray-50 dark:bg-gray-500 text-gray-700 dark:text-gray-100 rounded-lg px-4 py-3 text-base";

  if (!user) return null;

  const { hidden, toggle: toggleHidden } = useHideValues();
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
                    <View
                      key={salary.id}
                      className="bg-white dark:bg-gray-600 rounded-2xl p-5"
                    >
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-gray-700 dark:text-gray-100 text-base font-bold">
                          Editar receita
                        </Text>
                        <TouchableOpacity
                          onPress={cancelEditSalary}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close" size={22} color="#7C7C8A" />
                        </TouchableOpacity>
                      </View>
                      <View className="gap-3">
                        <TextInput
                          className={inputClass}
                          placeholder="Nome (ex: Salário CLT)"
                          placeholderTextColor="#7C7C8A"
                          value={salaryForm.name}
                          onChangeText={(v) =>
                            setSalaryForm((p) => ({ ...p, name: v }))
                          }
                        />
                        <View
                          className={`${inputClass} flex-row items-center`}
                        >
                          <Text className="text-gray-300 dark:text-gray-200 text-base mr-1">
                            R$
                          </Text>
                          <TextInput
                            className="flex-1 text-gray-700 dark:text-gray-100 text-base p-0"
                            keyboardType="numeric"
                            value={salaryForm.amount}
                            onChangeText={(v) =>
                              setSalaryForm((p) => ({
                                ...p,
                                amount: maskCurrency(v),
                              }))
                            }
                            selection={{
                              start: salaryForm.amount.length,
                              end: salaryForm.amount.length,
                            }}
                          />
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text className="text-gray-300 dark:text-gray-200 text-sm">
                            Renda principal
                          </Text>
                          <Switch
                            value={salaryForm.isMain}
                            onValueChange={(v) =>
                              setSalaryForm((p) => ({ ...p, isMain: v }))
                            }
                            trackColor={{ false: "#29292E", true: "#00875F" }}
                            thumbColor="#fff"
                          />
                        </View>
                        <View className="flex-row gap-3 mt-2">
                          <TouchableOpacity
                            className="w-12 border border-red-500 rounded-lg py-3 items-center"
                            activeOpacity={0.7}
                            onPress={() => {
                              cancelEditSalary();
                              handleDeleteSalary(salary);
                            }}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color="#EF4444"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="flex-1 border border-gray-200 dark:border-gray-400 rounded-lg py-3 items-center"
                            activeOpacity={0.7}
                            onPress={cancelEditSalary}
                          >
                            <Text className="text-gray-300 text-sm font-bold">
                              Cancelar
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="flex-1 bg-green-700 rounded-lg py-3 items-center"
                            activeOpacity={0.7}
                            onPress={handleSaveSalary}
                            disabled={savingSalary}
                          >
                            {savingSalary ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <Text className="text-white text-sm font-bold">
                                Salvar
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
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
                    onPress={() => startEditSalary(salary)}
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
                      const isFinancing = !!expense.financingDetail;
                      return (
                        <View
                          key={expense.id}
                          className="bg-white dark:bg-gray-600 rounded-2xl p-5"
                        >
                          <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-gray-700 dark:text-gray-100 text-base font-bold">
                              {isFinancing ? "Detalhes" : "Editar despesa"}
                            </Text>
                            <TouchableOpacity
                              onPress={cancelEdit}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="close"
                                size={22}
                                color="#7C7C8A"
                              />
                            </TouchableOpacity>
                          </View>
                          <View className="gap-3">
                            <View
                              className={`${inputClass} flex-row items-center ${isFinancing ? "opacity-50" : ""}`}
                            >
                              <Text className="text-gray-300 dark:text-gray-200 text-base mr-1">
                                R$
                              </Text>
                              <TextInput
                                className="flex-1 text-gray-700 dark:text-gray-100 text-base p-0"
                                keyboardType="numeric"
                                editable={!isFinancing}
                                value={editForm.amount}
                                onChangeText={(v) =>
                                  setEditForm((p) => ({
                                    ...p,
                                    amount: maskCurrency(v),
                                  }))
                                }
                                selection={
                                  !isFinancing
                                    ? {
                                        start: editForm.amount.length,
                                        end: editForm.amount.length,
                                      }
                                    : undefined
                                }
                              />
                            </View>

                            {!isFinancing && (
                              <>
                                <View>
                                  <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">
                                    Categoria
                                  </Text>
                                  <View className="flex-row flex-wrap gap-2">
                                    {CATEGORIES.map((cat) => (
                                      <TouchableOpacity
                                        key={cat.value}
                                        onPress={() =>
                                          setEditForm((p) => ({
                                            ...p,
                                            category:
                                              p.category === cat.value
                                                ? ""
                                                : cat.value,
                                          }))
                                        }
                                        className={`px-3 py-2 rounded-lg ${editForm.category === cat.value ? "bg-orange-600" : "bg-gray-50 dark:bg-gray-500"}`}
                                        activeOpacity={0.7}
                                      >
                                        <Text
                                          className={`text-xs ${editForm.category === cat.value ? "text-white font-bold" : "text-gray-300 dark:text-gray-200"}`}
                                        >
                                          {cat.label}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                </View>
                                <View>
                                  <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">
                                    Pagamento
                                  </Text>
                                  <View className="flex-row flex-wrap gap-2">
                                    {PAYMENT_TYPES.map((pt) => (
                                      <TouchableOpacity
                                        key={pt.value}
                                        onPress={() =>
                                          setEditForm((p) => ({
                                            ...p,
                                            paymentType:
                                              p.paymentType === pt.value
                                                ? ""
                                                : pt.value,
                                          }))
                                        }
                                        className={`px-3 py-2 rounded-lg ${editForm.paymentType === pt.value ? "bg-orange-600" : "bg-gray-50 dark:bg-gray-500"}`}
                                        activeOpacity={0.7}
                                      >
                                        <Text
                                          className={`text-xs ${editForm.paymentType === pt.value ? "text-white font-bold" : "text-gray-300 dark:text-gray-200"}`}
                                        >
                                          {pt.label}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                </View>
                                {banks.length > 0 && (
                                  <View>
                                    <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">
                                      Banco
                                    </Text>
                                    <View className="flex-row flex-wrap gap-2">
                                      {banks.map((bank) => (
                                        <TouchableOpacity
                                          key={bank.id}
                                          onPress={() =>
                                            setEditForm((p) => ({
                                              ...p,
                                              bankId:
                                                p.bankId === bank.id
                                                  ? ""
                                                  : bank.id,
                                            }))
                                          }
                                          className={`px-3 py-2 rounded-lg ${editForm.bankId === bank.id ? "bg-orange-600" : "bg-gray-50 dark:bg-gray-500"}`}
                                          activeOpacity={0.7}
                                        >
                                          <Text
                                            className={`text-xs ${editForm.bankId === bank.id ? "text-white font-bold" : "text-gray-300 dark:text-gray-200"}`}
                                          >
                                            {bank.name} • {bank.documentType}
                                          </Text>
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                  </View>
                                )}
                              </>
                            )}

                            {/* Divisão */}
                            <View className="flex-row gap-3">
                              <View className="flex-1">
                                <Text className="text-gray-300 dark:text-gray-200 text-xs mb-1">
                                  Dividir em
                                </Text>
                                <TextInput
                                  className={`${inputClass} text-center`}
                                  keyboardType="numeric"
                                  maxLength={2}
                                  value={editForm.splitParts}
                                  onChangeText={(v) =>
                                    setEditForm((p) => ({
                                      ...p,
                                      splitParts: v,
                                    }))
                                  }
                                />
                              </View>
                              <View className="flex-1">
                                <Text className="text-gray-300 dark:text-gray-200 text-xs mb-1">
                                  Suas partes
                                </Text>
                                <TextInput
                                  className={`${inputClass} text-center`}
                                  keyboardType="numeric"
                                  maxLength={2}
                                  value={editForm.userPart}
                                  onChangeText={(v) =>
                                    setEditForm((p) => ({
                                      ...p,
                                      userPart: v,
                                    }))
                                  }
                                />
                              </View>
                            </View>

                            {/* Infos de financiamento — read only */}
                            {expense.financingDetail && (
                              <View className="bg-purple-50 dark:bg-purple-900 rounded-lg p-3">
                                <Text className="text-purple-500 text-xs font-bold mb-2">
                                  {expense.financingDetail.financingType ===
                                  "PERSONAL_LOAN"
                                    ? "Empréstimo"
                                    : expense.financingDetail.financingType ===
                                        "VEHICLE"
                                      ? "Veículo"
                                      : expense.financingDetail
                                            .financingType === "PROPERTY"
                                        ? "Imóvel"
                                        : "Outro"}
                                  {" • "}
                                  {
                                    expense.financingDetail.amortizationType
                                  }{" "}
                                  •{" "}
                                  {(
                                    Number(
                                      expense.financingDetail.interestRate,
                                    ) * 100
                                  ).toFixed(2)}
                                  % a.m.
                                  {Number(
                                    expense.financingDetail.monetaryCorrection,
                                  ) > 0
                                    ? ` • TR: ${(Number(expense.financingDetail.monetaryCorrection) * 100).toFixed(4)}%`
                                    : ""}
                                </Text>
                                <Text className="text-gray-300 dark:text-gray-200 text-[10px]">
                                  Total: R${" "}
                                  {Number(
                                    expense.financingDetail.totalAmount,
                                  ).toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}
                                </Text>
                                <Text className="text-gray-300 dark:text-gray-200 text-[10px]">
                                  Parcelas:{" "}
                                  {
                                    expense.financingDetail.paidInstallments
                                  }
                                  /
                                  {
                                    expense.financingDetail.totalInstallments
                                  }{" "}
                                  pagas
                                </Text>
                                {expense.financingDetail.fees &&
                                  expense.financingDetail.fees.length > 0 && (
                                    <View className="mt-2 border-t border-purple-200 dark:border-purple-800 pt-2">
                                      <Text className="text-gray-300 dark:text-gray-200 text-[10px] font-bold mb-1">
                                        Taxas:
                                      </Text>
                                      {expense.financingDetail.fees.map(
                                        (fee, i) => {
                                          const val = Number(fee.value);
                                          const typeLabel =
                                            fee.type === "FIXED"
                                              ? "Fixo"
                                              : fee.type === "ON_BALANCE"
                                                ? "S/ saldo"
                                                : fee.type ===
                                                    "ON_INSTALLMENT"
                                                  ? "S/ parcela"
                                                  : "S/ total";
                                          const valueLabel =
                                            fee.type === "FIXED"
                                              ? `R$ ${val.toFixed(2)}`
                                              : `${(val * 100).toFixed(4)}%`;
                                          return (
                                            <Text
                                              key={i}
                                              className="text-gray-300 dark:text-gray-200 text-[10px]"
                                            >
                                              • {fee.name}: {valueLabel} (
                                              {typeLabel})
                                            </Text>
                                          );
                                        },
                                      )}
                                    </View>
                                  )}
                              </View>
                            )}

                            {expense.installmentCount > 1 && (
                              <TouchableOpacity
                                className="bg-green-700 rounded-lg py-3 items-center mt-2"
                                activeOpacity={0.7}
                                onPress={() => handleSettle(expense)}
                              >
                                <Text className="text-white text-sm font-bold">
                                  Quitar parcelas (
                                  {expense.installmentNumber}/
                                  {expense.installmentCount})
                                </Text>
                              </TouchableOpacity>
                            )}

                            <View className="flex-row gap-3 mt-2">
                              <TouchableOpacity
                                className="w-12 border border-red-500 rounded-lg py-3 items-center"
                                activeOpacity={0.7}
                                onPress={() => {
                                  cancelEdit();
                                  handleDelete(expense);
                                }}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={18}
                                  color="#EF4444"
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                className="flex-1 border border-gray-200 dark:border-gray-400 rounded-lg py-3 items-center"
                                activeOpacity={0.7}
                                onPress={cancelEdit}
                              >
                                <Text className="text-gray-300 text-sm font-bold">
                                  Cancelar
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                className="flex-1 bg-green-700 rounded-lg py-3 items-center"
                                activeOpacity={0.7}
                                onPress={handleSaveEdit}
                                disabled={saving}
                              >
                                {saving ? (
                                  <ActivityIndicator color="#fff" />
                                ) : (
                                  <Text className="text-white text-sm font-bold">
                                    Salvar
                                  </Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <View key={expense.id}>
                        <ExpenseItem
                          expense={expense}
                          onPress={() => startEdit(expense)}
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
