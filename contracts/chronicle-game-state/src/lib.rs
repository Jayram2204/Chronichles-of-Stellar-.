#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Env, String,
};

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
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PlayerState {
    pub address: Address,
    pub reputation: u32,
    pub level: u32,
    pub has_keycard: bool,
    pub has_firewall_pass: bool,
    pub total_transactions: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GameState {
    pub total_players: u32,
    pub total_transactions: u64,
    pub contract_version: u32,
}

#[contracttype]
pub enum DataKey {
    Player(Address),
    Admin,
    GameState,
}

#[contract]
pub struct ChronicleGameState;

#[contractimpl]
impl ChronicleGameState {
    pub fn initialize(env: Env, admin: Address) -> Result<(), GameError> {
        let state_key = DataKey::GameState;
        if env.storage().instance().has(&state_key) {
            return Err(GameError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        let game_state = GameState {
            total_players: 0,
            total_transactions: 0,
            contract_version: 1,
        };
        env.storage().instance().set(&state_key, &game_state);
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
                contract_version: 1,
            })
    }

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
        action: String,
    ) -> Result<PlayerState, GameError> {
        player.require_auth();
        let key = DataKey::Player(player.clone());
        let mut state: PlayerState = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(GameError::PlayerNotInitialized)?;

        if action == String::from_str(&env, "unlock_keycard") {
            if state.has_keycard {
                return Err(GameError::ItemAlreadyOwned);
            }
            state.has_keycard = true;
            state.reputation = state.reputation.saturating_add(15).min(100);
        } else if action == String::from_str(&env, "open_firewall") {
            if !state.has_keycard {
                return Err(GameError::InsufficientReputation);
            }
            state.has_firewall_pass = true;
            state.has_keycard = false;
            state.reputation = state.reputation.saturating_add(25).min(100);
            state.level = state.level.saturating_add(1).min(7);
        } else if action == String::from_str(&env, "add_reputation") {
            state.reputation = state.reputation.saturating_add(10).min(100);
        } else if action == String::from_str(&env, "remove_reputation") {
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

    pub fn set_reputation(
        env: Env,
        admin: Address,
        player: Address,
        score: u32,
    ) -> Result<PlayerState, GameError> {
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

    pub fn advance_level(
        env: Env,
        admin: Address,
        player: Address,
    ) -> Result<PlayerState, GameError> {
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
        };
        env.storage().persistent().set(&key, &state);
        Ok(state)
    }
}
