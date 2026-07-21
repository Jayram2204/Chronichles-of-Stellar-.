import { isConnected, getAddress, getNetwork } from '@stellar/freighter-api';
import { Horizon } from '@stellar/stellar-sdk';
import { EventHub, GameEvents } from '../events/EventHub';

export interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  secretKey: string | null;
  network: string | null;
  balance: string;
  isFreighter: boolean;
}

const NETWORK_NAME = import.meta.env.VITE_STELLAR_NETWORK || 'TESTNET';
const NETWORK_PASSPHRASE = NETWORK_NAME === 'PUBLIC'
  ? 'Public Global Stellar Network ; September 2015'
  : 'Test SDF Network ; September 2015';
const HORIZON_URL =
  import.meta.env.VITE_HORIZON_URL ||
  (NETWORK_NAME === 'PUBLIC'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org');

class WalletConnector {
  private state: WalletState = {
    isConnected: false,
    publicKey: null,
    secretKey: null,
    network: null,
    balance: '0',
    isFreighter: false,
  };

  private server = new Horizon.Server(HORIZON_URL);

  public async connect(): Promise<WalletState> {
    try {
      const connResult = await isConnected();
      const freighterAvailable = typeof connResult === 'boolean' ? connResult : connResult?.isConnected;

      if (freighterAvailable) {
        console.log('[WalletConnector] Freighter extension detected. Connecting...');
        const addrRes = await getAddress();
        if (addrRes.error) {
          throw new Error(`Freighter connection error: ${addrRes.error}`);
        }

        const publicKey = addrRes.address;
        const netRes = await getNetwork();
        const networkName = netRes?.network || NETWORK_PASSPHRASE;

        this.state = {
          isConnected: true,
          publicKey: publicKey,
          secretKey: null,
          network: networkName,
          balance: 'Loading...',
          isFreighter: true,
        };

        await this.updateBalance(publicKey);
        EventHub.emit(GameEvents.WALLET_CONNECTED, this.state);
        return this.state;
      }

      // Check generic window.stellar provider fallback
      const windowStellar = (window as any).stellar || (window as any).albedo;
      if (windowStellar) {
        console.log('[WalletConnector] Generic Stellar window provider detected.');
        const { address } = await windowStellar.getPublicKey();
        this.state = {
          isConnected: true,
          publicKey: address,
          secretKey: null,
          network: NETWORK_PASSPHRASE,
          balance: 'Loading...',
          isFreighter: true,
        };

        await this.updateBalance(address);
        EventHub.emit(GameEvents.WALLET_CONNECTED, this.state);
        return this.state;
      }

      throw new Error(
        'No Stellar wallet extension found. Please install Freighter (freighter.app) to connect your ledger identity.'
      );
    } catch (error) {
      console.error('[WalletConnector] Connection failed:', error);
      EventHub.emit(GameEvents.WALLET_DISCONNECTED);
      throw error;
    }
  }

  public async updateBalance(publicKey: string): Promise<string> {
    try {
      const account = await this.server.loadAccount(publicKey);
      const nativeBalance = account.balances.find((b: any) => b.asset_type === 'native');
      const balance = nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) : '0.00';
      this.state.balance = balance;
      return balance;
    } catch (e) {
      console.warn('[WalletConnector] Account not found or unfunded on network.', e);
      this.state.balance = '0.00 (Unfunded)';
      return '0.00';
    }
  }

  public disconnect() {
    this.state = {
      isConnected: false,
      publicKey: null,
      secretKey: null,
      network: null,
      balance: '0',
      isFreighter: false,
    };
    EventHub.emit(GameEvents.WALLET_DISCONNECTED, this.state);
  }

  public getState(): WalletState {
    return { ...this.state };
  }
}

export const walletConnector = new WalletConnector();
