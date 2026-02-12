import type { SpiritRoot, BodyType, Background, Path, PathLevel, GameState, Region, Item, GameEvent } from './types';

// ========== XP FORMULA CONSTANTS ==========
export const BASE_XP = 100;
export const SCALE_FACTOR = 2.2;
export const TIER_MULTIPLIERS: Record<number, number> = { 1: 1, 2: 5, 3: 25 };
export const BASE_XP_PER_SECOND = 1;
export const AUTO_SAVE_INTERVAL = 30000;
export const OFFLINE_CAP_HOURS = 8;
export const MAX_LOG_MESSAGES = 50;
export const CLICK_BOOST_MULTIPLIER = 2;
export const EVENT_CHECK_INTERVAL = 60;
export const FATED_ENCOUNTER_BASE_CHANCE = 0.0001;

export function calculateXpRequired(level: number): number {
  const tier = level <= 4 ? 1 : level <= 8 ? 2 : 3;
  return Math.floor(BASE_XP * Math.pow(SCALE_FACTOR, level) * TIER_MULTIPLIERS[tier]);
}

export function getTierForLevel(level: number): 1 | 2 | 3 {
  if (level <= 4) return 1;
  if (level <= 8) return 2;
  return 3;
}

export function getTierName(tier: number): string {
  switch (tier) {
    case 1: return 'Mortal';
    case 2: return 'Transcendent';
    case 3: return 'Divine';
    default: return 'Unknown';
  }
}

// ========== BREAKTHROUGH ==========
export const BREAKTHROUGH_RATES: Record<number, number> = {
  1: 0.70, 2: 0.55, 3: 0.40, 4: 0.25,
  5: 0.50, 6: 0.35, 7: 0.25, 8: 0.15,
  9: 0.30, 10: 0.20, 11: 0.10
};

export const TIER_TRANSITION_LEVELS = [4, 8];

// ========== SPIRIT ROOTS ==========
export const SPIRIT_ROOTS: SpiritRoot[] = [
  { name: 'Trash Root', qiMultiplier: 0.3, probability: 0.30, description: 'Barely able to sense Qi. A cruel joke of the heavens.' },
  { name: 'Mortal Root', qiMultiplier: 0.6, probability: 0.35, description: 'Average spiritual talent. The path will be long.' },
  { name: 'Earth Root', qiMultiplier: 1.0, probability: 0.20, description: 'Solid foundation. A respectable cultivator\'s root.' },
  { name: 'Heaven Root', qiMultiplier: 1.5, probability: 0.12, description: 'Blessed by the heavens. Qi flows like a river.' },
  { name: 'God-Slayer Root', qiMultiplier: 2.5, probability: 0.03, description: 'A root seen once in ten thousand years. The Dao trembles.' },
];

// ========== BODY TYPES ==========
export const BODY_TYPES: BodyType[] = [
  { name: 'Common Mortal Frame', bodyMultiplier: 0.5, qiBonusMultiplier: 0, probability: 0.35, description: 'An unremarkable body. Flesh is weak.' },
  { name: 'Tempered Physique', bodyMultiplier: 0.8, qiBonusMultiplier: 0, probability: 0.30, description: 'A body honed by labor. Slightly above average.' },
  { name: 'Vajra Body', bodyMultiplier: 1.2, qiBonusMultiplier: 0, probability: 0.18, description: 'Skin like bronze, bones like steel. A natural warrior.' },
  { name: 'Nine Yin Meridians', bodyMultiplier: 1.5, qiBonusMultiplier: 0.3, probability: 0.10, description: 'A rare physique that amplifies both body and spirit.' },
  { name: 'Ancient Chaos Body', bodyMultiplier: 2.5, qiBonusMultiplier: 0, probability: 0.05, description: 'Born from primordial chaos. Immense physical potential.' },
  { name: 'Primordial Divine Frame', bodyMultiplier: 3.0, qiBonusMultiplier: 0.5, probability: 0.02, description: 'A body that defies mortal limits. Legends speak of such frames.' },
];

// ========== BACKGROUNDS ==========
export const BACKGROUNDS: Background[] = [
  {
    id: 'village_orphan', name: 'Village Orphan',
    description: 'Raised in a remote village, you learned to survive by scavenging and exploring the wilds.',
    startLocation: 'peaceful_village', bonus: '+10% Exploration find rate',
    bonusEffect: { explorationBonus: 0.10 }
  },
  {
    id: 'fallen_noble', name: 'Fallen Noble',
    description: 'Once of noble blood, your family was destroyed. Only memories and a small fortune remain.',
    startLocation: 'small_city', bonus: 'Start with 50 Spirit Stones',
    bonusEffect: { spiritStones: 50 }
  },
  {
    id: 'wandering_beggar', name: 'Wandering Beggar',
    description: 'The road is your home. Hardship has sharpened your instincts.',
    startLocation: 'forest_path', bonus: '+5% Luck modifier',
    bonusEffect: { luckBonus: 0.05 }
  },
  {
    id: 'sect_reject', name: 'Sect Reject',
    description: 'Turned away at the gates, you vowed to prove them wrong.',
    startLocation: 'mystic_mountain_base', bonus: 'Can join a Sect immediately',
    bonusEffect: { sectAccess: true }
  },
  {
    id: 'merchants_child', name: "Merchant's Child",
    description: 'Gold flows in your veins. You know the value of everything.',
    startLocation: 'merchant_hub', bonus: 'Shop prices -10%',
    bonusEffect: { shopDiscount: 0.10 }
  },
  {
    id: 'mysterious_amnesiac', name: 'Mysterious Amnesiac',
    description: 'You awoke with no memory, only a strange scripture and an inexplicable sense of destiny.',
    startLocation: 'cursed_swamp', bonus: 'Hidden +0.1 Luck, one random scripture',
    bonusEffect: { hiddenLuck: 0.1, randomScripture: true }
  },
];

// ========== PATH LEVEL GENERATORS ==========
function makePathLevels(names: string[], flavors: string[]): PathLevel[] {
  return names.map((name, i) => ({
    level: i + 1,
    tier: getTierForLevel(i + 1),
    tierName: getTierName(getTierForLevel(i + 1)),
    name,
    flavor: flavors[i] || '',
  }));
}

// ========== ALL 15 PATHS ==========
export const PATHS: Path[] = [
  // PATH 1: Cultivation — Path of the Spirit
  {
    id: 'spirit', name: 'Path of the Spirit', subtitle: 'Orthodox Qi Cultivation',
    action: 'cultivate', icon: '🔮', color: '#4ade80',
    unlockCondition: 'Find any Cultivation Scripture',
    unlockCheck: (s: GameState) => s.equippedScripture !== null || s.inventory.some(i => i.category === 'scripture'),
    speedModifier: (s: GameState) => s.character.spiritRoot.qiMultiplier + (s.character.bodyType.qiBonusMultiplier || 0),
    levels: makePathLevels(
      ['Qi Condensation', 'Foundation Establishment', 'Golden Core', 'Nascent Soul',
       'Spirit Transformation', 'Void Refinement', 'Dao Domain', 'Tribulation Transcendence',
       'Empyrean Sovereign', 'Eternal Ascendant', 'Cosmic Singularity', 'Zenith Origin'],
      ['Gathering energy into meridians', 'Building a Spirit Sea', 'Solidifying energy into internal sun', 'Birthing spiritual Self',
       'Merging soul with senses', 'Mastering empty space', 'Personal laws override physics', "Surmounting Heaven's Trial",
       'Commanding stars', 'Existing outside Time', 'Internal world becomes universe', 'Reaching source of existence']
    ),
  },
  // PATH 2: Martial Arts — Path of the Carnal
  {
    id: 'martial', name: 'Path of the Carnal', subtitle: 'Orthodox Body Cultivation',
    action: 'train', icon: '⚔️', color: '#f97316',
    unlockCondition: 'Available from start',
    unlockCheck: () => true,
    speedModifier: (s: GameState) => s.character.bodyType.bodyMultiplier,
    levels: makePathLevels(
      ['Skin Refinement', 'Bone Tempering', 'Organ Forging', 'Blood Transmutation',
       'Marrow Sanctification', 'Sovereign Physique', 'Vajra Transcendence', 'Aura Incarnation',
       'Star-Crushing Might', 'Nirvana Flesh', 'World-Pillar Form', 'Primordial Titan'],
      ['Iron Husk — hardening the outer shell', 'Jade Frame — reinforcing the skeleton', 'Inner Furnace — tempering vital organs', 'Ichor — blood becomes power',
       'Sacred marrow awakens', 'Body transcends mortal limits', 'Diamond body achieved', 'Aura made manifest',
       'Strength to shatter stars', 'Flesh reborn through destruction', 'Body becomes a world pillar', 'The ultimate physical form']
    ),
  },
  // PATH 3: Rogue Cultivator — The Wild Path
  {
    id: 'rogue', name: 'The Wild Path', subtitle: 'Unorthodox Rogue Cultivation',
    action: 'cultivate', icon: '🌪️', color: '#a78bfa',
    unlockCondition: 'Rogue Status = true',
    unlockCheck: (s: GameState) => s.character.rogueStatus,
    speedModifier: (s: GameState) => (s.character.spiritRoot.qiMultiplier + (s.character.bodyType.qiBonusMultiplier || 0)) * 0.8,
    levels: makePathLevels(
      ['Qi-Gatherer', 'Sea-Builder', 'Core-Loomer', 'Soul-Shatterer',
       'Spirit-Walker', 'Rift-Runner', 'Domain-Master', 'Fate-Survivor',
       'Sky-Ruler', 'Time-Drifter', 'Star-Born', 'Boundless'],
      ['Scraping Qi from the world', 'Constructing a makeshift sea', 'A rough but powerful core', 'Shattering limits through will',
       'Walking between worlds', 'Running through dimensional rifts', 'Mastering a wild domain', 'Surviving against all odds',
       'Ruling the open sky', 'Drifting through time itself', 'Born among the stars', 'Without limit or boundary']
    ),
  },
  // PATH 4: Devil Cultivator — Soul Corruption
  {
    id: 'devil_soul', name: 'Soul Corruption', subtitle: 'Devil Qi Cultivation',
    action: 'cultivate', icon: '💀', color: '#ef4444',
    unlockCondition: 'Karma ≤ -100',
    unlockCheck: (s: GameState) => s.character.karma <= -100,
    speedModifier: (s: GameState) => (s.character.spiritRoot.qiMultiplier + (s.character.bodyType.qiBonusMultiplier || 0)) * 1.2,
    levels: makePathLevels(
      ['Malice Gathering', 'Blood-Sea Foundation', 'Black Core', 'Vile Infant',
       'Demon-Soul Aspect', 'Abyssal Anchor', 'Hell-Realm Domain', 'Calamity Ascension',
       'Arch-Devil King', 'Sorrow Eternal', 'Void Eater', 'Primordial Nightmare'],
      ['Gathering malice from suffering', 'A sea of blood forms within', 'Core blackened by corruption', 'A vile soul infant takes shape',
       'The demon soul emerges', 'Anchored to the abyss', 'A personal hell realm manifests', 'Ascending through calamity',
       'Ruling as Arch-Devil', 'Eternal sorrow given form', 'Devouring the void itself', 'The ultimate nightmare made real']
    ),
  },
  // PATH 5: Devil Practitioner — Body Corruption
  {
    id: 'devil_body', name: 'Body Corruption', subtitle: 'Devil Body Cultivation',
    action: 'train', icon: '🩸', color: '#dc2626',
    unlockCondition: 'Karma ≤ -100',
    unlockCheck: (s: GameState) => s.character.karma <= -100,
    speedModifier: (s: GameState) => s.character.bodyType.bodyMultiplier * 1.2,
    levels: makePathLevels(
      ['Rotten Skin', 'Obscene Bone', 'Corrupted Vitals', 'Demon-Blood Surge',
       'Monstrous Metamorphosis', 'Abyssal Shell', 'Unholy Titan', 'Carnal Desecration',
       'World-Ender Physique', 'Indestructible Fiend', 'Chaos Avatar', 'The End-Bringer'],
      ['Skin rots and reforms stronger', 'Bones twist into obscene shapes', 'Organs corrupted with dark power', 'Demon blood surges through veins',
       'Body transforms monstrously', 'An abyssal shell encases you', 'An unholy titan rises', 'Flesh desecrated beyond recognition',
       'A physique that ends worlds', 'Truly indestructible', 'Avatar of pure chaos', 'The one who brings the end']
    ),
  },
  // PATH 6: Alchemy — The Pill Path
  {
    id: 'alchemy', name: 'The Pill Path', subtitle: 'Alchemy & Refinement',
    action: 'refine', icon: '⚗️', color: '#22d3ee',
    unlockCondition: 'Find Alchemy Manual',
    unlockCheck: (s: GameState) => s.inventory.some(i => i.id === 'alchemy_manual') || (s.pathProgress['alchemy']?.unlocked ?? false),
    speedModifier: (s: GameState) => (s.character.spiritRoot.qiMultiplier * 0.5) + 0.5,
    levels: makePathLevels(
      ['Apprentice', 'Journeyman', 'Master', 'Grandmaster',
       'Spirit Alchemist', 'Void Alchemist', 'Earth-Vein Alchemist', 'Heaven-Limit Alchemist',
       'Sovereign Pill-God', 'Life-Creator', 'Galaxy Refiner', 'The Eternal Apothecary'],
      ['Iron Cauldron — learning the basics', 'Bronze Flame — improving technique', 'Silver Pill — true mastery', 'Golden Elixir — grandmaster level',
       'Spirit-infused alchemy', 'Refining the void itself', 'Drawing from earth veins', 'Reaching heaven\'s limit',
       'Sovereign of pills', 'Creating life through alchemy', 'Refining galaxies', 'The eternal apothecary']
    ),
  },
  // PATH 7: Formations — The Array Path
  {
    id: 'formations', name: 'The Array Path', subtitle: 'Formations & Arrays',
    action: 'inscribe', icon: '📐', color: '#818cf8',
    unlockCondition: 'Find Formation Blueprint',
    unlockCheck: (s: GameState) => s.inventory.some(i => i.id === 'formation_blueprint') || (s.pathProgress['formations']?.unlocked ?? false),
    speedModifier: (s: GameState) => (s.character.spiritRoot.qiMultiplier * 0.5) + 0.5,
    levels: makePathLevels(
      ['Script-Tracer', 'Array-Planter', 'Node-Master', 'Spirit-Weaver',
       'Domain-Architect', 'Spatial-Arrayist', 'World-Loomer', 'Constellation-Binder',
       'Heavenly Array-Lord', 'Reality-Stitcher', 'Dimensional-Mason', 'The Great Architect'],
      ['Tracing basic scripts', 'Planting array nodes', 'Mastering node connections', 'Weaving spirit into arrays',
       'Architecting domains', 'Spatial array mastery', 'Looming worlds into being', 'Binding constellations',
       'Lord of heavenly arrays', 'Stitching reality together', 'Mason of dimensions', 'The architect of everything']
    ),
  },
  // PATH 8: Soul-Beast Tamers — The Resonance Path
  {
    id: 'beast_tamer', name: 'The Resonance Path', subtitle: 'Soul-Beast Taming',
    action: 'explore', icon: '🐉', color: '#f59e0b',
    unlockCondition: 'Encounter tameable beast during Exploration',
    unlockCheck: (s: GameState) => s.pathProgress['beast_tamer']?.unlocked ?? false,
    speedModifier: (s: GameState) => (s.character.spiritRoot.qiMultiplier + s.character.bodyType.bodyMultiplier) * 0.5,
    levels: makePathLevels(
      ['Beast-Linker', 'Contract Initiate', 'Shared Vitality', 'Symbiotic Growth',
       'Chimera-Fusion', 'Pack-Mind Sovereign', 'Monstrous Domain', 'Primal Awakening',
       'Beast-God Avatar', 'Calamity Breeder', 'Star-Devourer Lord', 'The Great Ancestor'],
      ['Linking with a beast soul', 'Initiating the contract', 'Sharing life force', 'Growing together symbiotically',
       'Fusing with chimeric beasts', 'Sovereign of the pack mind', 'A domain of monsters', 'Primal instincts awaken',
       'Avatar of the beast god', 'Breeding calamity beasts', 'Lord of star devourers', 'The great ancestor of all beasts']
    ),
  },
  // PATH 9: Artificers — The Mechanical Path
  {
    id: 'artificer', name: 'The Mechanical Path', subtitle: 'Puppetry & Artifice',
    action: 'forge', icon: '⚙️', color: '#94a3b8',
    unlockCondition: 'Find Artificer Blueprints',
    unlockCheck: (s: GameState) => s.inventory.some(i => i.id === 'artificer_blueprint') || (s.pathProgress['artificer']?.unlocked ?? false),
    speedModifier: (s: GameState) => (s.character.bodyType.bodyMultiplier * 0.5) + 0.5,
    levels: makePathLevels(
      ['Tool-Tinker', 'Clockwork-Adept', 'Core-Engineer', 'Armor-Smith Paragon',
       'Sentience-Infuser', 'Legion-Commander', 'Living Fortress', 'Iron-Body Transfer',
       'God-Machine Architect', 'Void-Steel Crafter', 'Dimensional Weaver', 'The Celestial Craftsman'],
      ['Tinkering with basic tools', 'Mastering clockwork', 'Engineering spirit cores', 'Paragonic armor smithing',
       'Infusing sentience into creations', 'Commanding a mechanical legion', 'Becoming a living fortress', 'Transferring consciousness to iron',
       'Architecting god-machines', 'Crafting void steel', 'Weaving dimensions into creations', 'The ultimate craftsman']
    ),
  },
  // PATH 10: Fate-Seers — The Oracle Path
  {
    id: 'oracle', name: 'The Oracle Path', subtitle: 'Fate & Divination',
    action: 'cultivate', icon: '🔮', color: '#c084fc',
    unlockCondition: 'Karma visible + find Divination Manual',
    unlockCheck: (s: GameState) => s.karmaVisible && (s.inventory.some(i => i.id === 'divination_manual') || (s.pathProgress['oracle']?.unlocked ?? false)),
    speedModifier: (s: GameState) => s.character.spiritRoot.qiMultiplier * 0.7 + s.character.luck * 0.5,
    levels: makePathLevels(
      ['Luck-Seeker', 'Omen-Reader', 'Thread-Watcher', 'Probability-Shifter',
       'Timeline-Peeker', 'Causality-Manipulator', 'Karma-Judge', 'Destiny-Weaver',
       'Aeon-Sage', 'Fate-Eater', 'Universal Eye', 'The Weaver of Reality'],
      ['Seeking traces of luck', 'Reading omens in the wind', 'Watching the threads of fate', 'Shifting probability itself',
       'Peeking into timelines', 'Manipulating causality', 'Judging karma of others', 'Weaving destiny itself',
       'Sage of aeons', 'Devouring fate', 'The universal eye opens', 'Weaving reality itself']
    ),
  },
  // PATH 11: Music — The Harmonic Path
  {
    id: 'harmonic', name: 'The Harmonic Path', subtitle: 'Sound Cultivation',
    action: 'cultivate', icon: '🎵', color: '#fb923c',
    unlockCondition: 'Find Harmonic Scripture + musical instrument',
    unlockCheck: (s: GameState) => s.inventory.some(i => i.id === 'harmonic_scripture') && s.inventory.some(i => i.id === 'musical_instrument') || (s.pathProgress['harmonic']?.unlocked ?? false),
    speedModifier: (s: GameState) => s.character.spiritRoot.qiMultiplier * 0.8,
    levels: makePathLevels(
      ['Tone-Caster', 'Rhythm-Locker', 'Resonance-Striker', 'Sonic-Shielding',
       'Emotional-Conductor', 'Vacuum-Scream', 'World-Song Lyricist', 'Shatter-Point Maestro',
       'Celestial Orchestrator', 'Echo-Eternal', 'Frequency-God', 'The Primordial Silence'],
      ['Casting tones of power', 'Locking into the rhythm', 'Striking with resonance', 'Shielding with sonic waves',
       'Conducting emotions', 'Screaming into the vacuum', 'Writing the world-song', 'Finding shatter points',
       'Orchestrating celestial music', 'Echoing through eternity', 'God of frequency', 'The silence before creation']
    ),
  },
  // PATH 12: Scholar-Sages — The Literary Path
  {
    id: 'scholar', name: 'The Literary Path', subtitle: 'Knowledge & Wisdom',
    action: 'study', icon: '📜', color: '#fbbf24',
    unlockCondition: 'Find Ancient Text',
    unlockCheck: (s: GameState) => s.inventory.some(i => i.id === 'ancient_text') || (s.pathProgress['scholar']?.unlocked ?? false),
    speedModifier: (s: GameState) => s.character.spiritRoot.qiMultiplier * 0.6 + 0.4,
    levels: makePathLevels(
      ['Ink-Dabbler', 'Verse-Caster', 'Scroll-Guardian', 'Calligraphy-Blade',
       'Historian\'s Weight', 'Manifest Truth', 'Edict-Bearer', 'World-Author',
       'Sovereign of Wisdom', 'Living Scripture', 'Truth-Defier', 'The Eternal Author'],
      ['Dabbling in mystical ink', 'Casting verses of power', 'Guarding ancient scrolls', 'Blade made of calligraphy',
       'The weight of history empowers you', 'Manifesting truth into reality', 'Bearing divine edicts', 'Authoring worlds',
       'Sovereign of all wisdom', 'Becoming a living scripture', 'Defying truth itself', 'The eternal author of existence']
    ),
  },
  // PATH 13: Bloodline — The Genetic Path
  {
    id: 'bloodline', name: 'The Genetic Path', subtitle: 'Bloodline Awakening',
    action: 'cultivate', icon: '🧬', color: '#e11d48',
    unlockCondition: 'Non-human Body Type OR find Bloodline Elixir',
    unlockCheck: (s: GameState) => s.character.bodyType.bodyMultiplier >= 1.5 || s.inventory.some(i => i.id === 'bloodline_elixir') || (s.pathProgress['bloodline']?.unlocked ?? false),
    speedModifier: (s: GameState) => s.character.bodyType.bodyMultiplier * 0.6,
    levels: makePathLevels(
      ['Dormant Spark', 'Pulse-Awakening', 'Ichor-Thickening', 'Partial-Shift',
       'Ancestral Visage', 'Blood-Memory', 'Total Metamorphosis', 'Genetic Domain',
       'Primarch Sovereign', 'Origin-Source', 'Galaxy-Span Blood', 'The Progenitor'],
      ['A dormant spark of bloodline power', 'Pulse of awakening', 'Blood thickens with ichor', 'Partial transformation begins',
       'Ancestral visage emerges', 'Memories of blood surface', 'Total metamorphosis achieved', 'Domain of genetics',
       'Sovereign primarch', 'Source of all origin', 'Blood spanning galaxies', 'The progenitor of all']
    ),
  },
  // PATH 14: Dream-Walkers — The Illusion Path
  {
    id: 'dream', name: 'The Illusion Path', subtitle: 'Dream Walking',
    action: 'sleep', icon: '🌙', color: '#7c3aed',
    unlockCondition: '"Lucid Dream" random event',
    unlockCheck: (s: GameState) => s.pathProgress['dream']?.unlocked ?? false,
    speedModifier: (s: GameState) => s.character.spiritRoot.qiMultiplier * 0.7,
    levels: makePathLevels(
      ['Sleep-Stalker', 'Fog-Weaver', 'Nightmare-Feeder', 'Phantasm-Realization',
       'Dream-Prisoner', 'The Silver-Veil', 'Collective Unconscious', 'Lucid-God',
       'Reality-Blur', 'Ethereal-Ego', 'World-Dreamer', 'The Great Awakener'],
      ['Stalking through sleep', 'Weaving fog into form', 'Feeding on nightmares', 'Realizing phantasms',
       'Imprisoned in a dream of power', 'Behind the silver veil', 'Tapping collective unconscious', 'God of lucid dreams',
       'Blurring the line of reality', 'An ethereal ego emerges', 'Dreaming worlds into existence', 'The great awakener']
    ),
  },
  // PATH 15: Necromancy — The Death Path
  {
    id: 'necromancy', name: 'The Death Path', subtitle: 'Necromancy & Spirits',
    action: 'cultivate', icon: '☠️', color: '#6b7280',
    unlockCondition: 'Visit Underworld OR find Necronomicon-type item',
    unlockCheck: (s: GameState) => s.discoveredRegions.some(r => REGIONS.find(reg => reg.id === r)?.realm === 'underworld') || s.inventory.some(i => i.id === 'book_of_the_dead') || (s.pathProgress['necromancy']?.unlocked ?? false),
    speedModifier: (s: GameState) => s.character.spiritRoot.qiMultiplier * 0.9,
    levels: makePathLevels(
      ['Bone-Whisperer', 'Soul-Tether', 'Grave-Miasma', 'Lich-Seed',
       'Underworld-Gatekeeper', 'Death-Knight Commander', 'Soul-Reaper', 'Plague-Lord',
       'Yama-Sovereign', 'Deathless-Will', 'Abyssal-Void', 'The Silent End'],
      ['Whispering to bones', 'Tethering wandering souls', 'Grave miasma surrounds you', 'A lich seed takes root',
       'Gatekeeper of the underworld', 'Commanding death knights', 'Reaping souls', 'Lord of plagues',
       'Sovereign of death', 'A will that defies death', 'The abyssal void within', 'The silent end of all things']
    ),
  },
];

// ========== REGIONS ==========
export const REGIONS: Region[] = [
  // MORTAL REALM
  { id: 'peaceful_village', name: 'Peaceful Village', description: 'A quiet village nestled in green hills. Few dangers lurk here.', realm: 'mortal', dangerLevel: 1, terrain: 'plains', hasShop: true, isCity: false, connections: ['forest_path', 'river_delta'], discovered: false, lootTable: [
    { itemId: 'common_herb', weight: 30, minDanger: 1 }, { itemId: 'iron_ore', weight: 15, minDanger: 1 }, { itemId: 'spirit_stone_pouch_small', weight: 5, minDanger: 1 },
  ], eventPool: ['traveler', 'herb_garden'] },
  { id: 'forest_path', name: 'Forest Path', description: 'A winding path through ancient woods. Beasts and treasures hide among the trees.', realm: 'mortal', dangerLevel: 2, terrain: 'forest', hasShop: false, isCity: false, connections: ['peaceful_village', 'mining_town', 'bandit_wastes', 'cursed_swamp'], discovered: false, lootTable: [
    { itemId: 'common_herb', weight: 25 , minDanger: 1 }, { itemId: 'uncommon_herb', weight: 10, minDanger: 2 }, { itemId: 'beast_fang', weight: 15, minDanger: 1 }, { itemId: 'basic_scripture', weight: 3, minDanger: 1 },
  ], eventPool: ['traveler', 'beast_encounter', 'herb_garden', 'strange_resonance'] },
  { id: 'river_delta', name: 'River Delta', description: 'Where the great river meets the sea. Fishermen and merchants gather here.', realm: 'mortal', dangerLevel: 1, terrain: 'water', hasShop: true, isCity: false, connections: ['peaceful_village', 'small_city', 'merchant_hub'], discovered: false, lootTable: [
    { itemId: 'common_herb', weight: 20, minDanger: 1 }, { itemId: 'spirit_stone_pouch_small', weight: 10, minDanger: 1 }, { itemId: 'fish_essence', weight: 15, minDanger: 1 },
  ], eventPool: ['traveler', 'merchant_cart'] },
  { id: 'mining_town', name: 'Mining Town', description: 'A rough settlement built around mineral-rich caves. Ore is plentiful.', realm: 'mortal', dangerLevel: 2, terrain: 'mountain', hasShop: true, isCity: false, connections: ['forest_path', 'mystic_mountain_base'], discovered: false, lootTable: [
    { itemId: 'iron_ore', weight: 35, minDanger: 1 }, { itemId: 'silver_ore', weight: 10, minDanger: 2 }, { itemId: 'spirit_stone_pouch_small', weight: 8, minDanger: 1 },
  ], eventPool: ['strange_resonance', 'traveler'] },
  { id: 'small_city', name: 'Skyreach City', description: 'A bustling city with markets, taverns, and a cultivation academy.', realm: 'mortal', dangerLevel: 1, terrain: 'city', hasShop: true, isCity: true, connections: ['river_delta', 'merchant_hub', 'bandit_wastes'], discovered: false, lootTable: [
    { itemId: 'spirit_stone_pouch_small', weight: 15, minDanger: 1 }, { itemId: 'basic_pill', weight: 8, minDanger: 1 },
  ], eventPool: ['traveler', 'merchant_cart'] },
  { id: 'bandit_wastes', name: 'Bandit Wastes', description: 'A lawless expanse where bandits and rogues roam. Danger and opportunity intertwine.', realm: 'mortal', dangerLevel: 3, terrain: 'wasteland', hasShop: false, isCity: false, connections: ['forest_path', 'small_city', 'cursed_swamp'], discovered: false, lootTable: [
    { itemId: 'iron_ore', weight: 15, minDanger: 1 }, { itemId: 'beast_fang', weight: 20, minDanger: 2 }, { itemId: 'bandit_loot', weight: 12, minDanger: 2 }, { itemId: 'uncommon_herb', weight: 8, minDanger: 2 },
  ], eventPool: ['beast_encounter', 'traveler', 'strange_resonance'] },
  { id: 'cursed_swamp', name: 'Cursed Swamp', description: 'A miasmic bog shrouded in dark energy. Only the desperate or foolish enter.', realm: 'mortal', dangerLevel: 4, terrain: 'swamp', hasShop: false, isCity: false, connections: ['forest_path', 'bandit_wastes', 'bone_fields'], discovered: false, lootTable: [
    { itemId: 'uncommon_herb', weight: 20, minDanger: 2 }, { itemId: 'rare_herb', weight: 5, minDanger: 3 }, { itemId: 'soul_fragment', weight: 3, minDanger: 3 }, { itemId: 'alchemy_manual', weight: 1, minDanger: 3 },
  ], eventPool: ['beast_encounter', 'strange_resonance', 'voice_offers_power'] },
  { id: 'mystic_mountain_base', name: 'Mystic Mountain Base', description: 'The foot of a sacred mountain. Sects and hermits train in the peaks above.', realm: 'mortal', dangerLevel: 3, terrain: 'mountain', hasShop: true, isCity: false, connections: ['mining_town', 'celestial_peaks'], discovered: false, lootTable: [
    { itemId: 'common_herb', weight: 20, minDanger: 1 }, { itemId: 'uncommon_herb', weight: 12, minDanger: 2 }, { itemId: 'basic_scripture', weight: 5, minDanger: 2 }, { itemId: 'formation_blueprint', weight: 1, minDanger: 3 },
  ], eventPool: ['traveler', 'herb_garden', 'dying_immortal'] },
  { id: 'merchant_hub', name: 'Golden Bazaar', description: 'The largest trading hub in the mortal realm. If it exists, it can be found here.', realm: 'mortal', dangerLevel: 1, terrain: 'city', hasShop: true, isCity: true, connections: ['river_delta', 'small_city', 'floating_islands'], discovered: false, lootTable: [
    { itemId: 'spirit_stone_pouch_small', weight: 20, minDanger: 1 }, { itemId: 'basic_pill', weight: 10, minDanger: 1 }, { itemId: 'basic_scripture', weight: 3, minDanger: 1 },
  ], eventPool: ['merchant_cart', 'traveler'] },
  { id: 'ancient_battlefield', name: 'Ancient Battlefield', description: 'Echoes of a long-forgotten war. Spiritual residue seeps from the soil.', realm: 'mortal', dangerLevel: 4, terrain: 'wasteland', hasShop: false, isCity: false, connections: ['bandit_wastes', 'lightning_plains'], discovered: false, lootTable: [
    { itemId: 'beast_fang', weight: 15, minDanger: 2 }, { itemId: 'soul_fragment', weight: 8, minDanger: 3 }, { itemId: 'ancient_text', weight: 2, minDanger: 3 }, { itemId: 'artificer_blueprint', weight: 1, minDanger: 4 },
  ], eventPool: ['beast_encounter', 'strange_resonance', 'dying_immortal'] },
  // HEAVEN REALM
  { id: 'floating_islands', name: 'Floating Islands', description: 'Islands suspended in the sky by ancient formations. The air is thick with Qi.', realm: 'heaven', dangerLevel: 5, terrain: 'sky', hasShop: false, isCity: false, connections: ['merchant_hub', 'celestial_peaks', 'spirit_beast_territory'], discovered: false, lootTable: [
    { itemId: 'rare_herb', weight: 20, minDanger: 4 }, { itemId: 'mithril_ore', weight: 15, minDanger: 5 }, { itemId: 'spirit_stone_pouch_large', weight: 10, minDanger: 5 },
  ], eventPool: ['beast_encounter', 'strange_resonance', 'secret_realm'] },
  { id: 'celestial_peaks', name: 'Celestial Peaks', description: 'Mountain peaks that pierce the clouds. Immortals once walked these paths.', realm: 'heaven', dangerLevel: 6, terrain: 'mountain', hasShop: true, isCity: false, connections: ['mystic_mountain_base', 'floating_islands', 'jade_palace_city'], discovered: false, lootTable: [
    { itemId: 'rare_herb', weight: 18, minDanger: 5 }, { itemId: 'epic_scripture', weight: 3, minDanger: 6 }, { itemId: 'spirit_stone_pouch_large', weight: 12, minDanger: 5 },
  ], eventPool: ['dying_immortal', 'strange_resonance', 'secret_realm'] },
  { id: 'spirit_beast_territory', name: 'Spirit Beast Territory', description: 'A vast wilderness ruled by powerful spirit beasts. Tamers seek their partners here.', realm: 'heaven', dangerLevel: 6, terrain: 'forest', hasShop: false, isCity: false, connections: ['floating_islands', 'ancient_sect_ruins'], discovered: false, lootTable: [
    { itemId: 'beast_fang', weight: 30, minDanger: 4 }, { itemId: 'rare_beast_core', weight: 8, minDanger: 5 }, { itemId: 'taming_bell', weight: 2, minDanger: 5 },
  ], eventPool: ['beast_encounter', 'beast_encounter', 'strange_resonance'] },
  { id: 'ancient_sect_ruins', name: 'Ancient Sect Ruins', description: 'The crumbling remains of a once-great sect. Treasures and traps await.', realm: 'heaven', dangerLevel: 7, terrain: 'ruins', hasShop: false, isCity: false, connections: ['spirit_beast_territory', 'starfall_lake'], discovered: false, lootTable: [
    { itemId: 'epic_scripture', weight: 5, minDanger: 6 }, { itemId: 'formation_blueprint', weight: 8, minDanger: 6 }, { itemId: 'ancient_text', weight: 5, minDanger: 6 }, { itemId: 'legendary_treasure', weight: 1, minDanger: 7 },
  ], eventPool: ['strange_resonance', 'secret_realm', 'dying_immortal'] },
  { id: 'lightning_plains', name: 'Lightning Plains', description: 'Endless plains struck by perpetual lightning. Tribulation energy saturates everything.', realm: 'heaven', dangerLevel: 7, terrain: 'plains', hasShop: false, isCity: false, connections: ['ancient_battlefield', 'starfall_lake'], discovered: false, lootTable: [
    { itemId: 'lightning_essence', weight: 20, minDanger: 6 }, { itemId: 'rare_herb', weight: 12, minDanger: 5 }, { itemId: 'tribulation_stone', weight: 3, minDanger: 7 },
  ], eventPool: ['beast_encounter', 'strange_resonance'] },
  { id: 'starfall_lake', name: 'Starfall Lake', description: 'A serene lake where fallen stars rest beneath the surface. Immense power lies dormant.', realm: 'heaven', dangerLevel: 8, terrain: 'water', hasShop: false, isCity: false, connections: ['ancient_sect_ruins', 'lightning_plains', 'jade_palace_city'], discovered: false, lootTable: [
    { itemId: 'star_fragment', weight: 10, minDanger: 7 }, { itemId: 'epic_scripture', weight: 4, minDanger: 7 }, { itemId: 'legendary_treasure', weight: 1, minDanger: 8 },
  ], eventPool: ['strange_resonance', 'secret_realm', 'stars_align'] },
  { id: 'jade_palace_city', name: 'Jade Palace City', description: 'The greatest city in the Heaven Realm. Transcendent cultivators gather here.', realm: 'heaven', dangerLevel: 5, terrain: 'city', hasShop: true, isCity: true, connections: ['celestial_peaks', 'starfall_lake'], discovered: false, lootTable: [
    { itemId: 'spirit_stone_pouch_large', weight: 15, minDanger: 5 }, { itemId: 'epic_pill', weight: 5, minDanger: 5 },
  ], eventPool: ['merchant_cart', 'traveler'] },
  // UNDERWORLD
  { id: 'bone_fields', name: 'Bone Fields', description: 'Endless plains of ancient bones. Death Qi permeates everything.', realm: 'underworld', dangerLevel: 5, terrain: 'wasteland', hasShop: false, isCity: false, connections: ['cursed_swamp', 'river_of_souls', 'ghost_city'], discovered: false, lootTable: [
    { itemId: 'soul_fragment', weight: 25, minDanger: 4 }, { itemId: 'bone_dust', weight: 20, minDanger: 4 }, { itemId: 'book_of_the_dead', weight: 1, minDanger: 5 },
  ], eventPool: ['beast_encounter', 'strange_resonance', 'voice_offers_power'] },
  { id: 'river_of_souls', name: 'River of Souls', description: 'A ghostly river carrying the memories of the dead. Drinking grants visions.', realm: 'underworld', dangerLevel: 7, terrain: 'water', hasShop: false, isCity: false, connections: ['bone_fields', 'yamas_court'], discovered: false, lootTable: [
    { itemId: 'soul_fragment', weight: 30, minDanger: 5 }, { itemId: 'memory_crystal', weight: 8, minDanger: 6 }, { itemId: 'divination_manual', weight: 2, minDanger: 6 },
  ], eventPool: ['strange_resonance', 'voice_offers_power'] },
  { id: 'yamas_court', name: "Yama's Court", description: 'The court of the death god. Judgment and power intertwine.', realm: 'underworld', dangerLevel: 10, terrain: 'ruins', hasShop: true, isCity: true, connections: ['river_of_souls', 'abyssal_chasm'], discovered: false, lootTable: [
    { itemId: 'soul_fragment', weight: 20, minDanger: 7 }, { itemId: 'legendary_treasure', weight: 3, minDanger: 9 }, { itemId: 'dimensional_ring', weight: 1, minDanger: 10 },
  ], eventPool: ['voice_offers_power', 'dying_immortal'] },
  { id: 'abyssal_chasm', name: 'Abyssal Chasm', description: 'A bottomless chasm at the heart of the underworld. Few return.', realm: 'underworld', dangerLevel: 12, terrain: 'void', hasShop: false, isCity: false, connections: ['yamas_court'], discovered: false, lootTable: [
    { itemId: 'mythic_treasure', weight: 1, minDanger: 11 }, { itemId: 'legendary_treasure', weight: 3, minDanger: 10 }, { itemId: 'void_essence', weight: 10, minDanger: 10 },
  ], eventPool: ['voice_offers_power', 'secret_realm'] },
  { id: 'ghost_city', name: 'Ghost City', description: 'A spectral metropolis of the dead. Ghostly merchants sell forbidden wares.', realm: 'underworld', dangerLevel: 6, terrain: 'city', hasShop: true, isCity: true, connections: ['bone_fields', 'netherworld_market'], discovered: false, lootTable: [
    { itemId: 'soul_fragment', weight: 20, minDanger: 5 }, { itemId: 'spirit_stone_pouch_large', weight: 10, minDanger: 5 },
  ], eventPool: ['merchant_cart', 'voice_offers_power'] },
  { id: 'netherworld_market', name: 'Netherworld Market', description: 'A black market where anything can be traded — for the right price.', realm: 'underworld', dangerLevel: 6, terrain: 'city', hasShop: true, isCity: true, connections: ['ghost_city', 'river_of_souls'], discovered: false, lootTable: [
    { itemId: 'spirit_stone_pouch_large', weight: 15, minDanger: 5 }, { itemId: 'bloodline_elixir', weight: 1, minDanger: 6 },
  ], eventPool: ['merchant_cart'] },
];

// ========== ITEMS DATABASE ==========
export const ITEMS: Record<string, Item> = {
  // Materials
  common_herb: { id: 'common_herb', name: 'Common Spirit Herb', category: 'material', rarity: 'common', description: 'A basic herb with faint spiritual energy.', effects: {}, sellValue: 2, stackable: true },
  uncommon_herb: { id: 'uncommon_herb', name: 'Jade-Root Herb', category: 'material', rarity: 'uncommon', description: 'A herb with moderate spiritual energy. Used in alchemy.', effects: {}, sellValue: 8, stackable: true },
  rare_herb: { id: 'rare_herb', name: 'Thousand-Year Ginseng', category: 'material', rarity: 'rare', description: 'An ancient herb brimming with spiritual energy.', effects: {}, sellValue: 50, stackable: true },
  iron_ore: { id: 'iron_ore', name: 'Iron Ore', category: 'material', rarity: 'common', description: 'Basic metal ore.', effects: {}, sellValue: 1, stackable: true },
  silver_ore: { id: 'silver_ore', name: 'Silver Spirit Ore', category: 'material', rarity: 'uncommon', description: 'Ore infused with spiritual energy.', effects: {}, sellValue: 10, stackable: true },
  mithril_ore: { id: 'mithril_ore', name: 'Mithril Ore', category: 'material', rarity: 'rare', description: 'Legendary metal from the Heaven Realm.', effects: {}, sellValue: 100, stackable: true },
  beast_fang: { id: 'beast_fang', name: 'Beast Fang', category: 'material', rarity: 'common', description: 'A fang from a spirit beast.', effects: {}, sellValue: 3, stackable: true },
  rare_beast_core: { id: 'rare_beast_core', name: 'Spirit Beast Core', category: 'material', rarity: 'rare', description: 'The crystallized essence of a powerful spirit beast.', effects: {}, sellValue: 80, stackable: true },
  fish_essence: { id: 'fish_essence', name: 'Fish Essence', category: 'material', rarity: 'common', description: 'Essence from spiritual fish.', effects: {}, sellValue: 2, stackable: true },
  bandit_loot: { id: 'bandit_loot', name: 'Bandit\'s Plunder', category: 'material', rarity: 'uncommon', description: 'Stolen goods recovered from bandits.', effects: {}, sellValue: 15, stackable: true },
  soul_fragment: { id: 'soul_fragment', name: 'Soul Fragment', category: 'material', rarity: 'rare', description: 'A fragment of a departed soul. Used in dark arts.', effects: {}, sellValue: 30, stackable: true },
  bone_dust: { id: 'bone_dust', name: 'Ancient Bone Dust', category: 'material', rarity: 'uncommon', description: 'Dust from ancient bones. Death Qi emanates from it.', effects: {}, sellValue: 12, stackable: true },
  memory_crystal: { id: 'memory_crystal', name: 'Memory Crystal', category: 'material', rarity: 'epic', description: 'A crystal containing memories of the dead.', effects: {}, sellValue: 200, stackable: true },
  lightning_essence: { id: 'lightning_essence', name: 'Lightning Essence', category: 'material', rarity: 'rare', description: 'Captured essence of tribulation lightning.', effects: {}, sellValue: 60, stackable: true },
  star_fragment: { id: 'star_fragment', name: 'Star Fragment', category: 'material', rarity: 'epic', description: 'A fragment of a fallen star. Immense power within.', effects: {}, sellValue: 300, stackable: true },
  void_essence: { id: 'void_essence', name: 'Void Essence', category: 'material', rarity: 'legendary', description: 'The essence of the void itself.', effects: {}, sellValue: 1000, stackable: true },

  // Spirit Stone Pouches
  spirit_stone_pouch_small: { id: 'spirit_stone_pouch_small', name: 'Small Spirit Stone Pouch', category: 'material', rarity: 'common', description: 'Contains 5-15 Spirit Stones.', effects: {}, sellValue: 0, stackable: true },
  spirit_stone_pouch_large: { id: 'spirit_stone_pouch_large', name: 'Large Spirit Stone Pouch', category: 'material', rarity: 'uncommon', description: 'Contains 30-80 Spirit Stones.', effects: {}, sellValue: 0, stackable: true },

  // Pills
  basic_pill: { id: 'basic_pill', name: 'Qi Gathering Pill', category: 'pill', rarity: 'common', description: 'A basic pill that temporarily boosts cultivation speed.', effects: { xpMultiplier: 1.5, xpMultiplierDuration: 300 }, sellValue: 10, stackable: true },
  breakthrough_pill: { id: 'breakthrough_pill', name: 'Breakthrough Pill', category: 'pill', rarity: 'uncommon', description: 'Increases breakthrough success rate by 5%.', effects: { breakthroughBonus: 0.05 }, sellValue: 25, stackable: true },
  deviation_cure: { id: 'deviation_cure', name: 'Mind-Clearing Pill', category: 'pill', rarity: 'uncommon', description: 'Cures Qi Deviation immediately.', effects: { healQiDeviation: true }, sellValue: 30, stackable: true },
  epic_pill: { id: 'epic_pill', name: 'Heaven-Grade Spirit Pill', category: 'pill', rarity: 'epic', description: 'Powerful pill that greatly boosts cultivation.', effects: { xpMultiplier: 3.0, xpMultiplierDuration: 600 }, sellValue: 200, stackable: true },
  tribulation_pill: { id: 'tribulation_pill', name: 'Tribulation Resistance Pill', category: 'pill', rarity: 'rare', description: 'Boosts tribulation HP by 30%.', effects: { tribulationHpBonus: 0.30 }, sellValue: 80, stackable: true },

  // Scriptures
  basic_scripture: { id: 'basic_scripture', name: 'Basic Qi Gathering Manual', category: 'scripture', rarity: 'common', description: 'A simple cultivation method. Opens the path of the spirit.', effects: { xpMultiplier: 1.1 }, sellValue: 15, stackable: false },
  epic_scripture: { id: 'epic_scripture', name: 'Celestial Dragon Scripture', category: 'scripture', rarity: 'epic', description: 'A powerful cultivation method left by an ancient dragon.', effects: { xpMultiplier: 1.8 }, sellValue: 500, stackable: false },

  // Special unlock items
  alchemy_manual: { id: 'alchemy_manual', name: 'Beginner\'s Alchemy Manual', category: 'scripture', rarity: 'uncommon', description: 'A manual detailing the fundamentals of pill refinement.', effects: {}, sellValue: 20, stackable: false },
  formation_blueprint: { id: 'formation_blueprint', name: 'Basic Formation Blueprint', category: 'scripture', rarity: 'uncommon', description: 'Blueprints for simple spiritual formations.', effects: {}, sellValue: 20, stackable: false },
  artificer_blueprint: { id: 'artificer_blueprint', name: 'Artificer\'s Handbook', category: 'scripture', rarity: 'rare', description: 'A handbook on building spiritual constructs.', effects: {}, sellValue: 50, stackable: false },
  ancient_text: { id: 'ancient_text', name: 'Ancient Scholarly Text', category: 'scripture', rarity: 'rare', description: 'A text from a bygone era, full of wisdom.', effects: {}, sellValue: 50, stackable: false },
  divination_manual: { id: 'divination_manual', name: 'Oracle\'s Divination Manual', category: 'scripture', rarity: 'rare', description: 'A manual on reading the threads of fate.', effects: {}, sellValue: 50, stackable: false },
  harmonic_scripture: { id: 'harmonic_scripture', name: 'Harmonic Scripture', category: 'scripture', rarity: 'rare', description: 'A scripture that teaches cultivation through music.', effects: {}, sellValue: 50, stackable: false },
  musical_instrument: { id: 'musical_instrument', name: 'Spirit Guqin', category: 'treasure', rarity: 'rare', description: 'A stringed instrument that resonates with Qi.', effects: {}, sellValue: 60, stackable: false },
  bloodline_elixir: { id: 'bloodline_elixir', name: 'Bloodline Awakening Elixir', category: 'pill', rarity: 'epic', description: 'An elixir that awakens dormant bloodline power.', effects: {}, sellValue: 300, stackable: false },
  book_of_the_dead: { id: 'book_of_the_dead', name: 'Book of the Dead', category: 'scripture', rarity: 'epic', description: 'A forbidden text detailing the arts of necromancy.', effects: {}, sellValue: 400, stackable: false },
  taming_bell: { id: 'taming_bell', name: 'Soul-Binding Bell', category: 'treasure', rarity: 'rare', description: 'A bell used to form contracts with spirit beasts.', effects: {}, sellValue: 70, stackable: false },
  tribulation_stone: { id: 'tribulation_stone', name: 'Tribulation Stone', category: 'material', rarity: 'rare', description: 'A stone forged by tribulation lightning.', effects: { tribulationHpBonus: 0.20 }, sellValue: 75, stackable: true },

  // Special Items
  dimensional_ring: { id: 'dimensional_ring', name: 'Dimensional Ring', category: 'special', rarity: 'legendary', description: 'A spatial ring that preserves its contents through death and rebirth.', effects: { preserveInventory: true }, sellValue: 0, stackable: false },
  fate_anchor: { id: 'fate_anchor', name: 'Fate Anchor', category: 'special', rarity: 'legendary', description: 'Preserves your Spirit Root, Body Type, and Luck through rebirth.', effects: { preserveRolls: true }, sellValue: 0, stackable: false },
  legendary_treasure: { id: 'legendary_treasure', name: 'Ancient Immortal\'s Relic', category: 'treasure', rarity: 'legendary', description: 'A relic of immense power left by a fallen immortal.', effects: { xpMultiplier: 2.0 }, sellValue: 2000, stackable: false },
  mythic_treasure: { id: 'mythic_treasure', name: 'Primordial Origin Stone', category: 'treasure', rarity: 'mythic', description: 'A stone from before creation itself. Its power is incomprehensible.', effects: { xpMultiplier: 5.0 }, sellValue: 10000, stackable: false },
};

// ========== EVENTS ==========
export const GAME_EVENTS: GameEvent[] = [
  {
    id: 'traveler', title: 'Fellow Traveler',
    description: 'A fellow traveler asks for directions to the nearest town.',
    choices: [
      { text: 'Help them (+2 Karma, +5 💎)', karmaChange: 2, rewards: { spiritStones: 5 }, losses: {} },
      { text: 'Ignore them', karmaChange: 0, rewards: {}, losses: {} },
      { text: 'Rob them (-5 Karma, +20 💎)', karmaChange: -5, rewards: { spiritStones: 20 }, losses: {} },
    ],
  },
  {
    id: 'herb_garden', title: 'Wild Herb Garden',
    description: 'You stumble upon a patch of wild spiritual herbs growing in a hidden glade.',
    choices: [
      { text: 'Gather herbs carefully', karmaChange: 0, rewards: { items: ['common_herb', 'common_herb'] }, losses: {} },
      { text: 'Search for rare specimens', karmaChange: 0, rewards: { items: ['uncommon_herb'] }, losses: {} },
    ],
  },
  {
    id: 'beast_encounter', title: 'Beast Blocks the Path!',
    description: 'A fierce spirit beast blocks your way, snarling with hostility.',
    choices: [
      { text: '⚔️ Fight!', karmaChange: 0, rewards: { spiritStones: 10, items: ['beast_fang'] }, losses: {} },
      { text: '🏃 Flee!', karmaChange: 0, rewards: {}, losses: { timePenalty: 30 } },
    ],
  },
  {
    id: 'merchant_cart', title: 'Broken Merchant Cart',
    description: 'A merchant\'s cart has broken down on the road. They look desperate.',
    choices: [
      { text: 'Help repair it (+3 Karma, shop access)', karmaChange: 3, rewards: { spiritStones: 10 }, losses: {} },
      { text: 'Loot the cart (-10 Karma)', karmaChange: -10, rewards: { spiritStones: 40, items: ['uncommon_herb'] }, losses: {} },
    ],
  },
  {
    id: 'strange_resonance', title: 'Strange Resonance',
    description: 'You feel a strange vibration underground. Something calls to you.',
    choices: [
      { text: 'Investigate carefully', karmaChange: 0, rewards: { spiritStones: 20, items: ['iron_ore'] }, losses: {} },
      { text: 'Leave it alone', karmaChange: 0, rewards: {}, losses: {} },
    ],
  },
  // Fated Encounters
  {
    id: 'dying_immortal', title: '✨ Dying Immortal\'s Legacy',
    description: 'A dying immortal appears before you, offering their life\'s cultivation technique!',
    isFated: true,
    choices: [
      { text: 'Accept the technique reverently (+10 Karma)', karmaChange: 10, rewards: { items: ['epic_scripture'], spiritStones: 100 }, losses: {} },
    ],
  },
  {
    id: 'secret_realm', title: '✨ Secret Realm Entrance',
    description: 'You discover a hidden entrance to an ancient secret realm!',
    isFated: true,
    choices: [
      { text: 'Enter and explore', karmaChange: 0, rewards: { spiritStones: 200, items: ['legendary_treasure'] }, losses: {} },
    ],
  },
  {
    id: 'voice_offers_power', title: '💀 Voice in the Darkness',
    description: 'A sinister voice echoes: "I can grant you power beyond imagination... for a price."',
    isFated: true,
    choices: [
      { text: 'Accept the power (-200 Karma)', karmaChange: -200, rewards: { spiritStones: 500 }, losses: {} },
      { text: 'Refuse (+50 Karma)', karmaChange: 50, rewards: { spiritStones: 25 }, losses: {} },
    ],
  },
  {
    id: 'stars_align', title: '✨ Stars Align',
    description: 'The stars align and cosmic energy floods your meridians! Your spiritual root trembles...',
    isFated: true,
    choices: [
      { text: 'Embrace the cosmic energy', karmaChange: 0, rewards: { spiritStones: 150 }, losses: {} },
    ],
  },
];

// ========== SHOP INVENTORIES ==========
export const SHOP_ITEMS_BY_REALM: Record<string, string[]> = {
  mortal: ['basic_pill', 'breakthrough_pill', 'deviation_cure', 'basic_scripture', 'common_herb', 'iron_ore'],
  heaven: ['epic_pill', 'tribulation_pill', 'breakthrough_pill', 'deviation_cure', 'epic_scripture', 'rare_herb'],
  underworld: ['deviation_cure', 'soul_fragment', 'bone_dust', 'tribulation_pill'],
};

export const SHOP_PRICE_MULTIPLIER: Record<string, number> = {
  mortal: 1, heaven: 3, underworld: 2,
};

// ========== GROUPS ==========
export const GROUPS: import('./types').Group[] = [
  {
    id: 'azure_cloud_sect', name: 'Azure Cloud Sect', type: 'sect',
    karmaRequirement: { min: 0, max: 1000 }, description: 'An orthodox sect focused on righteous cultivation.',
    location: 'mystic_mountain_base', contributionPoints: 0,
    missions: [
      { id: 'patrol_1', name: 'Mountain Patrol', description: 'Patrol the mountain for intruders.', helpOption: { reward: 20, karmaChange: 3, description: 'Help escort lost travelers (+3 Karma)' }, exploitOption: { reward: 40, karmaChange: -5, description: 'Shake down travelers for tolls (-5 Karma)' }, duration: 300, completed: false },
      { id: 'herb_gather', name: 'Herb Gathering Mission', description: 'Gather herbs for the sect\'s alchemists.', helpOption: { reward: 15, karmaChange: 1, description: 'Deliver fairly (+1 Karma)' }, exploitOption: { reward: 30, karmaChange: -3, description: 'Skim some for yourself (-3 Karma)' }, duration: 180, completed: false },
    ],
  },
  {
    id: 'blood_lotus_cult', name: 'Blood Lotus Cult', type: 'cult',
    karmaRequirement: { min: -1000, max: -50 }, description: 'A dark cult practicing forbidden blood arts.',
    location: 'cursed_swamp', contributionPoints: 0,
    missions: [
      { id: 'sacrifice_1', name: 'Blood Offering', description: 'Perform a dark ritual.', helpOption: { reward: 30, karmaChange: -10, description: 'Perform the ritual (-10 Karma)' }, exploitOption: { reward: 60, karmaChange: -25, description: 'Use extra sacrifices for power (-25 Karma)' }, duration: 300, completed: false },
    ],
  },
  {
    id: 'jade_merchant_assoc', name: 'Jade Merchant Association', type: 'association',
    karmaRequirement: { min: -500, max: 1000 }, description: 'A merchant guild offering trade bonuses.',
    location: 'merchant_hub', contributionPoints: 0,
    missions: [
      { id: 'trade_1', name: 'Trade Route Guard', description: 'Guard a merchant caravan.', helpOption: { reward: 25, karmaChange: 2, description: 'Protect honestly (+2 Karma)' }, exploitOption: { reward: 50, karmaChange: -8, description: 'Steal from the cargo (-8 Karma)' }, duration: 240, completed: false },
    ],
  },
];

// ========== RARITY COLORS ==========
export const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#a78bfa',
  legendary: '#fbbf24',
  mythic: '#ef4444',
};

// ========== LUCK DESCRIPTORS ==========
export const LUCK_DESCRIPTORS: { max: number; label: string }[] = [
  { max: 0.2, label: 'Abysmal' },
  { max: 0.35, label: 'Terrible' },
  { max: 0.5, label: 'Poor' },
  { max: 0.65, label: 'Average' },
  { max: 0.8, label: 'Good' },
  { max: 0.9, label: 'Excellent' },
  { max: 1.0, label: 'Heaven-Blessed' },
];

export function getLuckDescriptor(luck: number): string {
  for (const d of LUCK_DESCRIPTORS) {
    if (luck <= d.max) return d.label;
  }
  return 'Unknown';
}

// ========== KARMA LABELS ==========
export function getKarmaLabel(karma: number): { label: string; color: string } {
  if (karma >= 500) return { label: 'Saint', color: '#fbbf24' };
  if (karma >= 100) return { label: 'Righteous', color: '#4ade80' };
  if (karma > -100) return { label: 'Neutral', color: '#9ca3af' };
  if (karma > -500) return { label: 'Wicked', color: '#f97316' };
  return { label: 'Abomination', color: '#ef4444' };
}
