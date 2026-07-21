#!/bin/bash
set -e

echo "=== Building Smart Contract ==="
cd contracts/chronicle-game-state
cargo build --target wasm32v1-none --release
cd ../..

echo "=== Installing Frontend Dependencies ==="
cd web
npm install
cd ..

echo "=== Setup Complete ==="
echo "Run 'npm run dev' to start the development server."
