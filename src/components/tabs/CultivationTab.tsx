import { useState, useMemo, useEffect, useCallback } from 'react';
import type { GameState, ActionType } from '../../data/types';
import { PATHS, BREAKTHROUGH_RATES, REGIONS } from '../../data/constants';
import {
  formatNumber, formatTime, formatPercent,
  attemptBreakthrough, addLog,
  removeItemFromInventory,
  startTribulation,
} from '../../engine/gameState';
import { GameEngine } from '../../engine/GameEngine';
import type { TribulationState } from '../../engine/gameState';

interface CultivationTabProps {
  state: GameState;
  setState: (s: GameState) => void;
  onClickBoost: () => void;
  onRebirth: (state: GameState) => void;
}

// ===== ANIMATED XP BAR =====
function XPBar({ progress, color, glow = false }: { progress: number; color: string; glow?: boolean }) {
  return (
    <div className="relative h-5 rounded-full overflow-hidden" style={{ background: '#12101a' }}>
      {/* Background shimmer lines */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 10px,
            ${color}08 10px,
            ${color}08 20px
          )`,
        }}
      />
      {/* Fill bar */}
      <div
        className="h-full rounded-full transition-all duration-700 ease-out relative"
        style={{
          width: `${Math.max(0.5, progress)}%`,
          background: `linear-gradient(90deg, ${color}66, ${color}cc, ${color})`,
          boxShadow: glow
            ? `0 0 12px ${color}55, 0 0 24px ${color}22, inset 0 1px 0 ${color}44`
            : `inset 0 1px 0 ${color}33`,
        }}
      >
        {/* Animated shine effect */}
        {progress > 5 && progress < 100 && (
          <div className="absolute inset-0 rounded-full overflow-hidden" style={{ opacity: 0.3 }}>
            <div
              className="h-full w-12 absolute"
              style={{
                background: `linear-gradient(90deg, transparent, ${color}66, transparent)`,
                animation: 'shimmer 2s infinite',
                left: '-48px',
              }}
            />
          </div>
        )}
        {/* Full bar pulse */}
        {progress >= 100 && (
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: `linear-gradient(90deg, ${color}44, ${color}88, ${color}44)`,
              boxShadow: `0 0 20px ${color}66`,
            }}
          />
        )}
      </div>
      {/* Percentage text overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-[10px] font-bold text-white drop-shadow-lg"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          {progress.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ===== TRIBULATION MINI-GAME =====
function TribulationModal({
  tribulation,
  onResist,
  onFail,
}: {
  tribulation: TribulationState;
  onResist: () => void;
  onFail: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(tribulation.timeWindow);
  const [flash, setFlash] = useState(false);

  // Stable callback ref for onFail
  const onFailRef = useCallback(() => {
    onFail();
  }, [onFail]);

  useEffect(() => {
    if (!tribulation.strikeActive) return;
    setTimeLeft(tribulation.timeWindow);
    setFlash(true);
    const flashTimer = setTimeout(() => setFlash(false), 200);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          onFailRef();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => {
      clearInterval(timer);
      clearTimeout(flashTimer);
    };
  }, [tribulation.strikeActive, tribulation.currentStrike, tribulation.timeWindow, onFailRef]);

  const hpPercent = (tribulation.hp / tribulation.maxHp) * 100;
  const timePercent = (timeLeft / tribulation.timeWindow) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: flash ? 'rgba(255, 200, 0, 0.3)' : 'rgba(0, 0, 0, 0.92)',
        transition: 'background 0.2s',
      }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 border relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0d0510, #0a0a15)',
          borderColor: '#ff444466',
          boxShadow: '0 0 40px rgba(255, 68, 68, 0.2), 0 0 80px rgba(255, 68, 68, 0.1)',
        }}
      >
        {flash && <div className="absolute inset-0 bg-yellow-200 opacity-30 z-10" />}

        <h3
          className="text-xl font-bold text-center mb-2"
          style={{ fontFamily: 'Cinzel, serif', color: '#fbbf24', textShadow: '0 0 20px rgba(251, 191, 36, 0.5)' }}
        >
          ⛈️ HEAVENLY TRIBULATION ⛈️
        </h3>

        <div className="text-center text-sm text-gray-400 mb-4">
          Lightning Strike <span className="font-bold text-white">{tribulation.currentStrike + 1}</span> of <span className="font-bold text-white">{tribulation.strikes}</span>
        </div>

        {/* HP Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Tribulation HP</span>
            <span style={{ color: hpPercent > 50 ? '#4ade80' : hpPercent > 25 ? '#fbbf24' : '#ef4444' }}>
              {Math.ceil(tribulation.hp)} / {tribulation.maxHp}
            </span>
          </div>
          <div className="h-4 rounded-full overflow-hidden" style={{ background: '#1a0a0a' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${hpPercent}%`,
                background: hpPercent > 50
                  ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                  : hpPercent > 25
                    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                    : 'linear-gradient(90deg, #ef4444, #dc2626)',
              }}
            />
          </div>
        </div>

        {/* Time Bar */}
        {tribulation.strikeActive && (
          <div className="mb-4">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a1025' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${timePercent}%`,
                  background: timePercent > 50 ? '#60a5fa' : timePercent > 25 ? '#fbbf24' : '#ef4444',
                  transition: 'width 0.1s linear',
                }}
              />
            </div>
            <div className="text-xs text-center mt-1 text-gray-500">{timeLeft.toFixed(1)}s remaining</div>
          </div>
        )}

        {tribulation.strikeActive && (
          <button
            onClick={onResist}
            className="w-full py-5 rounded-lg font-bold text-xl transition-all active:scale-95 animate-pulse"
            style={{
              background: 'linear-gradient(135deg, #b91c1c, #dc2626, #ef4444, #dc2626)',
              color: '#fef3c7',
              minHeight: '64px',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
              fontFamily: 'Cinzel, serif',
              letterSpacing: '0.1em',
            }}
          >
            ⚡ RESIST THE LIGHTNING ⚡
          </button>
        )}

        {!tribulation.strikeActive && !tribulation.completed && (
          <div className="text-center py-4 text-gray-500 animate-pulse">
            Preparing next strike...
          </div>
        )}
      </div>
    </div>
  );
}

// ===== ACTION BUTTON =====
function ActionButton({
  action,
  icon,
  isActive,
  onClick,
}: {
  action: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const colors: Record<string, { active: string; bg: string }> = {
    cultivate: { active: '#4ade80', bg: '#0a2a1a' },
    train: { active: '#f97316', bg: '#2a1a0a' },
    explore: { active: '#60a5fa', bg: '#0a1a2a' },
  };
  const c = colors[action] || { active: '#888', bg: '#1a1025' };

  return (
    <button
      onClick={onClick}
      className="py-3.5 rounded-lg font-bold text-sm transition-all duration-200 capitalize relative overflow-hidden"
      style={{
        background: isActive ? c.bg : '#0e0e18',
        color: isActive ? c.active : '#555',
        border: `2px solid ${isActive ? c.active : '#1a1828'}`,
        minHeight: '52px',
        boxShadow: isActive ? `0 0 15px ${c.active}20, inset 0 0 15px ${c.active}08` : 'none',
      }}
    >
      {isActive && (
        <div className="absolute inset-0 rounded-lg animate-pulse" style={{ boxShadow: `inset 0 0 12px ${c.active}15` }} />
      )}
      <span className="relative z-10">{icon} {action}</span>
    </button>
  );
}

// ===== MAIN CULTIVATION TAB =====
export function CultivationTab({ state, setState, onClickBoost, onRebirth }: CultivationTabProps) {
  const [breakResult, setBreakResult] = useState<{ message: string; success: boolean } | null>(null);
  const [tribulation, setTribulation] = useState<TribulationState | null>(null);
  const [clickFlash, setClickFlash] = useState(false);

  const activePath = state.activePathId ? PATHS.find(p => p.id === state.activePathId) : null;
  const activeProgress = state.activePathId ? state.pathProgress[state.activePathId] : null;
  const unlockedPaths = PATHS.filter(p => state.pathProgress[p.id]?.unlocked);

  // Calculate XP/sec using engine
  const xpPerSec = useMemo(() => GameEngine.getXPPerSecond(state), [state]);

  const progressPercent = activeProgress
    ? (activeProgress.currentXp / activeProgress.xpRequired) * 100
    : 0;

  const currentLevelData = activePath && activeProgress
    ? activePath.levels[activeProgress.currentLevel - 1]
    : null;

  // ===== ACTION TOGGLE =====
  // Cultivate → Path of the Spirit (Qi paths)
  // Train → Path of the Carnal (Body paths)  
  // Explore → No path XP, only discoveries/items/events
  const handleAction = useCallback((action: ActionType) => {
    const ns = JSON.parse(JSON.stringify(state)) as GameState;
    if (ns.currentAction === action) {
      // Toggle off
      ns.currentAction = 'idle';
    } else {
      ns.currentAction = action;
      
      if (action === 'cultivate') {
        // Auto-select the first unlocked Qi cultivation path
        // Priority: spirit > rogue > devil_soul > oracle > harmonic > bloodline > dream > necromancy
        const qiPaths = ['spirit', 'rogue', 'devil_soul', 'oracle', 'harmonic', 'bloodline', 'dream', 'necromancy'];
        const qiPath = qiPaths.find(id => ns.pathProgress[id]?.unlocked);
        if (qiPath) {
          ns.activePathId = qiPath;
        } else {
          // No Qi path unlocked yet — still set the action so player can see they need a scripture
          addLog(ns, '📜 You need a Cultivation Scripture to cultivate the Spirit. Try Exploring or Training first!', 'warning');
        }
      } else if (action === 'train') {
        // Auto-select the first unlocked Body cultivation path
        // Priority: martial > devil_body
        const bodyPaths = ['martial', 'devil_body'];
        const bodyPath = bodyPaths.find(id => ns.pathProgress[id]?.unlocked);
        if (bodyPath) {
          ns.activePathId = bodyPath;
        }
      }
      // Explore: don't change activePathId — explore doesn't progress paths
      // It only generates discoveries, items, encounters, and events
    }
    setState(ns);
  }, [state, setState]);

  // ===== BREAKTHROUGH =====
  const handleBreakthrough = useCallback(() => {
    const ns = JSON.parse(JSON.stringify(state)) as GameState;

    // Calculate pill bonus
    const pillBonus = ns.inventory
      .filter(i => i.id === 'breakthrough_pill')
      .reduce((s, i) => s + (i.effects.breakthroughBonus || 0) * i.quantity, 0);

    // Consume breakthrough pills
    while (ns.inventory.some(i => i.id === 'breakthrough_pill')) {
      removeItemFromInventory(ns, 'breakthrough_pill');
    }

    const result = attemptBreakthrough(ns, pillBonus);
    setBreakResult({ message: result.message, success: result.success });

    if (result.outcome === 'death') {
      setState(ns);
      setTimeout(() => {
        onRebirth(ns);
        setBreakResult(null);
      }, 3000);
    } else {
      setState(ns);
      setTimeout(() => setBreakResult(null), 4000);
    }
  }, [state, setState, onRebirth]);

  // ===== CLICK BOOST =====
  const handleClickBoost = useCallback(() => {
    onClickBoost();
    setClickFlash(true);
    setTimeout(() => setClickFlash(false), 200);
  }, [onClickBoost]);

  // ===== TRIBULATION =====
  const startTribulationHandler = useCallback(() => {
    const ts = startTribulation(state);
    setTribulation(ts);
    addLog(state, '⛈️ HEAVENLY TRIBULATION BEGINS!', 'danger');
    setState({ ...state });
    setTimeout(() => {
      setTribulation(prev => prev ? { ...prev, strikeActive: true } : null);
    }, 1000);
  }, [state, setState]);

  const handleTribulationResist = useCallback(() => {
    setTribulation(prev => {
      if (!prev) return null;
      const next = { ...prev, strikeActive: false, currentStrike: prev.currentStrike + 1 };
      if (next.currentStrike >= next.strikes) {
        next.completed = true;
        next.survived = true;
        setTimeout(() => {
          handleBreakthrough();
          setTribulation(null);
        }, 500);
        return next;
      }
      setTimeout(() => {
        setTribulation(p => p ? { ...p, strikeActive: true } : null);
      }, 800);
      return next;
    });
  }, [handleBreakthrough]);

  const handleTribulationFail = useCallback(() => {
    setTribulation(prev => {
      if (!prev) return null;
      const damage = Math.floor(prev.maxHp * 0.3);
      const next = { ...prev, hp: prev.hp - damage, strikeActive: false };
      if (next.hp <= 0) {
        next.completed = true;
        next.survived = false;
        addLog(state, '💀 TRIBULATION FAILED! Your body is destroyed...', 'danger');
        setTimeout(() => {
          onRebirth(state);
          setTribulation(null);
        }, 2000);
        return next;
      }
      next.currentStrike++;
      if (next.currentStrike >= next.strikes) {
        next.completed = true;
        next.survived = true;
        setTimeout(() => {
          handleBreakthrough();
          setTribulation(null);
        }, 500);
        return next;
      }
      setTimeout(() => {
        setTribulation(p => p ? { ...p, strikeActive: true } : null);
      }, 800);
      return next;
    });
  }, [state, onRebirth, handleBreakthrough]);

  // ===== SPEED BOOST =====
  const handleSpeedBoost = useCallback(() => {
    const ns = JSON.parse(JSON.stringify(state)) as GameState;
    if (GameEngine.buySpiritStoneBoost(ns)) {
      setState(ns);
    }
  }, [state, setState]);

  // ===== USE PILL (Qi Deviation Cure) =====
  const handleCureDeviation = useCallback(() => {
    const ns = JSON.parse(JSON.stringify(state)) as GameState;
    GameEngine.usePill(ns, 'deviation_cure');
    setState(ns);
  }, [state, setState]);

  // Helper: determine what action type a path primarily uses
  const getPathAction = (pathId: string): ActionType => {
    const path = PATHS.find(p => p.id === pathId);
    return path?.action || 'cultivate';
  };

  const boostCost = 10 + state.buffs.filter(b => b.id === 'ss_boost').length * 10;

  return (
    <div className="space-y-4">
      {/* CSS Animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(0); }
          100% { transform: translateX(400px); }
        }
      `}</style>

      {/* ===== CURRENT PATH STATUS ===== */}
      {activePath && activeProgress && (
        <div
          className="rounded-xl p-4 border relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0d0d18, #0e0a15)',
            borderColor: `${activePath.color}25`,
            boxShadow: `0 0 20px ${activePath.color}08`,
          }}
        >
          {/* Subtle background glow */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-5"
            style={{ background: activePath.color }}
          />

          {/* Header row */}
          <div className="flex items-start justify-between mb-3 relative z-10">
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] mb-0.5" style={{ color: `${activePath.color}88` }}>
                {activePath.subtitle}
              </div>
              <h3 className="text-lg font-bold leading-tight" style={{ fontFamily: 'Cinzel, serif', color: activePath.color }}>
                {activePath.icon} {activePath.name}
              </h3>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">
                {currentLevelData?.tierName} Tier
              </div>
              <div className="text-lg font-bold" style={{ fontFamily: 'Cinzel, serif', color: activePath.color }}>
                Lv. {activeProgress.currentLevel}
                <span className="text-xs text-gray-500">/12</span>
              </div>
            </div>
          </div>

          {/* Level name & flavor */}
          <div className="mb-4 relative z-10">
            <div className="font-bold text-white text-base" style={{ fontFamily: 'Cinzel, serif' }}>
              {currentLevelData?.name}
            </div>
            <div className="text-xs italic mt-0.5" style={{ color: '#6a5a7a' }}>
              "{currentLevelData?.flavor}"
            </div>
          </div>

          {/* XP Display */}
          <div className="mb-1.5 relative z-10">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-400">
                {formatNumber(activeProgress.currentXp)}
                <span className="text-gray-600"> / </span>
                {formatNumber(activeProgress.xpRequired)} XP
              </span>
              <span className="font-bold" style={{ color: state.currentAction !== 'idle' ? activePath.color : '#555' }}>
                {state.currentAction === 'explore'
                  ? '🗺️ Exploring...'
                  : state.currentAction !== 'idle' && !activeProgress.breakthroughAvailable && xpPerSec > 0
                  ? `${xpPerSec.toFixed(2)} XP/s`
                  : activeProgress.breakthroughAvailable
                    ? '⚡ BREAKTHROUGH READY'
                    : state.currentAction !== 'idle'
                    ? '⚠️ Action doesn\'t match path'
                    : 'Idle'}
              </span>
            </div>

            {/* Animated XP Bar */}
            <XPBar
              progress={progressPercent}
              color={activePath.color}
              glow={activeProgress.breakthroughAvailable}
            />

            {/* ETA */}
            <div className="flex justify-between text-[10px] mt-1">
              <span className="text-gray-600">{progressPercent.toFixed(1)}%</span>
              <span className="text-gray-500">
                ETA:{' '}
                {state.currentAction === 'explore'
                  ? '🗺️ Exploring'
                  : xpPerSec > 0 && !activeProgress.breakthroughAvailable
                  ? formatTime(Math.ceil((activeProgress.xpRequired - activeProgress.currentXp) / xpPerSec))
                  : activeProgress.breakthroughAvailable
                    ? '⚡ READY'
                    : '∞'}
              </span>
            </div>
          </div>

          {/* ===== BREAKTHROUGH SECTION ===== */}
          {activeProgress.breakthroughAvailable && activeProgress.currentLevel < 12 && (
            <div
              className="mt-4 p-4 rounded-lg border relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #1a0a05, #150a0a)',
                borderColor: '#fbbf2444',
                boxShadow: '0 0 20px rgba(251, 191, 36, 0.1)',
              }}
            >
              <div className="absolute inset-0 animate-pulse" style={{ background: `linear-gradient(45deg, transparent, ${activePath.color}05, transparent)` }} />

              <div className="flex items-center justify-between mb-3 relative z-10">
                <div>
                  <div className="text-sm font-bold" style={{ fontFamily: 'Cinzel, serif', color: '#fbbf24' }}>
                    ⚡ Breakthrough Available!
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {activePath.levels[activeProgress.currentLevel]?.name || 'Next Level'} awaits
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Success Rate</div>
                  <div
                    className="text-lg font-bold"
                    style={{
                      color: (BREAKTHROUGH_RATES[activeProgress.currentLevel] || 0.1) >= 0.4
                        ? '#4ade80'
                        : (BREAKTHROUGH_RATES[activeProgress.currentLevel] || 0.1) >= 0.2
                          ? '#fbbf24'
                          : '#ef4444',
                    }}
                  >
                    {formatPercent(
                      Math.min(
                        0.95,
                        (BREAKTHROUGH_RATES[activeProgress.currentLevel] || 0.1) +
                          state.character.luck * 0.05 +
                          state.inventory
                            .filter(i => i.id === 'breakthrough_pill')
                            .reduce((s, i) => s + (i.effects.breakthroughBonus || 0) * i.quantity, 0)
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Breakthrough pills indicator */}
              {state.inventory.some(i => i.id === 'breakthrough_pill') && (
                <div className="text-xs mb-3 flex items-center gap-1" style={{ color: '#4ade80' }}>
                  💊 Breakthrough Pills: x{state.inventory.find(i => i.id === 'breakthrough_pill')?.quantity || 0}
                  <span className="text-gray-500">
                    (+{formatPercent(
                      (state.inventory.find(i => i.id === 'breakthrough_pill')?.effects.breakthroughBonus || 0) *
                        (state.inventory.find(i => i.id === 'breakthrough_pill')?.quantity || 0)
                    )})
                  </span>
                </div>
              )}

              {/* Tribulation warning */}
              {[4, 8].includes(activeProgress.currentLevel) && (
                <div
                  className="text-xs mb-3 p-2 rounded"
                  style={{ background: '#ef444415', color: '#ef4444', border: '1px solid #ef444425' }}
                >
                  ⛈️ WARNING: Tier transition requires surviving a Heavenly Tribulation!
                  {state.character.devilMark && (
                    <span className="block mt-1 font-bold">💀 Devil Mark: Double lightning strikes!</span>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  if (activeProgress && [4, 8].includes(activeProgress.currentLevel)) {
                    startTribulationHandler();
                  } else {
                    handleBreakthrough();
                  }
                }}
                className="w-full py-3.5 rounded-lg font-bold text-base transition-all hover:scale-[1.02] active:scale-95 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #92400e, #b8860b, #daa520, #b8860b)',
                  color: '#0a0a0f',
                  minHeight: '52px',
                  boxShadow: '0 4px 20px rgba(218, 165, 32, 0.3)',
                  fontFamily: 'Cinzel, serif',
                  letterSpacing: '0.05em',
                }}
              >
                ⚡ Attempt Breakthrough ⚡
              </button>
            </div>
          )}

          {/* Max Level */}
          {activeProgress.currentLevel >= 12 && (
            <div
              className="mt-4 p-4 rounded-lg text-center border"
              style={{ background: 'linear-gradient(135deg, #1a1a05, #15150a)', borderColor: '#fbbf2444' }}
            >
              <div className="text-2xl mb-1">🏆</div>
              <div className="font-bold text-lg" style={{ fontFamily: 'Cinzel, serif', color: '#fbbf24' }}>
                PINNACLE REACHED
              </div>
              <div className="text-xs text-gray-500 mt-1">
                You have transcended the limits of {activePath.name}
              </div>
            </div>
          )}

          {/* Breakthrough Result Toast */}
          {breakResult && (
            <div
              className="mt-3 p-3 rounded-lg text-center font-bold text-sm border transition-all duration-300"
              style={{
                background: breakResult.success ? '#0a2a0a' : '#2a0a0a',
                borderColor: breakResult.success ? '#4ade8044' : '#ef444444',
                color: breakResult.success ? '#4ade80' : '#ef4444',
                boxShadow: breakResult.success ? '0 0 15px rgba(74, 222, 128, 0.15)' : '0 0 15px rgba(239, 68, 68, 0.15)',
              }}
            >
              {breakResult.success ? '🌟 ' : '💥 '}
              {breakResult.message}
            </div>
          )}
        </div>
      )}

      {/* No path selected */}
      {!activePath && (
        <div className="rounded-xl p-8 border text-center" style={{ background: '#0d0d18', borderColor: '#1a1828' }}>
          <div className="text-3xl mb-3">🔮</div>
          <div className="text-gray-500 font-medium">No path selected</div>
          <div className="text-xs text-gray-600 mt-1">Choose a path below to begin cultivation</div>
        </div>
      )}

      {/* ===== EXPLORATION STATUS ===== */}
      {state.currentAction === 'explore' && (
        <div
          className="rounded-xl p-4 border relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0a1020, #0d0d18)',
            borderColor: '#60a5fa25',
            boxShadow: '0 0 15px #60a5fa08',
          }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-5" style={{ background: '#60a5fa' }} />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl animate-bounce" style={{ animationDuration: '2s' }}>🗺️</span>
            <div>
              <h3 className="text-sm font-bold" style={{ fontFamily: 'Cinzel, serif', color: '#60a5fa' }}>
                Exploring...
              </h3>
              <div className="text-[10px] text-gray-500">
                {(() => {
                  const region = REGIONS.find(r => r.id === state.currentLocationId);
                  return region ? region.name : 'Unknown';
                })()}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400 leading-relaxed">
            Searching for items, scriptures, spirit stones, and encounters.
            {state.character.background.bonusEffect.explorationBonus 
              ? <span style={{ color: '#4ade80' }}> (+{(state.character.background.bonusEffect.explorationBonus * 100).toFixed(0)}% find rate)</span>
              : null}
            {state.character.rogueStatus
              ? <span style={{ color: '#a78bfa' }}> (+15% rogue bonus)</span>
              : null}
          </div>
          <div className="text-[10px] text-gray-600 mt-2 italic">
            Discoveries appear in the event log below. Rare items are... rare.
          </div>
        </div>
      )}

      {/* ===== ACTION CONTROLS ===== */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d18', borderColor: '#1a1828' }}>
        <h3 className="text-xs font-bold mb-3 uppercase tracking-[0.15em]" style={{ color: '#c9a44a' }}>
          Primary Action <span className="font-normal text-gray-600">(one at a time)</span>
        </h3>

        {/* Action Toggle */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <ActionButton
            action="cultivate"
            icon="🔮"
            isActive={state.currentAction === 'cultivate'}
            onClick={() => handleAction('cultivate')}
          />
          <ActionButton
            action="train"
            icon="⚔️"
            isActive={state.currentAction === 'train'}
            onClick={() => handleAction('train')}
          />
          <ActionButton
            action="explore"
            icon="🗺️"
            isActive={state.currentAction === 'explore'}
            onClick={() => handleAction('explore')}
          />
        </div>

        {/* Action description */}
        <div className="text-[10px] mb-3 px-1" style={{ color: '#4a4a5a' }}>
          {state.currentAction === 'cultivate' && (
            <span><span style={{ color: '#4ade80' }}>Cultivate</span> — Gain Qi XP for your Spirit path ({state.pathProgress['spirit']?.unlocked ? 'Path of the Spirit' : '⚠️ Need Scripture'})</span>
          )}
          {state.currentAction === 'train' && (
            <span><span style={{ color: '#f97316' }}>Train</span> — Gain Body XP for your Carnal path (Path of the Carnal)</span>
          )}
          {state.currentAction === 'explore' && (
            <span><span style={{ color: '#60a5fa' }}>Explore</span> — Find items, scriptures, spirit stones, and encounters. No path XP.</span>
          )}
          {state.currentAction === 'idle' && (
            <span>Select an action to begin. <span style={{ color: '#4ade80' }}>Cultivate</span> for Spirit, <span style={{ color: '#f97316' }}>Train</span> for Body, <span style={{ color: '#60a5fa' }}>Explore</span> for items.</span>
          )}
        </div>

        {/* Click-to-Boost / Meditate */}
        {state.currentAction !== 'idle' && (
          <button
            onClick={handleClickBoost}
            className="w-full py-3.5 rounded-lg font-bold text-sm transition-all active:scale-[0.97] mb-2 relative overflow-hidden"
            style={{
              background: clickFlash ? '#1a3a2a' : '#0e0e18',
              border: `2px solid ${clickFlash ? '#4ade80' : '#4ade8040'}`,
              color: '#4ade80',
              minHeight: '52px',
              boxShadow: clickFlash ? '0 0 20px rgba(74, 222, 128, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            ⚡ Meditate — Click to Boost (2x this tick)
          </button>
        )}

        {/* Speed Boost */}
        <button
          onClick={handleSpeedBoost}
          disabled={state.spiritStones < boostCost}
          className="w-full py-3.5 rounded-lg font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: '#0e0e18',
            border: '2px solid #a78bfa30',
            color: '#a78bfa',
            minHeight: '52px',
          }}
        >
          💎 Buy 5x Speed Boost (10 min) — {boostCost} Spirit Stones
        </button>
      </div>

      {/* ===== STATUS EFFECTS ===== */}
      {(state.buffs.length > 0 || state.qiDeviation.active) && (
        <div className="rounded-xl p-3 border" style={{ background: '#0d0d18', borderColor: '#1a1828' }}>
          <h4 className="text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: '#c9a44a' }}>
            Status Effects
          </h4>

          {state.qiDeviation.active && (
            <div
              className="flex items-center justify-between p-2 rounded-lg mb-1.5"
              style={{ background: '#1a0505', border: '1px solid #ef444425' }}
            >
              <div className="flex items-center gap-2">
                <span className="animate-pulse">😵</span>
                <span className="text-sm font-bold" style={{ color: '#ef4444' }}>Qi Deviation</span>
                <span className="text-xs text-gray-500">(-50% Speed)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono" style={{ color: '#ef4444' }}>
                  {formatTime(state.qiDeviation.remainingSeconds)}
                </span>
                {state.inventory.some(i => i.id === 'deviation_cure') && (
                  <button
                    onClick={handleCureDeviation}
                    className="px-2 py-1 rounded text-[10px] font-bold"
                    style={{ background: '#4ade8015', color: '#4ade80', border: '1px solid #4ade8025', minHeight: '28px' }}
                  >
                    💊 Cure
                  </button>
                )}
              </div>
            </div>
          )}

          {state.buffs.map((b, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg mb-1" style={{ background: '#0a0a15', border: '1px solid #1a1828' }}>
              <span className="text-sm text-gray-300">
                {b.icon} {b.name} <span style={{ color: '#a78bfa' }}>({b.multiplier}x)</span>
              </span>
              <span className="text-xs font-mono" style={{ color: '#fbbf24' }}>
                {formatTime(b.remainingSeconds)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ===== DISCOVERED PATHS LIST ===== */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d18', borderColor: '#1a1828' }}>
        <h3 className="text-xs font-bold mb-3 uppercase tracking-[0.15em]" style={{ color: '#c9a44a' }}>
          Discovered Paths ({unlockedPaths.length}/15)
        </h3>

        <div className="space-y-2">
          {unlockedPaths.map(path => {
            const pp = state.pathProgress[path.id];
            if (!pp) return null;
            const levelData = path.levels[pp.currentLevel - 1];
            const isActive = state.activePathId === path.id;
            const pathPercent = (pp.currentXp / pp.xpRequired) * 100;

            return (
              <button
                key={path.id}
                onClick={() => {
                  const ns = JSON.parse(JSON.stringify(state)) as GameState;
                  ns.activePathId = path.id;
                  // Auto-set action to match path type
                  // cultivate paths → set action to cultivate
                  // train paths → set action to train
                  // explore paths (beast_tamer) → set action to explore  
                  // special paths → set matching action
                  const pathAction = getPathAction(path.id);
                  if (pathAction === 'cultivate') {
                    ns.currentAction = 'cultivate';
                  } else if (pathAction === 'train') {
                    ns.currentAction = 'train';
                  } else if (pathAction === 'explore') {
                    ns.currentAction = 'explore';
                  } else {
                    // Special actions (refine, inscribe, forge, study, sleep)
                    ns.currentAction = pathAction;
                  }
                  setState(ns);
                }}
                className="w-full text-left p-3 rounded-lg border transition-all duration-200 hover:brightness-110 relative overflow-hidden"
                style={{
                  background: isActive ? `linear-gradient(135deg, ${path.color}08, ${path.color}04)` : '#0a0a12',
                  borderColor: isActive ? `${path.color}44` : '#141420',
                  minHeight: '52px',
                  boxShadow: isActive ? `0 0 10px ${path.color}10` : 'none',
                }}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                    style={{ background: path.color, boxShadow: `0 0 6px ${path.color}66` }}
                  />
                )}

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{path.icon}</span>
                    <div>
                      <span className="font-bold text-sm" style={{ color: path.color }}>{path.name}</span>
                      <div className="text-[10px] text-gray-600">{levelData?.name}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-gray-400">Lv.{pp.currentLevel}</span>
                    {pp.breakthroughAvailable && (
                      <div className="text-[10px] font-bold animate-pulse" style={{ color: '#fbbf24' }}>⚡ READY</div>
                    )}
                  </div>
                </div>

                {!pp.breakthroughAvailable && pp.currentLevel < 12 && (
                  <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: '#12101a' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pathPercent}%`, background: path.color, boxShadow: `0 0 4px ${path.color}44` }}
                    />
                  </div>
                )}

                {pp.currentLevel >= 12 && (
                  <div className="text-[10px] mt-1 font-bold" style={{ color: '#fbbf24' }}>🏆 PINNACLE</div>
                )}
              </button>
            );
          })}

          {unlockedPaths.length === 0 && (
            <div className="text-sm text-gray-600 text-center py-4 italic">
              No paths discovered yet. Explore the world to find cultivation techniques!
            </div>
          )}
        </div>
      </div>

      {/* ===== TRIBULATION MODAL ===== */}
      {tribulation && tribulation.active && !tribulation.completed && (
        <TribulationModal
          tribulation={tribulation}
          onResist={handleTribulationResist}
          onFail={handleTribulationFail}
        />
      )}
    </div>
  );
}
