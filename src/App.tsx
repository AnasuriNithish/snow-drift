/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameState, GameStats, Upgrades, CameraMode, TimeOfDay, FloatingText } from './types/game';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { ControlOverlay } from './components/ControlOverlay';
import { UpgradeShop } from './components/UpgradeShop';
import { PauseVictoryModal } from './components/PauseVictoryModal';
import { synthAudio } from './audio/synthAudio';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Game UI State
  const [gameState, setGameState] = useState<GameState>('title');
  const [cameraMode, setCameraMode] = useState<CameraMode>('isometric');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');

  // Floating notifications
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // Persistent Player Upgrades & Customization
  const [upgrades, setUpgrades] = useState<Upgrades>({
    bladeWidth: 1,
    enginePower: 1,
    heatedBlade: 1,
    boostCapacity: 1,
    snowMagnet: 1,
    paintColor: '#f97316',
  });

  // Game stats synced with engine
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    coins: 45,
    totalSnowClearedM2: 0,
    clearedPercentage: 0,
    currentCombo: 1.0,
    comboTimer: 0,
    maxCombo: 1.0,
    carsFreed: 0,
    cocoaFound: 0,
    giftsFound: 0,
    currentSpeedKmH: 0,
    boostAvailable: 100,
    isBoosting: false,
  });

  const handleFloatingText = useCallback((text: string, color: string, x: number, y: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    setFloatingTexts((prev) => [
      ...prev.slice(-6),
      { id, text, color, x, y, scale: 1, createdAt: performance.now() },
    ]);

    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 1400);
  }, []);

  const handleVictory = useCallback(() => {
    setGameState('victory');
  }, []);

  // Initialize Three.js Game Engine once in dedicated container
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new GameEngine(mountRef.current, upgrades, {
      onStatsUpdate: (newStats) => {
        setStats(newStats);
      },
      onFloatingText: handleFloatingText,
      onVictory: handleVictory,
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleFloatingText, handleVictory]);

  // Global Keyboard Shortcuts (Esc to pause, U for garage, R for reset)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused' || gameState === 'shop') {
          setGameState('playing');
        }
      } else if (e.code === 'KeyU') {
        if (gameState === 'playing') {
          setGameState('shop');
        } else if (gameState === 'shop') {
          setGameState('playing');
        }
      } else if (e.code === 'KeyR') {
        if (engineRef.current) {
          engineRef.current.resetVehicle();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [gameState]);

  // Handlers
  const handleStartGame = () => {
    setGameState('playing');
  };

  const handleOpenShop = () => {
    setGameState('shop');
  };

  const handleCloseShop = () => {
    setGameState('playing');
  };

  const handleUpgrade = (type: keyof Omit<Upgrades, 'paintColor'>, cost: number) => {
    const nextUpgrades = {
      ...upgrades,
      [type]: upgrades[type] + 1,
    };
    setUpgrades(nextUpgrades);

    if (engineRef.current) {
      engineRef.current.stats.coins -= cost;
      engineRef.current.applyUpgrades(nextUpgrades);
      setStats({ ...engineRef.current.stats });
    }
  };

  const handlePaintChange = (color: string) => {
    const nextUpgrades = {
      ...upgrades,
      paintColor: color,
    };
    setUpgrades(nextUpgrades);

    if (engineRef.current) {
      engineRef.current.applyUpgrades(nextUpgrades);
    }
  };

  const handleCameraChange = (mode: CameraMode) => {
    setCameraMode(mode);
    if (engineRef.current) {
      engineRef.current.setCameraMode(mode);
    }
  };

  const handleTimeChange = (time: TimeOfDay) => {
    setTimeOfDay(time);
    if (engineRef.current) {
      engineRef.current.setTimeOfDay(time);
    }
  };

  const handleResetVehicle = () => {
    if (engineRef.current) {
      engineRef.current.resetVehicle();
    }
  };

  const handleRestart = () => {
    // Reset vehicle and stats
    if (engineRef.current) {
      engineRef.current.resetVehicle();
      engineRef.current.stats.clearedPercentage = 0;
      engineRef.current.stats.totalSnowClearedM2 = 0;
      engineRef.current.stats.score = 0;
      engineRef.current.stats.currentCombo = 1.0;
    }
    setGameState('playing');
  };

  const handleTitleScreen = () => {
    synthAudio.stopMusic();
    setGameState('title');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Isolated Three.js WebGL Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Floating Animated Text (Combo popups & item finds) */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {floatingTexts.map((item) => (
          <div
            key={item.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 font-black text-xl sm:text-2xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] animate-out fade-out slide-out-to-top duration-1000 fill-mode-forwards"
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              color: item.color,
            }}
          >
            {item.text}
          </div>
        ))}
      </div>

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenShop={handleOpenShop}
          coins={Math.floor(stats.coins)}
        />
      )}

      {/* In-Game Active HUD */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <>
          <GameHUD
            stats={stats}
            onOpenShop={handleOpenShop}
            onPause={() => setGameState('paused')}
            onHonk={() => engineRef.current?.honk()}
          />
          <ControlOverlay
            cameraMode={cameraMode}
            onCameraChange={handleCameraChange}
            timeOfDay={timeOfDay}
            onTimeChange={handleTimeChange}
            onResetVehicle={handleResetVehicle}
          />
        </>
      )}

      {/* Upgrade Garage Modal */}
      {gameState === 'shop' && (
        <UpgradeShop
          upgrades={upgrades}
          coins={stats.coins}
          onUpgrade={handleUpgrade}
          onPaintChange={handlePaintChange}
          onClose={handleCloseShop}
        />
      )}

      {/* Pause & Victory Modals */}
      {(gameState === 'paused' || gameState === 'victory') && (
        <PauseVictoryModal
          type={gameState}
          stats={stats}
          onResume={() => setGameState('playing')}
          onRestart={handleRestart}
          onOpenShop={handleOpenShop}
          onTitleScreen={handleTitleScreen}
        />
      )}
    </div>
  );
}
