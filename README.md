# Chronichles of Stellar

# AetherEcho: The Agentic RPG Economy
Soroban Stable

Stellar Network

Framework
AetherEcho is an immersive, high-fidelity Web3 RPG driven by an autonomous, self-sustaining **Agentic Economy**. Powered by Stellar’s **Soroban Smart Contracts**, every non-player character (NPC) operates as an independent, on-chain financial entity capable of generating real-world economic value, routing global transactions, and eliminating traditional play-to-earn hyperinflation.
## 🏗️ System Architecture
AetherEcho splits its game loop into a decoupled, hybrid architecture to guarantee low-latency gameplay while maintaining complete decentralized asset security.
```
┌────────────────────────────────────────────────────────────────────────┐
│                              GAMING UI                                 │
│                   Next.js / Vite / Tailwind UI Layer                   │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
     [Dialogue / Context]                   [On-Chain Settlement]
                    ▼                                ▼
┌───────────────────────────────────────┐ ┌──────────────────────────────┐
│          OFF-CHAIN "BRAIN"            │ │      ON-CHAIN "BODY"         │
│  Orchestration Agent (LLM Engine)    │ │   Soroban Smart Contracts    │
├───────────────────────────────────────┤ ├──────────────────────────────┤
│ • Generates real-time lore & text     │ │ • Verifies user identity     │
│ • Maintains spatial NPC context       │ │ • Manages NPC Vault balances │
│ • Validates actions against engine    │ │ • Resolves trustless payments│
└───────────────────────────────────────┘ └──────────────────────────────┘

```
### 1. The Off-Chain "Brain" (AI LLM Engine)
Handles narrative, conversational dynamics, and world immersion. It intercepts player inputs, parses intent, and handles dialog synthesis without bogging down the blockchain.
### 2. The On-Chain "Body" (Soroban Contracts)
Enforces economic reality. No action inside the game state can alter finances, trade goods, or reward a player unless authorized and verified by a **Soroban Smart Contract**.
## 🤖 Blockchain AI NPC Logic
Instead of global administrative wallets, each NPC (e.g., Bartenders, Blacksmiths, Merchants) possesses a **Smart Contract Vault**.
### Interaction Matrix
When a player interacts with an NPC, the underlying economic data flows transparently according to this logic loop:
```
[Player] ─── (Prompts NPC for Quest Data) ───► [AI LLM Brain]
                                                    │
   ▲                                       (Evaluates Cost & Logic)
   │                                                │
(Unlocks Secret)                                    ▼
   │                                       [Soroban Smart Contract]
   │                                                │
   └──────── (Triggers Event/Disburses) ◄───────────┘

```
| Element | Description | Implementation Details |
|---|---|---|
| **NPC Smart Wallet** | On-chain asset collection | Every major NPC manages a unique Soroban contract address that tracks its current inventory and treasury balances (USDC/Native assets). |
| **Information Gating** | Trustless info exchange | The user deposits a specified sub-cent value. The transaction triggers a Soroban event log containing an encrypted signature, which the LLM brain reads to unlock advanced dialogue. |
| **Coordinator Orchestrator** | Economic balancing agent | A central on-chain factory contract monitors systemic inflation across individual NPC vaults, adjusting baseline trade pricing algorithmically. |
## 🎮 Gaming UI & Web2-to-Web3 Onboarding
AetherEcho solves the friction blocking mainstream Web3 gaming adoption by wrapping enterprise-grade abstract wallet infrastructure into a familiar Web2 experience.
### Technical UI Stack
 * **Frontend Ecosystem:** Next.js, React, Tailwind CSS, Shadcn/ui.
 * **State Management:** Zustand with custom optimistic UI state synchronization hooks.
 * **Web3 Connectivity:** Integrated via Stellar SDK and Stellar-Photos hooks.
### The Frictionless UX Flow
```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│   Social Sign-In/Up    │ ───► │ SEP-30 Abstract Wallet │ ───► │  Immediate Gameplay    │
│ (Google, Apple, OAuth) │      │  (Hidden Private Keys) │      │  (Balance seen in USD) │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘

```
 1. **Seamless Registration:** Users authenticate using Google, Apple, or email.
 2. **Invisible Key Management:** A **SEP-30 compliant key recovery implementation** provisions an invisible Stellar account. Private keys are securely managed off-screen; users don't encounter seed phrases during initial setups.
 3. **FIAT Representation:** The interface completely abstracts token shorthand. Players operate with global values denominated as USD, backed directly by **Circle USDC** behind the scenes.
## 📊 Product Framework (D-P-C-E-S)
AetherEcho is engineered rigorously around five defining product rules to maximize market defensibility.
```
     ┌─── [D] DISTRIBUTION ─── Integrate natively into existing cross-platform formats.
     ├─── [P] PROBLEM SOLVING ─ Replaces broken "play-to-earn" metrics with AI utility.
A─── ├─── [C] CUSTOMER 1ST ─── Immersive, traditional lore with hidden Web3 infrastructure.
     ├─── [E] EASY TO USE ──── Social logins (SEP-30) instead of complex installations.
     └─── [S] SEAMLESS ─────── Immediate cash-outs via global Anchor Networks (MoneyGram).

```
### Framework Matrix
| Pillar | Focus | Implementation Strategy |
|---|---|---|
| **D** | **Distribution** | Multi-platform support across web viewports and chat frameworks (Telegram widgets) to bypass rigid mobile app store restrictions. |
| **P** | **Problem Solving** | Eradicates isolated inflationary game economies. In-game resources have functional liquidity directly convertible to cash on Stellar’s built-in DEX. |
| **C** | **Customer First** | Lore, gameplay loop, and player progression take priority. The blockchain works behind the curtain to ensure a pure gaming experience first. |
| **E** | **Easy to Use** | Implements non-custodial login mechanics. Advanced crypto interactions (exporting keys) are only visible when requested by power users. |
| **S** | **Seamless Traction** | Built-in connectivity to **Stellar Anchors**. Value earned can instantly settle back into domestic digital currency formats globally. |
## 🚀 Technical Repository Map
```bash
├── contracts/                   # Soroban Rust Contracts
│   ├── npc_vault/               # Individual NPC balance and logic instances
│   ├── orchestrator/            # Central macroeconomic system supervisor
│   └── tests/                   # Contract unit testing environments
├── backend/                     # Off-chain Core AI Architecture
│   ├── agents/                  # LLM context handlers and character datasets
│   └── pipeline/                # Transaction indexers & monitoring layers
└── frontend/                    # High-fidelity Gaming UI Layer
    ├── components/              # Interactive Game UI (Chat components, Inventory grids)
    ├── hooks/                   # Stellar/Soroban event listeners
    └── pages/                   # User interface routing logic

```
## 🛠️ Step-by-Step Prototype Deployment
### 1. Prerequisites
Ensure your terminal environment includes the following toolchains installed:
```bash
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli
node -v # Assumes Node.js >= v20

```
### 2. Contract Build & Testing
```bash
cd contracts/
# Compile Rust code to WASM targets
cargo build --target wasm32-unknown-unknown --release
# Run the internal mock scenario test suite
cargo test --all

```
### 3. Running the Interface Localhost
```bash
cd ../frontend/
npm install
npm run dev
# Project dashboard launches at http://localhost:3000

```
