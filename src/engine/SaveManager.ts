import type { GameState } from '../data/types';
import { PATHS, BASE_XP_PER_SECOND } from '../data/constants';
import { addLog, formatTime, formatNumber } from './gameState';

const SAVE_KEY = 'incremental_cultivation_save';
const OFFLINE_CAP_SECONDS = 8 * 3600; // 8 hours

export class SaveManager {
  // ========== LOCAL STORAGE ==========
  static saveToLocalStorage(gameState: GameState): boolean {
    gameState.lastSaveTimestamp = Date.now();
    try {
      const serialized = JSON.stringify(gameState);
      localStorage.setItem(SAVE_KEY, serialized);
      return true;
    } catch {
      // Storage full or unavailable
      console.warn('Failed to save to localStorage');
      return false;
    }
  }

  static loadFromLocalStorage(): GameState | null {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data) as GameState;
      // Validate basic structure
      if (!parsed.character || !parsed.pathProgress) return null;
      return parsed;
    } catch {
      console.warn('Failed to load from localStorage');
      return null;
    }
  }

  // ========== EXPORT / IMPORT ==========
  static exportSave(gameState: GameState): string {
    gameState.lastSaveTimestamp = Date.now();
    const json = JSON.stringify(gameState);
    return btoa(unescape(encodeURIComponent(json)));
  }

  static importSave(saveString: string): GameState | null {
    try {
      const trimmed = saveString.trim();
      const json = decodeURIComponent(escape(atob(trimmed)));
      const parsed = JSON.parse(json) as GameState;
      // Validate basic structure
      if (!parsed.character || !parsed.pathProgress || !parsed.gamePhase) {
        return null;
      }
      parsed.lastSaveTimestamp = Date.now();
      return parsed;
    } catch {
      console.warn('Failed to import save string');
      return null;
    }
  }

  // ========== OFFLINE PROGRESS ==========
  static calculateOfflineProgress(gameState: GameState): GameState {
    const now = Date.now();
    const elapsedMs = now - gameState.lastSaveTimestamp;
    const elapsedSeconds = Math.min(Math.floor(elapsedMs / 1000), OFFLINE_CAP_SECONDS);

    // Skip if less than 5 seconds elapsed
    if (elapsedSeconds < 5) return gameState;

    let xpGained = 0;

    // Calculate XP gained offline for active path
    if (gameState.currentAction !== 'idle' && gameState.activePathId) {
      const pp = gameState.pathProgress[gameState.activePathId];
      if (pp && pp.unlocked && !pp.breakthroughAvailable) {
        const path = PATHS.find(p => p.id === gameState.activePathId);
        if (path) {
          const speed = path.speedModifier(gameState);
          const deviationMult = gameState.qiDeviation.active ? 0.5 : 1;
          const legacyMult = 1 + gameState.character.legacyBonus;
          // No click boost or buffs for offline progress — buffs would have expired
          const xpPerTick = BASE_XP_PER_SECOND * speed * deviationMult * legacyMult;
          xpGained = xpPerTick * elapsedSeconds;

          pp.currentXp += xpGained;
          if (pp.currentXp >= pp.xpRequired) {
            pp.currentXp = pp.xpRequired;
            pp.breakthroughAvailable = true;
          }
        }
      }
    }

    // Clear Qi Deviation if enough time passed
    if (gameState.qiDeviation.active) {
      gameState.qiDeviation.remainingSeconds = Math.max(
        0,
        gameState.qiDeviation.remainingSeconds - elapsedSeconds
      );
      if (gameState.qiDeviation.remainingSeconds <= 0) {
        gameState.qiDeviation.active = false;
      }
    }

    // Clear expired buffs
    gameState.buffs = gameState.buffs.filter(b => {
      b.remainingSeconds -= elapsedSeconds;
      return b.remainingSeconds > 0;
    });

    // Handle travel completion
    if (gameState.travelState.traveling) {
      gameState.travelState.remainingSeconds -= elapsedSeconds;
      if (gameState.travelState.remainingSeconds <= 0) {
        gameState.travelState.traveling = false;
        if (gameState.travelState.destinationId) {
          gameState.currentLocationId = gameState.travelState.destinationId;
          if (!gameState.discoveredRegions.includes(gameState.currentLocationId)) {
            gameState.discoveredRegions.push(gameState.currentLocationId);
          }
        }
        gameState.travelState.destinationId = null;
        gameState.travelState.remainingSeconds = 0;
      }
    }

    // Grant small spirit stone offline bonus
    const offlineStones = Math.floor(elapsedSeconds / 600); // 1 per 10 minutes
    if (offlineStones > 0) {
      gameState.spiritStones += offlineStones;
    }

    // Log offline progress
    if (xpGained > 0 || offlineStones > 0) {
      addLog(
        gameState,
        `⏰ Offline: ${formatTime(elapsedSeconds)} — ${xpGained > 0 ? `+${formatNumber(xpGained)} XP` : ''}${offlineStones > 0 ? ` +${offlineStones} 💎` : ''}`,
        'system'
      );
    }

    // Update timestamps
    gameState.lastSaveTimestamp = now;
    gameState.totalPlayTime += elapsedSeconds;

    return gameState;
  }

  // ========== DELETE ==========
  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
