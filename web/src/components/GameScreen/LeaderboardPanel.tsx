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
    <div className="bg-[#0c051a] border border-[#2d124d] rounded-lg p-4 font-mono shadow-[0_0_20px_rgba(30,11,54,0.6)]">
      <div className="flex justify-between items-center pb-2 border-b border-[#2d124d]">
        <div className="flex items-center gap-2">
          <span className="text-[#00f3ff]">🏆</span>
          <span className="text-xs font-bold text-[#00f3ff] uppercase tracking-wider">
            STELLAR GRID HALL OF FAME
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-[10px] bg-[#1e0b36] hover:bg-[#2e1252] border border-[#441a7d] text-[#d2c9ff] px-2 py-0.5 rounded transition cursor-pointer font-bold uppercase"
        >
          {isOpen ? 'Collapse [-]' : 'Expand Live Top 10 [+]'}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-3 space-y-2 text-xs">
          {leaderboard.length === 0 ? (
            <div className="text-[11px] text-[#857ab3] italic text-center py-2">
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
                  : 'text-[#a397db]';

              const truncatedUid =
                player.uid.length > 14
                  ? `${player.uid.substring(0, 6)}...${player.uid.substring(player.uid.length - 4)}`
                  : player.uid;

              return (
                <div
                  key={player.uid}
                  className="flex items-center justify-between bg-[#150a29] p-2 rounded border border-[#30165c]/60"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 text-center text-xs ${rankColor}`}>#{idx + 1}</span>
                    <span className="text-white font-semibold">{truncatedUid}</span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-[#00f3ff] font-bold">{player.score} PTS</span>
                    <span className="text-[#ff0055]">{player.kills} KILLS</span>
                    <a
                      href={`https://explorer.stellar.org/testnet/search?term=${encodeURIComponent(player.uid)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#857ab3] hover:text-[#00f3ff] underline"
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
        <div className="text-[10px] text-[#857ab3] mt-2 flex justify-between">
          <span>● REAL-TIME FIRESTORE SYNC ACTIVE</span>
          <span className="text-[#00f3ff] font-bold">
            {leaderboard.length > 0 ? `#1 TOP SCORE: ${leaderboard[0].score} PTS` : 'TOP COURIERS LISTED'}
          </span>
        </div>
      )}
    </div>
  );
};
