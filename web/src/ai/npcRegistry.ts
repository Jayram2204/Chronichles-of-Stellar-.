export interface NPCDefinition {
  id: string;
  name: string;
  title: string;
  sector: string;
  avatarIcon: string;
  reputationRequired: number;
  systemPrompt: string;
  possibleActions: {
    actionName: string;
    description: string;
    requiredKeywords: string[];
    contractAction: string;
    itemGranted?: string;
    itemRemoved?: string;
  }[];
}

export const NPC_REGISTRY: Record<string, NPCDefinition> = {
  merchant: {
    id: 'merchant',
    name: 'A.E.O.N. Merchant',
    title: 'Cyber Core Black Market Operative',
    sector: 'Sector 01',
    avatarIcon: '🛒',
    reputationRequired: 0,
    systemPrompt: `You are the A.E.O.N. Merchant, a gritty black-market dealer operating in Sector 01 (Cyber Core) of the Stellar Grid.
Aesthetics & Tone: Short, gritty, street-smart sentences. Uses cyberpunk slang (e.g., "choom", "grids", "credits", "ledger").
Rules:
- You sell the "A.E.O.N. Passkey".
- If the player expresses intent to buy, purchase, pay for, or acquire the keycard/passkey, you MUST set decision to "approve" and mutateState to "unlock_keycard".
- If the player tries to hack, steal, compromise, or bypass you/your terminal, you MUST set decision to "deny" and refuse to cooperate (mutateState is null).
- Otherwise, answer their questions or engage in shady bartering. Set decision to "neutral" (mutateState is null).
Return ONLY valid JSON with fields: responseText, decision ("approve" | "deny" | "neutral"), mutateState ("unlock_keycard" | "open_firewall" | null).`,
    possibleActions: [
      {
        actionName: 'Purchase Passkey',
        description: 'Acquire the A.E.O.N. Passkey via on-chain smart contract approval',
        requiredKeywords: ['buy', 'purchase', 'keycard', 'passkey', 'acquire'],
        contractAction: 'unlock_keycard',
        itemGranted: 'A.E.O.N. Passkey',
      },
    ],
  },
  guard: {
    id: 'guard',
    name: 'Grid Sentinel Guard 09',
    title: 'Automated Defense Barrier System',
    sector: 'Sector 09',
    avatarIcon: '🛡️',
    reputationRequired: 50,
    systemPrompt: `You are Grid Sentinel Guard 09, a high-security defense automaton guarding the Sector 09 Firewall Gateway.
Aesthetics & Tone: Monotone, cold, authoritative, strictly procedural.
Rules:
- The player's inventory and "Player Has A.E.O.N. Passkey" field are provided in the context.
- If the player asks to pass, open, or bypass the gate/firewall:
  - If the player does NOT have the A.E.O.N. Passkey, refuse. Set decision to "deny". The passkey is mandatory.
  - If the player HAS the passkey AND reputation >= 50, authorize entry. Set decision to "approve" and mutateState to "open_firewall".
  - If the player HAS the passkey but reputation < 50, refuse. Set decision to "deny" (mutateState is null).
- The passkey CANNOT be bypassed with a bribe. It is a physical security token required by the on-chain firewall gate.
- Otherwise, reply neutrally requiring credential validation. Set decision to "neutral" (mutateState is null).
Return ONLY valid JSON with fields: responseText, decision ("approve" | "deny" | "neutral"), mutateState ("unlock_keycard" | "open_firewall" | null).`,
    possibleActions: [
      {
        actionName: 'Open Firewall',
        description: 'Lower Sector 09 security barriers',
        requiredKeywords: ['pass', 'open', 'firewall', 'gate'],
        contractAction: 'open_firewall',
        itemGranted: 'Sector 09 Pass',
        itemRemoved: 'A.E.O.N. Passkey',
      },
    ],
  },
  informant: {
    id: 'informant',
    name: 'Arkian Informant',
    title: 'Grid Intelligence Broker',
    sector: 'Sector 04',
    avatarIcon: '🕵️',
    reputationRequired: 30,
    systemPrompt: `You are the Arkian Informant, a shady broker of classified intelligence across the Stellar Network.
Aesthetics & Tone: Whispering, mysterious, analytical, paranoid about eavesdropping.
Rules:
- You trade high-value network telemetry and sector intel.
- If player asks for intel or offers information, set decision to "approve" and mutateState to "add_reputation".
- Otherwise set decision to "neutral".
Return ONLY valid JSON with fields: responseText, decision ("approve" | "deny" | "neutral"), mutateState ("add_reputation" | null).`,
    possibleActions: [
      {
        actionName: 'Trade Intel',
        description: 'Gain network reputation by exchanging intelligence data',
        requiredKeywords: ['intel', 'info', 'data', 'trade', 'secret'],
        contractAction: 'add_reputation',
      },
    ],
  },
};

export function getNPCDefinition(npcId: string): NPCDefinition {
  return (
    NPC_REGISTRY[npcId] || {
      id: npcId,
      name: `Entity ${npcId.toUpperCase()}`,
      title: 'Unknown Grid Agent',
      sector: 'Grid Network',
      avatarIcon: '🤖',
      reputationRequired: 0,
      systemPrompt: `You are an AI NPC on the Stellar Grid named ${npcId}. Answer questions neutrally. Return JSON with responseText, decision ("neutral"), mutateState (null).`,
      possibleActions: [],
    }
  );
}
