import { useState, useMemo } from 'react';
import type { GameState, ActionType, GameEvent } from '../data/types';
import { PATHS, REGIONS, ITEMS, RARITY_COLORS, GROUPS, SHOP_ITEMS_BY_REALM, SHOP_PRICE_MULTIPLIER, BREAKTHROUGH_RATES, getLuckDescriptor, getKarmaLabel } from '../data/constants';
import { formatNumber, formatTime, formatPercent, attemptBreakthrough, buySpiritStoneBoost, usePill, addLog, removeItemFromInventory, addItemToInventory, exportSave, importSave, deleteSave, calculatePower, checkPathUnlocks, startTribulation, triggerRebirth } from '../engine/gameState';
import type { TribulationState } from '../engine/gameState';

// ===== CULTIVATION TAB =====
export function CultivationTab({ state, setState, onClickBoost, onRebirth }: { state: GameState; setState: (s: GameState) => void; onClickBoost: () => void; onRebirth?: (state: GameState) => void }) {
  const [breakResult, setBreakResult] = useState<string | null>(null);
  const [tribulation, setTribulation] = useState<TribulationState | null>(null);

  const activePath = state.activePathId ? PATHS.find(p => p.id === state.activePathId) : null;
  const activeProgress = state.activePathId ? state.pathProgress[state.activePathId] : null;

  const unlockedPaths = PATHS.filter(p => state.pathProgress[p.id]?.unlocked);

  const xpPerSec = useMemo(() => {
    if (!activePath || !activeProgress || activeProgress.breakthroughAvailable) return 0;
    if (state.currentAction === 'explore' || state.currentAction === 'idle') return 0;
    // Only show XP/s if action matches the path
    if ((activePath.action as string) !== state.currentAction) return 0;
    const speed = activePath.speedModifier(state);
    const deviationMult = state.qiDeviation.active ? 0.5 : 1;
    const legacyMult = 1 + state.character.legacyBonus;
    const buffMult = state.buffs.reduce((m, b) => m * b.multiplier, 1);
    return speed * deviationMult * legacyMult * buffMult;
  }, [activePath, activeProgress, state]);

  const handleAction = (action: ActionType) => {
    const ns = { ...state };
    if (ns.currentAction === action) {
      ns.currentAction = 'idle';
    } else {
      ns.currentAction = action;
      if (action === 'cultivate') {
        const qiPath = ['spirit', 'rogue', 'devil_soul', 'oracle', 'harmonic', 'bloodline', 'dream', 'necromancy'].find(id => ns.pathProgress[id]?.unlocked);
        if (qiPath) ns.activePathId = qiPath;
      } else if (action === 'train') {
        const bodyPath = ['martial', 'devil_body'].find(id => ns.pathProgress[id]?.unlocked);
        if (bodyPath) ns.activePathId = bodyPath;
      }
      // Explore: don't change active path
    }
    setState(ns);
  };

  const handleBreakthrough = () => {
    const ns = { ...state };
    const pillBonus = ns.inventory
      .filter(i => i.id === 'breakthrough_pill')
      .reduce((s, i) => s + (i.effects.breakthroughBonus || 0) * i.quantity, 0);

    // Use breakthrough pills
    while (ns.inventory.some(i => i.id === 'breakthrough_pill')) {
      removeItemFromInventory(ns, 'breakthrough_pill');
    }

    const result = attemptBreakthrough(ns, pillBonus);
    setBreakResult(result.message);

    if (result.outcome === 'death') {
      setState(ns);
      setTimeout(() => {
        if (onRebirth) {
          onRebirth(ns);
        } else {
          const reborn = triggerRebirth(ns);
          setState(reborn);
        }
        setBreakResult(null);
      }, 3000);
    } else {
      setState(ns);
      setTimeout(() => setBreakResult(null), 3000);
    }
  };

  const handleTribulationStrike = () => {
    if (!tribulation || !tribulation.strikeActive) return;
    setTribulation(prev => {
      if (!prev) return null;
      const next = { ...prev, strikeActive: false, currentStrike: prev.currentStrike + 1 };
      if (next.currentStrike >= next.strikes) {
        next.completed = true;
        next.survived = true;
        addLog(state, '⚡ Heavenly Tribulation SURVIVED!', 'legendary');
        handleBreakthrough();
      }
      return next;
    });
  };

  const progressPercent = activeProgress ? (activeProgress.currentXp / activeProgress.xpRequired) * 100 : 0;
  const currentLevelData = activePath && activeProgress ? activePath.levels[activeProgress.currentLevel - 1] : null;

  return (
    <div className="space-y-4">
      {/* Current Status */}
      {activePath && activeProgress && (
        <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs uppercase tracking-wider opacity-60" style={{ color: activePath.color }}>{activePath.subtitle}</div>
              <h3 className="text-lg font-bold" style={{ fontFamily: 'Cinzel, serif', color: activePath.color }}>
                {activePath.icon} {activePath.name}
              </h3>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-60 text-gray-400">Level {activeProgress.currentLevel}/12</div>
              <div className="text-sm font-bold" style={{ color: activePath.color }}>
                {currentLevelData?.tierName} Tier {currentLevelData?.tier}
              </div>
            </div>
          </div>

          {/* Level Name */}
          <div className="mb-3">
            <div className="font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{currentLevelData?.name}</div>
            <div className="text-xs italic text-gray-500">{currentLevelData?.flavor}</div>
          </div>

          {/* XP Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">{formatNumber(activeProgress.currentXp)} / {formatNumber(activeProgress.xpRequired)} XP</span>
              <span style={{ color: '#4ade80' }}>{state.currentAction === 'explore' ? '🗺️ Exploring' : state.currentAction !== 'idle' ? `${xpPerSec.toFixed(2)}/s` : 'Idle'}</span>
            </div>
            <div className="h-4 rounded-full overflow-hidden" style={{ background: '#1a1025' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, ${activePath.color}88, ${activePath.color})`,
                  boxShadow: `0 0 10px ${activePath.color}66`,
                }}
              />
            </div>
            <div className="text-xs text-right mt-1 text-gray-500">
              ETA: {xpPerSec > 0 && !activeProgress.breakthroughAvailable ? formatTime(Math.ceil((activeProgress.xpRequired - activeProgress.currentXp) / xpPerSec)) : '—'}
            </div>
          </div>

          {/* Breakthrough */}
          {activeProgress.breakthroughAvailable && activeProgress.currentLevel < 12 && (
            <div className="mt-3 p-3 rounded-lg border" style={{ background: '#1a0a0a', borderColor: '#ff4444' }}>
              <div className="text-sm font-bold mb-2" style={{ color: '#fbbf24' }}>⚡ Breakthrough Available!</div>
              <div className="text-xs text-gray-400 mb-2">
                Base Success: {formatPercent(BREAKTHROUGH_RATES[activeProgress.currentLevel] || 0.1)}
                {state.inventory.some(i => i.id === 'breakthrough_pill') && (
                  <span style={{ color: '#4ade80' }}> + Pills</span>
                )}
              </div>
              <button
                onClick={() => {
                  const isTierTransition = [4, 8].includes(activeProgress.currentLevel);
                  if (isTierTransition) {
                    // Start tribulation
                    const ts = startTribulation(state);
                    setTribulation(ts);
                    addLog(state, '⛈️ HEAVENLY TRIBULATION BEGINS!', 'danger');
                    // Auto-progress tribulation strikes
                    let strikeNum = 0;
                    const doStrike = () => {
                      strikeNum++;
                      setTribulation(prev => {
                        if (!prev) return null;
                        return { ...prev, strikeActive: true, strikeTimer: prev.timeWindow, currentStrike: strikeNum - 1 };
                      });
                    };
                    doStrike();
                  } else {
                    handleBreakthrough();
                  }
                }}
                className="w-full py-3 rounded-lg font-bold transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: 'linear-gradient(135deg, #b8860b, #daa520)', color: '#0a0a0f', minHeight: '48px' }}
              >
                ⚡ Attempt Breakthrough
              </button>
            </div>
          )}

          {breakResult && (
            <div className="mt-2 p-3 rounded-lg text-center font-bold text-sm" style={{ background: breakResult.includes('SUCCESS') || breakResult.includes('Advanced') ? '#0a2a0a' : '#2a0a0a', color: breakResult.includes('SUCCESS') || breakResult.includes('Advanced') ? '#4ade80' : '#ef4444' }}>
              {breakResult}
            </div>
          )}
        </div>
      )}

      {/* Tribulation Modal */}
      {tribulation && tribulation.active && !tribulation.completed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div className="w-full max-w-md rounded-xl p-6 border" style={{ background: '#0d0d15', borderColor: '#ff4444' }}>
            <h3 className="text-xl font-bold text-center mb-4" style={{ fontFamily: 'Cinzel, serif', color: '#fbbf24' }}>
              ⛈️ HEAVENLY TRIBULATION ⛈️
            </h3>
            <div className="text-center text-gray-400 mb-4">
              Strike {tribulation.currentStrike + 1} of {tribulation.strikes}
            </div>
            <div className="h-4 rounded-full overflow-hidden mb-4" style={{ background: '#1a1025' }}>
              <div className="h-full rounded-full" style={{ width: `${(tribulation.hp / tribulation.maxHp) * 100}%`, background: 'linear-gradient(90deg, #ef4444, #fbbf24)' }} />
            </div>
            {tribulation.strikeActive && (
              <button
                onClick={() => {
                  handleTribulationStrike();
                  if (tribulation.currentStrike + 1 < tribulation.strikes) {
                    setTimeout(() => {
                      setTribulation(prev => prev ? { ...prev, strikeActive: true } : null);
                    }, 500);
                  }
                }}
                className="w-full py-4 rounded-lg font-bold text-xl animate-pulse"
                style={{ background: 'linear-gradient(135deg, #ef4444, #fbbf24)', color: '#0a0a0f', minHeight: '56px' }}
              >
                ⚡ RESIST! ⚡
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#c9a44a' }}>Actions</h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['cultivate', 'train', 'explore'] as ActionType[]).map(action => (
            <button
              key={action}
              onClick={() => handleAction(action)}
              className="py-3 rounded-lg font-bold text-sm transition-all capitalize"
              style={{
                background: state.currentAction === action ? (action === 'cultivate' ? '#0a2a1a' : action === 'train' ? '#2a1a0a' : '#0a1a2a') : '#1a1025',
                color: state.currentAction === action ? (action === 'cultivate' ? '#4ade80' : action === 'train' ? '#f97316' : '#60a5fa') : '#666',
                border: `1px solid ${state.currentAction === action ? (action === 'cultivate' ? '#4ade80' : action === 'train' ? '#f97316' : '#60a5fa') : '#2a2040'}`,
                minHeight: '48px',
              }}
            >
              {action === 'cultivate' ? '🔮' : action === 'train' ? '⚔️' : '🗺️'} {action}
            </button>
          ))}
        </div>

        {/* Click Boost */}
        {state.currentAction !== 'idle' && (
          <button
            onClick={onClickBoost}
            className="w-full py-3 rounded-lg font-bold text-sm transition-all active:scale-95 mb-2"
            style={{ background: '#1a1025', border: '1px solid #4ade80', color: '#4ade80', minHeight: '48px' }}
          >
            ⚡ Click to Boost (2x this tick)
          </button>
        )}

        {/* Speed Boost */}
        <button
          onClick={() => {
            const ns = { ...state };
            if (buySpiritStoneBoost(ns)) setState(ns);
          }}
          className="w-full py-3 rounded-lg font-bold text-sm transition-all active:scale-95"
          style={{ background: '#1a1025', border: '1px solid #a78bfa', color: '#a78bfa', minHeight: '48px' }}
        >
          💎 Buy 5x Speed (10min) — {10 + state.buffs.filter(b => b.id === 'ss_boost').length * 10} SS
        </button>
      </div>

      {/* Active Buffs */}
      {state.buffs.length > 0 && (
        <div className="rounded-xl p-3 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
          <h4 className="text-xs uppercase tracking-wider mb-2" style={{ color: '#c9a44a' }}>Active Buffs</h4>
          {state.buffs.map((b, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-300">{b.icon} {b.name} ({b.multiplier}x)</span>
              <span style={{ color: '#fbbf24' }}>{formatTime(b.remainingSeconds)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Qi Deviation */}
      {state.qiDeviation.active && (
        <div className="rounded-xl p-3 border" style={{ background: '#2a0a0a', borderColor: '#ef4444' }}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold" style={{ color: '#ef4444' }}>😵 Qi Deviation Active (-50% Speed)</span>
            <span className="text-sm" style={{ color: '#ef4444' }}>{formatTime(state.qiDeviation.remainingSeconds)}</span>
          </div>
          {state.inventory.some(i => i.id === 'deviation_cure') && (
            <button
              onClick={() => {
                const ns = { ...state };
                usePill(ns, 'deviation_cure');
                setState(ns);
              }}
              className="mt-2 w-full py-2 rounded text-sm font-bold"
              style={{ background: '#4ade80', color: '#0a0a0f', minHeight: '44px' }}
            >
              💊 Use Mind-Clearing Pill
            </button>
          )}
        </div>
      )}

      {/* Path List */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#c9a44a' }}>Discovered Paths</h3>
        <div className="space-y-2">
          {unlockedPaths.map(path => {
            const pp = state.pathProgress[path.id];
            if (!pp) return null;
            const levelData = path.levels[pp.currentLevel - 1];
            const isActive = state.activePathId === path.id;
            return (
              <button
                key={path.id}
                onClick={() => {
                  const ns = { ...state, activePathId: path.id };
                  setState(ns);
                }}
                className="w-full text-left p-3 rounded-lg border transition-all"
                style={{
                  background: isActive ? `${path.color}11` : '#0a0a0f',
                  borderColor: isActive ? path.color : '#1a1025',
                  minHeight: '48px',
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm" style={{ color: path.color }}>
                    {path.icon} {path.name}
                  </span>
                  <span className="text-xs text-gray-400">Lv.{pp.currentLevel}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{levelData?.name}</div>
                {!pp.breakthroughAvailable && (
                  <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: '#1a1025' }}>
                    <div className="h-full rounded-full" style={{ width: `${(pp.currentXp / pp.xpRequired) * 100}%`, background: path.color }} />
                  </div>
                )}
                {pp.breakthroughAvailable && (
                  <div className="text-xs mt-1 font-bold" style={{ color: '#fbbf24' }}>⚡ BREAKTHROUGH READY</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== MAP TAB =====
export function MapTab({ state, setState }: { state: GameState; setState: (s: GameState) => void }) {
  const currentRegion = REGIONS.find(r => r.id === state.currentLocationId);
  const discoveredRegions = REGIONS.filter(r => state.discoveredRegions.includes(r.id));

  const travelTo = (regionId: string) => {
    const target = REGIONS.find(r => r.id === regionId);
    if (!target || state.travelState.traveling) return;
    const distance = target.dangerLevel;
    const travelTime = 30 + distance * 30;
    const ns = { ...state };
    ns.travelState = { traveling: true, destinationId: regionId, remainingSeconds: travelTime };
    addLog(ns, `🗺️ Traveling to ${target.name}... (${formatTime(travelTime)})`, 'info');
    setState(ns);
  };

  const realmColors: Record<string, string> = { mortal: '#4ade80', heaven: '#a78bfa', underworld: '#ef4444' };

  return (
    <div className="space-y-4">
      {/* Current Location */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <div className="text-xs uppercase tracking-wider opacity-60 mb-1" style={{ color: '#c9a44a' }}>Current Location</div>
        {state.travelState.traveling ? (
          <div>
            <div className="text-lg font-bold" style={{ fontFamily: 'Cinzel, serif', color: '#fbbf24' }}>
              🚶 Traveling...
            </div>
            <div className="text-sm text-gray-400 mt-1">
              To: {REGIONS.find(r => r.id === state.travelState.destinationId)?.name}
            </div>
            <div className="h-3 rounded-full mt-2 overflow-hidden" style={{ background: '#1a1025' }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.max(5, 100 - (state.travelState.remainingSeconds / (30 + (REGIONS.find(r => r.id === state.travelState.destinationId)?.dangerLevel || 1) * 30)) * 100)}%`,
                background: 'linear-gradient(90deg, #60a5fa, #a78bfa)'
              }} />
            </div>
            <div className="text-xs text-gray-500 mt-1">ETA: {formatTime(state.travelState.remainingSeconds)}</div>
          </div>
        ) : currentRegion ? (
          <div>
            <div className="text-lg font-bold" style={{ fontFamily: 'Cinzel, serif', color: realmColors[currentRegion.realm] }}>
              {currentRegion.name}
            </div>
            <div className="text-sm text-gray-400 mt-1">{currentRegion.description}</div>
            <div className="flex gap-4 mt-2 text-xs">
              <span style={{ color: realmColors[currentRegion.realm] }}>
                {currentRegion.realm.charAt(0).toUpperCase() + currentRegion.realm.slice(1)} Realm
              </span>
              <span className="text-gray-400">Danger: {'⚠️'.repeat(Math.min(5, Math.ceil(currentRegion.dangerLevel / 2.5)))}</span>
              {currentRegion.hasShop && <span style={{ color: '#fbbf24' }}>🏪 Shop</span>}
              {currentRegion.isCity && <span style={{ color: '#60a5fa' }}>🏙️ City</span>}
            </div>
          </div>
        ) : null}
      </div>

      {/* Connected Regions */}
      {!state.travelState.traveling && currentRegion && (
        <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
          <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#c9a44a' }}>Travel To</h3>
          <div className="space-y-2">
            {currentRegion.connections.map(connId => {
              const region = REGIONS.find(r => r.id === connId);
              if (!region) return null;
              const isDiscovered = state.discoveredRegions.includes(connId);
              const travelTime = 30 + region.dangerLevel * 30;
              return (
                <button
                  key={connId}
                  onClick={() => travelTo(connId)}
                  className="w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.01] active:scale-95"
                  style={{ background: '#0a0a0f', borderColor: '#1a1025', minHeight: '48px' }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm" style={{ color: isDiscovered ? realmColors[region.realm] : '#666' }}>
                      {isDiscovered ? region.name : '??? Unknown Region'}
                    </span>
                    <span className="text-xs text-gray-500">{formatTime(travelTime)}</span>
                  </div>
                  {isDiscovered && (
                    <div className="text-xs text-gray-500 mt-1">
                      Danger: Lv.{region.dangerLevel} | {region.terrain}
                      {region.hasShop && ' | 🏪'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* All Discovered */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#c9a44a' }}>
          Discovered Regions ({discoveredRegions.length}/{REGIONS.length})
        </h3>
        <div className="grid grid-cols-2 gap-1">
          {discoveredRegions.map(r => (
            <div key={r.id} className="text-xs p-1.5 rounded" style={{ color: realmColors[r.realm] }}>
              {r.id === state.currentLocationId ? '📍 ' : ''}{r.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== GROUP TAB =====
export function GroupTab({ state, setState }: { state: GameState; setState: (s: GameState) => void }) {
  const currentGroup = state.groupMembership ? GROUPS.find(g => g.id === state.groupMembership) : null;
  const availableGroups = GROUPS.filter(g =>
    state.character.karma >= g.karmaRequirement.min &&
    state.character.karma <= g.karmaRequirement.max &&
    (state.discoveredRegions.includes(g.location) || state.character.background.bonusEffect.sectAccess)
  );

  const joinGroup = (groupId: string) => {
    const ns = { ...state, groupMembership: groupId, groupContribution: 0 };
    addLog(ns, `🏛️ Joined ${GROUPS.find(g => g.id === groupId)?.name}!`, 'success');
    setState(ns);
  };

  const completeMission = (missionId: string, isHelp: boolean) => {
    const ns = { ...state };
    if (!currentGroup) return;
    const mission = currentGroup.missions.find(m => m.id === missionId);
    if (!mission || mission.completed) return;

    const option = isHelp ? mission.helpOption : mission.exploitOption;
    ns.spiritStones += option.reward;
    ns.character = { ...ns.character, karma: Math.max(-1000, Math.min(1000, ns.character.karma + option.karmaChange)) };
    ns.groupContribution += option.reward;
    mission.completed = true;

    addLog(ns, `📋 Mission complete: ${mission.name} — +${option.reward} 💎, ${option.karmaChange > 0 ? '+' : ''}${option.karmaChange} Karma`, option.karmaChange >= 0 ? 'success' : 'warning');
    checkPathUnlocks(ns);
    setState(ns);
  };

  return (
    <div className="space-y-4">
      {currentGroup ? (
        <>
          <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
            <div className="text-xs uppercase tracking-wider opacity-60 mb-1" style={{ color: '#c9a44a' }}>Your {currentGroup.type}</div>
            <h3 className="text-lg font-bold" style={{ fontFamily: 'Cinzel, serif', color: '#e2c97e' }}>🏛️ {currentGroup.name}</h3>
            <div className="text-sm text-gray-400 mt-1">{currentGroup.description}</div>
            <div className="text-sm mt-2" style={{ color: '#fbbf24' }}>Contribution: {state.groupContribution} pts</div>
          </div>

          <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#c9a44a' }}>Missions</h3>
            {currentGroup.missions.map(m => (
              <div key={m.id} className="p-3 rounded-lg border mb-2" style={{ background: '#0a0a0f', borderColor: '#1a1025' }}>
                <div className="font-bold text-sm text-white">{m.name}</div>
                <div className="text-xs text-gray-400 mb-2">{m.description}</div>
                {m.completed ? (
                  <div className="text-xs" style={{ color: '#4ade80' }}>✅ Completed</div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => completeMission(m.id, true)}
                      className="flex-1 py-2 rounded text-xs font-bold transition-all active:scale-95"
                      style={{ background: '#0a2a0a', border: '1px solid #4ade80', color: '#4ade80', minHeight: '44px' }}
                    >
                      {m.helpOption.description}
                    </button>
                    <button
                      onClick={() => completeMission(m.id, false)}
                      className="flex-1 py-2 rounded text-xs font-bold transition-all active:scale-95"
                      style={{ background: '#2a0a0a', border: '1px solid #ef4444', color: '#ef4444', minHeight: '44px' }}
                    >
                      {m.exploitOption.description}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              const ns = { ...state, groupMembership: null, groupContribution: 0 };
              addLog(ns, `Left ${currentGroup.name}`, 'warning');
              setState(ns);
            }}
            className="w-full py-3 rounded-lg text-sm font-bold"
            style={{ background: '#1a1025', border: '1px solid #ef4444', color: '#ef4444', minHeight: '48px' }}
          >
            Leave {currentGroup.name}
          </button>
        </>
      ) : (
        <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
          <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#c9a44a' }}>Available Groups</h3>
          {availableGroups.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">No groups available. Explore more regions and adjust your Karma.</div>
          ) : (
            availableGroups.map(g => (
              <div key={g.id} className="p-3 rounded-lg border mb-2" style={{ background: '#0a0a0f', borderColor: '#1a1025' }}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-white">🏛️ {g.name}</span>
                  <span className="text-xs uppercase px-2 py-0.5 rounded" style={{ background: '#2a2040', color: '#c9a44a' }}>{g.type}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">{g.description}</div>
                <button
                  onClick={() => joinGroup(g.id)}
                  className="mt-2 w-full py-2 rounded text-sm font-bold transition-all active:scale-95"
                  style={{ background: '#0a2a1a', border: '1px solid #4ade80', color: '#4ade80', minHeight: '44px' }}
                >
                  Join
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ===== SKILLS TAB =====
export function SkillsTab({ state, setState }: { state: GameState; setState: (s: GameState) => void }) {
  const scriptures = state.inventory.filter(i => i.category === 'scripture');
  const pills = state.inventory.filter(i => i.category === 'pill');
  const treasures = state.inventory.filter(i => i.category === 'treasure');

  const equipScripture = (id: string) => {
    const ns = { ...state, equippedScripture: id };
    addLog(ns, `📖 Equipped: ${ITEMS[id]?.name || id}`, 'success');
    checkPathUnlocks(ns);
    setState(ns);
  };

  return (
    <div className="space-y-4">
      {/* Equipped */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#c9a44a' }}>Equipped</h3>
        <div className="space-y-2">
          <div className="p-2 rounded" style={{ background: '#0a0a0f' }}>
            <span className="text-xs text-gray-500">Cultivation Method: </span>
            <span className="text-sm" style={{ color: state.equippedScripture ? RARITY_COLORS[ITEMS[state.equippedScripture]?.rarity || 'common'] : '#666' }}>
              {state.equippedScripture ? ITEMS[state.equippedScripture]?.name : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Scriptures */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#c9a44a' }}>📜 Scriptures ({scriptures.length})</h3>
        {scriptures.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">No scriptures found. Explore to discover techniques!</div>
        ) : (
          scriptures.map((item, i) => (
            <div key={i} className="p-3 rounded-lg border mb-2 flex justify-between items-center" style={{ background: '#0a0a0f', borderColor: '#1a1025' }}>
              <div>
                <div className="font-bold text-sm" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
              <button
                onClick={() => equipScripture(item.id)}
                className="px-3 py-1.5 rounded text-xs font-bold"
                style={{
                  background: state.equippedScripture === item.id ? '#0a2a0a' : '#1a1025',
                  border: `1px solid ${state.equippedScripture === item.id ? '#4ade80' : '#2a2040'}`,
                  color: state.equippedScripture === item.id ? '#4ade80' : '#999',
                  minHeight: '36px',
                }}
              >
                {state.equippedScripture === item.id ? '✓' : 'Equip'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Pills */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#c9a44a' }}>💊 Pills ({pills.length})</h3>
        {pills.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-2">No pills available.</div>
        ) : (
          pills.map((item, i) => (
            <div key={i} className="p-3 rounded-lg border mb-2 flex justify-between items-center" style={{ background: '#0a0a0f', borderColor: '#1a1025' }}>
              <div>
                <div className="font-bold text-sm" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name} x{item.quantity}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
              <button
                onClick={() => {
                  const ns = { ...state };
                  usePill(ns, item.id);
                  setState(ns);
                }}
                className="px-3 py-1.5 rounded text-xs font-bold"
                style={{ background: '#1a1025', border: '1px solid #4ade80', color: '#4ade80', minHeight: '36px' }}
              >
                Use
              </button>
            </div>
          ))
        )}
      </div>

      {/* Treasures */}
      {treasures.length > 0 && (
        <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
          <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#c9a44a' }}>⚔️ Treasures ({treasures.length})</h3>
          {treasures.map((item, i) => (
            <div key={i} className="p-3 rounded-lg border mb-2" style={{ background: '#0a0a0f', borderColor: '#1a1025' }}>
              <div className="font-bold text-sm" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== SHOP TAB =====
export function ShopTab({ state, setState }: { state: GameState; setState: (s: GameState) => void }) {
  const currentRegion = REGIONS.find(r => r.id === state.currentLocationId);
  const hasShopAccess = currentRegion?.hasShop || currentRegion?.isCity;

  if (!hasShopAccess || state.travelState.traveling) {
    return (
      <div className="rounded-xl p-8 border text-center" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <div className="text-4xl mb-3">🏪</div>
        <h3 className="text-lg font-bold text-gray-400" style={{ fontFamily: 'Cinzel, serif' }}>No Shop Available</h3>
        <p className="text-sm text-gray-600 mt-2">Travel to a city or town to access shops.</p>
      </div>
    );
  }

  const realm = currentRegion?.realm || 'mortal';
  const shopItems = (SHOP_ITEMS_BY_REALM[realm] || []).map(id => ITEMS[id]).filter(Boolean);
  const priceMultiplier = SHOP_PRICE_MULTIPLIER[realm] || 1;
  const discount = state.character.background.bonusEffect.shopDiscount || 0;

  const buyItem = (item: typeof ITEMS[string]) => {
    const price = Math.floor(item.sellValue * 3 * priceMultiplier * (1 - discount));
    if (state.spiritStones < price) return;
    const ns = { ...state, spiritStones: state.spiritStones - price };
    addItemToInventory(ns, item);
    addLog(ns, `🏪 Bought ${item.name} for ${price} 💎`, 'info');
    setState(ns);
  };

  const sellItem = (itemId: string) => {
    const item = state.inventory.find(i => i.id === itemId);
    if (!item || item.sellValue === 0) return;
    const ns = { ...state, spiritStones: state.spiritStones + item.sellValue };
    removeItemFromInventory(ns, itemId);
    addLog(ns, `🏪 Sold ${item.name} for ${item.sellValue} 💎`, 'info');
    setState(ns);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <h3 className="text-sm font-bold mb-1 uppercase tracking-wider" style={{ color: '#c9a44a' }}>
          🏪 {currentRegion?.name} Shop
        </h3>
        <div className="text-xs text-gray-500 mb-3">💎 Spirit Stones: {state.spiritStones}</div>

        {shopItems.map((item, i) => {
          const price = Math.floor(item.sellValue * 3 * priceMultiplier * (1 - discount));
          const canAfford = state.spiritStones >= price;
          return (
            <div key={i} className="p-3 rounded-lg border mb-2 flex justify-between items-center" style={{ background: '#0a0a0f', borderColor: '#1a1025' }}>
              <div>
                <div className="font-bold text-sm" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
              <button
                onClick={() => buyItem(item)}
                disabled={!canAfford}
                className="px-3 py-1.5 rounded text-xs font-bold transition-all"
                style={{
                  background: canAfford ? '#0a2a1a' : '#111',
                  border: `1px solid ${canAfford ? '#4ade80' : '#333'}`,
                  color: canAfford ? '#4ade80' : '#555',
                  minHeight: '36px',
                }}
              >
                {price} 💎
              </button>
            </div>
          );
        })}
      </div>

      {/* Sell Items */}
      {state.inventory.filter(i => i.sellValue > 0).length > 0 && (
        <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
          <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#c9a44a' }}>Sell Items</h3>
          {state.inventory.filter(i => i.sellValue > 0).map((item, i) => (
            <div key={i} className="p-3 rounded-lg border mb-2 flex justify-between items-center" style={{ background: '#0a0a0f', borderColor: '#1a1025' }}>
              <div>
                <div className="font-bold text-sm" style={{ color: RARITY_COLORS[item.rarity] }}>
                  {item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}
                </div>
              </div>
              <button
                onClick={() => sellItem(item.id)}
                className="px-3 py-1.5 rounded text-xs font-bold"
                style={{ background: '#2a1a0a', border: '1px solid #f97316', color: '#f97316', minHeight: '36px' }}
              >
                Sell {item.sellValue} 💎
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== CHARACTER TAB =====
export function CharacterTab({ state, setState }: { state: GameState; setState: (s: GameState) => void }) {
  const [showExport, setShowExport] = useState(false);
  const [importStr, setImportStr] = useState('');
  const [showImport, setShowImport] = useState(false);

  const handleExport = () => {
    const encoded = exportSave(state);
    navigator.clipboard.writeText(encoded).then(() => {
      addLog(state, '📋 Save exported to clipboard!', 'system');
      setState({ ...state });
    });
    setShowExport(true);
    setTimeout(() => setShowExport(false), 3000);
  };

  const handleImport = () => {
    const imported = importSave(importStr);
    if (imported) {
      setState(imported);
      setShowImport(false);
      setImportStr('');
    }
  };

  const handleDeleteSave = () => {
    if (confirm('Are you sure? This will delete ALL save data!')) {
      deleteSave();
      window.location.reload();
    }
  };

  const karmaInfo = getKarmaLabel(state.character.karma);
  const power = calculatePower(state);

  return (
    <div className="space-y-4">
      {/* Character Info */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Cinzel, serif', color: '#fbbf24' }}>
          {state.character.name}
        </h3>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Spirit Root:</span>
            <div className="font-bold" style={{ color: '#4ade80' }}>{state.character.spiritRoot.name} ({state.character.spiritRoot.qiMultiplier}x)</div>
          </div>
          <div>
            <span className="text-gray-500">Body Type:</span>
            <div className="font-bold" style={{ color: '#f97316' }}>{state.character.bodyType.name} ({state.character.bodyType.bodyMultiplier}x)</div>
          </div>
          <div>
            <span className="text-gray-500">Background:</span>
            <div className="font-bold" style={{ color: '#60a5fa' }}>{state.character.background.name}</div>
          </div>
          <div>
            <span className="text-gray-500">Fortune:</span>
            <div className="font-bold" style={{ color: '#c084fc' }}>{getLuckDescriptor(state.character.luck)}</div>
          </div>
          <div>
            <span className="text-gray-500">Power:</span>
            <div className="font-bold" style={{ color: '#fbbf24' }}>⚡ {power}</div>
          </div>
          <div>
            <span className="text-gray-500">Play Time:</span>
            <div className="font-bold text-gray-300">{formatTime(state.totalPlayTime)}</div>
          </div>
        </div>
      </div>

      {/* Karma */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <h3 className="text-sm font-bold mb-2 uppercase tracking-wider" style={{ color: '#c9a44a' }}>Karma</h3>
        {state.karmaVisible ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold" style={{ color: karmaInfo.color }}>{karmaInfo.label}</span>
              <span className="text-sm" style={{ color: karmaInfo.color }}>{state.character.karma}</span>
            </div>
            <div className="h-3 rounded-full mt-2 overflow-hidden" style={{ background: '#1a1025' }}>
              <div className="h-full rounded-full" style={{
                width: `${((state.character.karma + 1000) / 2000) * 100}%`,
                background: `linear-gradient(90deg, #ef4444, #fbbf24, #4ade80)`,
              }} />
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-600 italic">??? (Reach Tier II to reveal)</div>
        )}
      </div>

      {/* Rebirth Info */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <h3 className="text-sm font-bold mb-2 uppercase tracking-wider" style={{ color: '#c9a44a' }}>Rebirth</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-gray-500">Deaths:</span> <span className="text-gray-300">{state.totalDeaths}</span></div>
          <div><span className="text-gray-500">Rebirths:</span> <span className="text-gray-300">{state.character.rebirthCount}</span></div>
          <div><span className="text-gray-500">Legacy Bonus:</span> <span style={{ color: '#fbbf24' }}>+{(state.character.legacyBonus * 100).toFixed(1)}%</span></div>
          <div><span className="text-gray-500">Highest Level:</span> <span className="text-gray-300">{state.highestPathLevel}</span></div>
        </div>
        {state.character.devilMark && (
          <div className="mt-2 text-sm" style={{ color: '#ef4444' }}>💀 Devil Cultivator (Permanent)</div>
        )}
        {state.character.redeemedDevil && (
          <div className="text-sm" style={{ color: '#fbbf24' }}>✨ Redeemed Devil</div>
        )}
      </div>

      {/* Rogue Toggle */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#c9a44a' }}>Rogue Status</h3>
            <div className="text-xs text-gray-500 mt-1">
              {state.character.rogueStatus ? 'No groups, +15% exploration find rate' : 'Normal — can join groups'}
            </div>
          </div>
          <button
            onClick={() => {
              const ns = { ...state, character: { ...state.character, rogueStatus: !state.character.rogueStatus } };
              if (ns.character.rogueStatus) ns.groupMembership = null;
              addLog(ns, ns.character.rogueStatus ? '🌪️ You walk the path alone...' : '🤝 You rejoin society.', 'info');
              checkPathUnlocks(ns);
              setState(ns);
            }}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background: state.character.rogueStatus ? '#2a1a0a' : '#1a1025',
              border: `1px solid ${state.character.rogueStatus ? '#f97316' : '#2a2040'}`,
              color: state.character.rogueStatus ? '#f97316' : '#666',
              minHeight: '44px',
            }}
          >
            {state.character.rogueStatus ? '🌪️ Rogue' : 'Go Rogue'}
          </button>
        </div>
      </div>

      {/* Inventory */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#c9a44a' }}>
          Inventory ({state.inventory.length} items)
        </h3>
        {state.inventory.length === 0 ? (
          <div className="text-sm text-gray-600 text-center py-2">Empty</div>
        ) : (
          <div className="space-y-1">
            {state.inventory.map((item, i) => (
              <div key={i} className="flex justify-between text-sm p-1.5 rounded" style={{ background: '#0a0a0f' }}>
                <span style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</span>
                <span className="text-gray-500">x{item.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save/Load */}
      <div className="rounded-xl p-4 border" style={{ background: '#0d0d15', borderColor: '#2a2040' }}>
        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#c9a44a' }}>Save & Settings</h3>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleExport} className="py-3 rounded-lg text-sm font-bold" style={{ background: '#1a1025', border: '1px solid #4ade80', color: '#4ade80', minHeight: '48px' }}>
            📋 Export Save
          </button>
          <button onClick={() => setShowImport(!showImport)} className="py-3 rounded-lg text-sm font-bold" style={{ background: '#1a1025', border: '1px solid #60a5fa', color: '#60a5fa', minHeight: '48px' }}>
            📥 Import Save
          </button>
        </div>
        {showExport && <div className="mt-2 text-xs text-center" style={{ color: '#4ade80' }}>✅ Copied to clipboard!</div>}
        {showImport && (
          <div className="mt-2">
            <textarea
              value={importStr}
              onChange={e => setImportStr(e.target.value)}
              placeholder="Paste save string here..."
              className="w-full h-20 px-3 py-2 rounded-lg text-xs text-white"
              style={{ background: '#0a0a0f', border: '1px solid #2a2040' }}
            />
            <button onClick={handleImport} className="w-full mt-1 py-2 rounded text-sm font-bold" style={{ background: '#0a2a1a', border: '1px solid #4ade80', color: '#4ade80', minHeight: '44px' }}>
              Import
            </button>
          </div>
        )}
        <button onClick={handleDeleteSave} className="w-full mt-2 py-3 rounded-lg text-sm font-bold" style={{ background: '#2a0a0a', border: '1px solid #ef4444', color: '#ef4444', minHeight: '48px' }}>
          🗑️ Delete Save (New Game)
        </button>
      </div>
    </div>
  );
}

// ===== EVENT MODAL =====
export function EventModal({ event, onChoice }: { event: GameEvent; onChoice: (choiceIdx: number) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-md rounded-xl p-6 border" style={{
        background: '#0d0d15',
        borderColor: event.isFated ? '#fbbf24' : '#2a2040',
        boxShadow: event.isFated ? '0 0 30px rgba(251, 191, 36, 0.3)' : undefined,
      }}>
        <h3 className="text-lg font-bold mb-2" style={{
          fontFamily: 'Cinzel, serif',
          color: event.isFated ? '#fbbf24' : '#e2c97e'
        }}>
          {event.title}
        </h3>
        <p className="text-sm text-gray-400 mb-4">{event.description}</p>
        <div className="space-y-2">
          {event.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => onChoice(i)}
              className="w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.01] active:scale-95"
              style={{
                background: choice.karmaChange > 0 ? '#0a2a0a' : choice.karmaChange < 0 ? '#2a0a0a' : '#1a1025',
                borderColor: choice.karmaChange > 0 ? '#4ade80' : choice.karmaChange < 0 ? '#ef4444' : '#2a2040',
                color: '#ddd',
                minHeight: '48px',
              }}
            >
              <div className="text-sm font-bold">{choice.text}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
