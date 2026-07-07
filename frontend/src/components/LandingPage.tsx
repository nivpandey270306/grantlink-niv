import React, { useState } from 'react';
import { useWalletStore } from '../store/wallet';

interface LandingPageProps {
  onEnterApp: () => void;
  onExplore: () => void;
  onOpenConnect: () => void;
}

export function LandingPage({ onEnterApp, onExplore, onOpenConnect }: LandingPageProps) {
  const { connected, address } = useWalletStore();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How does milestone-based funding guarantee transparency?",
      a: "All milestones, funding limits, and release criteria are locked into Stellar smart contracts at creation. Funding remains in the escrow contract and is only released to the recipient upon proof submission and reviewer approval. The entire history is immutable on the ledger."
    },
    {
      q: "Which wallets are supported by GrantLink?",
      a: "GrantLink integrates natively with Freighter Wallet (browser extension) and Albedo Wallet (web intent or extension), providing secure, passwordless transaction signing directly from your devices."
    },
    {
      q: "Can I cancel a grant and withdraw locked funds?",
      a: "Yes. If a grant is cancelled by the owner, any remaining locked funds that have not yet been disbursed for completed milestones are refunded automatically to the owner's wallet via the GrantEscrow smart contract."
    },
    {
      q: "Is there an off-chain data indexing layer?",
      a: "No. GrantLink is fully decentralized. All grant allocations, milestones, and proposal states reside on-chain. The client queries the ledger directly using Soroban RPC JSON calls and retrieves live transaction logs via RPC event polling."
    }
  ];

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen">
      {/* Top Navbar */}
      <nav className="border-b border-outline-variant bg-surface-container-lowest bg-opacity-80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="font-allura text-4xl text-primary font-bold">GrantLink</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-inter text-sm font-semibold">
            <a href="#process" className="hover:text-primary transition-colors">How It Works</a>
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            {connected ? (
              <button 
                onClick={onEnterApp}
                className="bg-primary text-surface font-semibold px-5 py-2.5 rounded-lg hover:bg-forest transition-colors text-sm flex items-center gap-2"
              >
                Go to Dashboard
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            ) : (
              <button 
                onClick={onOpenConnect}
                className="bg-primary text-surface font-semibold px-5 py-2.5 rounded-lg hover:bg-forest transition-colors text-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm flex">account_balance_wallet</span>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32 max-w-7xl mx-auto px-6 w-full flex-grow">
        {/* Animated Background Flow */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full lg:w-1/2 h-[400px] opacity-10 pointer-events-none">
          <svg className="w-full h-full fill-none stroke-primary" viewBox="0 0 100 100">
            <line strokeDasharray="4 4" strokeWidth="0.5" x1="10" y1="10" x2="90" y2="10" />
            <line strokeDasharray="4 4" strokeWidth="0.5" x1="10" y1="50" x2="90" y2="50" />
            <line strokeDasharray="4 4" strokeWidth="0.5" x1="10" y1="90" x2="90" y2="90" />
            <circle cx="20" cy="10" r="2" fill="currentColor" />
            <circle cx="50" cy="50" r="3" fill="currentColor" />
            <circle cx="80" cy="90" r="2" fill="currentColor" />
            <path d="M20,10 Q50,50 80,90" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="flex flex-col gap-6">
            <h1 className="text-5xl lg:text-7xl font-soria text-forest font-bold leading-tight">
              Funding With <br />
              <span className="font-allura text-primary block mt-2 text-6xl">Transparency</span>
            </h1>
            <p className="text-lg text-on-surface-variant font-inter leading-relaxed max-w-lg">
              Create, manage, and distribute grants securely through Stellar. An institutional-grade decentralized application designed for NGOs, startup accelerators, and public foundations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <button 
                onClick={onExplore}
                className="bg-primary text-surface font-semibold px-8 py-4 rounded-lg hover:bg-forest transition-colors text-center text-sm shadow-sm"
              >
                Explore Grants
              </button>
              <button 
                onClick={onEnterApp}
                className="border border-primary text-primary font-semibold px-8 py-4 rounded-lg hover:bg-surface-container-low transition-colors text-center text-sm"
              >
                Create Grant
              </button>
            </div>
          </div>
          
          {/* Grant Flow Visualization */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm flex flex-col justify-center min-h-[350px]">
            <h3 className="text-xl font-bold font-soria text-forest text-center mb-8">On-Chain Grant Lifecycle</h3>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative">
              <div className="hidden md:block absolute top-6 left-[15%] right-[15%] h-0.5 border-t-2 border-dashed border-outline-variant z-0"></div>
              
              <div className="flex flex-col items-center z-10 text-center bg-surface p-4 rounded-lg border border-outline-variant w-full md:w-32">
                <span className="material-symbols-outlined text-primary text-3xl mb-2">account_balance</span>
                <h4 className="font-semibold text-xs text-forest">Funder</h4>
                <p className="text-[10px] text-on-surface-variant mt-1">Deploys registry & locks funds</p>
              </div>

              <div className="flex flex-col items-center z-10 text-center bg-surface p-4 rounded-lg border border-outline-variant w-full md:w-32">
                <span className="material-symbols-outlined text-gold text-3xl mb-2">lock</span>
                <h4 className="font-semibold text-xs text-forest">Escrow Pool</h4>
                <p className="text-[10px] text-on-surface-variant mt-1">Funds locked in smart contract</p>
              </div>

              <div className="flex flex-col items-center z-10 text-center bg-surface p-4 rounded-lg border border-outline-variant w-full md:w-32">
                <span className="material-symbols-outlined text-copper text-3xl mb-2">check_circle</span>
                <h4 className="font-semibold text-xs text-forest">Milestones</h4>
                <p className="text-[10px] text-on-surface-variant mt-1">Proof uploaded & validated</p>
              </div>

              <div className="flex flex-col items-center z-10 text-center bg-surface p-4 rounded-lg border border-outline-variant w-full md:w-32">
                <span className="material-symbols-outlined text-primary text-3xl mb-2">payments</span>
                <h4 className="font-semibold text-xs text-forest">Recipient</h4>
                <p className="text-[10px] text-on-surface-variant mt-1">Automatic release of XLM</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works / The Process */}
      <section id="process" className="bg-surface-container-lowest border-y border-outline-variant py-20 w-full">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold font-soria text-forest mb-3">Decentralized Governance Flow</h2>
            <p className="text-sm text-on-surface-variant font-inter">Institutional accountability managed entirely on the Stellar ledger.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center p-6 bg-surface border border-outline-variant rounded-lg">
              <div className="w-16 h-16 bg-surface-container-low rounded-full border border-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">edit_document</span>
              </div>
              <h3 className="text-lg font-bold font-soria text-forest mb-2">1. Register Grant</h3>
              <p className="text-xs text-on-surface-variant">Grant owners deploy milestones schedule, title, and funding parameters permanently to the blockchain registry.</p>
            </div>

            <div className="flex flex-col items-center p-6 bg-surface border border-outline-variant rounded-lg">
              <div className="w-16 h-16 bg-surface-container-low rounded-full border border-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">verified_user</span>
              </div>
              <h3 className="text-lg font-bold font-soria text-forest mb-2">2. Onboard Recipient</h3>
              <p className="text-xs text-on-surface-variant">Applicants submit proposals off-chain. The owner's approval automatically links the recipient to the escrow contract.</p>
            </div>

            <div className="flex flex-col items-center p-6 bg-surface border border-outline-variant rounded-lg">
              <div className="w-16 h-16 bg-surface-container-low rounded-full border border-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">payments</span>
              </div>
              <h3 className="text-lg font-bold font-soria text-forest mb-2">3. Disburse Milestones</h3>
              <p className="text-xs text-on-surface-variant">Escrows release predefined token allocations directly to the recipient wallet once milestone criteria are met.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-6 w-full">
        <h2 className="text-3xl font-bold font-soria text-forest mb-12 text-center">Platform Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-surface border border-outline-variant rounded-lg hover:border-primary transition-colors">
            <span className="material-symbols-outlined text-primary text-4xl mb-4">account_balance_wallet</span>
            <h3 className="font-bold text-base text-forest mb-2">Multi-Wallet Integration</h3>
            <p className="text-xs text-on-surface-variant">Connect and sign transactions securely with Freighter or Albedo, displaying current balances and active networks.</p>
          </div>

          <div className="p-6 bg-surface border border-outline-variant rounded-lg hover:border-primary transition-colors">
            <span className="material-symbols-outlined text-primary text-4xl mb-4">swap_calls</span>
            <h3 className="font-bold text-base text-forest mb-2">Inter-Contract Actions</h3>
            <p className="text-xs text-on-surface-variant">Automatic triggers link applications to the escrow contract upon owner approval without requiring multiple steps.</p>
          </div>

          <div className="p-6 bg-surface border border-outline-variant rounded-lg hover:border-primary transition-colors">
            <span className="material-symbols-outlined text-primary text-4xl mb-4">rss_feed</span>
            <h3 className="font-bold text-base text-forest mb-2">Real-Time Sync Feed</h3>
            <p className="text-xs text-on-surface-variant">Get notified instantly of grant creation, application approvals, funds locks, and milestone releases.</p>
          </div>

          <div className="p-6 bg-surface border border-outline-variant rounded-lg hover:border-primary transition-colors">
            <span className="material-symbols-outlined text-primary text-4xl mb-4">query_stats</span>
            <h3 className="font-bold text-base text-forest mb-2">Institutional Analytics</h3>
            <p className="text-xs text-on-surface-variant">Analyze distribution graphs, monthly release summaries, category allocations, and milestone completion percentages.</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-surface-container-low border-t border-outline-variant py-20 w-full">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold font-soria text-forest mb-12 text-center">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left font-semibold text-sm text-forest flex justify-between items-center hover:bg-surface-container-low transition-colors"
                >
                  {faq.q}
                  <span className="material-symbols-outlined text-sm">
                    {activeFaq === idx ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                  </span>
                </button>
                {activeFaq === idx && (
                  <div className="px-6 pb-4 pt-2 text-xs text-on-surface-variant leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant py-10 w-full mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="font-allura text-3xl text-primary font-bold">GrantLink</span>
          <p className="text-xs text-on-surface-variant font-inter">© 2026 GrantLink. Powered by Stellar Soroban contracts. All Rights Reserved.</p>
          <div className="flex gap-6 text-xs text-on-surface-variant">
            <a href="#" className="hover:text-primary transition-colors">Documentation</a>
            <a href="#" className="hover:text-primary transition-colors">Security Audit</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
