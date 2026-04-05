import { useAuth } from "@/contexts/auth";
import { useBanks } from "@/hooks/use-banks";
import { Bank, createBank, deleteBank, updateBank, DocumentType } from "@/services/bank";
import { fetchAddress } from "@/services/cep";
import { updateUser, uploadProfileImage } from "@/services/user";

import { maskCep, maskCpf, unmask } from "@/utils/masks";
import { getInitials } from "@/utils/name";
import { ColorPicker } from "@/components/color-picker";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "PF", label: "CPF" },
  { value: "CNPJ", label: "CNPJ" },
];

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export default function ProfileScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const {
    data: banks = [],
    isLoading: banksLoading,
    invalidate: invalidateBanks,
  } = useBanks(user?.id);

  // Profile image
  const [uploadingImage, setUploadingImage] = useState(false);

  // User edit
  const [editingUser, setEditingUser] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [userForm, setUserForm] = useState({
    firstName: "",
    lastName: "",
    zipCode: "",
    street: "",
    neighborhood: "",
    city: "",
    state: "",
    number: "",
  });

  // Banks
  const [showBanks, setShowBanks] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editBankForm, setEditBankForm] = useState({
    name: "",
    description: "",
    color: "",
  });
  const [savingBankEdit, setSavingBankEdit] = useState(false);
  const [bankForm, setBankForm] = useState({
    name: "",
    description: "",
    documentType: "PF" as DocumentType,
    documentNumber: "",
    color: "",
  });

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  if (!user) return null;

  const userId = user.id;
  const initials = getInitials(user.firstName, user.lastName);
  const inputClass =
    "bg-gray-50 dark:bg-gray-500 text-gray-700 dark:text-gray-100 rounded-lg px-4 py-3 text-base";

  // ── Image picker ──────────────────────────────────────────────────
  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos de acesso à galeria.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploadingImage(true);
    try {
      await uploadProfileImage(userId, result.assets[0].uri);
      await refreshUser();
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar a imagem.");
    } finally {
      setUploadingImage(false);
    }
  }

  // ── User edit ─���───────────────────────────────────────────────────
  function startEditUser() {
    setUserForm({
      firstName: user!.firstName,
      lastName: user!.lastName,
      zipCode: maskCep(user!.zipCode),
      street: user!.street,
      neighborhood: user!.neighborhood,
      city: user!.city,
      state: user!.state,
      number: user!.number,
    });
    setEditingUser(true);
  }

  function cancelEditUser() {
    setEditingUser(false);
    Keyboard.dismiss();
  }

  async function handleCepChange(value: string) {
    const masked = maskCep(value);
    setUserForm((p) => ({ ...p, zipCode: masked }));

    const digits = unmask(masked);
    if (digits.length !== 8) return;

    setCepLoading(true);
    try {
      const address = await fetchAddress(digits);
      if (address) {
        setUserForm((p) => ({
          ...p,
          street: address.street,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
        }));
      }
    } catch {
      // allow manual edit
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSaveUser() {
    if (!userForm.firstName.trim() || !userForm.lastName.trim()) {
      return Alert.alert("Atenção", "Preencha nome e sobrenome.");
    }

    setSavingUser(true);
    try {
      await updateUser(userId, {
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        street: userForm.street,
        neighborhood: userForm.neighborhood,
        city: userForm.city,
        state: userForm.state,
        number: userForm.number,
        zipCode: unmask(userForm.zipCode),
      });
      await refreshUser();
      setEditingUser(false);
      Keyboard.dismiss();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ?? "Não foi possível salvar.";
      Alert.alert("Erro", Array.isArray(msg) ? msg.join("\n") : msg);
    } finally {
      setSavingUser(false);
    }
  }

  // ── Bank handlers ─────────────────────────────────────────────────
  function openBankForm() {
    setBankForm({
      name: "",
      description: "",
      documentType: "PF",
      documentNumber: "",
      color: "",
    });
    setShowBankForm(true);
  }

  async function handleSaveBank() {
    if (!bankForm.name.trim())
      return Alert.alert("Atenção", "Preencha o nome do banco.");
    if (!bankForm.documentNumber.trim())
      return Alert.alert("Atenção", "Preencha o documento.");

    setSavingBank(true);
    try {
      await createBank(userId, {
        name: bankForm.name,
        description: bankForm.description || undefined,
        documentType: bankForm.documentType,
        documentNumber: unmask(bankForm.documentNumber),
        color: bankForm.color || undefined,
      });
      setShowBankForm(false);
      invalidateBanks();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ?? "Não foi possível salvar.";
      Alert.alert("Erro", Array.isArray(msg) ? msg.join("\n") : msg);
    } finally {
      setSavingBank(false);
    }
  }

  function startEditBank(bank: Bank) {
    setEditBankForm({
      name: bank.name,
      description: bank.description ?? "",
      color: bank.color ?? "",
    });
    setEditingBankId(bank.id);
  }

  function cancelEditBank() {
    setEditingBankId(null);
  }

  async function handleSaveBankEdit() {
    if (!editingBankId) return;
    if (!editBankForm.name.trim())
      return Alert.alert("Atenção", "Preencha o nome do banco.");

    setSavingBankEdit(true);
    try {
      await updateBank(editingBankId, userId, {
        name: editBankForm.name,
        description: editBankForm.description || undefined,
        color: editBankForm.color || null,
      });
      setEditingBankId(null);
      invalidateBanks();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ?? "Não foi possível salvar.";
      Alert.alert("Erro", Array.isArray(msg) ? msg.join("\n") : msg);
    } finally {
      setSavingBankEdit(false);
    }
  }

  async function handleDeleteBank(bank: Bank) {
    Alert.alert("Remover banco", `Deseja remover "${bank.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBank(bank.id, userId);
            invalidateBanks();
          } catch {
            Alert.alert("Erro", "Não foi possível remover.");
          }
        },
      },
    ]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }

  const maskDoc = bankForm.documentType === "PF" ? maskCpf : maskCnpj;
  const maxDocLength = bankForm.documentType === "PF" ? 14 : 18;

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-gray-700"
        contentContainerStyle={{
          paddingTop: 64,
          paddingHorizontal: 24,
          paddingBottom: 120,
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
        {/* ── Avatar + Nome ───────────────────────────────────────── */}
        <View className="items-center mb-6">
          <TouchableOpacity
            onPress={handlePickImage}
            activeOpacity={0.7}
            className="relative"
          >
            {user.profileImageUrl ? (
              <Image
                source={{ uri: user.profileImageUrl }}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-green-700 items-center justify-center">
                <Text className="text-white text-3xl font-bold">
                  {initials}
                </Text>
              </View>
            )}
            {uploadingImage ? (
              <View className="absolute inset-0 rounded-full bg-black/40 items-center justify-center">
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-green-700 items-center justify-center border-2 border-gray-50 dark:border-gray-700">
                <Ionicons name="camera-outline" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <Text className="text-gray-700 dark:text-gray-100 text-xl font-bold mt-3">
            {user.firstName} {user.lastName}
          </Text>
          <Text className="text-gray-300 dark:text-gray-200 text-sm">
            {user.email}
          </Text>
        </View>

        {/* ── Dados pessoais ──────────────────────────────────────── */}
        <View className="bg-white dark:bg-gray-600 rounded-2xl p-5 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-gray-700 dark:text-gray-100 text-base font-bold">
              Dados pessoais
            </Text>
            {!editingUser ? (
              <TouchableOpacity onPress={startEditUser} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={20} color="#00B37E" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={cancelEditUser} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#7C7C8A" />
              </TouchableOpacity>
            )}
          </View>

          {editingUser ? (
            <View className="gap-3">
              <View className="flex-row gap-3">
                <TextInput
                  className={`${inputClass} flex-1`}
                  placeholder="Nome"
                  placeholderTextColor="#7C7C8A"
                  value={userForm.firstName}
                  onChangeText={(v) =>
                    setUserForm((p) => ({ ...p, firstName: v }))
                  }
                />
                <TextInput
                  className={`${inputClass} flex-1`}
                  placeholder="Sobrenome"
                  placeholderTextColor="#7C7C8A"
                  value={userForm.lastName}
                  onChangeText={(v) =>
                    setUserForm((p) => ({ ...p, lastName: v }))
                  }
                />
              </View>

              <Text className="text-gray-300 dark:text-gray-200 text-xs font-bold mt-2 uppercase">
                Endereço
              </Text>

              <View className="flex-row items-center gap-3">
                <TextInput
                  className={`${inputClass} flex-1`}
                  placeholder="00000-000"
                  placeholderTextColor="#7C7C8A"
                  keyboardType="numeric"
                  maxLength={9}
                  value={userForm.zipCode}
                  onChangeText={handleCepChange}
                />
                {cepLoading && <ActivityIndicator color="#00B37E" />}
              </View>

              <TextInput
                className={inputClass}
                placeholder="Rua"
                placeholderTextColor="#7C7C8A"
                value={userForm.street}
                onChangeText={(v) =>
                  setUserForm((p) => ({ ...p, street: v }))
                }
              />

              <View className="flex-row gap-3">
                <TextInput
                  className={`${inputClass} w-24`}
                  placeholder="Nº"
                  placeholderTextColor="#7C7C8A"
                  keyboardType="numeric"
                  value={userForm.number}
                  onChangeText={(v) =>
                    setUserForm((p) => ({ ...p, number: v }))
                  }
                />
                <TextInput
                  className={`${inputClass} flex-1`}
                  placeholder="Bairro"
                  placeholderTextColor="#7C7C8A"
                  value={userForm.neighborhood}
                  onChangeText={(v) =>
                    setUserForm((p) => ({ ...p, neighborhood: v }))
                  }
                />
              </View>

              <View className="flex-row gap-3">
                <TextInput
                  className={`${inputClass} flex-1`}
                  placeholder="Cidade"
                  placeholderTextColor="#7C7C8A"
                  value={userForm.city}
                  onChangeText={(v) =>
                    setUserForm((p) => ({ ...p, city: v }))
                  }
                />
                <TextInput
                  className={`${inputClass} w-20`}
                  placeholder="UF"
                  placeholderTextColor="#7C7C8A"
                  autoCapitalize="characters"
                  maxLength={2}
                  value={userForm.state}
                  onChangeText={(v) =>
                    setUserForm((p) => ({ ...p, state: v }))
                  }
                />
              </View>

              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  className="flex-1 border border-gray-200 dark:border-gray-400 rounded-lg py-3 items-center"
                  activeOpacity={0.7}
                  onPress={cancelEditUser}
                >
                  <Text className="text-gray-300 text-sm font-bold">
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-green-700 rounded-lg py-3 items-center"
                  activeOpacity={0.7}
                  onPress={handleSaveUser}
                  disabled={savingUser}
                >
                  {savingUser ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-sm font-bold">
                      Salvar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="gap-2">
              <InfoRow label="Nome" value={`${user.firstName} ${user.lastName}`} />
              <InfoRow label="Usuário" value={user.username} />
              <InfoRow label="CPF" value={(() => { const d = user.cpf.replace(/\D/g, ''); return `***.***.${d.slice(-5, -2)}-${d.slice(-2)}`; })() } />
              <View className="pt-1">
                <Text className="text-gray-300 dark:text-gray-200 text-xs mb-1">
                  Endereço
                </Text>
                <Text className="text-gray-700 dark:text-gray-100 text-sm font-medium">
                  {user.street}, {user.number}
                </Text>
                <Text className="text-gray-700 dark:text-gray-100 text-sm font-medium">
                  {user.neighborhood}
                </Text>
                <Text className="text-gray-700 dark:text-gray-100 text-sm font-medium">
                  {user.city} - {user.state}
                </Text>
                <Text className="text-gray-700 dark:text-gray-100 text-sm font-medium">
                  {maskCep(user.zipCode)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Bancos ──────────────────────────────────────────────── */}
        <TouchableOpacity
          className="bg-white dark:bg-gray-600 rounded-2xl p-5 mb-1 flex-row items-center justify-between"
          activeOpacity={0.7}
          onPress={() => setShowBanks(!showBanks)}
        >
          <View className="flex-row items-center gap-3">
            <Ionicons name="wallet-outline" size={22} color="#00B37E" />
            <Text className="text-gray-700 dark:text-gray-100 text-base font-bold">
              Bancos
            </Text>
            <View className="bg-green-700 rounded-full px-2 py-0.5">
              <Text className="text-white text-xs font-bold">
                {banks.length}
              </Text>
            </View>
          </View>
          <Ionicons
            name={showBanks ? "chevron-up" : "chevron-down"}
            size={20}
            color="#7C7C8A"
          />
        </TouchableOpacity>

        {showBanks && (
          <View className="bg-white dark:bg-gray-600 rounded-2xl p-5 mb-4 mt-1">
            {/* Add bank button */}
            <TouchableOpacity
              onPress={() => setShowBankForm(!showBankForm)}
              className="flex-row items-center gap-2 mb-4"
              activeOpacity={0.7}
            >
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${showBankForm ? "bg-gray-400" : "bg-green-700"}`}
              >
                <Ionicons
                  name={showBankForm ? "close" : "add"}
                  size={18}
                  color="#fff"
                />
              </View>
              <Text className="text-gray-700 dark:text-gray-100 text-sm font-bold">
                {showBankForm ? "Cancelar" : "Novo banco"}
              </Text>
            </TouchableOpacity>

            {/* Bank form */}
            {showBankForm && (
              <View className="gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-500">
                <TextInput
                  className={inputClass}
                  placeholder="Nome (ex: Nubank)"
                  placeholderTextColor="#7C7C8A"
                  value={bankForm.name}
                  onChangeText={(v) =>
                    setBankForm((p) => ({ ...p, name: v }))
                  }
                />
                <TextInput
                  className={inputClass}
                  placeholder="Descrição (opcional)"
                  placeholderTextColor="#7C7C8A"
                  value={bankForm.description}
                  onChangeText={(v) =>
                    setBankForm((p) => ({ ...p, description: v }))
                  }
                />
                <View>
                  <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">
                    Tipo de documento
                  </Text>
                  <View className="flex-row gap-2">
                    {DOC_TYPES.map((dt) => (
                      <TouchableOpacity
                        key={dt.value}
                        onPress={() =>
                          setBankForm((p) => ({
                            ...p,
                            documentType: dt.value,
                            documentNumber: "",
                          }))
                        }
                        className={`flex-1 py-3 rounded-lg items-center ${
                          bankForm.documentType === dt.value
                            ? "bg-green-700"
                            : "bg-gray-50 dark:bg-gray-500"
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-sm ${bankForm.documentType === dt.value ? "text-white font-bold" : "text-gray-300 dark:text-gray-200"}`}
                        >
                          {dt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TextInput
                  className={inputClass}
                  placeholder={
                    bankForm.documentType === "PF" ? "CPF" : "CNPJ"
                  }
                  placeholderTextColor="#7C7C8A"
                  keyboardType="numeric"
                  maxLength={maxDocLength}
                  value={bankForm.documentNumber}
                  onChangeText={(v) =>
                    setBankForm((p) => ({
                      ...p,
                      documentNumber: maskDoc(v),
                    }))
                  }
                />
                <View>
                  <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">
                    Cor
                  </Text>
                  <ColorPicker
                    value={bankForm.color}
                    onChange={(c) => setBankForm((p) => ({ ...p, color: c }))}
                  />
                </View>
                <TouchableOpacity
                  className="bg-green-700 rounded-lg py-3 items-center"
                  activeOpacity={0.7}
                  onPress={handleSaveBank}
                  disabled={savingBank}
                >
                  {savingBank ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-sm font-bold">
                      Salvar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Bank list */}
            {banksLoading ? (
              <ActivityIndicator color="#00B37E" />
            ) : banks.length === 0 ? (
              <View className="items-center py-4">
                <Text className="text-gray-300 dark:text-gray-200 text-sm">
                  Nenhum banco cadastrado
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {banks.map((bank) => {
                  if (editingBankId === bank.id) {
                    return (
                      <View key={bank.id} className="bg-gray-50 dark:bg-gray-500 rounded-xl p-4">
                        <View className="flex-row items-center justify-between mb-3">
                          <Text className="text-gray-700 dark:text-gray-100 text-sm font-bold">
                            Editar banco
                          </Text>
                          <TouchableOpacity onPress={cancelEditBank} activeOpacity={0.7}>
                            <Ionicons name="close" size={20} color="#7C7C8A" />
                          </TouchableOpacity>
                        </View>
                        <View className="gap-3">
                          <TextInput
                            className={inputClass}
                            placeholder="Nome"
                            placeholderTextColor="#7C7C8A"
                            value={editBankForm.name}
                            onChangeText={(v) => setEditBankForm((p) => ({ ...p, name: v }))}
                          />
                          <TextInput
                            className={inputClass}
                            placeholder="Descrição (opcional)"
                            placeholderTextColor="#7C7C8A"
                            value={editBankForm.description}
                            onChangeText={(v) => setEditBankForm((p) => ({ ...p, description: v }))}
                          />
                          <View>
                            <Text className="text-gray-300 dark:text-gray-200 text-xs mb-2">Cor</Text>
                            <ColorPicker
                              value={editBankForm.color}
                              onChange={(c) => setEditBankForm((p) => ({ ...p, color: c }))}
                            />
                          </View>
                          <View className="flex-row gap-3 mt-1">
                            <TouchableOpacity
                              className="w-12 border border-red-500 rounded-lg py-3 items-center"
                              activeOpacity={0.7}
                              onPress={() => { cancelEditBank(); handleDeleteBank(bank); }}
                            >
                              <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              className="flex-1 border border-gray-200 dark:border-gray-400 rounded-lg py-3 items-center"
                              activeOpacity={0.7}
                              onPress={cancelEditBank}
                            >
                              <Text className="text-gray-300 text-sm font-bold">Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              className="flex-1 bg-green-700 rounded-lg py-3 items-center"
                              activeOpacity={0.7}
                              onPress={handleSaveBankEdit}
                              disabled={savingBankEdit}
                            >
                              {savingBankEdit ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <Text className="text-white text-sm font-bold">Salvar</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={bank.id}
                      className="flex-row items-center"
                      activeOpacity={0.7}
                      onPress={() => startEditBank(bank)}
                    >
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: bank.color || "#00B37E" }}
                      >
                        <Text className="text-white text-base font-bold">
                          {bank.name[0]}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-700 dark:text-gray-100 text-sm font-bold">
                          {bank.name}{" "}
                          <Text className="text-gray-300 text-xs font-normal">
                            • {bank.documentType}
                          </Text>
                        </Text>
                        {bank.description ? (
                          <Text className="text-gray-300 dark:text-gray-200 text-xs">
                            {bank.description}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#7C7C8A" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {!showBanks && <View className="mb-4" />}

        {/* ── Opções ──────────────────────────────────────────────── */}
        <View className="bg-white dark:bg-gray-600 rounded-2xl overflow-hidden mb-4">
          <TouchableOpacity
            className="flex-row items-center gap-3 p-5"
            activeOpacity={0.7}
            onPress={signOut}
          >
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            <Text className="text-red-500 text-base font-bold">Sair</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-gray-300 dark:text-gray-200 text-xs">{label}</Text>
      <Text className="text-gray-700 dark:text-gray-100 text-sm font-medium">
        {value}
      </Text>
    </View>
  );
}
