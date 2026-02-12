import type { GameState, PathProgress, Item } from '../data/types';
import {
  PATHS, BASE_XP_PER_SECOND, CLICK_BOOST_MULTIPLIER, EVENT_CHECK_INTERVAL,
  FATED_ENCOUNTER_BASE_CHANCE, GAME_EVENTS, REGIONS, ITEMS,
  calculateXpRequired, BREAKTHROUGH_RATES, TIER_TRANSITION_LEVELS,
} from '../data/constants';
import { addLog, addItemToInventory, checkPathUnlocks, formatTime } from './gameState';

export class GameEngine {
  // ========== XP FORMULA ==========
  static calculateXPRequired(level: number): number {
    return calculateXpRequired(level);
  }

  // ========== ACTION-PATH MATCHING ==========
  /**
   * Determines if the current action feeds XP to the given path.
   * - 'cultivate' → paths with action 'cultivate' (Spirit, Rogue, Devil Soul, Oracle, Harmonic, Bloodline, Dream, Necromancy)
   * - 'train' → paths with action 'train' (Martial, Devil Body)
   * - 'explore' → NEVER gives XP (only items/events/discoveries)
   * - Special actions (refine, inscribe, forge, study, sleep) → match exact path action
   */
  static doesActionMatchPath(currentAction: string, path: typeof PATHS[number]): boolean {
    // Explore never grants path XP — it only generates discoveries
    if (currentAction === 'explore') return false;
    if (currentAction === 'idle') return false;
    // Direct match: cultivate→cultivate paths, train→train paths, refine→refine paths, etc.
    return (path.action as string) === currentAction;
  }

  // ========== XP PER SECOND ==========
  static getXPPerSecond(state: GameState): number {
    if (state.currentAction === 'idle' || (state.currentAction as string) === 'explore' || !state.activePathId) return 0;

    const pp = state.pathProgress[state.activePathId];
    if (!pp || !pp.unlocked || pp.breakthroughAvailable) return 0;

    const path = PATHS.find(p => p.id === state.activePathId);
    if (!path) return 0;

    // Verify action matches
    if (!GameEngine.doesActionMatchPath(state.currentAction, path)) return 0;

    const pathSpeed = path.speedModifier(state);
    const deviationMult = state.qiDeviation.active ? 0.5 : 1;
    const legacyMult = 1 + state.character.legacyBonus;
    const buffMult = state.buffs.reduce((m, b) => m * b.multiplier, 1);

    const bgExploreBonus = state.currentAction === 'explore'
      ? (1 + (state.character.background.bonusEffect.explorationBonus || 0))
      : 1;

    let scriptureMult = 1;
    if (state.equippedScripture && state.currentAction === 'cultivate') {
      const scripture = ITEMS[state.equippedScripture];
      if (scripture?.effects.xpMultiplier) {
        scriptureMult = scripture.effects.xpMultiplier;
      }
    }

    return BASE_XP_PER_SECOND * pathSpeed * deviationMult * legacyMult * buffMult * bgExploreBonus * scriptureMult;
  }

  // ========== BREAKTHROUGH CHANCE ==========
  static getBreakthroughChance(state: GameState, pillBonus: number = 0): number {
    const pp = state.pathProgress[state.activePathId!];
    if (!pp) return 0;
    const baseRate = BREAKTHROUGH_RATES[pp.currentLevel] || 0.10;
    const luckBonus = state.character.luck * 0.05;
    return Math.min(0.95, baseRate + pillBonus + luckBonus);
  }

  static isTierTransition(level: number): boolean {
    return TIER_TRANSITION_LEVELS.includes(level);
  }

  // ========== CORE TICK ==========
  static tick(state: GameState, clickBoost: boolean = false): GameState {
    state.tickCount++;
    state.totalPlayTime++;

    // === TRAVEL ===
    if (state.travelState.traveling) {
      state.travelState.remainingSeconds--;
      if (state.travelState.remainingSeconds <= 0) {
        state.travelState.traveling = false;
        if (state.travelState.destinationId) {
          state.currentLocationId = state.travelState.destinationId;
          if (!state.discoveredRegions.includes(state.currentLocationId)) {
            state.discoveredRegions.push(state.currentLocationId);
          }
          const region = REGIONS.find(r => r.id === state.currentLocationId);
          if (region) {
            addLog(state, `🗺️ Arrived at ${region.name}`, 'success');
            region.connections.forEach(c => {
              if (!state.discoveredRegions.includes(c)) {
                state.discoveredRegions.push(c);
              }
            });
          }
        }
        state.travelState.destinationId = null;
      }
      return state;
    }

    // === BUFF COUNTDOWN ===
    state.buffs = state.buffs.filter(b => {
      b.remainingSeconds--;
      if (b.remainingSeconds <= 0) {
        addLog(state, `⏱️ ${b.name} has expired.`, 'info');
        return false;
      }
      return true;
    });

    // === QI DEVIATION COUNTDOWN ===
    if (state.qiDeviation.active) {
      state.qiDeviation.remainingSeconds--;
      if (state.qiDeviation.remainingSeconds <= 0) {
        state.qiDeviation.active = false;
        addLog(state, '✅ Qi Deviation has cleared. Your mind is calm again.', 'success');
      }
    }

    // === MAIN ACTION: XP GAIN ===
    // Cultivate → only paths with action 'cultivate' (spirit, rogue, devil_soul, oracle, harmonic, bloodline, dream, necromancy)
    // Train → only paths with action 'train' (martial, devil_body)
    // Explore → NO XP gain, only discoveries/loot/events
    // Special actions (refine, inscribe, forge, study, sleep) → only matching paths
    if (state.currentAction !== 'idle' && state.currentAction !== 'explore' && state.activePathId) {
      const pp = state.pathProgress[state.activePathId];
      const path = PATHS.find(p => p.id === state.activePathId);

      // Only grant XP if the active path's action matches the current action
      // OR if a special action maps to its path
      const actionMatches = path && GameEngine.doesActionMatchPath(state.currentAction, path);

      if (pp && pp.unlocked && !pp.breakthroughAvailable && actionMatches) {
        const baseXpPerSec = GameEngine.getXPPerSecond(state);
        const clickMult = clickBoost ? CLICK_BOOST_MULTIPLIER : 1;
        const xpGain = baseXpPerSec * clickMult;

        pp.currentXp += xpGain;

        if (pp.currentXp >= pp.xpRequired) {
          pp.currentXp = pp.xpRequired;
          pp.breakthroughAvailable = true;
          const levelName = path?.levels[pp.currentLevel - 1]?.name || `Level ${pp.currentLevel}`;
          addLog(state, `⚡ ${levelName} XP maxed! Attempt Breakthrough!`, 'warning');
        }
      }
    }

    // === EXPLORATION DISCOVERIES ===
    if (state.currentAction === 'explore' && !state.travelState.traveling) {
      GameEngine.processExploration(state);
    }

    // === KARMA VISIBILITY CHECK ===
    if (!state.karmaVisible) {
      for (const pp of Object.values(state.pathProgress)) {
        if (pp.currentLevel >= 5) {
          state.karmaVisible = true;
          addLog(state, '🔮 Your karma becomes visible to your inner eye...', 'legendary');
          break;
        }
      }
    }

    // === UPDATE HIGHEST PATH LEVEL ===
    for (const pp of Object.values(state.pathProgress)) {
      if (pp.currentLevel > state.highestPathLevel) {
        state.highestPathLevel = pp.currentLevel;
      }
    }

    // === SPECIAL PATH UNLOCK CHECKS ===
    GameEngine.checkSpecialPathUnlocks(state);

    return state;
  }

  // ========== EXPLORATION ==========
  private static processExploration(state: GameState): void {
    const region = REGIONS.find(r => r.id === state.currentLocationId);
    if (!region) return;

    // Base discovery rate: 0.5% to 3% per tick, modified by luck
    const baseDiscoveryRate = 0.005 + state.character.luck * 0.025;
    const explorationBonus = state.character.background.bonusEffect.explorationBonus || 0;
    const rogueBonus = state.character.rogueStatus ? 0.005 : 0; // +0.5% for rogues (15% of base roughly)
    const discoveryChance = baseDiscoveryRate + explorationBonus + rogueBonus;

    // Small spirit stone trickle from exploring (1 per ~30 ticks on average)
    if (Math.random() < 0.033) {
      const amount = 1 + Math.floor(Math.random() * 3);
      state.spiritStones += amount;
      // Only log occasionally to avoid spam
      if (Math.random() < 0.3) {
        addLog(state, `💎 Found ${amount} Spirit Stone${amount > 1 ? 's' : ''} while exploring.`, 'info');
      }
    }

    if (Math.random() < discoveryChance) {
      GameEngine.generateLoot(state, region);
    }

    // Fated Encounters
    const fatedChance = FATED_ENCOUNTER_BASE_CHANCE * (1 + state.character.luck * 5);
    if (Math.random() < fatedChance) {
      const fatedEvents = GAME_EVENTS.filter(e => e.isFated);
      const regionFated = fatedEvents.filter(e => region.eventPool.includes(e.id));
      const pool = regionFated.length > 0 ? regionFated : fatedEvents;
      if (pool.length > 0) {
        const event = pool[Math.floor(Math.random() * pool.length)];
        state._pendingEvent = event;
      }
    }

    // Random events every 60 ticks
    if (state.tickCount % EVENT_CHECK_INTERVAL === 0) {
      if (region.eventPool.length > 0 && !state._pendingEvent) {
        const eventId = region.eventPool[Math.floor(Math.random() * region.eventPool.length)];
        const event = GAME_EVENTS.find(e => e.id === eventId && !e.isFated);
        if (event) {
          state._pendingEvent = event;
        }
      }
    }
  }

  // ========== LOOT GENERATION ==========
  private static generateLoot(state: GameState, region: typeof REGIONS[number]): void {
    const validLoot = region.lootTable.filter(l => l.minDanger <= region.dangerLevel);
    if (validLoot.length === 0) return;

    const totalWeight = validLoot.reduce((s, l) => s + l.weight, 0);
    let roll = Math.random() * totalWeight;
    let selectedLoot = validLoot[0];
    for (const loot of validLoot) {
      roll -= loot.weight;
      if (roll <= 0) {
        selectedLoot = loot;
        break;
      }
    }

    const item: Item | undefined = ITEMS[selectedLoot.itemId];
    if (!item) return;

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
      const logType = (item.rarity === 'legendary' || item.rarity === 'mythic')
        ? 'legendary'
        : (item.rarity === 'epic' || item.rarity === 'rare')
          ? 'success'
          : 'info';
      addLog(state, `🔍 Found: ${item.name}`, logType as 'info' | 'success' | 'legendary');

      checkPathUnlocks(state);
    }
  }

  // ========== SPECIAL PATH UNLOCKS ==========
  private static checkSpecialPathUnlocks(state: GameState): void {
    // Beast Tamer
    if (state.currentAction === 'explore' && !state.pathProgress['beast_tamer']?.unlocked) {
      const region = REGIONS.find(r => r.id === state.currentLocationId);
      if (region && region.id === 'spirit_beast_territory') {
        if (Math.random() < 0.005 * state.character.luck) {
          state.pathProgress['beast_tamer'] = GameEngine.createPathProgress('beast_tamer');
          addLog(state, '🐉 A spirit beast approaches! The Resonance Path is unlocked!', 'legendary');
        }
      }
    }

    // Dream Walker
    if (state.currentAction === 'cultivate' && !state.pathProgress['dream']?.unlocked) {
      if (Math.random() < 0.0002) {
        state.pathProgress['dream'] = GameEngine.createPathProgress('dream');
        addLog(state, '🌙 A lucid dream overtakes you... The Illusion Path is unlocked!', 'legendary');
      }
    }

    // Rogue Path
    if (state.character.rogueStatus && !state.pathProgress['rogue']?.unlocked) {
      const path = PATHS.find(p => p.id === 'rogue');
      if (path && path.unlockCheck(state)) {
        state.pathProgress['rogue'] = GameEngine.createPathProgress('rogue');
        addLog(state, '🌪️ The Wild Path opens before you!', 'legendary');
      }
    }

    // Devil paths
    if (state.character.karma <= -100) {
      if (!state.pathProgress['devil_soul']?.unlocked) {
        state.pathProgress['devil_soul'] = GameEngine.createPathProgress('devil_soul');
        state.character.devilMark = true;
        addLog(state, '💀 Soul Corruption path unlocked! You are marked as a Devil Cultivator!', 'danger');
      }
      if (!state.pathProgress['devil_body']?.unlocked) {
        state.pathProgress['devil_body'] = GameEngine.createPathProgress('devil_body');
        addLog(state, '🩸 Body Corruption path unlocked!', 'danger');
      }
    }
  }

  // ========== HELPER ==========
  static createPathProgress(pathId: string): PathProgress {
    return {
      pathId,
      currentLevel: 1,
      currentXp: 0,
      xpRequired: calculateXpRequired(1),
      breakthroughAvailable: false,
      unlocked: true,
    };
  }

  // ========== SPEED BOOST ==========
  static buySpiritStoneBoost(state: GameState): boolean {
    const existingBoosts = state.buffs.filter(b => b.id === 'ss_boost').length;
    const cost = 10 + existingBoosts * 10;
    if (state.spiritStones < cost) return false;

    state.spiritStones -= cost;
    state.buffs.push({
      id: 'ss_boost',
      name: 'Spirit Stone Boost',
      multiplier: 5,
      remainingSeconds: 600,
      icon: '💎',
    });
    addLog(state, `💎 Activated 5x speed boost for 10 minutes! (Cost: ${cost} SS)`, 'success');
    return true;
  }

  // ========== USE PILL ==========
  static usePill(state: GameState, itemId: string): boolean {
    const item = state.inventory.find(i => i.id === itemId);
    if (!item || item.category !== 'pill') return false;

    if (item.effects.healQiDeviation && state.qiDeviation.active) {
      state.qiDeviation = { active: false, remainingSeconds: 0 };
      addLog(state, '💊 Qi Deviation cured!', 'success');
    }

    if (item.effects.xpMultiplier && item.effects.xpMultiplierDuration) {
      state.buffs.push({
        id: `pill_${itemId}_${Date.now()}`,
        name: item.name,
        multiplier: item.effects.xpMultiplier,
        remainingSeconds: item.effects.xpMultiplierDuration,
        icon: '💊',
      });
      addLog(
        state,
        `💊 ${item.name} consumed! ${item.effects.xpMultiplier}x XP for ${formatTime(item.effects.xpMultiplierDuration)}`,
        'success'
      );
    }

    const idx = state.inventory.findIndex(i => i.id === itemId);
    if (idx !== -1) {
      state.inventory[idx].quantity--;
      if (state.inventory[idx].quantity <= 0) {
        state.inventory.splice(idx, 1);
      }
    }

    return true;
  }
}
