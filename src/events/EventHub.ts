import EventEmitter from 'eventemitter3';

export const EventHub = new EventEmitter();

// Centralized event keys
export const GameEvents = {
  // Gameplay
  PLAYER_MOVED: 'player_moved',
  INTERACT_TRIGGER: 'interact_trigger', // Fired when near an NPC
  
  // AI Agent dialogue
  TERMINAL_SUBMIT: 'terminal_submit',
  TERMINAL_RESPONSE: 'terminal_response',
  AGENT_DECISION: 'agent_decision',
  
  // Blockchain events
  WALLET_CONNECTED: 'wallet_connected',
  WALLET_DISCONNECTED: 'wallet_disconnected',
  TX_SUBMITTED: 'tx_submitted',
  TX_CONFIRMED: 'tx_confirmed',
  TX_FAILED: 'tx_failed',
  
  // Grid Navigation
  LEVEL_CHANGED: 'level_changed',
};
