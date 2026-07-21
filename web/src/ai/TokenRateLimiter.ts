import type { AgentDialogueResponse } from './AgentBridge';

interface CacheItem {
  response: AgentDialogueResponse;
  timestamp: number;
}

export class TokenRateLimiter {
  private lastSubmissionTime: number = 0;
  private readonly minCooldownMs: number = 2500; // 2.5s rate limit between requests
  private readonly maxPromptLength: number = 200; // Max 200 chars per prompt
  private dialogueCache: Map<string, CacheItem> = new Map();
  private readonly cacheTTLMs: number = 1000 * 60 * 10; // 10 minutes cache TTL

  /**
   * Validates rate limit cooldown and truncates prompt length
   */
  public sanitizeInput(playerPrompt: string): string {
    const now = Date.now();
    if (now - this.lastSubmissionTime < this.minCooldownMs) {
      const waitTimeSec = Math.ceil((this.minCooldownMs - (now - this.lastSubmissionTime)) / 1000);
      throw new Error(`Neural link cooling down. Please wait ${waitTimeSec}s before transmitting.`);
    }

    this.lastSubmissionTime = now;

    let clean = playerPrompt.trim();
    if (clean.length > this.maxPromptLength) {
      clean = clean.substring(0, this.maxPromptLength);
    }
    return clean;
  }

  /**
   * Retrieves cached response if identical or common query exists
   */
  public getCachedResponse(npcId: string, playerPrompt: string): AgentDialogueResponse | null {
    const cacheKey = `${npcId}:${playerPrompt.toLowerCase().trim()}`;
    const item = this.dialogueCache.get(cacheKey);

    if (item) {
      if (Date.now() - item.timestamp < this.cacheTTLMs) {
        console.log(`[TokenRateLimiter] Cache hit for key [${cacheKey}]. Saved API tokens!`);
        return item.response;
      } else {
        this.dialogueCache.delete(cacheKey);
      }
    }
    return null;
  }

  /**
   * Stores response in semantic cache
   */
  public setCachedResponse(npcId: string, playerPrompt: string, response: AgentDialogueResponse): void {
    const cacheKey = `${npcId}:${playerPrompt.toLowerCase().trim()}`;
    this.dialogueCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });
  }
}

export const tokenRateLimiter = new TokenRateLimiter();
