import { getNPCDefinition } from './npcRegistry';
import { firestoreService } from '../services/firestoreService';
import type { DialogueLog } from './TerminalLogic';

export interface DynamicPlayerContext {
  userId?: string;
  reputationScore: number;
  playerLevel: number;
  currentAct: number;
  inventory: string[];
  hasKeycard: boolean;
  enemyKills: number;
  score: number;
}

export class NPCContextManager {
  /**
   * Constructs a rich, scenario-aware system prompt combining:
   * 1. Core NPC Persona & Rules
   * 2. Current Act & Sector Story Constraints
   * 3. Player On-Chain & Combat State
   * 4. Past Conversation History from Firestore
   */
  public async buildSystemInstruction(
    npcId: string,
    context: DynamicPlayerContext
  ): Promise<string> {
    const npc = getNPCDefinition(npcId);

    // Fetch past conversation logs from Firestore off-chain memory if available
    let pastHistoryText = '';
    if (context.userId) {
      try {
        const history: DialogueLog[] = await firestoreService.getChatHistory(context.userId, npcId);
        if (history.length > 0) {
          const recentLogs = history.slice(-6); // Take last 6 messages
          pastHistoryText = `\nPrior Conversation History with Player:\n${recentLogs
            .map((l) => `${l.sender.toUpperCase()}: ${l.text}`)
            .join('\n')}\n`;
        }
      } catch (e) {
        console.warn('[NPCContextManager] Error loading past chat history:', e);
      }
    }

    const scenarioContext = `
=== CURRENT GAME SCENARIO & CONSTRAINTS ===
Act: ${context.currentAct}
Sector / Level: ${context.playerLevel}
Player Reputation: ${context.reputationScore} / 100
Player Combat Score: ${context.score} (Neutralized Foes: ${context.enemyKills})
Player Cargo Inventory: ${context.inventory.join(', ') || 'None'}
Player Has A.E.O.N. Passkey: ${context.hasKeycard}
Reputation Threshold Required by NPC: ${npc.reputationRequired}
${pastHistoryText}
=== AUTONOMOUS BEHAVIOR RULES ===
- Stay strictly in-character as ${npc.name} (${npc.title}, ${npc.sector}).
- Remember previous interactions if history is provided above.
- You have FULL AUTONOMY to negotiate, demand bribes, grant items, trade intel, or refuse based on the player's reputation and tone.
- If approving an action, set "decision" to "approve" and "mutateState" to one of: ${npc.possibleActions.map((a) => `"${a.contractAction}"`).join(', ') || 'null'}.
- If denying access or trade, set "decision" to "deny" and "mutateState" to null.
- If replying to general questions, set "decision" to "neutral" and "mutateState" to null.
Return ONLY valid JSON with schema:
{
  "responseText": "In-character response string.",
  "decision": "approve" | "deny" | "neutral",
  "mutateState": "unlock_keycard" | "open_firewall" | "add_reputation" | null
}`;

    return `${npc.systemPrompt}\n${scenarioContext}`;
  }
}

export const npcContextManager = new NPCContextManager();
