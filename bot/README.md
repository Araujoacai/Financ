# 🤖 Financ Bot — WhatsApp (Evolution API) & Telegram

Bot inteligente para **WhatsApp** (via [Evolution API](https://github.com/EvolutionAPI/evolution-api)) e **Telegram**, integrado em tempo real com o sistema de gestão financeira **[Financ](https://github.com/Araujoacai/Financ)** através do **Firebase Firestore**.

---

## 🌟 Funcionalidades

- **Registro de Despesas & Receitas por Linguagem Natural:**
  - *"Gastei 45 no almoço"* ➔ Adiciona despesa de R$ 45,00 em *Alimentação*, deduz do saldo da conta e atualiza os limites de orçamento.
  - *"Gasolina 150 no cartão nubank"* ➔ Registra despesa de R$ 150,00 na conta Nubank.
  - *"Recebi 3500 de salário"* ➔ Registra receita de R$ 3.500,00 na categoria *Salário*.
- **Consultas por Data e Período:**
  - *"Quanto gastei hoje?"* ou *"Hoje"* ➔ Extrato detalhado e total do dia.
  - *"Gastos de ontem"* ou *"Ontem"* ➔ Relatório do dia anterior.
  - *"Gastos deste mês"* ou *"Resumo de agosto"* ➔ Balanço mensal agrupado por categorias.
- **Consultas Gerais:**
  - *"Qual meu saldo?"* ➔ Exibe todas as contas bancárias e o saldo total consolidado.
  - *"Contas a pagar"* / *"Boletos"* ➔ Lista contas pendentes e datas de vencimento.
- **Inteligência Artificial (Google Gemini AI):**
  - Compreende mensagens informais com alta precisão e possui fallback com motor Regex em português.
- **Sincronização em Tempo Real com a Web:**
  - O painel web do Financ escuta via `onSnapshot`, atualizando gráficos, saldo e extratos na tela no mesmo instante em que você envia uma mensagem!

---

## 🚀 Como Executar

### Opção 1: Executar Localmente com Node.js

1. **Instale as dependências:**
   ```bash
   cd bot
   npm install
   ```

2. **Configure o arquivo `.env`:**
   Copie `.env.example` para `.env` e preencha suas chaves:
   - `TELEGRAM_BOT_TOKEN`: Token obtido com o [@BotFather](https://t.me/BotFather) no Telegram.
   - `GEMINI_API_KEY`: Chave gratuita do [Google AI Studio](https://aistudio.google.com/).
   - `EVOLUTION_API_URL`: URL da sua instância Evolution API (ex: `http://localhost:8080`).

3. **Inicie o servidor do bot:**
   ```bash
   npm run dev
   ```

---

### Opção 2: Executar com Docker Compose (1 Comando)

Para subir a **Evolution API v2**, o **Redis** e o **Bot** juntos:

```bash
cd bot
docker compose up -d --build
```

---

## 📱 Conectando o WhatsApp (Evolution API)

1. Com a Evolution API rodando (porta `8080`), crie a instância do bot:
   ```bash
   curl -X POST http://localhost:8080/instance/create \
     -H "apikey: evolution-global-api-key" \
     -H "Content-Type: application/json" \
     -d '{
       "instanceName": "financ-bot",
       "token": "financ-bot",
       "qrcode": true,
       "integration": "WHATSAPP-BAILEYS"
     }'
   ```
2. Abra o WhatsApp no celular, vá em **Aparelhos Conectados** e escaneie o QR Code retornado na Evolution API (ou visualizado no Swagger em `http://localhost:8080/docs`).
3. Configure o webhook da instância para apontar para o bot:
   ```bash
   curl -X POST http://localhost:8080/webhook/set/financ-bot \
     -H "apikey: evolution-global-api-key" \
     -H "Content-Type: application/json" \
     -d '{
       "webhook": {
         "enabled": true,
         "url": "http://localhost:3000/webhook/evolution",
         "byEvents": false,
         "events": ["MESSAGES_UPSERT"]
       }
     }'
   ```

---

## ✈️ Conectando o Telegram

1. Abra o Telegram e procure por [@BotFather](https://t.me/BotFather).
2. Envie o comando `/newbot`, escolha um nome e um username terminado em `bot`.
3. Copie o **Token de Acesso** fornecido e cole na variável `TELEGRAM_BOT_TOKEN` no `.env`.
4. Inicie o bot. Ele já começará a responder via *Long-Polling* imediatamente!

---

## 🔗 Como Vincular sua Conta com o Sistema Web

1. Acesse o **Financ** no navegador e faça login com sua conta Firebase.
2. Vá no menu lateral ➔ **Configurações** ➔ **Assistente Financeiro (WhatsApp & Telegram)**.
3. Clique em **Gerar PIN**. Um código de 6 dígitos será exibido (ex: `482910`).
4. **No WhatsApp**: Envie `conectar 482910`.
5. **No Telegram**: Envie `/start 482910` ou `conectar 482910`.
6. O bot confirmará o vínculo e seu painel web mostrará o status **Conectado**!

---

## 🧪 Testando sem WhatsApp / Telegram (Simulador REST)

Você pode simular mensagens diretamente enviando requisições HTTP:

```bash
curl -X POST http://localhost:3000/api/message/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Almoço 35 no débito",
    "platform": "whatsapp",
    "senderId": "5511999999999"
  }'
```
