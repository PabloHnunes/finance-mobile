import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createFinancing, FinancingType, AmortizationType, FinancingFee, FeeType } from '@/services/financing';
import { useBanks } from '@/hooks/use-banks';
import { PaymentType } from '@/services/expense';

const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: 'PIX', label: 'Pix' },
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'DEBIT', label: 'Débito' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'TRANSFER', label: 'Transferência' },
  { value: 'BOLETO', label: 'Boleto' },
];
import { maskCurrency, currencyToNumber } from '@/utils/currency-input';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const AMORTIZATION_TYPES: { value: AmortizationType; label: string }[] = [
  { value: 'SAC', label: 'SAC' },
  { value: 'PRICE', label: 'Price' },
];

type RateType = 'monthly' | 'nominal' | 'effective';

const RATE_TYPES: { value: RateType; label: string; placeholder: string }[] = [
  { value: 'monthly', label: 'Mensal', placeholder: 'Ex: 0.75' },
  { value: 'nominal', label: 'Nominal anual', placeholder: 'Ex: 9.0' },
  { value: 'effective', label: 'Efetiva anual', placeholder: 'Ex: 9.38' },
];

const LOAN_TYPES: { value: FinancingType; label: string }[] = [
  { value: 'PERSONAL_LOAN', label: 'Pessoal' },
];

const FINANCING_SUBTYPES: { value: FinancingType; label: string }[] = [
  { value: 'VEHICLE', label: 'Veículo' },
  { value: 'PROPERTY', label: 'Imóvel' },
  { value: 'OTHER', label: 'Outro' },
];

interface Props {
  userId: string;
  mode: 'loan' | 'financing';
  onSaved: () => void;
}

export function FinancingForm({ userId, mode, onSaved }: Props) {
  const now = new Date();
  const isLoan = mode === 'loan';
  const subtypes = isLoan ? LOAN_TYPES : FINANCING_SUBTYPES;
  const defaultType = isLoan ? 'PERSONAL_LOAN' : 'PROPERTY';

  const [form, setForm] = useState({
    description: '',
    financingType: defaultType as FinancingType,
    totalAmount: '0,00',
    rateValue: '',
    rateType: 'monthly' as RateType,
    monetaryCorrection: '',
    totalInstallments: '',
    paidInstallments: '',
    bankId: '',
    paymentType: '' as PaymentType | '',
    splitParts: '',
    userPart: '',
    amortizationType: 'PRICE' as AmortizationType,
    startMonth: now.getMonth() + 1,
    startYear: now.getFullYear(),
  });
  const [saving, setSaving] = useState(false);
  const { data: banks = [] } = useBanks(userId);
  const [fees, setFees] = useState<FinancingFee[]>([]);
  const [newFee, setNewFee] = useState({ name: '', type: 'FIXED' as FeeType, value: '' });

  const inputClass = 'bg-gray-50 dark:bg-gray-500 text-gray-700 dark:text-gray-100 rounded-lg px-4 py-3 text-base';

  async function handleSave() {
    const totalAmount = currencyToNumber(form.totalAmount);
    if (totalAmount <= 0) return Alert.alert('Atenção', 'Informe o valor total.');
    if (!form.rateValue.trim()) return Alert.alert('Atenção', 'Informe a taxa de juros.');
    if (!form.totalInstallments.trim()) return Alert.alert('Atenção', 'Informe o total de parcelas.');

    const rate = parseFloat(form.rateValue.replace(',', '.'));
    if (isNaN(rate) || rate <= 0) return Alert.alert('Atenção', 'Taxa de juros inválida.');

    const ratePayload: Record<string, number> = {};
    if (form.rateType === 'monthly') ratePayload.interestRate = rate / 100;
    if (form.rateType === 'nominal') ratePayload.nominalAnnualRate = rate / 100;
    if (form.rateType === 'effective') ratePayload.effectiveAnnualRate = rate / 100;

    setSaving(true);
    try {
      await createFinancing(userId, {
        description: form.description || undefined,
        financingType: form.financingType,
        amortizationType: form.amortizationType,
        totalAmount,
        ...ratePayload,
        monetaryCorrection: form.monetaryCorrection.trim() ? Number((parseFloat(form.monetaryCorrection.replace(',', '.')) / 100).toFixed(6)) : undefined,
        fees: fees.length > 0 ? fees : undefined,
        totalInstallments: parseInt(form.totalInstallments) || 1,
        paidInstallments: parseInt(form.paidInstallments) || 0,
        startMonth: form.startMonth,
        startYear: form.startYear,
        bankId: form.bankId || undefined,
        paymentType: form.paymentType || undefined,
        splitParts: parseInt(form.splitParts) || undefined,
        userPart: parseInt(form.userPart) || undefined,
      });
      onSaved();
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? 'Não foi possível salvar.';
      Alert.alert('Erro', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Text className="text-gray-700 dark:text-gray-100 text-lg font-bold mb-4">
        {isLoan ? 'Empréstimo' : 'Financiamento'}
      </Text>
      <View className="gap-3">
        {/* Subtipo (só financiamento, empréstimo é sempre PERSONAL_LOAN) */}
        {!isLoan && (
          <View>
            <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Tipo</Text>
            <View className="flex-row gap-2">
              {subtypes.map((ft) => (
                <TouchableOpacity
                  key={ft.value}
                  onPress={() => setForm((p) => ({ ...p, financingType: ft.value }))}
                  className={`flex-1 py-3 rounded-lg items-center ${
                    form.financingType === ft.value ? 'bg-purple-500' : 'bg-gray-50 dark:bg-gray-500'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-xs ${form.financingType === ft.value ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`}>
                    {ft.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TextInput
          className={inputClass}
          placeholder={isLoan ? 'Descrição (ex: Empréstimo Pessoal)' : 'Descrição (ex: Financiamento Apartamento)'}
          placeholderTextColor="#7C7C8A"
          value={form.description}
          onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
        />

        <View className={`${inputClass} flex-row items-center`}>
          <Text className="text-gray-300 dark:text-gray-200 text-base mr-1">R$</Text>
          <TextInput
            className="flex-1 text-gray-700 dark:text-gray-100 text-base p-0"
            keyboardType="numeric"
            value={form.totalAmount}
            onChangeText={(v) => setForm((p) => ({ ...p, totalAmount: maskCurrency(v) }))}
            selection={{ start: form.totalAmount.length, end: form.totalAmount.length }}
          />
        </View>

        <View>
          <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Tipo de juros</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {RATE_TYPES.map((rt) => (
                <TouchableOpacity
                  key={rt.value}
                  onPress={() => setForm((p) => ({ ...p, rateType: rt.value, rateValue: '' }))}
                  className={`px-3 py-2 rounded-lg ${form.rateType === rt.value ? 'bg-purple-500' : 'bg-gray-50 dark:bg-gray-500'}`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-xs ${form.rateType === rt.value ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`}>
                    {rt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className={`${inputClass} flex-row items-center`}>
          <TextInput
            className="flex-1 text-gray-700 dark:text-gray-100 text-base p-0"
            keyboardType="decimal-pad"
            placeholder={RATE_TYPES.find((r) => r.value === form.rateType)?.placeholder}
            placeholderTextColor="#7C7C8A"
            value={form.rateValue}
            onChangeText={(v) => setForm((p) => ({ ...p, rateValue: v }))}
          />
          <Text className="text-gray-300 dark:text-gray-200 text-base ml-1">%</Text>
        </View>

        {/* Taxas/Fees */}
        <View className={`${inputClass} flex-row items-center`}>
          <TextInput
            className="flex-1 text-gray-700 dark:text-gray-100 text-base p-0"
            keyboardType="decimal-pad"
            placeholder="Correção monetária mensal (TR)"
            placeholderTextColor="#7C7C8A"
            value={form.monetaryCorrection}
            onChangeText={(v) => setForm((p) => ({ ...p, monetaryCorrection: v }))}
          />
          <Text className="text-gray-300 dark:text-gray-200 text-base ml-1">%</Text>
        </View>

        <View>
          <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Taxas adicionais</Text>
          {fees.map((fee, i) => (
            <View key={i} className="flex-row items-center bg-gray-50 dark:bg-gray-500 rounded-lg px-3 py-2 mb-2">
              <Text className="flex-1 text-gray-700 dark:text-gray-100 text-xs">
                {fee.name} • {fee.type === 'FIXED' ? 'Fixo' : fee.type === 'ON_BALANCE' ? 'S/ saldo' : fee.type === 'ON_INSTALLMENT' ? 'S/ parcela' : 'S/ total'} • R$ {fee.value}
              </Text>
              <TouchableOpacity onPress={() => setFees((f) => f.filter((_, idx) => idx !== i))}>
                <Ionicons name="close-circle" size={18} color="#7C7C8A" />
              </TouchableOpacity>
            </View>
          ))}
          <View className="gap-2 mb-1">
            <TextInput
              className={inputClass}
              placeholder="Nome (ex: Seguro)"
              placeholderTextColor="#7C7C8A"
              value={newFee.name}
              onChangeText={(v) => setNewFee((p) => ({ ...p, name: v }))}
            />
            <View className={`${inputClass} flex-row items-center`}>
              <Text className="text-gray-300 dark:text-gray-200 text-base mr-1">R$</Text>
              <TextInput
                className="flex-1 text-gray-700 dark:text-gray-100 text-base p-0"
                placeholder="0,00"
                placeholderTextColor="#7C7C8A"
                keyboardType="numeric"
                value={newFee.value}
                onChangeText={(v) => setNewFee((p) => ({ ...p, value: maskCurrency(v) }))}
              />
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <View className="flex-row gap-2">
              {([
                { value: 'FIXED', label: 'Fixo' },
                { value: 'ON_BALANCE', label: 'S/ saldo' },
                { value: 'ON_INSTALLMENT', label: 'S/ parcela' },
                { value: 'ON_TOTAL_AMOUNT', label: 'S/ total' },
              ] as { value: FeeType; label: string }[]).map((ft) => (
                <TouchableOpacity
                  key={ft.value}
                  onPress={() => setNewFee((p) => ({ ...p, type: ft.value }))}
                  className={`px-3 py-2 rounded-lg ${newFee.type === ft.value ? 'bg-purple-500' : 'bg-gray-50 dark:bg-gray-500'}`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-xs ${newFee.type === ft.value ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`}>{ft.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity
            className="border border-purple-500 rounded-lg py-2 items-center"
            activeOpacity={0.7}
            onPress={() => {
              if (!newFee.name.trim() || !newFee.value.trim()) return;
              setFees((f) => [...f, { name: newFee.name, type: newFee.type, value: currencyToNumber(newFee.value) }]);
              setNewFee({ name: '', type: 'FIXED', value: '' });
            }}
          >
            <Text className="text-purple-500 text-xs font-bold">+ Adicionar taxa</Text>
          </TouchableOpacity>
        </View>

        <View>
          <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Amortização</Text>
          <View className="flex-row gap-2">
            {AMORTIZATION_TYPES.map((at) => (
              <TouchableOpacity
                key={at.value}
                onPress={() => setForm((p) => ({ ...p, amortizationType: at.value }))}
                className={`flex-1 py-3 rounded-lg items-center ${
                  form.amortizationType === at.value ? 'bg-purple-500' : 'bg-gray-50 dark:bg-gray-500'
                }`}
                activeOpacity={0.7}
              >
                <Text className={`text-sm ${form.amortizationType === at.value ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`}>
                  {at.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-gray-300 dark:text-gray-200 text-xs mb-1">Total parcelas</Text>
            <TextInput
              className={`${inputClass} text-center`}
              keyboardType="numeric"
              maxLength={4}
              value={form.totalInstallments}
              onChangeText={(v) => setForm((p) => ({ ...p, totalInstallments: v }))}
            />
          </View>
          <View className="flex-1">
            <Text className="text-gray-300 dark:text-gray-200 text-xs mb-1">Já pagas</Text>
            <TextInput
              className={`${inputClass} text-center`}
              keyboardType="numeric"
              maxLength={4}
              value={form.paidInstallments}
              onChangeText={(v) => setForm((p) => ({ ...p, paidInstallments: v }))}
            />
          </View>
        </View>

        {banks.length > 0 && (
          <View>
            <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Banco</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {banks.map((bank) => (
                  <TouchableOpacity
                    key={bank.id}
                    onPress={() => setForm((p) => ({ ...p, bankId: p.bankId === bank.id ? '' : bank.id }))}
                    className={`px-3 py-2 rounded-lg ${form.bankId === bank.id ? 'bg-purple-500' : 'bg-gray-50 dark:bg-gray-500'}`}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-xs ${form.bankId === bank.id ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`}>
                      {bank.name} • {bank.documentType}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View>
          <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Pagamento</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {PAYMENT_TYPES.map((pt) => (
                <TouchableOpacity
                  key={pt.value}
                  onPress={() => setForm((p) => ({ ...p, paymentType: p.paymentType === pt.value ? '' : pt.value }))}
                  className={`px-3 py-2 rounded-lg ${form.paymentType === pt.value ? 'bg-purple-500' : 'bg-gray-50 dark:bg-gray-500'}`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-xs ${form.paymentType === pt.value ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`}>
                    {pt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View>
          <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Mês de início</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setForm((p) => ({ ...p, startMonth: i + 1 }))}
                  className={`px-3 py-2 rounded-lg ${form.startMonth === i + 1 ? 'bg-purple-500' : 'bg-gray-50 dark:bg-gray-500'}`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-xs ${form.startMonth === i + 1 ? 'text-white font-bold' : 'text-gray-300 dark:text-gray-200'}`}>
                    {m.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className="flex-row items-center gap-3">
          <Text className="text-gray-300 dark:text-gray-200 text-xs">Ano de início</Text>
          <TextInput
            className={`${inputClass} w-24 text-center`}
            keyboardType="numeric"
            maxLength={4}
            value={String(form.startYear)}
            onChangeText={(v) => setForm((p) => ({ ...p, startYear: parseInt(v) || p.startYear }))}
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-gray-300 dark:text-gray-200 text-xs mb-1">Dividir em</Text>
            <TextInput
              className={`${inputClass} text-center`}
              placeholder="Partes"
              placeholderTextColor="#7C7C8A"
              keyboardType="numeric"
              maxLength={2}
              value={form.splitParts}
              onChangeText={(v) => setForm((p) => ({ ...p, splitParts: v }))}
            />
          </View>
          <View className="flex-1">
            <Text className="text-gray-300 dark:text-gray-200 text-xs mb-1">Suas partes</Text>
            <TextInput
              className={`${inputClass} text-center`}
              placeholder="Partes"
              placeholderTextColor="#7C7C8A"
              keyboardType="numeric"
              maxLength={2}
              value={form.userPart}
              onChangeText={(v) => setForm((p) => ({ ...p, userPart: v }))}
            />
          </View>
        </View>

        <TouchableOpacity className="bg-purple-500 rounded-lg py-4 items-center mt-2" activeOpacity={0.7} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-bold">Salvar</Text>}
        </TouchableOpacity>
      </View>
    </>
  );
}
