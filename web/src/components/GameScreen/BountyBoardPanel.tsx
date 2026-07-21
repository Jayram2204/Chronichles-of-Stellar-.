import React, { useState, useEffect } from 'react';
import { dailyBountyManager } from '../../ai/DailyBountyManager';
import type { BountyContract } from '../../ai/DailyBountyManager';
import { EventHub } from '../../events/EventHub';

export const BountyBoardPanel: React.FC = () => {
  const [bounties, setBounties] = useState<BountyContract[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const refreshBounties = () => {
    setBounties(dailyBountyManager.getBounties());
  };

  useEffect(() => {
    refreshBounties();

    const handleBountyUpdate = () => {
      refreshBounties();
    };

    EventHub.on('bounty_completed', handleBountyUpdate);
    return () => {
      EventHub.off('bounty_completed', handleBountyUpdate);
    };
  }, []);

  return (
    <div className="bg-[#0c051a] border border-[#2d124d] rounded-lg p-4 font-mono shadow-[0_0_20px_rgba(30,11,54,0.6)]">
      <div className="flex justify-between items-center pb-2 border-b border-[#2d124d]">
        <div className="flex items-center gap-2">
          <span className="text-[#ffaa00]">🎯</span>
          <span className="text-xs font-bold text-[#ffaa00] uppercase tracking-wider">
            DAILY AI BOUNTY CONTRACTS
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-[10px] bg-[#1e0b36] hover:bg-[#2e1252] border border-[#441a7d] text-[#d2c9ff] px-2 py-0.5 rounded transition cursor-pointer font-bold uppercase"
        >
          {isOpen ? 'Collapse [-]' : 'View Bounties (3) [+]'}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-3 space-y-3.5 text-xs">
          {bounties.map((bounty) => {
            const pct = Math.min(100, Math.round((bounty.currentCount / bounty.targetCount) * 100));

            return (
              <div
                key={bounty.id}
                className={`p-3 rounded border transition ${
                  bounty.isCompleted
                    ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                    : 'bg-[#150a29] border-[#30165c] text-[#d2c9ff]'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-white text-[11px]">{bounty.title}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      bounty.isCompleted ? 'bg-emerald-900 text-emerald-200' : 'bg-[#230f3f] text-[#00f3ff]'
                    }`}
                  >
                    {bounty.isCompleted ? '✓ COMPLETED' : `PROGRESS: ${bounty.currentCount}/${bounty.targetCount}`}
                  </span>
                </div>

                <p className="text-[10px] text-[#a397db] leading-relaxed mb-2">{bounty.description}</p>

                {/* Progress bar */}
                <div className="w-full bg-[#090314] h-1.5 rounded-full overflow-hidden mb-2 border border-[#2d124d]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      bounty.isCompleted ? 'bg-emerald-400' : 'bg-[#00f3ff]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-[#857ab3]">
                  <span>REWARDS:</span>
                  <div className="flex gap-2">
                    <span className="text-[#00f3ff] font-bold">+{bounty.rewardReputation} REP</span>
                    <span className="text-[#ffaa00] font-bold">+{bounty.rewardCredits} CREDITS</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[10px] text-[#857ab3] mt-2 flex justify-between">
          <span>● 24H GEMINI CONTRACT REFRESH</span>
          <span className="text-[#ffaa00] font-bold">
            {bounties.filter((b) => b.isCompleted).length} / 3 CONTRACTS COMPLETED
          </span>
        </div>
      )}
    </div>
  );
};
