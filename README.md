# 💎 Financ — Sistema de Gestão Financeira + Bot WhatsApp & Telegram

Sistema completo de controle financeiro pessoal e empresarial construído com **React 19 + TypeScript + TailwindCSS + Firebase Firestore**, integrado a um **Bot Inteligente para WhatsApp (via Evolution API)** e **Telegram** com suporte a IA (Google Gemini).

---

## 📁 Estrutura do Repositório

```
├── src/                     # Aplicação Web (Frontend React 19 + Vite)
│   ├── components/          # Componentes visuais e modais
│   ├── context/             # AppContext com sincronização em tempo real (onSnapshot)
│   ├── pages/               # Dashboard, Extrato, Orçamentos, Configurações, etc.
│   ├── services/            # Serviços de Firebase, Pluggy e Notificações
│   └── types/               # Tipagens TypeScript
│
├── bot/                     # Serviço do Bot (WhatsApp Evolution API + Telegram)
│   ├── src/
│   │   ├── config/          # Variáveis de ambiente e credenciais
│   │   ├── handlers/        # Webhook da Evolution API e Mensagens
│   │   ├── services/        # Firebase Firestore, Evolution API, Telegram, Gemini AI
│   │   └── templates/       # Formatação de respostas BRL com emojis
│   ├── docker-compose.yml   # 1-Click Setup: Evolution API v2 + Redis + Bot
│   ├── Dockerfile
│   └── README.md            # Guia detalhado do Bot
│
└── package.json
```

---

## ⚡ Início Rápido

### 1. Aplicação Web (Frontend)

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Abra o navegador em `http://localhost:5173`.

### 2. Bot de WhatsApp (Evolution API) & Telegram

```bash
# Entrar na pasta do bot
cd bot

# Instalar dependências
npm install

# Iniciar o bot em modo dev
npm run dev
```

Para subir a infraestrutura completa de WhatsApp com Docker:
```bash
cd bot
docker compose up -d --build
```

---

## 📲 Recursos do Assistente Virtual

- **Linguagem Natural**: *"Gastei 45 no almoço"*, *"Gasolina 150 no nubank"*, *"Recebi 3500 de salário"*.
- **Consultas por Data**: *"Quanto gastei hoje?"*, *"Gastos de ontem"*, *"Resumo de agosto"*.
- **Saldos e Contas**: *"Qual meu saldo?"*, *"Contas a pagar"*.
- **Tempo Real**: Qualquer gasto enviado pelo WhatsApp/Telegram atualiza a tela do computador instantaneamente!
