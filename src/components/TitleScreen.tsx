/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Volume2, VolumeX, Wrench, Play, ShieldAlert, Sliders, Fuel, Sparkles } from 'lucide-react';
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

  // Listen for Enter / Space to start
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
    <div className="absolute inset-0 flex flex-col items-center justify-between pointer-events-none p-5 md:p-8 select-none z-20">
      {/* Top Bar with Audio & Garage */}
      <div className="w-full flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/15 text-xs font-mono font-bold text-slate-300 shadow-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="tracking-widest uppercase">DIESEL SPEC HEAVY RIG</span>
          <span className="text-amber-400 font-mono text-[11px] ml-1">V8 TURBO</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenShop}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/15 hover:border-amber-400/50 text-sm font-semibold text-slate-200 transition-colors cursor-pointer shadow-xl"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>Heavy Garage</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-xs font-bold">
              🪙 {coins}
            </span>
          </button>

          <button
            onClick={toggleSound}
            aria-label="Toggle sound"
            className="p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/15 hover:border-white/30 text-slate-300 hover:text-white transition-colors cursor-pointer shadow-xl"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Hero Centerpiece & Serious Heavy Machine Industrial Lockup */}
      <div className="flex flex-col items-center text-center my-auto pointer-events-auto max-w-2xl">
        {/* Gritty Industrial Logo */}
        <div className="relative mb-3">
          <svg className="w-88 sm:w-112 h-32 drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]" viewBox="0 0 460 125" fill="none">
            {/* Grated steel mesh motif */}
            <rect x="20" y="8" width="420" height="110" rx="14" fill="#090d16" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="2.5" />
            {/* Warning Chevron stripes on sides */}
            <path d="M26 12 L44 32 L26 52 M26 70 L44 90 L26 110" stroke="#f59e0b" strokeWidth="3" opacity="0.6" />
            <path d="M434 12 L416 32 L434 52 M434 70 L416 90 L434 110" stroke="#f59e0b" strokeWidth="3" opacity="0.6" />

            {/* Alpine mountain ridge */}
            <path
              d="M90 74 L145 36 L190 62 L230 24 L275 62 L320 38 L370 74"
              stroke="rgba(56, 189, 248, 0.45)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Main title text */}
            <text
              x="230"
              y="74"
              textAnchor="middle"
              className="font-black text-4xl fill-white tracking-widest uppercase"
              style={{ fontFamily: 'Impact, sans-serif', letterSpacing: '0.14em' }}
            >
              SNOW RUNNER
            </text>
            <text
              x="230"
              y="102"
              textAnchor="middle"
              className="font-bold text-xs tracking-widest fill-amber-400 uppercase font-mono"
              style={{ letterSpacing: '0.35em' }}
            >
              COMMERCIAL DIESEL PLOW SIMULATION
            </text>
          </svg>
        </div>

        <p className="text-slate-300 text-sm sm:text-base mb-6 max-w-lg leading-relaxed font-medium">
          Take the wheel of an 18-ton commercial diesel snowplow rig. Battle heavy drifts, engage crawler differential lock, articulate the steel blade, drop road salt, and race 4 rival municipal rigs to clear the mountain pass.
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-7 text-xs font-mono">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-white/10 text-amber-300">
            <Fuel className="w-3.5 h-3.5 text-amber-400" />
            <span>Heavy Diesel & Refueling</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-white/10 text-rose-300">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Crawler Diff-Lock [X]</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-white/10 text-sky-300">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Hydraulic Blade [Q/E/Z]</span>
          </span>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="group relative flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-lg shadow-2xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-amber-300"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span className="tracking-wide">START EXPEDITION</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-950/20 font-mono font-bold text-slate-950">
            ENTER / SPACE
          </span>
        </button>
      </div>

      {/* Heavy Rig Operational Hint Line */}
      <div className="w-full flex justify-center pointer-events-auto">
        <div className="px-5 py-2.5 rounded-xl bg-slate-950/90 backdrop-blur-md text-xs font-mono text-slate-300 tracking-wide border border-white/15 shadow-2xl flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span><span className="text-amber-400 font-bold">WASD / ARROWS</span> Drive Rig</span>
          <span><span className="text-amber-400 font-bold">SPACE</span> Turbo Boost</span>
          <span><span className="text-sky-400 font-bold">Q / E / Z</span> Angle Blade</span>
          <span><span className="text-rose-400 font-bold">X</span> Diff-Lock</span>
          <span><span className="text-cyan-400 font-bold">F</span> Salt Spreader</span>
          <span><span className="text-amber-400 font-bold">H</span> Air Horn</span>
        </div>
      </div>
    </div>
  );
};
