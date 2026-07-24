import React, { useState, useEffect, useRef } from 'react';
import { EventHub, GameEvents } from '../events/EventHub';
import { agentBridge } from '../ai/AgentBridge';
import { terminalLogic } from '../ai/TerminalLogic';
import { getNPCDefinition } from '../ai/npcRegistry';
import { authService } from '../services/authService';
import { neuralVoiceSynthesizer } from '../audio/NeuralVoiceSynthesizer';
import type { DialogueLog } from '../ai/TerminalLogic';

interface TerminalUIProps {
  npcId: string;
  npcName: string;
  reputationScore: number;
  currentLevel: number;
  currentAct: number;
  inventory: string[];
  enemyKills: number;
  score: number;
  isSyncing: boolean;
}

export const TerminalUI: React.FC<TerminalUIProps> = ({
  npcId,
  reputationScore,
  currentLevel,
  currentAct,
  inventory,
  enemyKills,
  score,
  isSyncing,
}) => {
  const npcDef = getNPCDefinition(npcId);

  const [logs, setLogs] = useState<DialogueLog[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isPendingAI, setIsPendingAI] = useState(false);
  const [isMuted, setIsMuted] = useState(neuralVoiceSynthesizer.getMutedState());
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLogs([...terminalLogic.getHistory(npcId)]);

    const handleResponse = (res: any) => {
      if (res.npcId === npcId) {
        terminalLogic.addLog(npcId, 'npc', res.responseText);
        setLogs([...terminalLogic.getHistory(npcId)]);
        setIsPendingAI(false);

        // Synthesize Cyberware Voice Line
        neuralVoiceSynthesizer.speak(res.npcId, res.responseText);
      }
    };

    EventHub.on(GameEvents.TERMINAL_RESPONSE, handleResponse);

    return () => {
      EventHub.off(GameEvents.TERMINAL_RESPONSE, handleResponse);
    };
  }, [npcId]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isPendingAI]);

  const handleToggleMute = () => {
    const muted = neuralVoiceSynthesizer.toggleMute();
    setIsMuted(muted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isPendingAI || isSyncing) return;

    const userText = inputVal.trim();
    setInputVal('');

    terminalLogic.addLog(npcId, 'player', userText);
    setLogs([...terminalLogic.getHistory(npcId)]);
    setIsPendingAI(true);

    const session = authService.getSession();

    try {
      await agentBridge.submitPrompt({
        npcId,
        playerPrompt: userText,
        context: {
          userId: session.user?.id,
          reputationScore,
          playerLevel: currentLevel,
          currentAct,
          inventory,
          hasKeycard: inventory.includes('A.E.O.N. Passkey'),
          enemyKills,
          score,
        },
      });
    } catch (err) {
      console.error('Failed to submit prompt to agent:', err);
      terminalLogic.addLog(npcId, 'system', `// AI COMM-LINK NOTICE: ${String(err)}`);
      setLogs([...terminalLogic.getHistory(npcId)]);
      setIsPendingAI(false);
    }
  };

  return (
    <div className="flex flex-col h-[280px] bg-[#0f260f] border border-[#2a4a1a] rounded-lg overflow-hidden font-mono shadow-[0_0_15px_rgba(15,38,15,0.5)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#142e14] border-b border-[#2a4a1a] text-xs text-[#8bac0f] uppercase tracking-wider font-bold">
        <span className="flex items-center gap-2">
          <span>{npcDef.avatarIcon}</span>
          <span>{npcDef.name}</span>
          <span className="text-[9px] text-[#6a8a4a] font-normal">({npcDef.sector})</span>
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleMute}
            className="text-[10px] text-[#6a8a4a] hover:text-[#8bac0f] transition cursor-pointer font-normal uppercase"
            title="Toggle Cyberware Neural Voice Audio"
          >
            {isMuted ? '🔇 VOICE MUTED' : '🔊 VOICE ONLINE'}
          </button>

          <span className="flex items-center gap-1.5 text-[10px]">
            <span className={`w-2 h-2 rounded-full ${isPendingAI ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            {isPendingAI ? 'ANALYZING...' : 'ONLINE'}
          </span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs text-[#e0f8d0]">
        {logs.map((log, index) => {
          let prefix = '';
          let colorClass = 'text-[#6a8a4a]';

          if (log.sender === 'player') {
            prefix = '> COURIER:';
            colorClass = 'text-[#8bac0f] font-semibold';
          } else if (log.sender === 'npc') {
            prefix = `> [${npcDef.name.toUpperCase()}]:`;
            colorClass = 'text-[#306230] font-semibold';
          } else if (log.sender === 'system') {
            prefix = '';
            colorClass = 'text-amber-500/80 italic';
          }

          return (
            <div
              key={index}
              className={`leading-relaxed border-l-2 pl-2 ${
                log.sender === 'player'
                  ? 'border-[#8bac0f]/40'
                  : log.sender === 'npc'
                  ? 'border-[#306230]/40'
                  : 'border-amber-500/40'
              }`}
            >
              <div className="text-[10px] opacity-40 mb-0.5">
                {log.timestamp.toLocaleTimeString()}
              </div>
              <span className={colorClass}>{prefix} </span>
              <span>{log.text}</span>
            </div>
          );
        })}

        {isPendingAI && (
          <div className="flex items-center gap-1 text-[#8bac0f] italic pl-2 border-l-2 border-[#8bac0f]/20">
            <span>[GEMINI AI AGENT COMPUTING]</span>
            <span className="animate-bounce">.</span>
            <span className="animate-bounce delay-100">.</span>
            <span className="animate-bounce delay-200">.</span>
          </div>
        )}

        {isSyncing && (
          <div className="text-[#306230] italic pl-2 border-l-2 border-[#306230]/20 animate-pulse">
            // SUBMITTING REAL-TIME SMART CONTRACT MUTATION TO STELLAR NETWORK...
          </div>
        )}

        <div ref={logEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex border-t border-[#2a4a1a]">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          disabled={isPendingAI || isSyncing}
          placeholder={
            isSyncing
              ? 'SOROBAN LEDGER MUTATION IN PROGRESS...'
              : isPendingAI
              ? 'WAITING FOR AI AGENT DECISION...'
              : 'ENTER DIRECTIVE (e.g. "Buy passkey", "Lower firewall")...'
          }
          className="flex-1 bg-[#060c06] px-3 py-2 text-xs text-[#e0f8d0] focus:outline-none placeholder-[#3a5c1a]/60 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || isPendingAI || isSyncing}
          className="bg-[#1a3a1a] hover:bg-[#2a4a1a] text-[#8bac0f] px-4 text-xs font-bold transition disabled:opacity-30 disabled:hover:bg-[#1a3a1a] uppercase border-l border-[#2a4a1a]"
        >
          EXECUTE
        </button>
      </form>
    </div>
  );
};
