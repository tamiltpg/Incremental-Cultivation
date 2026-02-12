import { useState, useCallback, useEffect, useRef } from 'react';
import type { Character, SpiritRoot, BodyType, Background } from '../data/types';
import { SPIRIT_ROOTS, BODY_TYPES, BACKGROUNDS, RARITY_COLORS } from '../data/constants';
import { weightedRandom, rollLuck } from '../utils/random';

interface Props {
  onConfirm: (character: Character) => void;
}

// ========== COLOR HELPERS ==========
function getRootColor(name: string): string {
  const colors: Record<string, string> = {
    'Trash Root': RARITY_COLORS.common,
    'Mortal Root': RARITY_COLORS.uncommon,
    'Earth Root': RARITY_COLORS.rare,
    'Heaven Root': RARITY_COLORS.epic,
    'God-Slayer Root': RARITY_COLORS.legendary,
  };
  return colors[name] || '#fff';
}

function getBodyColor(mult: number): string {
  if (mult >= 3.0) return RARITY_COLORS.mythic;
  if (mult >= 2.5) return RARITY_COLORS.legendary;
  if (mult >= 1.5) return RARITY_COLORS.epic;
  if (mult >= 1.2) return RARITY_COLORS.rare;
  if (mult >= 0.8) return RARITY_COLORS.uncommon;
  return RARITY_COLORS.common;
}

function getRootRarity(name: string): string {
  const rarities: Record<string, string> = {
    'Trash Root': 'Abysmal',
    'Mortal Root': 'Common',
    'Earth Root': 'Rare',
    'Heaven Root': 'Exceptional',
    'God-Slayer Root': 'LEGENDARY',
  };
  return rarities[name] || 'Unknown';
}

function getBodyRarity(mult: number): string {
  if (mult >= 3.0) return 'MYTHIC';
  if (mult >= 2.5) return 'LEGENDARY';
  if (mult >= 1.5) return 'Exceptional';
  if (mult >= 1.2) return 'Rare';
  if (mult >= 0.8) return 'Common';
  return 'Abysmal';
}

// Vague luck hint — never show actual value
function getLuckHint(luck: number): { text: string; color: string } {
  if (luck >= 0.85) return { text: 'The heavens smile upon you...', color: '#fbbf24' };
  if (luck >= 0.65) return { text: 'Fortune flows gently in your veins.', color: '#4ade80' };
  if (luck >= 0.45) return { text: 'The winds of fate are neither kind nor cruel.', color: '#60a5fa' };
  if (luck >= 0.25) return { text: 'Dark clouds gather over your destiny...', color: '#f97316' };
  return { text: 'The heavens have cursed your very birth.', color: '#ef4444' };
}

// ========== ROLL CHARACTER ==========
function rollNewCharacter(name: string): Character {
  const spiritRoot: SpiritRoot = weightedRandom(SPIRIT_ROOTS);
  const bodyType: BodyType = weightedRandom(BODY_TYPES);
  const background: Background = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
  const luck = rollLuck();

  return {
    name: name || 'Unnamed Cultivator',
    spiritRoot,
    bodyType,
    background,
    luck,
    karma: 0,
    rogueStatus: false,
    rebirthCount: 0,
    legacyBonus: 0,
    devilMark: false,
    redeemedDevil: false,
  };
}

// ========== ANIMATED PARTICLES ==========
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = [];
    const colors = ['#fbbf24', '#4ade80', '#a78bfa', '#ef4444', '#60a5fa'];

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.8 - 0.2,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.001;

        if (p.y < -10 || p.alpha <= 0) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
          p.alpha = Math.random() * 0.6 + 0.1;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

// ========== ROLLING ANIMATION DISPLAY ==========
function RollingText({ items, finalValue, color, duration = 1500 }: {
  items: string[];
  finalValue: string;
  color: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(items[0]);
  const [isRolling, setIsRolling] = useState(true);

  useEffect(() => {
    setIsRolling(true);
    let elapsed = 0;
    const interval = 80;
    const timer = setInterval(() => {
      elapsed += interval;
      if (elapsed >= duration) {
        setDisplayValue(finalValue);
        setIsRolling(false);
        clearInterval(timer);
      } else {
        setDisplayValue(items[Math.floor(Math.random() * items.length)]);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [finalValue, items, duration]);

  return (
    <span
      className={`font-bold transition-all duration-300 ${isRolling ? 'blur-[1px]' : ''}`}
      style={{
        color,
        fontFamily: 'Cinzel, serif',
        textShadow: !isRolling ? `0 0 12px ${color}44` : undefined,
      }}
    >
      {displayValue}
    </span>
  );
}

// ========== MAIN COMPONENT ==========
export function CharacterCreation({ onConfirm }: Props) {
  const [name, setName] = useState('');
  const [character, setCharacter] = useState<Character | null>(null);
  const [rerollCount, setRerollCount] = useState(0);
  const [phase, setPhase] = useState<'name' | 'rolling' | 'reveal'>('name');
  const [revealStep, setRevealStep] = useState(0);
  const [spiritStones, setSpiritStones] = useState(0); // Track SS for reroll costs

  const rootNames = SPIRIT_ROOTS.map(r => r.name);
  const bodyNames = BODY_TYPES.map(b => b.name);

  const doRoll = useCallback(() => {
    const rolled = rollNewCharacter(name || 'Unnamed Cultivator');
    setCharacter(rolled);
    setPhase('rolling');
    setRevealStep(0);

    // Staggered reveal animation
    setTimeout(() => setRevealStep(1), 600);   // Spirit Root
    setTimeout(() => setRevealStep(2), 1400);  // Body Type
    setTimeout(() => setRevealStep(3), 2200);  // Background
    setTimeout(() => setRevealStep(4), 2800);  // Fate hint
    setTimeout(() => setPhase('reveal'), 3200); // Full reveal
  }, [name]);

  const handleNameSubmit = () => {
    if (!name.trim()) return;
    doRoll();
  };

  const handleReroll = () => {
    // Calculate cost: 1st free, 2nd = 10 SS, 3rd = 100 SS, etc.
    const cost = rerollCount === 0 ? 0 : Math.pow(10, rerollCount);
    if (cost > 0 && spiritStones < cost) {
      // Can't afford — flash warning
      return;
    }
    if (cost > 0) {
      setSpiritStones(prev => prev - cost);
    }
    setRerollCount(r => r + 1);
    doRoll();
  };

  const handleConfirm = () => {
    if (!character) return;
    // Add any spirit stones from re-roll balance to the character's starting stones
    const finalChar = { ...character };
    // Background spirit stone bonus will be handled by createInitialGameState
    // but we need to pass along any leftover SS from rerolls if the fallen noble gave us some
    onConfirm(finalChar);
  };

  const nextRerollCost = rerollCount === 0 ? 0 : Math.pow(10, rerollCount);
  const canAffordReroll = nextRerollCost === 0 || spiritStones >= nextRerollCost;
  const rerollCostLabel = nextRerollCost === 0 ? 'Free' : `${nextRerollCost} 💎`;

  // When character is Fallen Noble, they start with 50 SS for rerolling
  useEffect(() => {
    if (character?.background.id === 'fallen_noble' && rerollCount === 0) {
      // Don't auto-add — it's handled by game state
    }
  }, [character, rerollCount]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0a0a0f 0%, #12051a 30%, #1a0820 60%, #0a0a0f 100%)',
      }}
    >
      <ParticleField />

      <div className="w-full max-w-lg relative z-10">
        {/* ===== TITLE ===== */}
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: '#4a3060' }}>
            Incremental Cultivation
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold mb-3"
            style={{
              fontFamily: 'Cinzel, serif',
              color: '#fbbf24',
              textShadow: '0 0 30px rgba(251, 191, 36, 0.3), 0 0 60px rgba(251, 191, 36, 0.1)',
            }}
          >
            The Grand Dao
          </h1>
          <div
            className="h-px w-64 mx-auto"
            style={{ background: 'linear-gradient(90deg, transparent, #fbbf24, transparent)' }}
          />
          <p className="text-xs mt-3 italic" style={{ color: '#6b5a3e' }}>
            "Ten thousand paths lead to the Dao. Which shall you walk?"
          </p>
        </div>

        {/* ===== NAME INPUT PHASE ===== */}
        {phase === 'name' && (
          <div
            className="rounded-xl p-8 border backdrop-blur-sm"
            style={{
              background: 'rgba(15, 10, 25, 0.95)',
              borderColor: '#2a2040',
              boxShadow: '0 0 40px rgba(40, 20, 60, 0.5)',
            }}
          >
            <h2
              className="text-xl font-bold mb-2 text-center"
              style={{ fontFamily: 'Cinzel, serif', color: '#e2c97e' }}
            >
              📜 What Is Your Name, Mortal?
            </h2>
            <p className="text-xs text-center mb-6" style={{ color: '#5a4a6a' }}>
              This name shall persist through death, rebirth, and the ages.
            </p>

            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
              placeholder="Enter your name..."
              maxLength={24}
              autoFocus
              className="w-full px-4 py-4 rounded-lg border text-white text-center text-lg focus:outline-none transition-all duration-300"
              style={{
                background: '#0a0a0f',
                borderColor: name.trim() ? '#fbbf24' : '#2a2040',
                fontFamily: 'Cinzel, serif',
                boxShadow: name.trim() ? '0 0 15px rgba(251, 191, 36, 0.15)' : 'none',
              }}
            />

            <button
              onClick={handleNameSubmit}
              disabled={!name.trim()}
              className="w-full mt-5 py-4 rounded-lg font-bold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
              style={{
                background: name.trim()
                  ? 'linear-gradient(135deg, #8b6914, #b8860b, #daa520, #b8860b)'
                  : '#222',
                color: '#0a0a0f',
                fontFamily: 'Cinzel, serif',
                minHeight: '52px',
                boxShadow: name.trim() ? '0 4px 20px rgba(218, 165, 32, 0.3)' : 'none',
                letterSpacing: '0.05em',
              }}
            >
              ⚡ Begin the Fate Roll
            </button>
          </div>
        )}

        {/* ===== ROLLING / REVEAL PHASE ===== */}
        {(phase === 'rolling' || phase === 'reveal') && character && (
          <div
            className="rounded-xl p-6 border space-y-4 backdrop-blur-sm"
            style={{
              background: 'rgba(15, 10, 25, 0.95)',
              borderColor: phase === 'reveal' ? '#fbbf2444' : '#2a2040',
              boxShadow: phase === 'reveal' ? '0 0 40px rgba(251, 191, 36, 0.1)' : '0 0 40px rgba(40, 20, 60, 0.5)',
              transition: 'all 0.5s ease',
            }}
          >
            <div className="text-center">
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: 'Cinzel, serif', color: '#e2c97e' }}
              >
                🎲 The Fate Roll
              </h2>
              <p className="text-xs mt-1" style={{ color: '#5a4a6a' }}>
                {phase === 'rolling' ? 'The heavens are deciding your fate...' : `Roll #${rerollCount + 1} for ${character.name}`}
              </p>
            </div>

            {/* Spirit Root */}
            <div
              className="rounded-lg p-4 border transition-all duration-500"
              style={{
                background: revealStep >= 1 ? '#0d0d15' : '#08080c',
                borderColor: revealStep >= 1 ? `${getRootColor(character.spiritRoot.name)}33` : '#1a1025',
                opacity: revealStep >= 1 ? 1 : 0.3,
                transform: revealStep >= 1 ? 'translateY(0)' : 'translateY(10px)',
              }}
            >
              <div className="flex justify-between items-start">
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#c9a44a' }}>
                  Spirit Root
                </div>
                {revealStep >= 1 && (
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold"
                    style={{
                      color: getRootColor(character.spiritRoot.name),
                      background: `${getRootColor(character.spiritRoot.name)}15`,
                      border: `1px solid ${getRootColor(character.spiritRoot.name)}33`,
                    }}
                  >
                    {getRootRarity(character.spiritRoot.name)}
                  </span>
                )}
              </div>
              <div className="text-lg">
                {revealStep >= 1 ? (
                  <RollingText
                    items={rootNames}
                    finalValue={character.spiritRoot.name}
                    color={getRootColor(character.spiritRoot.name)}
                    duration={800}
                  />
                ) : (
                  <span className="text-gray-600" style={{ fontFamily: 'Cinzel, serif' }}>???</span>
                )}
              </div>
              {revealStep >= 1 && phase === 'reveal' && (
                <>
                  <div className="text-sm mt-1 italic" style={{ color: '#8a7a6a' }}>
                    {character.spiritRoot.description}
                  </div>
                  <div className="text-sm mt-2 font-bold" style={{ color: '#4ade80' }}>
                    🔮 Qi Cultivation Speed: {character.spiritRoot.qiMultiplier}x
                  </div>
                </>
              )}
            </div>

            {/* Body Type */}
            <div
              className="rounded-lg p-4 border transition-all duration-500"
              style={{
                background: revealStep >= 2 ? '#0d0d15' : '#08080c',
                borderColor: revealStep >= 2 ? `${getBodyColor(character.bodyType.bodyMultiplier)}33` : '#1a1025',
                opacity: revealStep >= 2 ? 1 : 0.3,
                transform: revealStep >= 2 ? 'translateY(0)' : 'translateY(10px)',
              }}
            >
              <div className="flex justify-between items-start">
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#c9a44a' }}>
                  Body Type
                </div>
                {revealStep >= 2 && (
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold"
                    style={{
                      color: getBodyColor(character.bodyType.bodyMultiplier),
                      background: `${getBodyColor(character.bodyType.bodyMultiplier)}15`,
                      border: `1px solid ${getBodyColor(character.bodyType.bodyMultiplier)}33`,
                    }}
                  >
                    {getBodyRarity(character.bodyType.bodyMultiplier)}
                  </span>
                )}
              </div>
              <div className="text-lg">
                {revealStep >= 2 ? (
                  <RollingText
                    items={bodyNames}
                    finalValue={character.bodyType.name}
                    color={getBodyColor(character.bodyType.bodyMultiplier)}
                    duration={800}
                  />
                ) : (
                  <span className="text-gray-600" style={{ fontFamily: 'Cinzel, serif' }}>???</span>
                )}
              </div>
              {revealStep >= 2 && phase === 'reveal' && (
                <>
                  <div className="text-sm mt-1 italic" style={{ color: '#8a7a6a' }}>
                    {character.bodyType.description}
                  </div>
                  <div className="text-sm mt-2 font-bold" style={{ color: '#f97316' }}>
                    ⚔️ Body Cultivation Speed: {character.bodyType.bodyMultiplier}x
                    {character.bodyType.qiBonusMultiplier > 0 && (
                      <span style={{ color: '#4ade80' }}>
                        {' '}| +{character.bodyType.qiBonusMultiplier}x Qi Bonus
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Background */}
            <div
              className="rounded-lg p-4 border transition-all duration-500"
              style={{
                background: revealStep >= 3 ? '#0d0d15' : '#08080c',
                borderColor: revealStep >= 3 ? '#e2c97e33' : '#1a1025',
                opacity: revealStep >= 3 ? 1 : 0.3,
                transform: revealStep >= 3 ? 'translateY(0)' : 'translateY(10px)',
              }}
            >
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#c9a44a' }}>
                Background
              </div>
              <div className="text-lg">
                {revealStep >= 3 ? (
                  <span
                    className="font-bold"
                    style={{
                      color: '#e2c97e',
                      fontFamily: 'Cinzel, serif',
                      textShadow: '0 0 10px rgba(226, 201, 126, 0.2)',
                    }}
                  >
                    {character.background.name}
                  </span>
                ) : (
                  <span className="text-gray-600" style={{ fontFamily: 'Cinzel, serif' }}>???</span>
                )}
              </div>
              {revealStep >= 3 && phase === 'reveal' && (
                <>
                  <div className="text-sm mt-1 italic" style={{ color: '#8a7a6a' }}>
                    {character.background.description}
                  </div>
                  <div className="text-sm mt-2 font-bold" style={{ color: '#60a5fa' }}>
                    ✨ {character.background.bonus}
                  </div>
                </>
              )}
            </div>

            {/* Fate Whisper (vague luck hint) */}
            {revealStep >= 4 && (
              <div
                className="rounded-lg p-3 border text-center transition-all duration-500"
                style={{
                  background: '#08080c',
                  borderColor: '#1a1025',
                }}
              >
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#5a4a6a' }}>
                  The Whisper of Fate
                </div>
                <div
                  className="text-sm italic"
                  style={{
                    color: getLuckHint(character.luck).color,
                    textShadow: `0 0 10px ${getLuckHint(character.luck).color}33`,
                  }}
                >
                  "{getLuckHint(character.luck).text}"
                </div>
              </div>
            )}

            {/* Action Buttons — only show after full reveal */}
            {phase === 'reveal' && (
              <div className="space-y-3 pt-3">
                {/* Divider */}
                <div
                  className="h-px w-full"
                  style={{ background: 'linear-gradient(90deg, transparent, #fbbf2444, transparent)' }}
                />

                <div className="flex gap-3">
                  {/* Re-roll Button */}
                  <button
                    onClick={handleReroll}
                    disabled={!canAffordReroll}
                    className="flex-1 py-4 rounded-lg font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 border disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: canAffordReroll
                        ? 'linear-gradient(135deg, #1a1030, #2a1040)'
                        : '#111',
                      borderColor: canAffordReroll ? '#6b3fa0' : '#222',
                      color: canAffordReroll ? '#c084fc' : '#444',
                      minHeight: '52px',
                      boxShadow: canAffordReroll ? '0 0 15px rgba(168, 85, 247, 0.15)' : 'none',
                    }}
                  >
                    <div className="text-base">🔄 Defy the Heavens</div>
                    <div className="text-xs mt-0.5 opacity-70">({rerollCostLabel})</div>
                  </button>

                  {/* Accept Button */}
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-4 rounded-lg font-bold text-lg transition-all duration-200 hover:scale-[1.02] active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #8b6914, #b8860b, #daa520)',
                      color: '#0a0a0f',
                      fontFamily: 'Cinzel, serif',
                      minHeight: '52px',
                      boxShadow: '0 4px 20px rgba(218, 165, 32, 0.3)',
                      letterSpacing: '0.03em',
                    }}
                  >
                    <div>✅ Accept Fate</div>
                  </button>
                </div>

                {/* Re-roll info */}
                <div className="text-center text-[10px]" style={{ color: '#3a2a50' }}>
                  {rerollCount === 0
                    ? '1st re-roll is free. Subsequent re-rolls cost Spirit Stones.'
                    : `Spirit Stones: ${spiritStones} 💎 | Next re-roll: ${Math.pow(10, rerollCount + 1)} 💎`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer flavor */}
        <div className="text-center mt-8">
          <p className="text-[10px]" style={{ color: '#2a1a3a' }}>
            "One's fate is written in the stars, but the Dao is walked by mortal feet."
          </p>
        </div>
      </div>
    </div>
  );
}
