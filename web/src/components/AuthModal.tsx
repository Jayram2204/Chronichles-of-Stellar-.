import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import type { UserSession } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  initialError?: string | null;
  onClose: () => void;
  onAuthenticated: (session: UserSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialError, onClose, onAuthenticated }) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const setGameKeyboardEnabled = (enabled: boolean) => {
    window.dispatchEvent(new CustomEvent('stellar-game-keyboard', {
      detail: { enabled },
    }));
  };

  // Always restore controls if the modal is closed or this component unmounts
  // while the email field owns focus.
  useEffect(() => {
    if (!isOpen) setGameKeyboardEnabled(true);
    return () => setGameKeyboardEnabled(true);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && initialError) setErrorMessage(initialError);
  }, [isOpen, initialError]);

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

  const handleSendEmailSignInLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoadingProvider('email');
    setErrorMessage(null);
    try {
      await authService.sendEmailSignInLink(emailInput.trim());
      setEmailSentSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send sign-in link.');
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
      <div className="bg-[#0f260f] border-2 border-[#8bac0f] rounded-xl p-6 max-w-[420px] w-full space-y-4 shadow-[0_0_40px_rgba(139,172,15,0.4)] relative">
        {/* Close Button */}
        <button
          onClick={() => {
            setGameKeyboardEnabled(true);
            onClose();
          }}
          className="absolute top-3 right-3 text-[#527038] hover:text-[#e0f8d0] text-xs font-bold px-2 py-1 bg-[#142e14] border border-[#4a6c2a] rounded cursor-pointer"
        >
          ✕ CLOSE
        </button>

        <div className="border-b border-[#2a4a1a] pb-2">
          <h2 className="text-sm font-bold text-[#8bac0f] tracking-widest uppercase flex items-center gap-2">
            <span>🔐</span>
            <span>CYBERPUNK AUTHENTICATION</span>
          </h2>
          <p className="text-[11px] text-[#527038] mt-1">
            Connect Web3 wallet or sign in with Google / Apple / Email link.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#1a2a1a]/80 border border-[#3a5c1a] rounded text-xs text-[#527038]">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Web3 Wallet Connect */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-[#6a8a4a] uppercase font-bold tracking-wider">
            Web3 Non-Custodial Wallet
          </div>
          <button
            onClick={handleWalletLogin}
            disabled={loadingProvider !== null}
            className="w-full flex items-center justify-between bg-[#8bac0f] hover:bg-[#a8cc1a] text-[#e0f8d0] font-bold text-xs py-2.5 px-4 rounded transition shadow-[0_0_15px_rgba(139,172,15,0.4)] cursor-pointer disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <span>🌐</span>
              <span>Connect Freighter Wallet</span>
            </span>
            <span>{loadingProvider === 'freighter' ? 'CONNECTING...' : '→'}</span>
          </button>
        </div>

        {/* Web2 Social OAuth */}
        <div className="space-y-1.5 pt-2 border-t border-[#2a4a1a]">
          <div className="text-[10px] text-[#6a8a4a] uppercase font-bold tracking-wider">
            Social OAuth &amp; Passwordless Login
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleGoogleLogin}
              disabled={loadingProvider !== null}
              className="flex items-center justify-center gap-1.5 bg-[#0a1a0a] hover:bg-[#2a4a1a] border border-[#3a5c1a] text-[#e0f8d0] text-xs font-bold py-2 px-3 rounded transition cursor-pointer"
            >
              <span>🔍</span>
              <span>{loadingProvider === 'google' ? 'Auth...' : 'Google'}</span>
            </button>

            <button
              onClick={handleAppleLogin}
              disabled={loadingProvider !== null}
              className="flex items-center justify-center gap-1.5 bg-[#0a1a0a] hover:bg-[#2a4a1a] border border-[#3a5c1a] text-[#e0f8d0] text-xs font-bold py-2 px-3 rounded transition cursor-pointer"
            >
              <span>🍎</span>
              <span>{loadingProvider === 'apple' ? 'Auth...' : 'Apple ID'}</span>
            </button>
          </div>

          {showEmailForm ? (
            emailSentSuccess ? (
              <div className="p-3 bg-[#0a1a0a]/80 border border-[#4a6c2a] rounded text-xs text-[#8bac0f] space-y-2">
                <div>✅ Sign-in link sent to <strong>{emailInput}</strong>! Check your inbox to complete sign-in.</div>
                <button
                  onClick={() => {
                    setShowEmailForm(false);
                    setEmailSentSuccess(false);
                  }}
                  className="w-full bg-[#8bac0f] text-[#e0f8d0] font-bold py-1.5 rounded text-xs"
                >
                  OK
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendEmailSignInLink} className="space-y-2 mt-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onFocus={() => setGameKeyboardEnabled(false)}
                  onBlur={() => setGameKeyboardEnabled(true)}
                  placeholder="courier@stellar.grid"
                  required
                  className="w-full bg-[#060c06] border border-[#2a4a1a] px-3 py-1.5 text-xs text-[#e0f8d0] rounded focus:outline-none focus:border-[#8bac0f]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGameKeyboardEnabled(true);
                      setShowEmailForm(false);
                    }}
                    className="flex-1 bg-[#0a1a0a] text-xs text-[#527038] py-1.5 rounded font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loadingProvider !== null}
                    className="flex-1 bg-[#8bac0f] text-[#e0f8d0] text-xs py-1.5 rounded font-bold"
                  >
                    {loadingProvider === 'email' ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            )
          ) : (
            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full mt-1 flex items-center justify-center gap-1.5 bg-[#142414] hover:bg-[#1e361e] border border-[#4a6c2a] text-[#8bac0f] text-xs font-bold py-2 px-3 rounded transition cursor-pointer"
            >
              <span>📧</span>
              <span>Email Sign-in Link</span>
            </button>
          )}
        </div>

        {/* Guest Mode */}
        <div className="pt-2 border-t border-[#2a4a1a] text-center">
          <button
            onClick={handleGuestLogin}
            disabled={loadingProvider !== null}
            className="text-xs text-[#527038] hover:text-[#8bac0f] underline font-bold transition cursor-pointer"
          >
            ⚡ Continue as Guest Courier →
          </button>
        </div>
      </div>
    </div>
  );
};
