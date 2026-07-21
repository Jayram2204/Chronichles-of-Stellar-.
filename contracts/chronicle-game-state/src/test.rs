#![cfg(test)]

use super::*;
use soroban_sdk::{Env, Address, String};

#[test]
fn test_contract_flow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ChronicleGameState);
    let client = ChronicleGameStateClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let player = Address::generate(&env);

    client.initialize(&admin);
    let init_state = client.init_player(&player);
    assert_eq!(init_state.reputation, 25);
    assert_eq!(init_state.level, 1);
    assert_eq!(init_state.has_keycard, false);

    let keycard_state = client.approve_action(&player, &String::from_str(&env, "unlock_keycard"));
    assert_eq!(keycard_state.has_keycard, true);
    assert_eq!(keycard_state.reputation, 40);

    let firewall_state = client.approve_action(&player, &String::from_str(&env, "open_firewall"));
    assert_eq!(firewall_state.has_firewall_pass, true);
    assert_eq!(firewall_state.has_keycard, false);
    assert_eq!(firewall_state.level, 2);

    let can_access = client.can_access_level(&player, &2);
    assert_eq!(can_access, true);
}
