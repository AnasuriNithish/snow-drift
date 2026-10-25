/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BladeAngle, GameStats } from '../types/game';
import {
  Wrench,
  Pause,
  Zap,
  Coffee,
  Gift,
  Car,
  Sparkles,
  Volume2,
  VolumeX,
  Megaphone,
  Trophy,
  ChevronDown,
  ChevronUp,
  Fuel,
  Gauge,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import { synthAudio } from '../audio/synthAudio';

interface GameHUDProps {
  stats: GameStats;
  onOpenShop: () => void;
  onPause: () => void;
  onHonk?: () => void;
  onBladeAngle?: (angle: BladeAngle) => void;
  onToggleDiffLock?: () => void;
  onToggleSalt?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  onOpenShop,
  onPause,
  onHonk,
  onBladeAngle,
  onToggleDiffLock,
  onToggleSalt,
}) => {
  const [isMuted, setIsMuted] = React.useState(synthAudio.getMuted());
  const [showStandings, setShowStandings] = useState(true);

  const getRankColor = (combo: number) => {
    if (combo >= 7.0) return 'text-purple-400 border-purple-500/50 bg-slate-950/90 shadow-[0_0_24px_rgba(168,85,247,0.3)]';
    if (combo >= 5.0) return 'text-rose-400 border-rose-500/50 bg-slate-950/90 shadow-[0_0_24px_rgba(244,63,94,0.3)]';
    if (combo >= 3.5) return 'text-amber-400 border-amber-500/50 bg-slate-950/90 shadow-[0_0_20px_rgba(245,158,11,0.25)]';
    if (combo >= 2.2) return 'text-sky-400 border-sky-500/50 bg-slate-950/90 shadow-[0_0_18px_rgba(56,189,248,0.2)]';
    if (combo >= 1.5) return 'text-emerald-400 border-emerald-500/50 bg-slate-950/90';
    return 'text-slate-300 border-white/10 bg-slate-950/80';
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
  const isLowFuel = (stats.dieselLevel ?? 100) < 20;

  return (
    <div className="absolute inset-0 pointer-events-none select-none p-3 md:p-5 flex flex-col justify-between z-10">
      {/* ============================================================== */}
      {/* TOP ROW: OBJECTIVES, RACE STANDINGS, COMBO, & TELEMETRY CLUSTER */}
      {/* ============================================================== */}
      <div className="w-full flex items-start justify-between gap-3">
        {/* Top Left: Clearance Mission Progress & Live Competitor Standings */}
        <div className="flex flex-col gap-2">
          {/* Mission Clearance Progress */}
          <div className="pointer-events-auto flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-white/15 shadow-2xl min-w-[220px]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5 font-mono tracking-wider text-[11px] uppercase">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <span>MUNICIPAL CLEARANCE</span>
              </span>
              <span className="font-mono tabular-nums text-sky-300 font-black text-sm">
                {stats.clearedPercentage}% <span className="text-slate-500 text-xs font-normal">/ 85%</span>
              </span>
            </div>

            {/* Heavy Graded Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden relative border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, (stats.clearedPercentage / 85) * 100)}%` }}
              />
              <div className="absolute top-0 bottom-0 right-[0%] w-0.5 bg-amber-400/90" />
            </div>

            <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
              <span>AREA: {Math.round(stats.totalSnowClearedM2)} m²</span>
              <span>TARGET: 85%</span>
            </div>
          </div>

          {/* Live Snow Plow Competitor Standings (Player + 4 Automated Rigs) */}
          {stats.racers && stats.racers.length > 0 && (
            <div className="pointer-events-auto flex flex-col p-2.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-white/15 shadow-2xl min-w-[220px]">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pb-1.5 border-b border-white/10">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Trophy className="w-3.5 h-3.5" />
                  <span className="tracking-wider uppercase text-[11px] font-black">RIG COMPETITION</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono tracking-wider ${
                      stats.playerRank === 1
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : stats.playerRank === 2
                        ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                        : stats.playerRank === 3
                        ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {stats.playerRank === 1 ? '1ST' : stats.playerRank === 2 ? '2ND' : stats.playerRank === 3 ? '3RD' : `${stats.playerRank}TH`}
                  </span>
                  <button
                    onClick={() => setShowStandings(!showStandings)}
                    className="p-0.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={showStandings ? 'Minimize Standings' : 'Expand Standings'}
                  >
                    {showStandings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {showStandings && (
                <div className="space-y-1 mt-1.5 text-[11px] font-mono">
                  {stats.racers.map((racer) => (
                    <div
                      key={racer.id}
                      className={`flex items-center justify-between px-2 py-1 rounded-lg transition-colors ${
                        racer.isPlayer
                          ? 'bg-amber-500/20 border border-amber-400/50 text-amber-200 font-bold'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span
                          className={`w-4 text-center font-black text-[10px] ${
                            racer.rank === 1
                              ? 'text-amber-400'
                              : racer.rank === 2
                              ? 'text-slate-300'
                              : racer.rank === 3
                              ? 'text-amber-600'
                              : 'text-slate-500'
                          }`}
                        >
                          #{racer.rank}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm border border-black/30"
                          style={{ backgroundColor: racer.color }}
                        />
                        <span className="truncate max-w-[96px] text-[10px] font-medium">{racer.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 shrink-0 ml-1">
                        <span className="tabular-nums font-semibold text-slate-200">{racer.clearedM2} m²</span>
                        <span className="text-[9px] text-slate-500 font-mono">({racer.currentSpeedKmH}k)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top Center: Heavy Snow Combo Multiplier Banner */}
        <div
          className={`transition-all duration-200 transform ${
            hasActiveCombo ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 -translate-y-4 pointer-events-none'
          }`}
        >
          <div className={`px-5 py-2 rounded-2xl border backdrop-blur-md flex flex-col items-center ${getRankColor(stats.currentCombo)}`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-bounce" />
              <span className="font-mono font-black text-2xl tracking-tight tabular-nums">
                {stats.currentCombo.toFixed(1)}x
              </span>
              <span className="font-black text-xs tracking-widest uppercase">
                {getRankName(stats.currentCombo)}
              </span>
            </div>

            {/* Decay countdown meter */}
            <div className="w-full h-1 bg-black/50 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-current transition-all duration-75"
                style={{ width: `${Math.min(100, (stats.comboTimer / 2.4) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top Right: Collectibles, Coins, Sound, & System Control */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Mission Pickups count */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-white/15 text-xs font-mono shadow-xl">
            <div className="flex items-center gap-1 text-orange-400" title="Hot Cocoa Mugs Found">
              <Coffee className="w-3.5 h-3.5" />
              <span className="tabular-nums font-bold">{stats.cocoaFound}/3</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400" title="Holiday Gifts Found">
              <Gift className="w-3.5 h-3.5" />
              <span className="tabular-nums font-bold">{stats.giftsFound}/3</span>
            </div>
            <div className="flex items-center gap-1 text-blue-400" title="Vehicles Rescued">
              <Car className="w-3.5 h-3.5" />
              <span className="tabular-nums font-bold">{stats.carsFreed}/3</span>
            </div>
          </div>

          {/* Score & Coins */}
          <div className="flex flex-col items-end gap-0.5 px-3.5 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-white/15 shadow-xl">
            <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase font-bold">REWARD</div>
            <div className="font-mono font-black text-base text-white tabular-nums tracking-wide">
              {stats.score.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-300 font-mono font-bold">
              <span>🪙</span>
              <span className="tabular-nums">{Math.floor(stats.coins)}</span>
            </div>
          </div>

          {/* Audio Mute toggle */}
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="p-2.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-white/15 hover:border-white/30 text-slate-300 hover:text-white transition-colors cursor-pointer shadow-xl"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* BOTTOM ROW: INDUSTRIAL DASHBOARD CLUSTER & RIG CONTROLS        */}
      {/* ============================================================== */}
      <div className="w-full flex flex-col md:flex-row items-end justify-between gap-3">
        {/* Bottom Left: Heavy Rig Telemetry Instrument Cluster */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-white/15 shadow-2xl">
          {/* Speed & Tachometer */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-mono font-bold tracking-wider uppercase">SPEED</span>
              <div className="font-mono font-black text-2xl text-white tabular-nums leading-none mt-0.5">
                {stats.currentSpeedKmH}
                <span className="text-[11px] text-slate-400 font-medium ml-1">KM/H</span>
              </div>
            </div>

            <div className="w-px h-8 bg-white/10 mx-1" />

            {/* Tachometer RPM Display */}
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-mono font-bold tracking-wider uppercase flex items-center gap-1">
                <Gauge className="w-2.5 h-2.5 text-amber-400" />
                <span>RPM</span>
              </span>
              <div className="font-mono font-bold text-sm text-slate-200 tabular-nums leading-none mt-1">
                {stats.rpm ?? 850}
                <span className="text-[9px] text-slate-500 ml-1">/ 3.4k</span>
              </div>
              {/* RPM Needle Meter */}
              <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1 border border-white/5">
                <div
                  className={`h-full transition-all duration-100 ${
                    (stats.rpm ?? 850) > 2800 ? 'bg-rose-500' : (stats.rpm ?? 850) > 2000 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, (((stats.rpm ?? 850) - 800) / 2600) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="w-px h-8 bg-white/10 hidden sm:block mx-0.5" />

          {/* Heavy Diesel Fuel Gauge */}
          <div className="flex flex-col w-24">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className={`flex items-center gap-1 font-bold ${isLowFuel ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                <Fuel className="w-3 h-3" />
                <span>DIESEL</span>
              </span>
              <span className={`tabular-nums font-bold ${isLowFuel ? 'text-rose-400' : 'text-slate-300'}`}>
                {stats.dieselLevel ?? 100}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-1 border border-white/5">
              <div
                className={`h-full transition-all duration-200 rounded-full ${
                  isLowFuel ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-500 to-amber-300'
                }`}
                style={{ width: `${stats.dieselLevel ?? 100}%` }}
              />
            </div>
            {isLowFuel && (
              <span className="text-[8px] text-rose-400 font-mono font-bold animate-pulse mt-0.5">LOW FUEL (DRUMS)</span>
            )}
          </div>

          <div className="w-px h-8 bg-white/10 hidden sm:block mx-0.5" />

          {/* Nitro / Turbo Boost Reservoir */}
          <div className="flex flex-col w-24">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="flex items-center gap-1 text-sky-400 font-bold">
                <Zap className="w-3 h-3 fill-sky-400" />
                <span>NITRO</span>
              </span>
              <span className="text-slate-300 tabular-nums font-bold">{stats.boostAvailable}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-1 border border-white/5">
              <div
                className={`h-full transition-all duration-100 rounded-full ${
                  stats.isBoosting ? 'bg-amber-400 shadow-sm' : 'bg-sky-400'
                }`}
                style={{ width: `${stats.boostAvailable}%` }}
              />
            </div>
            <span className="text-[8px] text-slate-500 font-mono mt-0.5">[SPACE] BOOST</span>
          </div>
        </div>

        {/* Bottom Center / Simulation Rig Articulation Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-white/15 shadow-2xl">
          {/* Plow Blade Articulation Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10">
            <span className="text-[9px] text-slate-400 font-mono font-bold uppercase px-1 hidden sm:inline">
              <Sliders className="w-3 h-3 inline mr-1 text-sky-400" />
              BLADE:
            </span>
            <button
              onClick={() => onBladeAngle?.('left')}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                stats.bladeAngle === 'left'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Angle Blade Left [Q]"
            >
              ◄ LEFT [Q]
            </button>
            <button
              onClick={() => onBladeAngle?.('straight')}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                stats.bladeAngle === 'straight'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Center Blade [Z]"
            >
              STRAIGHT [Z]
            </button>
            <button
              onClick={() => onBladeAngle?.('right')}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                stats.bladeAngle === 'right'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Angle Blade Right [E]"
            >
              RIGHT [E] ►
            </button>
          </div>

          {/* Differential Lock Switch (Heavy Torque Crawler) */}
          <button
            onClick={onToggleDiffLock}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
              stats.diffLockActive
                ? 'bg-rose-600/30 border-rose-500 text-rose-300 shadow-[0_0_14px_rgba(239,68,68,0.4)]'
                : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
            }`}
            title="Toggle Differential Lock for Heavy Drifts [X]"
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${stats.diffLockActive ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
            <span>DIFF-LOCK [X]</span>
            <span
              className={`w-2 h-2 rounded-full ${
                stats.diffLockActive ? 'bg-rose-500 shadow-sm' : 'bg-slate-700'
              }`}
            />
          </button>

          {/* Rear Road Salt Spreader Switch */}
          <button
            onClick={onToggleSalt}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
              stats.saltSpreaderActive
                ? 'bg-sky-600/30 border-sky-400 text-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.4)]'
                : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
            }`}
            title="Toggle Rear Salt Spreader [F]"
          >
            <span>SALT [F]</span>
            <span className="text-[10px] text-slate-400 tabular-nums">({stats.saltRemaining ?? 100}%)</span>
            <span
              className={`w-2 h-2 rounded-full ${
                stats.saltSpreaderActive ? 'bg-sky-400 animate-pulse' : 'bg-slate-700'
              }`}
            />
          </button>
        </div>

        {/* Bottom Right: Quick Utility Actions (Horn, Garage, Pause) */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Air Horn Button */}
          <button
            onClick={onHonk}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-white/15 hover:border-amber-400/60 text-amber-300 hover:text-white transition-all shadow-xl active:scale-95 cursor-pointer font-semibold text-xs"
            title="Blast Freight Train Air Horn [H / B]"
          >
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span>HORN [H]</span>
          </button>

          {/* Upgrade Garage */}
          <button
            onClick={onOpenShop}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-white/15 hover:border-amber-400/60 text-slate-200 hover:text-white transition-all shadow-xl active:scale-95 cursor-pointer font-semibold text-xs"
            title="Open Rig Customization & Upgrades [U]"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>GARAGE [U]</span>
          </button>

          {/* Pause */}
          <button
            onClick={onPause}
            aria-label="Pause Game"
            className="p-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-white/15 hover:border-white/30 text-slate-300 hover:text-white transition-all shadow-xl active:scale-95 cursor-pointer"
            title="Pause [ESC]"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
