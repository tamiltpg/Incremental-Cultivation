import { useState, type ReactNode } from 'react';
import type { GameState } from '../data/types';
import { PATHS } from '../data/constants';
import { formatNumber, formatTime, addLog } from '../engine/gameState';
import { SaveManager } from '../engine/SaveManager';

type TabId = 'map' | 'cultivation' | 'group' | 'skills' | 'shop' | 'character';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'cultivation', label: 'Cultivate', icon: '🔮' },
  { id: 'group', label: 'Group', icon: '🏛️' },
  { id: 'skills', label: 'Skills', icon: '📜' },
  { id: 'shop', label: 'Shop', icon: '🏪' },
  { id: 'character', label: 'Char', icon: '👤' },
];

interface GameLayoutProps {
  state: GameState;
  setState: (s: GameState) => void;
  clickBoost: boolean;
  renderTab: (tabId: TabId) => ReactNode;
}

export type { TabId };

export function GameLayout({ state, setState, clickBoost, renderTab }: GameLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>('cultivation');

  // Derive current path info
  const activePath = state.activePathId ? PATHS.find(p => p.id === state.activePathId) : null;
  const activeProgress = state.activePathId ? state.pathProgress[state.activePathId] : null;
  const currentLevelData = activePath && activeProgress ? activePath.levels[activeProgress.currentLevel - 1] : null;

  const handleManualSave = () => {
    const ns = { ...state };
    SaveManager.saveToLocalStorage(ns);
    addLog(ns, '💾 Game saved!', 'system');
    setState(ns);
  };

  // Action color mapping
  const actionColors: Record<string, string> = {
    idle: '#555',
    cultivate: '#4ade80',
    train: '#f97316',
    explore: '#60a5fa',
    refine: '#22d3ee',
    inscribe: '#818cf8',
    forge: '#94a3b8',
    study: '#fbbf24',
    sleep: '#7c3aed',
  };

  const actionIcons: Record<string, string> = {
    idle: '💤',
    cultivate: '🔮',
    train: '⚔️',
    explore: '🗺️',
    refine: '⚗️',
    inscribe: '📐',
    forge: '⚙️',
    study: '📜',
    sleep: '🌙',
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f', fontFamily: 'Inter, sans-serif' }}>
      {/* ===== HEADER ===== */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: 'linear-gradient(180deg, #0d0d18, #0a0a12)', borderColor: '#1a1025' }}
      >
        <div className="flex items-center justify-between max-w-5xl mx-auto px-3 py-2">
          {/* Left: Name + Realm */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="text-sm font-bold truncate"
              style={{ fontFamily: 'Cinzel, serif', color: '#fbbf24' }}
            >
              {state.character.name}
            </span>
            {currentLevelData && activePath && (
              <span
                className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap hidden sm:inline-flex items-center gap-1"
                style={{
                  background: `${activePath.color}15`,
                  color: activePath.color,
                  border: `1px solid ${activePath.color}30`,
                }}
              >
                {activePath.icon} {currentLevelData.name}
              </span>
            )}
          </div>

          {/* Center: Active Action Indicator */}
          <div className="flex items-center gap-2 mx-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300"
              style={{
                background: `${actionColors[state.currentAction]}12`,
                color: actionColors[state.currentAction],
                border: `1px solid ${actionColors[state.currentAction]}30`,
                boxShadow: state.currentAction !== 'idle'
                  ? `0 0 10px ${actionColors[state.currentAction]}15`
                  : 'none',
              }}
            >
              <span className="text-base">{actionIcons[state.currentAction]}</span>
              <span className="capitalize hidden sm:inline">{state.currentAction}</span>
              {clickBoost && state.currentAction !== 'idle' && (
                <span className="animate-pulse text-yellow-400">⚡</span>
              )}
            </div>
          </div>

          {/* Right: Spirit Stones + Save */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
              style={{
                background: '#fbbf2412',
                color: '#fbbf24',
                border: '1px solid #fbbf2425',
              }}
            >
              💎 {formatNumber(state.spiritStones)}
            </div>
            <button
              onClick={handleManualSave}
              className="text-xs px-2.5 py-1.5 rounded-lg transition-all active:scale-90 hover:brightness-125"
              style={{
                background: '#4ade8015',
                color: '#4ade80',
                border: '1px solid #4ade8025',
                minWidth: '36px',
                minHeight: '36px',
              }}
              title="Save Game"
            >
              💾
            </button>
          </div>
        </div>

        {/* Sub-header: Travel / Qi Deviation / Buff indicators */}
        {(state.travelState.traveling || state.qiDeviation.active || state.buffs.length > 0) && (
          <div className="px-3 pb-1.5 max-w-5xl mx-auto">
            <div className="flex items-center gap-2 flex-wrap">
              {state.travelState.traveling && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#60a5fa15', color: '#60a5fa', border: '1px solid #60a5fa25' }}>
                  🚶 Traveling... {formatTime(state.travelState.remainingSeconds)}
                </span>
              )}
              {state.qiDeviation.active && (
                <span className="text-[10px] px-2 py-0.5 rounded-full animate-pulse" style={{ background: '#ef444415', color: '#ef4444', border: '1px solid #ef444425' }}>
                  😵 Qi Deviation {formatTime(state.qiDeviation.remainingSeconds)}
                </span>
              )}
              {state.buffs.map((b, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#a78bfa15', color: '#a78bfa', border: '1px solid #a78bfa25' }}>
                  {b.icon} {b.multiplier}x {formatTime(b.remainingSeconds)}
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="flex-1 flex flex-col md:flex-row max-w-5xl mx-auto w-full">
        {/* Desktop Sidebar */}
        <nav
          className="hidden md:flex flex-col w-[72px] border-r py-1 flex-shrink-0"
          style={{ borderColor: '#1a1025', background: '#08080e' }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center py-3 transition-all duration-200 relative group"
                style={{
                  color: isActive ? '#fbbf24' : '#4a4a5a',
                  background: isActive ? '#1a152208' : 'transparent',
                }}
              >
                {/* Active indicator */}
                {isActive && (
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-l-full"
                    style={{ background: '#fbbf24', boxShadow: '0 0 8px #fbbf2466' }}
                  />
                )}
                <span className="text-xl transition-transform duration-200 group-hover:scale-110">
                  {tab.icon}
                </span>
                <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <main
          className="flex-1 p-3 pb-36 md:pb-6 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 60px)' }}
        >
          {renderTab(activeTab)}
        </main>
      </div>

      {/* ===== FOOTER — Event Log (Desktop) ===== */}
      <footer
        className="hidden md:block border-t"
        style={{ background: '#08080e', borderColor: '#1a1025' }}
      >
        <div className="max-w-5xl mx-auto px-3 py-2">
          <div className="space-y-0.5" style={{ maxHeight: '85px', overflow: 'hidden' }}>
            {state.eventLog.slice(0, 5).map(log => (
              <div
                key={log.id}
                className="text-xs flex items-start gap-2 leading-relaxed"
                style={{
                  color:
                    log.type === 'success' ? '#4ade80' :
                    log.type === 'warning' ? '#fbbf24' :
                    log.type === 'danger' ? '#ef4444' :
                    log.type === 'legendary' ? '#fbbf24' :
                    log.type === 'system' ? '#a78bfa' : '#4a4a5a',
                }}
              >
                <span className="opacity-30 text-[10px] whitespace-nowrap mt-[1px]">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>{log.text}</span>
              </div>
            ))}
            {state.eventLog.length === 0 && (
              <div className="text-xs text-gray-700 italic">No events yet...</div>
            )}
          </div>
        </div>
      </footer>

      {/* ===== MOBILE: Bottom Tab Bar ===== */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t"
        style={{ background: '#0d0d18', borderColor: '#1a1025' }}
      >
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center py-2 transition-all duration-200 relative"
              style={{
                color: isActive ? '#fbbf24' : '#4a4a5a',
                background: isActive ? '#1a152210' : 'transparent',
                minHeight: '56px',
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full"
                  style={{ background: '#fbbf24', boxShadow: '0 2px 8px #fbbf2466' }}
                />
              )}
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ===== MOBILE: Event Log (compact overlay) ===== */}
      <div className="md:hidden fixed bottom-[56px] left-0 right-0 z-30 px-2 pointer-events-none">
        <div
          className="rounded-t-lg px-3 py-1.5"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(8, 8, 14, 0.97))',
          }}
        >
          {state.eventLog.slice(0, 2).map(log => (
            <div
              key={log.id}
              className="text-[10px] truncate leading-relaxed"
              style={{
                color:
                  log.type === 'success' ? '#4ade80' :
                  log.type === 'warning' ? '#fbbf24' :
                  log.type === 'danger' ? '#ef4444' :
                  log.type === 'legendary' ? '#fbbf24' :
                  log.type === 'system' ? '#a78bfa' : '#3a3a4a',
              }}
            >
              {log.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
