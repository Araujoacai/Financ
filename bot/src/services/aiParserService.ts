import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';

export interface ParsedIntent {
  intent: 
    | 'add_expense'
    | 'add_income'
    | 'query_today'
    | 'query_yesterday'
    | 'query_month'
    | 'query_balance'
    | 'query_bills'
    | 'link_account'
    | 'help'
    | 'unknown';
  amount?: number;
  description?: string;
  category?: string;
  paymentMethod?: string;
  accountName?: string;
  pairingCode?: string;
  targetDate?: string; // YYYY-MM or YYYY-MM-DD
  confidence?: number;
}

export class AIParserService {
  private static genAI = config.gemini.apiKey ? new GoogleGenerativeAI(config.gemini.apiKey) : null;


  /**
   * Main entrypoint to parse incoming user messages
   */
  static async parseMessage(text: string): Promise<ParsedIntent> {
    const trimmed = text.trim();

    // 1. Direct Pairing Command check (Fast-path)
    const linkMatch = trimmed.match(/^(?:\/start|conectar|vincular|link)\s*(\d{6})$/i);
    if (linkMatch) {
      return {
        intent: 'link_account',
        pairingCode: linkMatch[1],
      };
    }

    const bareCodeMatch = trimmed.match(/^(\d{6})$/);
    if (bareCodeMatch) {
      return {
        intent: 'link_account',
        pairingCode: bareCodeMatch[1],
      };
    }

    // 2. Try Gemini AI if API key is provided
    if (this.genAI) {
      try {
        const aiResult = await this.parseWithGemini(trimmed);
        if (aiResult && aiResult.intent !== 'unknown') {
          return aiResult;
        }
      } catch (e) {
        console.warn('[AIParserService] Gemini parsing fallback to rule engine:', e);
      }
    }

    // 3. Rule-based / Regex fallback engine (Ultra reliable Portuguese parsing)
    return this.parseWithRules(trimmed);
  }

  /**
   * Parse with Google Gemini API
   */
  private static async parseWithGemini(text: string): Promise<ParsedIntent | null> {
    if (!this.genAI) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    const systemPrompt = `Você é um extrator de intenções financeiras para um bot de WhatsApp/Telegram.
A data de hoje é: ${todayStr}.

Analise a mensagem do usuário e retorne APENAS um objeto JSON válido (sem blocos markdown adicionais ou texto).
Formato esperado:
{
  "intent": "add_expense" | "add_income" | "query_today" | "query_yesterday" | "query_month" | "query_balance" | "query_bills" | "link_account" | "help" | "unknown",
  "amount": number (obrigatório se add_expense ou add_income),
  "description": string (ex: "Almoço", "Gasolina", "Salário"),
  "category": string ("Alimentação" | "Transporte" | "Moradia" | "Lazer" | "Saúde" | "Educação" | "Supermercado" | "Salário" | "Renda Extra" | "Outros"),
  "paymentMethod": string ("Cartão de Crédito" | "Débito" | "Pix" | "Dinheiro" | null),
  "accountName": string ou null,
  "pairingCode": string ou null (se código de 6 dígitos),
  "targetDate": string ("YYYY-MM-DD" ou "YYYY-MM" para consultas específicas)
}

Exemplos:
- "Gastei 45 no almoço" -> {"intent":"add_expense","amount":45,"description":"Almoço","category":"Alimentação"}
- "Gasolina 150 no nubank" -> {"intent":"add_expense","amount":150,"description":"Gasolina","category":"Transporte","accountName":"Nubank"}
- "Recebi 3500 de salário" -> {"intent":"add_income","amount":3500,"description":"Salário","category":"Salário"}
- "Quanto gastei hoje?" -> {"intent":"query_today"}
- "Gastos de ontem" -> {"intent":"query_yesterday"}
- "Resumo do mês" -> {"intent":"query_month"}
- "Qual meu saldo?" -> {"intent":"query_balance"}
- "Quais contas tenho pra pagar?" -> {"intent":"query_bills"}
- "ajuda" -> {"intent":"help"}`;

    try {
      const model = this.genAI.getGenerativeModel({ model: config.gemini.model || 'gemini-1.5-flash' });
      const prompt = `${systemPrompt}\n\nMensagem do usuário: "${text}"`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const raw = response.text()?.trim() || '';
      const cleanJson = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanJson);
      return parsed as ParsedIntent;
    } catch (err) {
      console.error('[AIParserService] Gemini error:', err);
      return null;
    }
  }

  /**
   * Rule-based Portuguese NLP Engine
   */
  private static parseWithRules(text: string): ParsedIntent {
    const lower = text.toLowerCase().trim();

    // Help
    if (/^(ajuda|help|menu|comandos|o que você faz|\?)$/i.test(lower)) {
      return { intent: 'help' };
    }

    // Queries
    if (/quanto gastei hoje|gastos de hoje|hoje|resumo de hoje/i.test(lower)) {
      return { intent: 'query_today' };
    }
    if (/quanto gastei ontem|gastos de ontem|ontem/i.test(lower)) {
      return { intent: 'query_yesterday' };
    }
    if (/gastos d[eo] m[eê]s|resumo d[eo] m[eê]s|este m[eê]s|m[eê]s atual/i.test(lower)) {
      return { intent: 'query_month' };
    }
    if (/saldo|quanto (eu )?tenho|minhas contas|extrato/i.test(lower)) {
      return { intent: 'query_balance' };
    }
    if (/contas (a|para) pagar|boletos|vencimentos|minhas contas pendentes/i.test(lower)) {
      return { intent: 'query_bills' };
    }

    // Income pattern: (recebi|ganhei|salario|pix de|entrada|receita) 100
    const incomePattern = /(?:recebi|ganhei|sal[aá]rio|renda|pix de|entrada)\s*(?:de\s*)?(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/i;
    const incomeMatch = lower.match(incomePattern);
    if (incomeMatch) {
      const amountStr = incomeMatch[1].replace(',', '.');
      const amount = parseFloat(amountStr);
      let desc = lower.replace(incomePattern, '').trim();
      if (!desc) desc = 'Receita';
      return {
        intent: 'add_income',
        amount,
        description: desc.charAt(0).toUpperCase() + desc.slice(1),
        category: 'Salário',
        paymentMethod: 'Pix'
      };
    }

    // Expense pattern: "gastei 45 no almoço", "almoço 45", "uber 25", "45 mercado"
    // Extract amount: numbers with optional comma/dot
    const amountRegex = /(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/i;
    const amountMatch = lower.match(amountRegex);

    if (amountMatch) {
      const amountStr = amountMatch[1].replace(',', '.');
      const amount = parseFloat(amountStr);

      if (amount > 0) {
        // Clean description
        let desc = lower
          .replace(/(?:gastei|comprei|paguei|coloquei|despesa|valor de|r\$)/gi, '')
          .replace(amountMatch[0], '')
          .replace(/\b(no|na|de|em|com|para|cartao|pix|dinheiro)\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!desc) desc = 'Gasto diverso';

        // Categorize automatically
        let category = 'Outros';
        if (/almo[cç]o|jantar|lanche|pizza|hamb[uú]rguer|caf[eé]|comida|restaurante|ifood|mercado|a[cç]a[ií]/i.test(desc)) {
          category = 'Alimentação';
        } else if (/uber|99|gasolina|combust[ií]vel|estacionamento|ped[aá]gio|passagem|transporte|metro|onibus|[oô]nibus/i.test(desc)) {
          category = 'Transporte';
        } else if (/aluguel|luz|agua|[aá]gua|energia|internet|condom[ií]nio|iptu|moradia/i.test(desc)) {
          category = 'Moradia';
        } else if (/cinema|show|jogo|bar|festa|viagem|passeio|lazer/i.test(desc)) {
          category = 'Lazer';
        } else if (/rem[eé]dio|farm[aá]cia|m[eé]dico|consulta|exame|sa[uú]de/i.test(desc)) {
          category = 'Saúde';
        } else if (/curso|livro|faculdade|escola|mensalidade/i.test(desc)) {
          category = 'Educação';
        }

        return {
          intent: 'add_expense',
          amount,
          description: desc.charAt(0).toUpperCase() + desc.slice(1),
          category,
          paymentMethod: /cartao|cr[eé]dito/i.test(lower) ? 'Cartão de Crédito' : 'Débito'
        };
      }
    }

    return { intent: 'unknown' };
  }
}
