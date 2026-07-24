#!/bin/bash
set -e

WASM_PATH="target/wasm32v1-none/release/chronicle_game_state.wasm"

echo "Building WASM for Mainnet..."
cargo build --target wasm32v1-none --release

echo "Deploying to Mainnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --network mainnet \
  --source admin)

echo "Deployed contract: $CONTRACT_ID"

echo "Initializing contract..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network mainnet \
  --source admin \
  -- initialize \
  --admin GB36H54JHRVT5Q7SJM46KXIJB5J5VPYR7QNJQR4VZCYUCZGLTZ26KD7N

echo "Contract initialized."
echo "Copy this contract ID into web/.env.mainnet as VITE_SOROBAN_CONTRACT_ID:"
echo "  $CONTRACT_ID"
