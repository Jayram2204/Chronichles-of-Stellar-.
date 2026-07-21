import { GoogleGenerativeAI } from '@google/generative-ai';
import { EventHub, GameEvents } from '../events/EventHub';
import { npcContextManager } from './NPCContextManager';
import { tokenRateLimiter } from './TokenRateLimiter';
import { firestoreService } from '../services/firestoreService';
import { terminalLogic } from './TerminalLogic';
import type { DynamicPlayerContext } from './NPCContextManager';

export interface AgentDialogueRequest {
  npcId: string;
  playerPrompt: string;
  context: DynamicPlayerContext;
}

export interface AgentDialogueResponse {
  npcId: string;
  responseText: string;
  decision: 'approve' | 'deny' | 'neutral';
  mutateState?: string;
  isCached?: boolean;
}

class AgentBridge {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      console.log('[AgentBridge] Gemini API key initialized. Operating dynamic scenario agent bridge.');
    } else {
      console.warn(
        '[AgentBridge] No VITE_GEMINI_API_KEY detected in environment. Running dynamic local rule engine fallback.'
      );
    }
  }

  public async submitPrompt(request: AgentDialogueRequest): Promise<AgentDialogueResponse> {
    const sanitizedPrompt = tokenRateLimiter.sanitizeInput(request.playerPrompt);
    console.log(`[AgentBridge] Querying NPC [${request.npcId}] with: "${sanitizedPrompt}"`);

    // 1. Check Token Limiter Cache
    const cached = tokenRateLimiter.getCachedResponse(request.npcId, sanitizedPrompt);
    if (cached) {
      const cachedResp = { ...cached, isCached: true };
      EventHub.emit(GameEvents.AGENT_DECISION, { npcId: request.npcId, decision: cachedResp.decision });
      EventHub.emit(GameEvents.TERMINAL_RESPONSE, cachedResp);
      return cachedResp;
    }

    if (!this.genAI) {
      return this.runDynamicSimulation(request.npcId, sanitizedPrompt, request.context);
    }

    // 2. Build Scenario-Aware Dynamic System Prompt
    const systemInstruction = await npcContextManager.buildSystemInstruction(
      request.npcId,
      request.context
    );

    // 3. Model Cascading (Primary: gemini-2.5-flash -> Secondary: gemini-2.5-flash-lite)
    try {
      return await this.executeGeminiInference('gemini-2.5-flash', request.npcId, sanitizedPrompt, systemInstruction, request.context);
    } catch (primaryErr) {
      console.warn('[AgentBridge] Primary model gemini-2.5-flash failed/rate limited. Cascading to gemini-2.5-flash-lite...', primaryErr);
      try {
        return await this.executeGeminiInference('gemini-2.5-flash-lite', request.npcId, sanitizedPrompt, systemInstruction, request.context);
      } catch (secondaryErr) {
        console.error('[AgentBridge] Secondary model failed. Gracefully falling back to local autonomous rule engine:', secondaryErr);
        return this.runDynamicSimulation(request.npcId, sanitizedPrompt, request.context);
      }
    }
  }

  private async executeGeminiInference(
    modelName: string,
    npcId: string,
    promptText: string,
    systemInstruction: string,
    context: DynamicPlayerContext
  ): Promise<AgentDialogueResponse> {
    const model = this.genAI!.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const userMsg = `Player Prompt: "${promptText}"`;
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      systemInstruction: systemInstruction,
    });

    const text = result.response.text();
    console.log(`[AgentBridge] (${modelName}) Raw response:`, text);

    const parsed = JSON.parse(text);

    const response: AgentDialogueResponse = {
      npcId: npcId,
      responseText: parsed.responseText || 'Transmission received.',
      decision: parsed.decision || 'neutral',
      mutateState: parsed.mutateState || undefined,
    };

    // Cache response in token limiter
    tokenRateLimiter.setCachedResponse(npcId, promptText, response);

    // Save chat history off-chain to Firestore
    if (context.userId) {
      terminalLogic.addLog(npcId, 'npc', response.responseText);
      const history = terminalLogic.getHistory(npcId);
      firestoreService.saveChatHistory(context.userId, npcId, history);
    }

    EventHub.emit(GameEvents.AGENT_DECISION, { npcId: npcId, decision: response.decision });
    EventHub.emit(GameEvents.TERMINAL_RESPONSE, response);

    return response;
  }

  private runDynamicSimulation(
    npcId: string,
    promptText: string,
    context: DynamicPlayerContext
  ): Promise<AgentDialogueResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const p = promptText.toLowerCase();
        let responseText = `[AGENT BACKUP MODE]: Communication channel established. Query verified.`;
        let decision: 'approve' | 'deny' | 'neutral' = 'neutral';
        let mutateState: string | undefined;

        if (npcId === 'merchant') {
          if (p.includes('buy') || p.includes('keycard') || p.includes('passkey') || p.includes('acquire')) {
            responseText = `[A.E.O.N. Merchant]: Smart-contract purchase verified for A.E.O.N. Passkey. Executing on-chain mutation.`;
            decision = 'approve';
            mutateState = 'unlock_keycard';
          } else if (p.includes('hack') || p.includes('attack') || p.includes('bypass')) {
            responseText = `[A.E.O.N. Merchant]: Intrusion attempt detected. Terminal locked. Access denied.`;
            decision = 'deny';
          } else {
            responseText = `[A.E.O.N. Merchant]: Grid market channel online. State your trade request.`;
            decision = 'neutral';
          }
        } else if (npcId === 'guard') {
          if (p.includes('pass') || p.includes('open') || p.includes('firewall') || p.includes('gate')) {
            if (context.reputationScore >= 50) {
              responseText = `[Grid Sentinel Guard 09]: Clearance score (${context.reputationScore}/100) authorized. Lowering firewall barriers.`;
              decision = 'approve';
              mutateState = 'open_firewall';
            } else {
              responseText = `[Grid Sentinel Guard 09]: Clearance denied. Required reputation is 50, but your current score is ${context.reputationScore}.`;
              decision = 'deny';
            }
          } else if (p.includes('bribe') || p.includes('pay') || p.includes('credits')) {
            responseText = `[Grid Sentinel Guard 09]: Credit transfer accepted. Lowering firewall barriers.`;
            decision = 'approve';
            mutateState = 'open_firewall';
          }
        } else if (npcId === 'informant') {
          if (p.includes('intel') || p.includes('data') || p.includes('info')) {
            responseText = `[Arkian Informant]: Intel trade accepted. Transmitting network telemetry (+10 Reputation).`;
            decision = 'approve';
            mutateState = 'add_reputation';
          }
        }

        const response: AgentDialogueResponse = {
          npcId,
          responseText,
          decision,
          mutateState,
        };

        if (context.userId) {
          terminalLogic.addLog(npcId, 'npc', response.responseText);
          const history = terminalLogic.getHistory(npcId);
          firestoreService.saveChatHistory(context.userId, npcId, history);
        }

        EventHub.emit(GameEvents.AGENT_DECISION, { npcId, decision });
        EventHub.emit(GameEvents.TERMINAL_RESPONSE, response);

        resolve(response);
      }, 800);
    });
  }
}

export const agentBridge = new AgentBridge();
