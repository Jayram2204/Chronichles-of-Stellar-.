import {
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  getRedirectResult,
  signInWithRedirect,
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

type AuthProvider = NonNullable<UserSession['user']>['provider'];

const SESSION_STORAGE_KEY = 'stellar_game_user_session';

class AuthService {
  private currentSession: UserSession = {
    isAuthenticated: false,
    user: null,
  };

  /** Set while an explicit login flow (popup/redirect/email-link) is in
   *  progress so the background `onAuthStateChanged` observer does not
   *  create a duplicate session or overwrite a more-specific one. */
  private _authFlowInProgress = false;

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
    onAuthStateChanged(
      firebaseAuth,
      (fbUser: FirebaseUser | null) => {
        if (!fbUser) return;
        // Skip observer-driven session creation while an explicit login
        // flow is in progress — that flow will call createFirebaseSession
        // with the correct provider and error handling.
        if (this._authFlowInProgress) return;
        void this.createFirebaseSession(fbUser).catch((error) => {
          console.error('[AuthService] Failed to synchronize Firebase session:', error);
        });
      },
      (error) => {
        console.error('[AuthService] onAuthStateChanged error:', error);
      },
    );
  }

  private providerFromFirebaseUser(fbUser: FirebaseUser): AuthProvider {
    switch (fbUser.providerData.find((data) => data.providerId)?.providerId) {
      case 'google.com': return 'google';
      case 'apple.com': return 'apple';
      case 'emailLink':
      case 'password': return 'email_link';
      default: return 'google';
    }
  }

  private async createFirebaseSession(
    fbUser: FirebaseUser,
    provider = this.providerFromFirebaseUser(fbUser)
  ): Promise<UserSession> {
    if (this.currentSession.isAuthenticated && this.currentSession.user?.id === fbUser.uid) {
      return this.currentSession;
    }

    const idToken = await fbUser.getIdToken();
    const publicKey = await this.deriveStellarPublicKeyFromUID(fbUser.uid);
    const userData = {
      id: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Authenticated Courier',
      email: fbUser.email || undefined,
      publicKey,
      provider,
      avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
      idToken,
    };

    this.currentSession = { isAuthenticated: true, user: userData };
    this.saveSession();
    await firestoreService.saveUserProfile({
      uid: fbUser.uid,
      displayName: userData.name,
      email: userData.email,
      avatarUrl: userData.avatarUrl,
      provider: userData.provider,
      publicKey,
      updatedAt: new Date().toISOString(),
    });
    return this.currentSession;
  }

  private isPopupFallbackError(err: any): boolean {
    return ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request']
      .includes(err?.code);
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
    this._authFlowInProgress = true;
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      const result = await signInWithPopup(firebaseAuth, provider);
      return await this.createFirebaseSession(result.user, 'google');
    } catch (err: any) {
      if (this.isPopupFallbackError(err)) {
        // Redirect-based fallback for mobile / popup-blocked contexts.
        // The page will reload; completeRedirectSignIn() picks up the result.
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        await signInWithRedirect(firebaseAuth, provider);
        return this.currentSession;
      }
      console.error('[AuthService] Google OAuth Error:', err);
      throw new Error(`Google Sign-In failed: ${err.message || String(err)}`);
    } finally {
      this._authFlowInProgress = false;
    }
  }

  public async loginWithApple(): Promise<UserSession> {
    this._authFlowInProgress = true;
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');

      const result = await signInWithPopup(firebaseAuth, provider);
      return await this.createFirebaseSession(result.user, 'apple');
    } catch (err: any) {
      if (this.isPopupFallbackError(err)) {
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        await signInWithRedirect(firebaseAuth, provider);
        return this.currentSession;
      }
      console.error('[AuthService] Apple ID Sign-In Error:', err);
      throw new Error(`Apple ID Sign-In failed: ${err.message || String(err)}`);
    } finally {
      this._authFlowInProgress = false;
    }
  }

  public async sendEmailSignInLink(emailInput: string): Promise<boolean> {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    const actionCodeSettings = {
      url: new URL(import.meta.env.BASE_URL, window.location.origin).toString(),
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(firebaseAuth, cleanEmail, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', cleanEmail);
      console.log(`[AuthService] Email sign-in link sent to: ${cleanEmail}`);
      return true;
    } catch (err: any) {
      console.error('[AuthService] Send Email Sign-In Link Error:', err);
      throw new Error(`Failed to send sign-in link: ${err.message || String(err)}`);
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
      throw new Error('Email address is required to complete sign-in. Please re-open the link from your email.');
    }

    this._authFlowInProgress = true;
    try {
      const result = await signInWithEmailLink(firebaseAuth, email, window.location.href);
      window.localStorage.removeItem('emailForSignIn');
      return await this.createFirebaseSession(result.user, 'email_link');
    } catch (err: any) {
      window.localStorage.removeItem('emailForSignIn');
      console.error('[AuthService] Email Link Sign-In Error:', err);

      if (err?.code === 'auth/invalid-action-code' || err?.code === 'auth/expired-action-code') {
        throw new Error('This sign-in link has expired or is invalid. Please request a new link.');
      }
      if (err?.code === 'auth/email-already-in-use') {
        throw new Error('This email is already associated with an account. Try Google or Apple sign-in instead.');
      }
      throw new Error(`Sign-in link failed: ${err.message || String(err)}`);
    } finally {
      this._authFlowInProgress = false;
    }
  }

  public async completeRedirectSignIn(): Promise<UserSession | null> {
    try {
      const result = await getRedirectResult(firebaseAuth);
      if (!result) return null;
      return await this.createFirebaseSession(result.user);
    } catch (err: any) {
      console.error('[AuthService] Redirect sign-in error:', err);
      throw new Error(`Redirect sign-in failed: ${err.message || String(err)}`);
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
