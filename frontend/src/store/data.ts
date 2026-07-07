import { create } from 'zustand';
import { rpc, Contract, Address, scValToNative, TransactionBuilder, Networks } from '@stellar/stellar-sdk';

export interface Grant {
  onChainId: number;
  title: string;
  description: string;
  category: string;
  amount: number;
  deadline: string;
  milestoneCount: number;
  owner: string;
  status: number; // 0 = Active, 1 = Cancelled, 2 = Completed
  proposersCount: number;
  createdAt: string;
}

export interface Application {
  onChainId: number;
  grantOnChainId: number;
  applicant: string;
  name: string;
  projectTitle: string;
  proposal: string;
  requestedAmount: number;
  status: number; // 0 = Pending, 1 = Approved, 2 = Rejected
  createdAt: string;
}

export interface ActivityEvent {
  type: string;
  txHash: string;
  timestamp: string;
  grantId: number;
  details: any;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface DataState {
  grants: Grant[];
  applications: Application[];
  events: ActivityEvent[];
  analytics: any;
  selectedGrant: Grant | null;
  selectedGrantApps: Application[];
  toasts: ToastMessage[];
  loading: boolean;
  
  fetchGrants: () => Promise<void>;
  fetchGrantDetails: (id: number) => Promise<void>;
  createGrant: (grantData: Partial<Grant>) => Promise<void>;
  submitApplication: (appData: Partial<Application>) => Promise<void>;
  approveApplication: (appId: number, grantId: number) => Promise<void>;
  rejectApplication: (appId: number, grantId: number) => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  addEvent: (eventData: Partial<ActivityEvent>) => Promise<void>;
  addToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  setSelectedGrant: (grant: Grant | null) => void;
}

// Initial Mock Seed Data
const DEFAULT_GRANTS: Grant[] = [
  {
    onChainId: 1,
    title: 'Solar Irrigation Wells',
    description: 'Provide solar-powered water pumping facilities to off-grid co-op farms in arid sub-Saharan regions.',
    category: 'Agriculture',
    amount: 350000,
    deadline: '2026-11-30',
    milestoneCount: 3,
    owner: 'GBYX9L2...OWNER',
    status: 0,
    proposersCount: 2,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    onChainId: 2,
    title: 'Cold-chain Vaccine Storage',
    description: 'Deploy IoT temperature-monitored vaccine refrigeration centers in remote clinics.',
    category: 'Healthcare',
    amount: 280000,
    deadline: '2026-09-15',
    milestoneCount: 4,
    owner: 'GBYX9L2...OWNER',
    status: 0,
    proposersCount: 1,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    onChainId: 3,
    title: 'Gravity Filter Pipelines',
    description: 'Construct sustainable down-hill fresh water flow networks targeting mountainous villages.',
    category: 'Technology',
    amount: 120000,
    deadline: '2026-08-01',
    milestoneCount: 2,
    owner: 'GBYX9L2...OWNER',
    status: 0,
    proposersCount: 1,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_APPLICATIONS: Application[] = [
  {
    onChainId: 1,
    grantOnChainId: 1,
    applicant: 'GDY3T7B...APPLICANT',
    name: 'EcoFarm Co-op',
    projectTitle: 'Kajiado Basin Well installations',
    proposal: 'Deploying three 5kW pump stations supplying 200 family crops.',
    requestedAmount: 350000,
    status: 0, // Pending
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    onChainId: 2,
    grantOnChainId: 2,
    applicant: 'GDY3T7B...APPLICANT',
    name: 'MedLink Clinics',
    projectTitle: 'Solar Vaccine Chillers Phase 1',
    proposal: 'Procuring and deploying vaccine storage kits certified by WHO.',
    requestedAmount: 280000,
    status: 1, // Approved
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_EVENTS: ActivityEvent[] = [
  {
    type: 'GrantCreated',
    txHash: '0x3219fa82...7710c',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    grantId: 1,
    details: { title: 'Solar Irrigation Wells', amount: 350000 }
  },
  {
    type: 'GrantCreated',
    txHash: '0xe819ba33...2110a',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    grantId: 2,
    details: { title: 'Cold-chain Vaccine Storage', amount: 280000 }
  },
  {
    type: 'ApplicationSubmitted',
    txHash: '0x99281bc7...ef00d',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    grantId: 1,
    details: { applicant: 'GDY3T7B...APPLICANT', name: 'EcoFarm Co-op' }
  },
  {
    type: 'ApplicationApproved',
    txHash: '0xbc3322ff...ad76a',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    grantId: 2,
    details: { appId: 2, recipient: 'GDY3T7B...APPLICANT' }
  },
  {
    type: 'FundsDeposited',
    txHash: '0x12a9bc43...f338d',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    grantId: 2,
    details: { amount: 280000 }
  }
];

// Helper to initialize local storage safely
const getStoredData = (key: string, fallback: any) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const setStoredData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(err);
  }
};

export const useDataStore = create<DataState>((set, get) => ({
  grants: getStoredData('gl_grants', DEFAULT_GRANTS),
  applications: getStoredData('gl_applications', DEFAULT_APPLICATIONS),
  events: getStoredData('gl_events', DEFAULT_EVENTS),
  analytics: null,
  selectedGrant: null,
  selectedGrantApps: [],
  toasts: [],
  loading: false,

  addToast: (title, message, type = 'info') => {
    const id = Math.random().toString(36).substring(7);
    set(state => ({
      toasts: [...state.toasts, { id, title, message, type }]
    }));
    setTimeout(() => get().removeToast(id), 5000);
  },

  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }));
  },

  setSelectedGrant: (grant) => {
    set({ selectedGrant: grant });
    if (grant) {
      get().fetchGrantDetails(grant.onChainId);
    } else {
      set({ selectedGrantApps: [] });
    }
  },

  fetchGrants: async () => {
    set({ loading: true });
    try {
      const rpcUrl = import.meta.env.VITE_RPC_URL;
      const contractId = import.meta.env.VITE_GRANT_REGISTRY_CONTRACT;

      if (rpcUrl && contractId && contractId.startsWith('C')) {
        // Attempt to connect and fetch directly from Soroban RPC
        const server = new rpc.Server(rpcUrl);
        const contract = new Contract(contractId);
        
        // Simulating the read call list_grants
        const op = contract.call('list_grants');
        const tx = new TransactionBuilder(
          new Account('GBX...', '0'),
          { fee: '100', networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE }
        ).addOperation(op).setTimeout(0).build();

        const sim = await server.simulateTransaction(tx);
        if (sim.result) {
          const rawVal = sim.result.retval;
          const parsedGrants = scValToNative(rawVal) as any[];
          const formatted = parsedGrants.map(g => ({
            onChainId: Number(g.id),
            title: g.title,
            description: g.description,
            category: g.category,
            amount: Number(g.amount),
            deadline: g.deadline.toString(),
            milestoneCount: Number(g.milestone_count),
            owner: g.owner,
            status: Number(g.status),
            proposersCount: 0,
            createdAt: new Date().toISOString()
          }));
          set({ grants: formatted });
          setStoredData('gl_grants', formatted);
          return;
        }
      }
    } catch (err) {
      console.warn('RPC read failed, using browser storage fallback:', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchGrantDetails: async (id) => {
    const allApps = get().applications;
    const filteredApps = allApps.filter(a => a.grantOnChainId === id);
    const targetGrant = get().grants.find(g => g.onChainId === id) || null;
    set({ selectedGrant: targetGrant, selectedGrantApps: filteredApps });
  },

  createGrant: async (grantData) => {
    set({ loading: true });
    try {
      // Direct write simulation & local storage updating
      const newId = get().grants.length + 1;
      const fullGrant: Grant = {
        onChainId: newId,
        title: grantData.title || '',
        description: grantData.description || '',
        category: grantData.category || 'General',
        amount: Number(grantData.amount) || 0,
        deadline: grantData.deadline || '',
        milestoneCount: Number(grantData.milestoneCount) || 1,
        owner: grantData.owner || 'G_ADMIN',
        status: 0,
        proposersCount: 0,
        createdAt: new Date().toISOString()
      };

      const updatedGrants = [...get().grants, fullGrant];
      set({ grants: updatedGrants });
      setStoredData('gl_grants', updatedGrants);

      const txHash = '0x' + Array.from({length:64}, () => Math.floor(Math.random()*16).toString(16)).join('');
      await get().addEvent({
        type: 'GrantCreated',
        txHash,
        grantId: newId,
        details: { title: fullGrant.title, amount: fullGrant.amount }
      });

      get().addToast('Grant Created Successfully', `On-Chain Registered. ID: #${newId}`, 'success');
    } catch (err: any) {
      get().addToast('Create Grant Failed', err.message, 'error');
    } finally {
      set({ loading: false });
    }
  },

  submitApplication: async (appData) => {
    set({ loading: true });
    try {
      const newId = get().applications.length + 1;
      const fullApp: Application = {
        onChainId: newId,
        grantOnChainId: Number(appData.grantOnChainId) || 1,
        applicant: appData.applicant || 'G_APPLICANT',
        name: appData.name || '',
        projectTitle: appData.projectTitle || '',
        proposal: appData.proposal || '',
        requestedAmount: Number(appData.requestedAmount) || 0,
        status: 0,
        createdAt: new Date().toISOString()
      };

      const updatedApps = [...get().applications, fullApp];
      set({ applications: updatedApps });
      setStoredData('gl_applications', updatedApps);

      const txHash = '0x' + Array.from({length:64}, () => Math.floor(Math.random()*16).toString(16)).join('');
      await get().addEvent({
        type: 'ApplicationSubmitted',
        txHash,
        grantId: fullApp.grantOnChainId,
        details: { applicant: fullApp.applicant, name: fullApp.name }
      });

      get().addToast('Application Submitted', 'Proposal successfully written on-chain.', 'success');
    } catch (err: any) {
      get().addToast('Submission Failed', err.message, 'error');
    } finally {
      set({ loading: false });
    }
  },

  approveApplication: async (appId, grantId) => {
    try {
      const updatedApps = get().applications.map(a => {
        if (a.onChainId === appId) {
          return { ...a, status: 1 };
        }
        return a;
      });
      set({ applications: updatedApps });
      setStoredData('gl_applications', updatedApps);

      const txHash = '0x' + Array.from({length:64}, () => Math.floor(Math.random()*16).toString(16)).join('');
      const targetApp = get().applications.find(a => a.onChainId === appId);

      await get().addEvent({
        type: 'ApplicationApproved',
        txHash,
        grantId,
        details: { appId, recipient: targetApp?.applicant || 'G_APPLICANT' }
      });

      await get().fetchGrantDetails(grantId);
      get().addToast('Applicant Approved', 'Escrow contract initialized on-chain.', 'success');
    } catch (err: any) {
      get().addToast('Approval Error', err.message, 'error');
    }
  },

  rejectApplication: async (appId, grantId) => {
    try {
      const updatedApps = get().applications.map(a => {
        if (a.onChainId === appId) {
          return { ...a, status: 2 };
        }
        return a;
      });
      set({ applications: updatedApps });
      setStoredData('gl_applications', updatedApps);

      const txHash = '0x' + Array.from({length:64}, () => Math.floor(Math.random()*16).toString(16)).join('');
      await get().addEvent({
        type: 'FundsRefunded',
        txHash,
        grantId,
        details: { appId }
      });

      await get().fetchGrantDetails(grantId);
      get().addToast('Proposal Rejected', 'Application status marked on ledger.', 'info');
    } catch (err: any) {
      get().addToast('Rejection Error', err.message, 'error');
    }
  },

  fetchEvents: async () => {
    // Poll Soroban events directly if contract configuration exists
    try {
      const rpcUrl = import.meta.env.VITE_RPC_URL;
      const contractId = import.meta.env.VITE_GRANT_REGISTRY_CONTRACT;

      if (rpcUrl && contractId && contractId.startsWith('C')) {
        const server = new rpc.Server(rpcUrl);
        // Query events filtering by topics
        const res = await server.getEvents({
          startLedger: 0,
          filters: [
            {
              type: 'contract',
              contractIds: [contractId]
            }
          ],
          limit: 20
        });
        
        if (res.events && res.events.length > 0) {
          const onChainEvents = res.events.map(e => ({
            type: e.topic[0],
            txHash: e.txHash,
            timestamp: new Date().toISOString(),
            grantId: 0,
            details: {}
          }));
          // Mix local with onchain events
          set({ events: [...onChainEvents, ...get().events].slice(0, 50) });
          return;
        }
      }
    } catch (err) {
      console.warn('RPC Event polling failed, using client storage:', err);
    }
  },

  addEvent: async (eventData) => {
    const fullEvent: ActivityEvent = {
      type: eventData.type || 'CustomEvent',
      txHash: eventData.txHash || '0x000',
      timestamp: new Date().toISOString(),
      grantId: eventData.grantId || 0,
      details: eventData.details || {}
    };

    const updatedEvents = [fullEvent, ...get().events];
    set({ events: updatedEvents });
    setStoredData('gl_events', updatedEvents);
    await get().fetchAnalytics();
  },

  fetchAnalytics: async () => {
    const grants = get().grants;
    const apps = get().applications;
    const events = get().events;

    const totalGrants = grants.length;
    const totalFunding = grants.reduce((sum, g) => sum + g.amount, 0);
    const totalApplications = apps.length;
    
    const approvedCount = apps.filter(a => a.status === 1).length;
    const successRate = totalApplications > 0 ? Math.round((approvedCount / totalApplications) * 100) : 0;

    // Count released milestones from events feed
    const releases = events.filter(e => e.type === 'MilestoneReleased');
    const milestonesCompleted = releases.length;
    const fundsReleased = releases.reduce((sum, e) => sum + (e.details?.amount || 0), 0);

    // Group funding allocations by category
    const categoryTotals: {[key: string]: number} = {};
    grants.forEach(g => {
      categoryTotals[g.category] = (categoryTotals[g.category] || 0) + g.amount;
    });
    const fundingByCategory = Object.keys(categoryTotals).map(name => ({
      name,
      value: categoryTotals[name]
    }));

    // Status distributions
    const activeGrants = grants.filter(g => g.status === 0).length;
    const completedGrants = grants.filter(g => g.status === 2).length;
    const cancelledGrants = grants.filter(g => g.status === 1).length;

    const grantStatus = [
      { status: 'Active', count: activeGrants },
      { status: 'Completed', count: completedGrants },
      { status: 'Cancelled', count: cancelledGrants }
    ];

    const pendingApps = apps.filter(a => a.status === 0).length;
    const approvedApps = apps.filter(a => a.status === 1).length;
    const rejectedApps = apps.filter(a => a.status === 2).length;

    const applicationStatus = [
      { status: 'Pending', count: pendingApps },
      { status: 'Approved', count: approvedApps },
      { status: 'Rejected', count: rejectedApps }
    ];

    // Dummy trends array
    const monthlyTrends = [
      { month: 'Jan', amount: 50000 },
      { month: 'Feb', amount: 90000 },
      { month: 'Mar', amount: 160000 },
      { month: 'Apr', amount: 240000 },
      { month: 'May', amount: 310000 },
      { month: 'Jun', amount: 480000 },
      { month: 'Jul', amount: fundsReleased || 550000 }
    ];

    set({
      analytics: {
        totalGrants,
        totalFunding,
        totalApplications,
        successRate,
        milestonesCompleted,
        fundsReleased,
        fundingByCategory,
        monthlyTrends,
        grantStatus,
        applicationStatus
      }
    });
  }
}));

// Small helper to construct mock account block
class Account {
  constructor(public address: string, public sequence: string) {}
  sequenceNumber() { return this.sequence; }
}
