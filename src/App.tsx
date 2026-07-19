import { useEffect, useRef } from 'react';
import { initGame } from './engine/CanvasManager';
import { GameScreen } from './components/GameScreen';

function App() {
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Mount the Phaser engine directly to the game container
    if (!phaserGameRef.current) {
      phaserGameRef.current = initGame('game-container');
    }

    return () => {
      // Clean up the Phaser game instance on unmount
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#070312] m-0 p-4">
      <GameScreen />
    </div>
  );
}

export default App;
