import { Telegraf } from 'telegraf';
import { config } from '../config/env.js';
import { CoreMessageHandler } from '../handlers/messageHandler.js';

export class TelegramBotService {
  private static bot: Telegraf | null = null;

  static async init(): Promise<void> {
    const token = config.telegram.token;
    if (!token) {
      console.log('[TelegramBot] No TELEGRAM_BOT_TOKEN provided. Telegram bot is disabled.');
      return;
    }

    try {
      this.bot = new Telegraf(token);

      // Handle /start with deep link parameter or regular text
      this.bot.start(async (ctx) => {
        const text = ctx.message.text || '';
        const payload = text.replace(/^\/start\s*/i, '').trim();
        const chatId = String(ctx.chat.id);
        const username = ctx.from.username;
        const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');

        console.log(`[Telegram Inbound /start] From: ${chatId} (@${username || 'anon'}) - Payload: "${payload}"`);

        const incomingText = payload ? `conectar ${payload}` : text;
        const responseText = await CoreMessageHandler.handleIncomingMessage({
          platform: 'telegram',
          senderId: chatId,
          senderName: name,
          senderUsername: username,
          text: incomingText
        });

        if (responseText) {
          await ctx.replyWithMarkdown(responseText.replace(/\*/g, '*'));
        }
      });

      // Handle general text messages
      this.bot.on('text', async (ctx) => {
        const text = ctx.message.text;
        const chatId = String(ctx.chat.id);
        const username = ctx.from.username;
        const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');

        console.log(`[Telegram Inbound] From: ${chatId} (@${username || 'anon'}) - Text: "${text}"`);

        const responseText = await CoreMessageHandler.handleIncomingMessage({
          platform: 'telegram',
          senderId: chatId,
          senderName: name,
          senderUsername: username,
          text
        });

        if (responseText) {
          try {
            await ctx.replyWithMarkdown(responseText);
          } catch {
            // Fallback without markdown if formatting fails
            await ctx.reply(responseText.replace(/[*_`]/g, ''));
          }
        }
      });

      // Launch bot (Polling mode)
      if (config.telegram.usePolling) {
        this.bot.launch(() => {
          console.log('[TelegramBot] Bot initialized and listening with Long-Polling! 🚀');
        });

        // Graceful stop
        process.once('SIGINT', () => this.bot?.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
      }
    } catch (e: any) {
      console.error('[TelegramBot] Initialization error:', e?.message);
    }
  }

  static getBotInstance(): Telegraf | null {
    return this.bot;
  }
}
