import { Keypair } from '@stellar/stellar-sdk';
import { EventHub, GameEvents } from '../events/EventHub';

export interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  secretKey: string | null; // Stored locally for simulated signing
  network: string | null;
  balance: string;
}

class WalletConnector {
  private state: WalletState = {
    isConnected: false,
    publicKey: null,
    secretKey: null,
    network: null,
    balance: '0',
  };

  /**
   * Connects to the Freighter Wallet extension if available.
   * Otherwise, falls back to a real Stellar Testnet keypair generated locally.
   */
  public async connect(): Promise<WalletState> {
    try {
      // Check if Freighter is injected
      const isFreighterAvailable = (window as any).stellar || (window as any).stellarPubKey;
      
      if (isFreighterAvailable && (window as any).stellar) {
        const provider = (window as any).stellar;
        const { address } = await provider.getPublicKey();
        this.state = {
          isConnected: true,
          publicKey: address,
          secretKey: null, // Freighter handles secret keys
          network: 'TESTNET',
          balance: 'Loading...',
        };
        
        // Fetch balance from Horizon
        await this.updateBalance(address);
        
        EventHub.emit(GameEvents.WALLET_CONNECTED, this.state);
        return this.state;
      }

      // Simulated Grid-Network Wallet utilizing a real Stellar Testnet account
      console.log('Freighter extension not found. Generating/loading local Stellar Testnet Keypair.');
      
      let savedPublic = localStorage.getItem('stellar_pubkey');
      let savedSecret = localStorage.getItem('stellar_seckey');
      
      if (!savedPublic || !savedSecret) {
        const keypair = Keypair.random();
        savedPublic = keypair.publicKey();
        savedSecret = keypair.secret();
        localStorage.setItem('stellar_pubkey', savedPublic);
        localStorage.setItem('stellar_seckey', savedSecret);
        console.log(`[WalletConnector] Created new keypair: ${savedPublic}`);
        
        // Fund the new account via Friendbot
        console.log('[WalletConnector] Funding new account via Friendbot...');
        await fetch(`https://friendbot.stellar.org/?addr=${savedPublic}`);
        console.log('[WalletConnector] Friendbot funding complete.');
      } else {
        console.log(`[WalletConnector] Loaded existing keypair: ${savedPublic}`);
      }

      this.state = {
        isConnected: true,
        publicKey: savedPublic,
        secretKey: savedSecret,
        network: 'TESTNET',
        balance: 'Loading...',
      };

      await this.updateBalance(savedPublic);

      EventHub.emit(GameEvents.WALLET_CONNECTED, this.state);
      return this.state;
    } catch (error) {
      console.error('Wallet connection rejected:', error);
      EventHub.emit(GameEvents.WALLET_DISCONNECTED);
      throw error;
    }
  }

  public async updateBalance(publicKey: string): Promise<string> {
    try {
      const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
      if (!response.ok) {
        throw new Error('Account not found on Testnet');
      }
      const data = await response.json();
      const nativeBalance = data.balances.find((b: any) => b.asset_type === 'native');
      const balance = nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) : '0.00';
      this.state.balance = balance;
      return balance;
    } catch (e) {
      console.warn('[WalletConnector] Failed to fetch balance, account might be unfunded.', e);
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
    };
    EventHub.emit(GameEvents.WALLET_DISCONNECTED, this.state);
  }

  public getState(): WalletState {
    return { ...this.state };
  }
}

export const walletConnector = new WalletConnector();
