# Finance Mobile

Aplicativo mobile de controle financeiro pessoal desenvolvido com React Native e Expo.

## Funcionalidades

### Inicio
- Visao geral do balanco mensal (receitas x despesas)
- Cadastro rapido de renda, despesa, emprestimo e financiamento
- Lista de receitas do mes com edicao inline
- Lista de despesas agrupadas por banco com edicao inline
- Foto de perfil no avatar com navegacao para o perfil
- Ocultacao de valores sensiveis (persistente)

### Transacoes
- Navegacao por mes com paginacao horizontal infinita
- Receitas do mes com edicao inline (nome, valor, renda principal)
- Despesas agrupadas por banco com separacao PF/PJ
- Edicao completa de despesas (valor, categoria, pagamento, banco, divisao)
- Suporte a despesas recorrentes, parceladas e financiamentos
- Detalhes de financiamento (amortizacao, juros, taxas)
- Quitar parcelas e remover despesas (individual ou futuras)
- Balanco do mes (receitas - despesas) com indicador verde/vermelho

### Balanco
- Seletor de mes e ano para consulta
- Card de balanco com receitas e despesas
- Grafico donut de gastos por banco (cores personalizadas por banco)
- Gastos por categoria com barras de progresso
- Gastos por forma de pagamento

### Perfil
- Foto de perfil com upload para Supabase Storage
- Edicao de dados pessoais (nome, sobrenome)
- Edicao de endereco com busca automatica por CEP (ViaCEP)
- Cadastro e edicao de bancos com seletor de cores (preset + hex)
- Listagem de bancos com avatar colorido
- Remocao de bancos

### Geral
- Autenticacao JWT com refresh token automatico
- Tema claro/escuro automatico
- Ocultacao de valores em todas as telas (sincronizado, persistente)
- Pull-to-refresh em todas as telas
- Cache inteligente com React Query (prefetch de meses adjacentes)
- Reset automatico para mes corrente ao navegar entre telas

## Tecnologias

| Tecnologia | Uso |
|---|---|
| React Native + Expo | Framework mobile |
| Expo Router | Navegacao baseada em arquivos |
| TypeScript | Tipagem estatica |
| NativeWind (Tailwind CSS) | Estilizacao |
| TanStack React Query | Cache e gerenciamento de estado servidor |
| Axios | Requisicoes HTTP |
| Expo Secure Store | Armazenamento seguro de tokens |
| AsyncStorage | Preferencias locais (ocultacao de valores) |
| Expo Image Picker | Upload de foto de perfil |
| react-native-svg | Grafico donut |

## Estrutura do Projeto

```
app/
  (tabs)/
    _layout.tsx          # Layout das tabs
    index.tsx            # Tela Inicio
    transactions.tsx     # Tela Transacoes
    balance.tsx          # Tela Balanco
    profile.tsx          # Tela Perfil
    banks.tsx            # Tela Bancos (oculta das tabs)
  _layout.tsx            # Layout raiz (auth routing)
  index.tsx              # Tela Login
  register.tsx           # Tela Cadastro

components/
  expense-item.tsx       # Item de despesa reutilizavel
  month-page.tsx         # Pagina de mes (transacoes)
  donut-chart.tsx        # Grafico donut SVG
  color-picker.tsx       # Seletor de cores (preset + hex)
  skeleton-row.tsx       # Skeleton loading

hooks/
  use-balance.ts         # Hook de balanco mensal
  use-banks.ts           # Hook de bancos (cache 10min)
  use-expenses.ts        # Hook de despesas (prefetch adjacentes)
  use-salaries.ts        # Hook de receitas por mes
  use-hide-values.ts     # Hook de ocultacao de valores (global)
  use-color-scheme.ts    # Hook de tema claro/escuro

services/
  api.ts                 # Configuracao Axios + interceptors + refresh token
  auth.ts                # Login e registro
  user.ts                # CRUD usuario + upload imagem
  bank.ts                # CRUD bancos
  expense.ts             # CRUD despesas + quitar parcelas
  salary.ts              # CRUD receitas
  balance.ts             # Consulta balanco mensal
  financing.ts           # CRUD financiamentos
  recurring-expense.ts   # CRUD despesas recorrentes
  cep.ts                 # Busca endereco por CEP (ViaCEP)

contexts/
  auth.tsx               # Contexto de autenticacao
  query.tsx              # Configuracao React Query

utils/
  currency.ts            # Formatacao de moeda (R$)
  currency-input.ts      # Mascara de input monetario
  masks.ts               # Mascaras (CPF, data, CEP)
  name.ts                # Abreviacao de nomes e iniciais
  jwt.ts                 # Decode de JWT
```

## Pre-requisitos

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`) para build
- Conta em [expo.dev](https://expo.dev) para build na nuvem

## Instalacao

```bash
# Instalar dependencias
npm install

# Iniciar em desenvolvimento
npx expo start

# Limpar cache do Metro
npx expo start --clear
```

## Configuracao

O app se conecta a uma API backend. Configure a URL base em `services/api.ts`:

```typescript
export const API_BASE_URL = 'http://SEU_IP:3000';
```

## Build

```bash
# Gerar APK (Android)
eas build --platform android --profile preview

# Gerar AAB para Play Store
eas build --platform android --profile production
```

## Backend

Este app consome a API [finance-api](../finance-api) que oferece:

- Autenticacao JWT com refresh token
- CRUD de usuarios, bancos, despesas, receitas, financiamentos
- Despesas recorrentes e parceladas
- Balanco mensal agregado
- Upload de imagens via Supabase Storage
