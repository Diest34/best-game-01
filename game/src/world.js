// The game's rules and state, with no drawing and no browser in it: the paddle, the balls,
// the brick wall, falling power-ups, lasers, particles, score, combo, lives and levels.
// step() advances one fixed step and returns what happened as bit flags, so the caller can
// react (sounds, announcements) without the world knowing about screens or sound.
// Nothing here allocates after createWorld returns.

import { BALL, BRICK, COMBO, FIELD, LEVELS, LIVES, PADDLE, POWERUP } from './config.js';

export const EVENT_BOUNCE = 1;
export const EVENT_BRICK = 2;
export const EVENT_POWERUP = 4;
export const EVENT_LOST = 8;
export const EVENT_LEVEL = 16;
export const EVENT_WIN = 32;
export const EVENT_OVER = 64;
export const EVENT_LASER = 128;

const MAX_PARTICLES = 96;
const MAX_POWERUPS = 6;
const MAX_LASERS = 8;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function createWorld(random) {
  const paddle = { x: 0, y: PADDLE.y, width: PADDLE.width, height: PADDLE.height };
  const balls = [];
  for (let i = 0; i < BALL.maxBalls; i += 1) {
    balls.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, stuck: true });
  }
  const bricks = [];
  for (let i = 0; i < BRICK.cols * BRICK.rows; i += 1) {
    bricks.push({ active: false, hp: 0, maxHp: 0, unbreakable: false, x: 0, y: 0, width: BRICK.width, height: BRICK.height });
  }
  const powerups = [];
  for (let i = 0; i < MAX_POWERUPS; i += 1) {
    powerups.push({ active: false, kind: 'W', x: 0, y: 0, vy: 0 });
  }
  const lasers = [];
  for (let i = 0; i < MAX_LASERS; i += 1) {
    lasers.push({ active: false, x: 0, y: 0, vy: 0 });
  }
  const particles = [];
  for (let i = 0; i < MAX_PARTICLES; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: 0 });
  }
  const state = {
    paddle, balls, bricks, powerups, lasers, particles,
    score: 0, lives: LIVES, level: 1, combo: 0, bestCombo: 0,
    elapsed: 0, won: false, over: false,
    wideTimer: 0, laserTimer: 0, slowTimer: 0,
    ballsServed: 0,
  };

  function levelDef() {
    return LEVELS[state.level - 1];
  }

  function loadLevel() {
    const def = levelDef();
    let index = 0;
    for (let row = 0; row < BRICK.rows; row += 1) {
      for (let col = 0; col < BRICK.cols; col += 1) {
        const brick = bricks[index];
        index += 1;
        const ch = def.rows[row][col];
        brick.x = BRICK.left + col * (BRICK.width + BRICK.gapX);
        brick.y = BRICK.top + row * (BRICK.height + BRICK.gapY);
        if (ch === '.' || ch === undefined) {
          brick.active = false;
          continue;
        }
        brick.active = true;
        brick.unbreakable = ch === 'X';
        brick.hp = brick.unbreakable ? 99 : Number(ch);
        brick.maxHp = brick.hp;
      }
    }
    for (const p of powerups) p.active = false;
    for (const l of lasers) l.active = false;
    paddle.width = PADDLE.width;
    state.wideTimer = 0;
    state.laserTimer = 0;
    state.slowTimer = 0;
    state.combo = 0;
    serveBall();
  }

  function serveBall() {
    for (const ball of balls) {
      if (!ball.active) {
        ball.active = true;
        ball.stuck = true;
        ball.x = paddle.x + paddle.width / 2;
        ball.y = paddle.y - BALL.radius - 1;
        ball.vx = 0;
        ball.vy = 0;
        state.ballsServed += 1;
        return;
      }
    }
  }

  function launchBall() {
    for (const ball of balls) {
      if (ball.active && ball.stuck) {
        ball.stuck = false;
        const angle = -Math.PI / 2 + (random() - 0.5) * 0.9;
        const speed = levelDef().ballSpeed;
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
      }
    }
  }

  function burst(x, y, color, count) {
    let made = 0;
    for (const p of particles) {
      if (made >= count) break;
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      const a = random() * Math.PI * 2;
      const s = 60 + random() * 220;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - 60;
      p.life = 0.4 + random() * 0.4;
      p.maxLife = p.life;
      p.color = color;
      made += 1;
    }
  }

  function maybeDrop(x, y) {
    if (random() > POWERUP.dropChance) return;
    for (const p of powerups) {
      if (p.active) continue;
      p.active = true;
      p.kind = POWERUP.kinds[Math.floor(random() * POWERUP.kinds.length)];
      p.x = x;
      p.y = y;
      p.vy = POWERUP.fallSpeed;
      return;
    }
  }

  function applyPowerup(kind) {
    if (kind === 'W') {
      paddle.width = PADDLE.wideWidth;
      state.wideTimer = PADDLE.wideSeconds;
    } else if (kind === 'M') {
      const actives = balls.filter((b) => b.active && !b.stuck);
      for (const src of actives.slice(0, 1)) {
        for (const ball of balls) {
          if (ball.active) continue;
          ball.active = true;
          ball.stuck = false;
          ball.x = src.x;
          ball.y = src.y;
          const a = Math.atan2(src.vy, src.vx) + (random() < 0.5 ? 0.6 : -0.6);
          const s = Math.hypot(src.vx, src.vy);
          ball.vx = Math.cos(a) * s;
          ball.vy = Math.sin(a) * s;
          break;
        }
      }
    } else if (kind === 'L') {
      state.laserTimer = POWERUP.laserSeconds;
    } else if (kind === 'S') {
      state.slowTimer = POWERUP.slowSeconds;
    }
  }

  function fireLasers() {
    if (state.laserTimer <= 0) return;
    let fired = 0;
    for (const l of lasers) {
      if (fired >= 2) break;
      if (l.active) continue;
      l.active = true;
      l.x = paddle.x + (fired === 0 ? 12 : paddle.width - 12);
      l.y = paddle.y - 10;
      l.vy = -640;
      fired += 1;
    }
  }

  function bricksLeft() {
    let count = 0;
    for (const b of bricks) if (b.active && !b.unbreakable) count += 1;
    return count;
  }

  function reset() {
    paddle.x = (FIELD.width - PADDLE.width) / 2;
    paddle.width = PADDLE.width;
    for (const ball of balls) ball.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.combo = 0;
    state.bestCombo = 0;
    state.elapsed = 0;
    state.won = false;
    state.over = false;
    state.ballsServed = 0;
    for (const p of particles) p.active = false;
    loadLevel();
  }

  function hitBrick(ball, brick) {
    if (brick.unbreakable) {
      burst(ball.x, ball.y, 3, 6);
      return EVENT_BOUNCE;
    }
    brick.hp -= 1;
    state.combo = Math.min(COMBO.max, state.combo + 1);
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    const gained = BRICK.points[brick.maxHp] + (state.combo - 1) * COMBO.step;
    state.score += gained;
    burst(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.maxHp, 10);
    if (brick.hp <= 0) {
      brick.active = false;
      maybeDrop(brick.x + brick.width / 2, brick.y + brick.height / 2);
    }
    return EVENT_BRICK;
  }

  /**
   * One fixed step. `move` is -1, 0, 1 (keyboard) or a target paddle x (pointer, when
   * `pointer` is true). `fire` requests a laser shot; `launch` releases a stuck ball.
   */
  function step(dt, move, pointer, fire, launch) {
    let events = 0;
    if (state.over || state.won) return events;
    state.elapsed += dt;

    if (state.wideTimer > 0) {
      state.wideTimer -= dt;
      if (state.wideTimer <= 0) paddle.width = PADDLE.width;
    }
    if (state.laserTimer > 0) state.laserTimer -= dt;
    if (state.slowTimer > 0) state.slowTimer -= dt;

    if (pointer) {
      paddle.x = clamp(move - paddle.width / 2, 0, FIELD.width - paddle.width);
    } else {
      paddle.x = clamp(paddle.x + move * PADDLE.speed * dt, 0, FIELD.width - paddle.width);
    }
    if (launch) launchBall();
    if (fire) {
      fireLasers();
      events |= EVENT_LASER;
    }

    const slow = state.slowTimer > 0 ? 0.65 : 1;
    const def = levelDef();
    const targetSpeed = Math.min(BALL.maxSpeed, def.ballSpeed + BALL.speedPerLevel * (state.level - 1)) * slow;

    for (const ball of balls) {
      if (!ball.active) continue;
      if (ball.stuck) {
        ball.x = paddle.x + paddle.width / 2;
        ball.y = paddle.y - BALL.radius - 1;
        continue;
      }
      const speed = Math.hypot(ball.vx, ball.vy) || targetSpeed;
      ball.vx = (ball.vx / speed) * targetSpeed;
      ball.vy = (ball.vy / speed) * targetSpeed;
      const prevX = ball.x;
      const prevY = ball.y;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x - BALL.radius < 0) { ball.x = BALL.radius; ball.vx = Math.abs(ball.vx); events |= EVENT_BOUNCE; }
      if (ball.x + BALL.radius > FIELD.width) { ball.x = FIELD.width - BALL.radius; ball.vx = -Math.abs(ball.vx); events |= EVENT_BOUNCE; }
      if (ball.y - BALL.radius < 0) { ball.y = BALL.radius; ball.vy = Math.abs(ball.vy); events |= EVENT_BOUNCE; }

      // Paddle: only when falling onto it.
      if (ball.vy > 0 && ball.y + BALL.radius >= paddle.y && ball.y - BALL.radius < paddle.y + paddle.height
        && ball.x >= paddle.x - BALL.radius && ball.x <= paddle.x + paddle.width + BALL.radius) {
        const rel = clamp((ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2), -1, 1);
        const angle = -Math.PI / 2 + rel * 1.1;
        ball.vx = Math.cos(angle) * targetSpeed;
        ball.vy = Math.sin(angle) * targetSpeed;
        ball.y = paddle.y - BALL.radius - 0.5;
        state.combo = 0;
        events |= EVENT_BOUNCE;
      }

      // Bricks: resolve against the previous position so the bounce side is right.
      for (const brick of bricks) {
        if (!brick.active) continue;
        if (ball.x + BALL.radius < brick.x || ball.x - BALL.radius > brick.x + brick.width
          || ball.y + BALL.radius < brick.y || ball.y - BALL.radius > brick.y + brick.height) continue;
        const fromTop = prevY + BALL.radius <= brick.y;
        const fromBottom = prevY - BALL.radius >= brick.y + brick.height;
        const fromLeft = prevX + BALL.radius <= brick.x;
        const fromRight = prevX - BALL.radius >= brick.x + brick.width;
        if (fromTop || fromBottom) ball.vy = -ball.vy;
        else if (fromLeft || fromRight) ball.vx = -ball.vx;
        else ball.vy = -ball.vy;
        events |= hitBrick(ball, brick);
        break;
      }

      if (ball.y - BALL.radius > FIELD.height) {
        ball.active = false;
        state.combo = 0;
      }
    }

    // Lasers destroy the first brick they touch.
    for (const l of lasers) {
      if (!l.active) continue;
      l.y += l.vy * dt;
      if (l.y < 0) { l.active = false; continue; }
      for (const brick of bricks) {
        if (!brick.active || brick.unbreakable) continue;
        if (l.x >= brick.x && l.x <= brick.x + brick.width && l.y >= brick.y && l.y <= brick.y + brick.height) {
          l.active = false;
          brick.hp = 0;
          brick.active = false;
          state.score += BRICK.points[brick.maxHp];
          burst(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.maxHp, 8);
          events |= EVENT_BRICK;
          break;
        }
      }
    }

    // Falling power-ups: caught by the paddle, lost at the floor.
    for (const p of powerups) {
      if (!p.active) continue;
      p.y += p.vy * dt;
      if (p.y > FIELD.height) { p.active = false; continue; }
      if (p.y + POWERUP.size / 2 >= paddle.y && p.y - POWERUP.size / 2 <= paddle.y + paddle.height
        && p.x >= paddle.x - POWERUP.size / 2 && p.x <= paddle.x + paddle.width + POWERUP.size / 2) {
        p.active = false;
        applyPowerup(p.kind);
        events |= EVENT_POWERUP;
      }
    }

    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 320 * dt;
    }

    const anyBall = balls.some((b) => b.active);
    if (!anyBall) {
      state.lives -= 1;
      if (state.lives <= 0) {
        state.over = true;
        events |= EVENT_OVER;
      } else {
        events |= EVENT_LOST;
        serveBall();
      }
    } else if (bricksLeft() === 0) {
      state.score += 500 * state.level;
      if (state.level >= LEVELS.length) {
        state.won = true;
        events |= EVENT_WIN;
      } else {
        state.level += 1;
        loadLevel();
        events |= EVENT_LEVEL;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, loadLevel, launchBall, bricksLeft };
}
