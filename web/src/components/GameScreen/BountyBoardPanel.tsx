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
    <div className="bg-[#0f260f] border border-[#2a4a1a] rounded-lg p-4 font-mono shadow-[0_0_20px_rgba(15,38,15,0.6)]">
      <div className="flex justify-between items-center pb-2 border-b border-[#2a4a1a]">
        <div className="flex items-center gap-2">
          <span className="text-[#9bbc0f]">🎯</span>
          <span className="text-xs font-bold text-[#9bbc0f] uppercase tracking-wider">
            DAILY AI BOUNTY CONTRACTS
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-[10px] bg-[#1a3a1a] hover:bg-[#2e1252] border border-[#4a6c2a] text-[#e0f8d0] px-2 py-0.5 rounded transition cursor-pointer font-bold uppercase"
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
                    : 'bg-[#0a1a0a] border-[#3a5c1a] text-[#e0f8d0]'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-[#e0f8d0] text-[11px]">{bounty.title}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      bounty.isCompleted ? 'bg-emerald-900 text-emerald-200' : 'bg-[#2a4a1a] text-[#8bac0f]'
                    }`}
                  >
                    {bounty.isCompleted ? '✓ COMPLETED' : `PROGRESS: ${bounty.currentCount}/${bounty.targetCount}`}
                  </span>
                </div>

                <p className="text-[10px] text-[#6a8a4a] leading-relaxed mb-2">{bounty.description}</p>

                {/* Progress bar */}
                <div className="w-full bg-[#060c06] h-1.5 rounded-full overflow-hidden mb-2 border border-[#2a4a1a]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      bounty.isCompleted ? 'bg-[#8bac0f]' : 'bg-[#8bac0f]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-[#527038]">
                  <span>REWARDS:</span>
                  <div className="flex gap-2">
                    <span className="text-[#8bac0f] font-bold">+{bounty.rewardReputation} REP</span>
                    <span className="text-[#9bbc0f] font-bold">+{bounty.rewardCredits} CREDITS</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[10px] text-[#527038] mt-2 flex justify-between">
          <span>● 24H GEMINI CONTRACT REFRESH</span>
          <span className="text-[#9bbc0f] font-bold">
            {bounties.filter((b) => b.isCompleted).length} / 3 CONTRACTS COMPLETED
          </span>
        </div>
      )}
    </div>
  );
};
