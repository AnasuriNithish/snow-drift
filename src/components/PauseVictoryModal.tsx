/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameStats } from '../types/game';
import { Play, RotateCcw, Wrench, Home, Trophy, Sparkles, CheckCircle2 } from 'lucide-react';
import { synthAudio } from '../audio/synthAudio';

interface PauseVictoryModalProps {
  type: 'paused' | 'victory';
  stats: GameStats;
  onResume: () => void;
  onRestart: () => void;
  onOpenShop: () => void;
  onTitleScreen: () => void;
}

export const PauseVictoryModal: React.FC<PauseVictoryModalProps> = ({
  type,
  stats,
  onResume,
  onRestart,
  onOpenShop,
  onTitleScreen,
}) => {
  useEffect(() => {
    if (type === 'victory') {
      synthAudio.playCarFreed();
      // Celebratory multi-stage confetti burst
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#f59e0b', '#10b981', '#ffffff'],
        });
        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#38bdf8', '#f59e0b', '#ffffff'],
          });
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#10b981', '#f59e0b', '#ffffff'],
          });
        }, 250);
      } catch {
        // Confetti fallback
      }
    }
  }, [type]);

  if (type === 'paused') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/60 pointer-events-auto select-none">
        <div className="w-full max-w-sm rounded-3xl ui-surface border border-white/10 shadow-2xl p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
            <Play className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Game Paused</h2>
          <p className="text-xs text-slate-400 mb-6 font-mono">
            Cleared: <span className="text-sky-300 font-bold">{stats.clearedPercentage}%</span> · Score:{' '}
            <span className="text-amber-300 font-bold">{stats.score.toLocaleString()}</span>
          </p>

          <div className="w-full space-y-2.5">
            <button
              onClick={onResume}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Resume Plowing [ESC]</span>
            </button>

            <button
              onClick={onOpenShop}
              className="w-full py-2.5 px-4 rounded-xl ui-surface-subtle hover:bg-slate-800 text-slate-200 font-semibold text-xs transition-all border border-white/5 cursor-pointer flex items-center justify-center gap-2"
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Garage & Upgrades</span>
            </button>

            <button
              onClick={onRestart}
              className="w-full py-2.5 px-4 rounded-xl ui-surface-subtle hover:bg-slate-800 text-slate-200 font-semibold text-xs transition-all border border-white/5 cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-sky-400" />
              <span>Reset Snowfield</span>
            </button>

            <button
              onClick={onTitleScreen}
              className="w-full py-2.5 px-4 rounded-xl ui-surface-subtle hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs transition-all border border-white/5 cursor-pointer flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Return to Title</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Victory Modal
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70 pointer-events-auto select-none">
      <div className="w-full max-w-md rounded-3xl ui-surface border border-amber-400/30 shadow-2xl p-6 md:p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-3">
          <Trophy className="w-8 h-8" />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {stats.playerRank === 1
              ? '🏆 1ST PLACE CHAMPION'
              : stats.playerRank === 2
              ? '🥈 2ND PLACE PODIUM'
              : stats.playerRank === 3
              ? '🥉 3RD PLACE PODIUM'
              : `#${stats.playerRank} RACE FINISH`}
          </span>
        </div>

        <h2 className="text-2xl font-black text-white mb-2">
          {stats.playerRank === 1 ? 'Snow Plow Grand Prix Winner!' : 'Winter Rescue Master!'}
        </h2>
        <p className="text-xs text-slate-300 max-w-xs mb-4">
          {stats.playerRank === 1
            ? 'You cleared the most snow and dominated the alpine race! Enjoy +100 🪙 bonus.'
            : 'The chalets are safe, the roads are glistening, and the stuck villagers are tooting their horns!'}
        </p>

        {/* Final Race Standings Table */}
        {stats.racers && stats.racers.length > 0 && (
          <div className="w-full p-3 rounded-2xl bg-slate-900/90 border border-white/10 mb-4 font-mono text-xs">
            <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-2 text-left flex items-center justify-between">
              <span>FINAL RACE STANDINGS</span>
              <span>CLEARED</span>
            </div>
            <div className="space-y-1.5">
              {stats.racers.map((racer) => (
                <div
                  key={racer.id}
                  className={`flex items-center justify-between px-2 py-1 rounded-lg ${
                    racer.isPlayer
                      ? 'bg-amber-500/20 border border-amber-400/40 text-amber-200 font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 text-center font-bold ${
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
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: racer.color }}
                    />
                    <span>{racer.name}</span>
                  </div>
                  <span className="tabular-nums text-slate-400 font-bold">{racer.clearedM2} m²</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Summary Grid */}
        <div className="w-full grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-900/80 border border-white/10 mb-5 font-mono text-left">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Snow Cleared</div>
            <div className="text-base font-bold text-sky-300 tabular-nums">
              {stats.clearedPercentage}% ({Math.round(stats.totalSnowClearedM2)} m²)
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 uppercase">Max Combo</div>
            <div className="text-base font-bold text-amber-400 tabular-nums">
              {stats.maxCombo.toFixed(1)}x
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 uppercase">Cars Rescued</div>
            <div className="text-base font-bold text-emerald-400 tabular-nums">
              {stats.carsFreed}/3 🚗
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 uppercase">Lost Items Found</div>
            <div className="text-base font-bold text-orange-400 tabular-nums">
              {stats.cocoaFound + stats.giftsFound}/6 ☕🎁
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 fill-slate-950" />
            <span>Keep Plowing (Zen Mode)</span>
          </button>

          <button
            onClick={onOpenShop}
            className="w-full py-2.5 px-4 rounded-xl ui-surface-subtle hover:bg-slate-800 text-slate-200 font-semibold text-xs transition-all border border-white/5 cursor-pointer flex items-center justify-center gap-2"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>Visit Garage (Spend 🪙 {Math.floor(stats.coins)})</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl ui-surface-subtle hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs transition-all border border-white/5 cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
