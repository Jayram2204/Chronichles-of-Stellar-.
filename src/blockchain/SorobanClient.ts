import {
  rpc,
  Keypair,
  Networks,
  nativeToScVal,
  scValToNative,
  BASE_FEE,
  xdr,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { EventHub, GameEvents } from '../events/EventHub';
import { walletConnector } from './WalletConnector';

export interface PlayerState {
  address: string;
  reputation: number;
  level: number;
  has_keycard: boolean;
  has_firewall_pass: boolean;
  total_transactions: number;
}

export interface GameState {
  total_players: number;
  total_transactions: number;
  contract_version: number;
}

const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const CONTRACT_ID = import.meta.env.VITE_SOROBAN_CONTRACT_ID || '';

class SorobanClient {
  private server: rpc.Server;
  private contractId: string;

  constructor() {
    this.server = new rpc.Server(SOROBAN_RPC_URL);
    this.contractId = CONTRACT_ID;
  }

  get isDeployed(): boolean {
    return this.contractId.length > 0;
  }

  async getPlayer(publicKey: string): Promise<PlayerState | null> {
    if (!this.isDeployed) {
      console.warn('[SorobanClient] Contract not deployed. Using local fallback.');
      return null;
    }
    try {
      const { result } = await this.server.queryContract<any>(
        this.contractId,
        'get_player',
        [nativeToScVal(publicKey, { type: 'address' })]
      );
      return this.parsePlayerState(result);
    } catch (error) {
      console.warn('[SorobanClient] get_player failed:', error);
      return null;
    }
  }

  async canAccessLevel(publicKey: string, requiredLevel: number): Promise<boolean> {
    if (!this.isDeployed) return true;
    try {
      const { result } = await this.server.queryContract<boolean>(
        this.contractId,
        'can_access_level',
        [
          nativeToScVal(publicKey, { type: 'address' }),
          nativeToScVal(requiredLevel, { type: 'u32' }),
        ]
      );
      return result;
    } catch (error) {
      console.warn('[SorobanClient] can_access_level failed:', error);
      return true;
    }
  }

  async getGameState(): Promise<GameState | null> {
    if (!this.isDeployed) return null;
    try {
      const { result } = await this.server.queryContract<any>(
        this.contractId,
        'get_game_state',
        []
      );
      return {
        total_players: Number(result.total_players),
        total_transactions: Number(result.total_transactions),
        contract_version: Number(result.contract_version),
      };
    } catch (error) {
      console.warn('[SorobanClient] get_game_state failed:', error);
      return null;
    }
  }

  async initPlayer(): Promise<PlayerState | null> {
    if (!this.isDeployed) {
      console.warn('[SorobanClient] Contract not deployed.');
      return null;
    }
    const walletState = walletConnector.getState();
    if (!walletState.isConnected || !walletState.publicKey) {
      console.error('[SorobanClient] Wallet not connected.');
      return null;
    }
    try {
      const result = await this.invokeContract('init_player', [
        nativeToScVal(walletState.publicKey, { type: 'address' }),
      ]);
      return this.parsePlayerState(result);
    } catch (error) {
      console.error('[SorobanClient] init_player failed:', error);
      return null;
    }
  }

  async approveAction(action: string): Promise<PlayerState | null> {
    if (!this.isDeployed) {
      console.warn('[SorobanClient] Contract not deployed. Using local state.');
      return null;
    }
    const walletState = walletConnector.getState();
    if (!walletState.isConnected || !walletState.publicKey) {
      console.error('[SorobanClient] Wallet not connected.');
      return null;
    }
    try {
      const result = await this.invokeContract('approve_action', [
        nativeToScVal(walletState.publicKey, { type: 'address' }),
        nativeToScVal(action, { type: 'string' }),
      ]);
      return this.parsePlayerState(result);
    } catch (error) {
      console.error('[SorobanClient] approve_action failed:', error);
      return null;
    }
  }

  private async invokeContract(
    method: string,
    args: xdr.ScVal[]
  ): Promise<any> {
    const walletState = walletConnector.getState();
    const sourceAccount = await this.server.getAccount(walletState.publicKey!);

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: this.contractId,
          function: method,
          args,
        })
      )
      .setTimeout(30)
      .build();

    const simulated = await this.server.simulateTransaction(transaction);
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    let signedTx;
    if (walletState.secretKey) {
      const keypair = Keypair.fromSecret(walletState.secretKey);
      transaction.sign(keypair);
      signedTx = transaction;
    } else {
      const provider = (window as any).stellar;
      if (!provider) throw new Error('Freighter wallet provider not found.');
      const signedXdr = await provider.signTransaction({
        xdr: transaction.toXDR(),
        network: 'TESTNET',
      });
      signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
    }

    const response = await this.server.sendTransaction(signedTx);
    if (response.status === 'ERROR') {
      throw new Error(`Transaction failed: ${JSON.stringify(response.errorResult)}`);
    }

    const txHash = response.hash;
    let attempts = 0;
    while (attempts < 30) {
      const txResponse = await this.server.getTransaction(txHash);
      if (txResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        if (txResponse.resultXdr) {
          const resultMeta = xdr.TransactionMeta.fromXDR(txResponse.resultXdr, 'base64');
          return this.extractContractResult(resultMeta);
        }
        return null;
      }
      if (txResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error('Transaction failed on-chain');
      }
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error('Transaction timed out');
  }

  private parsePlayerState(result: any): PlayerState {
    if (!result) return null as any;
    return {
      address: result.address?.toString() || '',
      reputation: Number(result.reputation) || 0,
      level: Number(result.level) || 1,
      has_keycard: Boolean(result.has_keycard),
      has_firewall_pass: Boolean(result.has_firewall_pass),
      total_transactions: Number(result.total_transactions) || 0,
    };
  }

  private extractContractResult(meta: xdr.TransactionMeta): any {
    try {
      const v3 = meta.v3();
      if (v3) {
        const sorobanMeta = v3.sorobanMeta();
        if (sorobanMeta) {
          const returnValue = sorobanMeta.returnValue();
          if (returnValue) {
            return scValToNative(returnValue);
          }
        }
      }
    } catch (error) {
      console.warn('[SorobanClient] Failed to extract result:', error);
    }
    return null;
  }
}

export const sorobanClient = new SorobanClient();
