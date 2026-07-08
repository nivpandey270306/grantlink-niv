import React, { useState } from 'react';
import { useDataStore, Grant } from '../store/data';
import { useWalletStore } from '../store/wallet';

interface GrantsPageProps {
  onSelectGrant: (grant: Grant) => void;
}

export function GrantsPage({ onSelectGrant }: GrantsPageProps) {
  const { grants, createGrant, updateGrant, cancelGrant, addToast, loading } = useDataStore();
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

  // Edit Grant Modal state
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('Technology');
  const [editTxState, setEditTxState] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [editTxHash, setEditTxHash] = useState('');

  // Cancel Grant Confirmation state
  const [cancelTargetGrant, setCancelTargetGrant] = useState<Grant | null>(null);
  const [cancelTxState, setCancelTxState] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [cancelTxHash, setCancelTxHash] = useState('');

  const templates = [
    {
      id: 'dev_tooling',
      label: 'Developer Tooling',
      category: 'Technology',
      title: 'Stellar Dev Tooling Grant',
      description: 'Grant for developing open-source tools, developer SDKs, or API integrations on Stellar.',
      amount: '50000',
      milestones: 3,
      deadlineOffsetMonths: 3
    },
    {
      id: 'community_edu',
      label: 'Community Education',
      category: 'Education',
      title: 'Soroban Community Onboarding Initiative',
      description: 'Funding for building onboarding content, workshops, and educational programs to teach Soroban.',
      amount: '15000',
      milestones: 2,
      deadlineOffsetMonths: 2
    },
    {
      id: 'cleantech_accel',
      label: 'CleanTech Accelerator',
      category: 'Energy',
      title: 'CleanTech Ecosystem Accelerator',
      description: 'Large-scale grant for building climate-tech solutions or localized grid integrations on Stellar.',
      amount: '120000',
      milestones: 5,
      deadlineOffsetMonths: 6
    }
  ];

  const applyTemplate = (tpl: typeof templates[0]) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setCategory(tpl.category);
    setAmount(tpl.amount);
    setMilestones(tpl.milestones);
    
    const d = new Date();
    d.setMonth(d.getMonth() + tpl.deadlineOffsetMonths);
    setDeadline(d.toISOString().split('T')[0]);
    addToast('Template Applied', `Form populated with "${tpl.label}" template.`, 'info');
  };

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
      const hash = await createGrant({
        title,
        description,
        category,
        amount: amountVal,
        deadline,
        milestoneCount: milestoneCountVal,
        owner: address,
        status: 0,
      });

      setTxHash(hash);
      setTxState('success');

      // Reset
      setTitle('');
      setDescription('');
      setAmount('');
      setDeadline('');
      setMilestones(3);
      
      setTimeout(() => {
        setTxState('idle');
        setShowForm(false);
      }, 3000);

    } catch (err: any) {
      setTxState('failed');
      addToast('Transaction Failed', err.message, 'error');
      setTimeout(() => setTxState('idle'), 4000);
    }
  };

  const openEditModal = (grant: Grant) => {
    setEditingGrant(grant);
    setEditTitle(grant.title);
    setEditDescription(grant.description);
    setEditCategory(grant.category);
    setEditTxState('idle');
    setEditTxHash('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrant) return;
    if (!connected || !address) {
      addToast('Wallet not connected', 'Connect wallet to update grant.', 'error');
      return;
    }

    setEditTxState('pending');
    try {
      const hash = await updateGrant(editingGrant.onChainId, {
        title: editTitle,
        description: editDescription,
        category: editCategory,
      });
      setEditTxHash(hash);
      setEditTxState('success');
      setTimeout(() => {
        setEditingGrant(null);
        setEditTxState('idle');
      }, 3000);
    } catch (err: any) {
      setEditTxState('failed');
      addToast('Update Failed', err.message, 'error');
      setTimeout(() => setEditTxState('idle'), 4000);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTargetGrant) return;
    if (!connected || !address) {
      addToast('Wallet not connected', 'Connect wallet to cancel grant.', 'error');
      return;
    }

    setCancelTxState('pending');
    try {
      const hash = await cancelGrant(cancelTargetGrant.onChainId);
      setCancelTxHash(hash);
      setCancelTxState('success');
      setTimeout(() => {
        setCancelTargetGrant(null);
        setCancelTxState('idle');
      }, 3000);
    } catch (err: any) {
      setCancelTxState('failed');
      addToast('Cancel Failed', err.message, 'error');
      setTimeout(() => setCancelTxState('idle'), 4000);
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
            
            {/* Quick Templates selector */}
            <div className="bg-surface-container-low border border-outline-variant p-4 rounded space-y-3">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase font-inter tracking-wider">Quick Start Templates</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="p-3 border border-outline-variant rounded hover:border-primary hover:bg-surface text-left transition-all flex flex-col gap-1 focus:outline-none bg-white"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[11px] font-bold text-forest">{tpl.label}</span>
                      <span className="px-1 py-0.5 rounded text-[8px] bg-primary bg-opacity-10 text-primary font-bold">{tpl.category}</span>
                    </div>
                    <span className="text-[9px] text-on-surface-variant font-inter leading-tight line-clamp-2 h-7">{tpl.description}</span>
                    <div className="flex justify-between items-center text-[9px] font-mono mt-1 pt-1 border-t border-dashed border-outline-variant text-on-surface-variant w-full">
                      <span>{tpl.amount} XLM</span>
                      <span>{tpl.milestones} Phases</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

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
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <button
                        onClick={() => onSelectGrant(grant)}
                        className="px-3 py-1.5 border border-primary text-primary font-semibold rounded hover:bg-primary hover:text-surface transition-all text-xs"
                      >
                        Manage &amp; Track
                      </button>
                      {grant.status === 0 && (
                        <>
                          <button
                            onClick={() => openEditModal(grant)}
                            title="Edit grant title/description on-chain"
                            className="px-2.5 py-1.5 border border-outline text-on-surface-variant font-semibold rounded hover:bg-surface-container hover:text-forest transition-all text-xs flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">edit</span>
                            Edit
                          </button>
                          <button
                            onClick={() => { setCancelTargetGrant(grant); setCancelTxState('idle'); }}
                            title="Cancel this grant on-chain"
                            className="px-2.5 py-1.5 border border-copper text-copper font-semibold rounded hover:bg-copper hover:text-surface transition-all text-xs flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">cancel</span>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Edit Grant Modal ── */}
      {editingGrant && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 max-w-lg w-full shadow-xl flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <div>
                <h3 className="text-xl font-bold font-soria text-forest">Edit Grant</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Grant #{editingGrant.onChainId} — invokes <code className="text-primary">update_grant()</code></p>
              </div>
              <button onClick={() => setEditingGrant(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {editTxState === 'idle' && (
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface">Grant Title *</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    rows={3}
                    className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface">Category</label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option>Technology</option><option>Agriculture</option>
                    <option>Education</option><option>Healthcare</option><option>Energy</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end pt-2 border-t border-outline-variant">
                  <button type="button" onClick={() => setEditingGrant(null)} className="border border-outline text-on-surface-variant font-semibold px-4 py-2 rounded text-sm hover:bg-surface">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="bg-primary text-surface font-semibold px-5 py-2 rounded text-sm hover:bg-forest flex items-center gap-2 disabled:opacity-50">
                    <span className="material-symbols-outlined text-sm">save</span>
                    Save to Soroban
                  </button>
                </div>
              </form>
            )}

            {editTxState === 'pending' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-on-surface-variant">Submitting update_grant() to Soroban...</p>
              </div>
            )}
            {editTxState === 'success' && (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <span className="material-symbols-outlined text-primary text-5xl">check_circle</span>
                <p className="font-bold text-forest font-soria">Grant Updated On-Chain</p>
                <div className="font-mono text-[9px] bg-surface p-2 rounded border break-all">{editTxHash}</div>
                <a href={`https://stellar.expert/explorer/testnet/tx/${editTxHash}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">
                  View on Stellar Expert <span className="material-symbols-outlined text-xs">open_in_new</span>
                </a>
              </div>
            )}
            {editTxState === 'failed' && (
              <div className="flex flex-col items-center gap-2 py-4 text-center text-copper">
                <span className="material-symbols-outlined text-4xl">error</span>
                <p className="font-bold">Update transaction failed</p>
                <button onClick={() => setEditTxState('idle')} className="text-xs border border-outline px-3 py-1 rounded mt-1">Try Again</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cancel Grant Confirmation Modal ── */}
      {cancelTargetGrant && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 max-w-sm w-full shadow-xl flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="material-symbols-outlined text-copper text-5xl">warning</span>
              <h3 className="text-xl font-bold font-soria text-forest">Cancel Grant #{cancelTargetGrant.onChainId}?</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                This will invoke <code className="text-primary">cancel_grant()</code> on-chain. The grant status will permanently change to <strong>Cancelled</strong>. This action cannot be undone.
              </p>
              <div className="bg-surface border border-outline-variant rounded p-3 text-xs w-full text-left">
                <div className="font-bold text-forest truncate">{cancelTargetGrant.title}</div>
                <div className="text-on-surface-variant mt-0.5">Funding: {cancelTargetGrant.amount.toLocaleString()} XLM</div>
              </div>
            </div>

            {cancelTxState === 'idle' && (
              <div className="flex gap-3">
                <button onClick={() => setCancelTargetGrant(null)} className="flex-1 border border-outline text-on-surface-variant font-semibold py-2 rounded text-sm hover:bg-surface">
                  Go Back
                </button>
                <button onClick={handleCancelConfirm} disabled={loading} className="flex-1 bg-copper text-surface font-semibold py-2 rounded text-sm hover:bg-opacity-90 flex items-center justify-center gap-2 disabled:opacity-50">
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  Cancel Grant
                </button>
              </div>
            )}
            {cancelTxState === 'pending' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-10 h-10 border-4 border-copper border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-on-surface-variant font-semibold">Invoking cancel_grant()...</p>
              </div>
            )}
            {cancelTxState === 'success' && (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <span className="material-symbols-outlined text-primary text-4xl">check_circle</span>
                <p className="font-bold text-forest font-soria text-sm">Grant Cancelled On-Chain</p>
                <a href={`https://stellar.expert/explorer/testnet/tx/${cancelTxHash}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  View Transaction <span className="material-symbols-outlined text-xs">open_in_new</span>
                </a>
              </div>
            )}
            {cancelTxState === 'failed' && (
              <div className="flex flex-col items-center gap-2 text-copper text-center py-2">
                <span className="material-symbols-outlined text-3xl">error</span>
                <p className="text-xs font-bold">Cancellation failed</p>
                <button onClick={() => setCancelTxState('idle')} className="text-xs border border-copper px-3 py-1 rounded mt-1">Retry</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
