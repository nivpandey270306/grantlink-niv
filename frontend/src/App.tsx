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
  const { setSelectedGrant, fetchGrants, fetchApplications, fetchEvents, health, runHealthCheck } = useDataStore();
  
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSendXlmModal, setShowSendXlmModal] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  React.useEffect(() => {
    // Initial fetch
    fetchGrants();
    fetchApplications();
    fetchEvents();
    runHealthCheck();

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
          <main className="md:ml-64 flex-1 pt-16 md:pt-10 px-4 sm:px-6 md:px-10 lg:px-12 min-h-screen bg-background overflow-x-hidden pb-20">
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
                    <code className="text-primary font-bold break-all">{health?.details.rpcUrl || 'Loading...'}</code>
                  </div>
                  <div className="flex justify-between border-b border-surface p-2">
                    <span className="font-semibold text-on-surface-variant">Network Passphrase:</span>
                    <code className="text-primary font-bold break-all">{health?.details.network || 'Loading...'}</code>
                  </div>
                  <div className="flex justify-between border-b border-surface p-2">
                    <span className="font-semibold text-on-surface-variant">Grant Registry Contract:</span>
                    <code className="text-primary font-bold break-all font-mono">{health?.details.registryId || 'Loading...'}</code>
                  </div>
                  <div className="flex justify-between border-b border-surface p-2">
                    <span className="font-semibold text-on-surface-variant">Grant Application Contract:</span>
                    <code className="text-primary font-bold break-all font-mono">{health?.details.applicationId || 'Loading...'}</code>
                  </div>
                  <div className="flex justify-between border-b border-surface p-2">
                    <span className="font-semibold text-on-surface-variant">Grant Escrow Contract:</span>
                    <code className="text-primary font-bold break-all font-mono">{health?.details.escrowId || 'Loading...'}</code>
                  </div>
                  <div className="flex justify-between border-b border-surface p-2">
                    <span className="font-semibold text-on-surface-variant">Wallet Support Status:</span>
                    <span className={`font-bold font-mono ${health?.walletAvailable ? 'text-primary' : 'text-red-500'}`}>
                      {health?.walletAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
                    </span>
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

      {/* Floating Developer Diagnostics Button */}
      <button
        onClick={() => {
          runHealthCheck();
          setShowDebugPanel(true);
        }}
        className="fixed bottom-6 right-6 bg-[#606C38] text-white font-semibold px-4 py-3 rounded-full hover:bg-[#283618] transition-all shadow-md z-40 flex items-center gap-2"
        id="dev-diagnostics-btn"
      >
        <span className="material-symbols-outlined text-sm">settings_ethernet</span>
        <span>Diagnostics</span>
        {health && (!health.rpcReachable || !health.registryConnected || !health.applicationConnected || !health.escrowConnected) && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
        )}
      </button>

      {/* Diagnostics Debug Drawer */}
      {showDebugPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-surface-container-lowest border-l border-outline-variant w-full max-w-md p-6 overflow-y-auto shadow-2xl flex flex-col h-full">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">analytics</span>
                <h4 className="font-bold text-forest font-soria text-lg">Developer Diagnostics</h4>
              </div>
              <button
                onClick={() => setShowDebugPanel(false)}
                className="text-outline hover:text-copper material-symbols-outlined"
              >
                close
              </button>
            </div>

            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed font-inter">
              Real-time health status, blockchain parameters, and connection metrics for GrantLink on Stellar.
            </p>

            <div className="flex-1 space-y-6 overflow-y-auto pr-1">
              {/* System Health Summary */}
              <div className="bg-surface border border-outline-variant rounded p-4 font-inter">
                <h5 className="font-bold text-xs text-forest mb-3 uppercase tracking-wider">Health Status</h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Freighter / Wallet Support</span>
                    <span className={`font-semibold ${health?.walletAvailable ? 'text-primary' : 'text-red-500'}`}>
                      {health?.walletAvailable ? '✓ Available' : '✗ Unavailable'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">RPC Node Reachability</span>
                    <span className={`font-semibold ${health?.rpcReachable ? 'text-primary' : 'text-red-500'}`}>
                      {health?.rpcReachable ? '✓ Connected' : '✗ Unreachable'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Registry Contract Reachability</span>
                    <span className={`font-semibold ${health?.registryConnected ? 'text-primary' : 'text-red-500'}`}>
                      {health?.registryConnected ? '✓ Healthy' : '✗ Unreachable'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Application Contract Reachability</span>
                    <span className={`font-semibold ${health?.applicationConnected ? 'text-primary' : 'text-red-500'}`}>
                      {health?.applicationConnected ? '✓ Healthy' : '✗ Unreachable'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Escrow Contract Reachability</span>
                    <span className={`font-semibold ${health?.escrowConnected ? 'text-primary' : 'text-red-500'}`}>
                      {health?.escrowConnected ? '✓ Healthy' : '✗ Unreachable'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Blockchain Parameters */}
              <div className="space-y-3 font-inter">
                <h5 className="font-bold text-xs text-forest uppercase tracking-wider">Blockchain Parameters</h5>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-on-surface-variant font-semibold uppercase">RPC Server Endpoint</label>
                    <code className="block bg-surface p-2 rounded text-primary font-bold overflow-x-auto select-all break-all">
                      {health?.details.rpcUrl}
                    </code>
                  </div>
                  <div>
                    <label className="block text-[10px] text-on-surface-variant font-semibold uppercase">Network Passphrase</label>
                    <code className="block bg-surface p-2 rounded text-primary font-bold overflow-x-auto select-all break-all">
                      {health?.details.network}
                    </code>
                  </div>
                  <div>
                    <label className="block text-[10px] text-on-surface-variant font-semibold uppercase">Connected Account</label>
                    <code className="block bg-surface p-2 rounded text-primary font-bold overflow-x-auto select-all break-all font-mono">
                      {health?.details.walletAddress || 'Not Connected'}
                    </code>
                  </div>
                  <div>
                    <label className="block text-[10px] text-on-surface-variant font-semibold uppercase">Registry Contract ID</label>
                    <code className="block bg-surface p-2 rounded text-primary font-bold overflow-x-auto select-all break-all font-mono">
                      {health?.details.registryId}
                    </code>
                  </div>
                  <div>
                    <label className="block text-[10px] text-on-surface-variant font-semibold uppercase">Application Contract ID</label>
                    <code className="block bg-surface p-2 rounded text-primary font-bold overflow-x-auto select-all break-all font-mono">
                      {health?.details.applicationId}
                    </code>
                  </div>
                  <div>
                    <label className="block text-[10px] text-on-surface-variant font-semibold uppercase">Escrow Contract ID</label>
                    <code className="block bg-surface p-2 rounded text-primary font-bold overflow-x-auto select-all break-all font-mono">
                      {health?.details.escrowId}
                    </code>
                  </div>
                  <div className="flex justify-between items-center bg-surface p-2 rounded">
                    <span className="font-semibold text-on-surface-variant">Latest Ledger Sequence:</span>
                    <code className="text-primary font-bold font-mono">{health?.latestLedger || 'N/A'}</code>
                  </div>
                </div>
              </div>

              {health?.details.errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded leading-relaxed font-inter">
                  <span className="font-bold block mb-1">Diagnostic Alert:</span>
                  {health.details.errorMsg}
                </div>
              )}
            </div>

            <div className="border-t border-outline-variant pt-4 mt-6 font-inter">
              <button
                onClick={() => runHealthCheck()}
                className="w-full bg-[#606C38] text-white font-semibold py-2.5 rounded text-xs hover:bg-[#283618] transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">autorenew</span>
                <span>Rerun Health Check</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert Popups */}
      <Toasts />
    </div>
  );
}
