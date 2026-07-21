#!/bin/bash
set -e

WASM_PATH="target/wasm32v1-none/release/chronicle_game_state.wasm"

echo "Building WASM for Testnet..."
cargo build --target wasm32v1-none --release

echo "Deploying to Testnet..."
stellar contract deploy \
  --wasm "$WASM_PATH" \
  --network testnet \
  --source admin

echo "Deployed. Copy the contract ID above into web/.env.testnet as VITE_SOROBAN_CONTRACT_ID"
