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

  useEffect(() => {
    const setKeyboardEnabled = (event: Event) => {
      const enabled = (event as CustomEvent<{ enabled?: boolean }>).detail?.enabled;
      const keyboard = phaserGameRef.current?.input?.keyboard;
      if (!keyboard || typeof enabled !== 'boolean') return;

      // Reset avoids a movement/action key remaining pressed when focus moves
      // between React inputs and Phaser's global keyboard listener.
      keyboard.reset(false);
      keyboard.enabled = enabled;
    };

    window.addEventListener('stellar-game-keyboard', setKeyboardEnabled);
    return () => window.removeEventListener('stellar-game-keyboard', setKeyboardEnabled);
  }, []);

  // Auto-open AI Comm-Link terminal when walking near an NPC
  useEffect(() => {
    if (activeNpc.id && wallet.isConnected) {
      setActiveOverlayTab('terminal');
    }
  }, [activeNpc.id, wallet.isConnected]);

  return (
    <div
      className={`flex flex-col w-full max-w-[1240px] bg-black border-4 border-[#1a3a1a] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(15,38,15,0.9)] font-mono select-none ${
        damageFlash ? 'damage-flash' : ''
      }`}
    >
      {/* Web3 HUD Toolbar — sits ABOVE the canvas */}
      <div className="w-full flex justify-between items-center bg-[#0f260f]/90 backdrop-blur-md px-3 py-2 border-b border-[#2a4a1a] z-30 shrink-0">
        {/* Left Status Pill */}
        <div className="flex items-center gap-2 text-xs text-[#8bac0f]">
          <span className="w-2 h-2 rounded-full bg-[#8bac0f] animate-pulse" />
          <span className="font-bold">ACT {currentAct} // SECTOR 0{currentLevel}</span>
        </div>

        {/* Right Action Overlay Triggers */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveOverlayTab(activeOverlayTab === 'terminal' ? 'none' : 'terminal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition border shadow cursor-pointer ${
              activeOverlayTab === 'terminal'
                ? 'bg-[#9bbc0f] text-black border-[#9bbc0f]'
                : 'bg-[#0f260f]/90 text-[#8bac0f] border-[#2a4a1a] hover:bg-[#1a2e1a]'
            }`}
          >
            💬 AI Comm-Link {activeNpc.id ? '🔴' : ''}
          </button>

          <button
            onClick={() => setActiveOverlayTab(activeOverlayTab === 'bounties' ? 'none' : 'bounties')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition border shadow cursor-pointer ${
              activeOverlayTab === 'bounties'
                ? 'bg-[#9bbc0f] text-black border-[#9bbc0f]'
                : 'bg-[#0f260f]/90 text-[#9bbc0f] border-[#2a4a1a] hover:bg-[#1a2e1a]'
            }`}
          >
            🎯 Bounties
          </button>

          <button
            onClick={() => setActiveOverlayTab(activeOverlayTab === 'leaderboard' ? 'none' : 'leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition border shadow cursor-pointer ${
              activeOverlayTab === 'leaderboard'
                ? 'bg-[#e0f8d0] text-black border-[#e0f8d0]'
                : 'bg-[#0f260f]/90 text-[#e0f8d0] border-[#2a4a1a] hover:bg-[#1a2e1a]'
            }`}
          >
            🏆 Rankings
          </button>

          <button
            onClick={() => setActiveOverlayTab(activeOverlayTab === 'wallet' ? 'none' : 'wallet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition border shadow cursor-pointer ${
              activeOverlayTab === 'wallet'
                ? 'bg-[#8bac0f] text-black border-[#8bac0f]'
                : 'bg-[#0f260f]/90 text-[#8bac0f] border-[#2a4a1a] hover:bg-[#1a2e1a]'
            }`}
          >
            🌐 Ledger Wallet
          </button>
        </div>
      </div>

      {/* Canvas Container — strict 3:2 aspect ratio */}
      <div className="relative w-full aspect-[3/2] min-h-0">
        {/* Phaser Game Canvas */}
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

        {/* Floating Overlay Drawer Viewport */}
        {activeOverlayTab !== 'none' && (
          <div className="absolute top-2 right-2 w-[420px] max-h-[80%] bg-[#0f260f]/95 backdrop-blur-md border-2 border-[#8bac0f] rounded-xl p-4 z-40 shadow-[0_0_40px_rgba(139,172,15,0.4)] space-y-3 overflow-y-auto pointer-events-auto">
            <div className="flex justify-between items-center pb-2 border-b border-[#2a4a1a]">
              <span className="text-xs font-bold text-[#8bac0f] uppercase">
                {activeOverlayTab === 'terminal' && '💬 AI NEURAL COMM-LINK'}
                {activeOverlayTab === 'bounties' && '🎯 DAILY CONTRACT BOUNTIES'}
                {activeOverlayTab === 'leaderboard' && '🏆 STELLAR HALL OF FAME'}
                {activeOverlayTab === 'wallet' && '🌐 STELLAR WALLET & REPUTATION'}
                {activeOverlayTab === 'ledger' && '📜 ON-CHAIN TRANSACTION LOGS'}
              </span>
              <button
                onClick={() => setActiveOverlayTab('none')}
                className="text-xs text-[#527038] hover:text-[#e0f8d0] px-2 py-0.5 bg-[#1a3a1a] border border-[#4a6c2a] rounded font-bold cursor-pointer"
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
                    <div className="flex flex-col justify-center items-center h-[240px] text-center text-xs text-[#527038]">
                      <span className="text-[#8bac0f] text-lg mb-2">📡 SCANNING FOR COMM-LINK</span>
                      <span>Walk closer to an entity in the game world to open direct secure neural communication.</span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col justify-center items-center h-[240px] text-center text-xs text-[#306230]">
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
    </div>
  );
};
