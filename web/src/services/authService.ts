import {
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { Buffer } from 'buffer';
import { Keypair } from '@stellar/stellar-sdk';
import { auth as firebaseAuth } from './firebase';
import { firestoreService } from './firestoreService';
import { walletConnector } from '../blockchain/WalletConnector';

export interface UserSession {
  isAuthenticated: boolean;
  user: {
    id: string;
    name: string;
    email?: string;
    publicKey: string;
    provider: 'freighter' | 'google' | 'apple' | 'email_link' | 'guest';
    avatarUrl?: string;
    idToken?: string;
  } | null;
}

const SESSION_STORAGE_KEY = 'stellar_game_user_session';

class AuthService {
  private currentSession: UserSession = {
    isAuthenticated: false,
    user: null,
  };

  constructor() {
    this.loadSavedSession();
    this.initFirebaseObserver();
  }

  private loadSavedSession() {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.isAuthenticated && parsed?.user?.publicKey) {
          this.currentSession = parsed;
        }
      }
    } catch (e) {
      console.warn('[AuthService] Failed loading saved session:', e);
    }
  }

  private initFirebaseObserver() {
    onAuthStateChanged(firebaseAuth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        console.log('[AuthService] Firebase auth state changed: User signed in:', fbUser.uid);
        const idToken = await fbUser.getIdToken();
        const publicKey = await this.deriveStellarPublicKeyFromUID(fbUser.uid);

        const userData = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Authenticated Courier',
          email: fbUser.email || undefined,
          publicKey: publicKey,
          provider: ((fbUser.providerData[0]?.providerId as any) || 'google') as any,
          avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
          idToken: idToken,
        };

        this.currentSession = {
          isAuthenticated: true,
          user: userData,
        };
        this.saveSession();

        // Save off-chain user profile to Cloud Firestore
        await firestoreService.saveUserProfile({
          uid: fbUser.uid,
          displayName: userData.name,
          email: userData.email,
          avatarUrl: userData.avatarUrl,
          provider: userData.provider,
          publicKey: publicKey,
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  private async deriveStellarPublicKeyFromUID(uid: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`stellar_soroban_firebase_auth_${uid}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const seed = new Uint8Array(hashBuffer);
    const derivedKeypair = Keypair.fromRawEd25519Seed(Buffer.from(seed));
    return derivedKeypair.publicKey();
  }

  public getSession(): UserSession {
    return { ...this.currentSession };
  }

  public async loginWithFreighter(): Promise<UserSession> {
    const walletState = await walletConnector.connect();
    if (!walletState.isConnected || !walletState.publicKey) {
      throw new Error('Freighter wallet connection failed.');
    }

    this.currentSession = {
      isAuthenticated: true,
      user: {
        id: `freighter_${walletState.publicKey.substring(0, 8)}`,
        name: `Ledger User (${walletState.publicKey.substring(0, 4)}...${walletState.publicKey.substring(walletState.publicKey.length - 4)})`,
        publicKey: walletState.publicKey,
        provider: 'freighter',
      },
    };

    this.saveSession();

    await firestoreService.saveUserProfile({
      uid: this.currentSession.user!.id,
      displayName: this.currentSession.user!.name,
      provider: 'freighter',
      publicKey: walletState.publicKey,
      updatedAt: new Date().toISOString(),
    });

    return this.currentSession;
  }

  public async loginWithGoogle(): Promise<UserSession> {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      const result = await signInWithPopup(firebaseAuth, provider);
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();
      const publicKey = await this.deriveStellarPublicKeyFromUID(fbUser.uid);

      this.currentSession = {
        isAuthenticated: true,
        user: {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Google Courier',
          email: fbUser.email || undefined,
          publicKey: publicKey,
          provider: 'google',
          avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
          idToken: idToken,
        },
      };

      this.saveSession();

      await firestoreService.saveUserProfile({
        uid: fbUser.uid,
        displayName: this.currentSession.user!.name,
        email: fbUser.email || undefined,
        avatarUrl: this.currentSession.user!.avatarUrl,
        provider: 'google',
        publicKey: publicKey,
        updatedAt: new Date().toISOString(),
      });

      return this.currentSession;
    } catch (err: any) {
      console.error('[AuthService] Google OAuth Popup Error:', err);
      throw new Error(`Google Sign-In failed: ${err.message || String(err)}`);
    }
  }

  public async loginWithApple(): Promise<UserSession> {
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');

      const result = await signInWithPopup(firebaseAuth, provider);
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();
      const publicKey = await this.deriveStellarPublicKeyFromUID(fbUser.uid);

      this.currentSession = {
        isAuthenticated: true,
        user: {
          id: fbUser.uid,
          name: fbUser.displayName || 'Apple ID Courier',
          email: fbUser.email || undefined,
          publicKey: publicKey,
          provider: 'apple',
          avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
          idToken: idToken,
        },
      };

      this.saveSession();

      await firestoreService.saveUserProfile({
        uid: fbUser.uid,
        displayName: this.currentSession.user!.name,
        email: fbUser.email || undefined,
        avatarUrl: this.currentSession.user!.avatarUrl,
        provider: 'apple',
        publicKey: publicKey,
        updatedAt: new Date().toISOString(),
      });

      return this.currentSession;
    } catch (err: any) {
      console.error('[AuthService] Apple ID Sign-In Error:', err);
      throw new Error(`Apple ID Sign-In failed: ${err.message || String(err)}`);
    }
  }

  public async sendEmailVerificationLink(emailInput: string): Promise<boolean> {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(firebaseAuth, cleanEmail, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', cleanEmail);
      console.log(`[AuthService] Real verification link sent to: ${cleanEmail}`);
      return true;
    } catch (err: any) {
      console.error('[AuthService] Send Email Link Error:', err);
      throw new Error(`Email verification failed to send: ${err.message || String(err)}`);
    }
  }

  public async completeEmailLinkSignIn(): Promise<UserSession | null> {
    if (!isSignInWithEmailLink(firebaseAuth, window.location.href)) {
      return null;
    }

    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('Please confirm your email address to complete sign-in:');
    }

    if (!email) {
      throw new Error('Email verification requires confirming your email address.');
    }

    try {
      const result = await signInWithEmailLink(firebaseAuth, email, window.location.href);
      window.localStorage.removeItem('emailForSignIn');
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();
      const publicKey = await this.deriveStellarPublicKeyFromUID(fbUser.uid);

      this.currentSession = {
        isAuthenticated: true,
        user: {
          id: fbUser.uid,
          name: email.split('@')[0],
          email: email,
          publicKey: publicKey,
          provider: 'email_link',
          idToken: idToken,
        },
      };

      this.saveSession();

      await firestoreService.saveUserProfile({
        uid: fbUser.uid,
        displayName: this.currentSession.user!.name,
        email: email,
        provider: 'email_link',
        publicKey: publicKey,
        updatedAt: new Date().toISOString(),
      });

      return this.currentSession;
    } catch (err: any) {
      console.error('[AuthService] Email Link Verification Error:', err);
      throw new Error(`Email link verification failed: ${err.message || String(err)}`);
    }
  }

  public async loginAsGuest(): Promise<UserSession> {
    let savedPub = localStorage.getItem('stellar_guest_pubkey');
    if (!savedPub) {
      const pair = Keypair.random();
      savedPub = pair.publicKey();
      localStorage.setItem('stellar_guest_pubkey', savedPub);
    }

    this.currentSession = {
      isAuthenticated: true,
      user: {
        id: `guest_${savedPub.substring(0, 6)}`,
        name: 'Guest Courier',
        publicKey: savedPub,
        provider: 'guest',
      },
    };

    this.saveSession();
    return this.currentSession;
  }

  public async logout() {
    this.currentSession = {
      isAuthenticated: false,
      user: null,
    };
    localStorage.removeItem(SESSION_STORAGE_KEY);
    try {
      await firebaseSignOut(firebaseAuth);
    } catch (e) {
      console.warn('[AuthService] Firebase signout notice:', e);
    }
    walletConnector.disconnect();
  }

  private saveSession() {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.currentSession));
    } catch (e) {
      console.warn('[AuthService] Failed to save session:', e);
    }
  }
}

export const authService = new AuthService();
