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
  const hpColor = hpPercent > 50 ? '#00f3ff' : hpPercent > 25 ? '#ffaa00' : '#ff0055';

  return (
    <div className="bg-[#0c051a] border border-[#2d124d] rounded-lg p-4 font-mono">
      <h3 className="text-xs font-bold text-[#a397db] mb-3 uppercase tracking-wider">👤 COURIER STATUS</h3>

      <div className="space-y-3">
        {/* HP bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#d2c9ff]">Health:</span>
            <span className="font-bold" style={{ color: hpColor }}>
              {Math.ceil(playerHp)}/{playerMaxHp}
            </span>
          </div>
          <div className="w-full h-2 bg-[#17082b] rounded-full overflow-hidden border border-[#28114a]">
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
            <span className="text-[#d2c9ff]">Grid Reputation:</span>
            <span className="text-[#00f3ff] font-bold">{reputation}/100</span>
          </div>
          <div className="w-full h-1.5 bg-[#17082b] rounded-full overflow-hidden border border-[#28114a]">
            <div
              className="h-full bg-gradient-to-r from-[#ff0055] to-[#00f3ff] transition-all duration-500"
              style={{ width: `${reputation}%` }}
            />
          </div>
        </div>

        {/* Combat stats */}
        <div className="flex gap-4 text-xs">
          <div className="flex-1 bg-[#150a29] p-2 rounded border border-[#230f3f] text-center">
            <div className="text-[10px] text-[#857ab3]">SCORE</div>
            <div className="text-[#ffaa00] font-bold">{score}</div>
          </div>
          <div className="flex-1 bg-[#150a29] p-2 rounded border border-[#230f3f] text-center">
            <div className="text-[10px] text-[#857ab3]">KILLS</div>
            <div className="text-[#ff0055] font-bold">{enemyKills}</div>
          </div>
          <div className="flex-1 bg-[#150a29] p-2 rounded border border-[#230f3f] text-center">
            <div className="text-[10px] text-[#857ab3]">SECTOR</div>
            <div className="text-[#00f3ff] font-bold">{currentLevel}</div>
          </div>
        </div>

        {/* Inventory */}
        <div>
          <div className="text-xs text-[#d2c9ff] mb-1.5">Cargo Inventory:</div>
          <div className="flex flex-wrap gap-2">
            {inventory.map((item, idx) => (
              <span
                key={idx}
                className="text-[10px] bg-[#1e0a36] border border-[#441a7d] text-white px-2 py-0.5 rounded font-semibold uppercase tracking-wider"
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
