import { FirebaseBotService } from '../services/firebaseService.js';
import { AIParserService } from '../services/aiParserService.js';
import { MessageTemplates } from '../templates/messages.js';

export interface IncomingMessage {
  platform: 'whatsapp' | 'telegram';
  senderId: string; // phone for whatsapp, chat ID for telegram
  senderName?: string;
  senderUsername?: string;
  text: string;
}

export class CoreMessageHandler {
  /**
   * Process incoming user message and return the bot response text
   */
  static async handleIncomingMessage(msg: IncomingMessage): Promise<string> {
    const rawText = (msg.text || '').trim();
    if (!rawText) return '';

    // 1. Identify user association
    let userId: string | null = null;
    if (msg.platform === 'whatsapp') {
      userId = await FirebaseBotService.findUserByPhone(msg.senderId);
    } else {
      userId = await FirebaseBotService.findUserByTelegram(msg.senderId);
    }

    // 2. Parse intent with AI / Regex
    const parsed = await AIParserService.parseMessage(rawText);

    // 3. Handle Linking / Pairing
    if (parsed.intent === 'link_account' && parsed.pairingCode) {
      const linkResult = await FirebaseBotService.linkWithPairingCode(parsed.pairingCode, {
        phone: msg.platform === 'whatsapp' ? msg.senderId : undefined,
        telegramChatId: msg.platform === 'telegram' ? msg.senderId : undefined,
        telegramUsername: msg.senderUsername
      });

      if (linkResult.success) {
        return MessageTemplates.pairingSuccess(linkResult.userName || 'Usuário');
      } else {
        return `❌ ${linkResult.message}`;
      }
    }

    // If user is not yet linked, guide them to link
    if (!userId) {
      return MessageTemplates.welcomeUnlinked(msg.platform);
    }

    // 4. Handle Authenticated Intents
    switch (parsed.intent) {
      case 'add_expense': {
        if (!parsed.amount || parsed.amount <= 0) {
          return '⚠️ Por favor informe um valor válido para a despesa. Exemplo: _"Almoço 35"_';
        }

        const result = await FirebaseBotService.addTransaction(userId, {
          description: parsed.description || 'Gasto diverso',
          amount: parsed.amount,
          type: 'expense',
          category: parsed.category || 'Alimentação',
          paymentMethod: parsed.paymentMethod,
          accountName: parsed.accountName,
          date: parsed.targetDate
        });

        if (result.success && result.transaction && result.account) {
          return MessageTemplates.expenseAdded(result.transaction, result.account, result.budgetAlert);
        } else {
          return `❌ Erro ao registrar despesa: ${result.error || 'Falha ao salvar'}`;
        }
      }

      case 'add_income': {
        if (!parsed.amount || parsed.amount <= 0) {
          return '⚠️ Por favor informe um valor válido para a receita. Exemplo: _"Recebi 1500"_';
        }

        const result = await FirebaseBotService.addTransaction(userId, {
          description: parsed.description || 'Receita',
          amount: parsed.amount,
          type: 'income',
          category: parsed.category || 'Salário',
          paymentMethod: parsed.paymentMethod,
          accountName: parsed.accountName,
          date: parsed.targetDate
        });

        if (result.success && result.transaction && result.account) {
          return MessageTemplates.incomeAdded(result.transaction, result.account);
        } else {
          return `❌ Erro ao registrar receita: ${result.error || 'Falha ao salvar'}`;
        }
      }

      case 'query_today': {
        const summary = await FirebaseBotService.queryTransactionsByPeriod(userId, { type: 'today' });
        return MessageTemplates.dateSummary(
          summary.periodTitle,
          summary.totalExpense,
          summary.totalIncome,
          summary.categoryTotals,
          summary.transactions
        );
      }

      case 'query_yesterday': {
        const summary = await FirebaseBotService.queryTransactionsByPeriod(userId, { type: 'yesterday' });
        return MessageTemplates.dateSummary(
          summary.periodTitle,
          summary.totalExpense,
          summary.totalIncome,
          summary.categoryTotals,
          summary.transactions
        );
      }

      case 'query_month': {
        const summary = await FirebaseBotService.queryTransactionsByPeriod(userId, {
          type: 'month',
          targetDate: parsed.targetDate
        });
        return MessageTemplates.dateSummary(
          summary.periodTitle,
          summary.totalExpense,
          summary.totalIncome,
          summary.categoryTotals,
          summary.transactions
        );
      }

      case 'query_balance': {
        const summary = await FirebaseBotService.getAccountsSummary(userId);
        return MessageTemplates.balanceSummary(summary.accounts, summary.totalBalance);
      }

      case 'query_bills': {
        const bills = await FirebaseBotService.getPendingBills(userId);
        return MessageTemplates.billsSummary(bills);
      }

      case 'help': {
        return MessageTemplates.help();
      }

      default: {
        return MessageTemplates.unknownMessage();
      }
    }
  }
}
