import type { BankAccount, Transaction, InvestmentItem, PluggyCredentials } from '../types';

export interface PluggyConnector {
  id: number;
  name: string;
  institutionUrl: string;
  imageUrl: string;
  primaryColor: string;
  type: 'PERSONAL_BANK' | 'BUSINESS_BANK' | 'INVESTMENT';
  country: 'BR';
}

export const DEFAULT_PLUGGY_CREDENTIALS: PluggyCredentials = {
  clientId: "b540b059-3bfd-4f9c-84c6-4b50e522f75a",
  clientSecret: "207e67c7-97e3-49be-b2bc-c0c277cc93bd",
  isConfigured: true
};

export const PLUGGY_CONNECTORS: PluggyConnector[] = [
  {
    id: 2,
    name: 'Pluggy Sandbox Bank',
    institutionUrl: 'https://pluggy.ai',
    imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/sandbox.svg',
    primaryColor: '#10b981',
    type: 'PERSONAL_BANK',
    country: 'BR'
  },
  {
    id: 1,
    name: 'Itaú Unibanco',
    institutionUrl: 'https://itau.com.br',
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=120&auto=format&fit=crop&q=80',
    primaryColor: '#ec6608',
    type: 'PERSONAL_BANK',
    country: 'BR'
  },
  {
    id: 3,
    name: 'Bradesco',
    institutionUrl: 'https://bradesco.com.br',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=120&auto=format&fit=crop&q=80',
    primaryColor: '#cc092f',
    type: 'PERSONAL_BANK',
    country: 'BR'
  },
  {
    id: 4,
    name: 'Banco do Brasil',
    institutionUrl: 'https://bb.com.br',
    imageUrl: 'https://images.unsplash.com/photo-1541359927273-d76820fc45f9?w=120&auto=format&fit=crop&q=80',
    primaryColor: '#fcf800',
    type: 'PERSONAL_BANK',
    country: 'BR'
  },
  {
    id: 5,
    name: 'Santander',
    institutionUrl: 'https://santander.com.br',
    imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=120&auto=format&fit=crop&q=80',
    primaryColor: '#ec0000',
    type: 'PERSONAL_BANK',
    country: 'BR'
  },
  {
    id: 6,
    name: 'BTG Pactual',
    institutionUrl: 'https://btgpactual.com',
    imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=120&auto=format&fit=crop&q=80',
    primaryColor: '#00296b',
    type: 'INVESTMENT',
    country: 'BR'
  }
];

export class PluggyService {
  private static CREDENTIALS_KEY = 'aura_pluggy_credentials';

  static getStoredCredentials(): PluggyCredentials {
    const raw = localStorage.getItem(this.CREDENTIALS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.clientId) return parsed;
      } catch (e) {
        console.error('Error parsing stored Pluggy credentials', e);
      }
    }
    return DEFAULT_PLUGGY_CREDENTIALS;
  }

  static saveCredentials(credentials: Partial<PluggyCredentials>) {
    const current = this.getStoredCredentials();
    const updated: PluggyCredentials = {
      ...current,
      ...credentials,
      isConfigured: Boolean((credentials.clientId || current.clientId) && (credentials.clientSecret || current.clientSecret))
    };
    localStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify(updated));
    return updated;
  }

  static async getConnectToken(): Promise<string | null> {
    const creds = this.getStoredCredentials();
    if (!creds.clientId || !creds.clientSecret) return null;

    try {
      const authRes = await fetch('https://api.pluggy.ai/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: creds.clientId, clientSecret: creds.clientSecret })
      });
      if (!authRes.ok) return null;
      const { apiKey } = await authRes.json();

      const connectRes = await fetch('https://api.pluggy.ai/connect_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey
        },
        body: JSON.stringify({ options: { includeSandbox: true } })
      });
      if (!connectRes.ok) return null;
      const { accessToken } = await connectRes.json();
      return accessToken;
    } catch (e) {
      console.error('Error generating Pluggy connectToken:', e);
      return null;
    }
  }

  static async connectBank(connector: PluggyConnector): Promise<{ account: BankAccount; transactions: Transaction[]; investments?: InvestmentItem[] }> {
    const res = await this.createItemAndFetch(connector.id);
    return {
      account: res.accounts[0],
      transactions: res.transactions,
      investments: res.investments
    };
  }

  static async createItemAndFetch(connectorId: number, credentialsMap?: { user?: string; password?: string }): Promise<{ accounts: BankAccount[]; transactions: Transaction[]; investments: InvestmentItem[] }> {
    const creds = this.getStoredCredentials();
    const authRes = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: creds.clientId, clientSecret: creds.clientSecret })
    });
    const { apiKey } = await authRes.json();

    const itemRes = await fetch('https://api.pluggy.ai/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify({
        connectorId: connectorId,
        parameters: credentialsMap || { user: 'user-ok', password: 'password-ok' }
      })
    }).then(r => r.json());

    if (!itemRes.id) {
      throw new Error(itemRes.message || 'Erro ao criar conexão com o Pluggy');
    }

    return this.fetchItemAccountsAndTransactions(itemRes.id, apiKey);
  }

  /**
   * Helper to clean up raw bank descriptions like "COMPRA CARTAO - No estabelecimento " or "PIX ENVIADO - Cp :..."
   */
  private static formatCleanDescription(rawDesc: string): string {
    if (!rawDesc) return 'Lançamento Open Finance';

    let cleaned = rawDesc
      .replace(/^COMPRA CARTAO\s*-\s*No estabelecimento\s*/i, '')
      .replace(/^COMPRA CARTAO\s*-\s*/i, '')
      .replace(/^PIX ENVIADO\s*-\s*Cp\s*:\d*-\s*/i, 'Pix Enviado: ')
      .replace(/^PIX RECEBIDO\s*-\s*Cp\s*:\d*-\s*/i, 'Pix Recebido: ')
      .trim();

    return cleaned || rawDesc;
  }

  static async fetchItemAccountsAndTransactions(itemId: string, apiKeyOverride?: string): Promise<{ accounts: BankAccount[]; transactions: Transaction[]; investments: InvestmentItem[] }> {
    let apiKey = apiKeyOverride;
    if (!apiKey) {
      const creds = this.getStoredCredentials();
      const authRes = await fetch('https://api.pluggy.ai/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: creds.clientId, clientSecret: creds.clientSecret })
      }).then(r => r.json());
      apiKey = authRes.apiKey;
    }

    let attempts = 0;
    while (attempts < 10) {
      await new Promise(r => setTimeout(r, 2000));
      const item = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
        headers: { 'X-API-KEY': apiKey! }
      }).then(r => r.json());

      if (item.status === 'UPDATED') break;
      attempts++;
    }

    // 1. Fetch Accounts
    const accsRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey! }
    }).then(r => r.json());

    const fetchedAccounts: BankAccount[] = (accsRes.results || []).map((acc: any) => ({
      id: `acc-pluggy-${acc.id}`,
      name: acc.name || (acc.type === 'CREDIT' ? 'Cartão de Crédito' : 'Conta Corrente'),
      bankName: acc.bankData?.transferNumber ? 'Banco Pluggy' : (acc.type === 'CREDIT' ? 'Cartão de Crédito' : 'Conta Corrente'),
      bankCode: '260',
      type: acc.type === 'CREDIT' ? 'credit' : (acc.type === 'INVESTMENT' ? 'investment' : 'checking'),
      balance: acc.balance,
      color: acc.type === 'CREDIT' ? '#9333ea' : '#10b981',
      accountNumber: acc.number || acc.id.slice(0, 8),
      updatedAt: new Date().toISOString(),
      status: 'active',
      pluggyItemId: itemId
    }));

    // 2. Fetch Transactions (pageSize=500 to fetch up-to-date current month transactions)
    let fetchedTransactions: Transaction[] = [];
    for (const acc of fetchedAccounts) {
      const cleanId = acc.id.replace('acc-pluggy-', '');
      try {
        const txRes = await fetch(`https://api.pluggy.ai/transactions?accountId=${cleanId}&pageSize=500`, {
          headers: { 'X-API-KEY': apiKey! }
        }).then(r => r.json());

        const txs: Transaction[] = (txRes.results || []).map((tx: any) => ({
          id: `tx-pluggy-${tx.id}`,
          description: this.formatCleanDescription(tx.description || tx.rawDescription),
          amount: Math.abs(tx.amount),
          type: tx.amount >= 0 ? 'income' : 'expense',
          category: tx.category || 'Geral',
          accountId: acc.id,
          accountName: acc.name,
          date: tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0],
          status: 'completed',
          pluggyTransactionId: tx.id,
          paymentMethod: acc.name || 'Open Finance'
        }));

        fetchedTransactions = [...fetchedTransactions, ...txs];
      } catch (e) {
        console.warn('Could not fetch transactions for account:', cleanId, e);
      }
    }

    // Sort transactions descending by date (most recent first!)
    fetchedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 3. Fetch Investments
    let fetchedInvestments: InvestmentItem[] = [];
    try {
      const invRes = await fetch(`https://api.pluggy.ai/investments?itemId=${itemId}`, {
        headers: { 'X-API-KEY': apiKey! }
      }).then(r => r.json());

      if (invRes.results && invRes.results.length > 0) {
        fetchedInvestments = invRes.results.map((inv: any) => ({
          id: `inv-pluggy-${inv.id}`,
          name: inv.name || 'Investimento Open Finance',
          type: inv.type === 'MUTUAL_FUND' ? 'FIIs' : 
                inv.type === 'EQUITY' ? 'Ações' : 
                inv.type === 'CRYPTO' ? 'Cripto' : 'Renda Fixa',
          amountInvested: inv.amount || inv.balance || 0,
          currentValue: inv.balance || inv.amount || 0,
          yieldPercentage: Number((inv.annualRate || inv.rate || 0).toFixed(2)),
          institution: inv.institution?.name || 'Open Finance'
        }));
      }
    } catch (e) {
      console.warn('Could not fetch investments for item:', itemId, e);
    }

    return { 
      accounts: fetchedAccounts, 
      transactions: fetchedTransactions,
      investments: fetchedInvestments
    };
  }

  static async syncAllAccounts(accounts: BankAccount[]): Promise<{ updatedAccounts: BankAccount[]; newTransactionsCount: number }> {
    const creds = this.getStoredCredentials();
    if (!creds.clientId || !creds.clientSecret) {
      return { updatedAccounts: accounts, newTransactionsCount: 0 };
    }

    try {
      const authRes = await fetch('https://api.pluggy.ai/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: creds.clientId, clientSecret: creds.clientSecret })
      }).then(r => r.json());

      const updatedAccounts = [...accounts];

      for (let i = 0; i < updatedAccounts.length; i++) {
        const acc = updatedAccounts[i];
        if (acc.pluggyItemId) {
          try {
            const accRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${acc.pluggyItemId}`, {
              headers: { 'X-API-KEY': authRes.apiKey }
            }).then(r => r.json());

            if (accRes.results && accRes.results.length > 0) {
              const liveAcc = accRes.results.find((a: any) => `acc-pluggy-${a.id}` === acc.id) || accRes.results[0];
              updatedAccounts[i] = {
                ...acc,
                balance: liveAcc.balance,
                updatedAt: new Date().toISOString()
              };
            }
          } catch (e) {
            console.warn('Sync error for account', acc.id, e);
          }
        }
      }

      return { updatedAccounts, newTransactionsCount: 1 };
    } catch (e) {
      console.warn('Pluggy sync error:', e);
      return { updatedAccounts: accounts, newTransactionsCount: 0 };
    }
  }
}
