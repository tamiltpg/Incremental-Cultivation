// ========== Core Types ==========

export interface SpiritRoot {
  name: string;
  qiMultiplier: number;
  probability: number;
  description: string;
}

export interface BodyType {
  name: string;
  bodyMultiplier: number;
  qiBonusMultiplier: number;
  probability: number;
  description: string;
}

export interface Background {
  id: string;
  name: string;
  description: string;
  startLocation: string;
  bonus: string;
  bonusEffect: {
    explorationBonus?: number;
    spiritStones?: number;
    luckBonus?: number;
    sectAccess?: boolean;
    shopDiscount?: number;
    hiddenLuck?: number;
    randomScripture?: boolean;
  };
}

export interface PathLevel {
  level: number;
  tier: 1 | 2 | 3;
  tierName: string;
  name: string;
  flavor: string;
}

export type ActionType = 'cultivate' | 'train' | 'explore' | 'refine' | 'inscribe' | 'forge' | 'study' | 'sleep' | 'idle';

export interface Path {
  id: string;
  name: string;
  subtitle: string;
  action: ActionType;
  unlockCondition: string;
  unlockCheck: (state: GameState) => boolean;
  speedModifier: (state: GameState) => number;
  levels: PathLevel[];
  icon: string;
  color: string;
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type ItemCategory = 'pill' | 'scripture' | 'treasure' | 'material' | 'formation_scroll' | 'special';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  description: string;
  effects: {
    breakthroughBonus?: number;
    xpMultiplier?: number;
    xpMultiplierDuration?: number;
    healQiDeviation?: boolean;
    preserveInventory?: boolean;
    preserveRolls?: boolean;
    tribulationHpBonus?: number;
    rerollSpiritRoot?: boolean;
  };
  sellValue: number;
  stackable: boolean;
  quantity?: number;
}

export interface InventoryItem extends Item {
  quantity: number;
}

export interface PathProgress {
  pathId: string;
  currentLevel: number;
  currentXp: number;
  xpRequired: number;
  breakthroughAvailable: boolean;
  unlocked: boolean;
}

export interface ActiveBuff {
  id: string;
  name: string;
  multiplier: number;
  remainingSeconds: number;
  icon: string;
}

export interface QiDeviationDebuff {
  active: boolean;
  remainingSeconds: number;
}

export interface Region {
  id: string;
  name: string;
  description: string;
  realm: 'mortal' | 'heaven' | 'underworld';
  dangerLevel: number;
  terrain: string;
  hasShop: boolean;
  isCity: boolean;
  connections: string[];
  discovered: boolean;
  lootTable: LootEntry[];
  eventPool: string[];
}

export interface LootEntry {
  itemId: string;
  weight: number;
  minDanger: number;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
  isFated?: boolean;
}

export interface EventChoice {
  text: string;
  karmaChange: number;
  rewards: { spiritStones?: number; items?: string[]; xpBonus?: number };
  losses: { spiritStones?: number; items?: string[]; timePenalty?: number };
}

export interface Group {
  id: string;
  name: string;
  type: 'sect' | 'cult' | 'clan' | 'school' | 'association' | 'society' | 'agency';
  karmaRequirement: { min: number; max: number };
  description: string;
  location: string;
  contributionPoints: number;
  missions: Mission[];
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  helpOption: { reward: number; karmaChange: number; description: string };
  exploitOption: { reward: number; karmaChange: number; description: string };
  duration: number;
  completed: boolean;
}

export interface CombatResult {
  won: boolean;
  loot: Item[];
  xpGained: number;
  message: string;
}

export interface LogMessage {
  id: number;
  text: string;
  type: 'info' | 'success' | 'warning' | 'danger' | 'legendary' | 'system';
  timestamp: number;
}

export interface Character {
  name: string;
  spiritRoot: SpiritRoot;
  bodyType: BodyType;
  background: Background;
  luck: number;
  karma: number;
  rogueStatus: boolean;
  rebirthCount: number;
  legacyBonus: number;
  devilMark: boolean;
  redeemedDevil: boolean;
}

export interface TravelState {
  traveling: boolean;
  destinationId: string | null;
  remainingSeconds: number;
}

export interface GameState {
  character: Character;
  pathProgress: Record<string, PathProgress>;
  currentAction: ActionType;
  activePathId: string | null;
  spiritStones: number;
  inventory: InventoryItem[];
  currentLocationId: string;
  discoveredRegions: string[];
  travelState: TravelState;
  buffs: ActiveBuff[];
  qiDeviation: QiDeviationDebuff;
  groupMembership: string | null;
  groupContribution: number;
  eventLog: LogMessage[];
  totalPlayTime: number;
  lastSaveTimestamp: number;
  karmaVisible: boolean;
  autoSaveEnabled: boolean;
  gamePhase: 'character_creation' | 'playing';
  rerollCount: number;
  tickCount: number;
  highestPathLevel: number;
  equippedScripture: string | null;
  equippedMartialTechnique: string | null;
  equippedPassives: string[];
  totalDeaths: number;
  achievements: string[];
  _pendingEvent?: GameEvent | null;
}
