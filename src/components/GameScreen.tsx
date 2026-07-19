import React, { useState, useEffect } from 'react';
import { EventHub, GameEvents } from '../events/EventHub';
import { walletConnector } from '../blockchain/WalletConnector';
import type { WalletState } from '../blockchain/WalletConnector';
import { stellarClient } from '../blockchain/StellarClient';
import { TerminalUI } from './TerminalUI';

export const GameScreen: React.FC = () => {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    publicKey: null,
    secretKey: null,
    network: null,
    balance: '0',
  });

  const [activeNpc, setActiveNpc] = useState<{ id: string | null; name: string | null }>({
    id: null,
    name: null,
  });

  const [reputation, setReputation] = useState(25);
  const [inventory, setInventory] = useState<string[]>(['Credits: 50']);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [ledgerLogs, setLedgerLogs] = useState<Array<{ action: string; hash: string; ledger: number }>>([]);
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp] = useState(100);
  const [score, setScore] = useState(0);
  const [enemyKills, setEnemyKills] = useState(0);
  const [damageFlash, setDamageFlash] = useState(false);
  const [levelClearBanner, setLevelClearBanner] = useState(false);

  useEffect(() => {
    setWallet(walletConnector.getState());

    const handleInteract = (data: { npcId: string | null; name: string | null }) => {
      setActiveNpc({ id: data.npcId, name: data.name });
    };

    const handleWalletConnected = (state: WalletState) => {
      setWallet(state);
    };

    const handleWalletDisconnected = () => {
      setWallet({
        isConnected: false,
        publicKey: null,
        secretKey: null,
        network: null,
        balance: '0',
      });
    };

    const handleTxSubmitted = () => {
      setIsSyncing(true);
    };

    const handleTxConfirmed = (data: { action: string; txHash: string; ledger: number }) => {
      setIsSyncing(false);
      setLedgerLogs((prev) => [
        { action: data.action, hash: data.txHash, ledger: data.ledger },
        ...prev,
      ]);

      if (data.action === 'unlock_keycard') {
        setInventory((prev) => {
          if (!prev.includes('A.E.O.N. Passkey')) {
            return [...prev, 'A.E.O.N. Passkey'];
          }
          return prev;
        });
        setReputation((prev) => Math.min(prev + 15, 100));
        EventHub.emit('inventory_updated', { hasKeycard: true });
      } else if (data.action === 'open_firewall') {
        setInventory((prev) => [...prev.filter((i) => i !== 'A.E.O.N. Passkey'), 'Sector 09 Pass']);
        setReputation((prev) => Math.min(prev + 25, 100));
        EventHub.emit('firewall_opened');
      }
    };

    const handleTxFailed = () => {
      setIsSyncing(false);
    };

    const handleLevelChanged = (data: { level: number }) => {
      setCurrentLevel(data.level);
      setLevelClearBanner(false);
    };

    const handlePlayerDamage = (data: { hp: number; maxHp: number; _damage: number }) => {
      setPlayerHp(data.hp);
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 200);
    };

    const handleEnemyDeath = (data: { type: string; score: number; totalKilled: number }) => {
      setScore(data.score);
      setEnemyKills(data.totalKilled);
    };

    const handleLevelCleared = (data: { score: number; kills: number }) => {
      setLevelClearBanner(true);
      setScore(data.score);
      setEnemyKills(data.kills);
    };

    EventHub.on(GameEvents.INTERACT_TRIGGER, handleInteract);
    EventHub.on(GameEvents.WALLET_CONNECTED, handleWalletConnected);
    EventHub.on(GameEvents.WALLET_DISCONNECTED, handleWalletDisconnected);
    EventHub.on(GameEvents.TX_SUBMITTED, handleTxSubmitted);
    EventHub.on(GameEvents.TX_CONFIRMED, handleTxConfirmed);
    EventHub.on(GameEvents.TX_FAILED, handleTxFailed);
    EventHub.on(GameEvents.LEVEL_CHANGED, handleLevelChanged);
    EventHub.on(GameEvents.PLAYER_DAMAGE, handlePlayerDamage);
    EventHub.on(GameEvents.ENEMY_DEATH, handleEnemyDeath);
    EventHub.on(GameEvents.LEVEL_CLEARED, handleLevelCleared);

    const handleAgentDecision = async (data: { npcId: string; decision: string }) => {
      if (data.decision === 'approve') {
        const action = data.npcId === 'merchant' ? 'unlock_keycard' : 'open_firewall';
        console.log(`[GameScreen] Agent approved! Triggering Stellar transaction for: ${action}`);
        await stellarClient.mutateGameState(action, { npcId: data.npcId });
      }
    };
    EventHub.on(GameEvents.AGENT_DECISION, handleAgentDecision);

    return () => {
      EventHub.off(GameEvents.INTERACT_TRIGGER, handleInteract);
      EventHub.off(GameEvents.WALLET_CONNECTED, handleWalletConnected);
      EventHub.off(GameEvents.WALLET_DISCONNECTED, handleWalletDisconnected);
      EventHub.off(GameEvents.TX_SUBMITTED, handleTxSubmitted);
      EventHub.off(GameEvents.TX_CONFIRMED, handleTxConfirmed);
      EventHub.off(GameEvents.TX_FAILED, handleTxFailed);
      EventHub.off(GameEvents.LEVEL_CHANGED, handleLevelChanged);
      EventHub.off(GameEvents.PLAYER_DAMAGE, handlePlayerDamage);
      EventHub.off(GameEvents.ENEMY_DEATH, handleEnemyDeath);
      EventHub.off(GameEvents.LEVEL_CLEARED, handleLevelCleared);
      EventHub.off(GameEvents.AGENT_DECISION, handleAgentDecision);
    };
  }, []);

  const handleConnectWallet = async () => {
    try {
      await walletConnector.connect();
    } catch (err) {
      alert('Wallet connection failed: ' + err);
    }
  };

  const handleDisconnectWallet = () => {
    walletConnector.disconnect();
  };

  const hpPercent = Math.max(0, (playerHp / playerMaxHp) * 100);
  const hpColor = hpPercent > 50 ? '#00f3ff' : hpPercent > 25 ? '#ffaa00' : '#ff0055';

  return (
    <div className={`flex flex-col xl:flex-row w-[1200px] gap-6 bg-[#070312] p-6 border-2 border-[#1e0b36] rounded-xl shadow-[0_0_50px_rgba(30,11,54,0.7)] ${damageFlash ? 'damage-flash' : ''}`}>

      {/* Left side: Phaser Game viewport */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 font-mono">
            <h1 className="text-xl font-bold tracking-widest text-[#00f3ff] uppercase">
              Chronicles of Stellar
            </h1>
            <div className="text-xs text-[#a397db] px-3 py-1 bg-[#150a29] border border-[#30165c] rounded">
              SECTOR 0{currentLevel} // {currentLevel === 7 ? 'ANCIENT RUINS' : 'GRID NETWORKS'}
            </div>
          </div>

          {/* Combat HUD overlay */}
          <div className="relative">
            <div id="game-container" className="border-2 border-[#1e0b36] rounded-lg overflow-hidden bg-black shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" />

            {/* In-game overlay HUD */}
            <div className="absolute top-2 left-2 pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#00f3ff] font-bold">HP</span>
                <div className="w-[120px] h-[8px] bg-black/70 border border-[#00f3ff]/30 rounded-sm overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 rounded-sm"
                    style={{
                      width: `${hpPercent}%`,
                      backgroundColor: hpColor,
                      boxShadow: `0 0 6px ${hpColor}60`,
                    }}
                  />
                </div>
                <span className="text-[9px] font-mono text-white/60">{Math.ceil(playerHp)}/{playerMaxHp}</span>
              </div>
            </div>

            {/* Score display */}
            <div className="absolute top-2 right-2 pointer-events-none text-right">
              <div className="text-[10px] font-mono text-[#ffaa00] font-bold">
                SCORE: {score}
              </div>
              <div className="text-[9px] font-mono text-[#ff0055]">
                KILLS: {enemyKills}
              </div>
            </div>

            {/* Level clear banner */}
            {levelClearBanner && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="level-clear-banner text-center">
                  <div className="text-2xl font-bold text-[#00f3ff] tracking-widest font-mono drop-shadow-[0_0_20px_rgba(0,243,255,0.8)]">
                    SECTOR CLEARED
                  </div>
                  <div className="text-xs text-[#ffaa00] mt-2 font-mono">
                    +{score} PTS // {enemyKills} NEUTRALIZED
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls instructions */}
        <div className="mt-4 p-3 bg-[#0d061c] border border-[#1b0b2e] rounded text-[11px] text-[#857ab3] font-mono leading-relaxed">
          <strong className="text-[#00f3ff]">CONTROLS:</strong>{' '}
          <strong className="text-white">WASD / Arrows</strong> Move & Jump.{' '}
          <strong className="text-[#ff0055]">H</strong> Punch.{' '}
          <strong className="text-[#ff0055]">J</strong> Kick.{' '}
          Walk near NPCs to interact. Clear all enemies to advance sectors.
        </div>
      </div>

      {/* Right side: Cyberpunk HUD & Terminal Panel */}
      <div className="w-full xl:w-[420px] flex flex-col gap-5">

        {/* Wallet Connection widget */}
        <div className="bg-[#0c051a] border border-[#2d124d] rounded-lg p-4 font-mono shadow-[0_0_15px_rgba(30,11,54,0.4)]">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-[#a397db]">🌐 DECENTRALIZED IDENTITY</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${wallet.isConnected ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
              {wallet.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          {wallet.isConnected ? (
            <div className="space-y-2">
              <div className="text-xs text-[#d2c9ff] flex justify-between bg-[#150a29] p-2 rounded border border-[#230f3f] overflow-hidden">
                <span>Public Key:</span>
                <span className="text-[#00f3ff] text-[10px] self-center truncate max-w-[200px]" title={wallet.publicKey || ''}>
                  {wallet.publicKey}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-[#d2c9ff] px-2">
                <span>Account Balance:</span>
                <span className="text-[#ff0055] font-bold">{wallet.balance} XLM</span>
              </div>
              <button
                onClick={handleDisconnectWallet}
                className="w-full mt-2 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold py-1.5 rounded transition uppercase tracking-wider"
              >
                Disconnect Ledger Account
              </button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-[#857ab3] mb-3">Freighter extension or simulated local Testnet account.</p>
              <button
                onClick={handleConnectWallet}
                className="w-full bg-[#00f3ff] hover:bg-[#33f5ff] text-black text-xs font-bold py-2 rounded transition uppercase tracking-wider shadow-[0_0_10px_rgba(0,243,255,0.4)]"
              >
                Connect Wallet
              </button>
            </div>
          )}
        </div>

        {/* Character HUD metrics */}
        <div className="bg-[#0c051a] border border-[#2d124d] rounded-lg p-4 font-mono">
          <h3 className="text-xs font-bold text-[#a397db] mb-3 uppercase tracking-wider">👤 COURIER STATUS</h3>

          <div className="space-y-3">
            {/* HP bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#d2c9ff]">Health:</span>
                <span className="font-bold" style={{ color: hpColor }}>{Math.ceil(playerHp)}/{playerMaxHp}</span>
              </div>
              <div className="w-full h-2 bg-[#17082b] rounded-full overflow-hidden border border-[#28114a]">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${hpPercent}%`,
                    backgroundColor: hpColor,
                    boxShadow: `0 0 8px ${hpColor}60`,
                  }}
                />
              </div>
            </div>

            {/* Reputation bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#d2c9ff]">Grid Reputation:</span>
                <span className="text-[#00f3ff] font-bold">{reputation}/100</span>
              </div>
              <div className="w-full h-1.5 bg-[#17082b] rounded-full overflow-hidden border border-[#28114a]">
                <div
                  className="h-full bg-gradient-to-r from-[#ff0055] to-[#00f3ff] transition-all duration-500"
                  style={{ width: `${reputation}%` }}
                />
              </div>
            </div>

            {/* Combat stats */}
            <div className="flex gap-4 text-xs">
              <div className="flex-1 bg-[#150a29] p-2 rounded border border-[#230f3f] text-center">
                <div className="text-[10px] text-[#857ab3]">SCORE</div>
                <div className="text-[#ffaa00] font-bold">{score}</div>
              </div>
              <div className="flex-1 bg-[#150a29] p-2 rounded border border-[#230f3f] text-center">
                <div className="text-[10px] text-[#857ab3]">KILLS</div>
                <div className="text-[#ff0055] font-bold">{enemyKills}</div>
              </div>
              <div className="flex-1 bg-[#150a29] p-2 rounded border border-[#230f3f] text-center">
                <div className="text-[10px] text-[#857ab3]">SECTOR</div>
                <div className="text-[#00f3ff] font-bold">{currentLevel}</div>
              </div>
            </div>

            {/* Inventory */}
            <div>
              <div className="text-xs text-[#d2c9ff] mb-1.5">Cargo Inventory:</div>
              <div className="flex flex-wrap gap-2">
                {inventory.map((item, idx) => (
                  <span key={idx} className="text-[10px] bg-[#1e0a36] border border-[#441a7d] text-white px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Dialog / Terminal interface block */}
        {wallet.isConnected ? (
          activeNpc.id ? (
            <TerminalUI
              npcId={activeNpc.id}
              npcName={activeNpc.name || 'NPC'}
              reputationScore={reputation}
              isSyncing={isSyncing}
            />
          ) : (
            <div className="flex flex-col justify-center items-center h-[280px] bg-[#05020a] border border-[#1b082e] rounded-lg p-6 text-center font-mono text-xs text-[#857ab3] border-dashed">
              <span className="text-[#00f3ff] text-lg mb-2">📡 SCANNING FOR COMM-LINK</span>
              <span>Walk closer to an entity in the grid (Cyan/Magenta blocks) to open direct secure neural communication.</span>
            </div>
          )
        ) : (
          <div className="flex flex-col justify-center items-center h-[280px] bg-[#05020a] border border-[#1b082e] rounded-lg p-6 text-center font-mono text-xs text-[#ff0055] border-dashed">
            <span className="text-lg mb-2">🔒 COMM-LINK SHIELDED</span>
            <span>Establish a ledger connection (Connect Wallet) to enable decryption channels and speak with autonomous AI agents.</span>
          </div>
        )}

        {/* Ledger Transaction History feed */}
        <div className="bg-[#0c051a] border border-[#2d124d] rounded-lg p-3 font-mono flex-1 min-h-[140px] flex flex-col">
          <div className="text-[10px] font-bold text-[#a397db] mb-2 uppercase tracking-wider flex justify-between">
            <span>🔗 LEDGER TRANSACTIONS</span>
            <span className="text-[9px] text-[#00f3ff]">Horizon Testnet</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 text-[9px] text-[#a99eff] max-h-[160px]">
            {ledgerLogs.length === 0 ? (
              <div className="text-[#5b518c] italic text-center py-4">// NO ON-CHAIN TRANSACTIONS RECORDED</div>
            ) : (
              ledgerLogs.map((log, index) => (
                <div key={index} className="bg-[#120726] border border-[#230f3f] p-2 rounded space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-[#00f3ff]">{log.action.toUpperCase()}</span>
                    <span className="text-emerald-400">L#{log.ledger}</span>
                  </div>
                  <div className="text-[8px] text-[#786eb3] truncate">
                    Hash: <a href={`https://explorer.stellar.org/testnet/tx/${log.hash}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#00f3ff] underline font-mono">{log.hash}</a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
