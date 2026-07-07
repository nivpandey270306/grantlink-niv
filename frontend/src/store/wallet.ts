import { create } from 'zustand';
import { isConnected, requestAccess, signTransaction, getNetworkDetails } from '@stellar/freighter-api';
import albedo from '@albedo-link/intent';

interface WalletState {
  connected: boolean;
  address: string | null;
  walletType: 'freighter' | 'albedo' | null;
  network: string; // 'TESTNET' or 'PUBLIC'
  balance: string;
  loading: boolean;
  error: string | null;
  
  connectFreighter: () => Promise<void>;
  connectAlbedo: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  fundAccount: () => Promise<void>;
  signTx: (xdr: string) => Promise<string>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  connected: false,
  address: null,
  walletType: null,
  network: 'TESTNET',
  balance: '0',
  loading: false,
  error: null,

  connectFreighter: async () => {
    set({ loading: true, error: null });
    try {
      const connectedResult = await isConnected();
      const isInstalled = typeof connectedResult === 'boolean' 
        ? connectedResult 
        : connectedResult?.isConnected;

      if (!isInstalled) {
        throw new Error('Freighter extension is not installed');
      }

      // requestAccess() is the recommended method to prompt connection
      const accessResult = await requestAccess();
      const addr = typeof accessResult === 'string'
        ? accessResult
        : accessResult?.address;

      const errMsg = typeof accessResult === 'string'
        ? null
        : accessResult?.error;

      if (errMsg) {
        throw new Error(errMsg);
      }

      if (!addr) {
        throw new Error('Freighter access denied. Please open your extension and log in.');
      }

      // Check selected network in Freighter to notify user
      let freighterNetwork = 'TESTNET';
      try {
        const netDetails = await getNetworkDetails();
        if (netDetails && netDetails.network) {
          freighterNetwork = netDetails.network.toUpperCase();
        }
      } catch (netErr) {
        console.warn('Failed to detect network details:', netErr);
      }

      set({
        connected: true,
        address: addr,
        walletType: 'freighter',
        network: freighterNetwork,
        loading: false,
      });

      await get().refreshBalance();
    } catch (err: any) {
      set({ error: err.message || 'Failed to connect Freighter', loading: false });
    }
  },

  connectAlbedo: async () => {
    set({ loading: true, error: null });
    try {
      const res = await albedo.publicKey({});
      if (!res.pubkey) {
        throw new Error('Albedo wallet returned no public key');
      }
      set({
        connected: true,
        address: res.pubkey,
        walletType: 'albedo',
        network: 'TESTNET',
        loading: false,
      });
      await get().refreshBalance();
    } catch (err: any) {
      set({ error: err.message || 'Failed to connect Albedo', loading: false });
    }
  },

  disconnect: () => {
    set({
      connected: false,
      address: null,
      walletType: null,
      balance: '0',
      error: null,
    });
  },

  refreshBalance: async () => {
    const { address } = get();
    if (!address) return;
    try {
      const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
      if (response.status === 404) {
        set({ balance: '0 (Unfunded)' });
        return;
      }
      const data = await response.json();
      if (data && data.balances) {
        const nativeBalance = data.balances.find((b: any) => b.asset_type === 'native');
        set({ balance: nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) + ' XLM' : '0 XLM' });
      } else {
        set({ balance: '0 XLM' });
      }
    } catch (err) {
      console.error('Failed to fetch balance', err);
    }
  },

  fundAccount: async () => {
    const { address } = get();
    if (!address) return;
    set({ loading: true, error: null });
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${address}`);
      if (!res.ok) {
        throw new Error('Friendbot funding failed');
      }
      // Wait for ledger
      await new Promise((r) => setTimeout(r, 2000));
      await get().refreshBalance();
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  signTx: async (xdr: string) => {
    const { walletType, network } = get();
    if (!walletType) throw new Error('Wallet not connected');

    if (walletType === 'freighter') {
      const passphrase = network === 'TESTNET' 
        ? 'Test SDF Network ; September 2015' 
        : 'Public Global Stellar Network ; October 2015';
      const signedResult = await signTransaction(xdr, { 
        networkPassphrase: passphrase,
        network: network === 'TESTNET' ? 'TESTNET' : 'PUBLIC'
      } as any);
      
      const signedXdr = typeof signedResult === 'string'
        ? signedResult
        : signedResult?.signedTxXdr;

      const errMsg = typeof signedResult === 'string'
        ? null
        : signedResult?.error;

      if (errMsg) {
        throw new Error(errMsg);
      }

      if (!signedXdr) {
        throw new Error('Failed to sign transaction or signature denied');
      }

      return signedXdr;
    } else {
      // Albedo
      const res = await albedo.tx({
        xdr,
        network: network.toLowerCase(),
      });
      if (res.signed_envelope_xdr) {
        return res.signed_envelope_xdr;
      }
      throw new Error('User cancelled Albedo signature request');
    }
  },
}));
