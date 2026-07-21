import React from 'react';
import { AudioVisualizerBorder } from './AudioVisualizerBorder';

interface OverlayHUDProps {
  playerHp: number;
  playerMaxHp: number;
  score: number;
  enemyKills: number;
  levelClearBanner: boolean;
  gameOver: boolean;
}

export const OverlayHUD: React.FC<OverlayHUDProps> = ({
  playerHp,
  playerMaxHp,
  score,
  enemyKills,
  levelClearBanner,
  gameOver,
}) => {
  const hpPercent = Math.max(0, (playerHp / playerMaxHp) * 100);
  const hpColor = hpPercent > 50 ? '#00f3ff' : hpPercent > 25 ? '#ffaa00' : '#ff0055';

  return (
    <>
      {/* CRT Scanline overlay */}
      <div className="crt-overlay" />

      {/* Audio-Reactive Synthwave Visualizer & Bloom Border */}
      <AudioVisualizerBorder />

      {/* In-game overlay HUD - Health bar */}
      <div className="absolute top-2 left-2 pointer-events-none z-20">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-[#00f3ff] font-bold">HP</span>
          <div className="w-[120px] h-[8px] bg-black/70 border border-[#00f3ff]/30 rounded-sm overflow-hidden">
            <div
              className="h-full transition-all duration-300 rounded-sm"
              style={{
                width: `${hpPercent}%`,
                backgroundColor: hpColor,
                boxShadow: `0 0 6px ${hpColor}60`,
              }}
            />
          </div>
          <span className="text-[9px] font-mono text-white/60">
            {Math.ceil(playerHp)}/{playerMaxHp}
          </span>
        </div>
      </div>

      {/* Score display */}
      <div className="absolute top-2 right-2 pointer-events-none text-right z-20 pr-12">
        <div className="text-[10px] font-mono text-[#ffaa00] font-bold">SCORE: {score}</div>
        <div className="text-[9px] font-mono text-[#ff0055]">KILLS: {enemyKills}</div>
      </div>

      {/* Level clear banner */}
      {levelClearBanner && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="level-clear-banner text-center">
            <div className="text-2xl font-bold text-[#00f3ff] tracking-widest font-mono drop-shadow-[0_0_20px_rgba(0,243,255,0.8)]">
              SECTOR CLEARED
            </div>
            <div className="text-xs text-[#ffaa00] mt-2 font-mono">
              +{score} PTS // {enemyKills} NEUTRALIZED
            </div>
          </div>
        </div>
      )}

      {/* Game Over overlay */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-none z-30">
          <div className="text-center">
            <div className="text-3xl font-bold text-[#ff0055] tracking-widest font-mono drop-shadow-[0_0_20px_rgba(255,0,85,0.8)]">
              CONNECTION LOST
            </div>
            <div className="text-xs text-[#857ab3] mt-3 font-mono">
              // SYSTEM FAILURE — RETRY SECTOR
            </div>
          </div>
        </div>
      )}
    </>
  );
};
