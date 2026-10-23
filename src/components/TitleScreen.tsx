/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Volume2, VolumeX, Sparkles, Wrench, Play } from 'lucide-react';
import { synthAudio } from '../audio/synthAudio';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenShop: () => void;
  coins: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenShop,
  coins,
}) => {
  const [isMuted, setIsMuted] = React.useState(synthAudio.getMuted());

  // Listen for Enter / Space to start per game craft directive
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        synthAudio.init();
        synthAudio.startMusic();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  const toggleSound = () => {
    const muted = synthAudio.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      synthAudio.startMusic();
    }
  };

  const handleStart = () => {
    synthAudio.init();
    synthAudio.startMusic();
    onStartGame();
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between pointer-events-none p-6 md:p-10 select-none z-20">
      {/* Top Bar with Audio & Garage */}
      <div className="w-full flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl ui-surface border border-white/10 text-xs font-semibold text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>ALPINE DRIFT ENGINE</span>
          <span className="text-slate-500 font-mono ml-1">v2.4</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenShop}
            className="flex items-center gap-2 px-4 py-2 rounded-xl ui-surface border border-white/10 hover:border-amber-400/40 text-sm font-medium text-slate-200 transition-colors cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>Garage</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-xs">
              🪙 {coins}
            </span>
          </button>

          <button
            onClick={toggleSound}
            aria-label="Toggle sound"
            className="p-2.5 rounded-xl ui-surface border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Hero Centerpiece & Bespoke Title Lockup (Game Craft Directive) */}
      <div className="flex flex-col items-center text-center my-auto pointer-events-auto max-w-xl">
        {/* Bespoke Inline SVG Title Lockup */}
        <div className="relative mb-3">
          <svg className="w-80 sm:w-96 h-28 drop-shadow-2xl" viewBox="0 0 400 110" fill="none">
            {/* Glowing snowflake motif */}
            <path
              d="M200 4L200 106M149 29L251 81M149 81L251 29"
              stroke="rgba(56, 189, 248, 0.25)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Mountain silhouette header */}
            <path
              d="M100 65L145 28L180 52L220 18L265 52L300 65"
              stroke="rgba(248, 250, 252, 0.4)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Main title text */}
            <text
              x="200"
              y="68"
              textAnchor="middle"
              className="font-extrabold text-4xl fill-white tracking-wider"
              style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '0.12em' }}
            >
              SNOW DRIFT
            </text>
            <text
              x="200"
              y="94"
              textAnchor="middle"
              className="font-semibold text-xs tracking-widest fill-amber-400 uppercase"
              style={{ letterSpacing: '0.3em' }}
            >
              COZY ALPINE PLOW
            </text>
          </svg>
        </div>

        <p className="text-slate-300 text-sm sm:text-base mb-8 max-w-md leading-relaxed font-normal">
          Plow deep drifts, rescue stuck chalets, build massive combo multipliers, and relax to warm synth winter chords.
        </p>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="group relative flex items-center gap-3 px-9 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-lg shadow-xl shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>START PLOWING</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-950/20 font-mono font-medium text-slate-900">
            ENTER / SPACE
          </span>
        </button>
      </div>

      {/* Flat Control-Hint Line (Game Craft Directive) */}
      <div className="w-full flex justify-center pointer-events-auto">
        <div className="px-5 py-2 rounded-xl ui-surface text-xs font-mono text-slate-400 tracking-wide border border-white/10 shadow-lg">
          <span className="text-amber-400 font-semibold">WASD / ARROWS</span> Move ·{' '}
          <span className="text-amber-400 font-semibold">SPACE</span> Turbo ·{' '}
          <span className="text-amber-400 font-semibold">H / B</span> Honk / Beep ·{' '}
          <span className="text-amber-400 font-semibold">ESC</span> Pause ·{' '}
          <span className="text-amber-400 font-semibold">R</span> Reset
        </div>
      </div>
    </div>
  );
};
