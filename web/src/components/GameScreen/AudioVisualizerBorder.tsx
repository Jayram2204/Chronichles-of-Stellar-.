import React, { useState, useEffect } from 'react';
import { EventHub, GameEvents } from '../../events/EventHub';

export const AudioVisualizerBorder: React.FC = () => {
  const [bars, setBars] = useState<number[]>([40, 60, 30, 75, 50, 90, 45, 65]);
  const [isHitActive, setIsHitActive] = useState(false);

  useEffect(() => {
    // Audio-reactive spectrum bar simulation loop
    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map(() => Math.floor(Math.random() * 65) + 20)
      );
    }, 120);

    const handleEnemyHit = () => {
      setIsHitActive(true);
      setBars([95, 100, 90, 100, 95, 90, 85, 100]);
      setTimeout(() => setIsHitActive(false), 200);
    };

    EventHub.on(GameEvents.ENEMY_DEATH, handleEnemyHit);
    EventHub.on(GameEvents.PLAYER_DAMAGE, handleEnemyHit);

    return () => {
      clearInterval(interval);
      EventHub.off(GameEvents.ENEMY_DEATH, handleEnemyHit);
      EventHub.off(GameEvents.PLAYER_DAMAGE, handleEnemyHit);
    };
  }, []);

  return (
    <div
      className={`absolute inset-0 pointer-events-none rounded-lg z-20 border-2 transition-all duration-150 ${
        isHitActive
          ? 'border-[#ff0055] shadow-[0_0_40px_rgba(255,0,85,0.8)] chromatic-hit'
          : 'synthwave-audio-glow'
      }`}
    >
      {/* Top Audio Equalizer Visualizer Bars */}
      <div className="absolute top-2 right-3 flex items-end gap-1 h-4 z-30 opacity-70">
        {bars.map((heightPct, idx) => (
          <div
            key={idx}
            className="w-1 bg-[#00f3ff] rounded-t transition-all duration-100"
            style={{
              height: `${heightPct}%`,
              backgroundColor: heightPct > 70 ? '#ff0055' : '#00f3ff',
            }}
          />
        ))}
      </div>
    </div>
  );
};
