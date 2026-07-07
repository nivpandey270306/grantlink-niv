import React, { useState } from 'react';
import { useDataStore, Grant } from '../store/data';
import { useWalletStore } from '../store/wallet';

interface GrantsPageProps {
  onSelectGrant: (grant: Grant) => void;
}

export function GrantsPage({ onSelectGrant }: GrantsPageProps) {
  const { grants, createGrant, addEvent, addToast, loading } = useDataStore();
  const { connected, address } = useWalletStore();
  
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technology');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [milestones, setMilestones] = useState(3);

  const [txState, setTxState] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [txHash, setTxHash] = useState('');

  // Calculate estimated milestone schedule for preview
  const milestoneCountVal = Math.max(1, Math.min(10, milestones));
  const amountVal = parseFloat(amount) || 0;
  const milestonePreviewList = [];
  
  if (milestoneCountVal > 0 && amountVal > 0) {
    // Distribute weights e.g. 30% first, then middle split, then remaining
    let remaining = amountVal;
    for (let i = 0; i < milestoneCountVal; i++) {
      let portion = 0;
      if (i === milestoneCountVal - 1) {
        portion = remaining;
      } else if (i === 0) {
        portion = Math.round(amountVal * 0.3);
      } else {
        portion = Math.round((amountVal * 0.7) / (milestoneCountVal - 1));
      }
      milestonePreviewList.push({
        phase: i + 1,
        percent: Math.round((portion / amountVal) * 100),
        amount: portion
      });
      remaining -= portion;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !address) {
      addToast('Wallet not connected', 'Please connect a wallet to submit to Soroban.', 'error');
      return;
    }
    if (!title || !amount || !deadline) {
      addToast('Validation Error', 'Please fill in all mandatory fields.', 'error');
      return;
    }

    setTxState('pending');
    
    try {
      // Simulate contract invoke deploy time delay
      await new Promise(r => setTimeout(r, 2000));
      
      const onChainId = grants.length + 1;
      const hash = '0x' + Array.from({length:64}, () => Math.floor(Math.random()*16).toString(16)).join('');
      
      // Store in DB
      await createGrant({
        onChainId,
        title,
        description,
        category,
        amount: amountVal,
        deadline,
        milestoneCount: milestoneCountVal,
        owner: address,
        status: 0,
      });

      // Log event
      await addEvent({
        type: 'GrantCreated',
        txHash: hash,
        grantId: onChainId,
        details: { owner: address, amount: amountVal }
      });

      setTxHash(hash);
      setTxState('success');
      addToast('Grant Created Successfully', `On-Chain transaction confirmed. ID: #${onChainId}`, 'success');

      // Reset
      setTitle('');
      setDescription('');
      setAmount('');
      setDeadline('');
      setMilestones(3);
      
      setTimeout(() => {
        setTxState('idle');
        setShowForm(false);
      }, 2000);

    } catch (err: any) {
      setTxState('failed');
      addToast('Transaction Failed', err.message, 'error');
      setTimeout(() => setTxState('idle'), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Row */}
      <header className="flex justify-between items-center border-b border-outline-variant pb-6">
        <div>
          <h2 className="text-3xl font-bold font-soria text-forest mb-2">Fund Opportunities</h2>
          <p className="text-sm text-on-surface-variant font-inter">Deploy and monitor on-chain grants structures.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-surface font-semibold px-5 py-2.5 rounded hover:bg-forest transition-colors text-sm flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel Creation' : 'Create Grant'}
        </button>
      </header>

      {/* Transaction Modal Overlay */}
      {txState !== 'idle' && (
        <div className="fixed inset-0 bg-forest bg-opacity-25 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
            {txState === 'pending' && (
              <>
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <h4 className="font-bold text-forest font-soria text-lg">Submitting to Soroban</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Building and simulating transaction. Please approve the signing request in your wallet extension...
                </p>
                <div className="w-full bg-surface-container-low h-1.5 rounded overflow-hidden">
                  <div className="bg-primary h-full rounded animate-pulse" style={{width: '65%'}}></div>
                </div>
              </>
            )}
            {txState === 'success' && (
              <>
                <span className="material-symbols-outlined text-primary text-5xl">check_circle</span>
                <h4 className="font-bold text-forest font-soria text-lg">Transaction Complete</h4>
                <p className="text-xs text-on-surface-variant">
                  Funds allocated successfully in registry.
                </p>
                <div className="w-full bg-surface p-2.5 rounded font-mono text-[9px] text-on-surface-variant break-all border border-outline-variant">
                  Hash: {txHash}
                </div>
              </>
            )}
            {txState === 'failed' && (
              <>
                <span className="material-symbols-outlined text-copper text-5xl">error</span>
                <h4 className="font-bold text-copper font-soria text-lg">Submission Rejected</h4>
                <p className="text-xs text-on-surface-variant">
                  Transaction signature rejected or RPC simulated execution failed.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Slide-out/Toggle Form */}
      {showForm && (
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Main Form controls */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold font-soria text-primary">New Grant Parameters</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface" htmlFor="title">Grant Title *</label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Regenerative Agriculture Fund 2026"
                  className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface" htmlFor="desc">Detailed Description</label>
                <textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide scope, targets, and criteria..."
                  className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface" htmlFor="category">Category</label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option>Technology</option>
                    <option>Agriculture</option>
                    <option>Education</option>
                    <option>Healthcare</option>
                    <option>Energy</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface" htmlFor="amount">Funding Cap (XLM) *</label>
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g., 500000"
                    className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface" htmlFor="milestones">Milestone Phases Count *</label>
                  <input
                    type="number"
                    id="milestones"
                    value={milestones}
                    onChange={(e) => setMilestones(parseInt(e.target.value))}
                    min={1}
                    max={10}
                    className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface" htmlFor="deadline">Application Deadline *</label>
                  <input
                    type="date"
                    id="deadline"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-outline text-on-surface-variant font-semibold px-5 py-2 rounded text-sm hover:bg-surface"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-surface font-semibold px-6 py-2 rounded text-sm hover:bg-forest transition-colors flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">gavel</span>
                Submit to Soroban
              </button>
            </div>
          </form>

          {/* Milestone preview sidebar */}
          <div className="bg-surface-container-low rounded border border-outline-variant p-4 h-fit">
            <h4 className="font-bold text-sm text-forest font-soria mb-2">Milestone Schedule Preview</h4>
            <p className="text-[10px] text-on-surface-variant mb-4 leading-relaxed">
              Based on the funding cap, the smart contract will locks assets into the following disbursement releases.
            </p>
            {milestonePreviewList.length === 0 ? (
              <div className="text-center py-8 text-xs text-outline italic">
                Provide funding cap and phases count to build preview.
              </div>
            ) : (
              <div className="relative pl-3 border-l border-primary border-opacity-35 space-y-4">
                {milestonePreviewList.map((m) => (
                  <div key={m.phase} className="relative">
                    <div className="absolute -left-[16px] top-1.5 w-2 h-2 rounded-full bg-primary"></div>
                    <div className="bg-white p-2.5 rounded border border-outline-variant flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-forest">Phase {m.phase}</span>
                        <div className="text-[9px] text-on-surface-variant mt-0.5">Disbursement Weight: {m.percent}%</div>
                      </div>
                      <span className="font-mono text-primary font-bold">{m.amount.toLocaleString()} XLM</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant text-[10px] font-bold text-on-surface-variant uppercase font-inter">
              <th className="p-4">Grant Details</th>
              <th className="p-4">Category</th>
              <th className="p-4">Funding Cap</th>
              <th className="p-4">Applicants</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {grants.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-xs text-outline italic">
                  No active grants created on-chain yet. Click 'Create Grant' above to register one.
                </td>
              </tr>
            ) : (
              grants.map((grant) => (
                <tr key={grant.onChainId} className="border-b border-outline-variant hover:bg-surface transition-colors font-inter text-xs">
                  <td className="p-4">
                    <div className="font-bold text-forest text-sm">{grant.title}</div>
                    <div className="text-[10px] text-on-surface-variant mt-0.5 truncate max-w-[250px]">{grant.description}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded bg-surface border border-outline-variant font-semibold">
                      {grant.category}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-primary">
                    {grant.amount.toLocaleString()} XLM
                  </td>
                  <td className="p-4 text-on-surface font-semibold">
                    {grant.proposersCount || 0}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      grant.status === 0
                        ? 'bg-primary bg-opacity-15 text-primary border border-primary border-opacity-25'
                        : grant.status === 1
                        ? 'bg-copper bg-opacity-15 text-copper border border-copper border-opacity-25'
                        : 'bg-outline-variant text-on-surface border border-outline'
                    }`}>
                      {grant.status === 0 ? 'Active' : grant.status === 1 ? 'Cancelled' : 'Completed'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => onSelectGrant(grant)}
                      className="px-3 py-1.5 border border-primary text-primary font-semibold rounded hover:bg-primary hover:text-surface transition-all"
                    >
                      Manage & Track
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
