import EventEmitter from 'eventemitter3';

export const EventHub = new EventEmitter();

/**
 * EventEmitter listeners run synchronously.  Phaser invokes combat callbacks
 * from its update step, so a UI listener that throws must never be allowed to
 * escape back into `game.step()` and leave the last rendered frame onscreen.
 *
 * Use this for notifications produced by the game loop.  Deferring the
 * dispatch also keeps React state updates out of the physics tick.
 */
export function emitGameEvent(event: string, payload?: unknown): void {
  setTimeout(() => {
    try {
      EventHub.emit(event, payload);
    } catch (error) {
      console.error(`[EventHub] listener failed for "${event}"`, error);
    }
  }, 0);
}

export const GameEvents = {
  INTERACT_TRIGGER: 'interact_trigger',
  PLAYER_DAMAGE: 'player_damage',
  PLAYER_HEAL: 'player_heal',
  ENEMY_DEATH: 'enemy_death',
  LEVEL_CLEARED: 'level_cleared',
  ACT_COMPLETED: 'act_completed',
  GAME_OVER: 'game_over',

  TERMINAL_RESPONSE: 'terminal_response',
  AGENT_DECISION: 'agent_decision',

  WALLET_CONNECTED: 'wallet_connected',
  WALLET_DISCONNECTED: 'wallet_disconnected',
  TX_SUBMITTED: 'tx_submitted',
  TX_CONFIRMED: 'tx_confirmed',
  TX_FAILED: 'tx_failed',

  LEVEL_CHANGED: 'level_changed',
  NPC_TALK: 'npc_talk',

  PVP_SCORE_UPDATE: 'pvp_score_update',
  PVP_MATCH_END: 'pvp_match_end',
};
