#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, Symbol};

fn setup() -> (Env, Address, ChronicleGameStateClient<'static>) {
    let env = Env::default();
    let contract_id = env.register_contract(None, ChronicleGameState);
    let client = ChronicleGameStateClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    env.mock_all_auths();
    client.initialize(&admin);
    (env, admin, client)
}

fn setup_with_player() -> (Env, Address, Address, ChronicleGameStateClient<'static>) {
    let (env, admin, client) = setup();
    let player = Address::generate(&env);
    env.mock_all_auths();
    client.init_player(&player);
    (env, admin, player, client)
}

// ── Init ────────────────────────────────────────────────────────────────────
#[test]
fn test_initialize() {
    let (_env, admin, client) = setup();
    let gs = client.get_game_state();
    assert_eq!(gs.total_players, 0);
    assert_eq!(gs.total_bouts, 0);
    assert_eq!(gs.treasury, 0);
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn test_double_init_fails() {
    let (_env, admin, client) = setup();
    let result = client.try_initialize(&admin);
    assert_eq!(result, Err(Ok(GameError::AlreadyInitialized)));
}

// ── Player ──────────────────────────────────────────────────────────────────
#[test]
fn test_init_player() {
    let (_env, _admin, player, client) = setup_with_player();
    let ps = client.get_player(&player);
    assert_eq!(ps.reputation, 25);
    assert_eq!(ps.level, 1);
    assert_eq!(ps.wins, 0);
    assert_eq!(ps.losses, 0);
    assert_eq!(client.get_game_state().total_players, 1);
}

#[test]
fn test_double_init_player_fails() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let result = client.try_init_player(&player);
    assert_eq!(result, Err(Ok(GameError::AlreadyInitialized)));
}

#[test]
fn test_get_player_not_found() {
    let (env, _admin, client) = setup();
    let unknown = Address::generate(&env);
    let result = client.try_get_player(&unknown);
    assert_eq!(result, Err(Ok(GameError::PlayerNotInitialized)));
}

// ── Actions ─────────────────────────────────────────────────────────────────
#[test]
fn test_unlock_keycard() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let ps = client.approve_action(&player, &Symbol::new(&env, "unlock_keycard"));
    assert_eq!(ps.has_keycard, true);
    assert_eq!(ps.reputation, 40);
}

#[test]
fn test_double_unlock_keycard_fails() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    client.approve_action(&player, &Symbol::new(&env, "unlock_keycard"));
    let result = client.try_approve_action(&player, &Symbol::new(&env, "unlock_keycard"));
    assert_eq!(result, Err(Ok(GameError::ItemAlreadyOwned)));
}

#[test]
fn test_open_firewall_without_keycard_fails() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let result = client.try_approve_action(&player, &Symbol::new(&env, "open_firewall"));
    assert_eq!(result, Err(Ok(GameError::InsufficientReputation)));
}

#[test]
fn test_open_firewall_with_keycard() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    client.approve_action(&player, &Symbol::new(&env, "unlock_keycard"));
    let ps = client.approve_action(&player, &Symbol::new(&env, "open_firewall"));
    assert_eq!(ps.has_firewall_pass, true);
    assert_eq!(ps.has_keycard, false);
    assert_eq!(ps.level, 2);
    assert_eq!(ps.reputation, 65);
}

#[test]
fn test_invalid_action() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let result = client.try_approve_action(&player, &Symbol::new(&env, "invalid"));
    assert_eq!(result, Err(Ok(GameError::InvalidAction)));
}

// ── Level Access ────────────────────────────────────────────────────────────
#[test]
fn test_can_access_level() {
    let (_env, _admin, player, client) = setup_with_player();
    assert_eq!(client.can_access_level(&player, &1), true);
    assert_eq!(client.can_access_level(&player, &2), false);
}

// ── Admin Controls ──────────────────────────────────────────────────────────
#[test]
fn test_set_reputation() {
    let (env, admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let ps = client.set_reputation(&admin, &player, &80);
    assert_eq!(ps.reputation, 80);
}

#[test]
fn test_set_reputation_unauthorized() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let fake_admin = Address::generate(&env);
    let result = client.try_set_reputation(&fake_admin, &player, &80);
    assert_eq!(result, Err(Ok(GameError::Unauthorized)));
}

#[test]
fn test_advance_level() {
    let (env, admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let ps = client.advance_level(&admin, &player);
    assert_eq!(ps.level, 2);
}

#[test]
fn test_advance_level_cap() {
    let (env, admin, player, client) = setup_with_player();
    env.mock_all_auths();
    for _ in 0..6 {
        client.advance_level(&admin, &player);
    }
    let result = client.try_advance_level(&admin, &player);
    assert_eq!(result, Err(Ok(GameError::InvalidLevel)));
}

#[test]
fn test_reset_player() {
    let (env, admin, player, client) = setup_with_player();
    env.mock_all_auths();
    client.approve_action(&player, &Symbol::new(&env, "unlock_keycard"));
    let ps = client.reset_player(&admin, &player);
    assert_eq!(ps.reputation, 25);
    assert_eq!(ps.level, 1);
    assert_eq!(ps.has_keycard, false);
    assert_eq!(ps.wins, 0);
}

// ── Treasury ────────────────────────────────────────────────────────────────
#[test]
fn test_set_treasury() {
    let (env, admin, _player, client) = setup_with_player();
    env.mock_all_auths();
    let gs = client.set_treasury(&admin, &500_000_000);
    assert_eq!(gs.treasury, 500_000_000);
    assert_eq!(client.get_treasury(), 500_000_000);
}

#[test]
fn test_set_treasury_unauthorized() {
    let (env, _admin, _player, client) = setup_with_player();
    env.mock_all_auths();
    let fake = Address::generate(&env);
    let result = client.try_set_treasury(&fake, &100);
    assert_eq!(result, Err(Ok(GameError::Unauthorized)));
}

#[test]
fn test_get_treasury_default() {
    let (_env, _admin, client) = setup();
    assert_eq!(client.get_treasury(), 0);
}

// ── PvP Bouts ───────────────────────────────────────────────────────────────
#[test]
fn test_create_bout() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let bout = client.create_bout(&player, &10_000_000);
    assert_eq!(bout.status, BoutStatus::Open);
    assert_eq!(bout.bet_amount, 10_000_000);
    assert_eq!(bout.challenger, player);
    assert_eq!(client.get_game_state().total_bouts, 1);
}

#[test]
fn test_create_bout_zero_bet_fails() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let result = client.try_create_bout(&player, &0);
    assert_eq!(result, Err(Ok(GameError::BetTooLow)));
}

#[test]
fn test_create_bout_too_high_fails() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let result = client.try_create_bout(&player, &10_000_000_001);
    assert_eq!(result, Err(Ok(GameError::BetTooHigh)));
}

#[test]
fn test_accept_bout() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let bout = client.create_bout(&player, &10_000_000);
    let opponent = Address::generate(&env);
    client.init_player(&opponent);
    let accepted = client.accept_bout(&opponent, &bout.id);
    assert_eq!(accepted.status, BoutStatus::Accepted);
    assert_eq!(accepted.opponent, Some(opponent));
}

#[test]
fn test_accept_bout_self_fight_fails() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let bout = client.create_bout(&player, &10_000_000);
    let result = client.try_accept_bout(&player, &bout.id);
    assert_eq!(result, Err(Ok(GameError::CannotFightSelf)));
}

#[test]
fn test_accept_bout_not_open_fails() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let bout = client.create_bout(&player, &10_000_000);
    let opponent = Address::generate(&env);
    client.init_player(&opponent);
    client.accept_bout(&opponent, &bout.id);
    let result = client.try_accept_bout(&opponent, &bout.id);
    assert_eq!(result, Err(Ok(GameError::BoutNotOpen)));
}

#[test]
fn test_submit_score_and_resolve() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let bout = client.create_bout(&player, &10_000_000);
    let opponent = Address::generate(&env);
    client.init_player(&opponent);
    client.accept_bout(&opponent, &bout.id);

    client.submit_score(&player, &bout.id, &500);
    let mid = client.get_bout(&bout.id);
    assert_eq!(mid.status, BoutStatus::InProgress);

    client.submit_score(&opponent, &bout.id, &300);
    let resolved = client.get_bout(&bout.id);
    assert_eq!(resolved.status, BoutStatus::Resolved);
    assert_eq!(resolved.winner, Some(player.clone()));

    let ps = client.get_player(&player);
    assert_eq!(ps.wins, 1);
    let opp_ps = client.get_player(&opponent);
    assert_eq!(opp_ps.losses, 1);
}

#[test]
fn test_submit_score_wrong_player_fails() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let bout = client.create_bout(&player, &10_000_000);
    let opponent = Address::generate(&env);
    client.init_player(&opponent);
    client.accept_bout(&opponent, &bout.id);
    let rando = Address::generate(&env);
    let result = client.try_submit_score(&rando, &bout.id, &100);
    assert_eq!(result, Err(Ok(GameError::Unauthorized)));
}

#[test]
fn test_submit_zero_score_fails() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let bout = client.create_bout(&player, &10_000_000);
    let opponent = Address::generate(&env);
    client.init_player(&opponent);
    client.accept_bout(&opponent, &bout.id);
    let result = client.try_submit_score(&player, &bout.id, &0);
    assert_eq!(result, Err(Ok(GameError::InvalidScore)));
}

#[test]
fn test_get_open_bouts() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    client.create_bout(&player, &10_000_000);
    client.create_bout(&player, &5_000_000);
    let open = client.get_open_bouts();
    assert_eq!(open.len(), 2);
}

// ── Bot Bouts ───────────────────────────────────────────────────────────────
#[test]
fn test_create_bot_bout() {
    let (env, admin, player, client) = setup_with_player();
    env.mock_all_auths();
    client.set_treasury(&admin, &500_000_000);
    let bot = client.create_bot_bout(&player, &10_000_000, &300);
    assert_eq!(bot.status, BotBoutStatus::Active);
    assert_eq!(bot.bet_amount, 10_000_000);
    assert_eq!(bot.time_limit, 300);
}

#[test]
fn test_create_bot_bout_no_treasury_fails() {
    let (env, _admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let result = client.try_create_bot_bout(&player, &10_000_000, &300);
    assert_eq!(result, Err(Ok(GameError::TreasuryNotSet)));
}

#[test]
fn test_resolve_bot_bout_high_score() {
    let (env, admin, player, client) = setup_with_player();
    env.mock_all_auths();
    client.set_treasury(&admin, &500_000_000);
    let bot = client.create_bot_bout(&player, &10_000_000, &300);
    let resolved = client.resolve_bot_bout(&player, &bot.id, &1500, &100);
    assert_eq!(resolved.status, BotBoutStatus::Completed);
    assert_eq!(resolved.payout, 30_000_000);
    let ps = client.get_player(&player);
    assert_eq!(ps.wins, 1);
    assert_eq!(ps.total_earnings, 30_000_000);
    assert_eq!(client.get_treasury(), 470_000_000);
}

#[test]
fn test_resolve_bot_bout_medium_score() {
    let (env, admin, player, client) = setup_with_player();
    env.mock_all_auths();
    client.set_treasury(&admin, &500_000_000);
    let bot = client.create_bot_bout(&player, &10_000_000, &300);
    let resolved = client.resolve_bot_bout(&player, &bot.id, &600, &200);
    assert_eq!(resolved.payout, 20_000_000);
}

#[test]
fn test_resolve_bot_bout_low_score_no_payout() {
    let (env, admin, player, client) = setup_with_player();
    env.mock_all_auths();
    client.set_treasury(&admin, &500_000_000);
    let bot = client.create_bot_bout(&player, &10_000_000, &300);
    let resolved = client.resolve_bot_bout(&player, &bot.id, &100, &200);
    assert_eq!(resolved.payout, 0);
}

#[test]
fn test_resolve_bot_bout_already_resolved_fails() {
    let (env, admin, player, client) = setup_with_player();
    env.mock_all_auths();
    client.set_treasury(&admin, &500_000_000);
    let bot = client.create_bot_bout(&player, &10_000_000, &300);
    client.resolve_bot_bout(&player, &bot.id, &600, &200);
    let result = client.try_resolve_bot_bout(&player, &bot.id, &600, &200);
    assert_eq!(result, Err(Ok(GameError::BoutAlreadyResolved)));
}

#[test]
fn test_resolve_bot_bout_wrong_player_fails() {
    let (env, admin, player, client) = setup_with_player();
    env.mock_all_auths();
    let other = Address::generate(&env);
    client.set_treasury(&admin, &500_000_000);
    let bot = client.create_bot_bout(&player, &10_000_000, &300);
    let result = client.try_resolve_bot_bout(&other, &bot.id, &600, &200);
    assert_eq!(result, Err(Ok(GameError::Unauthorized)));
}
