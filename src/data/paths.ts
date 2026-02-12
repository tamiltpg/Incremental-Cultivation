/**
 * Path definitions for Incremental Cultivation: The Grand Dao
 * All 15 paths with their 12 levels, tiers, and flavor text.
 */

import type { PathLevel } from './types';

// ========== HELPER ==========
function getTierForLevel(level: number): 1 | 2 | 3 {
  if (level <= 4) return 1;
  if (level <= 8) return 2;
  return 3;
}

function getTierName(tier: number): string {
  switch (tier) {
    case 1: return 'Mortal';
    case 2: return 'Transcendent';
    case 3: return 'Divine';
    default: return 'Unknown';
  }
}

function makePathLevels(names: string[], flavors: string[]): PathLevel[] {
  return names.map((name, i) => ({
    level: i + 1,
    tier: getTierForLevel(i + 1),
    tierName: getTierName(getTierForLevel(i + 1)),
    name,
    flavor: flavors[i] || '',
  }));
}

// ========== PATH 1: Cultivation — Path of the Spirit ==========
export const PATH_1_LEVELS: PathLevel[] = makePathLevels(
  [
    'Qi Condensation',
    'Foundation Establishment',
    'Golden Core',
    'Nascent Soul',
    'Spirit Transformation',
    'Void Refinement',
    'Dao Domain',
    'Tribulation Transcendence',
    'Empyrean Sovereign',
    'Eternal Ascendant',
    'Cosmic Singularity',
    'Zenith Origin',
  ],
  [
    'Gathering energy into meridians — the first breath of Qi',
    'Building a Spirit Sea — a foundation for eternity',
    'Solidifying energy into an internal sun',
    'Birthing your spiritual Self — a soul within a soul',
    'Merging soul with senses — perceiving the unseen',
    'Mastering the space between spaces',
    'Your personal laws override the physics of this world',
    "Surmounting Heaven's Trial — lightning dances at your call",
    'Commanding the stars themselves to bow',
    'Existing outside the flow of Time',
    'Your internal world becomes a universe unto itself',
    'Reaching the source of all existence — the Origin',
  ]
);

// ========== PATH 2: Martial Arts — Path of the Carnal ==========
export const PATH_2_LEVELS: PathLevel[] = makePathLevels(
  [
    'Skin Refinement',
    'Bone Tempering',
    'Organ Forging',
    'Blood Transmutation',
    'Marrow Sanctification',
    'Sovereign Physique',
    'Vajra Transcendence',
    'Aura Incarnation',
    'Star-Crushing Might',
    'Nirvana Flesh',
    'World-Pillar Form',
    'Primordial Titan',
  ],
  [
    'Iron Husk — hardening the outer shell against the world',
    'Jade Frame — reinforcing every bone to unbreakable',
    'Inner Furnace — tempering vital organs in spiritual fire',
    'Ichor — blood becomes liquid power, veins glow with strength',
    'Sacred marrow awakens — the deepest transformation begins',
    'Body transcends mortal limits — sovereign among flesh',
    'Diamond body achieved — nothing can pierce your form',
    'Your aura takes physical form — visible to all',
    'Strength sufficient to shatter celestial bodies',
    'Flesh reborn through the fires of destruction',
    'Your body becomes a pillar supporting the world',
    'The ultimate physical form — a Primordial Titan walks again',
  ]
);

// ========== PATH 3: Rogue Cultivator — The Wild Path ==========
export const PATH_3_LEVELS: PathLevel[] = makePathLevels(
  [
    'Qi-Gatherer', 'Sea-Builder', 'Core-Loomer', 'Soul-Shatterer',
    'Spirit-Walker', 'Rift-Runner', 'Domain-Master', 'Fate-Survivor',
    'Sky-Ruler', 'Time-Drifter', 'Star-Born', 'Boundless',
  ],
  [
    'Scraping Qi from the world with bare will',
    'Constructing a makeshift spiritual sea',
    'A rough but undeniably powerful core forms',
    'Shattering your own limits through sheer will',
    'Walking between worlds without permission',
    'Running through dimensional rifts — untamed, unchained',
    'Mastering a wild, untamed domain',
    'Surviving against all odds — fate bows to the rogue',
    'Ruling the open sky — no sect, no master, no limit',
    'Drifting through time itself — a wanderer eternal',
    'Born among the stars — beyond mortal reckoning',
    'Without limit or boundary — truly Boundless',
  ]
);

// ========== PATH 4: Devil Cultivator — Soul Corruption ==========
export const PATH_4_LEVELS: PathLevel[] = makePathLevels(
  [
    'Malice Gathering', 'Blood-Sea Foundation', 'Black Core', 'Vile Infant',
    'Demon-Soul Aspect', 'Abyssal Anchor', 'Hell-Realm Domain', 'Calamity Ascension',
    'Arch-Devil King', 'Sorrow Eternal', 'Void Eater', 'Primordial Nightmare',
  ],
  [
    'Gathering malice from the suffering of others',
    'A sea of blood forms within your spirit',
    'Your core blackens with forbidden corruption',
    'A vile soul infant takes shape — twisted and powerful',
    'The demon soul emerges, hungering for more',
    'Anchored to the abyss — drawing power from below',
    'A personal hell realm manifests around you',
    'Ascending through calamity — thriving in destruction',
    'Ruling as an Arch-Devil King — feared by all',
    'Eternal sorrow given terrible, beautiful form',
    'Devouring the void itself — consuming nothingness',
    'The ultimate nightmare made real — primordial terror',
  ]
);

// ========== PATH 5: Devil Practitioner — Body Corruption ==========
export const PATH_5_LEVELS: PathLevel[] = makePathLevels(
  [
    'Rotten Skin', 'Obscene Bone', 'Corrupted Vitals', 'Demon-Blood Surge',
    'Monstrous Metamorphosis', 'Abyssal Shell', 'Unholy Titan', 'Carnal Desecration',
    'World-Ender Physique', 'Indestructible Fiend', 'Chaos Avatar', 'The End-Bringer',
  ],
  [
    'Skin rots and reforms stronger — pain becomes power',
    'Bones twist into obscene, terrible shapes',
    'Organs corrupted with dark power — vitals hum with malice',
    'Demon blood surges through your veins like black fire',
    'Body transforms monstrously — beauty abandoned for might',
    'An abyssal shell encases you — impenetrable darkness',
    'An unholy titan rises — flesh and corruption united',
    'Flesh desecrated beyond mortal recognition',
    'A physique that threatens to end worlds',
    'Truly indestructible — death itself cannot claim you',
    'Avatar of pure, seething chaos',
    'The one who brings the end of all things',
  ]
);

// ========== PATH 6-15: Already defined in constants.ts ==========
// These are exported from constants.ts via the PATHS array.
// This file serves as the detailed path data reference.

export const ALL_PATH_LEVEL_DATA = {
  spirit: PATH_1_LEVELS,
  martial: PATH_2_LEVELS,
  rogue: PATH_3_LEVELS,
  devil_soul: PATH_4_LEVELS,
  devil_body: PATH_5_LEVELS,
};
