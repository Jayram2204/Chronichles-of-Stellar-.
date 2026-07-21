// globals.js - global game switches and consts

const checkStringBoolean = (item) => item === `true`;

const URLOptions = {};
window.location.search.slice(1).split('&').map((option) => {
  const keyValue = option.split('=');
  URLOptions[keyValue[0]] = checkStringBoolean(keyValue[1]) || keyValue[1];
});

const Globals = {
  // development
  debug: checkStringBoolean(localStorage.getItem(`debug`)),
  debugPhysics: checkStringBoolean(localStorage.getItem(`debugPhysics`)),
  showFPS: checkStringBoolean(localStorage.getItem(`showFPS`)),
  noSounds: checkStringBoolean(localStorage.getItem(`noSounds`)),
  noMusic: checkStringBoolean(localStorage.getItem(`noMusic`)),
  // maybe add dev-* key to items' names so we can cycle through options
  // list and assign values automatically
  ...URLOptions, // url options override localSotrage values

  bitmapFont: 'standard',

  // Character selection (set by charselect state)
  selectedCharacter: 'brian',

  CHARACTERS: {
    brian: {
      name: 'Brian Freezby',
      role: 'Balanced',
      hp: 100, punchDmg: 10, kickDmg: 15, speed: 40, weight: 1,
      tint: 0xffffff,
    },
    gloria: {
      name: 'Gloria Freezby',
      role: 'Glass Cannon',
      hp: 70, punchDmg: 18, kickDmg: 22, speed: 45, weight: 0.8,
      tint: 0xffaaaa,
    },
    rebel: {
      name: 'Rebel',
      role: 'Speedster',
      hp: 80, punchDmg: 12, kickDmg: 16, speed: 50, weight: 0.8,
      tint: 0xaaffcc,
    },
    brawler: {
      name: 'Brawler',
      role: 'Tank',
      hp: 130, punchDmg: 15, kickDmg: 20, speed: 30, weight: 1.5,
      tint: 0xaaaaff,
    },
    elite: {
      name: 'Elite',
      role: 'Heavy Hitter',
      hp: 150, punchDmg: 20, kickDmg: 28, speed: 25, weight: 2,
      tint: 0xffcc00,
    },
  },

  palette: {
   sky: { hex: '#c4cfa1', rgb: {r: 196, g: 207, b: 161} },
   bricks1: { hex: '#8b956d', rgb: {r: 139, g: 149, b: 109} }, // light
   bricks2: { hex: '#4d533c', rgb: {r: 77, g: 83, b: 60} }, // dark
   background: { hex: '#1f1f1f', rgb: {r: 31, g: 31, b: 31} },
   menuBackground: { hex: '#4d533c', rgb: {r: 31, g: 31, b: 31} }
  },

};

export default Globals;
