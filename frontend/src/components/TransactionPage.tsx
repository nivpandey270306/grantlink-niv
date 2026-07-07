import React, { useState } from 'react';
import { useWalletStore } from '../store/wallet';
import { useDataStore } from '../store/data';
import { Asset, Operation, TransactionBuilder, rpc, Memo } from '@stellar/stellar-sdk';

interface TransactionPageProps {
  onClose: () => void;
}

export function TransactionPage({ onClose }: TransactionPageProps) {
  const { connected, address, balance, signTx, refreshBalance } = useWalletStore();
  const { addToast, addEvent } = useDataStore();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [txState, setTxState] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !address) {
      addToast('Wallet not connected', 'Please connect Freighter or Albedo.', 'error');
      return;
    }
    if (!recipient || !amount) {
      addToast('Validation Error', 'Recipient and Amount are required.', 'error');
      return;
    }

    setLoading(true);
    setTxState('pending');
    setErrorMsg('');

    try {
      const rpcUrl = (import.meta as any).env.VITE_RPC_URL;
      const networkPassphrase = (import.meta as any).env.VITE_NETWORK_PASSPHRASE;
      const server = new rpc.Server(rpcUrl) as any;

      // 1. Fetch account sequence
      let sourceAccount;
      try {
        sourceAccount = await server.getAccount(address);
      } catch (err) {
        throw new Error('Failed to retrieve account details. Ensure your wallet is funded.');
      }

      // 2. Build payment operation
      const op = Operation.payment({
        destination: recipient,
        asset: Asset.native(),
        amount: amount,
      });

      // 3. Construct transaction
      let tx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase,
      })
        .addOperation(op)
        .setTimeout(60);

      if (memo) {
        tx = tx.addMemo(Memo.text(memo));
      }

      const builtTx = tx.build();

      // 4. Request wallet signature
      const xdr = builtTx.toXDR();
      const signedXdr = await signTx(xdr);
      const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

      // 5. Submit transaction
      const response = await server.sendTransaction(signedTx) as any;
      if (response.status === 'ERROR') {
        throw new Error(`Transaction submission error: ${response.errorResultXdr || response.errorResult || 'Unknown error'}`);
      }

      const hash = response.hash;

      // 6. Poll for status
      let status = response.status as any;
      let pollAttempts = 0;
      while (status === 'PENDING' && pollAttempts < 15) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const txStatus = await server.getTransaction(hash) as any;
        status = txStatus.status;
        pollAttempts++;
        if (status === 'SUCCESS') {
          break;
        }
        if (status === 'FAILED') {
          throw new Error('On-chain transaction execution failed.');
        }
      }

      if (status !== 'SUCCESS') {
        throw new Error(`Transaction polling timed out. Status: ${status}`);
      }

      // Update state
      setTxHash(hash);
      setTxState('success');
      addToast('Transfer Confirmed', `Successfully sent ${amount} XLM to ${recipient.slice(0, 6)}...`, 'success');

      // Refresh balance
      await refreshBalance();

      // Log event to timeline
      await addEvent({
        type: 'FundsDeposited',
        txHash: hash,
        grantId: 0,
        details: { amount: parseFloat(amount), recipient }
      });

      // Clear inputs
      setRecipient('');
      setAmount('');
      setMemo('');
    } catch (err: any) {
      setTxState('failed');
      setErrorMsg(err.message || 'Transaction submission failed.');
      addToast('Transfer Failed', err.message || 'Stellar RPC transaction error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 max-w-xl mx-auto shadow-sm">
      <div className="flex justify-between items-center border-b border-outline-variant pb-4 mb-6">
        <h3 className="text-xl font-bold font-soria text-forest flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">send</span>
          Send Assets
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-copper border border-copper px-3 py-1.5 rounded hover:bg-surface-container-low transition-colors font-semibold"
        >
          Back
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-surface border border-outline-variant rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-inter">Current Balance</span>
          <strong className="text-2xl font-bold text-forest font-mono">{balance}</strong>
          <span className="text-[9px] font-mono text-outline truncate max-w-[250px] mt-0.5">Addr: {address || 'Not connected'}</span>
        </div>
        <button
          onClick={refreshBalance}
          disabled={loading || !connected}
          className="border border-primary text-primary font-semibold text-xs px-3.5 py-2 rounded hover:bg-surface-container-low transition-colors flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-xs">refresh</span>
          Refresh Balance
        </button>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSend} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-on-surface">Recipient G-Address *</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="e.g., GBYX9L2..."
            className="bg-surface border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary font-mono"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface">Amount (XLM) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 500"
              className="bg-surface border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary font-mono"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface">Memo (Optional)</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="e.g., matching pool"
              className="bg-surface border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !connected}
          className="w-full bg-[#283618] hover:bg-opacity-95 text-white font-semibold py-3 rounded text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-xs">send</span>
          {loading ? 'Processing...' : 'Send Assets'}
        </button>
      </form>

      {/* Transaction status logs */}
      {txState !== 'idle' && (
        <div className="mt-6 p-4 rounded-lg border border-outline-variant bg-surface flex flex-col gap-3">
          {txState === 'pending' && (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-on-surface-variant font-semibold">Submitting transaction to Stellar network...</span>
            </div>
          )}
          {txState === 'success' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span className="text-xs font-bold font-inter">Transaction Succeeded</span>
              </div>
              <div className="font-mono text-[9px] bg-surface-container p-2 rounded break-all border border-outline-variant">
                Hash: {txHash}
              </div>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                View on Stellar.expert explorer
                <span className="material-symbols-outlined text-[10px]">open_in_new</span>
              </a>
            </div>
          )}
          {txState === 'failed' && (
            <div className="flex flex-col gap-1 text-copper">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span className="text-xs font-bold font-inter">Transaction Failed</span>
              </div>
              <p className="text-[10px] text-on-surface-variant">{errorMsg}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
