import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, Character } from './data/types';
import { createInitialGameState, addLog, addItemToInventory, checkPathUnlocks, triggerRebirth } from './engine/gameState';
import { GameEngine } from './engine/GameEngine';
import { SaveManager } from './engine/SaveManager';
import { ITEMS } from './data/constants';
import { CharacterCreation } from './components/CharacterCreation';
import { GameLayout } from './components/GameLayout';
import type { TabId } from './components/GameLayout';
import { CultivationTab } from './components/tabs/CultivationTab';
import { MapTab, GroupTab, SkillsTab, ShopTab, CharacterTab, EventModal } from './components/GameTabs';

export function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [clickBoost, setClickBoost] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Use refs for values needed in intervals
  const clickBoostRef = useRef(false);
  const gameStateRef = useRef<GameState | null>(null);
  gameStateRef.current = gameState;

  // ===== LOAD SAVE ON MOUNT =====
  useEffect(() => {
    const saved = SaveManager.loadFromLocalStorage();
    if (saved) {
      const processed = SaveManager.calculateOfflineProgress(saved);
      setGameState(processed);
      setIsCreating(false);
    } else {
      setIsCreating(true);
    }
    setLoaded(true);
  }, []);

  // ===== GAME LOOP — 1Hz tick =====
  useEffect(() => {
    if (!gameState || gameState.gamePhase !== 'playing') return;

    const interval = setInterval(() => {
      setGameState(prev => {
        if (!prev || prev.gamePhase !== 'playing') return prev;
        // Deep clone to avoid mutation issues
        const cloned = JSON.parse(JSON.stringify(prev)) as GameState;
        const boosted = clickBoostRef.current;
        clickBoostRef.current = false;
        const result = GameEngine.tick(cloned, boosted);
        return result;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.gamePhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== AUTO-SAVE every 30 seconds =====
  useEffect(() => {
    if (!gameState || gameState.gamePhase !== 'playing') return;

    const interval = setInterval(() => {
      const current = gameStateRef.current;
      if (current && current.gamePhase === 'playing') {
        SaveManager.saveToLocalStorage(current);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [gameState?.gamePhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== CHARACTER CREATION =====
  const handleCharacterConfirm = useCallback((character: Character) => {
    const state = createInitialGameState(character);
    setGameState(state);
    setIsCreating(false);
    SaveManager.saveToLocalStorage(state);
  }, []);

  // ===== CLICK BOOST =====
  const handleClickBoost = useCallback(() => {
    clickBoostRef.current = true;
    setClickBoost(true);
    setTimeout(() => setClickBoost(false), 200);
  }, []);

  // ===== REBIRTH =====
  const handleRebirth = useCallback((currentState: GameState) => {
    const newState = triggerRebirth(currentState);
    setGameState(newState);
    SaveManager.saveToLocalStorage(newState);
  }, []);

  // ===== EVENT CHOICE =====
  const handleEventChoice = useCallback((choiceIdx: number) => {
    setGameState(prev => {
      if (!prev || !prev._pendingEvent) return prev;
      const event = prev._pendingEvent;
      const choice = event.choices[choiceIdx];
      if (!choice) return prev;

      const ns = JSON.parse(JSON.stringify(prev)) as GameState;
      ns._pendingEvent = null;

      // Apply karma change
      if (choice.karmaChange) {
        ns.character.karma = Math.max(-1000, Math.min(1000, ns.character.karma + choice.karmaChange));
      }

      // Apply spirit stone rewards
      if (choice.rewards.spiritStones) {
        ns.spiritStones += choice.rewards.spiritStones;
      }

      // Apply spirit stone losses
      if (choice.losses.spiritStones) {
        ns.spiritStones = Math.max(0, ns.spiritStones - choice.losses.spiritStones);
      }

      // Apply item rewards
      if (choice.rewards.items) {
        choice.rewards.items.forEach(itemId => {
          const item = ITEMS[itemId];
          if (item) addItemToInventory(ns, item);
        });
      }

      addLog(
        ns,
        `📋 ${event.title}: ${choice.text}`,
        choice.karmaChange >= 0 ? 'success' : 'warning'
      );

      checkPathUnlocks(ns);

      // Check devil path unlock
      if (ns.character.karma <= -100 && !ns.character.devilMark) {
        if (ns.pathProgress['devil_soul']?.unlocked || ns.pathProgress['devil_body']?.unlocked) {
          ns.character.devilMark = true;
          addLog(ns, '💀 You have been permanently marked as a Devil Cultivator!', 'danger');
        }
      }

      return ns;
    });
  }, []);

  // ===== LOADING STATE =====
  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔮</div>
          <div style={{ color: '#fbbf24', fontFamily: 'Cinzel, serif' }}>
            Loading the Grand Dao...
          </div>
        </div>
      </div>
    );
  }

  // ===== CHARACTER CREATION SCREEN =====
  if (isCreating || !gameState) {
    return <CharacterCreation onConfirm={handleCharacterConfirm} />;
  }

  // ===== RENDER TAB CONTENT =====
  const renderTab = (tabId: TabId) => {
    switch (tabId) {
      case 'cultivation':
        return (
          <CultivationTab
            state={gameState}
            setState={s => setGameState(s)}
            onClickBoost={handleClickBoost}
            onRebirth={handleRebirth}
          />
        );
      case 'map':
        return <MapTab state={gameState} setState={s => setGameState(s)} />;
      case 'group':
        return <GroupTab state={gameState} setState={s => setGameState(s)} />;
      case 'skills':
        return <SkillsTab state={gameState} setState={s => setGameState(s)} />;
      case 'shop':
        return <ShopTab state={gameState} setState={s => setGameState(s)} />;
      case 'character':
        return <CharacterTab state={gameState} setState={s => setGameState(s)} />;
      default:
        return null;
    }
  };

  return (
    <>
      <GameLayout
        state={gameState}
        setState={s => setGameState(s)}
        clickBoost={clickBoost}
        renderTab={renderTab}
      />

      {/* EVENT MODAL */}
      {gameState._pendingEvent && (
        <EventModal
          event={gameState._pendingEvent}
          onChoice={handleEventChoice}
        />
      )}
    </>
  );
}
