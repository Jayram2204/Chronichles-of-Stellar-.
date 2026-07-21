#!/bin/bash
set -e

WASM_PATH="target/wasm32v1-none/release/chronicle_game_state.wasm"

echo "Building WASM for Mainnet..."
cargo build --target wasm32v1-none --release

echo "Deploying to Mainnet..."
stellar contract deploy \
  --wasm "$WASM_PATH" \
  --network mainnet \
  --source admin

echo "Deployed. Copy the contract ID above into web/.env.mainnet as VITE_SOROBAN_CONTRACT_ID"
