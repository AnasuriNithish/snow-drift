/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameStats } from '../types/game';
import { Wrench, Pause, Zap, Coffee, Gift, Car, Sparkles, Volume2, VolumeX, Megaphone } from 'lucide-react';
import { synthAudio } from '../audio/synthAudio';

interface GameHUDProps {
  stats: GameStats;
  onOpenShop: () => void;
  onPause: () => void;
  onHonk?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({ stats, onOpenShop, onPause, onHonk }) => {
  const [isMuted, setIsMuted] = React.useState(synthAudio.getMuted());

  const getRankColor = (combo: number) => {
    if (combo >= 7.0) return 'text-purple-400 border-purple-500/40 bg-purple-950/80';
    if (combo >= 5.0) return 'text-rose-400 border-rose-500/40 bg-rose-950/80';
    if (combo >= 3.5) return 'text-amber-400 border-amber-500/40 bg-amber-950/80';
    if (combo >= 2.2) return 'text-sky-400 border-sky-500/40 bg-sky-950/80';
    if (combo >= 1.5) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/80';
    return 'text-slate-300 border-white/10 bg-slate-900/80';
  };

  const getRankName = (combo: number) => {
    if (combo >= 7.0) return 'ARCTIC TITAN';
    if (combo >= 5.0) return 'WHITE-OUT';
    if (combo >= 3.5) return 'AVALANCHE';
    if (combo >= 2.2) return 'BLIZZARD';
    if (combo >= 1.5) return 'FLURRY';
    return 'POWDER';
  };

  const toggleSound = () => {
    const muted = synthAudio.toggleMute();
    setIsMuted(muted);
  };

  const hasActiveCombo = stats.currentCombo > 1.1;

  return (
    <div className="absolute inset-0 pointer-events-none select-none p-4 md:p-6 flex flex-col justify-between z-10">
      {/* --- TOP ROW --- */}
      <div className="w-full flex items-start justify-between">
        {/* Top Left: Clearance Mission Progress */}
        <div className="pointer-events-auto flex flex-col gap-1.5 p-3.5 rounded-2xl ui-surface border border-white/10 shadow-lg min-w-[210px]">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>SNOW CLEARED</span>
            </span>
            <span className="font-mono tabular-nums text-sky-300 font-bold text-sm">
              {stats.clearedPercentage}% <span className="text-slate-500 text-xs font-normal">/ 85%</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-amber-400 transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (stats.clearedPercentage / 85) * 100)}%` }}
            />
            {/* Target 85% tick indicator */}
            <div className="absolute top-0 bottom-0 right-[0%] w-0.5 bg-amber-400/80" />
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>AREA: {Math.round(stats.totalSnowClearedM2)} m²</span>
            <span>OBJ: 85%</span>
          </div>
        </div>

        {/* Top Center: Dynamic Combo Multiplier Banner */}
        <div
          className={`transition-all duration-200 transform ${
            hasActiveCombo ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 -translate-y-4 pointer-events-none'
          }`}
        >
          <div className={`px-5 py-2.5 rounded-2xl border shadow-2xl flex flex-col items-center ${getRankColor(stats.currentCombo)}`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-bounce" />
              <span className="font-mono font-black text-2xl tracking-tight tabular-nums">
                {stats.currentCombo.toFixed(1)}x
              </span>
              <span className="font-extrabold text-sm tracking-wider uppercase">
                {getRankName(stats.currentCombo)}
              </span>
            </div>

            {/* Combo decay timer bar */}
            <div className="w-full h-1 bg-black/40 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-current transition-all duration-75"
                style={{ width: `${Math.min(100, (stats.comboTimer / 2.4) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top Right: Score & Collectibles Cluster */}
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Collectibles count */}
          <div className="hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-2xl ui-surface border border-white/10 text-xs font-mono">
            <div className="flex items-center gap-1 text-orange-400" title="Hot Cocoa Mugs Found">
              <Coffee className="w-3.5 h-3.5" />
              <span className="tabular-nums font-bold">{stats.cocoaFound}/3</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400" title="Holiday Gifts Found">
              <Gift className="w-3.5 h-3.5" />
              <span className="tabular-nums font-bold">{stats.giftsFound}/3</span>
            </div>
            <div className="flex items-center gap-1 text-blue-400" title="Cars Rescued">
              <Car className="w-3.5 h-3.5" />
              <span className="tabular-nums font-bold">{stats.carsFreed}/3</span>
            </div>
          </div>

          {/* Score & Coins */}
          <div className="flex flex-col items-end gap-1 px-4 py-2 rounded-2xl ui-surface border border-white/10 shadow-lg">
            <div className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">SCORE</div>
            <div className="font-mono font-black text-lg text-white tabular-nums tracking-wide">
              {stats.score.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono font-bold">
              <span>🪙</span>
              <span className="tabular-nums">{Math.floor(stats.coins)}</span>
            </div>
          </div>

          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="p-2.5 rounded-2xl ui-surface border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* --- BOTTOM ROW --- */}
      <div className="w-full flex items-end justify-between">
        {/* Bottom Left: Speedometer & Nitro Boost Gauge */}
        <div className="pointer-events-auto flex items-center gap-3 p-3.5 rounded-2xl ui-surface border border-white/10 shadow-lg">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">SPEED</span>
            <div className="font-mono font-black text-2xl text-white tabular-nums leading-none mt-0.5">
              {stats.currentSpeedKmH}
              <span className="text-xs text-slate-400 font-normal ml-1">km/h</span>
            </div>
          </div>

          <div className="w-px h-8 bg-white/10 mx-1" />

          {/* Boost Nitro Gauge */}
          <div className="flex flex-col gap-1 w-28">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 text-sky-400 font-bold">
                <Zap className="w-3 h-3 fill-sky-400" />
                <span>BOOST</span>
              </span>
              <span className="text-slate-300 tabular-nums">{stats.boostAvailable}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-white/5">
              <div
                className={`h-full transition-all duration-100 rounded-full ${
                  stats.isBoosting ? 'bg-amber-400' : 'bg-sky-400'
                }`}
                style={{ width: `${stats.boostAvailable}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-500 font-mono text-center">SPACE TO BOOST</span>
          </div>
        </div>

        {/* Bottom Right: Quick Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onHonk}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl ui-surface border border-white/10 hover:border-amber-400/50 text-amber-300 hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer"
            title="Honk Horn [H / B]"
          >
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold">Honk [H]</span>
          </button>

          <button
            onClick={onOpenShop}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl ui-surface border border-white/10 hover:border-amber-400/50 text-slate-200 hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold">Garage [U]</span>
          </button>

          <button
            onClick={onPause}
            aria-label="Pause Game"
            className="p-2.5 rounded-2xl ui-surface border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
