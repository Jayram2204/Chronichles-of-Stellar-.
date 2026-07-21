#!/bin/bash
# Usage: ./invoke.sh <network> <function> [args...]
# Example: ./invoke.sh testnet get_game_state

NETWORK=${1:-testnet}
FUNCTION=$2
shift 2

if [ -z "$CONTRACT_ID" ]; then
  echo "Error: CONTRACT_ID environment variable is not set."
  exit 1
fi

stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network "$NETWORK" \
  -- "$FUNCTION" "$@"
