import React, { useState } from 'react';
import { useDataStore, Grant } from '../store/data';
import { useWalletStore } from '../store/wallet';

export function ApplicationsPage() {
  const { grants, applications, selectedGrant, selectedGrantApps, submitApplication, approveApplication, rejectApplication, addEvent, addToast } = useDataStore();
  const { connected, address } = useWalletStore();

  const [showApplyForm, setShowApplyForm] = useState(false);
  const [selectedGrantId, setSelectedGrantId] = useState<number | ''>('');
  
  // Submit Form States
  const [applicantName, setApplicantName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [proposalText, setProposalText] = useState('');
  const [requestedAmt, setRequestedAmt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeGrants = grants.filter(g => g.status === 0);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !address) {
      addToast('Wallet not connected', 'Please connect Freighter or Albedo to apply.', 'error');
      return;
    }
    if (!selectedGrantId || !applicantName || !projectTitle || !proposalText || !requestedAmt) {
      addToast('Validation Error', 'All fields are required to apply.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      await submitApplication({
        grantOnChainId: Number(selectedGrantId),
        applicant: address,
        name: applicantName,
        projectTitle,
        proposal: proposalText,
        requestedAmount: parseFloat(requestedAmt),
      });

      // Reset
      setApplicantName('');
      setProjectTitle('');
      setProposalText('');
      setRequestedAmt('');
      setSelectedGrantId('');
      setShowApplyForm(false);
    } catch (err: any) {
      addToast('Error submitting proposal', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (appId: number, grantId: number, requestedAmount: number) => {
    if (!connected || !address) {
      addToast('Wallet not connected', 'Please connect to execute approvals.', 'error');
      return;
    }
    
    try {
      const targetGrant = grants.find(g => g.onChainId === grantId);
      const milestoneCount = targetGrant ? targetGrant.milestoneCount : 3;

      const milestoneAmounts = [];
      let remaining = requestedAmount;
      for (let i = 0; i < milestoneCount; i++) {
        let portion = 0;
        if (i === milestoneCount - 1) {
          portion = remaining;
        } else if (i === 0) {
          portion = Math.round(requestedAmount * 0.3);
        } else {
          portion = Math.round((requestedAmount * 0.7) / (milestoneCount - 1));
        }
        milestoneAmounts.push(portion);
        remaining -= portion;
      }

      await approveApplication(appId, grantId, milestoneAmounts);
    } catch (err: any) {
      addToast('Approval Failed', err.message, 'error');
    }
  };

  const handleReject = async (appId: number, grantId: number) => {
    try {
      await rejectApplication(appId, grantId);
    } catch (err: any) {
      addToast('Action Failed', err.message, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex justify-between items-center border-b border-outline-variant pb-6">
        <div>
          <h2 className="text-3xl font-bold font-soria text-forest mb-2">Proposal Management</h2>
          <p className="text-sm text-on-surface-variant font-inter">Manage incoming applications and approve escrow fund locks.</p>
        </div>
        <button
          onClick={() => setShowApplyForm(!showApplyForm)}
          className="bg-primary text-surface font-semibold px-5 py-2.5 rounded hover:bg-forest transition-colors text-sm flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">{showApplyForm ? 'close' : 'rate_review'}</span>
          {showApplyForm ? 'Cancel Proposal' : 'Apply for Grant'}
        </button>
      </header>

      {/* Slide-out apply form */}
      {showApplyForm && (
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-6 shadow-sm max-w-2xl animate-fadeIn">
          <form onSubmit={handleApply} className="space-y-4">
            <h3 className="text-lg font-bold font-soria text-primary mb-2">Submit Proposal Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">Target Grant *</label>
                <select
                  value={selectedGrantId}
                  onChange={(e) => setSelectedGrantId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  required
                >
                  <option value="">Select an active grant...</option>
                  {activeGrants.map(g => (
                    <option key={g.onChainId} value={g.onChainId}>{g.title} ({g.amount} XLM)</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">Applicant Name / Org *</label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="e.g., Clean Water NGO"
                  className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">Project Title *</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g., Well Digging Initiative"
                  className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">Requested Funding (XLM) *</label>
                <input
                  type="number"
                  value={requestedAmt}
                  onChange={(e) => setRequestedAmt(e.target.value)}
                  placeholder="e.g., 25000"
                  className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface">Proposal Abstract / Scope *</label>
              <textarea
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
                placeholder="Detail your goals, implementation timeline, and resource allocation..."
                className="bg-surface border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                rows={5}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowApplyForm(false)}
                className="border border-outline text-on-surface-variant font-semibold px-4 py-2 rounded text-sm hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary text-surface font-semibold px-5 py-2 rounded text-sm hover:bg-forest transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Send Proposal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Selected Grant Focus Header */}
      {selectedGrant ? (
        <div className="bg-surface-container border border-outline-variant p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Active Focus Filter</div>
            <h3 className="text-lg font-bold text-forest font-soria mt-1">{selectedGrant.title}</h3>
          </div>
          <button
            onClick={() => useDataStore.getState().setSelectedGrant(null)}
            className="text-xs text-copper border border-copper font-semibold px-3 py-1.5 rounded hover:bg-surface-container-low transition-colors"
          >
            Clear Filter (Show All)
          </button>
        </div>
      ) : (
        <div className="p-4 bg-surface-container-low border border-dashed border-outline rounded-lg text-xs text-on-surface-variant italic">
          Tip: Select a specific grant in the 'Grants' tab to display and approve only its applicants pool.
        </div>
      )}

      {/* Proposals List Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div className="p-4 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-bold text-sm text-forest font-soria">Review Panel</h3>
          <span className="text-[10px] text-on-surface-variant font-bold">Applications Awaiting Review</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant text-[10px] font-bold text-on-surface-variant uppercase font-inter">
              <th className="p-4">Applicant & Title</th>
              <th className="p-4">Abstract Summary</th>
              <th className="p-4">Requested Funding</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(selectedGrant ? selectedGrantApps : applications).length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-xs text-outline italic">
                  No applications submitted for {selectedGrant ? 'this grant' : 'any grants'} yet.
                </td>
              </tr>
            ) : (
              (selectedGrant ? selectedGrantApps : applications).map((app) => (
                <tr key={app.onChainId} className="border-b border-outline-variant hover:bg-surface transition-colors font-inter text-xs">
                  <td className="p-4">
                    <div className="font-bold text-forest text-sm">{app.name}</div>
                    <div className="text-[10px] text-primary font-semibold mt-0.5">{app.projectTitle}</div>
                    <div className="text-[9px] font-mono text-outline mt-1 truncate max-w-[150px]">Addr: {app.applicant}</div>
                  </td>
                  <td className="p-4">
                    <p className="line-clamp-2 max-w-[300px] text-on-surface-variant text-[11px] leading-relaxed">
                      {app.proposal}
                    </p>
                  </td>
                  <td className="p-4 font-mono font-bold text-primary">
                    {app.requestedAmount.toLocaleString()} XLM
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      app.status === 0
                        ? 'bg-gold bg-opacity-15 text-gold border border-gold border-opacity-25'
                        : app.status === 1
                        ? 'bg-primary bg-opacity-15 text-primary border border-primary border-opacity-25'
                        : 'bg-copper bg-opacity-15 text-copper border border-copper border-opacity-25'
                    }`}>
                      {app.status === 0 ? 'Pending' : app.status === 1 ? 'Approved' : 'Rejected'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {app.status === 0 ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleApprove(app.onChainId, app.grantOnChainId, app.requestedAmount)}
                          className="bg-primary text-surface font-semibold px-2.5 py-1.5 rounded hover:bg-forest transition-colors text-[10px]"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(app.onChainId, app.grantOnChainId)}
                          className="border border-copper text-copper font-semibold px-2.5 py-1.5 rounded hover:bg-surface transition-colors text-[10px]"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-outline font-semibold">Reviewed</span>
                    )}
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
