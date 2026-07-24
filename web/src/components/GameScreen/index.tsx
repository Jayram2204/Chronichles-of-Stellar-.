import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { ErrorBoundary } from '../ErrorBoundary';
import { TerminalUI } from '../TerminalUI';
import { WalletPanel } from './WalletPanel';
import { CourierStatus } from './CourierStatus';
import { LeaderboardPanel } from './LeaderboardPanel';
import { BountyBoardPanel } from './BountyBoardPanel';
import { LedgerHistory } from './LedgerHistory';
import { OverlayHUD } from './OverlayHUD';
import type { UserSession } from '../../services/authService';

interface GameScreenProps {
  onSessionUpdate?: (session: UserSession) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ onSessionUpdate }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phaserGameRef = useRef<any>(null);
  const [activeOverlayTab, setActiveOverlayTab] = useState<'none' | 'terminal' | 'bounties' | 'leaderboard' | 'wallet' | 'ledger'>('none');

  const {
    wallet,
    activeNpc,
    reputation,
    inventory,
    isSyncing,
    currentLevel,
    currentAct,
    ledgerLogs,
    playerHp,
    playerMaxHp,
    score,
    enemyKills,
    damageFlash,
    levelClearBanner,
    gameOver,
    handleConnectWallet,
    handleDisconnectWallet,
  } = useGameState(onSessionUpdate);

  useEffect(() => {
    const mountGame = async () => {
      if (phaserGameRef.current) return;
      try {
        // @ts-expect-error game is a JS module
        const createGame = (await import('../../game/index')).default;
        phaserGameRef.current = createGame('game-container');
      } catch (err) {
        console.warn('[GameScreen] Phaser engine initialization issue:', err);
      }
    };
    mountGame();

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, []);

  // Auto-open AI Comm-Link terminal when walking near an NPC
  useEffect(() => {
    if (activeNpc.id && wallet.isConnected) {
      setActiveOverlayTab('terminal');
    }
  }, [activeNpc.id, wallet.isConnected]);

  return (
    <div
      className={`relative w-full max-w-[1240px] aspect-[3/2] min-h-[520px] max-h-[780px] bg-black border-4 border-[#1e0b36] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(30,11,54,0.9)] font-mono select-none ${
        damageFlash ? 'damage-flash' : ''
      }`}
    >
      {/* Primary Fullscreen Phaser Game Canvas */}
      <ErrorBoundary fallbackTitle="Phaser Engine Fault">
        <div id="game-container" className="w-full h-full" />
        <OverlayHUD
          playerHp={playerHp}
          playerMaxHp={playerMaxHp}
          score={score}
          enemyKills={enemyKills}
          levelClearBanner={levelClearBanner}
          gameOver={gameOver}
        />
      </ErrorBoundary>

      {/* Minimal Floating Web3 HUD Toolbar */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-30 pointer-events-auto">
        {/* Left Status Pill */}
        <div className="flex items-center gap-2 bg-[#0c051a]/90 backdrop-blur-md px-3 py-1.5 border border-[#2d124d] rounded-lg text-xs text-[#00f3ff] shadow">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold">ACT {currentAct} // SECTOR 0{currentLevel}</span>
        </div>

        {/* Right Action Overlay Triggers */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveOverlayTab(activeOverlayTab === 'terminal' ? 'none' : 'terminal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition border shadow cursor-pointer ${
              activeOverlayTab === 'terminal'
                ? 'bg-[#00f3ff] text-black border-[#00f3ff]'
                : 'bg-[#0c051a]/90 text-[#00f3ff] border-[#2d124d] hover:bg-[#1f0a3d]'
            }`}
          >
            💬 AI Comm-Link {activeNpc.id ? '🔴' : ''}
          </button>

          <button
            onClick={() => setActiveOverlayTab(activeOverlayTab === 'bounties' ? 'none' : 'bounties')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition border shadow cursor-pointer ${
              activeOverlayTab === 'bounties'
                ? 'bg-[#ffaa00] text-black border-[#ffaa00]'
                : 'bg-[#0c051a]/90 text-[#ffaa00] border-[#2d124d] hover:bg-[#1f0a3d]'
            }`}
          >
            🎯 Bounties
          </button>

          <button
            onClick={() => setActiveOverlayTab(activeOverlayTab === 'leaderboard' ? 'none' : 'leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition border shadow cursor-pointer ${
              activeOverlayTab === 'leaderboard'
                ? 'bg-[#d2c9ff] text-black border-[#d2c9ff]'
                : 'bg-[#0c051a]/90 text-[#d2c9ff] border-[#2d124d] hover:bg-[#1f0a3d]'
            }`}
          >
            🏆 Rankings
          </button>

          <button
            onClick={() => setActiveOverlayTab(activeOverlayTab === 'wallet' ? 'none' : 'wallet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition border shadow cursor-pointer ${
              activeOverlayTab === 'wallet'
                ? 'bg-emerald-400 text-black border-emerald-400'
                : 'bg-[#0c051a]/90 text-emerald-400 border-[#2d124d] hover:bg-[#1f0a3d]'
            }`}
          >
            🌐 Ledger Wallet
          </button>
        </div>
      </div>

      {/* Floating Overlay Drawer Viewport */}
      {activeOverlayTab !== 'none' && (
        <div className="absolute top-14 right-3 w-[420px] max-h-[80%] bg-[#0c051a]/95 backdrop-blur-md border-2 border-[#00f3ff] rounded-xl p-4 z-40 shadow-[0_0_40px_rgba(0,243,255,0.4)] space-y-3 overflow-y-auto pointer-events-auto">
          <div className="flex justify-between items-center pb-2 border-b border-[#2d124d]">
            <span className="text-xs font-bold text-[#00f3ff] uppercase">
              {activeOverlayTab === 'terminal' && '💬 AI NEURAL COMM-LINK'}
              {activeOverlayTab === 'bounties' && '🎯 DAILY CONTRACT BOUNTIES'}
              {activeOverlayTab === 'leaderboard' && '🏆 STELLAR HALL OF FAME'}
              {activeOverlayTab === 'wallet' && '🌐 STELLAR WALLET & REPUTATION'}
              {activeOverlayTab === 'ledger' && '📜 ON-CHAIN TRANSACTION LOGS'}
            </span>
            <button
              onClick={() => setActiveOverlayTab('none')}
              className="text-xs text-[#857ab3] hover:text-white px-2 py-0.5 bg-[#1e0a36] border border-[#441a7d] rounded font-bold cursor-pointer"
            >
              ✕ CLOSE
            </button>
          </div>

          {activeOverlayTab === 'terminal' && (
            <ErrorBoundary fallbackTitle="Terminal UI Error">
              {wallet.isConnected ? (
                activeNpc.id ? (
                  <TerminalUI
                    npcId={activeNpc.id}
                    npcName={activeNpc.name || 'NPC'}
                    reputationScore={reputation}
                    currentLevel={currentLevel}
                    currentAct={currentAct}
                    inventory={inventory}
                    enemyKills={enemyKills}
                    score={score}
                    isSyncing={isSyncing}
                  />
                ) : (
                  <div className="flex flex-col justify-center items-center h-[240px] text-center text-xs text-[#857ab3]">
                    <span className="text-[#00f3ff] text-lg mb-2">📡 SCANNING FOR COMM-LINK</span>
                    <span>Walk closer to an entity in the game world to open direct secure neural communication.</span>
                  </div>
                )
              ) : (
                <div className="flex flex-col justify-center items-center h-[240px] text-center text-xs text-[#ff0055]">
                  <span className="text-lg mb-2">🔒 COMM-LINK SHIELDED</span>
                  <span>Connect Stellar wallet to enable decryption channels and speak with autonomous AI agents.</span>
                </div>
              )}
            </ErrorBoundary>
          )}

          {activeOverlayTab === 'bounties' && (
            <ErrorBoundary fallbackTitle="Bounty Board Error">
              <BountyBoardPanel />
            </ErrorBoundary>
          )}

          {activeOverlayTab === 'leaderboard' && (
            <ErrorBoundary fallbackTitle="Leaderboard Error">
              <LeaderboardPanel />
            </ErrorBoundary>
          )}

          {activeOverlayTab === 'wallet' && (
            <ErrorBoundary fallbackTitle="Wallet Status Error">
              <WalletPanel
                wallet={wallet}
                onConnect={handleConnectWallet}
                onDisconnect={handleDisconnectWallet}
              />
              <div className="mt-3">
                <CourierStatus
                  playerHp={playerHp}
                  playerMaxHp={playerMaxHp}
                  reputation={reputation}
                  score={score}
                  enemyKills={enemyKills}
                  currentLevel={currentLevel}
                  inventory={inventory}
                />
              </div>
            </ErrorBoundary>
          )}

          {activeOverlayTab === 'ledger' && (
            <ErrorBoundary fallbackTitle="Ledger History Error">
              <LedgerHistory logs={ledgerLogs} />
            </ErrorBoundary>
          )}
        </div>
      )}
    </div>
  );
};
