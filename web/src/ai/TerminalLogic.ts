export interface DialogueLog {
  sender: 'player' | 'npc' | 'system';
  text: string;
  timestamp: Date;
}

export class TerminalLogic {
  private history: Map<string, DialogueLog[]> = new Map();

  public getHistory(npcId: string): DialogueLog[] {
    if (!this.history.has(npcId)) {
      this.history.set(npcId, [
        {
          sender: 'system',
          text: `// SECURE COMM LINK INITIALIZED WITH GRID-ENTITY [${npcId.toUpperCase()}]`,
          timestamp: new Date()
        }
      ]);
    }
    return this.history.get(npcId) || [];
  }

  public addLog(npcId: string, sender: 'player' | 'npc' | 'system', text: string) {
    const logs = this.getHistory(npcId);
    logs.push({ sender, text, timestamp: new Date() });
    this.history.set(npcId, logs);
  }
}

export const terminalLogic = new TerminalLogic();
