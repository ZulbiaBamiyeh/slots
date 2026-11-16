// Cherry Djinn — all game content as data.
// Text markup: [c]coins[] [m]mult[] [g]gold[] [k]keyword[] [x]bad[] [v]curse[]

export const FAMILIES = {
  fruit:    { name: 'Fruit',    col: '#E0303A' },
  garden:   { name: 'Garden',   col: '#3FBF5A' },
  creature: { name: 'Creature', col: '#F2A93B' },
  treasure: { name: 'Treasure', col: '#7FA8FF' },
  magic:    { name: 'Magic',    col: '#B98CFF' },
  curse:    { name: 'Curse',    col: '#8A4FD8' },
  relic:    { name: 'Cursed Relic', col: '#FF4A6A' },
};
export const LINE_FAMS = ['fruit', 'garden', 'creature', 'treasure', 'magic'];

export const RARITY = {
  C: { name: 'Common',    col: '#B4BCCB', sym: 2, charm: 4 },
  U: { name: 'Uncommon',  col: '#3FBF5A', sym: 3, charm: 6 },
  R: { name: 'Rare',      col: '#7FA8FF', sym: 5, charm: 8 },
  L: { name: 'Legendary', col: '#F2A93B', sym: 8, charm: 12 },
};

const S = (id, name, fam, col, rar, coins, desc, fx = {}) => ({ id, name, fam, col: col.split(' '), rar, coins, desc, tags: [], ...fx });

export const SYMBOLS = [
  // ---- Fruit
  S('cherry', 'Cherry', 'fruit', 'red', 'C', 2, '[c]+2[] per touching [k]Cherry[].', { adj: { m: 'id:cherry', v: 2 } }),
  S('banana', 'Banana', 'fruit', 'yellow', 'C', 2, '[c]+1[] per other [k]Banana[] on the board.', { brd: { m: 'id:banana', v: 1 } }),
  S('lemon', 'Lemon', 'fruit', 'yellow', 'C', 1, 'Touching [k]fruit[] [c]+1[].', { aura: { m: 'fam:fruit', v: 1 } }),
  S('fig', 'Fig', 'fruit', 'purple', 'C', 4, 'Plump and dependable.'),
  S('date', 'Date', 'fruit', 'brown', 'C', 2, '[c]+6[] when touching a [k]Palm Tree[].', { sadd: { m: 'id:palm', v: 6 } }),
  S('grapes', 'Grapes', 'fruit', 'purple', 'U', 3, '[m]+1 Mult[] when part of a [k]line[].', { lineMult: 1 }),
  S('peach', 'Peach', 'fruit', 'pink', 'U', 3, '[c]+2[] per touching [k]red[] or [k]pink[] symbol.', { adj: { m: ['col:red', 'col:pink'], v: 2 } }),
  S('coconut', 'Coconut', 'fruit', 'brown', 'U', 1, 'Cracked by a touching [k]Monkey[] or [k]Elephant[] for [c]+15[].'),
  S('watermelon', 'Watermelon', 'fruit', 'green red', 'R', 10, 'A whole lot of fruit.'),
  S('dragonfruit', 'Dragonfruit', 'fruit', 'pink', 'R', 4, '[m]+1 Mult[] per different [k]fruit[] touching it.'),
  S('goldenapple', 'Golden Apple', 'fruit', 'gold', 'L', 8, 'Touching [k]fruit[] score [c]x2 coins[].', { amul: { m: 'fam:fruit', k: 2 } }),
  // ---- Garden
  S('leaf', 'Leaf', 'garden', 'green', 'C', 1, 'Touching [k]fruit[] [c]+2[].', { aura: { m: 'fam:fruit', v: 2 } }),
  S('seed', 'Seed', 'garden', 'green', 'C', 0, 'Grows [c]+1[] forever each time it lands. [c]+3[] if touching [k]water[].'),
  S('rose', 'Rose', 'garden', 'pink red', 'C', 3, '[c]+4[] when touching a [k]Peach[] or [k]Bee[].', { sadd: { m: ['id:peach', 'id:bee'], v: 4 }, tags: ['flower'] }),
  S('wateringcan', 'Watering Can', 'garden', 'blue', 'U', 1, '[k]Water[]. Touching [k]garden[] symbols grow [c]+1[] forever.', { tags: ['water'] }),
  S('palm', 'Palm Tree', 'garden', 'green', 'U', 3, '[c]+3[] per [k]Coconut[] or [k]Date[] on the board.', { brd: { m: ['id:coconut', 'id:date'], v: 3 } }),
  S('lotus', 'Lotus', 'garden', 'pink', 'U', 3, '[m]+2 Mult[] when touching [k]water[].', { tags: ['flower'] }),
  S('honey', 'Honey', 'garden', 'gold', 'U', 3, 'Touching [k]fruit[] [c]+3[].', { aura: { m: 'fam:fruit', v: 3 } }),
  S('oasis', 'Oasis', 'garden', 'blue', 'R', 4, '[k]Water[]. Touching [k]garden[] and [k]creatures[] score [c]x2 coins[].', { amul: { m: ['fam:garden', 'fam:creature'], k: 2 }, tags: ['water'] }),
  // ---- Creatures
  S('monkey', 'Monkey', 'creature', 'brown', 'C', 2, 'Eats touching [k]Bananas[] for [c]+6[] each. Cracks [k]Coconuts[].', { eat: { m: 'id:banana', v: 6 } }),
  S('mouse', 'Mouse', 'creature', 'white', 'C', 1, '[c]+1[] per touching [k]fruit[].', { adj: { m: 'fam:fruit', v: 1 } }),
  S('cat', 'Cat', 'creature', 'gold', 'C', 3, 'Eats touching [k]Mice[] for [c]+10[] each.', { eat: { m: 'id:mouse', v: 10 } }),
  S('bee', 'Bee', 'creature', 'yellow', 'U', 1, '[c]+2[] per touching [k]fruit[] or [k]flower[].', { adj: { m: ['fam:fruit', 'tag:flower'], v: 2 } }),
  S('camel', 'Camel', 'creature', 'brown', 'U', 3, 'Eats touching [k]Dates[] for [c]+8[] each.', { eat: { m: 'id:date', v: 8 } }),
  S('parrot', 'Parrot', 'creature', 'green red', 'U', 0, 'Copies the coins of its best neighbour.'),
  S('hummingbird', 'Hummingbird', 'creature', 'pink green', 'U', 1, 'Its best touching [k]fruit[] scores [c]x2 coins[].'),
  S('elephant', 'Elephant', 'creature', 'white', 'R', 6, 'Cracks touching [k]Coconuts[] and opens [k]Chests[].'),
  S('peacock', 'Peacock', 'creature', 'blue green', 'R', 3, '[m]+1 Mult[] per different [k]colour[] touching it.'),
  S('phoenix', 'Phoenix', 'creature', 'red gold', 'L', 8, 'Every touching symbol [k]triggers again[].'),
  // ---- Treasure
  S('coin', 'Coin', 'treasure', 'gold', 'C', 3, 'Honest money.'),
  S('pearl', 'Pearl', 'treasure', 'white', 'C', 1, 'Grows [c]+1[] forever each time it lands.'),
  S('sapphire', 'Sapphire', 'treasure', 'blue', 'U', 6, '[k]Gem[].', { tags: ['gem'] }),
  S('ruby', 'Ruby', 'treasure', 'red', 'U', 4, '[k]Gem[]. [c]x2 coins[] when touching another [k]red[] symbol.', { smul: { m: 'col:red', k: 2 }, tags: ['gem'] }),
  S('emerald', 'Emerald', 'treasure', 'green', 'U', 4, '[k]Gem[]. [c]x2 coins[] when touching a [k]garden[] symbol.', { smul: { m: 'fam:garden', k: 2 }, tags: ['gem'] }),
  S('chest', 'Treasure Chest', 'treasure', 'gold brown', 'U', 0, 'Locked. A touching [k]Key[] or [k]Elephant[] opens it for [c]+25[].'),
  S('key', 'Key', 'treasure', 'gold', 'U', 1, 'Opens touching [k]Chests[].'),
  S('piggy', 'Piggy Bank', 'treasure', 'pink', 'U', 0, 'Earns [g]1 gold[] each time it lands.', { gold: 1 }),
  S('crown', 'Crown', 'treasure', 'gold', 'R', 3, 'Every [k]gem[] on the board [c]+4[].', { baura: { m: 'tag:gem', v: 4 } }),
  S('diamond', 'Diamond', 'treasure', 'white blue', 'L', 10, '[k]Gem[]. [m]+2 Mult[].', { mult: 2, tags: ['gem'] }),
  // ---- Magic
  S('star', 'Wishing Star', 'magic', 'gold', 'U', 2, '[k]Wild[]: matches anything in a [k]line[].', { tags: ['wild'] }),
  S('lamp', 'Oil Lamp', 'magic', 'purple gold', 'U', 1, '[m]+1 Mult[].', { mult: 1 }),
  S('carpet', 'Magic Carpet', 'magic', 'purple red', 'U', 2, '[m]+2 Mult[] when it lands on the [k]top row[].'),
  S('hourglass', 'Hourglass', 'magic', 'blue gold', 'R', 0, 'The symbols directly [k]above[] and [k]below[] it [k]trigger again[].'),
  S('crystal', 'Crystal Ball', 'magic', 'purple', 'R', 2, '[m]x2 Mult[] when it lands on the [k]middle row[].'),
  S('bottle', 'Djinn Bottle', 'magic', 'purple blue', 'R', 1, '[m]+1 Mult[] per other [k]Magic[] symbol on the board.'),
  S('charmer', 'Snake Charmer', 'magic', 'purple green', 'R', 1, 'Touching [v]curses[] are charmed: harmless, and pay [c]10[].'),
  S('cursejar', 'Curse Jar', 'magic', 'purple', 'R', 0, '[m]+2 Mult[] per [v]curse[] on the board.'),
];

export const CURSES = [
  S('scorpion', 'Scorpion', 'curse', 'black', 'X', 0, '[x]-8 coins[].'),
  S('wasp', 'Wasp', 'curse', 'black yellow', 'X', 0, 'Touching [k]fruit[] [x]score nothing[].'),
  S('rot', 'Rot', 'curse', 'black green', 'X', 0, 'Touching [k]fruit[] [x]-2[].'),
  S('moth', 'Moth', 'curse', 'black', 'X', 0, 'Touching [k]treasure[] [x]scores nothing[].'),
  S('debt', 'Debt Scroll', 'curse', 'black', 'X', 0, '[x]-1 Mult[].'),
  S('sand', 'Sandstorm', 'curse', 'black', 'X', 0, 'Its row [x]cannot form lines[].'),
];

// Cursed relics that live on a reel.
export const RELIC_SYMBOLS = [
  S('midas', 'Midas Hand', 'relic', 'gold', 'L', 0, 'Touching symbols turn to gold and pay [c]12[] each. [x]Gilded symbols lose their effects.[]'),
  S('blackcat', 'Black Cat', 'relic', 'black', 'R', 0, 'Touching symbols score [c]x3 coins[]. [x]-1 Wish each round while it is on your reels.[]'),
  S('bat', 'Vampire Bat', 'relic', 'black red', 'R', 0, 'Grows [c]+3[] forever each time it lands. [x]Drains 1 forever from its best neighbour.[]'),
  S('foolsgold', "Fool's Gold", 'relic', 'gold', 'U', 20, 'Pays [c]20[]. [x]1 time in 4 it is -20 instead.[]'),
];

const C = (id, name, rar, desc, fx = {}) => ({ id, name, rar, desc, ...fx });

export const CHARMS = [
  C('sun', 'Sun', 'C', 'All [k]fruit[] [c]+2 coins[].'),
  C('tambourine', 'Tambourine', 'C', '[m]+1 Mult[] per [k]creature[] on the board.'),
  C('fruitbowl', 'Fruit Bowl', 'C', '[m]+1 Mult[] per 3 [k]fruit[] on the board.'),
  C('hookah', 'Hookah', 'C', '[m]+4 Mult[] on the first Spin of each round.'),
  C('abacus', 'Abacus', 'C', '[m]+2 Mult[] per [k]line[] on the board.'),
  C('scales', 'Golden Scales', 'C', 'Earn [g]1 gold[] per unused Wish when a tribute is paid.'),
  C('incense', 'Incense', 'C', '[v]Curses[] have no effect.'),
  C('dice', 'Loaded Dice', 'U', '[k]+1 Wish[] each round.'),
  C('compass', 'Compass', 'U', 'Corner symbols score [c]x3 coins[].'),
  C('loupe', "Jeweller's Loupe", 'U', '[m]+2 Mult[] per [k]gem[] on the board.'),
  C('glove', "Gardener's Glove", 'U', 'Everything that grows forever grows [k]twice as fast[].'),
  C('scimitar', 'Scimitar', 'U', '[m]x2 Mult[] while you have used no Wishes this round.'),
  C('purse', "Miser's Purse", 'U', '[m]+1 Mult[] per [g]4 gold[] you hold (max +8).'),
  C('merchant', 'Rug Merchant', 'U', 'The Bazaar offers 1 more symbol. Rerolls cost [g]1 less[].'),
  C('moon', 'Crescent Moon', 'U', '[m]x2 Mult[] on your final Spin of a round.'),
  C('rainbow', 'Rainbow', 'U', '[m]+1 Mult[] per 2 different [k]colours[] on the board.'),
  C('sandglass', 'Sandglass', 'R', '[k]+1 Spin[] each round.'),
  C('mirror', 'Mirror', 'R', 'Symbols on the [k]middle reel[] trigger again.'),
  C('bell', 'Jackpot Bell', 'R', 'Every [k]line[] gives an extra [m]x1.5 Mult[].'),
  C('scarab', 'Scarab', 'R', 'Gains [m]x0.25 Mult[] each time you pay a tribute.'),
  C('tightrope', 'Tightrope', 'R', '[m]x3 Mult[] while every reel has 5 or fewer symbols.'),
  C('seal', "Sultan's Seal", 'L', '[m]x3 Mult[].'),
];

// Cursed relics that sit beside your charms (no slot needed, cannot be sold).
export const RELIC_CHARMS = [
  C('evileye', 'Evil Eye', 'R', '[m]x2 Mult[]. [x]Each spin it glares at one symbol, which scores nothing.[]'),
  C('pandora', "Pandora's Box", 'L', '[m]+5 Mult[]. [x]Adds a curse to your reels at the start of every round.[]'),
  C('contract', "Djinn's Contract", 'R', '[g]+20 gold[] right now. [x]Every tribute is 25% larger, forever.[]'),
  C('bloodmoon', 'Blood Moon', 'L', '[k]Red[] and [k]pink[] symbols score [c]x3 coins[]. [x]Garden symbols score nothing.[]'),
  C('ring', "Djinn's Ring", 'L', 'Every symbol [c]+2 coins[]. [x]Tribute rewards pay 2 gold less.[]'),
  C('paw', "Monkey's Paw", 'L', 'Bazaar symbols are always [k]Rare[] or better. [x]Every Bazaar visit adds a curse.[]'),
  C('sandtimer', 'Sand Timer of Ruin', 'R', '[m]x4 Mult[] for 8 spins. [x]Then it shatters, adding 3 curses.[]', { count: 8 }),
];

export const DECREES = [
  { id: 'famine', name: 'The Famine', desc: 'Fruit pay half coins.' },
  { id: 'cage', name: 'The Cage', desc: 'Creatures score nothing.' },
  { id: 'tax', name: 'The Tax', desc: 'Treasure scores nothing.' },
  { id: 'silence', name: 'The Silence', desc: 'Magic symbols score nothing.' },
  { id: 'chains', name: 'The Chains', desc: 'The middle reel cannot be held or nudged.' },
  { id: 'fog', name: 'The Fog', desc: 'Lines need 4 or more symbols.' },
  { id: 'straw', name: 'The Short Straw', desc: 'One less Spin this round.' },
  { id: 'mirage', name: 'The Mirage', desc: 'The bottom row scores nothing.' },
  { id: 'thirst', name: 'The Thirst', desc: 'Only 1 Wish this round.' },
];

export const LAMPS = [
  {
    id: 'azure', name: 'Azure Lamp', djinn: 'blue', desc: 'A balanced orchard. The classic bargain.',
    unlock: null, gold: 5,
    reels: [
      ['cherry', 'leaf', 'banana', 'fig', 'coin', 'lemon'],
      ['cherry', 'banana', 'monkey', 'coin', 'fig', 'seed'],
      ['cherry', 'lemon', 'banana', 'mouse', 'coin', 'date'],
      ['cherry', 'banana', 'cat', 'fig', 'coin', 'leaf'],
      ['cherry', 'lemon', 'banana', 'pearl', 'coin', 'fig'],
    ],
  },
  {
    id: 'rose', name: 'Rose Lamp', djinn: 'pink', desc: 'A patient garden. +1 Wish each round, but less gold.',
    unlock: 'Pay 3 tributes in one run', gold: 3, wishes: 1,
    reels: [
      ['seed', 'leaf', 'cherry', 'rose', 'fig', 'seed'],
      ['peach', 'rose', 'seed', 'lemon', 'coin', 'cherry'],
      ['wateringcan', 'seed', 'leaf', 'cherry', 'fig', 'mouse'],
      ['seed', 'cherry', 'rose', 'leaf', 'coin', 'lemon'],
      ['pearl', 'seed', 'fig', 'cherry', 'leaf', 'bee'],
    ],
  },
  {
    id: 'gilded', name: 'Gilded Lamp', djinn: 'gold', desc: 'A vault of treasure and 12 gold, but only 4 charm slots.',
    unlock: 'Pay 6 tributes in one run', gold: 12, slots: 4,
    reels: [
      ['coin', 'pearl', 'cherry', 'coin', 'fig', 'ruby'],
      ['coin', 'chest', 'key', 'banana', 'coin', 'pearl'],
      ['coin', 'cherry', 'sapphire', 'coin', 'fig', 'banana'],
      ['coin', 'pearl', 'banana', 'coin', 'cherry', 'emerald'],
      ['coin', 'leaf', 'cherry', 'coin', 'fig', 'piggy'],
    ],
  },
  {
    id: 'ember', name: 'Ember Lamp', djinn: 'red', desc: 'Short, hot reels with an Oil Lamp. Tributes are 20% larger.',
    unlock: 'Win a run', gold: 5, trib: 1.2,
    reels: [
      ['cherry', 'banana', 'fig', 'lemon', 'coin'],
      ['cherry', 'banana', 'monkey', 'fig', 'coin'],
      ['cherry', 'lamp', 'banana', 'fig', 'coin'],
      ['cherry', 'banana', 'cat', 'mouse', 'coin'],
      ['cherry', 'banana', 'fig', 'leaf', 'coin'],
    ],
  },
];

// Tribute targets for the 9 rounds (3 acts x small / big / decree).
export const TRIBUTES = [300, 500, 800, 1400, 2200, 3500, 5500, 8500, 14000];
export const ROUND_NAMES = ['Small Tribute', 'Grand Tribute', 'Decree'];
export const ACT_NAMES = ['The Bazaar Gate', 'The Sultan\'s Hall', 'The Heart of the Lamp'];
export const REWARDS = [4, 5, 7];

export const QUIPS = {
  start: ['Spin, little mortal.', 'The lamp is hungry.', 'Amuse me.', 'Fortune favours the bold.', 'Rig it well.'],
  big: ['Impossible!', 'You CHEAT!', 'Hmph. Lucky.', 'My machine!', 'Do that again. Slowly.'],
  good: ['Not bad.', 'A fine spin.', 'Beginner\'s luck.', 'Hm.'],
  bad: ['Pathetic.', 'Is that all?', 'The lamp is roomy inside.', 'Tick tock.', 'I can smell your fear.'],
  wish: ['A wish spent.', 'As you command.', 'Granted... for now.', 'Choose wisely.'],
  nowish: ['No wishes left!', 'You are out of wishes.'],
  win: ['Tribute accepted.', 'You may live. For now.', 'Bah! Take your gold.', 'The price rises, mortal.'],
  lose: ['Into the lamp with you!', 'Mine at last!', 'A thousand years of polishing await.'],
  shop: ['Buy something nice.', 'Everything has a price.', 'Fine wares. Mostly cursed.', 'Thin your reels, fool.'],
  relic: ['Excellent choice. Heh.', 'No refunds.', 'It suits you.'],
  refuse: ['Coward.', 'Wise. Boring, but wise.', 'Your loss.'],
  decree: ['By my decree!', 'New rules, mortal.', 'Let us make this interesting.'],
  final: ['You dare beat ME?', 'I... am free? WE are free!', 'Take the lamp. It is yours.'],
};

const idx = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
export const SYM = idx([...SYMBOLS, ...CURSES, ...RELIC_SYMBOLS]);
export const CHARM = idx([...CHARMS, ...RELIC_CHARMS]);
export const DECREE = idx(DECREES);
export const LAMP = idx(LAMPS);
RELIC_SYMBOLS.forEach((s) => (s.relic = true));
RELIC_CHARMS.forEach((c) => (c.relic = true));
CURSES.forEach((c) => (c.curse = true));
export const RELICS = [...RELIC_SYMBOLS.map((s) => ({ id: s.id, kind: 'symbol' })), ...RELIC_CHARMS.map((c) => ({ id: c.id, kind: 'charm' }))];
