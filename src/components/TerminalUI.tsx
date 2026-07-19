import React, { useState, useEffect, useRef } from 'react';
import { EventHub, GameEvents } from '../events/EventHub';
import { agentBridge } from '../ai/AgentBridge';
import { terminalLogic } from '../ai/TerminalLogic';
import type { DialogueLog } from '../ai/TerminalLogic';

interface TerminalUIProps {
  npcId: string;
  npcName: string;
  reputationScore: number;
  isSyncing: boolean;
}

export const TerminalUI: React.FC<TerminalUIProps> = ({
  npcId,
  npcName,
  reputationScore,
  isSyncing,
}) => {
  const [logs, setLogs] = useState<DialogueLog[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isPendingAI, setIsPendingAI] = useState(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Load initial history
    setLogs([...terminalLogic.getHistory(npcId)]);

    const handleResponse = (res: any) => {
      if (res.npcId === npcId) {
        terminalLogic.addLog(npcId, 'npc', res.responseText);
        setLogs([...terminalLogic.getHistory(npcId)]);
        setIsPendingAI(false);
      }
    };

    EventHub.on(GameEvents.TERMINAL_RESPONSE, handleResponse);

    return () => {
      EventHub.off(GameEvents.TERMINAL_RESPONSE, handleResponse);
    };
  }, [npcId]);

  useEffect(() => {
    // Auto scroll to bottom
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isPendingAI]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isPendingAI || isSyncing) return;

    const userText = inputVal.trim();
    setInputVal('');

    // Save player input locally
    terminalLogic.addLog(npcId, 'player', userText);
    setLogs([...terminalLogic.getHistory(npcId)]);
    setIsPendingAI(true);

    // Trigger AI bridge submit
    try {
      await agentBridge.submitPrompt({
        npcId,
        playerPrompt: userText,
        reputationScore,
      });
    } catch (err) {
      console.error('Failed to submit prompt to agent:', err);
      terminalLogic.addLog(npcId, 'system', `// AI COM LINK FAILURE: ${String(err)}`);
      setLogs([...terminalLogic.getHistory(npcId)]);
      setIsPendingAI(false);
    }
  };

  return (
    <div className="flex flex-col h-[280px] bg-[#0c051a] border border-[#2d124d] rounded-lg overflow-hidden font-mono shadow-[0_0_15px_rgba(30,11,54,0.5)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1b0b2e] border-b border-[#2d124d] text-xs text-[#00f3ff] uppercase tracking-wider font-bold">
        <span>🤖 COMM-LINK: {npcName}</span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isPendingAI ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          {isPendingAI ? 'ANALYZING PROMPT...' : 'READY'}
        </span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs text-[#d2c9ff]">
        {logs.map((log, index) => {
          let prefix = '';
          let colorClass = 'text-[#b8adff]';

          if (log.sender === 'player') {
            prefix = '> COURIER:';
            colorClass = 'text-[#00f3ff] font-semibold';
          } else if (log.sender === 'npc') {
            prefix = `> [${npcName.toUpperCase()}]:`;
            colorClass = 'text-[#ff0055] font-semibold';
          } else if (log.sender === 'system') {
            prefix = '';
            colorClass = 'text-amber-500/80 italic';
          }

          return (
            <div key={index} className={`leading-relaxed border-l-2 pl-2 ${
              log.sender === 'player' ? 'border-[#00f3ff]/40' :
              log.sender === 'npc' ? 'border-[#ff0055]/40' : 'border-amber-500/40'
            }`}>
              <div className="text-[10px] opacity-40 mb-0.5">
                {log.timestamp.toLocaleTimeString()}
              </div>
              <span className={colorClass}>{prefix} </span>
              <span>{log.text}</span>
            </div>
          );
        })}

        {isPendingAI && (
          <div className="flex items-center gap-1 text-[#00f3ff] italic pl-2 border-l-2 border-[#00f3ff]/20">
            <span>[AGENT THINKING]</span>
            <span className="animate-bounce">.</span>
            <span className="animate-bounce delay-100">.</span>
            <span className="animate-bounce delay-200">.</span>
          </div>
        )}

        {isSyncing && (
          <div className="text-[#ff0055] italic pl-2 border-l-2 border-[#ff0055]/20 animate-pulse">
            // SUBMITTING LEDGER RECORD TO STELLAR BLOCKCHAIN...
          </div>
        )}

        <div ref={logEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex border-t border-[#2d124d]">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          disabled={isPendingAI || isSyncing}
          placeholder={
            isSyncing
              ? 'BLOCKCHAIN MUTATION IN PROGRESS...'
              : isPendingAI
              ? 'WAITING FOR AGENT DECISION...'
              : 'ENTER TRANSACTION COMMAND (e.g. "Buy keycard", "Bribe guard")...'
          }
          className="flex-1 bg-[#090314] px-3 py-2 text-xs text-white focus:outline-none placeholder-purple-900/60 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || isPendingAI || isSyncing}
          className="bg-[#2a0e4e] hover:bg-[#3d166e] text-[#00f3ff] px-4 text-xs font-bold transition disabled:opacity-30 disabled:hover:bg-[#2a0e4e] uppercase border-l border-[#2d124d]"
        >
          EXECUTE
        </button>
      </form>
    </div>
  );
};
