import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWalletStore } from './store/wallet';
import { useDataStore, NATIVE_TOKEN_ADDRESS } from './store/data';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; },
    length: 0,
    key: (index: number) => ''
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock freighter-api
vi.mock('@stellar/freighter-api', () => ({
  requestAccess: vi.fn().mockResolvedValue({ address: 'GBX9L2F4AAM24QED4YMSQZLYDOTH6WEYJ2A6ZEPYP7M2GZ4Y6L2OWNER' }),
  signTransaction: vi.fn().mockResolvedValue('mock_signed_xdr'),
  getNetworkDetails: vi.fn().mockResolvedValue({ network: 'TESTNET' }),
  isConnected: vi.fn().mockResolvedValue(true),
  default: {
    requestAccess: vi.fn().mockResolvedValue({ address: 'GBX9L2F4AAM24QED4YMSQZLYDOTH6WEYJ2A6ZEPYP7M2GZ4Y6L2OWNER' }),
    signTransaction: vi.fn().mockResolvedValue('mock_signed_xdr'),
    getNetworkDetails: vi.fn().mockResolvedValue({ network: 'TESTNET' }),
    isConnected: vi.fn().mockResolvedValue(true),
  }
}));

// Mock albedo
vi.mock('@albedo-link/intent', () => ({
  default: {
    publicKey: vi.fn().mockResolvedValue({ pubkey: 'GBX9L2F4AAM24QED4YMSQZLYDOTH6WEYJ2A6ZEPYP7M2GZ4Y6L2OWNER' }),
    tx: vi.fn().mockResolvedValue({ signed_envelope_xdr: 'mock_signed_xdr' })
  }
}));


// Mock stellar-sdk
vi.mock('@stellar/stellar-sdk', () => {
  const mockServer = vi.fn().mockImplementation(() => ({
    getAccount: vi.fn().mockResolvedValue({
      sequenceNumber: '1',
      accountId: 'GBX9L2F4AAM24QED4YMSQZLYDOTH6WEYJ2A6ZEPYP7M2GZ4Y6L2OWNER',
    }),
    simulateTransaction: vi.fn().mockResolvedValue({
      result: {
        retval: {
          _value: []
        }
      }
    }),
    assembleTransaction: vi.fn().mockImplementation((tx) => tx),
    prepareTransaction: vi.fn().mockImplementation((tx) => Promise.resolve(tx)),
    sendTransaction: vi.fn().mockResolvedValue({
      status: 'SUCCESS',
      hash: 'mock_tx_hash_123'
    }),
    getTransaction: vi.fn().mockResolvedValue({
      status: 'SUCCESS'
    }),
    getEvents: vi.fn().mockResolvedValue({
      events: []
    }),
    getLatestLedger: vi.fn().mockResolvedValue({
      sequence: 100000
    })
  }));

  const mockTransactionBuilder = vi.fn().mockImplementation(() => ({
    addOperation: vi.fn().mockReturnThis(),
    setTimeout: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue({
      toXDR: vi.fn().mockReturnValue('mock_xdr'),
    })
  }));
  // Add static method
  (mockTransactionBuilder as any).fromXDR = vi.fn().mockReturnValue({
    toXDR: vi.fn().mockReturnValue('mock_xdr')
  });

  return {
    rpc: {
      Server: mockServer,
      Api: {
        isSimulationError: vi.fn().mockReturnValue(false)
      }
    },
    Contract: vi.fn().mockImplementation(() => ({
      call: vi.fn()
    })),
    Address: {
      fromString: vi.fn()
    },
    Account: vi.fn().mockImplementation((accountId, sequence) => ({
      accountId,
      sequenceNumber: sequence,
    })),
    scValToNative: vi.fn().mockReturnValue([]),
    nativeToScVal: vi.fn(),
    TransactionBuilder: mockTransactionBuilder,
    Networks: {
      TESTNET: 'Test SDF Network ; September 2015'
    },
    xdr: {
      ScVal: {
        fromXDR: vi.fn()
      }
    }
  };
});

describe('GrantLink Frontend Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    // Setup env mock properties globally on process.env and stubEnv
    const gProcess = (globalThis as any).process || { env: {} };
    if (!gProcess.env) gProcess.env = {};
    gProcess.env.VITE_RPC_URL = 'https://mock-rpc.stellar.org';
    gProcess.env.VITE_GRANT_REGISTRY_CONTRACT = 'CCRE...REGY';
    gProcess.env.VITE_GRANT_APPLICATION_CONTRACT = 'CCAP...APPL';
    gProcess.env.VITE_GRANT_ESCROW_CONTRACT = 'CCES...ESCR';
    gProcess.env.VITE_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
    
    vi.stubEnv('VITE_RPC_URL', 'https://mock-rpc.stellar.org');
    vi.stubEnv('VITE_GRANT_REGISTRY_CONTRACT', 'CCRE...REGY');
    vi.stubEnv('VITE_GRANT_APPLICATION_CONTRACT', 'CCAP...APPL');
    vi.stubEnv('VITE_GRANT_ESCROW_CONTRACT', 'CCES...ESCR');
    vi.stubEnv('VITE_NETWORK_PASSPHRASE', 'Test SDF Network ; September 2015');
    // Clear stores before each test
    useWalletStore.setState({
      connected: false,
      address: null,
      walletType: null,
      balance: '0',
      error: null,
    });
    useDataStore.setState({
      grants: [],
      applications: [],
      events: [],
      transactions: [],
      selectedGrant: null,
      toasts: [],
      loading: false,
    });
  });

  // Test 1: wallet_connection_test
  it('wallet_connection_test: should connect with Freighter wallet and set address', async () => {
    const store = useWalletStore.getState();
    await store.connectFreighter();
    const updated = useWalletStore.getState();
    expect(updated.connected).toBe(true);
    expect(updated.address).toBe('GBX9L2F4AAM24QED4YMSQZLYDOTH6WEYJ2A6ZEPYP7M2GZ4Y6L2OWNER');
    expect(updated.walletType).toBe('freighter');
  });

  // Test 2: wallet_disconnect_test
  it('wallet_disconnect_test: should disconnect and reset wallet store state', async () => {
    useWalletStore.setState({
      connected: true,
      address: 'GBX9L2F4AAM24QED4YMSQZLYDOTH6WEYJ2A6ZEPYP7M2GZ4Y6L2OWNER',
      walletType: 'freighter',
      balance: '50.5 XLM'
    });

    useWalletStore.getState().disconnect();

    const state = useWalletStore.getState();
    expect(state.connected).toBe(false);
    expect(state.address).toBeNull();
    expect(state.balance).toBe('0');
  });

  // Test 3: create_grant_form_test
  it('create_grant_form_test: should submit and record a new grant on-chain', async () => {
    useWalletStore.setState({
      connected: true,
      address: 'GBX9L2F4AAM24QED4YMSQZLYDOTH6WEYJ2A6ZEPYP7M2GZ4Y6L2OWNER',
      walletType: 'freighter'
    });

    const grantData = {
      title: 'Water Well Development',
      description: 'Clean water access for rural community.',
      category: 'Healthcare',
      amount: 15000,
      deadline: '2026-12-31',
      milestoneCount: 3
    };

    await useDataStore.getState().createGrant(grantData);

    const txs = useDataStore.getState().transactions;
    expect(txs.length).toBe(1);
    expect(txs[0].method).toBe('create_grant');
    expect(txs[0].status).toBe('SUCCESS');
  });

  // Test 4: application_submission_test
  it('application_submission_test: should submit a proposal application to the ledger', async () => {
    useWalletStore.setState({
      connected: true,
      address: 'GBX9L2F4AAM24QED4YMSQZLYDOTH6WEYJ2A6ZEPYP7M2GZ4Y6L2OWNER',
      walletType: 'freighter'
    });

    const appData = {
      grantOnChainId: 1,
      name: 'Well Diggers Inc',
      projectTitle: 'Borehole Drilling',
      proposal: 'Drilling 3 deep aquifer boreholes.',
      requestedAmount: 14000
    };

    await useDataStore.getState().submitApplication(appData);

    const txs = useDataStore.getState().transactions;
    expect(txs.length).toBe(1);
    expect(txs[0].method).toBe('submit_application');
    expect(txs[0].status).toBe('SUCCESS');
  });

  // Test 5: approval_flow_test
  it('approval_flow_test: should execute approveApplication with milestone distribution', async () => {
    useWalletStore.setState({
      connected: true,
      address: 'GBX9L2F4AAM24QED4YMSQZLYDOTH6WEYJ2A6ZEPYP7M2GZ4Y6L2OWNER',
      walletType: 'freighter'
    });

    await useDataStore.getState().approveApplication(1, 1, [4000, 5000, 5000]);

    const txs = useDataStore.getState().transactions;
    expect(txs.length).toBe(1);
    expect(txs[0].method).toBe('approve_application');
  });

  // Test 6: escrow_flow_test
  it('escrow_flow_test: should deposit funds into the escrow contract', async () => {
    useWalletStore.setState({
      connected: true,
      address: 'GBX9L2F4AAM24QED4YMSQZLYDOTH6WEYJ2A6ZEPYP7M2GZ4Y6L2OWNER',
      walletType: 'freighter'
    });

    await useDataStore.getState().depositFunds(1, NATIVE_TOKEN_ADDRESS);

    const txs = useDataStore.getState().transactions;
    expect(txs.length).toBe(1);
    expect(txs[0].method).toBe('deposit_funds');
  });

  // Test 7: milestone_release_test
  it('milestone_release_test: should trigger milestone funds release on-chain', async () => {
    useWalletStore.setState({
      connected: true,
      address: 'GBX9L2F4AAM24QED4YMSQZLYDOTH6WEYJ2A6ZEPYP7M2GZ4Y6L2OWNER',
      walletType: 'freighter'
    });

    await useDataStore.getState().releaseMilestone(1, 0, 4000);

    const txs = useDataStore.getState().transactions;
    expect(txs.length).toBe(1);
    expect(txs[0].method).toBe('release_milestone');
  });

  // Test 8: analytics_page_test
  it('analytics_page_test: should calculate analytics values dynamically from stores state', async () => {
    useDataStore.setState({
      grants: [
        { onChainId: 1, title: 'G1', description: 'D1', category: 'Tech', amount: 1000, deadline: '2026-01-01', milestoneCount: 2, owner: 'O1', status: 0, proposersCount: 1, createdAt: '' },
        { onChainId: 2, title: 'G2', description: 'D2', category: 'Agri', amount: 2000, deadline: '2026-01-01', milestoneCount: 3, owner: 'O1', status: 2, proposersCount: 0, createdAt: '' }
      ],
      applications: [
        { onChainId: 1, grantOnChainId: 1, applicant: 'A1', name: 'N1', projectTitle: 'P1', proposal: 'Pr1', requestedAmount: 800, status: 1, createdAt: '' }
      ]
    });

    await useDataStore.getState().fetchAnalytics();

    const analytics = useDataStore.getState().analytics;
    expect(analytics.totalGrants).toBe(2);
    expect(analytics.totalFunding).toBe(3000);
    expect(analytics.totalApplications).toBe(1);
    expect(analytics.successRate).toBe(100);
    expect(analytics.grantStatus.find((s: any) => s.status === 'Active')?.count).toBe(1);
    expect(analytics.grantStatus.find((s: any) => s.status === 'Completed')?.count).toBe(1);
  });

  // Test 9: event_feed_test
  it('event_feed_test: should add and sort custom activity feed events', async () => {
    const event1 = {
      type: 'GrantCreated',
      txHash: '0xabc',
      grantId: 1,
      details: { amount: 1000 }
    };
    
    await useDataStore.getState().addEvent(event1);

    const events = useDataStore.getState().events;
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('GrantCreated');
    expect(events[0].txHash).toBe('0xabc');
  });

  // Test 10: transaction_history_test
  it('transaction_history_test: should add new transaction records to centralized store history', () => {
    const txRecord = {
      hash: 'mock_hash_999',
      timestamp: new Date().toISOString(),
      contractId: 'CARG...REG3',
      method: 'create_grant',
      status: 'SUCCESS' as const,
      explorerLink: 'https://stellar.expert/explorer/testnet/tx/mock_hash_999'
    };

    useDataStore.getState().addTransaction(txRecord);

    const txs = useDataStore.getState().transactions;
    expect(txs.length).toBe(1);
    expect(txs[0].hash).toBe('mock_hash_999');
    expect(txs[0].method).toBe('create_grant');
    expect(txs[0].status).toBe('SUCCESS');
  });
});
