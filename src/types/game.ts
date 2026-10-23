export type GameState = 'title' | 'playing' | 'paused' | 'shop' | 'victory';

export type TimeOfDay = 'day' | 'dusk' | 'night' | 'aurora';

export type CameraMode = 'isometric' | 'topdown' | 'chase';

export interface Upgrades {
  bladeWidth: number;     // 1 to 5 (clearing width)
  enginePower: number;    // 1 to 5 (top speed and torque against heavy drifts)
  heatedBlade: number;    // 1 to 4 (melts ice quickly, leaves glistening salted pavement)
  boostCapacity: number;  // 1 to 4 (boost duration & recharge rate)
  snowMagnet: number;     // 1 to 4 (magnetic item collection range)
  paintColor: string;     // Hex color of the vehicle cab
}

export interface UpgradeConfig {
  id: keyof Omit<Upgrades, 'paintColor'>;
  name: string;
  description: string;
  maxLevel: number;
  costs: number[]; // cost for levels 2..maxLevel
  icon: string;
}

export interface Mission {
  id: string;
  title: string;
  subtitle: string;
  targetCleared: number; // percentage (e.g. 85%)
  carsToFree: number;
  cocoaMugsToFind: number;
  giftsToFind: number;
  timeLimitSec?: number;
  description: string;
  defaultTimeOfDay: TimeOfDay;
}

export interface GameStats {
  score: number;
  coins: number;
  totalSnowClearedM2: number;
  clearedPercentage: number;
  currentCombo: number;
  comboTimer: number;
  maxCombo: number;
  carsFreed: number;
  cocoaFound: number;
  giftsFound: number;
  currentSpeedKmH: number;
  boostAvailable: number; // 0 to 100
  isBoosting: boolean;
}

export type ComboRank = 'POWDER' | 'FLURRY' | 'BLIZZARD' | 'AVALANCHE' | 'WHITE-OUT' | 'ARCTIC TITAN';

export interface FloatingText {
  id: string;
  x: number; // Screen coords or 3D
  y: number;
  text: string;
  color: string;
  scale: number;
  createdAt: number;
}
