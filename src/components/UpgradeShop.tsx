/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Upgrades, UpgradeConfig } from '../types/game';
import { Wrench, Zap, Flame, Magnet, Palette, X, ArrowUpRight, Check } from 'lucide-react';
import { synthAudio } from '../audio/synthAudio';

interface UpgradeShopProps {
  upgrades: Upgrades;
  coins: number;
  onUpgrade: (type: keyof Omit<Upgrades, 'paintColor'>, cost: number) => void;
  onPaintChange: (color: string) => void;
  onClose: () => void;
}

const UPGRADE_CONFIGS: UpgradeConfig[] = [
  {
    id: 'bladeWidth',
    name: 'Hydraulic Blade Wings',
    description: 'Extends plow width from 2.0m to 3.75m to clear massive swathes of snow at once.',
    maxLevel: 5,
    costs: [30, 60, 120, 220],
    icon: 'blade',
  },
  {
    id: 'enginePower',
    name: 'High-Torque Turbo Diesel',
    description: 'Provides raw pushing torque and higher top speed without slowing down in deep drifts.',
    maxLevel: 5,
    costs: [35, 75, 140, 250],
    icon: 'engine',
  },
  {
    id: 'heatedBlade',
    name: 'Thermal Blade Coils',
    description: 'Red-hot heating elements melt stubborn ice patches into glistening dry asphalt.',
    maxLevel: 4,
    costs: [50, 110, 200],
    icon: 'heat',
  },
  {
    id: 'boostCapacity',
    name: 'Nitro Boost Injection',
    description: 'Extends maximum turbo boost duration and accelerates automatic nitro recharge.',
    maxLevel: 4,
    costs: [40, 85, 160],
    icon: 'boost',
  },
  {
    id: 'snowMagnet',
    name: 'Magnetic Item Collector',
    description: 'Pulls buried coins, steaming hot cocoa mugs, and holiday gifts from further away.',
    maxLevel: 4,
    costs: [30, 70, 130],
    icon: 'magnet',
  },
];

const PAINT_COLORS = [
  { name: 'Alpine Orange', hex: '#f97316' },
  { name: 'Glacier Cyan', hex: '#06b6d4' },
  { name: 'Cherry Glaze', hex: '#e11d48' },
  { name: 'Nordic Pine', hex: '#15803d' },
  { name: 'Midnight Navy', hex: '#3b82f6' },
  { name: 'Golden Yeti', hex: '#eab308' },
];

export const UpgradeShop: React.FC<UpgradeShopProps> = ({
  upgrades,
  coins,
  onUpgrade,
  onPaintChange,
  onClose,
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'blade':
        return <Wrench className="w-5 h-5 text-amber-400" />;
      case 'engine':
        return <Zap className="w-5 h-5 text-sky-400" />;
      case 'heat':
        return <Flame className="w-5 h-5 text-rose-400" />;
      case 'boost':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'magnet':
        return <Magnet className="w-5 h-5 text-emerald-400" />;
      default:
        return <Wrench className="w-5 h-5 text-amber-400" />;
    }
  };

  const handleBuy = (cfg: UpgradeConfig) => {
    const currentLvl = upgrades[cfg.id];
    if (currentLvl >= cfg.maxLevel) return;

    const cost = cfg.costs[currentLvl - 1];
    if (coins >= cost) {
      synthAudio.playUpgradePurchased();
      onUpgrade(cfg.id, cost);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70 pointer-events-auto select-none">
      <div className="w-full max-w-3xl rounded-3xl ui-surface border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Alpine Garage Workshop</h2>
              <p className="text-xs text-slate-400">Upgrade your vehicle blade, engine torque, and winter gear</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800/80 border border-amber-400/30 text-amber-300 font-mono font-bold text-base shadow-inner">
              <span>🪙</span>
              <span className="tabular-nums">{Math.floor(coins)}</span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Garage"
              className="p-2 rounded-2xl ui-surface border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Upgrade Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {UPGRADE_CONFIGS.map((cfg) => {
              const currentLvl = upgrades[cfg.id];
              const isMaxed = currentLvl >= cfg.maxLevel;
              const nextCost = isMaxed ? 0 : cfg.costs[currentLvl - 1];
              const canAfford = coins >= nextCost && !isMaxed;

              return (
                <div
                  key={cfg.id}
                  className="p-4 rounded-2xl ui-surface-subtle border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-slate-800 border border-white/10">
                          {getIcon(cfg.icon)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{cfg.name}</h3>
                          {/* Level Pips */}
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: cfg.maxLevel }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-3.5 h-1.5 rounded-full ${
                                  i < currentLvl ? 'bg-amber-400' : 'bg-slate-700'
                                }`}
                              />
                            ))}
                            <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                              LVL {currentLvl}/{cfg.maxLevel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-4">{cfg.description}</p>
                  </div>

                  {/* Purchase Button */}
                  <button
                    disabled={isMaxed || !canAfford}
                    onClick={() => handleBuy(cfg)}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isMaxed
                        ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                        : canAfford
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md active:scale-95'
                        : 'bg-slate-800 text-slate-400 border border-white/5 cursor-not-allowed'
                    }`}
                  >
                    {isMaxed ? (
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-3.5 h-3.5" /> MAX LEVEL
                      </span>
                    ) : (
                      <>
                        <span>UPGRADE</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span className="font-mono text-amber-950 bg-amber-400/50 px-1.5 py-0.5 rounded">
                          🪙 {nextCost}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Paint Customization Section */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">Vehicle Custom Paint Finish</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {PAINT_COLORS.map((paint) => {
                const isSelected = upgrades.paintColor === paint.hex;
                return (
                  <button
                    key={paint.hex}
                    onClick={() => onPaintChange(paint.hex)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-slate-800 border-white text-white shadow-lg'
                        : 'bg-slate-900/60 border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/30 shadow-sm"
                      style={{ backgroundColor: paint.hex }}
                    />
                    <span>{paint.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white text-slate-950 hover:bg-slate-100 font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
