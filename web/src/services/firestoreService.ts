import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { app } from './firebase';
import type { DialogueLog } from '../ai/TerminalLogic';

const db = getFirestore(app);

export interface UserProfileData {
  uid: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  provider: string;
  publicKey: string;
  updatedAt: string;
}

export interface PlayerStatsData {
  score: number;
  enemyKills: number;
  currentLevel: number;
  currentAct: number;
  reputation: number;
  inventory: string[];
  updatedAt: string;
}

export class FirestoreService {
  /**
   * Upserts the user's off-chain profile in Firestore (`users/{uid}`)
   */
  public async saveUserProfile(profile: UserProfileData): Promise<void> {
    try {
      const userRef = doc(db, 'users', profile.uid);
      await setDoc(userRef, profile, { merge: true });
      console.log('[FirestoreService] Off-chain user profile saved for:', profile.uid);
    } catch (e) {
      console.warn('[FirestoreService] Failed saving user profile to Firestore:', e);
    }
  }

  /**
   * Retrieves user profile from Firestore
   */
  public async getUserProfile(uid: string): Promise<UserProfileData | null> {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as UserProfileData;
      }
    } catch (e) {
      console.warn('[FirestoreService] Error fetching user profile:', e);
    }
    return null;
  }

  /**
   * Saves AI dialogue history to Firestore (`users/{uid}/dialogues/{npcId}`)
   */
  public async saveChatHistory(uid: string, npcId: string, logs: DialogueLog[]): Promise<void> {
    try {
      const chatRef = doc(db, 'users', uid, 'dialogues', npcId);
      const serializableLogs = logs.map((log) => ({
        sender: log.sender,
        text: log.text,
        timestamp: log.timestamp.toISOString(),
      }));
      await setDoc(chatRef, { logs: serializableLogs, updatedAt: new Date().toISOString() }, { merge: true });
      console.log(`[FirestoreService] Saved AI chat history for NPC [${npcId}]`);
    } catch (e) {
      console.warn('[FirestoreService] Error saving chat history:', e);
    }
  }

  /**
   * Fetches AI dialogue history from Firestore
   */
  public async getChatHistory(uid: string, npcId: string): Promise<DialogueLog[]> {
    try {
      const chatRef = doc(db, 'users', uid, 'dialogues', npcId);
      const snap = await getDoc(chatRef);
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.logs)) {
          return data.logs.map((item: any) => ({
            sender: item.sender,
            text: item.text,
            timestamp: new Date(item.timestamp),
          }));
        }
      }
    } catch (e) {
      console.warn('[FirestoreService] Error loading chat history:', e);
    }
    return [];
  }

  /**
   * Saves combat stats and scores to Firestore (`users/{uid}/stats/game_stats`)
   */
  public async savePlayerStats(uid: string, stats: PlayerStatsData): Promise<void> {
    try {
      const statsRef = doc(db, 'users', uid, 'stats', 'game_stats');
      await setDoc(statsRef, stats, { merge: true });
      
      const leaderRef = doc(db, 'leaderboards', uid);
      await setDoc(
        leaderRef,
        {
          uid,
          score: stats.score,
          enemyKills: stats.enemyKills,
          reputation: stats.reputation,
          currentLevel: stats.currentLevel,
          updatedAt: stats.updatedAt,
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('[FirestoreService] Error saving player stats:', e);
    }
  }

  /**
   * Subscribes to real-time updates for top 10 player leaderboard
   */
  public subscribeLeaderboard(callback: (players: Array<{ uid: string; score: number; kills: number }>) => void) {
    try {
      const q = query(collection(db, 'leaderboards'), orderBy('score', 'desc'), limit(10));
      return onSnapshot(q, (snapshot) => {
        const leaderboard = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            score: Number(data.score || 0),
            kills: Number(data.enemyKills || 0),
          };
        });
        callback(leaderboard);
      });
    } catch (e) {
      console.warn('[FirestoreService] Error setting up leaderboard listener:', e);
      return () => {};
    }
  }
}

export const firestoreService = new FirestoreService();
