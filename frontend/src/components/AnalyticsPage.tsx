import React, { useEffect } from 'react';
import { useDataStore } from '../store/data';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';

export function AnalyticsPage() {
  const { analytics, fetchAnalytics } = useDataStore();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Palette colors
  const COLORS = ['#606C38', '#DDA15E', '#BC6C25', '#283618', '#546341'];

  // Default Mock Fallbacks
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
    { status: 'Active', count: 12 },
    { status: 'Completed', count: 4 },
    { status: 'Cancelled', count: 1 }
  ];

  const defaultAppStatus = [
    { status: 'Pending', count: 15 },
    { status: 'Approved', count: 45 },
    { status: 'Rejected', count: 12 }
  ];

  const categoryData = analytics?.fundingByCategory?.length ? analytics.fundingByCategory : defaultFundingByCategory;
  const monthlyData = analytics?.monthlyTrends?.length ? analytics.monthlyTrends : defaultMonthlyTrends;
  const statusData = analytics?.grantStatus?.length ? analytics.grantStatus : defaultGrantStatus;
  const appStatusData = analytics?.applicationStatus?.length ? analytics.applicationStatus : defaultAppStatus;

  // Add mock top recipients
  const topRecipients = [
    { name: 'EcoFarm Co-op', title: 'Solar Irrigation Wells', amount: 350000, category: 'Agriculture' },
    { name: 'EduFund International', title: 'Rural Classroom Kits', amount: 180000, category: 'Education' },
    { name: 'MedLink Clinics', title: 'Cold-chain Vaccine Storage', amount: 280000, category: 'Healthcare' },
    { name: 'CleanWater NGO', title: 'Gravity Filter Pipelines', amount: 120000, category: 'Technology' }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="border-b border-outline-variant pb-6">
        <h2 className="text-3xl font-bold font-soria text-forest mb-2">Institutional Analytics</h2>
        <p className="text-sm text-on-surface-variant font-inter">Comparative analysis and monthly distribution curves generated from ledger state.</p>
      </header>

      {/* Main Trends Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
          <h3 className="text-lg font-bold font-soria text-forest mb-4">Monthly Funding Trends</h3>
          <div className="h-72">
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

        {/* Grant Status Distribution Pie */}
        <div className="lg:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col justify-between">
          <h3 className="text-lg font-bold font-soria text-forest mb-4">Grant Completion Status</h3>
          <div className="h-56 flex items-center justify-center">
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
          <div className="text-center text-[10px] text-on-surface-variant font-inter">
            Percent breakdown of completed vs active grant structures.
          </div>
        </div>
      </div>

      {/* Categories & Conversion Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Allocations */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
          <h3 className="text-lg font-bold font-soria text-forest mb-4">Funding Allocation by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3E0C8" />
                <XAxis dataKey="name" stroke="#77786b" fontSize={11} />
                <YAxis stroke="#77786b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#FEFAE0', borderColor: '#c7c8b9', borderRadius: '4px' }} />
                <Bar dataKey="value" fill="#606C38" radius={[2, 2, 0, 0]} name="Allocated (XLM)">
                  {categoryData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Application Status Conversion */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
          <h3 className="text-lg font-bold font-soria text-forest mb-4">Application Approval Funnel</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3E0C8" />
                <XAxis dataKey="status" stroke="#77786b" fontSize={11} />
                <YAxis stroke="#77786b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#FEFAE0', borderColor: '#c7c8b9', borderRadius: '4px' }} />
                <Bar dataKey="count" fill="#DDA15E" radius={[2, 2, 0, 0]} name="Proposals Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Recipients Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div className="p-4 bg-surface-container-low border-b border-outline-variant">
          <h3 className="font-bold text-sm text-forest font-soria">Top Funded Recipients Ranking</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant text-[10px] font-bold text-on-surface-variant uppercase font-inter">
              <th className="p-4">Recipient Name</th>
              <th className="p-4">Project Title</th>
              <th className="p-4">Sector</th>
              <th className="p-4 text-right">Cumulative Funds</th>
            </tr>
          </thead>
          <tbody>
            {topRecipients.map((rec, idx) => (
              <tr key={idx} className="border-b border-outline-variant hover:bg-surface transition-colors font-inter text-xs">
                <td className="p-4 font-bold text-forest">{rec.name}</td>
                <td className="p-4 text-on-surface-variant">{rec.title}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded bg-surface border border-outline-variant font-semibold">
                    {rec.category}
                  </span>
                </td>
                <td className="p-4 text-right font-mono font-bold text-primary">
                  {rec.amount.toLocaleString()} XLM
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
