import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { PluggyModal } from './components/PluggyModal';
import { NewTransactionModal } from './components/NewTransactionModal';
import { NewBillModal } from './components/NewBillModal';
import { Dashboard } from './pages/Dashboard';
import { ExpenseAnalytics } from './pages/ExpenseAnalytics';
import { OpenBanking } from './pages/OpenBanking';
import { Transactions } from './pages/Transactions';
import { BillsNotifications } from './pages/BillsNotifications';
import { BudgetsGoals } from './pages/BudgetsGoals';
import { Investments } from './pages/Investments';
import { Settings } from './pages/Settings';
import { NotificationService } from './services/notificationService';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPluggyModalOpen, setIsPluggyModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  const { bills } = useApp();

  const overdue = NotificationService.getOverdueBills(bills);
  const dueToday = NotificationService.getDueTodayBills(bills);
  const dueBillsCount = overdue.length + dueToday.length;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            onOpenPluggyModal={() => setIsPluggyModalOpen(true)}
            onOpenTransactionModal={() => setIsTransactionModalOpen(true)}
            onOpenBillModal={() => setIsBillModalOpen(true)}
            setActiveTab={setActiveTab}
          />
        );
      case 'analytics':
        return <ExpenseAnalytics />;
      case 'pluggy':
        return <OpenBanking onOpenPluggyModal={() => setIsPluggyModalOpen(true)} />;
      case 'transactions':
        return <Transactions onOpenTransactionModal={() => setIsTransactionModalOpen(true)} />;
      case 'bills':
        return <BillsNotifications onOpenBillModal={() => setIsBillModalOpen(true)} />;
      case 'budgets':
        return <BudgetsGoals />;
      case 'investments':
        return <Investments />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <Dashboard 
            onOpenPluggyModal={() => setIsPluggyModalOpen(true)}
            onOpenTransactionModal={() => setIsTransactionModalOpen(true)}
            onOpenBillModal={() => setIsBillModalOpen(true)}
            setActiveTab={setActiveTab}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          dueBillsCount={dueBillsCount} 
        />

        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            onOpenPluggyModal={() => setIsPluggyModalOpen(true)} 
          />

          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
            {renderContent()}
          </main>
        </div>
      </div>

      {/* Global Modals */}
      <AuthModal />
      <PluggyModal 
        isOpen={isPluggyModalOpen} 
        onClose={() => setIsPluggyModalOpen(false)} 
      />
      <NewTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
      />
      <NewBillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
