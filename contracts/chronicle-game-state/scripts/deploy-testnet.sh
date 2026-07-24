#!/bin/bash
set -e

WASM_PATH="target/wasm32v1-none/release/chronicle_game_state.wasm"

echo "Building WASM for Testnet..."
cargo build --target wasm32v1-none --release

echo "Deploying to Testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --network testnet \
  --source admin)

echo "Deployed contract: $CONTRACT_ID"

echo "Initializing contract..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network testnet \
  --source admin \
  -- initialize \
  --admin "$ADMIN_PUBLIC_KEY"

echo "Contract initialized."
echo "Copy this contract ID into web/.env.testnet as VITE_SOROBAN_CONTRACT_ID:"
echo "  $CONTRACT_ID"
