import {
  Horizon,
  TransactionBuilder,
  Operation,
  Keypair,
  Networks,
} from '@stellar/stellar-sdk';
import { EventHub, GameEvents } from '../events/EventHub';
import { walletConnector } from './WalletConnector';

export class StellarClient {
  private server = new Horizon.Server('https://horizon-testnet.stellar.org');

  /**
   * Submits a transaction to mutate the decentralized grid world state.
   * Uses a Manage Data operation to write the state mutation directly onto the Stellar ledger.
   */
  public async mutateGameState(action: string, details: any): Promise<boolean> {
    const walletState = walletConnector.getState();
    if (!walletState.isConnected || !walletState.publicKey) {
      console.error('Cannot submit smart contract invocation: Wallet disconnected.');
      return false;
    }

    // Trigger state change in UI to show "hacking/syncing"
    EventHub.emit(GameEvents.TX_SUBMITTED, { action, details });

    try {
      const publicKey = walletState.publicKey;
      
      console.log(`[StellarClient] Building transaction for account: ${publicKey}, action: ${action}`);
      
      // Load source account details (including current sequence number)
      const account = await this.server.loadAccount(publicKey);
      
      // Build a transaction with a ManageData operation to store game progress on-chain
      const transaction = new TransactionBuilder(account, {
        fee: '10000', // 10,000 stroops (0.001 XLM)
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.manageData({
            name: action.substring(0, 64), // ManageData keys are max 64 chars
            value: details.npcId || 'active',
          })
        )
        .setTimeout(30)
        .build();

      let txHash = '';
      let ledger = 0;

      if (walletState.secretKey) {
        // Local Keypair Signing
        const keypair = Keypair.fromSecret(walletState.secretKey);
        transaction.sign(keypair);
        console.log('[StellarClient] Transaction signed locally. Submitting to Horizon...');
        
        const response = await this.server.submitTransaction(transaction);
        txHash = response.hash;
        ledger = response.ledger || 0;
        console.log('[StellarClient] Transaction confirmed. Hash:', txHash, 'Ledger:', ledger);
      } else {
        // Freighter Extension Signing
        const provider = (window as any).stellar;
        if (!provider) {
          throw new Error('Freighter wallet provider not found.');
        }
        
        console.log('[StellarClient] Requesting Freighter signature...');
        const signedXdr = await provider.signTransaction({
          xdr: transaction.toXDR(),
          network: 'TESTNET',
        });
        
        const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
        console.log('[StellarClient] Freighter signature received. Submitting to Horizon...');
        
        const response = await this.server.submitTransaction(signedTx);
        txHash = response.hash;
        ledger = response.ledger || 0;
        console.log('[StellarClient] Freighter transaction confirmed. Hash:', txHash, 'Ledger:', ledger);
      }

      // Update the wallet balance after the transaction finishes
      await walletConnector.updateBalance(publicKey);

      EventHub.emit(GameEvents.TX_CONFIRMED, {
        action,
        txHash,
        ledger,
      });

      return true;
    } catch (error) {
      console.error('[StellarClient] Transaction failed:', error);
      EventHub.emit(GameEvents.TX_FAILED, { action, error: String(error) });
      return false;
    }
  }
}

export const stellarClient = new StellarClient();
