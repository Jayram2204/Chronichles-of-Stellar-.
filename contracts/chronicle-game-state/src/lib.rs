#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Env, Symbol, Vec,
};

// ── Errors ──────────────────────────────────────────────────────────────────
#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum GameError {
    Unauthorized = 1,
    PlayerNotInitialized = 2,
    AlreadyInitialized = 3,
    InsufficientReputation = 4,
    InvalidAction = 5,
    LevelLocked = 6,
    ItemAlreadyOwned = 7,
    InventoryFull = 8,
    InvalidLevel = 9,
    BoutNotFound = 10,
    BoutNotOpen = 11,
    CannotFightSelf = 12,
    AlreadyAccepted = 13,
    InvalidScore = 14,
    BoutAlreadyResolved = 15,
    TreasuryNotSet = 16,
    InsufficientTreasury = 17,
    BetTooLow = 18,
    BetTooHigh = 19,
    TimeLimitExceeded = 20,
    InvalidCompletionTime = 21,
}

// ── Types ───────────────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PlayerState {
    pub address: Address,
    pub reputation: u32,
    pub level: u32,
    pub has_keycard: bool,
    pub has_firewall_pass: bool,
    pub total_transactions: u32,
    pub wins: u32,
    pub losses: u32,
    pub total_earnings: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GameState {
    pub total_players: u32,
    pub total_transactions: u64,
    pub contract_version: u32,
    pub total_bouts: u32,
    pub treasury: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Bout {
    pub id: u32,
    pub challenger: Address,
    pub opponent: Option<Address>,
    pub bet_amount: u64,
    pub status: BoutStatus,
    pub challenger_score: u32,
    pub opponent_score: u32,
    pub winner: Option<Address>,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BoutStatus {
    Open,
    Accepted,
    InProgress,
    Resolved,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BotBout {
    pub id: u32,
    pub player: Address,
    pub bet_amount: u64,
    pub time_limit: u64,
    pub status: BotBoutStatus,
    pub player_score: u32,
    pub completion_time: u64,
    pub payout: u64,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BotBoutStatus {
    Active,
    Completed,
    Expired,
}

#[contracttype]
pub enum DataKey {
    Player(Address),
    Admin,
    GameState,
    Bout(u32),
    BotBout(u32),
}

// ── Contract ────────────────────────────────────────────────────────────────
#[contract]
pub struct ChronicleGameState;

#[contractimpl]
impl ChronicleGameState {
    // ── Admin / Init ────────────────────────────────────────────────────────
    pub fn initialize(env: Env, admin: Address) -> Result<(), GameError> {
        if env.storage().instance().has(&DataKey::GameState) {
            return Err(GameError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        let game_state = GameState {
            total_players: 0,
            total_transactions: 0,
            contract_version: 2,
            total_bouts: 0,
            treasury: 0,
        };
        env.storage()
            .instance()
            .set(&DataKey::GameState, &game_state);
        Ok(())
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized")
    }

    pub fn get_game_state(env: Env) -> GameState {
        env.storage()
            .instance()
            .get(&DataKey::GameState)
            .unwrap_or(GameState {
                total_players: 0,
                total_transactions: 0,
                contract_version: 2,
                total_bouts: 0,
                treasury: 0,
            })
    }

    // ── Player Management ───────────────────────────────────────────────────
    pub fn init_player(env: Env, player: Address) -> Result<PlayerState, GameError> {
        player.require_auth();
        let key = DataKey::Player(player.clone());
        if env.storage().persistent().has(&key) {
            return Err(GameError::AlreadyInitialized);
        }
        let state = PlayerState {
            address: player,
            reputation: 25,
            level: 1,
            has_keycard: false,
            has_firewall_pass: false,
            total_transactions: 0,
            wins: 0,
            losses: 0,
            total_earnings: 0,
        };
        env.storage().persistent().set(&key, &state);
        let mut gs: GameState = env
            .storage()
            .instance()
            .get(&DataKey::GameState)
            .unwrap();
        gs.total_players += 1;
        env.storage().instance().set(&DataKey::GameState, &gs);
        Ok(state)
    }

    pub fn get_player(env: Env, player: Address) -> Result<PlayerState, GameError> {
        let key = DataKey::Player(player);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(GameError::PlayerNotInitialized)
    }

    pub fn approve_action(
        env: Env,
        player: Address,
        action: Symbol,
    ) -> Result<PlayerState, GameError> {
        player.require_auth();
        let key = DataKey::Player(player.clone());
        let mut state: PlayerState = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(GameError::PlayerNotInitialized)?;

        if action == Symbol::new(&env, "unlock_keycard") {
            if state.has_keycard {
                return Err(GameError::ItemAlreadyOwned);
            }
            state.has_keycard = true;
            state.reputation = state.reputation.saturating_add(15).min(100);
        } else if action == Symbol::new(&env, "open_firewall") {
            if !state.has_keycard {
                return Err(GameError::InsufficientReputation);
            }
            state.has_firewall_pass = true;
            state.has_keycard = false;
            state.reputation = state.reputation.saturating_add(25).min(100);
            state.level = state.level.saturating_add(1).min(7);
        } else if action == Symbol::new(&env, "add_reputation") {
            state.reputation = state.reputation.saturating_add(10).min(100);
        } else if action == Symbol::new(&env, "remove_reputation") {
            state.reputation = state.reputation.saturating_sub(5);
        } else {
            return Err(GameError::InvalidAction);
        }

        state.total_transactions += 1;
        let mut gs: GameState = env
            .storage()
            .instance()
            .get(&DataKey::GameState)
            .unwrap();
        gs.total_transactions += 1;
        env.storage().instance().set(&DataKey::GameState, &gs);
        env.storage().persistent().set(&key, &state);
        Ok(state)
    }

    pub fn can_access_level(
        env: Env,
        player: Address,
        required_level: u32,
    ) -> Result<bool, GameError> {
        let key = DataKey::Player(player);
        let state: PlayerState = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(GameError::PlayerNotInitialized)?;
        Ok(state.level >= required_level)
    }

    // ── Admin Player Controls (require admin auth) ──────────────────────────
    pub fn set_reputation(
        env: Env,
        admin: Address,
        player: Address,
        score: u32,
    ) -> Result<PlayerState, GameError> {
        admin.require_auth();
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized");
        if admin != stored_admin {
            return Err(GameError::Unauthorized);
        }
        let key = DataKey::Player(player.clone());
        let mut state: PlayerState = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(GameError::PlayerNotInitialized)?;
        state.reputation = score.min(100);
        env.storage().persistent().set(&key, &state);
        Ok(state)
    }

    pub fn advance_level(
        env: Env,
        admin: Address,
        player: Address,
    ) -> Result<PlayerState, GameError> {
        admin.require_auth();
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized");
        if admin != stored_admin {
            return Err(GameError::Unauthorized);
        }
        let key = DataKey::Player(player.clone());
        let mut state: PlayerState = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(GameError::PlayerNotInitialized)?;
        if state.level >= 7 {
            return Err(GameError::InvalidLevel);
        }
        state.level += 1;
        env.storage().persistent().set(&key, &state);
        Ok(state)
    }

    pub fn reset_player(
        env: Env,
        admin: Address,
        player: Address,
    ) -> Result<PlayerState, GameError> {
        admin.require_auth();
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized");
        if admin != stored_admin {
            return Err(GameError::Unauthorized);
        }
        let key = DataKey::Player(player.clone());
        let state = PlayerState {
            address: player,
            reputation: 25,
            level: 1,
            has_keycard: false,
            has_firewall_pass: false,
            total_transactions: 0,
            wins: 0,
            losses: 0,
            total_earnings: 0,
        };
        env.storage().persistent().set(&key, &state);
        Ok(state)
    }

    // ── Treasury ────────────────────────────────────────────────────────────
    pub fn set_treasury(env: Env, admin: Address, amount: u64) -> Result<GameState, GameError> {
        admin.require_auth();
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized");
        if admin != stored_admin {
            return Err(GameError::Unauthorized);
        }
        let mut gs: GameState = env
            .storage()
            .instance()
            .get(&DataKey::GameState)
            .unwrap();
        gs.treasury = amount;
        env.storage().instance().set(&DataKey::GameState, &gs);
        Ok(gs)
    }

    pub fn get_treasury(env: Env) -> u64 {
        let gs: GameState = env
            .storage()
            .instance()
            .get(&DataKey::GameState)
            .unwrap_or(GameState {
                total_players: 0,
                total_transactions: 0,
                contract_version: 2,
                total_bouts: 0,
                treasury: 0,
            });
        gs.treasury
    }

    // ── PvP Player-vs-Player Escrow ─────────────────────────────────────────
    pub fn create_bout(
        env: Env,
        challenger: Address,
        bet_amount: u64,
    ) -> Result<Bout, GameError> {
        challenger.require_auth();
        let gs: GameState = env
            .storage()
            .instance()
            .get(&DataKey::GameState)
            .unwrap();
        if bet_amount == 0 {
            return Err(GameError::BetTooLow);
        }
        if bet_amount > 10_000_000_000 {
            return Err(GameError::BetTooHigh);
        }
        let bout_id = gs.total_bouts;
        let now = env.ledger().timestamp();
        let bout = Bout {
            id: bout_id,
            challenger: challenger,
            opponent: Option::None,
            bet_amount,
            status: BoutStatus::Open,
            challenger_score: 0,
            opponent_score: 0,
            winner: Option::None,
            created_at: now,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Bout(bout_id), &bout);
        let mut gs = gs;
        gs.total_bouts += 1;
        env.storage().instance().set(&DataKey::GameState, &gs);
        Ok(bout)
    }

    pub fn accept_bout(
        env: Env,
        opponent: Address,
        bout_id: u32,
    ) -> Result<Bout, GameError> {
        opponent.require_auth();
        let key = DataKey::Bout(bout_id);
        let mut bout: Bout = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(GameError::BoutNotFound)?;
        if bout.status != BoutStatus::Open {
            return Err(GameError::BoutNotOpen);
        }
        if bout.challenger == opponent {
            return Err(GameError::CannotFightSelf);
        }
        bout.opponent = Option::Some(opponent);
        bout.status = BoutStatus::Accepted;
        env.storage().persistent().set(&key, &bout);
        Ok(bout)
    }

    pub fn submit_score(
        env: Env,
        player: Address,
        bout_id: u32,
        score: u32,
    ) -> Result<Bout, GameError> {
        player.require_auth();
        let key = DataKey::Bout(bout_id);
        let mut bout: Bout = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(GameError::BoutNotFound)?;
        if bout.status != BoutStatus::Accepted && bout.status != BoutStatus::InProgress {
            return Err(GameError::BoutNotOpen);
        }
        if score == 0 {
            return Err(GameError::InvalidScore);
        }
        if player == bout.challenger {
            bout.challenger_score = score;
        } else if let Some(ref opp) = bout.opponent {
            if player == *opp {
                bout.opponent_score = score;
            } else {
                return Err(GameError::Unauthorized);
            }
        } else {
            return Err(GameError::Unauthorized);
        }
        if bout.status == BoutStatus::Accepted {
            bout.status = BoutStatus::InProgress;
        }
        if bout.challenger_score > 0 && bout.opponent_score > 0 {
            if bout.challenger_score > bout.opponent_score {
                bout.winner = Some(bout.challenger.clone());
                Self::settle_pvp_win(&env, &bout, &bout.challenger);
            } else if bout.opponent_score > bout.challenger_score {
                if let Some(ref opp) = bout.opponent {
                    bout.winner = Some(opp.clone());
                    Self::settle_pvp_win(&env, &bout, opp);
                }
            }
            bout.status = BoutStatus::Resolved;
        }
        env.storage().persistent().set(&key, &bout);
        Ok(bout)
    }

    pub fn get_bout(env: Env, bout_id: u32) -> Result<Bout, GameError> {
        let key = DataKey::Bout(bout_id);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(GameError::BoutNotFound)
    }

    pub fn get_open_bouts(env: Env) -> Vec<Bout> {
        let gs: GameState = env
            .storage()
            .instance()
            .get(&DataKey::GameState)
            .unwrap_or(GameState {
                total_players: 0,
                total_transactions: 0,
                contract_version: 2,
                total_bouts: 0,
                treasury: 0,
            });
        let mut open_bouts = Vec::new(&env);
        let mut i = gs.total_bouts;
        while i > 0 {
            i -= 1;
            let key = DataKey::Bout(i);
            let bout: Bout = env.storage().persistent().get(&key).unwrap();
            if bout.status == BoutStatus::Open {
                open_bouts.push_back(bout);
            }
            if open_bouts.len() >= 20 {
                break;
            }
        }
        open_bouts
    }

    // ── Bot Betting ─────────────────────────────────────────────────────────
    pub fn create_bot_bout(
        env: Env,
        player: Address,
        bet_amount: u64,
        time_limit: u64,
    ) -> Result<BotBout, GameError> {
        player.require_auth();
        let gs: GameState = env
            .storage()
            .instance()
            .get(&DataKey::GameState)
            .unwrap();
        if gs.treasury == 0 {
            return Err(GameError::TreasuryNotSet);
        }
        if bet_amount == 0 {
            return Err(GameError::BetTooLow);
        }
        if bet_amount > 200_000_000 {
            return Err(GameError::BetTooHigh);
        }
        if time_limit == 0 || time_limit > 600 {
            return Err(GameError::InvalidCompletionTime);
        }
        let bout_id = gs.total_bouts;
        let now = env.ledger().timestamp();
        let bot_bout = BotBout {
            id: bout_id,
            player: player,
            bet_amount,
            time_limit,
            status: BotBoutStatus::Active,
            player_score: 0,
            completion_time: 0,
            payout: 0,
            created_at: now,
        };
        env.storage()
            .persistent()
            .set(&DataKey::BotBout(bout_id), &bot_bout);
        let mut gs = gs;
        gs.total_bouts += 1;
        env.storage().instance().set(&DataKey::GameState, &gs);
        Ok(bot_bout)
    }

    pub fn resolve_bot_bout(
        env: Env,
        player: Address,
        bout_id: u32,
        player_score: u32,
        completion_time: u64,
    ) -> Result<BotBout, GameError> {
        player.require_auth();
        let key = DataKey::BotBout(bout_id);
        let mut bout: BotBout = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(GameError::BoutNotFound)?;
        if bout.player != player {
            return Err(GameError::Unauthorized);
        }
        if bout.status != BotBoutStatus::Active {
            return Err(GameError::BoutAlreadyResolved);
        }
        let now = env.ledger().timestamp();
        let elapsed = now.saturating_sub(bout.created_at);
        if elapsed > bout.time_limit {
            bout.status = BotBoutStatus::Expired;
            env.storage().persistent().set(&key, &bout);
            return Ok(bout);
        }
        if completion_time > bout.time_limit {
            return Err(GameError::InvalidCompletionTime);
        }
        if player_score == 0 {
            return Err(GameError::InvalidScore);
        }
        bout.player_score = player_score;
        bout.completion_time = completion_time;
        let mut payout: u64 = 0;
        if player_score >= 1000 && completion_time <= bout.time_limit / 2 {
            payout = bout.bet_amount.saturating_mul(3);
        } else if player_score >= 500 {
            payout = bout.bet_amount.saturating_mul(2);
        } else if player_score >= 200 {
            payout = bout.bet_amount;
        }
            if payout > 0 {
                let mut gs: GameState = env
                    .storage()
                    .instance()
                    .get(&DataKey::GameState)
                    .unwrap();
                if payout <= gs.treasury {
                    gs.treasury = gs.treasury.saturating_sub(payout);
                    env.storage().instance().set(&DataKey::GameState, &gs);
                    bout.payout = payout;
                    let player_key = DataKey::Player(bout.player.clone());
                    if let Some(mut ps) = env
                        .storage()
                        .persistent()
                        .get::<DataKey, PlayerState>(&player_key)
                    {
                        ps.total_earnings = ps.total_earnings.saturating_add(payout);
                        ps.wins = ps.wins.saturating_add(1);
                        ps.total_transactions += 1;
                        env.storage().persistent().set(&player_key, &ps);
                    }
                }
            }
        bout.status = BotBoutStatus::Completed;
        env.storage().persistent().set(&key, &bout);
        Ok(bout)
    }

    pub fn get_bot_bout(env: Env, bout_id: u32) -> Result<BotBout, GameError> {
        let key = DataKey::BotBout(bout_id);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(GameError::BoutNotFound)
    }

    // ── Internal helpers ────────────────────────────────────────────────────
    fn settle_pvp_win(env: &Env, bout: &Bout, winner: &Address) {
        let mut gs: GameState = env
            .storage()
            .instance()
            .get(&DataKey::GameState)
            .unwrap();
        let commission = bout.bet_amount.saturating_mul(10) / 100;
        let prize = bout.bet_amount.saturating_sub(commission);
        gs.treasury = gs.treasury.saturating_add(commission);
        env.storage().instance().set(&DataKey::GameState, &gs);
        let winner_key = DataKey::Player(winner.clone());
        if let Some(mut ps) = env
            .storage()
            .persistent()
            .get::<DataKey, PlayerState>(&winner_key)
        {
            ps.wins = ps.wins.saturating_add(1);
            ps.total_earnings = ps.total_earnings.saturating_add(prize);
            ps.reputation = ps.reputation.saturating_add(5).min(100);
            ps.total_transactions += 1;
            env.storage().persistent().set(&winner_key, &ps);
        }
        if let Some(ref opp) = bout.opponent {
            let loser = if *winner == bout.challenger {
                opp.clone()
            } else {
                bout.challenger.clone()
            };
            let loser_key = DataKey::Player(loser);
            if let Some(mut ps) = env
                .storage()
                .persistent()
                .get::<DataKey, PlayerState>(&loser_key)
            {
                ps.losses = ps.losses.saturating_add(1);
                ps.reputation = ps.reputation.saturating_sub(3);
                ps.total_transactions += 1;
                env.storage().persistent().set(&loser_key, &ps);
            }
        }
    }
}

mod test;
