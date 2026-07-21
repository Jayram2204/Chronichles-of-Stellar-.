import { useState, useEffect } from 'react';
import { GameScreen } from './components/GameScreen';
import { AuthModal } from './components/AuthModal';
import { authService } from './services/authService';
import type { UserSession } from './services/authService';

function App() {
  const [session, setSession] = useState<UserSession>({
    isAuthenticated: false,
    user: null,
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    // Load existing session or auto-initialize guest session on first run
    const activeSession = authService.getSession();
    if (activeSession.isAuthenticated) {
      setSession(activeSession);
    } else {
      // Auto-launch guest session so game plays directly on startup
      authService.loginAsGuest().then((guestSession) => {
        setSession(guestSession);
      });
    }

    // Check for incoming email sign-in link
    authService.completeEmailLinkSignIn().then((linkSession) => {
      if (linkSession) {
        setSession(linkSession);
      }
    });
  }, []);

  const handleAuthenticated = (newSession: UserSession) => {
    setSession(newSession);
  };

  const handleLogout = () => {
    authService.logout();
    authService.loginAsGuest().then((guestSession) => {
      setSession(guestSession);
    });
  };

  return (
    <div className="min-h-screen bg-[#070312] flex flex-col items-center justify-between p-3 lg:p-4 font-mono select-none">
      {/* Top Session Identity Banner */}
      <header className="w-full max-w-[1280px] mb-3 px-4 py-2 bg-[#0c051a] border border-[#2d124d] rounded-lg flex justify-between items-center text-xs shadow-[0_0_15px_rgba(30,11,54,0.5)]">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>GAME ACTIVE</span>
          </span>
          <span className="text-[#d2c9ff] font-bold">{session.user?.name || 'Courier'}</span>
          <span className="text-[10px] px-2 py-0.5 bg-[#150a29] border border-[#30165c] text-[#00f3ff] rounded uppercase">
            {session.user?.provider || 'Guest'} Mode
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="text-[11px] bg-[#1e0a36] hover:bg-[#2d0f52] border border-[#441a7d] text-[#00f3ff] font-bold px-3 py-1 rounded transition cursor-pointer"
          >
            🔑 {session.user?.provider === 'guest' ? 'CONNECT WALLET / AUTH' : 'CHANGE IDENTITY'}
          </button>

          {session.user?.provider !== 'guest' && (
            <button
              onClick={handleLogout}
              className="text-[11px] text-[#ff0055] hover:text-red-400 font-bold underline cursor-pointer"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Primary Game UI (Phaser Engine Canvas + Cyberware HUD) */}
      <main className="w-full max-w-[1280px] flex justify-center">
        <GameScreen />
      </main>

      {/* Lightweight Auth & Wallet Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}

export default App;
