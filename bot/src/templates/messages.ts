import type { Transaction, BankAccount, Bill } from '../services/firebaseService.js';

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const MessageTemplates = {
  welcomeUnlinked(platform: 'whatsapp' | 'telegram', pairingCodeSuggestion?: string): string {
    if (platform === 'whatsapp') {
      return (
`👋 *Olá! Eu sou seu assistente financeiro do Financ.*

Para conectar seu WhatsApp à sua conta:
1️⃣ Acesse o sistema Financ no seu computador ou celular.
2️⃣ Vá em *Configurações* ➔ *Assistente Financeiro*.
3️⃣ Clique em *Gerar PIN* e envie o comando aqui:

👉 \`conectar 123456\` _(substitua pelo seu PIN de 6 dígitos)_`
      );
    } else {
      return (
`👋 *Olá! Eu sou seu assistente financeiro do Financ.*

Para conectar seu Telegram à sua conta:
1️⃣ Acesse o sistema Financ no navegador.
2️⃣ Vá em *Configurações* ➔ *Assistente Financeiro*.
3️⃣ Clique em *Gerar PIN* e envie o comando aqui:

👉 \`/start 123456\` ou \`conectar 123456\` _(com o seu PIN)_`
      );
    }
  },

  pairingSuccess(userName: string): string {
    return (
`🎉 *Conta vinculada com sucesso!*

Olá, *${userName}*! A partir de agora você pode enviar seus gastos ou pedir relatórios por aqui.

💡 *Experimente enviar:*
• _"Almoço 35"_
• _"Gasolina 120 no nubank"_
• _"Recebi 2500 de salário"_
• _"Quanto gastei hoje?"_
• _"Resumo do mês"_
• _"Qual meu saldo?"_
• _"Contas a pagar"_`
    );
  },

  expenseAdded(
    tx: Transaction,
    account: BankAccount,
    budgetAlert?: { category: string; limit: number; spent: number; exceeded: boolean }
  ): string {
    let msg = (
`💸 *Despesa Registrada!*

📝 *Item:* ${tx.description}
💰 *Valor:* ${formatBRL(tx.amount)}
🏷️ *Categoria:* ${tx.category}
💳 *Conta:* ${account.name} (Saldo: ${formatBRL(account.balance)})
📅 *Data:* ${tx.date.split('-').reverse().join('/')}`
    );

    if (budgetAlert) {
      if (budgetAlert.exceeded) {
        msg += `\n\n⚠️ *Alerta de Orçamento:* O limite de ${tx.category} (${formatBRL(budgetAlert.limit)}) foi ultrapassado! Gasto atual: ${formatBRL(budgetAlert.spent)}`;
      } else {
        const percent = Math.round((budgetAlert.spent / budgetAlert.limit) * 100);
        msg += `\n\n📊 *Orçamento ${tx.category}:* ${percent}% usado (${formatBRL(budgetAlert.spent)} de ${formatBRL(budgetAlert.limit)})`;
      }
    }

    return msg;
  },

  incomeAdded(tx: Transaction, account: BankAccount): string {
    return (
`💰 *Receita Registrada!*

📝 *Descrição:* ${tx.description}
💵 *Valor:* +${formatBRL(tx.amount)}
🏷️ *Categoria:* ${tx.category}
🏦 *Conta:* ${account.name} (Novo Saldo: ${formatBRL(account.balance)})
📅 *Data:* ${tx.date.split('-').reverse().join('/')}`
    );
  },

  dateSummary(
    periodTitle: string,
    totalExpense: number,
    totalIncome: number,
    categoryTotals: Record<string, number>,
    transactions: Transaction[]
  ): string {
    if (transactions.length === 0) {
      return (
`📅 *Resumo - ${periodTitle}*

Nenhuma transação encontrada para este período.

💡 Para registrar um gasto, basta digitar: _"Padaria 15"_`
      );
    }

    let msg = `📊 *Resumo Financeiro - ${periodTitle}*\n\n`;
    msg += `🔴 *Total de Gastos:* ${formatBRL(totalExpense)}\n`;
    if (totalIncome > 0) {
      msg += `🟢 *Total de Entradas:* ${formatBRL(totalIncome)}\n`;
      msg += `⚖️ *Balanço:* ${formatBRL(totalIncome - totalExpense)}\n`;
    }

    // Category breakdown
    const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    if (categories.length > 0) {
      msg += `\n🏷️ *Gastos por Categoria:*\n`;
      for (const [cat, total] of categories) {
        msg += `• ${cat}: ${formatBRL(total)}\n`;
      }
    }

    // Last transactions preview (up to 5)
    msg += `\n📝 *Últimas transações:* (${transactions.length} total)\n`;
    const recent = transactions.slice(0, 6);
    for (const t of recent) {
      const sign = t.type === 'income' ? '🟢 +' : '🔴 -';
      msg += `${sign} ${t.description} — ${formatBRL(t.amount)}\n`;
    }

    return msg;
  },

  balanceSummary(accounts: BankAccount[], totalBalance: number): string {
    if (accounts.length === 0) {
      return `🏦 *Saldos das Contas*\n\nNenhuma conta cadastrada no momento.`;
    }

    let msg = `🏦 *Visão Geral de Contas & Saldos*\n\n`;
    for (const acc of accounts) {
      msg += `💳 *${acc.name}* (${acc.bankName}): ${formatBRL(acc.balance)}\n`;
    }
    msg += `\n💰 *Saldo Geral Total:* ${formatBRL(totalBalance)}`;
    return msg;
  },

  billsSummary(bills: Bill[]): string {
    if (bills.length === 0) {
      return `🎉 *Nenhuma conta pendente!* Tudo em dia no Financ.`;
    }

    const totalPending = bills.reduce((acc, b) => acc + b.amount, 0);
    let msg = `📋 *Contas a Pagar (${bills.length})*\n\n`;
    for (const b of bills) {
      const dueDateFormatted = b.dueDate.split('-').reverse().join('/');
      msg += `• *${b.title}*: ${formatBRL(b.amount)} (Vence em: ${dueDateFormatted})\n`;
    }
    msg += `\n💵 *Total a Pagar:* ${formatBRL(totalPending)}`;
    return msg;
  },

  help(): string {
    return (
`🤖 *Comandos e Exemplos do Assistente Financ*

📌 *Registrar Despesa:*
• "Gastei 45 no almoço"
• "Uber 23,50 no crédito"
• "Gasolina 100 nubank"

📌 *Registrar Receita:*
• "Recebi 3500 de salário"
• "Entrou 200 de pix"

📌 *Consultas por Data:*
• "Quanto gastei hoje?" ou "Hoje"
• "Gastos de ontem" ou "Ontem"
• "Gastos deste mês" ou "Resumo do mês"

📌 *Outras Consultas:*
• "Qual meu saldo?"
• "Contas a pagar"
• "Ajuda"`
    );
  },

  unknownMessage(): string {
    return (
`🤔 Não entendi perfeitamente. 

💡 *Exemplos rápidos:*
• _"Almoço 35"_ ➔ registra gasto
• _"Quanto gastei hoje?"_ ➔ relatório do dia
• _"Saldo"_ ➔ consulta saldo
• Digite *"ajuda"* para ver todos os comandos.`
    );
  }
};
