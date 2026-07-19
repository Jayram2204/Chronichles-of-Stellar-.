import EventEmitter from 'eventemitter3';

export const EventHub = new EventEmitter();

export const GameEvents = {
  PLAYER_MOVED: 'player_moved',
  INTERACT_TRIGGER: 'interact_trigger',
  PLAYER_DAMAGE: 'player_damage',
  ENEMY_DEATH: 'enemy_death',
  LEVEL_CLEARED: 'level_cleared',

  TERMINAL_SUBMIT: 'terminal_submit',
  TERMINAL_RESPONSE: 'terminal_response',
  AGENT_DECISION: 'agent_decision',

  WALLET_CONNECTED: 'wallet_connected',
  WALLET_DISCONNECTED: 'wallet_disconnected',
  TX_SUBMITTED: 'tx_submitted',
  TX_CONFIRMED: 'tx_confirmed',
  TX_FAILED: 'tx_failed',

  LEVEL_CHANGED: 'level_changed',
};
