import type { GameState, Character, PathProgress, InventoryItem, LogMessage, Item } from '../data/types';
import { SPIRIT_ROOTS, BODY_TYPES, BACKGROUNDS, PATHS, calculateXpRequired, REGIONS, ITEMS, BASE_XP_PER_SECOND, BREAKTHROUGH_RATES, GAME_EVENTS, FATED_ENCOUNTER_BASE_CHANCE, EVENT_CHECK_INTERVAL, CLICK_BOOST_MULTIPLIER } from '../data/constants';

const SAVE_KEY = 'incremental_cultivation_save';
let logIdCounter = 0;

// ========== RANDOM HELPERS ==========
export function weightedRandom<T extends { probability: number }>(items: T[]): T {
  const r = Math.random();
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.probability;
    if (r <= cumulative) return item;
  }
  return items[items.length - 1];
}

export function rollLuck(): number {
  return Math.max(0.1, Math.min(1.0, Math.pow(Math.random(), 2.5)));
}

// ========== CHARACTER CREATION ==========
export function rollCharacter(name: string): Character {
  return {
    name,
    spiritRoot: weightedRandom(SPIRIT_ROOTS),
    bodyType: weightedRandom(BODY_TYPES),
    background: BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)],
    luck: rollLuck(),
    karma: 0,
    rogueStatus: false,
    rebirthCount: 0,
    legacyBonus: 0,
    devilMark: false,
    redeemedDevil: false,
  };
}

// ========== INITIAL GAME STATE ==========
export function createInitialGameState(character: Character): GameState {
  const startLocation = character.background.startLocation;
  const discoveredRegions = [startLocation];
  const region = REGIONS.find(r => r.id === startLocation);
  if (region) {
    region.connections.forEach(c => {
      if (!discoveredRegions.includes(c)) discoveredRegions.push(c);
    });
  }

  const pathProgress: Record<string, PathProgress> = {};
  // Martial Arts always available
  pathProgress['martial'] = {
    pathId: 'martial', currentLevel: 1, currentXp: 0,
    xpRequired: calculateXpRequired(1), breakthroughAvailable: false, unlocked: true,
  };

  const inventory: InventoryItem[] = [];
  // Background bonuses
  if (character.background.bonusEffect.spiritStones) {
    // handled via spiritStones field
  }
  if (character.background.bonusEffect.randomScripture) {
    inventory.push({ ...ITEMS['basic_scripture'], quantity: 1 });
    // Also unlock spirit path
    pathProgress['spirit'] = {
      pathId: 'spirit', currentLevel: 1, currentXp: 0,
      xpRequired: calculateXpRequired(1), breakthroughAvailable: false, unlocked: true,
    };
  }
  if (character.background.bonusEffect.hiddenLuck) {
    character.luck = Math.min(1.0, character.luck + character.background.bonusEffect.hiddenLuck);
  }

  const state: GameState = {
    character,
    pathProgress,
    currentAction: 'idle',
    activePathId: 'martial',
    spiritStones: character.background.bonusEffect.spiritStones || 0,
    inventory,
    currentLocationId: startLocation,
    discoveredRegions,
    travelState: { traveling: false, destinationId: null, remainingSeconds: 0 },
    buffs: [],
    qiDeviation: { active: false, remainingSeconds: 0 },
    groupMembership: null,
    groupContribution: 0,
    eventLog: [],
    totalPlayTime: 0,
    lastSaveTimestamp: Date.now(),
    karmaVisible: false,
    autoSaveEnabled: true,
    gamePhase: 'playing',
    rerollCount: 0,
    tickCount: 0,
    highestPathLevel: 1,
    equippedScripture: null,
    equippedMartialTechnique: null,
    equippedPassives: [],
    totalDeaths: 0,
    achievements: [],
  };

  addLog(state, '📜 Your journey on the Grand Dao begins...', 'system');
  addLog(state, `Spirit Root: ${character.spiritRoot.name} (${character.spiritRoot.qiMultiplier}x)`, 'info');
  addLog(state, `Body Type: ${character.bodyType.name} (${character.bodyType.bodyMultiplier}x)`, 'info');
  addLog(state, `Background: ${character.background.name}`, 'info');
  addLog(state, '💡 Train to strengthen your body. Explore to find Scriptures and unlock Cultivation!', 'system');

  return state;
}

// ========== LOG ==========
export function addLog(state: GameState, text: string, type: LogMessage['type'] = 'info'): void {
  state.eventLog.unshift({ id: logIdCounter++, text, type, timestamp: Date.now() });
  if (state.eventLog.length > 50) state.eventLog.length = 50;
}

// ========== SAVE/LOAD ==========
export function saveGame(state: GameState): void {
  state.lastSaveTimestamp = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch { /* storage full */ }
}

export function loadGame(): GameState | null {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return null;
    return JSON.parse(data) as GameState;
  } catch { return null; }
}

export function exportSave(state: GameState): string {
  state.lastSaveTimestamp = Date.now();
  return btoa(JSON.stringify(state));
}

export function importSave(encoded: string): GameState | null {
  try {
    return JSON.parse(atob(encoded)) as GameState;
  } catch { return null; }
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

// ========== OFFLINE PROGRESS ==========
export function calculateOfflineProgress(state: GameState): GameState {
  const now = Date.now();
  const elapsed = Math.min((now - state.lastSaveTimestamp) / 1000, 8 * 3600);
  if (elapsed < 5) return state;

  const ticks = Math.floor(elapsed);
  let xpGained = 0;

  if (state.currentAction !== 'idle' && state.activePathId) {
    const pp = state.pathProgress[state.activePathId];
    if (pp && !pp.breakthroughAvailable) {
      const path = PATHS.find(p => p.id === state.activePathId);
      if (path) {
        const speed = path.speedModifier(state);
        const deviationMult = state.qiDeviation.active ? 0.5 : 1;
        const legacyMult = 1 + state.character.legacyBonus;
        const xpPerTick = BASE_XP_PER_SECOND * speed * deviationMult * legacyMult;
        xpGained = xpPerTick * ticks;
        pp.currentXp += xpGained;
        if (pp.currentXp >= pp.xpRequired) {
          pp.currentXp = pp.xpRequired;
          pp.breakthroughAvailable = true;
        }
      }
    }
  }

  // Clear qi deviation if enough time passed
  if (state.qiDeviation.active) {
    state.qiDeviation.remainingSeconds = Math.max(0, state.qiDeviation.remainingSeconds - ticks);
    if (state.qiDeviation.remainingSeconds <= 0) state.qiDeviation.active = false;
  }

  if (xpGained > 0) {
    addLog(state, `⏰ Offline progress: ${formatTime(ticks)} — gained ${formatNumber(xpGained)} XP`, 'system');
  }

  // Grant some spirit stones for offline time
  const offlineStones = Math.floor(ticks / 600);
  if (offlineStones > 0) {
    state.spiritStones += offlineStones;
    addLog(state, `💎 Found ${offlineStones} Spirit Stones while away`, 'system');
  }

  state.lastSaveTimestamp = now;
  return state;
}

// ========== GAME TICK ==========
export function gameTick(state: GameState, clickBoost: boolean = false): GameState {
  state.tickCount++;
  state.totalPlayTime++;

  // Travel
  if (state.travelState.traveling) {
    state.travelState.remainingSeconds--;
    if (state.travelState.remainingSeconds <= 0) {
      state.travelState.traveling = false;
      state.currentLocationId = state.travelState.destinationId!;
      if (!state.discoveredRegions.includes(state.currentLocationId)) {
        state.discoveredRegions.push(state.currentLocationId);
      }
      const region = REGIONS.find(r => r.id === state.currentLocationId);
      if (region) {
        addLog(state, `🗺️ Arrived at ${region.name}`, 'success');
        region.connections.forEach(c => {
          if (!state.discoveredRegions.includes(c)) state.discoveredRegions.push(c);
        });
      }
      state.travelState.destinationId = null;
    }
    return state;
  }

  // Buffs countdown
  state.buffs = state.buffs.filter(b => {
    b.remainingSeconds--;
    return b.remainingSeconds > 0;
  });

  // Qi Deviation countdown
  if (state.qiDeviation.active) {
    state.qiDeviation.remainingSeconds--;
    if (state.qiDeviation.remainingSeconds <= 0) {
      state.qiDeviation.active = false;
      addLog(state, '✅ Qi Deviation has cleared. Your mind is calm again.', 'success');
    }
  }

  // Main action XP gain
  // Cultivate → Qi paths, Train → Body paths, Explore → NO XP (only discoveries)
  if (state.currentAction !== 'idle' && state.currentAction !== 'explore' && state.activePathId) {
    const pp = state.pathProgress[state.activePathId];
    if (pp && pp.unlocked && !pp.breakthroughAvailable) {
      const path = PATHS.find(p => p.id === state.activePathId);
      // Only grant XP if the path action matches the current action
      if (path && (path.action as string) === state.currentAction) {
        const speed = path.speedModifier(state);
        const deviationMult = state.qiDeviation.active ? 0.5 : 1;
        const legacyMult = 1 + state.character.legacyBonus;
        const clickMult = clickBoost ? CLICK_BOOST_MULTIPLIER : 1;
        const buffMult = state.buffs.reduce((m, b) => m * b.multiplier, 1);

        const xpGain = BASE_XP_PER_SECOND * speed * deviationMult * legacyMult * clickMult * buffMult;
        pp.currentXp += xpGain;

        if (pp.currentXp >= pp.xpRequired) {
          pp.currentXp = pp.xpRequired;
          pp.breakthroughAvailable = true;
          addLog(state, `⚡ ${path.levels[pp.currentLevel - 1]?.name || 'Level ' + pp.currentLevel} XP maxed! Attempt Breakthrough!`, 'warning');
        }
      }
    }
  }

  // Exploration discoveries
  if (state.currentAction === 'explore' && !state.travelState.traveling) {
    const region = REGIONS.find(r => r.id === state.currentLocationId);
    if (region) {
      const baseDiscoveryRate = 0.02 + state.character.luck * 0.03;
      const explorationBonus = state.character.background.bonusEffect.explorationBonus || 0;
      const discoveryChance = baseDiscoveryRate + explorationBonus;

      if (Math.random() < discoveryChance) {
        // Pick from loot table
        const validLoot = region.lootTable.filter(l => l.minDanger <= region.dangerLevel);
        if (validLoot.length > 0) {
          const totalWeight = validLoot.reduce((s, l) => s + l.weight, 0);
          let roll = Math.random() * totalWeight;
          let selectedLoot = validLoot[0];
          for (const loot of validLoot) {
            roll -= loot.weight;
            if (roll <= 0) { selectedLoot = loot; break; }
          }
          const item = ITEMS[selectedLoot.itemId];
          if (item) {
            if (item.id === 'spirit_stone_pouch_small') {
              const amount = 5 + Math.floor(Math.random() * 11);
              state.spiritStones += amount;
              addLog(state, `💎 Found ${amount} Spirit Stones!`, 'success');
            } else if (item.id === 'spirit_stone_pouch_large') {
              const amount = 30 + Math.floor(Math.random() * 51);
              state.spiritStones += amount;
              addLog(state, `💎 Found ${amount} Spirit Stones!`, 'legendary');
            } else {
              addItemToInventory(state, item);
              addLog(state, `🔍 Found: ${item.name}`, item.rarity === 'legendary' || item.rarity === 'mythic' ? 'legendary' : item.rarity === 'epic' || item.rarity === 'rare' ? 'success' : 'info');

              // Check for path unlocks
              checkPathUnlocks(state);
            }
          }
        }
      }

      // Fated Encounters
      const fatedChance = FATED_ENCOUNTER_BASE_CHANCE * (1 + state.character.luck * 5);
      if (Math.random() < fatedChance) {
        const fatedEvents = GAME_EVENTS.filter(e => e.isFated);
        if (fatedEvents.length > 0) {
          const event = fatedEvents[Math.floor(Math.random() * fatedEvents.length)];
          state._pendingEvent = event;
        }
      }
    }

    // Random events
    if (state.tickCount % EVENT_CHECK_INTERVAL === 0) {
      const region = REGIONS.find(r => r.id === state.currentLocationId);
      if (region && region.eventPool.length > 0) {
        const eventId = region.eventPool[Math.floor(Math.random() * region.eventPool.length)];
        const event = GAME_EVENTS.find(e => e.id === eventId && !e.isFated);
        if (event) {
          state._pendingEvent = event;
        }
      }
    }
  }

  // Check karma visibility
  if (!state.karmaVisible) {
    for (const pp of Object.values(state.pathProgress)) {
      if (pp.currentLevel >= 5) {
        state.karmaVisible = true;
        addLog(state, '🔮 Your karma becomes visible to your inner eye...', 'legendary');
        break;
      }
    }
  }

  // Update highest path level
  for (const pp of Object.values(state.pathProgress)) {
    if (pp.currentLevel > state.highestPathLevel) {
      state.highestPathLevel = pp.currentLevel;
    }
  }

  // Beast tamer unlock
  if (state.currentAction === 'explore' && !state.pathProgress['beast_tamer']?.unlocked) {
    const region = REGIONS.find(r => r.id === state.currentLocationId);
    if (region && region.id === 'spirit_beast_territory' && Math.random() < 0.005 * state.character.luck) {
      if (!state.pathProgress['beast_tamer']) {
        state.pathProgress['beast_tamer'] = {
          pathId: 'beast_tamer', currentLevel: 1, currentXp: 0,
          xpRequired: calculateXpRequired(1), breakthroughAvailable: false, unlocked: true,
        };
        addLog(state, '🐉 A spirit beast approaches! The Resonance Path is unlocked!', 'legendary');
      }
    }
  }

  // Dream path unlock (random while cultivating)
  if (state.currentAction === 'cultivate' && !state.pathProgress['dream']?.unlocked && Math.random() < 0.0002) {
    state.pathProgress['dream'] = {
      pathId: 'dream', currentLevel: 1, currentXp: 0,
      xpRequired: calculateXpRequired(1), breakthroughAvailable: false, unlocked: true,
    };
    addLog(state, '🌙 A lucid dream overtakes you... The Illusion Path is unlocked!', 'legendary');
  }

  return state;
}

// ========== INVENTORY ==========
export function addItemToInventory(state: GameState, item: Item, qty: number = 1): void {
  const existing = state.inventory.find(i => i.id === item.id && item.stackable);
  if (existing) {
    existing.quantity += qty;
  } else {
    state.inventory.push({ ...item, quantity: qty });
  }
}

export function removeItemFromInventory(state: GameState, itemId: string, qty: number = 1): boolean {
  const idx = state.inventory.findIndex(i => i.id === itemId);
  if (idx === -1) return false;
  state.inventory[idx].quantity -= qty;
  if (state.inventory[idx].quantity <= 0) {
    state.inventory.splice(idx, 1);
  }
  return true;
}

// ========== PATH UNLOCKS ==========
export function checkPathUnlocks(state: GameState): void {
  for (const path of PATHS) {
    if (state.pathProgress[path.id]?.unlocked) continue;
    if (path.unlockCheck(state)) {
      state.pathProgress[path.id] = {
        pathId: path.id, currentLevel: 1, currentXp: 0,
        xpRequired: calculateXpRequired(1), breakthroughAvailable: false, unlocked: true,
      };
      addLog(state, `📖 New Path Unlocked: ${path.name}!`, 'legendary');
    }
  }
}

// ========== BREAKTHROUGH ==========
export interface BreakthroughResult {
  success: boolean;
  outcome: 'success' | 'minor_setback' | 'qi_deviation' | 'crippling_injury' | 'death';
  message: string;
}

export function attemptBreakthrough(state: GameState, pillBonus: number = 0): BreakthroughResult {
  const pp = state.pathProgress[state.activePathId!];
  if (!pp || !pp.breakthroughAvailable) {
    return { success: false, outcome: 'minor_setback', message: 'Not ready for breakthrough.' };
  }

  const path = PATHS.find(p => p.id === state.activePathId);
  if (!path) return { success: false, outcome: 'minor_setback', message: 'Path not found.' };

  const baseRate = BREAKTHROUGH_RATES[pp.currentLevel] || 0.10;
  const luckBonus = state.character.luck * 0.05;
  const successRate = Math.min(0.95, baseRate + pillBonus + luckBonus);

  const roll = Math.random();

  if (roll < successRate) {
    // Success
    pp.currentLevel++;
    pp.currentXp = 0;
    pp.xpRequired = calculateXpRequired(pp.currentLevel);
    pp.breakthroughAvailable = false;

    if (pp.currentLevel > state.highestPathLevel) state.highestPathLevel = pp.currentLevel;

    const levelData = path.levels[pp.currentLevel - 1];
    addLog(state, `🌟 BREAKTHROUGH SUCCESS! Advanced to ${levelData?.name || 'Level ' + pp.currentLevel}!`, 'legendary');

    if (pp.currentLevel >= 12) {
      addLog(state, `🏆 You have reached the pinnacle of ${path.name}! You are a true immortal!`, 'legendary');
    }

    return { success: true, outcome: 'success', message: `Advanced to ${levelData?.name || 'Level ' + pp.currentLevel}!` };
  }

  // Failure
  const failRoll = Math.random();
  if (failRoll < 0.05) {
    // Death (5%)
    addLog(state, `💀 CATASTROPHIC FAILURE! Your body shatters... Death claims you.`, 'danger');
    return { success: false, outcome: 'death', message: 'Your cultivation backfired fatally. Death claims you.' };
  } else if (failRoll < 0.15) {
    // Crippling Injury (10%)
    pp.currentLevel = Math.max(1, pp.currentLevel - 1);
    pp.currentXp = pp.xpRequired * 0.5;
    pp.xpRequired = calculateXpRequired(pp.currentLevel);
    pp.breakthroughAvailable = false;
    addLog(state, `🩸 CRIPPLING INJURY! Dropped back to Level ${pp.currentLevel}!`, 'danger');
    return { success: false, outcome: 'crippling_injury', message: 'A crippling injury sends you back a level!' };
  } else if (failRoll < 0.50) {
    // Qi Deviation (35%)
    pp.currentXp = 0;
    pp.breakthroughAvailable = false;
    state.qiDeviation = { active: true, remainingSeconds: 1800 };
    addLog(state, `😵 QI DEVIATION! All progress lost + 50% speed debuff for 30 minutes!`, 'danger');
    return { success: false, outcome: 'qi_deviation', message: 'Qi Deviation! All XP lost and speed halved for 30 minutes!' };
  } else {
    // Minor Setback (50%)
    pp.currentXp = pp.xpRequired * 0.7;
    pp.breakthroughAvailable = false;
    addLog(state, `⚠️ Minor Setback — lost 30% XP progress.`, 'warning');
    return { success: false, outcome: 'minor_setback', message: 'Minor setback. Lost 30% of your XP progress.' };
  }
}

// ========== TRIBULATION ==========
export interface TribulationState {
  active: boolean;
  strikes: number;
  currentStrike: number;
  hp: number;
  maxHp: number;
  timeWindow: number;
  strikeActive: boolean;
  strikeTimer: number;
  completed: boolean;
  survived: boolean;
}

export function startTribulation(state: GameState): TribulationState {
  const pp = state.pathProgress[state.activePathId!];
  if (!pp) return { active: false, strikes: 0, currentStrike: 0, hp: 0, maxHp: 0, timeWindow: 0, strikeActive: false, strikeTimer: 0, completed: true, survived: false };

  const tier = pp.currentLevel <= 4 ? 1 : 2;
  const baseStrikes = tier === 1 ? 3 : 6;
  const devilMultiplier = state.character.devilMark ? 2 : 1;
  const strikes = baseStrikes * devilMultiplier;

  const totalPower = (pp.currentLevel * 10) + (state.character.bodyType.bodyMultiplier * 20);
  const pillBonus = state.inventory.filter(i => i.effects.tribulationHpBonus).reduce((s, i) => s + (i.effects.tribulationHpBonus || 0), 0);
  const maxHp = Math.floor(totalPower * (1 + pillBonus));

  return {
    active: true, strikes, currentStrike: 0,
    hp: maxHp, maxHp,
    timeWindow: tier === 1 ? 3 : 2,
    strikeActive: false, strikeTimer: 0,
    completed: false, survived: false,
  };
}

// ========== REBIRTH ==========
export function triggerRebirth(state: GameState): GameState {
  const name = state.character.name;
  const rebirthCount = state.character.rebirthCount + 1;
  const legacyBonus = state.character.legacyBonus + (state.highestPathLevel * 0.01);
  const totalDeaths = state.totalDeaths + 1;

  const hasFateAnchor = state.inventory.some(i => i.id === 'fate_anchor');
  const hasDimensionalRing = state.inventory.some(i => i.id === 'dimensional_ring');
  const preservedItems = hasDimensionalRing ? state.inventory.filter(i => i.id !== 'dimensional_ring') : [];

  let newChar: Character;
  if (hasFateAnchor) {
    newChar = { ...state.character, karma: 0, rogueStatus: false, rebirthCount, legacyBonus, redeemedDevil: false };
  } else {
    newChar = rollCharacter(name);
    newChar.rebirthCount = rebirthCount;
    newChar.legacyBonus = legacyBonus;
    newChar.devilMark = state.character.devilMark; // devil mark persists
  }

  const newState = createInitialGameState(newChar);
  newState.inventory = preservedItems;
  newState.totalDeaths = totalDeaths;
  newState.achievements = state.achievements;

  addLog(newState, `☠️ REBIRTH #${rebirthCount}! Legacy Bonus: +${(legacyBonus * 100).toFixed(1)}% XP`, 'danger');

  return newState;
}

// ========== COMBAT ==========
export function calculatePower(state: GameState): number {
  let power = 0;
  for (const pp of Object.values(state.pathProgress)) {
    if (!pp.unlocked) continue;
    const path = PATHS.find(p => p.id === pp.pathId);
    if (!path) continue;
    power += pp.currentLevel * path.speedModifier(state) * 10;
  }
  return Math.floor(power);
}

export function resolveCombat(state: GameState, enemyPower: number): { won: boolean; message: string } {
  const playerPower = calculatePower(state);
  const ratio = playerPower / Math.max(1, enemyPower);

  if (ratio > 1.2) {
    return { won: true, message: 'Overwhelming victory!' };
  } else if (ratio > 0.8) {
    const won = Math.random() < 0.7;
    return { won, message: won ? 'Hard-fought victory!' : 'Narrowly defeated...' };
  } else {
    const won = Math.random() < 0.3;
    return { won, message: won ? 'Miraculous upset!' : 'Overwhelmingly defeated!' };
  }
}

// ========== SPEED BOOST ==========
export function buySpiritStoneBoost(state: GameState): boolean {
  const cost = 10 + state.buffs.filter(b => b.id === 'ss_boost').length * 10;
  if (state.spiritStones < cost) return false;
  state.spiritStones -= cost;
  state.buffs.push({
    id: 'ss_boost', name: 'Spirit Stone Boost',
    multiplier: 5, remainingSeconds: 600, icon: '💎',
  });
  addLog(state, `💎 Activated 5x speed boost for 10 minutes! (Cost: ${cost} SS)`, 'success');
  return true;
}

// ========== USE PILL ==========
export function usePill(state: GameState, itemId: string): boolean {
  const item = state.inventory.find(i => i.id === itemId);
  if (!item || item.category !== 'pill') return false;

  if (item.effects.healQiDeviation && state.qiDeviation.active) {
    state.qiDeviation = { active: false, remainingSeconds: 0 };
    addLog(state, '💊 Qi Deviation cured!', 'success');
  }

  if (item.effects.xpMultiplier && item.effects.xpMultiplierDuration) {
    state.buffs.push({
      id: `pill_${itemId}_${Date.now()}`, name: item.name,
      multiplier: item.effects.xpMultiplier, remainingSeconds: item.effects.xpMultiplierDuration, icon: '💊',
    });
    addLog(state, `💊 ${item.name} consumed! ${item.effects.xpMultiplier}x XP for ${formatTime(item.effects.xpMultiplierDuration)}`, 'success');
  }

  removeItemFromInventory(state, itemId);
  return true;
}

// ========== UTILITY ==========
export function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function formatPercent(n: number): string {
  return (n * 100).toFixed(1) + '%';
}
