import { describe, it, expect, beforeEach } from 'vitest';
import { useWalletStore } from './store/wallet';
import { useDataStore } from './store/data';

describe('GrantLink Zustand State Stores', () => {
  beforeEach(() => {
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
      selectedGrant: null,
      toasts: [],
    });
  });

  // Test 1: Wallet Connection Defaults
  it('should initialize with disconnected wallet state', () => {
    const state = useWalletStore.getState();
    expect(state.connected).toBe(false);
    expect(state.address).toBeNull();
    expect(state.balance).toBe('0');
  });

  // Test 2: Wallet Disconnection Action
  it('should clear address and balance on disconnect', () => {
    useWalletStore.setState({
      connected: true,
      address: 'GDY...',
      walletType: 'freighter',
      balance: '100 XLM',
    });

    useWalletStore.getState().disconnect();

    const state = useWalletStore.getState();
    expect(state.connected).toBe(false);
    expect(state.address).toBeNull();
    expect(state.balance).toBe('0');
  });

  // Test 3: Toast System - Adding Notifications
  it('should push toast notification correctly', () => {
    const store = useDataStore.getState();
    expect(store.toasts.length).toBe(0);

    store.addToast('Test Title', 'Test Message', 'success');

    const updated = useDataStore.getState();
    expect(updated.toasts.length).toBe(1);
    expect(updated.toasts[0].title).toBe('Test Title');
    expect(updated.toasts[0].type).toBe('success');
  });

  // Test 4: Toast System - Removing Notifications
  it('should remove toast notification by ID', () => {
    useDataStore.getState().addToast('To Remove', 'Msg', 'error');
    let state = useDataStore.getState();
    const id = state.toasts[0].id;

    state.removeToast(id);

    const updated = useDataStore.getState();
    expect(updated.toasts.length).toBe(0);
  });

  // Test 5: Selected Grant Details Focus
  it('should set and clear selected grant focus state', () => {
    const grant = {
      onChainId: 1,
      title: 'Green Earth',
      description: 'Forest restoration',
      category: 'Agriculture',
      amount: 15000,
      deadline: '2026-12-31',
      milestoneCount: 3,
      owner: 'GABC...',
      status: 0,
      proposersCount: 0,
      createdAt: new Date().toISOString(),
    };

    useDataStore.setState({ grants: [grant] });
    useDataStore.getState().setSelectedGrant(grant);
    let state = useDataStore.getState();
    expect(state.selectedGrant).toEqual(grant);

    useDataStore.getState().setSelectedGrant(null);
    state = useDataStore.getState();
    expect(state.selectedGrant).toBeNull();
  });
});
