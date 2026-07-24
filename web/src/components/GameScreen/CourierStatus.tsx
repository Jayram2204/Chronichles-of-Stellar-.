import React from 'react';

interface CourierStatusProps {
  playerHp: number;
  playerMaxHp: number;
  reputation: number;
  score: number;
  enemyKills: number;
  currentLevel: number;
  inventory: string[];
}

export const CourierStatus: React.FC<CourierStatusProps> = ({
  playerHp,
  playerMaxHp,
  reputation,
  score,
  enemyKills,
  currentLevel,
  inventory,
}) => {
  const hpPercent = Math.max(0, (playerHp / playerMaxHp) * 100);
  const hpColor = hpPercent > 50 ? '#8bac0f' : hpPercent > 25 ? '#9bbc0f' : '#306230';

  return (
    <div className="bg-[#0f260f] border border-[#2a4a1a] rounded-lg p-4 font-mono">
      <h3 className="text-xs font-bold text-[#6a8a4a] mb-3 uppercase tracking-wider">👤 COURIER STATUS</h3>

      <div className="space-y-3">
        {/* HP bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#e0f8d0]">Health:</span>
            <span className="font-bold" style={{ color: hpColor }}>
              {Math.ceil(playerHp)}/{playerMaxHp}
            </span>
          </div>
          <div className="w-full h-2 bg-[#0a140a] rounded-full overflow-hidden border border-[#2a4a1a]">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${hpPercent}%`,
                backgroundColor: hpColor,
                boxShadow: `0 0 8px ${hpColor}60`,
              }}
            />
          </div>
        </div>

        {/* Reputation bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#e0f8d0]">Grid Reputation:</span>
            <span className="text-[#8bac0f] font-bold">{reputation}/100</span>
          </div>
          <div className="w-full h-1.5 bg-[#0a140a] rounded-full overflow-hidden border border-[#2a4a1a]">
            <div
              className="h-full bg-gradient-to-r from-[#306230] to-[#8bac0f] transition-all duration-500"
              style={{ width: `${reputation}%` }}
            />
          </div>
        </div>

        {/* Combat stats */}
        <div className="flex gap-4 text-xs">
          <div className="flex-1 bg-[#0a1a0a] p-2 rounded border border-[#2a4a1a] text-center">
            <div className="text-[10px] text-[#527038]">SCORE</div>
            <div className="text-[#9bbc0f] font-bold">{score}</div>
          </div>
          <div className="flex-1 bg-[#0a1a0a] p-2 rounded border border-[#2a4a1a] text-center">
            <div className="text-[10px] text-[#527038]">KILLS</div>
            <div className="text-[#306230] font-bold">{enemyKills}</div>
          </div>
          <div className="flex-1 bg-[#0a1a0a] p-2 rounded border border-[#2a4a1a] text-center">
            <div className="text-[10px] text-[#527038]">SECTOR</div>
            <div className="text-[#8bac0f] font-bold">{currentLevel}</div>
          </div>
        </div>

        {/* Inventory */}
        <div>
          <div className="text-xs text-[#e0f8d0] mb-1.5">Cargo Inventory:</div>
          <div className="flex flex-wrap gap-2">
            {inventory.map((item, idx) => (
              <span
                key={idx}
                className="text-[10px] bg-[#142e14] border border-[#4a6c2a] text-[#e0f8d0] px-2 py-0.5 rounded font-semibold uppercase tracking-wider"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
