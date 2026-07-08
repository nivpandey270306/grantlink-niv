import { create } from 'zustand';
import { rpc, Contract, scValToNative, TransactionBuilder, xdr, nativeToScVal, Account } from '@stellar/stellar-sdk';
import { useWalletStore } from './wallet';

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

export interface EscrowState {
  grantId: number;
  recipient: string;
  milestoneAmounts: number[];
  milestoneReleased: boolean[];
  fundsDeposited: number;
  token: string | null;
  status: number; // 0 = Initialized, 1 = Funded, 2 = Refunded, 3 = Completed
}

export interface ActivityEvent {
  type: string;
  txHash: string;
  timestamp: string;
  grantId: number;
  details: any;
}

export interface TransactionRecord {
  hash: string;
  timestamp: string;
  contractId: string;
  method: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  explorerLink: string;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface HealthStatus {
  walletAvailable: boolean;
  rpcReachable: boolean;
  registryConnected: boolean;
  applicationConnected: boolean;
  escrowConnected: boolean;
  networkMatch: boolean;
  latestLedger: number;
  details: {
    rpcUrl: string;
    network: string;
    registryId: string;
    applicationId: string;
    escrowId: string;
    walletAddress?: string;
    errorMsg?: string;
  };
}

interface DataState {
  grants: Grant[];
  applications: Application[];
  events: ActivityEvent[];
  transactions: TransactionRecord[];
  analytics: any;
  selectedGrant: Grant | null;
  selectedGrantApps: Application[];
  escrowState: EscrowState | null;
  toasts: ToastMessage[];
  loading: boolean;
  health: HealthStatus | null;

  fetchGrants: () => Promise<void>;
  fetchApplications: () => Promise<void>;
  fetchGrantDetails: (id: number) => Promise<void>;
  fetchEscrowState: (grantId: number) => Promise<EscrowState | null>;
  createGrant: (grantData: Partial<Grant>) => Promise<string>;
  updateGrant: (id: number, grantData: Partial<Grant>) => Promise<string>;
  cancelGrant: (id: number) => Promise<string>;
  submitApplication: (appData: Partial<Application>) => Promise<string>;
  approveApplication: (appId: number, grantId: number, milestoneAmounts: number[]) => Promise<string>;
  rejectApplication: (appId: number, grantId: number) => Promise<string>;
  depositFunds: (grantId: number, tokenAddress: string) => Promise<string>;
  releaseMilestone: (grantId: number, milestoneIdx: number, amount: number) => Promise<string>;
  refundGrant: (grantId: number) => Promise<string>;
  fetchEvents: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  addEvent: (eventData: Partial<ActivityEvent>) => Promise<void>;
  addTransaction: (tx: TransactionRecord) => void;
  addToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  setSelectedGrant: (grant: Grant | null) => void;
  runHealthCheck: () => Promise<HealthStatus>;
}

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

export const NATIVE_TOKEN_ADDRESS = 'CDLZFC3SYJYDATH7KXYZCSHYMQM55IBGLQDZREFCE4DL22J35VE3COWD';

const getEnvVar = (name: string): string => {
  return (import.meta as any).env?.[name] || (globalThis as any).process?.env?.[name] || '';
};

const executeContractTx = async (
  contractId: string,
  method: string,
  args: any[]
): Promise<string> => {
  const walletState = useWalletStore.getState();
  const userAddress = walletState.address;
  if (!userAddress) {
    throw new Error('Wallet not connected. Please connect Freighter or Albedo.');
  }

  const rpcUrl = getEnvVar('VITE_RPC_URL');
  const networkPassphrase = getEnvVar('VITE_NETWORK_PASSPHRASE');
  if (!rpcUrl) {
    throw new Error('RPC URL is missing. Please define VITE_RPC_URL in your environment.');
  }
  if (!networkPassphrase) {
    throw new Error('Network Passphrase is missing. Please define VITE_NETWORK_PASSPHRASE in your environment.');
  }
  if (!contractId) {
    throw new Error('Contract ID is missing. Ensure your target contract has been deployed and set in the environment.');
  }
  if (!contractId.startsWith('C') || contractId.length !== 56) {
    throw new Error(`Invalid Contract Address "${contractId}". Soroban contract IDs must start with 'C' and be 56 characters long.`);
  }

  const server = new rpc.Server(rpcUrl) as any;
  
  // 1. Fetch account sequence
  let sourceAccount;
  try {
    sourceAccount = await server.getAccount(userAddress);
  } catch (err) {
    throw new Error('Failed to retrieve account details. If your account is new, click "Fund Account" to register it on Testnet.');
  }

  // 2. Build initial transaction
  const contract = new Contract(contractId);
  const op = contract.call(method, ...args);
  
  let tx = new TransactionBuilder(sourceAccount, {
    fee: '1000', 
    networkPassphrase
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  // 3. Simulate and prepare transaction
  try {
    tx = await server.prepareTransaction(tx);
  } catch (prepareErr: any) {
    throw new Error(`Transaction simulation/preparation failed: ${prepareErr?.message || prepareErr}`);
  }

  // 5. Sign transaction via connected wallet
  const xdrString = tx.toXDR();
  const signedXdr = await walletState.signTx(xdrString);

  // 6. Submit to Soroban RPC
  const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  const response = await server.sendTransaction(signedTx) as any;
  
  if (response.status === 'ERROR') {
    throw new Error(`Transaction submission error: ${response.errorResultXdr || response.errorResult || 'Unknown error'}`);
  }

  const txHash = response.hash;
  console.log(`Submitted transaction: ${txHash}. Polling status...`);

  // 7. Poll transaction status
  let status = response.status as any;
  let pollAttempts = 0;
  while (status === 'PENDING' && pollAttempts < 15) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const txStatus = await server.getTransaction(txHash) as any;
    status = txStatus.status;
    pollAttempts++;
    if (status === 'SUCCESS') {
      return txHash;
    }
    if (status === 'FAILED') {
      throw new Error(`Transaction execution failed on-chain. Check explorer.`);
    }
  }

  if (status === 'SUCCESS') {
    return txHash;
  }
  
  throw new Error(`Transaction polling timed out. Status: ${status}`);
};

export const useDataStore = create<DataState>((set, get) => ({
  grants: getStoredData('gl_grants', []),
  applications: getStoredData('gl_applications', []),
  events: getStoredData('gl_events', []),
  transactions: getStoredData('gl_transactions', []),
  analytics: null,
  selectedGrant: null,
  selectedGrantApps: [],
  escrowState: null,
  toasts: [],
  loading: false,
  health: null,

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

  addTransaction: (tx) => {
    const updated = [tx, ...get().transactions];
    set({ transactions: updated });
    setStoredData('gl_transactions', updated);
  },

  fetchGrants: async () => {
    set({ loading: true });
    try {
      const rpcUrl = getEnvVar('VITE_RPC_URL');
      const contractId = getEnvVar('VITE_GRANT_REGISTRY_CONTRACT');

      if (rpcUrl && contractId && contractId.startsWith('C')) {
        const server = new rpc.Server(rpcUrl) as any;
        const contract = new Contract(contractId);
        
        // Simulating the read call list_grants
        const op = contract.call('list_grants');
        const tx = new TransactionBuilder(
          new Account('GCSGO4WCCJA5CHIUK4HS2WEGZIXCHL7DAGXP77L3PUHSMGGMAX7TQOL4', '0'),
          { fee: '100', networkPassphrase: getEnvVar('VITE_NETWORK_PASSPHRASE') }
        ).addOperation(op).setTimeout(0).build();

        const sim = await server.simulateTransaction(tx) as any;
        if (sim.result) {
          const rawVal = sim.result.retval;
          const parsedGrants = scValToNative(rawVal) as any[];
          const formatted = parsedGrants.map(g => ({
            onChainId: Number(g.id),
            title: g.title,
            description: g.description,
            category: g.category,
            amount: Number(g.amount),
            deadline: new Date(Number(g.deadline) * 1000).toISOString().split('T')[0],
            milestoneCount: Number(g.milestone_count),
            owner: g.owner,
            status: Number(g.status),
            proposersCount: 0,
            createdAt: new Date().toISOString()
          }));
          
          const apps = get().applications;
          formatted.forEach(f => {
            f.proposersCount = apps.filter(a => a.grantOnChainId === f.onChainId).length;
          });

          set({ grants: formatted });
          setStoredData('gl_grants', formatted);
          await get().fetchAnalytics();
        }
      }
    } catch (err) {
      console.warn('RPC read failed, using browser storage fallback:', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchApplications: async () => {
    try {
      const rpcUrl = getEnvVar('VITE_RPC_URL');
      const contractId = getEnvVar('VITE_GRANT_APPLICATION_CONTRACT');

      if (rpcUrl && contractId && contractId.startsWith('C')) {
        const server = new rpc.Server(rpcUrl) as any;
        const contract = new Contract(contractId);
        
        const op = contract.call('list_applications');
        const tx = new TransactionBuilder(
          new Account('GCSGO4WCCJA5CHIUK4HS2WEGZIXCHL7DAGXP77L3PUHSMGGMAX7TQOL4', '0'),
          { fee: '100', networkPassphrase: getEnvVar('VITE_NETWORK_PASSPHRASE') }
        ).addOperation(op).setTimeout(0).build();

        const sim = await server.simulateTransaction(tx) as any;
        if (sim.result) {
          const rawVal = sim.result.retval;
          const parsedApps = scValToNative(rawVal) as any[];
          const formatted = parsedApps.map(a => ({
            onChainId: Number(a.id),
            grantOnChainId: Number(a.grant_id),
            applicant: a.applicant,
            name: a.name,
            projectTitle: a.project_title,
            proposal: a.proposal,
            requestedAmount: Number(a.requested_amount),
            status: Number(a.status),
            createdAt: new Date().toISOString()
          }));
          set({ applications: formatted });
          setStoredData('gl_applications', formatted);
          await get().fetchAnalytics();
        }
      }
    } catch (err) {
      console.warn('RPC applications read failed, using fallback:', err);
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
    const registryId = getEnvVar('VITE_GRANT_REGISTRY_CONTRACT');
    const userAddress = useWalletStore.getState().address || 'G_UNKNOWN';
    try {
      const deadlineSecs = Math.floor(new Date(grantData.deadline || '').getTime() / 1000);
      
      const args = [
        nativeToScVal(userAddress, { type: 'address' }),
        nativeToScVal(grantData.title || ''),
        nativeToScVal(grantData.description || ''),
        nativeToScVal(grantData.category || 'General'),
        nativeToScVal(BigInt(grantData.amount || 0), { type: 'i128' }),
        nativeToScVal(BigInt(deadlineSecs), { type: 'u64' }),
        nativeToScVal(grantData.milestoneCount || 3, { type: 'u32' }),
      ];

      const txHash = await executeContractTx(registryId, 'create_grant', args);

      const newRecord: TransactionRecord = {
        hash: txHash,
        timestamp: new Date().toISOString(),
        contractId: registryId,
        method: 'create_grant',
        status: 'SUCCESS',
        explorerLink: `https://stellar.expert/explorer/testnet/tx/${txHash}`
      };
      get().addTransaction(newRecord);

      get().addToast('Grant Created Successfully', `Confirmed on Stellar Testnet.`, 'success');
      
      // Reload on-chain state
      await get().fetchGrants();
      return txHash;
    } catch (err: any) {
      console.error(err);
      get().addToast('Create Grant Failed', err.message || 'Transaction failed', 'error');
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateGrant: async (id, grantData) => {
    set({ loading: true });
    const registryId = getEnvVar('VITE_GRANT_REGISTRY_CONTRACT');
    try {
      const args = [
        nativeToScVal(id, { type: 'u32' }),
        nativeToScVal(grantData.title || ''),
        nativeToScVal(grantData.description || ''),
        nativeToScVal(grantData.category || 'General'),
      ];

      const txHash = await executeContractTx(registryId, 'update_grant', args);

      const newRecord: TransactionRecord = {
        hash: txHash,
        timestamp: new Date().toISOString(),
        contractId: registryId,
        method: 'update_grant',
        status: 'SUCCESS',
        explorerLink: `https://stellar.expert/explorer/testnet/tx/${txHash}`
      };
      get().addTransaction(newRecord);

      get().addToast('Grant Updated', `Grant #${id} successfully updated on-chain.`, 'success');
      await get().fetchGrants();
      return txHash;
    } catch (err: any) {
      console.error(err);
      get().addToast('Update Grant Failed', err.message || 'Transaction failed', 'error');
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  cancelGrant: async (id) => {
    set({ loading: true });
    const registryId = getEnvVar('VITE_GRANT_REGISTRY_CONTRACT');
    try {
      const args = [nativeToScVal(id, { type: 'u32' })];

      const txHash = await executeContractTx(registryId, 'cancel_grant', args);

      const newRecord: TransactionRecord = {
        hash: txHash,
        timestamp: new Date().toISOString(),
        contractId: registryId,
        method: 'cancel_grant',
        status: 'SUCCESS',
        explorerLink: `https://stellar.expert/explorer/testnet/tx/${txHash}`
      };
      get().addTransaction(newRecord);

      get().addToast('Grant Cancelled', `Grant #${id} has been cancelled on-chain.`, 'info');
      await get().fetchGrants();
      return txHash;
    } catch (err: any) {
      console.error(err);
      get().addToast('Cancel Grant Failed', err.message || 'Transaction failed', 'error');
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  submitApplication: async (appData) => {
    set({ loading: true });
    const contractId = getEnvVar('VITE_GRANT_APPLICATION_CONTRACT');
    const userAddress = useWalletStore.getState().address || 'G_UNKNOWN';
    try {
      const args = [
        nativeToScVal(userAddress, { type: 'address' }),
        nativeToScVal(appData.grantOnChainId || 1, { type: 'u32' }),
        nativeToScVal(appData.name || ''),
        nativeToScVal(appData.projectTitle || ''),
        nativeToScVal(appData.proposal || ''),
        nativeToScVal(BigInt(appData.requestedAmount || 0), { type: 'i128' }),
      ];

      const txHash = await executeContractTx(contractId, 'submit_application', args);

      const newRecord: TransactionRecord = {
        hash: txHash,
        timestamp: new Date().toISOString(),
        contractId,
        method: 'submit_application',
        status: 'SUCCESS',
        explorerLink: `https://stellar.expert/explorer/testnet/tx/${txHash}`
      };
      get().addTransaction(newRecord);

      get().addToast('Proposal Submitted', 'Proposal successfully written on-chain.', 'success');
      
      await get().fetchApplications();
      return txHash;
    } catch (err: any) {
      console.error(err);
      get().addToast('Submission Failed', err.message || 'Transaction failed', 'error');
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  approveApplication: async (appId, grantId, milestoneAmounts) => {
    set({ loading: true });
    const contractId = getEnvVar('VITE_GRANT_APPLICATION_CONTRACT');
    try {
      const formattedMilestones = milestoneAmounts.map(a => nativeToScVal(BigInt(a), { type: 'i128' }));
      // Note: escrow address is now read from contract storage — no address parameter needed
      const args = [
        nativeToScVal(appId, { type: 'u32' }),
        nativeToScVal(formattedMilestones),
      ];

      const txHash = await executeContractTx(contractId, 'approve_application', args);

      const newRecord: TransactionRecord = {
        hash: txHash,
        timestamp: new Date().toISOString(),
        contractId,
        method: 'approve_application',
        status: 'SUCCESS',
        explorerLink: `https://stellar.expert/explorer/testnet/tx/${txHash}`
      };
      get().addTransaction(newRecord);

      get().addToast('Applicant Approved', 'Escrow contract initialized on-chain.', 'success');
      
      await get().fetchApplications();
      await get().fetchGrantDetails(grantId);
      return txHash;
    } catch (err: any) {
      console.error(err);
      get().addToast('Approval Error', err.message || 'Transaction failed', 'error');
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  rejectApplication: async (appId, grantId) => {
    set({ loading: true });
    const contractId = getEnvVar('VITE_GRANT_APPLICATION_CONTRACT');
    try {
      const args = [nativeToScVal(appId, { type: 'u32' })];

      const txHash = await executeContractTx(contractId, 'reject_application', args);

      const newRecord: TransactionRecord = {
        hash: txHash,
        timestamp: new Date().toISOString(),
        contractId,
        method: 'reject_application',
        status: 'SUCCESS',
        explorerLink: `https://stellar.expert/explorer/testnet/tx/${txHash}`
      };
      get().addTransaction(newRecord);

      get().addToast('Proposal Rejected', 'Application status marked on ledger.', 'info');
      
      await get().fetchApplications();
      await get().fetchGrantDetails(grantId);
      return txHash;
    } catch (err: any) {
      console.error(err);
      get().addToast('Rejection Error', err.message || 'Transaction failed', 'error');
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  depositFunds: async (grantId, tokenAddress) => {
    set({ loading: true });
    const contractId = getEnvVar('VITE_GRANT_ESCROW_CONTRACT');
    const userAddress = useWalletStore.getState().address || 'G_UNKNOWN';
    try {
      const args = [
        nativeToScVal(grantId, { type: 'u32' }),
        nativeToScVal(tokenAddress, { type: 'address' }),
        nativeToScVal(userAddress, { type: 'address' }),
      ];

      const txHash = await executeContractTx(contractId, 'deposit_funds', args);

      const newRecord: TransactionRecord = {
        hash: txHash,
        timestamp: new Date().toISOString(),
        contractId,
        method: 'deposit_funds',
        status: 'SUCCESS',
        explorerLink: `https://stellar.expert/explorer/testnet/tx/${txHash}`
      };
      get().addTransaction(newRecord);

      get().addToast('Deposit Confirmed', `Locked funds successfully in escrow.`, 'success');
      await get().fetchEvents();
      await get().fetchGrantDetails(grantId);
      return txHash;
    } catch (err: any) {
      console.error(err);
      get().addToast('Deposit Failed', err.message || 'Transaction failed', 'error');
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  releaseMilestone: async (grantId, milestoneIdx, _amount) => {
    set({ loading: true });
    const contractId = getEnvVar('VITE_GRANT_ESCROW_CONTRACT');
    try {
      const args = [
        nativeToScVal(grantId, { type: 'u32' }),
        nativeToScVal(milestoneIdx, { type: 'u32' }),
      ];

      const txHash = await executeContractTx(contractId, 'release_milestone', args);

      const newRecord: TransactionRecord = {
        hash: txHash,
        timestamp: new Date().toISOString(),
        contractId,
        method: 'release_milestone',
        status: 'SUCCESS',
        explorerLink: `https://stellar.expert/explorer/testnet/tx/${txHash}`
      };
      get().addTransaction(newRecord);

      get().addToast('Milestone Released', `Successfully disbursed milestone on-chain.`, 'success');
      await get().fetchEvents();
      await get().fetchGrantDetails(grantId);
      return txHash;
    } catch (err: any) {
      console.error(err);
      get().addToast('Release Failed', err.message || 'Transaction failed', 'error');
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  refundGrant: async (grantId) => {
    set({ loading: true });
    const contractId = getEnvVar('VITE_GRANT_ESCROW_CONTRACT');
    try {
      const args = [nativeToScVal(grantId, { type: 'u32' })];

      const txHash = await executeContractTx(contractId, 'refund_grant', args);

      const newRecord: TransactionRecord = {
        hash: txHash,
        timestamp: new Date().toISOString(),
        contractId,
        method: 'refund_grant',
        status: 'SUCCESS',
        explorerLink: `https://stellar.expert/explorer/testnet/tx/${txHash}`
      };
      get().addTransaction(newRecord);

      get().addToast('Refund Confirmed', `Escrow balance refunded successfully.`, 'success');
      await get().fetchEvents();
      await get().fetchGrantDetails(grantId);
      return txHash;
    } catch (err: any) {
      console.error(err);
      get().addToast('Refund Failed', err.message || 'Transaction failed', 'error');
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchEscrowState: async (grantId: number): Promise<EscrowState | null> => {
    try {
      const rpcUrl = getEnvVar('VITE_RPC_URL');
      const escrowId = getEnvVar('VITE_GRANT_ESCROW_CONTRACT');
      const networkPassphrase = getEnvVar('VITE_NETWORK_PASSPHRASE');

      if (!rpcUrl || !escrowId || !escrowId.startsWith('C')) return null;

      const server = new rpc.Server(rpcUrl) as any;
      const contract = new Contract(escrowId);
      const op = contract.call('get_escrow', nativeToScVal(grantId, { type: 'u32' }));
      const tx = new TransactionBuilder(
        new Account('GCSGO4WCCJA5CHIUK4HS2WEGZIXCHL7DAGXP77L3PUHSMGGMAX7TQOL4', '0'),
        { fee: '100', networkPassphrase }
      ).addOperation(op).setTimeout(0).build();

      const sim = await server.simulateTransaction(tx) as any;
      if (!sim.result || rpc.Api.isSimulationError(sim)) return null;

      const raw = scValToNative(sim.result.retval) as any;
      if (!raw) return null;

      const escrow: EscrowState = {
        grantId: Number(raw.grant_id),
        recipient: raw.recipient,
        milestoneAmounts: (raw.milestone_amounts || []).map((a: any) => Number(a)),
        milestoneReleased: raw.milestone_released || [],
        fundsDeposited: Number(raw.funds_deposited || 0),
        token: raw.token || null,
        status: Number(raw.status || 0),
      };

      set({ escrowState: escrow });
      return escrow;
    } catch (err) {
      console.warn('fetchEscrowState failed:', err);
      return null;
    }
  },

  fetchEvents: async () => {
    try {
      const rpcUrl = getEnvVar('VITE_RPC_URL');
      const registryId = getEnvVar('VITE_GRANT_REGISTRY_CONTRACT');
      const appId = getEnvVar('VITE_GRANT_APPLICATION_CONTRACT');
      const escrowId = getEnvVar('VITE_GRANT_ESCROW_CONTRACT');

      if (rpcUrl && registryId && registryId.startsWith('C')) {
        const server = new rpc.Server(rpcUrl) as any;
        const ids = [registryId];
        if (appId && appId.startsWith('C')) ids.push(appId);
        if (escrowId && escrowId.startsWith('C')) ids.push(escrowId);

        // BLOCKER 1 FIX: startLedger:0 is rejected by Soroban RPC.
        // Fetch latest ledger, then look back ~24h (17280 ledgers at ~5s each).
        const ledgerInfo = await server.getLatestLedger() as any;
        const latestLedger: number = ledgerInfo.sequence || 1;
        const startLedger = Math.max(1, latestLedger - 17280);

        const res = await server.getEvents({
          startLedger,
          filters: [
            {
              type: 'contract',
              contractIds: ids
            }
          ],
          limit: 50
        });

        if (res.events && res.events.length > 0) {
          const onChainEvents = res.events.map((e: any) => {
            let topics: any[] = [];
            let value: any = null;
            try {
              topics = e.topic.map((t: any) => scValToNative((xdr.ScVal.fromXDR as any)(t, 'base64')));
              value = scValToNative((xdr.ScVal.fromXDR as any)(e.value, 'base64'));
            } catch (parseErr) {
              console.warn('Failed to parse event XDR:', parseErr);
            }

            const eventSymbol = topics[0];
            let type = 'CustomEvent';
            let grantId = 0;
            let details: any = {};

            if (eventSymbol === 'created') {
              type = 'GrantCreated';
              grantId = Number(topics[2]);
              details = { owner: topics[1], amount: Number(value) };
            } else if (eventSymbol === 'submit') {
              type = 'ApplicationSubmitted';
              grantId = Number(topics[2]);
              details = { applicant: topics[1], appId: Number(value) };
            } else if (eventSymbol === 'approved') {
              type = 'ApplicationApproved';
              grantId = Number(topics[2]);
              details = { recipient: topics[1], appId: Number(value) };
            } else if (eventSymbol === 'rejected') {
              type = 'ApplicationRejected';
              grantId = Number(topics[2]);
              details = { recipient: topics[1], appId: Number(value) };
            } else if (eventSymbol === 'deposit') {
              type = 'FundsDeposited';
              grantId = Number(topics[2]);
              details = { funder: topics[1], amount: Number(value) };
            } else if (eventSymbol === 'released') {
              type = 'MilestoneReleased';
              grantId = Number(topics[2]);
              details = { recipient: topics[1], milestoneIdx: Number(topics[3]), amount: Number(value) };
            } else if (eventSymbol === 'refunded') {
              type = 'FundsRefunded';
              grantId = Number(topics[2]);
              details = { owner: topics[1], amount: Number(value) };
            }

            return {
              type,
              txHash: e.txHash,
              timestamp: e.ledgerClosedAt || new Date().toISOString(),
              grantId,
              details
            };
          });

          onChainEvents.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          set({ events: onChainEvents.slice(0, 50) });
          setStoredData('gl_events', onChainEvents.slice(0, 50));
          await get().fetchAnalytics();
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

    const releases = events.filter(e => e.type === 'MilestoneReleased');
    const milestonesCompleted = releases.length;
    const fundsReleased = releases.reduce((sum, e) => sum + (e.details?.amount || 0), 0);

    const categoryTotals: {[key: string]: number} = {};
    grants.forEach(g => {
      categoryTotals[g.category] = (categoryTotals[g.category] || 0) + g.amount;
    });
    const fundingByCategory = Object.keys(categoryTotals).map(name => ({
      name,
      value: categoryTotals[name]
    }));

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

    const recipientsMap: {[key: string]: { name: string, title: string, amount: number, category: string }} = {};
    apps.forEach(app => {
      if (app.status === 1) {
        const grant = grants.find(g => g.onChainId === app.grantOnChainId);
        recipientsMap[app.applicant] = {
          name: app.name,
          title: app.projectTitle,
          amount: grant ? grant.amount : app.requestedAmount,
          category: grant ? grant.category : 'General'
        };
      }
    });
    const topRecipients = Object.values(recipientsMap).sort((a, b) => b.amount - a.amount).slice(0, 5);

    const monthlyTotals: {[key: string]: number} = {
      'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0, 'May': 0, 'Jun': 0, 'Jul': 0
    };
    events.forEach(evt => {
      if (evt.type === 'MilestoneReleased' && evt.timestamp) {
        const month = new Date(evt.timestamp).toLocaleString('default', { month: 'short' });
        if (month in monthlyTotals) {
          monthlyTotals[month] += evt.details?.amount || 0;
        }
      }
    });
    const monthlyTrends = Object.keys(monthlyTotals).map(month => ({
      month,
      amount: monthlyTotals[month]
    }));

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
        applicationStatus,
        topRecipients
      }
    });
  },

  runHealthCheck: async (): Promise<HealthStatus> => {
    const rpcUrl = getEnvVar('VITE_RPC_URL');
    const network = getEnvVar('VITE_NETWORK_PASSPHRASE');
    const registryId = getEnvVar('VITE_GRANT_REGISTRY_CONTRACT');
    const applicationId = getEnvVar('VITE_GRANT_APPLICATION_CONTRACT');
    const escrowId = getEnvVar('VITE_GRANT_ESCROW_CONTRACT');

    const walletState = useWalletStore.getState();
    const walletAvailable = !!(window as any).stellarPublicKey || !!(window as any).albedo;
    const walletAddress = walletState.address || undefined;

    let rpcReachable = false;
    let latestLedger = 0;
    let networkMatch = false;
    let registryConnected = false;
    let applicationConnected = false;
    let escrowConnected = false;
    let errorMsg = '';

    if (rpcUrl) {
      try {
        const server = new rpc.Server(rpcUrl) as any;
        const ledgerInfo = await server.getLatestLedger();
        latestLedger = ledgerInfo.sequence || 0;
        rpcReachable = true;
        networkMatch = true;

        if (registryId && registryId.startsWith('C') && registryId.length === 56) {
          try {
            const dummyAccount = new Account('GCSGO4WCCJA5CHIUK4HS2WEGZIXCHL7DAGXP77L3PUHSMGGMAX7TQOL4', '0');
            const dummyTx = new TransactionBuilder(dummyAccount, {
              fee: '100',
              networkPassphrase: network
            })
              .addOperation(new Contract(registryId).call('get_grant', nativeToScVal(999999, { type: 'u32' })))
              .setTimeout(0)
              .build();
            const sim = await server.simulateTransaction(dummyTx);
            if (!rpc.Api.isSimulationError(sim)) {
              registryConnected = true;
            } else {
              console.warn("Registry contract simulation failed:", sim.error);
            }
          } catch (e: any) {
            console.warn("Registry contract connection check failed:", e);
          }
        }

        if (applicationId && applicationId.startsWith('C') && applicationId.length === 56) {
          try {
            const dummyAccount = new Account('GCSGO4WCCJA5CHIUK4HS2WEGZIXCHL7DAGXP77L3PUHSMGGMAX7TQOL4', '0');
            const dummyTx = new TransactionBuilder(dummyAccount, {
              fee: '100',
              networkPassphrase: network
            })
              .addOperation(new Contract(applicationId).call('get_application', nativeToScVal(999999, { type: 'u32' })))
              .setTimeout(0)
              .build();
            const sim = await server.simulateTransaction(dummyTx);
            if (!rpc.Api.isSimulationError(sim)) {
              applicationConnected = true;
            }
          } catch (e: any) {
            console.warn("Application contract connection check failed:", e);
          }
        }

        if (escrowId && escrowId.startsWith('C') && escrowId.length === 56) {
          try {
            const dummyAccount = new Account('GCSGO4WCCJA5CHIUK4HS2WEGZIXCHL7DAGXP77L3PUHSMGGMAX7TQOL4', '0');
            const dummyTx = new TransactionBuilder(dummyAccount, {
              fee: '100',
              networkPassphrase: network
            })
              .addOperation(new Contract(escrowId).call('get_escrow', nativeToScVal(999999, { type: 'u32' })))
              .setTimeout(0)
              .build();
            const sim = await server.simulateTransaction(dummyTx);
            if (!rpc.Api.isSimulationError(sim)) {
              escrowConnected = true;
            }
          } catch (e: any) {
            console.warn("Escrow contract connection check failed:", e);
          }
        }

      } catch (err: any) {
        errorMsg = err.message || 'Unknown RPC error';
      }
    } else {
      errorMsg = 'VITE_RPC_URL environment variable is missing.';
    }

    const healthStatus: HealthStatus = {
      walletAvailable,
      rpcReachable,
      registryConnected,
      applicationConnected,
      escrowConnected,
      networkMatch,
      latestLedger,
      details: {
        rpcUrl: rpcUrl || 'Missing',
        network: network || 'Missing',
        registryId: registryId || 'Missing',
        applicationId: applicationId || 'Missing',
        escrowId: escrowId || 'Missing',
        walletAddress,
        errorMsg: errorMsg || undefined
      }
    };

    set({ health: healthStatus });
    return healthStatus;
  }
}));
