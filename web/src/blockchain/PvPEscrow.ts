import * as StellarSdk from '@stellar/stellar-sdk';

const NETWORK_PASSPHRASE = 'Public Global Stellar Network ; September 2015';
const RPC_URL = 'https://mainnet.stellar.validationcloud.io/v1/YMzCn8o6KZrTHjVFXxMu5WE5M';

export interface Bout {
  id: string;
  player_a: string;
  player_b: string | null;
  bet_amount: string;
  score_a: string | null;
  score_b: string | null;
  status: 'open' | 'active' | 'resolved';
  winner: string | null;
}

// Contract ID set after deployment
let CONTRACT_ID = '';

export function setContractId(id: string) {
  CONTRACT_ID = id;
}

export function getContractId() {
  return CONTRACT_ID;
}

async function invokeContract(
  method: string,
  args: StellarSdk.xdr.ScVal[],
  signWithKeypair?: StellarSdk.Keypair
): Promise<any> {
  const server = new StellarSdk.SorobanRpc.Server(RPC_URL);

  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const account = await server.getAccount(signWithKeypair?.publicKey() || CONTRACT_ID);

  const txBuilder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(StellarSdk.TimeoutInfinite)
    .build();

  const simResult = await server.simulateTransaction(txBuilder);
  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  if (signWithKeypair) {
    const preparedTx = await server.prepareTransaction(txBuilder);
    preparedTx.sign(signWithKeypair);
    const txResult = await server.sendTransaction(preparedTx);
    return txResult;
  }

  return simResult;
}

function toAddress(addr: string): StellarSdk.xdr.ScVal {
  return StellarSdk.Address.addressToScVal(addr);
}

function toU64(val: number): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(val, { type: 'u64' });
}

function toI128(val: number): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(BigInt(Math.floor(val * 10_000_000)), { type: 'i128' });
}

export async function createBout(playerAddress: string, betAmountXlm: number): Promise<any> {
  // Note: player must sign the transaction with Freighter
  // This generates the transaction, Freighter signs, then we send
  return invokeContract(
    'create_bout',
    [toAddress(playerAddress), toI128(betAmountXlm)]
  );
}

export async function acceptBout(playerAddress: string, boutId: number): Promise<any> {
  return invokeContract(
    'accept_bout',
    [toAddress(playerAddress), toU64(boutId)]
  );
}

export async function submitScore(
  playerAddress: string,
  boutId: number,
  score: number
): Promise<any> {
  return invokeContract(
    'submit_score',
    [toAddress(playerAddress), toU64(boutId), toU64(score)]
  );
}

export async function getBout(boutId: number): Promise<Bout | null> {
  try {
    const result = await invokeContract('get_bout', [toU64(boutId)]);
    // Parse result from simulation
    return result as unknown as Bout;
  } catch {
    return null;
  }
}

export async function getOpenBouts(): Promise<Bout[]> {
  try {
    const result = await invokeContract('get_open_bouts', []);
    return (result as unknown as Bout[]) || [];
  } catch {
    return [];
  }
}

// Freighter-based signing for actual transactions
export async function signAndSubmitWithFreighter(
  method: string,
  args: StellarSdk.xdr.ScVal[]
): Promise<string> {
  const freighter = await import('@stellar/freighter-api');

  const server = new StellarSdk.SorobanRpc.Server(RPC_URL);
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const address = await freighter.getAddress();

  const account = await server.getAccount(address);
  const txBuilder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(StellarSdk.TimeoutInfinite)
    .build();

  const preparedTx = await server.prepareTransaction(txBuilder);
  const signedXdr = await freighter.signTransaction(preparedTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await server.sendTransaction(signedTx);

  if (result.status === 'ERROR') {
    throw new Error(`Transaction failed: ${JSON.stringify(result)}`);
  }

  return result.hash;
}

export async function createBoutWithFreighter(betAmountXlm: number): Promise<any> {
  return signAndSubmitWithFreighter(
    'create_bout',
    [toAddress(await (await import('@stellar/freighter-api')).getAddress()), toI128(betAmountXlm)]
  );
}

export async function acceptBoutWithFreighter(boutId: number): Promise<any> {
  return signAndSubmitWithFreighter(
    'accept_bout',
    [toAddress(await (await import('@stellar/freighter-api')).getAddress()), toU64(boutId)]
  );
}

export async function submitScoreWithFreighter(boutId: number, score: number): Promise<any> {
  return signAndSubmitWithFreighter(
    'submit_score',
    [toAddress(await (await import('@stellar/freighter-api')).getAddress()), toU64(boutId), toU64(score)]
  );
}
