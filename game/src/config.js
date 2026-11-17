// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PADDLE = {
  width: 120,
  height: 18,
  y: 668,
  speed: 720,
  wideWidth: 190,
  wideSeconds: 12,
};

export const BALL = {
  radius: 9,
  speed: 460,
  speedPerLevel: 30,
  maxSpeed: 720,
  maxBalls: 3,
};

export const BRICK = {
  cols: 10,
  rows: 5,
  width: 112,
  height: 28,
  gapX: 8,
  gapY: 8,
  top: 96,
  left: (1280 - (10 * 112 + 9 * 8)) / 2,
  /** Points for a brick of each hit-point tier (1, 2, 3, unbreakable excluded). */
  points: [0, 50, 100, 150],
};

export const LIVES = 3;

/** One level: a brick layout plus its speed. A row is 10 characters: . empty, 1/2/3 hit points, X unbreakable. */
export const LEVELS = [
  {
    name: 'First Light',
    ballSpeed: 460,
    rows: [
      '..........',
      '.11111111.',
      '.12222221.',
      '.13333331.',
      '..........',
    ],
  },
  {
    name: 'Crossfire',
    ballSpeed: 500,
    rows: [
      '1..X....X1',
      '.1122211..',
      '..1333331.',
      '.12222221.',
      '1..X....X1',
    ],
  },
  {
    name: 'The Vault',
    ballSpeed: 540,
    rows: [
      'X33333333X',
      '3222222223',
      '3111111113',
      '3222222223',
      'X33333333X',
    ],
  },
];

/** Falling power-ups: W wide paddle, M multi-ball, L laser, S slow ball. */
export const POWERUP = {
  size: 22,
  fallSpeed: 170,
  dropChance: 0.22,
  kinds: ['W', 'M', 'L', 'S'],
  laserSeconds: 14,
  slowSeconds: 10,
};

export const COMBO = {
  /** Points grow with the combo: each brick in a row without the ball touching the paddle. */
  step: 10,
  max: 8,
};

export const PALETTE = {
  backdrop: '#0b0e1a',
  field: '#11142a',
  grid: '#1b2040',
  paddle: '#4fc3f7',
  paddleWide: '#7ee787',
  ball: '#ffffff',
  laser: '#ff5d8f',
  brick: ['#000000', '#f2c94c', '#ff8a3d', '#e5534b'],
  unbreakable: '#5b6478',
  powerup: { W: '#7ee787', M: '#4fc3f7', L: '#ff5d8f', S: '#c792ea' },
  particle: ['#f2c94c', '#ff8a3d', '#4fc3f7', '#ff5d8f'],
  panel: '#171b31',
  text: '#eef1f5',
  muted: '#8b93a3',
  accent: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'neon-breaker.best';
