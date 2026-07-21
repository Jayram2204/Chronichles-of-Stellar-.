import { useState, useEffect } from 'react';
import { EventHub, GameEvents } from '../events/EventHub';
import { walletConnector } from '../blockchain/WalletConnector';
import type { WalletState } from '../blockchain/WalletConnector';
import { sorobanClient } from '../blockchain/SorobanClient';
import { stellarClient } from '../blockchain/StellarClient';
import { authService } from '../services/authService';
import { firestoreService } from '../services/firestoreService';

export interface LedgerLog {
  action: string;
  hash: string;
  ledger: number;
}

export function useGameState() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    publicKey: null,
    secretKey: null,
    network: null,
    balance: '0',
    isFreighter: false,
  });

  const [activeNpc, setActiveNpc] = useState<{ id: string | null; name: string | null }>({
    id: null,
    name: null,
  });

  const [reputation, setReputation] = useState(25);
  const [inventory, setInventory] = useState<string[]>(['Grid Credits']);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentAct, setCurrentAct] = useState(1);
  const [ledgerLogs, setLedgerLogs] = useState<LedgerLog[]>([]);
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp] = useState(100);
  const [score, setScore] = useState(0);
  const [enemyKills, setEnemyKills] = useState(0);
  const [damageFlash, setDamageFlash] = useState(false);
  const [levelClearBanner, setLevelClearBanner] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const loadOnChainState = async (publicKey: string) => {
    if (!sorobanClient.isDeployed) return;
    try {
      let playerState = await sorobanClient.getPlayer(publicKey);
      if (!playerState) {
        console.log('[useGameState] Player not initialized on-chain. Initializing...');
        playerState = await sorobanClient.initPlayer();
      }

      if (playerState) {
        setReputation(playerState.reputation);
        setCurrentLevel(playerState.level);
        const newInventory: string[] = ['Grid Credits'];
        if (playerState.has_keycard) newInventory.push('A.E.O.N. Passkey');
        if (playerState.has_firewall_pass) newInventory.push('Sector 09 Pass');
        setInventory(newInventory);
      }
    } catch (err) {
      console.warn('[useGameState] Failed loading Soroban on-chain player state:', err);
    }
  };

  useEffect(() => {
    const currentWallet = walletConnector.getState();
    setWallet(currentWallet);
    if (currentWallet.isConnected && currentWallet.publicKey) {
      loadOnChainState(currentWallet.publicKey);
    }

    const handleInteract = (data: { npcId: string | null; name: string | null }) => {
      setActiveNpc({ id: data.npcId, name: data.name });
    };

    const handleWalletConnected = (state: WalletState) => {
      setWallet(state);
      if (state.publicKey) {
        loadOnChainState(state.publicKey);
      }
    };

    const handleWalletDisconnected = () => {
      setWallet({
        isConnected: false,
        publicKey: null,
        secretKey: null,
        network: null,
        balance: '0',
        isFreighter: false,
      });
    };

    const handleTxSubmitted = () => setIsSyncing(true);

    const handleTxConfirmed = (data: {
      action: string;
      txHash: string;
      ledger: number;
      playerState?: any;
    }) => {
      setIsSyncing(false);
      setLedgerLogs((prev) => [
        { action: data.action, hash: data.txHash, ledger: data.ledger },
        ...prev,
      ]);

      if (data.playerState) {
        setReputation(data.playerState.reputation);
        setCurrentLevel(data.playerState.level);
        const newInv: string[] = ['Grid Credits'];
        if (data.playerState.has_keycard) newInv.push('A.E.O.N. Passkey');
        if (data.playerState.has_firewall_pass) newInv.push('Sector 09 Pass');
        setInventory(newInv);
      } else {
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
        } else if (data.action === 'add_reputation') {
          setReputation((prev) => Math.min(prev + 10, 100));
        }
      }
    };

    const handleTxFailed = () => setIsSyncing(false);

    const handleLevelChanged = (data: { level: number }) => {
      setCurrentLevel(data.level);
      setLevelClearBanner(false);
      setGameOver(false);
    };

    const handlePlayerDamage = (data: { hp: number; maxHp: number; _damage: number }) => {
      setPlayerHp(data.hp);
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 200);
    };

    const handlePlayerHeal = (data: { hp: number; maxHp: number }) => {
      setPlayerHp(data.hp);
    };

    const handleEnemyDeath = (data: { type: string; score: number; totalKilled: number }) => {
      setScore(data.score);
      setEnemyKills(data.totalKilled);
    };

    const handleLevelCleared = (data: { score: number; kills: number }) => {
      setLevelClearBanner(true);
      setScore(data.score);
      setEnemyKills(data.kills);

      // Sync combat progress off-chain to Cloud Firestore
      const session = authService.getSession();
      if (session.user?.id) {
        firestoreService.savePlayerStats(session.user.id, {
          score: data.score,
          enemyKills: data.kills,
          currentLevel,
          currentAct,
          reputation,
          inventory,
          updatedAt: new Date().toISOString(),
        });
      }
    };

    const handleActCompleted = (data: { act: number }) => {
      setCurrentAct(data.act);
      setLedgerLogs((prev) => [
        { action: `act_${data.act}_completed`, hash: 'SYSTEM', ledger: 0 },
        ...prev,
      ]);
    };

    const handleGameOver = () => setGameOver(true);

    const handleNpcTalk = (data: { npcId: string; message: string }) => {
      setActiveNpc({ id: data.npcId, name: data.npcId });
    };

    const handleAgentDecision = async (data: { npcId: string; decision: string }) => {
      if (data.decision === 'approve') {
        const action =
          data.npcId === 'merchant'
            ? 'unlock_keycard'
            : data.npcId === 'guard'
            ? 'open_firewall'
            : 'add_reputation';
        console.log(`[useGameState] Agent decision approved! Mutating Stellar state: ${action}`);
        await stellarClient.mutateGameState(action, { npcId: data.npcId });
      }
    };

    EventHub.on(GameEvents.INTERACT_TRIGGER, handleInteract);
    EventHub.on(GameEvents.WALLET_CONNECTED, handleWalletConnected);
    EventHub.on(GameEvents.WALLET_DISCONNECTED, handleWalletDisconnected);
    EventHub.on(GameEvents.TX_SUBMITTED, handleTxSubmitted);
    EventHub.on(GameEvents.TX_CONFIRMED, handleTxConfirmed);
    EventHub.on(GameEvents.TX_FAILED, handleTxFailed);
    EventHub.on(GameEvents.LEVEL_CHANGED, handleLevelChanged);
    EventHub.on(GameEvents.PLAYER_DAMAGE, handlePlayerDamage);
    EventHub.on(GameEvents.PLAYER_HEAL, handlePlayerHeal);
    EventHub.on(GameEvents.ENEMY_DEATH, handleEnemyDeath);
    EventHub.on(GameEvents.LEVEL_CLEARED, handleLevelCleared);
    EventHub.on(GameEvents.ACT_COMPLETED, handleActCompleted);
    EventHub.on(GameEvents.GAME_OVER, handleGameOver);
    EventHub.on(GameEvents.NPC_TALK, handleNpcTalk);
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
      EventHub.off(GameEvents.PLAYER_HEAL, handlePlayerHeal);
      EventHub.off(GameEvents.ENEMY_DEATH, handleEnemyDeath);
      EventHub.off(GameEvents.LEVEL_CLEARED, handleLevelCleared);
      EventHub.off(GameEvents.ACT_COMPLETED, handleActCompleted);
      EventHub.off(GameEvents.GAME_OVER, handleGameOver);
      EventHub.off(GameEvents.NPC_TALK, handleNpcTalk);
      EventHub.off(GameEvents.AGENT_DECISION, handleAgentDecision);
    };
  }, [currentLevel, currentAct, reputation, inventory]);

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

  return {
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
  };
}
