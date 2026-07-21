# Chronicles of Stellar

An 8-bit retro beat-'em-up running on the Stellar blockchain with on-chain PvP escrow, AI bot betting, and character selection.

## What It Is

A Phaser CE arcade game (forked from kenamick/game-off-2017) with a Soroban smart contract layer for real XLM stakes. Players fight through 3 acts of retro street-brawl gameplay, bet XLM on PvP matches or against AI bots, and earn on-chain reputation.

## Features

### In-Game (Phaser CE)
- **5 playable characters** with unique stats (HP, damage, speed, weight): Brian (balanced), Gloria (glass cannon), Rebel (speedster), Brawler (tank), Elite (heavy hitter)
- **3 acts** — The Streets, The Network, The Core — with boss fights and cutscenes
- **Combo system** — chain kills for bonus score (+50 per combo level, resets on hit)
- **HUD** — score/kills display, character name, boss health bar, level transitions
- **PvP Arena** — challenge another player to a real-time 1v1 bout
- **VS Bot** — fight an AI opponent with XLM wagered on your performance
- **Controls + Audio menus** from the original game

### Blockchain (Soroban on Stellar)
- **Player state** — reputation, level, keycard/firewall access, wins, losses, earnings stored on-chain
- **PvP escrow** — `create_bout` → `accept_bout` → `submit_score` → auto-settle with 10% house commission
- **Bot betting** — `create_bot_bout` → `resolve_bot_bout` with tiered payouts (3x for high score + fast time, 2x for medium, 1x for base)
- **Treasury** — house pool funds bot payouts and holds PvP commissions
- **Admin controls** — set reputation, advance levels, reset players (all require admin auth)

### Wallet
- Freighter browser extension integration for signing
- Balance checking via Horizon
- Network-aware (mainnet/testnet via env vars)

## Tech Stack

| Layer | Tech |
|-------|------|
| Game engine | Phaser CE 2.13.0 (loaded via script tag) |
| Frontend | React 19, Vite, TypeScript |
| Smart contract | Rust, soroban-sdk 27.0.1 |
| Blockchain | Stellar mainnet, Soroban RPC |
| Auth | Firebase (Google sign-in) |
| Wallet | @stellar/freighter-api, @stellar/stellar-sdk |

## Project Structure

```
├── contracts/chronicle-game-state/    # Soroban smart contract
│   └── src/
│       ├── lib.rs                     # Contract: player state, PvP escrow, bot betting, treasury
│       └── test.rs                    # 35 unit tests
├── web/                               # Vite + React frontend
│   ├── src/
│   │   ├── game/                      # Phaser game (all states, entities, UI)
│   │   │   ├── states/                # main-menu, charselect, pvparena, gameplay, loading
│   │   │   ├── entities/              # hero, enemies, NPCs
│   │   │   └── ui/                    # HUD, menus
│   │   ├── blockchain/                # Stellar SDK, Freighter, PvP escrow client
│   │   ├── components/                # React overlay (header, auth modal)
│   │   ├── events/                    # EventHub for game ↔ UI communication
│   │   └── hooks/                     # useGameState, useFirebaseAuth
│   └── public/
│       └── phaser.js                  # Phaser CE bundle
└── README.md
```

## Setup

### Prerequisites
```bash
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli
node -v  # >= v20
```

### Contract
```bash
cd contracts/chronicle-game-state
cargo build --target wasm32-unknown-unknown --release
cargo test --target aarch64-apple-darwin  # or x86_64-apple-darwin
```

### Frontend
```bash
cd web
npm install
npm run dev
# Opens at http://localhost:5173
```

### Deploy Contract
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/chronicle_game_state.wasm \
  --network mainnet \
  --source admin

# Then set contract ID in web/.env.mainnet:
# VITE_SOROBAN_CONTRACT_ID=<deployed-contract-id>
```

## Smart Contract API

| Method | Auth | Description |
|--------|------|-------------|
| `initialize(admin)` | — | Set admin, init game state |
| `init_player(player)` | player | Create player with 25 rep, level 1 |
| `approve_action(player, action)` | player | unlock_keycard, open_firewall, add/remove_reputation |
| `set_reputation(admin, player, score)` | admin | Override player reputation |
| `advance_level(admin, player)` | admin | Level up (max 7) |
| `reset_player(admin, player)` | admin | Reset player to defaults |
| `set_treasury(admin, amount)` | admin | Set house treasury |
| `get_treasury()` | — | Read treasury balance |
| `create_bout(challenger, bet)` | challenger | Open PvP challenge |
| `accept_bout(opponent, bout_id)` | opponent | Accept challenge |
| `submit_score(player, bout_id, score)` | player | Submit score, auto-resolve when both submitted |
| `get_bout(bout_id)` | — | Read bout details |
| `get_open_bouts()` | — | List up to 20 open challenges |
| `create_bot_bout(player, bet, time_limit)` | player | Start bot fight with XLM wager |
| `resolve_bot_bout(bout_id, score, time)` | — | Resolve bot fight, tiered payout |

## License

MIT — based on kenamick/game-off-2017
