import React from 'react';
import { useWalletStore } from '../store/wallet';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenConnect: () => void;
  onOpenSendXlm: () => void;
}

export function Sidebar({ activeTab, setActiveTab, onOpenConnect, onOpenSendXlm }: SidebarProps) {
  const { connected, address, balance, walletType, network, disconnect, fundAccount, loading } = useWalletStore();

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'grants', label: 'Grants', icon: 'payments' },
    { id: 'applications', label: 'Applications', icon: 'assignment_ind' },
    { id: 'milestones', label: 'Milestones', icon: 'account_tree' },
    { id: 'activity', label: 'Activity Feed', icon: 'history' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col p-6 z-40">
      {/* Brand logo */}
      <div className="flex flex-col mb-8">
        <h1 className="font-allura text-4xl text-primary font-bold">GrantLink</h1>
        <span className="text-[10px] text-on-surface-variant font-semibold tracking-widest uppercase mt-1">On-Chain Funding</span>
      </div>

      {/* Wallet Status Area */}
      <div className="mb-6 p-4 rounded-lg bg-surface border border-outline-variant flex flex-col gap-2">
        {connected && address ? (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-on-surface-variant">Connected ({walletType})</span>
              <div className="flex items-center gap-1 bg-primary text-surface px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                {network}
              </div>
            </div>
            <div className="font-mono text-sm text-forest font-semibold truncate bg-surface-container p-2 rounded">
              {address.slice(0, 5)}...{address.slice(-5)}
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="text-xs text-on-surface-variant">
                Balance: <strong className="text-forest">{balance}</strong>
              </div>
              {balance.includes('Unfunded') && (
                <button
                  onClick={fundAccount}
                  disabled={loading}
                  className="w-full bg-gold hover:bg-opacity-95 text-forest text-xs font-semibold py-1.5 rounded transition-colors disabled:opacity-50"
                >
                  {loading ? 'Funding...' : 'Fund with Friendbot'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={onOpenSendXlm}
                className="bg-primary text-surface text-xs font-semibold py-1.5 rounded hover:bg-forest transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">send</span>
                Send
              </button>
              <button
                onClick={disconnect}
                className="border border-copper text-copper text-xs font-semibold py-1.5 rounded hover:bg-surface-container-low transition-colors"
              >
                Exit
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={onOpenConnect}
            className="w-full bg-primary text-surface font-semibold py-2.5 rounded hover:bg-forest transition-colors text-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
            Connect Wallet
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 flex flex-col gap-1.5">
        <p className="text-[10px] text-outline uppercase font-semibold tracking-wider mb-2 ml-2">Main Menu</p>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              activeTab === item.id
                ? 'bg-primary text-surface font-semibold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <span
              className="material-symbols-outlined text-lg"
              style={{ fontVariationSettings: `'FILL' ${activeTab === item.id ? 1 : 0}` }}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-outline-variant pt-4 mt-auto">
        <div className="text-[10px] text-on-surface-variant font-mono">
          <div>Registry: <span className="text-primary font-bold">Deployed</span></div>
          <div>Escrow: <span className="text-primary font-bold">Active</span></div>
        </div>
      </div>
    </aside>
  );
}
