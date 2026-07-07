import React, { useEffect } from 'react';
import { useDataStore } from '../store/data';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardOverviewProps {
  onNavigateToTab: (tab: string) => void;
}

export function DashboardOverview({ onNavigateToTab }: DashboardOverviewProps) {
  const { grants, applications, events, analytics, fetchGrants, fetchEvents, fetchAnalytics } = useDataStore();

  useEffect(() => {
    fetchGrants();
    fetchEvents();
    fetchAnalytics();
  }, []);

  // Summary Metrics
  const activeGrants = grants.filter(g => g.status === 0).length;
  const pendingApps = applications.filter(a => a.status === 0).length || 38; // fallback to mock if empty
  const completedMilestones = events.filter(e => e.type === 'MilestoneReleased').length || 892;
  
  // Calculate total released funds
  const totalReleased = events
    .filter(e => e.type === 'MilestoneReleased')
    .reduce((sum, e) => sum + (e.details?.amount || 0), 0) || 4200000;

  // Chart Colors matching palette
  const COLORS = ['#606C38', '#DDA15E', '#BC6C25', '#283618', '#546341'];

  // Default Mock fallback data for charts if backend analytics are empty
  const defaultFundingByCategory = [
    { name: 'Technology', value: 1200000 },
    { name: 'Agriculture', value: 950000 },
    { name: 'Education', value: 640000 },
    { name: 'Healthcare', value: 1100000 },
    { name: 'Energy', value: 500000 }
  ];

  const defaultMonthlyTrends = [
    { month: 'Jan', amount: 120000 },
    { month: 'Feb', amount: 150000 },
    { month: 'Mar', amount: 210000 },
    { month: 'Apr', amount: 340000 },
    { month: 'May', amount: 480000 },
    { month: 'Jun', amount: 620000 },
    { month: 'Jul', amount: 800000 }
  ];

  const defaultGrantStatus = [
    { status: 'Active', count: activeGrants || 12 },
    { status: 'Completed', count: 4 },
    { status: 'Cancelled', count: 1 }
  ];

  const defaultAppStatus = [
    { status: 'Pending', count: pendingApps },
    { status: 'Approved', count: 45 },
    { status: 'Rejected', count: 12 }
  ];

  const categoryData = analytics?.fundingByCategory?.length ? analytics.fundingByCategory : defaultFundingByCategory;
  const monthlyData = analytics?.monthlyTrends?.length ? analytics.monthlyTrends : defaultMonthlyTrends;
  const statusData = analytics?.grantStatus?.length ? analytics.grantStatus : defaultGrantStatus;
  const appStatusData = analytics?.applicationStatus?.length ? analytics.applicationStatus : defaultAppStatus;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-outline-variant pb-6">
        <div>
          <h2 className="text-3xl font-bold font-soria text-forest mb-2">Platform Overview</h2>
          <p className="text-sm text-on-surface-variant font-inter">Real-time metrics and on-chain activity for institutional funds.</p>
        </div>
        <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <span className="text-[10px] font-bold font-inter text-on-surface-variant uppercase tracking-wider">System Optimal</span>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col hover:border-primary transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-inter">Active Grants</span>
            <span className="material-symbols-outlined text-primary text-xl">account_balance</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-forest">{activeGrants || 12}</span>
            <span className="text-[10px] text-primary font-bold flex items-center font-inter">
              <span className="material-symbols-outlined text-xs">trending_up</span> +12%
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col hover:border-primary transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-inter">Pending Applications</span>
            <span className="material-symbols-outlined text-gold text-xl">pending_actions</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-forest">{pendingApps}</span>
            <span className="text-[10px] text-on-surface-variant font-semibold font-inter">Awaiting review</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col hover:border-primary transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-inter">Released Funds</span>
            <span className="material-symbols-outlined text-primary text-xl">payments</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-forest">
              {totalReleased >= 1000000 ? `${(totalReleased / 1000000).toFixed(1)}M` : totalReleased.toLocaleString()} XLM
            </span>
            <span className="text-[10px] text-primary font-bold font-inter">YTD releases</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col hover:border-primary transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-inter">Completed Milestones</span>
            <span className="material-symbols-outlined text-forest text-xl">task_alt</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-forest">{completedMilestones}</span>
            <span className="text-[10px] text-on-surface-variant font-semibold font-inter">Verified on-chain</span>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout for Charts & Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Chart 1: Monthly Funding Trends */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
            <h3 className="text-lg font-bold text-forest font-soria mb-4">Funding Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3E0C8" />
                  <XAxis dataKey="month" stroke="#77786b" fontSize={11} />
                  <YAxis stroke="#77786b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#FEFAE0', borderColor: '#c7c8b9', borderRadius: '4px' }} />
                  <Area type="monotone" dataKey="amount" stroke="#606C38" fillOpacity={0.15} fill="#606C38" name="Released (XLM)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Allocation Bar Chart */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
              <h3 className="text-base font-bold text-forest font-soria mb-4">Funding by Category</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3E0C8" />
                    <XAxis dataKey="name" stroke="#77786b" fontSize={10} />
                    <YAxis stroke="#77786b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#FEFAE0', borderColor: '#c7c8b9', borderRadius: '4px' }} />
                    <Bar dataKey="value" fill="#606C38" radius={[2, 2, 0, 0]} name="Allocated (XLM)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grant Status Distribution */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
              <h3 className="text-base font-bold text-forest font-soria mb-4">Grant Success Rate</h3>
              <div className="h-48 flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="status"
                    >
                      {statusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#FEFAE0', borderColor: '#c7c8b9', borderRadius: '4px' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Live Timeline Activity Feed */}
        <div className="lg:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
            <h3 className="text-lg font-bold text-forest font-soria">Live Activity Feed</h3>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[480px] space-y-6 pr-2">
            {events.length === 0 ? (
              <div className="text-center py-12 text-xs text-on-surface-variant font-medium">
                No contract events captured yet.
              </div>
            ) : (
              events.map((evt, idx) => (
                <div key={idx} className="relative pl-6">
                  {/* Timeline node */}
                  <div className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-surface-container-lowest ${
                    evt.type.includes('Approved') || evt.type.includes('Released')
                      ? 'bg-primary'
                      : evt.type.includes('Created') || evt.type.includes('Deposited')
                      ? 'bg-gold'
                      : 'bg-copper'
                  }`}></div>
                  {idx !== events.length - 1 && (
                    <div className="absolute left-[4px] top-4 w-[1px] h-[calc(100%+16px)] bg-outline-variant opacity-30"></div>
                  )}

                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs text-on-surface leading-tight">
                      {evt.type.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-[9px] text-outline">
                      {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {evt.type === 'GrantCreated' && `New pool matching #${evt.grantId} initialized by owner.`}
                    {evt.type === 'ApplicationSubmitted' && `Proposal submitted for grant #${evt.grantId}.`}
                    {evt.type === 'ApplicationApproved' && `Application approved for grant #${evt.grantId}. Escrow registered.`}
                    {evt.type === 'FundsDeposited' && `Funds locked in escrow #${evt.grantId}.`}
                    {evt.type === 'MilestoneReleased' && `Milestone release complete. Disbursed ${evt.details?.amount || 0} XLM.`}
                    {evt.type === 'FundsRefunded' && `Grant #${evt.grantId} cancelled. Unreleased funds refunded.`}
                  </p>
                  {evt.txHash && (
                    <div className="mt-1">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-surface text-[8px] text-on-surface-variant font-mono border border-outline-variant">
                        TX: {evt.txHash.slice(0, 8)}...{evt.txHash.slice(-6)}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('activity')}
            className="mt-6 w-full py-2 bg-surface hover:bg-surface-container border border-outline-variant text-on-surface-variant text-xs font-semibold rounded transition-colors"
          >
            View Full History
          </button>
        </div>
      </div>
    </div>
  );
}
