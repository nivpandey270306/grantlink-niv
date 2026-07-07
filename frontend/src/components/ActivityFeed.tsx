import React, { useState, useEffect } from 'react';
import { useDataStore } from '../store/data';

export function ActivityFeed() {
  const { events, fetchEvents } = useDataStore();
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  const eventTypes = [
    { id: 'all', label: 'All Actions' },
    { id: 'GrantCreated', label: 'Grants' },
    { id: 'ApplicationSubmitted', label: 'Applications' },
    { id: 'FundsDeposited', label: 'Escrow Locks' },
    { id: 'MilestoneReleased', label: 'Milestone Releases' },
  ];

  const filteredEvents = events.filter(e => {
    if (filterType === 'all') return true;
    return e.type === filterType;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-outline-variant pb-6">
        <div>
          <h2 className="text-3xl font-bold font-soria text-forest mb-2">Activity Feed</h2>
          <p className="text-sm text-on-surface-variant font-inter">Live auditing timeline of on-chain operations and metadata sync logs.</p>
        </div>
        <button
          onClick={fetchEvents}
          className="border border-outline text-on-surface-variant font-semibold px-4 py-2 rounded text-xs hover:bg-surface-container transition-colors flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-xs">refresh</span>
          Refresh Feed
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-outline-variant pb-4">
        {eventTypes.map(t => (
          <button
            key={t.id}
            onClick={() => setFilterType(t.id)}
            className={`px-3 py-1.5 rounded text-xs font-semibold font-inter transition-all ${
              filterType === t.id
                ? 'bg-[#283618] text-white shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Timeline List */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col min-h-[400px]">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-20 text-xs text-outline italic">
            No events found matching this filter category.
          </div>
        ) : (
          <div className="relative pl-6 border-l border-primary border-opacity-25 space-y-8">
            {filteredEvents.map((evt, idx) => {
              const formattedTime = evt.timestamp ? new Date(evt.timestamp).toLocaleString() : 'Just now';
              
              let badgeColor = 'bg-surface text-on-surface-variant';
              if (evt.type === 'GrantCreated') badgeColor = 'bg-[#FEFAE0] text-[#714507] border border-[#ffdcbb]';
              if (evt.type === 'ApplicationSubmitted') badgeColor = 'bg-surface-container-low text-forest border border-[#bbcda3]';
              if (evt.type === 'ApplicationApproved' || evt.type === 'MilestoneReleased') badgeColor = 'bg-primary bg-opacity-15 text-primary border border-primary border-opacity-30';
              if (evt.type === 'FundsDeposited') badgeColor = 'bg-[#d7e9bd] text-[#283618] border border-outline-variant';

              return (
                <div key={idx} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-surface-container-lowest"></div>
                  
                  <div className="bg-white p-4 rounded-lg border border-outline-variant flex flex-col md:flex-row justify-between gap-4 items-start hover:border-primary transition-colors">
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${badgeColor}`}>
                          {evt.type.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-[10px] text-outline font-semibold font-mono">{formattedTime}</span>
                      </div>
                      
                      <p className="text-xs text-on-surface leading-relaxed mt-1">
                        {evt.type === 'GrantCreated' && (
                          <>Registered new grant on-chain with funding limit of <strong>{evt.details?.amount?.toLocaleString()} XLM</strong>.</>
                        )}
                        {evt.type === 'ApplicationSubmitted' && (
                          <>Proposal submitted by applicant address: <code>{evt.details?.applicant}</code> for grant pool #{evt.grantId}.</>
                        )}
                        {evt.type === 'ApplicationApproved' && (
                          <>Approved application ID #{evt.details?.appId} for grant pool #{evt.grantId}. Escrow contract associated.</>
                        )}
                        {evt.type === 'FundsDeposited' && (
                          <>Locked <strong>{evt.details?.amount?.toLocaleString()} XLM</strong> in escrow storage for grant #{evt.grantId}.</>
                        )}
                        {evt.type === 'MilestoneReleased' && (
                          <>Milestone #{evt.details?.milestoneIdx + 1} verified. Disbursed <strong>{evt.details?.amount?.toLocaleString()} XLM</strong> to recipient address <code>{evt.details?.recipient}</code>.</>
                        )}
                        {evt.type === 'FundsRefunded' && (
                          <>Cancelled grant pool #{evt.grantId}. Escrow balance refunded back to owner wallet.</>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 font-mono text-[9px] font-semibold text-on-surface-variant">
                      {evt.txHash && (
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${evt.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded bg-surface hover:bg-surface-container border border-outline-variant text-[9px] text-primary flex items-center gap-1 transition-colors"
                        >
                          <span>tx: {evt.txHash.slice(0, 8)}...{evt.txHash.slice(-6)}</span>
                          <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
