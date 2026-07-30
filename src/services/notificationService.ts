import type { Bill } from '../types';

export class NotificationService {
  static requestPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return Notification.requestPermission();
    }
    return Promise.resolve('denied');
  }

  static getPermissionState(): NotificationPermission | 'unsupported' {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  }

  static sendNotification(title: string, options?: NotificationOptions) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options
        });
      } catch (err) {
        console.warn('Web notification error:', err);
      }
    }
  }

  static getOverdueBills(bills: Bill[]): Bill[] {
    const today = new Date().toISOString().split('T')[0];
    return bills.filter(b => b.status === 'pending' && b.dueDate < today);
  }

  static getDueTodayBills(bills: Bill[]): Bill[] {
    const today = new Date().toISOString().split('T')[0];
    return bills.filter(b => b.status === 'pending' && b.dueDate === today);
  }

  static getDueSoonBills(bills: Bill[], daysWindow: number = 3): Bill[] {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysWindow);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];

    return bills.filter(b => 
      b.status === 'pending' && 
      b.dueDate > todayStr && 
      b.dueDate <= futureStr
    );
  }

  static checkAndNotifyDueBills(bills: Bill[]) {
    const overdue = this.getOverdueBills(bills);
    const dueToday = this.getDueTodayBills(bills);
    const dueSoon = this.getDueSoonBills(bills, 3);

    if (dueToday.length > 0) {
      this.sendNotification(`⚠️ ${dueToday.length} conta(s) vencem HOJE!`, {
        body: dueToday.map(b => `${b.title}: R$ ${b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n'),
        tag: 'due-today-bills'
      });
    }

    if (overdue.length > 0) {
      this.sendNotification(`🚨 ${overdue.length} conta(s) VENCIDA(S)!`, {
        body: overdue.map(b => `${b.title} (Venceu em ${b.dueDate})`).join('\n'),
        tag: 'overdue-bills'
      });
    }

    return { overdue, dueToday, dueSoon };
  }
}
