import React, { useState, useEffect } from 'react';
import { firestoreService } from '../../services/firestoreService';

interface LeaderboardEntry {
  uid: string;
  score: number;
  kills: number;
}

export const LeaderboardPanel: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = firestoreService.subscribeLeaderboard((data) => {
      setLeaderboard(data);
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return (
    <div className="bg-[#0f260f] border border-[#2a4a1a] rounded-lg p-4 font-mono shadow-[0_0_20px_rgba(15,38,15,0.6)]">
      <div className="flex justify-between items-center pb-2 border-b border-[#2a4a1a]">
        <div className="flex items-center gap-2">
          <span className="text-[#8bac0f]">🏆</span>
          <span className="text-xs font-bold text-[#8bac0f] uppercase tracking-wider">
            STELLAR GRID HALL OF FAME
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-[10px] bg-[#1a3a1a] hover:bg-[#2a4a1a] border border-[#4a6c2a] text-[#e0f8d0] px-2 py-0.5 rounded transition cursor-pointer font-bold uppercase"
        >
          {isOpen ? 'Collapse [-]' : 'Expand Live Top 10 [+]'}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-3 space-y-2 text-xs">
          {leaderboard.length === 0 ? (
            <div className="text-[11px] text-[#527038] italic text-center py-2">
              Syncing live ledger leaderboards from Cloud Firestore...
            </div>
          ) : (
            leaderboard.map((player, idx) => {
              const rankColor =
                idx === 0
                  ? 'text-amber-400 font-bold'
                  : idx === 1
                  ? 'text-slate-300 font-bold'
                  : idx === 2
                  ? 'text-amber-600 font-bold'
                  : 'text-[#6a8a4a]';

              const truncatedUid =
                player.uid.length > 14
                  ? `${player.uid.substring(0, 6)}...${player.uid.substring(player.uid.length - 4)}`
                  : player.uid;

              return (
                <div
                  key={player.uid}
                  className="flex items-center justify-between bg-[#0a1a0a] p-2 rounded border border-[#3a5c1a]/60"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 text-center text-xs ${rankColor}`}>#{idx + 1}</span>
                    <span className="text-[#e0f8d0] font-semibold">{truncatedUid}</span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-[#8bac0f] font-bold">{player.score} PTS</span>
                    <span className="text-[#306230]">{player.kills} KILLS</span>
                    <a
                      href={`https://explorer.stellar.org/${import.meta.env.VITE_STELLAR_NETWORK === 'PUBLIC' ? 'public' : 'testnet'}/search?term=${encodeURIComponent(player.uid)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#527038] hover:text-[#8bac0f] underline"
                    >
                      LEDGER PROOF ↗
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="text-[10px] text-[#527038] mt-2 flex justify-between">
          <span>● REAL-TIME FIRESTORE SYNC ACTIVE</span>
          <span className="text-[#8bac0f] font-bold">
            {leaderboard.length > 0 ? `#1 TOP SCORE: ${leaderboard[0].score} PTS` : 'TOP COURIERS LISTED'}
          </span>
        </div>
      )}
    </div>
  );
};
