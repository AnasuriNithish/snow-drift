/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CameraMode, TimeOfDay } from '../types/game';
import { ChevronDown, ChevronUp, Sun, Sunset, Moon, Sparkles, RotateCcw, Eye } from 'lucide-react';

interface ControlOverlayProps {
  cameraMode: CameraMode;
  onCameraChange: (mode: CameraMode) => void;
  timeOfDay: TimeOfDay;
  onTimeChange: (time: TimeOfDay) => void;
  onResetVehicle: () => void;
}

export const ControlOverlay: React.FC<ControlOverlayProps> = ({
  cameraMode,
  onCameraChange,
  timeOfDay,
  onTimeChange,
  onResetVehicle,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ease-out pointer-events-auto ${
        isCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
      }`}
      style={{ maxWidth: 'min(860px, 94vw)' }}
    >
      {/* Collapse / Expand Tab Button pinned to top edge */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-900/95 border-t border-x border-white/10 rounded-t-xl transition-colors cursor-pointer"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isCollapsed ? 'Show Controls [C]' : 'Hide Controls [C]'}</span>
        </button>
      </div>

      {/* Main Dock Container */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl ui-surface border border-white/10 shadow-2xl">
        {/* Camera Views */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="flex items-center gap-1 text-slate-400 font-semibold uppercase text-[10px] mr-1">
            <Eye className="w-3 h-3 text-sky-400" />
            <span>Camera:</span>
          </span>
          {(['isometric', 'topdown', 'chase'] as CameraMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onCameraChange(mode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                cameraMode === mode
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {mode === 'isometric' ? 'Isometric 45°' : mode === 'topdown' ? 'Top-Down' : 'Chase Cam'}
            </button>
          ))}
        </div>

        <div className="hidden sm:block w-px h-5 bg-white/10" />

        {/* Time of Day Lighting Presets */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-semibold uppercase text-[10px] mr-1">Lighting:</span>
          <button
            onClick={() => onTimeChange('day')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              timeOfDay === 'day'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Morning</span>
          </button>

          <button
            onClick={() => onTimeChange('dusk')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              timeOfDay === 'dusk'
                ? 'bg-orange-500 text-white font-bold shadow-md'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <Sunset className="w-3.5 h-3.5" />
            <span>Dusk</span>
          </button>

          <button
            onClick={() => onTimeChange('night')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              timeOfDay === 'night'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Night</span>
          </button>

          <button
            onClick={() => onTimeChange('aurora')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              timeOfDay === 'aurora'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Aurora</span>
          </button>
        </div>

        <div className="hidden sm:block w-px h-5 bg-white/10" />

        {/* Reset Vehicle */}
        <button
          onClick={onResetVehicle}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors border border-white/5 cursor-pointer"
          title="Reset Snowplow Position (R)"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Reset [R]</span>
        </button>
      </div>
    </div>
  );
};
