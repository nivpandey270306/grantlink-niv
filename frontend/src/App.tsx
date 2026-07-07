import React, { useState } from 'react';
import { useWalletStore } from './store/wallet';
import { useDataStore } from './store/data';
import { LandingPage } from './components/LandingPage';
import { Sidebar } from './components/Sidebar';
import { Toasts } from './components/Toasts';
import { DashboardOverview } from './components/DashboardOverview';
import { GrantsPage } from './components/GrantsPage';
import { ApplicationsPage } from './components/ApplicationsPage';
import { MilestonesPage } from './components/MilestonesPage';
import { ActivityFeed } from './components/ActivityFeed';
import { AnalyticsPage } from './components/AnalyticsPage';
import { TransactionPage } from './components/TransactionPage';

export default function App() {
  const { connectFreighter, connectAlbedo } = useWalletStore();
  const { setSelectedGrant, fetchGrants, fetchApplications, fetchEvents } = useDataStore();
  
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSendXlmModal, setShowSendXlmModal] = useState(false);

  React.useEffect(() => {
    // Initial fetch
    fetchGrants();
    fetchApplications();
    fetchEvents();

    // Poll events every 5 seconds
    const interval = setInterval(() => {
      fetchEvents();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectGrant = (grant: any) => {
    setSelectedGrant(grant);
    setActiveTab('milestones');
  };

  const handleConnectWallet = async (walletType: 'freighter' | 'albedo') => {
    setShowConnectModal(false);
    if (walletType === 'freighter') {
      await connectFreighter();
    } else {
      await connectAlbedo();
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-inter">
      {showLanding ? (
        <LandingPage
          onEnterApp={() => setShowLanding(false)}
          onExplore={() => {
            setShowLanding(false);
            setActiveTab('grants');
          }}
          onOpenConnect={() => setShowConnectModal(true)}
        />
      ) : (
        <div className="flex">
          {/* Left Sidebar Menu */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              if (tab !== 'milestones') {
                setSelectedGrant(null);
              }
            }}
            onOpenConnect={() => setShowConnectModal(true)}
            onOpenSendXlm={() => setShowSendXlmModal(true)}
          />

          {/* Main Dashboard Panel Canvas */}
          <main className="ml-64 flex-1 p-12 min-h-screen bg-background overflow-x-hidden pb-20">
            {/* Nav Back to Landing page button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowLanding(true)}
                className="text-xs border border-outline text-on-surface-variant font-semibold px-3 py-1.5 rounded hover:bg-surface-container-low transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">home</span>
                Back to Welcome
              </button>
            </div>

            {/* Router Views */}
            {activeTab === 'overview' && (
              <DashboardOverview onNavigateToTab={(tab) => setActiveTab(tab)} />
            )}
            {activeTab === 'grants' && (
              <GrantsPage onSelectGrant={handleSelectGrant} />
            )}
            {activeTab === 'applications' && <ApplicationsPage />}
            {activeTab === 'milestones' && <MilestonesPage />}
            {activeTab === 'activity' && <ActivityFeed />}
            {activeTab === 'analytics' && <AnalyticsPage />}
            
            {activeTab === 'settings' && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 max-w-2xl">
                <h3 className="text-xl font-bold font-soria text-forest border-b border-outline-variant pb-2 mb-4">System Parameters</h3>
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between border-b border-surface p-2">
                    <span className="font-semibold text-on-surface-variant">Stellar RPC Endpoint:</span>
                    <code className="text-primary font-bold">https://soroban-testnet.stellar.org</code>
                  </div>
                  <div className="flex justify-between border-b border-surface p-2">
                    <span className="font-semibold text-on-surface-variant">Network Passphrase:</span>
                    <code className="text-primary font-bold">Test SDF Network ; September 2015</code>
                  </div>
                  <div className="flex justify-between border-b border-surface p-2">
                    <span className="font-semibold text-on-surface-variant">Grant Registry Contract Address:</span>
                    <code className="text-primary font-bold">CARG...REG3</code>
                  </div>
                  <div className="flex justify-between border-b border-surface p-2">
                    <span className="font-semibold text-on-surface-variant">Grant Escrow Contract Address:</span>
                    <code className="text-primary font-bold">CARG...ESC8</code>
                  </div>
                  <div className="flex justify-between border-b border-surface p-2">
                    <span className="font-semibold text-on-surface-variant">Freighter Wallet Status:</span>
                    <span className="text-primary font-bold font-mono">ENABLED</span>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Modal Wallet Selector Overlay */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-forest bg-opacity-20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 max-w-sm w-full shadow-lg">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3 mb-4">
              <h4 className="font-bold text-forest font-soria text-lg">Connect Wallet</h4>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-xs text-outline hover:text-copper material-symbols-outlined"
              >
                close
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
              Select your preferred Stellar signature wallet provider. Ensure you have the browser extensions installed.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleConnectWallet('freighter')}
                className="w-full bg-[#283618] hover:bg-opacity-95 text-white font-semibold py-3 rounded text-xs flex items-center justify-between px-4 transition-all shadow-sm"
              >
                <span className="font-bold font-inter">Freighter Wallet</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </button>
              <button
                onClick={() => handleConnectWallet('albedo')}
                className="w-full bg-[#606C38] hover:bg-opacity-95 text-white font-semibold py-3 rounded text-xs flex items-center justify-between px-4 transition-all shadow-sm"
              >
                <span className="font-bold font-inter">Albedo Wallet (Web)</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Send XLM Overlay */}
      {showSendXlmModal && (
        <div className="fixed inset-0 bg-forest bg-opacity-25 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-xl w-full">
            <TransactionPage onClose={() => setShowSendXlmModal(false)} />
          </div>
        </div>
      )}

      {/* Toast Alert Popups */}
      <Toasts />
    </div>
  );
}
