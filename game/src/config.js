// Sizzle & Serve: Warung Rush — tuning constants and recipe data.
// One job: every number the rest of the game balances against lives here.
export const GAME = {
  title: 'Sizzle & Serve: Warung Rush',
  dayLengthSeconds: 150,
  startLives: 3,
  orderSlots: 3,
  firstOrderDelay: 2,
  orderGapMin: 4,
  orderGapMax: 9,
  orderTimeBase: 55,
  orderTimeMin: 30,
  chopSeconds: 2.2,
  cookSeconds: 3.5,
  serveWindowSeconds: 1.5,
  comboWindowSeconds: 12,
  playerSpeed: 5.2,
  playerRadius: 0.45,
  interactRange: 1.9,
  kitchenWidth: 12,
  kitchenDepth: 9,
};

export const PRICES = { nasi: 120, mie: 110, sate: 150 };
export const COMBO_BONUS = 25;

// Ingredient catalogue: id, display name, colour, pantry bin, needs chop / cook.
export const INGREDIENTS = {
  rice:    { id: 'rice',    name: 'Nasi',      color: 0xfff6d8, chop: false, cook: true,  bin: 'Rice' },
  egg:     { id: 'egg',     name: 'Telur',     color: 0xffe9a8, chop: false, cook: true,  bin: 'Eggs' },
  kecap:   { id: 'kecap',   name: 'Kecap',     color: 0x3a1f0d, chop: false, cook: false, bin: 'Sauce' },
  noodles: { id: 'noodles', name: 'Mie',       color: 0xf2c14e, chop: false, cook: true,  bin: 'Noodles' },
  veg:     { id: 'veg',     name: 'Sayur',     color: 0x4caf50, chop: true,  cook: false, bin: 'Veg' },
  chicken: { id: 'chicken', name: 'Ayam',      color: 0xe8a87c, chop: true,  cook: true,  bin: 'Chicken' },
  skewer:  { id: 'skewer',  name: 'Tusuk Sate', color: 0xc89b6a, chop: false, cook: false, bin: 'Skewers' },
  peanut:  { id: 'peanut',  name: 'Bumbu Kacang', color: 0x8d5a2b, chop: false, cook: false, bin: 'Sauce' },
};

// Recipes: the dish, its steps in order, and the station each step needs.
export const RECIPES = {
  nasi: {
    id: 'nasi', name: 'Nasi Goreng', emoji: '🍚', price: PRICES.nasi,
    steps: [
      { ingredient: 'rice', station: 'stove', label: 'Masak nasi di kompor' },
      { ingredient: 'egg', station: 'stove', label: 'Goreng telur' },
      { ingredient: 'kecap', station: 'plate', label: 'Tuang kecap di piring' },
    ],
  },
  mie: {
    id: 'mie', name: 'Mie Goreng', emoji: '🍜', price: PRICES.mie,
    steps: [
      { ingredient: 'noodles', station: 'stove', label: 'Rebus mie' },
      { ingredient: 'egg', station: 'stove', label: 'Goreng telur' },
      { ingredient: 'veg', station: 'board', label: 'Potong sayur' },
    ],
  },
  sate: {
    id: 'sate', name: 'Sate Ayam', emoji: '🍢', price: PRICES.sate,
    steps: [
      { ingredient: 'chicken', station: 'board', label: 'Potong ayam' },
      { ingredient: 'skewer', station: 'plate', label: 'Tusuk sate' },
      { ingredient: 'peanut', station: 'plate', label: 'Siram bumbu kacang' },
    ],
  },
};

export const RECIPE_IDS = ['nasi', 'mie', 'sate'];

// Station layout in kitchen coordinates (x right, z down toward camera).
export const STATIONS = {
  pantryRice:    { id: 'pantryRice',    kind: 'pantry', ingredient: 'rice',    x: -5.2, z: -3.6, label: 'NASI' },
  pantryEgg:     { id: 'pantryEgg',     kind: 'pantry', ingredient: 'egg',     x: -3.9, z: -3.6, label: 'TELUR' },
  pantryNoodles: { id: 'pantryNoodles', kind: 'pantry', ingredient: 'noodles', x: -2.6, z: -3.6, label: 'MIE' },
  pantryVeg:     { id: 'pantryVeg',     kind: 'pantry', ingredient: 'veg',     x: -1.3, z: -3.6, label: 'SAYUR' },
  pantryChicken: { id: 'pantryChicken', kind: 'pantry', ingredient: 'chicken', x: 0.0,  z: -3.6, label: 'AYAM' },
  pantrySauce:   { id: 'pantrySauce',   kind: 'pantry', ingredient: 'kecap',   x: 1.3,  z: -3.6, label: 'KECAP' },
  pantrySkewer:  { id: 'pantrySkewer',  kind: 'pantry', ingredient: 'skewer',  x: 2.6,  z: -3.6, label: 'TUSUK' },
  pantryPeanut:  { id: 'pantryPeanut',  kind: 'pantry', ingredient: 'peanut',  x: 3.9,  z: -3.6, label: 'KACANG' },
  board:         { id: 'board',         kind: 'board',  x: -4.6, z: 0.2,  label: 'TALENAN' },
  stove:         { id: 'stove',         kind: 'stove',  x: -4.6, z: 2.6,  label: 'KOMPOR' },
  plate:         { id: 'plate',         kind: 'plate',  x: 4.6,  z: 0.2,  label: 'PIRING' },
  serve:         { id: 'serve',         kind: 'serve',  x: 4.6,  z: 2.6,  label: 'SAJIKAN' },
};

export const STATION_LIST = Object.values(STATIONS);

// Colours for the warung look: warm terracotta, teal awning, cream walls.
export const PALETTE = {
  floor: 0xc98d5f,
  floorAlt: 0xbd7f52,
  wall: 0xffe8c2,
  wallTrim: 0x2e7d6b,
  counter: 0x8d5a2b,
  counterTop: 0xf5e6c8,
  stove: 0x37474f,
  board: 0xd7a86e,
  plate: 0xffffff,
  awning: 0xe4572e,
  awningAlt: 0xfff3e0,
  chefShirt: 0x2e7d6b,
  chefHat: 0xffffff,
  skin: 0xe8b88a,
};
