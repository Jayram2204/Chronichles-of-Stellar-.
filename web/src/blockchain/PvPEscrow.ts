import * as StellarSdk from '@stellar/stellar-sdk';
import { isConnected, getAddress, getNetwork, signTransaction } from '@stellar/freighter-api';

const NETWORK_PASSPHRASE = import.meta.env.VITE_STELLAR_NETWORK === 'PUBLIC'
  ? 'Public Global Stellar Network ; September 2015'
  : 'Test SDF Network ; September 2015';
const RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-rpc.mainnet.stellar.org';

let CONTRACT_ID = import.meta.env.VITE_SOROBAN_CONTRACT_ID || '';

export function setContractId(id: string) {
  CONTRACT_ID = id;
}

export function getContractId() {
  return CONTRACT_ID;
}

function toAddress(addr: string): StellarSdk.xdr.ScVal {
  return new StellarSdk.Address(addr).toScVal();
}

function toU64(val: number): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(val, { type: 'u64' });
}

function toI128(val: number): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(BigInt(Math.floor(val * 10_000_000)), { type: 'i128' });
}

export interface BoutResult {
  id: number;
  challenger: string;
  opponent: string | null;
  bet_amount: number;
  status: string;
  challenger_score: number;
  opponent_score: number;
  winner: string | null;
  created_at: number;
}

export interface BotBoutResult {
  id: number;
  player: string;
  bet_amount: number;
  time_limit: number;
  status: string;
  player_score: number;
  completion_time: number;
  payout: number;
  created_at: number;
}

let server: StellarSdk.SorobanRpc.Server | null = null;
function getServer() {
  if (!server) {
    server = new StellarSdk.SorobanRpc.Server(RPC_URL);
  }
  return server;
}

export async function signAndSubmitWithFreighter(
  method: string,
  args: StellarSdk.xdr.ScVal[]
): Promise<string> {
  if (!CONTRACT_ID) throw new Error('Contract not deployed. Set VITE_SOROBAN_CONTRACT_ID.');

  const rpc = getServer();
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const address = await getAddress();

  const account = await rpc.getAccount(address);
  const txBuilder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  const preparedTx = await rpc.prepareTransaction(txBuilder);
  const signedXdr = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await rpc.sendTransaction(signedTx);

  if (result.status === 'ERROR') {
    throw new Error(`Transaction failed: ${JSON.stringify(result)}`);
  }

  return result.hash;
}

export async function simulateContract(
  method: string,
  args: StellarSdk.xdr.ScVal[]
): Promise<any> {
  if (!CONTRACT_ID) throw new Error('Contract not deployed. Set VITE_SOROBAN_CONTRACT_ID.');

  const rpc = getServer();
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const source = await rpc.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');

  const txBuilder = new StellarSdk.TransactionBuilder(source, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  const simResult = await rpc.simulateTransaction(txBuilder);
  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }
  return simResult;
}

// ── PvP Player-vs-Player ────────────────────────────────────────────────────
export async function createBoutWithFreighter(betAmountXlm: number): Promise<string> {
  const address = await getAddress();
  return signAndSubmitWithFreighter(
    'create_bout',
    [toAddress(address), toI128(betAmountXlm)]
  );
}

export async function acceptBoutWithFreighter(boutId: number): Promise<string> {
  return signAndSubmitWithFreighter(
    'accept_bout',
    [toU64(boutId)]
  );
}

export async function submitScoreWithFreighter(boutId: number, score: number): Promise<string> {
  return signAndSubmitWithFreighter(
    'submit_score',
    [toU64(boutId), toU64(score)]
  );
}

export async function getBout(boutId: number): Promise<BoutResult | null> {
  try {
    await simulateContract('get_bout', [toU64(boutId)]);
    return null;
  } catch {
    return null;
  }
}

export async function getOpenBouts(): Promise<BoutResult[]> {
  try {
    await simulateContract('get_open_bouts', []);
    return [];
  } catch {
    return [];
  }
}

// ── Bot Betting ─────────────────────────────────────────────────────────────
export async function createBotBoutWithFreighter(betAmountXlm: number, timeLimit: number): Promise<string> {
  return signAndSubmitWithFreighter(
    'create_bot_bout',
    [toI128(betAmountXlm), toU64(timeLimit)]
  );
}

export async function resolveBotBoutWithFreighter(boutId: number, score: number, completionTime: number): Promise<string> {
  return signAndSubmitWithFreighter(
    'resolve_bot_bout',
    [toU64(boutId), toU64(score), toU64(completionTime)]
  );
}

// ── Treasury / Admin ────────────────────────────────────────────────────────
export async function getTreasury(): Promise<number> {
  try {
    await simulateContract('get_treasury', []);
    return 0;
  } catch {
    return 0;
  }
}
