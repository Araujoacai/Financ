import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { PluggyModal } from './components/PluggyModal';
import { LandingLockScreen } from './components/LandingLockScreen';
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

const CloudLoadingOverlay: React.FC = () => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(7, 10, 18, 0.92)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: '16px', backdropFilter: 'blur(8px)'
  }}>
    <div style={{
      width: 56, height: 56, borderRadius: '50%',
      border: '3px solid rgba(16, 185, 129, 0.2)',
      borderTop: '3px solid #10b981',
      animation: 'spin 0.9s linear infinite'
    }} />
    <p style={{ color: '#10b981', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.02em' }}>
      Carregando seus dados da nuvem...
    </p>
    <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
      Sincronizando com o Firebase
    </p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const AppContent: React.FC = () => {
  const { user, bills, isLoadingCloudData } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPluggyModalOpen, setIsPluggyModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  // Auth Guard: Require Login to View Financial Data
  if (!user) {
    return (
      <>
        <LandingLockScreen />
        <AuthModal />
      </>
    );
  }

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
      {isLoadingCloudData && <CloudLoadingOverlay />}
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
