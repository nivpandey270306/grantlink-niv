import React, { useState, useEffect } from 'react';
import { useDataStore, Grant, Application, NATIVE_TOKEN_ADDRESS } from '../store/data';
import { useWalletStore } from '../store/wallet';

export function MilestonesPage() {
  const { grants, selectedGrant, selectedGrantApps, events, depositFunds, releaseMilestone, refundGrant, addToast } = useDataStore();
  const { connected, address } = useWalletStore();

  const [escrowState, setEscrowState] = useState<any | null>(null);
  const [proofInputs, setProofInputs] = useState<{[key: number]: string}>({});
  const [proofsUploaded, setProofsUploaded] = useState<{[key: number]: { text: string; time: string }}>({});
  const [loadingAction, setLoadingAction] = useState(false);

  // Sync simulated escrow state for selected grant
  useEffect(() => {
    if (selectedGrant) {
      // Find if we have deposit/released events for this grant to rebuild state
      const isDeposited = events.some(e => e.grantId === selectedGrant.onChainId && e.type === 'FundsDeposited');
      const releasedMilestones = events
        .filter(e => e.grantId === selectedGrant.onChainId && e.type === 'MilestoneReleased')
        .map(e => e.details?.milestoneIdx ?? -1);

      // Create milestone array
      const milestoneCount = selectedGrant.milestoneCount;
      const amount = selectedGrant.amount;
      const milestone_amounts = [];
      const milestone_released = [];
      
      let remaining = amount;
      for (let i = 0; i < milestoneCount; i++) {
        let portion = 0;
        if (i === milestoneCount - 1) {
          portion = remaining;
        } else if (i === 0) {
          portion = Math.round(amount * 0.3);
        } else {
          portion = Math.round((amount * 0.7) / (milestoneCount - 1));
        }
        milestone_amounts.push(portion);
        milestone_released.push(releasedMilestones.includes(i));
        remaining -= portion;
      }

      // Check if all released
      const allCompleted = milestone_released.every(r => r === true);

      // Find recipient
      const approvedApp = selectedGrantApps.find(a => a.status === 1);

      setEscrowState({
        grantId: selectedGrant.onChainId,
        recipient: approvedApp ? approvedApp.applicant : 'No recipient approved yet',
        recipientName: approvedApp ? approvedApp.name : null,
        milestoneAmounts: milestone_amounts,
        milestoneReleased: milestone_released,
        fundsDeposited: isDeposited ? amount : 0,
        status: allCompleted ? 3 : isDeposited ? 1 : approvedApp ? 0 : -1, // -1: Need recipient, 0: Init (Ready to fund), 1: Funded, 3: Completed
      });
    } else {
      setEscrowState(null);
    }
  }, [selectedGrant, selectedGrantApps, events]);

  const handleDeposit = async () => {
    if (!selectedGrant || !escrowState) return;
    if (!connected || !address) {
      addToast('Wallet not connected', 'Connect wallet to lock funds.', 'error');
      return;
    }

    setLoadingAction(true);
    addToast('Initiating Deposit', 'Calling deposit_funds on GrantEscrow contract...', 'info');

    try {
      await depositFunds(selectedGrant.onChainId, NATIVE_TOKEN_ADDRESS);
    } catch (err: any) {
      addToast('Deposit Failed', err.message, 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUploadProof = (idx: number) => {
    const input = proofInputs[idx];
    if (!input) {
      addToast('Missing Input', 'Please type a summary or link to upload proof.', 'error');
      return;
    }

    setProofsUploaded(prev => ({
      ...prev,
      [idx]: { text: input, time: new Date().toLocaleTimeString() }
    }));
    setProofInputs(prev => ({ ...prev, [idx]: '' }));
    addToast('Proof Submitted', 'Off-chain milestone completion proof sent to reviewer.', 'success');
  };

  const handleRelease = async (idx: number, amt: number) => {
    if (!selectedGrant || !escrowState) return;
    if (!connected || !address) {
      addToast('Wallet not connected', 'Connect wallet to release milestone funds.', 'error');
      return;
    }

    setLoadingAction(true);
    addToast('Processing Release', `Invoking release_milestone(${selectedGrant.onChainId}, ${idx}) in contract...`, 'info');

    try {
      await releaseMilestone(selectedGrant.onChainId, idx, amt);
    } catch (err: any) {
      addToast('Release Failed', err.message, 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedGrant || !escrowState) return;
    if (!connected || !address) {
      addToast('Wallet not connected', 'Connect wallet to execute refunds.', 'error');
      return;
    }

    setLoadingAction(true);
    addToast('Triggering Refund', 'Refunding escrow funds back to owner wallet...', 'info');

    try {
      await refundGrant(selectedGrant.onChainId);
    } catch (err: any) {
      addToast('Refund Failed', err.message, 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  if (!selectedGrant || !escrowState) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-surface-container-lowest border border-outline border-dashed rounded-lg text-center min-h-[400px]">
        <span className="material-symbols-outlined text-outline text-5xl mb-4">account_tree</span>
        <h3 className="text-xl font-bold font-soria text-forest mb-2">Select a Grant to Track Milestones</h3>
        <p className="text-xs text-on-surface-variant font-inter max-w-sm leading-relaxed">
          Tracking escrow deposits and milestones releases requires an active grant focus. Navigate to the 'Grants' tab and click 'Manage & Track'.
        </p>
      </div>
    );
  }

  // Count milestones info
  const totalMilestones = escrowState.milestoneAmounts.length;
  const completedCount = escrowState.milestoneReleased.filter((r: boolean) => r).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex justify-between items-start border-b border-outline-variant pb-6 flex-col md:flex-row gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">Focus ID: #{selectedGrant.onChainId}</span>
            <span className="bg-primary text-surface font-semibold text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-inter">
              <span className="w-1 h-1 rounded-full bg-white"></span>
              Active
            </span>
          </div>
          <h2 className="text-3xl font-bold font-soria text-forest mb-1">{selectedGrant.title}</h2>
          <p className="text-xs text-on-surface-variant font-inter">Review milestones criteria and disburse smart contract escrow funds.</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-inter">Total Funding Pool</div>
          <div className="text-2xl font-bold text-primary font-mono">{selectedGrant.amount.toLocaleString()} XLM</div>
        </div>
      </header>

      {/* Main Grid: Info Cards and Timeline Track */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Escrow Status Summary */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold font-soria text-forest border-b border-outline-variant pb-2">Escrow Pool Details</h3>
            
            <div className="flex flex-col gap-1 text-xs">
              <span className="text-on-surface-variant font-semibold">Recipient:</span>
              <span className="font-mono bg-surface p-1.5 rounded truncate text-primary font-bold">
                {escrowState.recipient}
              </span>
              {escrowState.recipientName && (
                <span className="text-[10px] font-bold text-on-surface mt-1">Org: {escrowState.recipientName}</span>
              )}
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-on-surface-variant font-semibold">Locked Funds:</span>
              <strong className="font-mono text-forest font-bold">{escrowState.fundsDeposited.toLocaleString()} XLM</strong>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-on-surface-variant font-semibold">Disbursed Funds:</span>
              <strong className="font-mono text-forest font-bold">
                {escrowState.milestoneAmounts
                  .filter((_: any, i: number) => escrowState.milestoneReleased[i])
                  .reduce((sum: number, amt: number) => sum + amt, 0)
                  .toLocaleString()} XLM
              </strong>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-on-surface-variant font-semibold">Contract Status:</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                escrowState.status === 3
                  ? 'bg-primary text-surface'
                  : escrowState.status === 1
                  ? 'bg-primary bg-opacity-20 text-primary border border-primary border-opacity-35'
                  : escrowState.status === 0
                  ? 'bg-gold bg-opacity-20 text-gold border border-gold border-opacity-35'
                  : 'bg-copper bg-opacity-20 text-copper border border-copper border-opacity-35'
              }`}>
                {escrowState.status === 3 ? 'Completed' : escrowState.status === 1 ? 'Funded' : escrowState.status === 0 ? 'Awaiting Deposit' : 'Awaiting Recipient'}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-outline-variant">
              {escrowState.status === 0 && (
                <button
                  onClick={handleDeposit}
                  disabled={loadingAction}
                  className="w-full bg-primary text-surface font-semibold py-2.5 rounded hover:bg-forest transition-all text-xs flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-xs">lock</span>
                  Lock {selectedGrant.amount.toLocaleString()} XLM in Escrow
                </button>
              )}
              {escrowState.status === 1 && (
                <button
                  onClick={handleRefund}
                  disabled={loadingAction}
                  className="w-full border border-copper text-copper font-semibold py-2.5 rounded hover:bg-surface-container-low transition-all text-xs flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-xs">cancel</span>
                  Cancel Grant & Refund Owner
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Milestone Release Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold font-soria text-forest">Milestones List</h3>
              <span className="text-[10px] text-on-surface-variant font-bold">
                {completedCount} of {totalMilestones} Phases Completed
              </span>
            </div>

            <div className="relative pl-6 border-l-2 border-primary border-opacity-30 space-y-6">
              {escrowState.milestoneAmounts.map((amt: number, idx: number) => {
                const released = escrowState.milestoneReleased[idx];
                const uploaded = proofsUploaded[idx];
                
                return (
                  <div key={idx} className="relative">
                    {/* Timline dot */}
                    <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-surface-container-lowest ${
                      released ? 'bg-primary' : 'bg-surface border-outline'
                    }`}></div>

                    <div className={`p-4 rounded-lg border flex flex-col gap-3 transition-colors ${
                      released
                        ? 'bg-surface-container-low border-outline-variant opacity-80'
                        : 'bg-white border-outline-variant hover:border-primary'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-forest">Phase {idx + 1}: Milestone</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              released ? 'bg-primary text-surface' : 'bg-gold bg-opacity-20 text-gold'
                            }`}>
                              {released ? 'Released' : 'Locked'}
                            </span>
                          </div>
                          <span className="text-[10px] text-primary font-mono mt-0.5 font-bold">{amt.toLocaleString()} XLM</span>
                        </div>
                      </div>

                      {/* Submitted proof display */}
                      {uploaded && (
                        <div className="bg-surface p-2 rounded text-[10px] border border-outline-variant">
                          <div className="flex justify-between items-center mb-1 text-[9px] text-on-surface-variant font-semibold">
                            <span>Proof Uploaded ({uploaded.time})</span>
                            <span className="text-primary font-bold">Pending Review</span>
                          </div>
                          <p className="text-on-surface leading-normal">{uploaded.text}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {!released && (
                        <div className="pt-2 border-t border-outline-variant flex flex-col gap-2 md:flex-row justify-between items-center">
                          {/* Apply submission proof form */}
                          <div className="flex items-center gap-2 w-full md:w-auto">
                            <input
                              type="text"
                              value={proofInputs[idx] || ''}
                              onChange={(e) => setProofInputs({ ...proofInputs, [idx]: e.target.value })}
                              placeholder="Describe proof, add link..."
                              className="bg-surface border border-outline-variant rounded px-2 py-1 text-[10px] focus:outline-none focus:border-primary flex-1 min-w-[200px]"
                            />
                            <button
                              onClick={() => handleUploadProof(idx)}
                              className="bg-primary text-surface px-2.5 py-1 text-[9px] font-bold rounded hover:bg-forest transition-colors shadow-sm"
                            >
                              Submit Proof
                            </button>
                          </div>

                          {/* Funder release trigger */}
                          {escrowState.status === 1 && (
                            <button
                              onClick={() => handleRelease(idx, amt)}
                              disabled={loadingAction}
                              className="w-full md:w-auto bg-primary text-surface font-semibold px-4 py-2 rounded text-[10px] hover:bg-forest transition-colors flex items-center justify-center gap-1 disabled:opacity-50 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-xs">lock_open</span>
                              Release Funds
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
