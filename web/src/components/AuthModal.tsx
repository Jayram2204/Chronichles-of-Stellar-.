import React, { useState } from 'react';
import { authService } from '../services/authService';
import type { UserSession } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (session: UserSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthenticated }) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  if (!isOpen) return null;

  const handleWalletLogin = async () => {
    setLoadingProvider('freighter');
    setErrorMessage(null);
    try {
      const session = await authService.loginWithFreighter();
      onAuthenticated(session);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Freighter wallet connection failed.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingProvider('google');
    setErrorMessage(null);
    try {
      const session = await authService.loginWithGoogle();
      onAuthenticated(session);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Sign-In failed.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleAppleLogin = async () => {
    setLoadingProvider('apple');
    setErrorMessage(null);
    try {
      const session = await authService.loginWithApple();
      onAuthenticated(session);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Apple ID Sign-In failed.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleSendEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoadingProvider('email');
    setErrorMessage(null);
    try {
      await authService.sendEmailVerificationLink(emailInput.trim());
      setEmailSentSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Email verification failed.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGuestLogin = async () => {
    setLoadingProvider('guest');
    setErrorMessage(null);
    try {
      const session = await authService.loginAsGuest();
      onAuthenticated(session);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Guest session launch failed.');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-mono select-none">
      <div className="bg-[#0c051a] border-2 border-[#00f3ff] rounded-xl p-6 max-w-[420px] w-full space-y-4 shadow-[0_0_40px_rgba(0,243,255,0.4)] relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[#857ab3] hover:text-white text-xs font-bold px-2 py-1 bg-[#1e0a36] border border-[#441a7d] rounded cursor-pointer"
        >
          ✕ CLOSE
        </button>

        <div className="border-b border-[#2d124d] pb-2">
          <h2 className="text-sm font-bold text-[#00f3ff] tracking-widest uppercase flex items-center gap-2">
            <span>🔐</span>
            <span>CYBERPUNK AUTHENTICATION</span>
          </h2>
          <p className="text-[11px] text-[#857ab3] mt-1">
            Connect Web3 wallet or sign in with Google / Apple / Email link.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-950/80 border border-red-800 rounded text-xs text-red-300">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Web3 Wallet Connect */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-[#a397db] uppercase font-bold tracking-wider">
            Web3 Non-Custodial Wallet
          </div>
          <button
            onClick={handleWalletLogin}
            disabled={loadingProvider !== null}
            className="w-full flex items-center justify-between bg-[#00f3ff] hover:bg-[#33f5ff] text-black font-bold text-xs py-2.5 px-4 rounded transition shadow-[0_0_15px_rgba(0,243,255,0.4)] cursor-pointer disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <span>🌐</span>
              <span>Connect Freighter Wallet</span>
            </span>
            <span>{loadingProvider === 'freighter' ? 'CONNECTING...' : '→'}</span>
          </button>
        </div>

        {/* Web2 Social OAuth */}
        <div className="space-y-1.5 pt-2 border-t border-[#2d124d]">
          <div className="text-[10px] text-[#a397db] uppercase font-bold tracking-wider">
            Social OAuth &amp; Passwordless Login
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleGoogleLogin}
              disabled={loadingProvider !== null}
              className="flex items-center justify-center gap-1.5 bg-[#150a29] hover:bg-[#230f3f] border border-[#30165c] text-[#d2c9ff] text-xs font-bold py-2 px-3 rounded transition cursor-pointer"
            >
              <span>🔍</span>
              <span>{loadingProvider === 'google' ? 'Auth...' : 'Google'}</span>
            </button>

            <button
              onClick={handleAppleLogin}
              disabled={loadingProvider !== null}
              className="flex items-center justify-center gap-1.5 bg-[#150a29] hover:bg-[#230f3f] border border-[#30165c] text-white text-xs font-bold py-2 px-3 rounded transition cursor-pointer"
            >
              <span>🍎</span>
              <span>{loadingProvider === 'apple' ? 'Auth...' : 'Apple ID'}</span>
            </button>
          </div>

          {showEmailForm ? (
            emailSentSuccess ? (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded text-xs text-emerald-300 space-y-2">
                <div>✅ Verification link sent to <strong>{emailInput}</strong>! Check your inbox to complete sign-in.</div>
                <button
                  onClick={() => {
                    setShowEmailForm(false);
                    setEmailSentSuccess(false);
                  }}
                  className="w-full bg-[#00f3ff] text-black font-bold py-1.5 rounded text-xs"
                >
                  OK
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendEmailVerification} className="space-y-2 mt-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="courier@stellar.grid"
                  required
                  className="w-full bg-[#090314] border border-[#2d124d] px-3 py-1.5 text-xs text-white rounded focus:outline-none focus:border-[#00f3ff]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(false)}
                    className="flex-1 bg-[#150a29] text-xs text-[#857ab3] py-1.5 rounded font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loadingProvider !== null}
                    className="flex-1 bg-[#00f3ff] text-black text-xs py-1.5 rounded font-bold"
                  >
                    {loadingProvider === 'email' ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            )
          ) : (
            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full mt-1 flex items-center justify-center gap-1.5 bg-[#1b082e] hover:bg-[#280c42] border border-[#441a7d] text-[#00f3ff] text-xs font-bold py-2 px-3 rounded transition cursor-pointer"
            >
              <span>📧</span>
              <span>Email Verification Link / OTP</span>
            </button>
          )}
        </div>

        {/* Guest Mode */}
        <div className="pt-2 border-t border-[#2d124d] text-center">
          <button
            onClick={handleGuestLogin}
            disabled={loadingProvider !== null}
            className="text-xs text-[#857ab3] hover:text-[#00f3ff] underline font-bold transition cursor-pointer"
          >
            ⚡ Continue as Guest Courier →
          </button>
        </div>
      </div>
    </div>
  );
};
