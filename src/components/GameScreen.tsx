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

  const [reputation, setReputation] = useState(25); // Starts at 25
  const [inventory, setInventory] = useState<string[]>(['Credits: 50']);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [ledgerLogs, setLedgerLogs] = useState<Array<{ action: string; hash: string; ledger: number }>>([]);

  useEffect(() => {
    // Sync initial wallet state
    setWallet(walletConnector.getState());

    // Event listeners
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

      // Apply on-chain mutation local state updates
      if (data.action === 'unlock_keycard') {
        setInventory((prev) => {
          if (!prev.includes('A.E.O.N. Passkey')) {
            return [...prev, 'A.E.O.N. Passkey'];
          }
          return prev;
        });
        setReputation((prev) => Math.min(prev + 15, 100));
        // Tell Phaser that the player has the keycard
        EventHub.emit('inventory_updated', { hasKeycard: true });
      } else if (data.action === 'open_firewall') {
        setInventory((prev) => [...prev.filter((i) => i !== 'A.E.O.N. Passkey'), 'Sector 09 Pass']);
        setReputation((prev) => Math.min(prev + 25, 100));
        // Tell Phaser to lower the firewall
        EventHub.emit('firewall_opened');
      }
    };

    const handleTxFailed = () => {
      setIsSyncing(false);
    };

    const handleLevelChanged = (data: { level: number }) => {
      setCurrentLevel(data.level);
    };

    EventHub.on(GameEvents.INTERACT_TRIGGER, handleInteract);
    EventHub.on(GameEvents.WALLET_CONNECTED, handleWalletConnected);
    EventHub.on(GameEvents.WALLET_DISCONNECTED, handleWalletDisconnected);
    EventHub.on(GameEvents.TX_SUBMITTED, handleTxSubmitted);
    EventHub.on(GameEvents.TX_CONFIRMED, handleTxConfirmed);
    EventHub.on(GameEvents.TX_FAILED, handleTxFailed);
    EventHub.on(GameEvents.LEVEL_CHANGED, handleLevelChanged);

    // Subscribe to Phaser agent approval and trigger Stellar client
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

  return (
    <div className="flex flex-col xl:flex-row w-[1200px] gap-6 bg-[#070312] p-6 border-2 border-[#1e0b36] rounded-xl shadow-[0_0_50px_rgba(30,11,54,0.7)]">
      
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
          
          {/* Game viewport parent */}
          <div id="game-container" className="border-2 border-[#1e0b36] rounded-lg overflow-hidden bg-black shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" />
        </div>

        {/* Keyboard instructions */}
        <div className="mt-4 p-3 bg-[#0d061c] border border-[#1b0b2e] rounded text-[11px] text-[#857ab3] font-mono leading-relaxed">
          🎮 <strong className="text-[#00f3ff]">CONTROLS:</strong> Use Keyboard <strong className="text-white">Arrow Keys (←, ↑, →)</strong> to run and jump. Walk near NPCs to interact. Walk to the right edge of the screen to advance sectors once the firewall gateway is cleared.
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

            {/* Inventory */}
            <div>
              <div className="text-xs text-[#d2c9ff] mb-1.5">Cargo Inventory:</div>
              <div className="flex flex-wrap gap-2">
                {inventory.map((item, idx) => (
                  <span key={idx} className="text-[10px] bg-[#1e0a36] border border-[#441a7d] text-white px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                    📦 {item}
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
