import { GoogleGenerativeAI } from '@google/generative-ai';
import { EventHub, GameEvents } from '../events/EventHub';

export interface AgentDialogueRequest {
  npcId: string;
  playerPrompt: string;
  reputationScore: number;
}

export interface AgentDialogueResponse {
  npcId: string;
  responseText: string;
  decision: 'approve' | 'deny' | 'neutral';
  mutateState?: string;
}

class AgentBridge {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      console.log('[AgentBridge] Gemini API key detected. Running real agent AI.');
    } else {
      console.warn(
        '[AgentBridge] No VITE_GEMINI_API_KEY found in environment. Falling back to simulated local agent logic.'
      );
    }
  }

  public async submitPrompt(request: AgentDialogueRequest): Promise<AgentDialogueResponse> {
    console.log(`[AgentBridge] Querying NPC: ${request.npcId} with: "${request.playerPrompt}"`);

    if (!this.genAI) {
      return this.runSimulation(request);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const systemInstruction = this.getSystemInstruction(request.npcId, request.reputationScore);
      
      const prompt = `
        User prompt: "${request.playerPrompt}"
        
        Generate the response as JSON matching this schema:
        {
          "responseText": "Your in-character dialogue response.",
          "decision": "approve" | "deny" | "neutral",
          "mutateState": "unlock_keycard" | "open_firewall" | null
        }
      `;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction,
      });

      const text = result.response.text();
      console.log('[AgentBridge] Gemini response raw text:', text);

      const parsed = JSON.parse(text);
      
      const response: AgentDialogueResponse = {
        npcId: request.npcId,
        responseText: parsed.responseText || '...',
        decision: parsed.decision || 'neutral',
        mutateState: parsed.mutateState || undefined,
      };

      // Emit events for Phaser canvas animations and state mutations
      EventHub.emit(GameEvents.AGENT_DECISION, { npcId: request.npcId, decision: response.decision });
      EventHub.emit(GameEvents.TERMINAL_RESPONSE, response);

      return response;
    } catch (error) {
      console.error('[AgentBridge] Gemini API execution failed, falling back to simulation:', error);
      return this.runSimulation(request);
    }
  }

  private getSystemInstruction(npcId: string, reputationScore: number): string {
    if (npcId === 'merchant') {
      return `
        You are the A.E.O.N. Merchant, a cybernetic black-market dealer operating in Sector 01 (Cyber Core) of the Stellar Grid. 
        Aesthetics & Tone: Short, gritty, street-smart sentences. Uses cyberpunk slang (e.g., "choom", "grids", "credits", "ledger"). 
        Rules:
        - You sell the "A.E.O.N. Passkey".
        - If the player expresses intent to buy, purchase, pay for, or acquire the keycard/passkey, you MUST set decision to "approve" and mutateState to "unlock_keycard".
        - If the player tries to hack, steal, compromise, or bypass you/your terminal, you MUST set decision to "deny" and refuse to cooperate (mutateState is null).
        - Otherwise, answer their questions or engage in shady bartering. Set decision to "neutral" (mutateState is null).
        Return ONLY valid JSON.
      `;
    } else {
      return `
        You are Grid Sentinel Guard 09, a high-security defense automaton guarding the Sector 09 Firewall Gateway.
        Aesthetics & Tone: Monotone, cold, authoritative, strictly procedural.
        Rules:
        - The player's reputation score is currently ${reputationScore}.
        - If the player asks to pass, open, or bypass the gate/firewall:
          - If the player's reputation score is >= 50, authorize entry. Set decision to "approve" and mutateState to "open_firewall".
          - If the reputation score is less than 50, refuse access. Set decision to "deny" (mutateState is null).
        - If the player offers to pay a bribe, transfer credits, or hand over payment, you accept the bribe to lower the firewall. Set decision to "approve" and mutateState to "open_firewall".
        - Otherwise, reply neutrally requiring credential validation or payment. Set decision to "neutral" (mutateState is null).
        Return ONLY valid JSON.
      `;
    }
  }

  private runSimulation(request: AgentDialogueRequest): Promise<AgentDialogueResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let responseText = "Transmission scrambled. Request unreadable.";
        let decision: 'approve' | 'deny' | 'neutral' = 'neutral';
        let mutateState: string | undefined;

        const p = request.playerPrompt.toLowerCase();

        if (request.npcId === 'merchant') {
          if (p.includes('buy') || p.includes('keycard') || p.includes('purchase') || p.includes('acquire')) {
            responseText = "Purchase command verified. Initiating smart-contract key distribution for the A.E.O.N. Passkey.";
            decision = 'approve';
            mutateState = 'unlock_keycard';
          } else if (p.includes('hack') || p.includes('steal') || p.includes('bypass')) {
            responseText = "Warning: Port-scan attack detected. Security barriers activated. Direct exchange terminated.";
            decision = 'deny';
          } else {
            responseText = "Decentralized trade ledger online. State your asset exchange request. I have the A.E.O.N. Passkey ready for transfer.";
            decision = 'neutral';
          }
        } else if (request.npcId === 'guard') {
          if (p.includes('pass') || p.includes('open') || p.includes('bypass') || p.includes('go through')) {
            if (request.reputationScore >= 50) {
              responseText = "Clearance authorization valid. Sector Grid Firewall offline. You may proceed.";
              decision = 'approve';
              mutateState = 'open_firewall';
            } else {
              responseText = "Passage authorization failed. I require credential clearance (Reputation >= 50) or proof of network transaction.";
              decision = 'deny';
            }
          } else if (p.includes('pay') || p.includes('bribe') || p.includes('give') || p.includes('credits')) {
            responseText = "Credits registered. Deploying Soroban contract passage ticket. Lowering firewall.";
            decision = 'approve';
            mutateState = 'open_firewall';
          } else {
            responseText = "Grid Sentinel Guard 09 active. Unauthorized processes will be purged. Present credentials or make a transaction.";
            decision = 'neutral';
          }
        }

        const response: AgentDialogueResponse = {
          npcId: request.npcId,
          responseText,
          decision,
          mutateState,
        };

        // Emit events for Phaser canvas animations and state mutations
        EventHub.emit(GameEvents.AGENT_DECISION, { npcId: request.npcId, decision });
        EventHub.emit(GameEvents.TERMINAL_RESPONSE, response);

        resolve(response);
      }, 1500);
    });
  }
}

export const agentBridge = new AgentBridge();
