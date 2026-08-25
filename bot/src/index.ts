import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { handleEvolutionWebhook } from './handlers/evolutionWebhook.js';
import { TelegramBotService } from './services/telegramService.js';
import { EvolutionService } from './services/evolutionService.js';
import { CoreMessageHandler } from './handlers/messageHandler.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check & Status
app.get(['/', '/health', '/api/health'], async (_req, res) => {
  const evolutionState = await EvolutionService.getConnectionState();
  const telegramActive = Boolean(TelegramBotService.getBotInstance());

  res.json({
    status: 'online',
    service: 'Financ Bot (WhatsApp Evolution API & Telegram)',
    timestamp: new Date().toISOString(),
    firebaseProject: config.firebase.projectId,
    evolution: {
      url: config.evolution.apiUrl,
      instance: config.evolution.instanceName,
      status: evolutionState.state
    },
    telegram: {
      enabled: telegramActive,
      mode: config.telegram.usePolling ? 'polling' : 'webhook'
    }
  });
});

// Evolution API WhatsApp Webhook
app.post('/webhook/evolution', handleEvolutionWebhook);

// Simulation / Testing Endpoint (Allows testing messages directly via REST/cURL)
app.post('/api/message/simulate', async (req, res) => {
  const { text, platform = 'whatsapp', senderId = '5511999999999', senderName = 'Teste' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Field "text" is required' });
  }

  const responseText = await CoreMessageHandler.handleIncomingMessage({
    platform,
    senderId,
    senderName,
    text
  });

  return res.json({
    input: { text, platform, senderId, senderName },
    reply: responseText
  });
});

// Start Server
const server = app.listen(config.port, config.host, async () => {
  console.log(`====================================================`);
  console.log(`🤖 Financ Bot Server running on http://${config.host}:${config.port}`);
  console.log(`📦 Firebase Project: ${config.firebase.projectId}`);
  console.log(`📱 Evolution Webhook: http://${config.host}:${config.port}/webhook/evolution`);
  console.log(`====================================================`);

  // Initialize Telegram Bot
  await TelegramBotService.init();

  // Try checking Evolution API
  try {
    const state = await EvolutionService.getConnectionState();
    console.log(`[Evolution API] Instance '${config.evolution.instanceName}' status: ${state.state}`);
  } catch (e: any) {
    console.warn(`[Evolution API] Note: Evolution server at ${config.evolution.apiUrl} not yet reached.`);
  }
});

export default app;
