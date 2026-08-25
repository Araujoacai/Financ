import type { Request, Response } from 'express';
import { CoreMessageHandler } from './messageHandler.js';
import { EvolutionService } from '../services/evolutionService.js';

export async function handleEvolutionWebhook(req: Request, res: Response): Promise<void> {
  res.status(200).json({ status: 'received' });

  try {
    const body = req.body;
    if (!body) return;

    // Check event type from Evolution API
    const event = body.event || body.type;
    if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') {
      return;
    }

    const data = body.data;
    if (!data) return;

    // Check if message is fromMe
    const key = data.key || {};
    if (key.fromMe) return;

    const remoteJid = key.remoteJid || '';
    if (!remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') {
      // Ignore group chats and status broadcasts by default
      return;
    }

    // Extract text content from various WhatsApp message types
    const message = data.message || {};
    const text = 
      message.conversation ||
      message.extendedTextMessage?.text ||
      message.imageMessage?.caption ||
      message.videoMessage?.caption ||
      '';

    if (!text || typeof text !== 'string') return;

    const pushName = data.pushName || '';
    const cleanPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');

    console.log(`[WhatsApp Inbound] From: ${cleanPhone} (${pushName}) - Text: "${text}"`);

    // Process message through CoreMessageHandler
    const responseText = await CoreMessageHandler.handleIncomingMessage({
      platform: 'whatsapp',
      senderId: cleanPhone,
      senderName: pushName,
      text
    });

    if (responseText) {
      await EvolutionService.sendMessage(cleanPhone, responseText);
      console.log(`[WhatsApp Outbound] Replied to ${cleanPhone}`);
    }
  } catch (err) {
    console.error('[handleEvolutionWebhook] Error processing webhook:', err);
  }
}
