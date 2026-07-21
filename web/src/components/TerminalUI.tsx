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
    <div className="flex flex-col h-[280px] bg-[#0c051a] border border-[#2d124d] rounded-lg overflow-hidden font-mono shadow-[0_0_15px_rgba(30,11,54,0.5)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1b0b2e] border-b border-[#2d124d] text-xs text-[#00f3ff] uppercase tracking-wider font-bold">
        <span className="flex items-center gap-2">
          <span>{npcDef.avatarIcon}</span>
          <span>{npcDef.name}</span>
          <span className="text-[9px] text-[#a397db] font-normal">({npcDef.sector})</span>
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleMute}
            className="text-[10px] text-[#a397db] hover:text-[#00f3ff] transition cursor-pointer font-normal uppercase"
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
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs text-[#d2c9ff]">
        {logs.map((log, index) => {
          let prefix = '';
          let colorClass = 'text-[#b8adff]';

          if (log.sender === 'player') {
            prefix = '> COURIER:';
            colorClass = 'text-[#00f3ff] font-semibold';
          } else if (log.sender === 'npc') {
            prefix = `> [${npcDef.name.toUpperCase()}]:`;
            colorClass = 'text-[#ff0055] font-semibold';
          } else if (log.sender === 'system') {
            prefix = '';
            colorClass = 'text-amber-500/80 italic';
          }

          return (
            <div
              key={index}
              className={`leading-relaxed border-l-2 pl-2 ${
                log.sender === 'player'
                  ? 'border-[#00f3ff]/40'
                  : log.sender === 'npc'
                  ? 'border-[#ff0055]/40'
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
          <div className="flex items-center gap-1 text-[#00f3ff] italic pl-2 border-l-2 border-[#00f3ff]/20">
            <span>[GEMINI AI AGENT COMPUTING]</span>
            <span className="animate-bounce">.</span>
            <span className="animate-bounce delay-100">.</span>
            <span className="animate-bounce delay-200">.</span>
          </div>
        )}

        {isSyncing && (
          <div className="text-[#ff0055] italic pl-2 border-l-2 border-[#ff0055]/20 animate-pulse">
            // SUBMITTING REAL-TIME SMART CONTRACT MUTATION TO STELLAR NETWORK...
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
              ? 'SOROBAN LEDGER MUTATION IN PROGRESS...'
              : isPendingAI
              ? 'WAITING FOR AI AGENT DECISION...'
              : 'ENTER DIRECTIVE (e.g. "Buy passkey", "Lower firewall")...'
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
