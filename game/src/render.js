// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Flat neon shapes, glow by layered alpha, canvas text for the HUD and the panels.
import { BALL, BRICK, FIELD, FONT, LEVELS, PALETTE, POWERUP } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 110, line: 34, bottom: 72 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const levelLabel = cachedLabel('LEVEL ');
  const livesLabel = cachedLabel('LIVES ');
  const finalLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function drawField() {
    context.fillStyle = PALETTE.field;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.strokeStyle = PALETTE.grid;
    context.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, FIELD.height);
      context.stroke();
    }
    for (let y = 0; y <= FIELD.height; y += 80) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
      context.stroke();
    }
  }

  function drawBricks(state) {
    for (const brick of state.bricks) {
      if (!brick.active) continue;
      const color = brick.unbreakable ? PALETTE.unbreakable : PALETTE.brick[brick.maxHp];
      context.globalAlpha = brick.unbreakable ? 1 : 0.55 + 0.45 * (brick.hp / brick.maxHp);
      context.fillStyle = color;
      roundRect(brick.x, brick.y, brick.width, brick.height, 6);
      context.fill();
      context.globalAlpha = 1;
      context.strokeStyle = 'rgba(255,255,255,0.25)';
      context.lineWidth = 1;
      roundRect(brick.x + 0.5, brick.y + 0.5, brick.width - 1, brick.height - 1, 6);
      context.stroke();
      if (brick.unbreakable) {
        text('X', brick.x + brick.width / 2, brick.y + brick.height / 2 + 7, 16, '#c8cede', 'center');
      } else if (brick.hp > 1) {
        text(String(brick.hp), brick.x + brick.width / 2, brick.y + brick.height / 2 + 6, 14, '#11142a', 'center');
      }
    }
  }

  function drawPaddle(state) {
    const p = state.paddle;
    const color = state.wideTimer > 0 ? PALETTE.paddleWide : PALETTE.paddle;
    context.fillStyle = color;
    context.globalAlpha = 0.35;
    roundRect(p.x - 4, p.y - 4, p.width + 8, p.height + 8, 10);
    context.fill();
    context.globalAlpha = 1;
    roundRect(p.x, p.y, p.width, p.height, 9);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.55)';
    roundRect(p.x + 6, p.y + 3, p.width - 12, 4, 2);
    context.fill();
    if (state.laserTimer > 0) {
      context.fillStyle = PALETTE.laser;
      context.fillRect(p.x + 8, p.y - 10, 6, 10);
      context.fillRect(p.x + p.width - 14, p.y - 10, 6, 10);
    }
  }

  function drawBalls(state) {
    for (const ball of state.balls) {
      if (!ball.active) continue;
      context.fillStyle = 'rgba(255,255,255,0.25)';
      context.beginPath();
      context.arc(ball.x, ball.y, BALL.radius + 5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.ball;
      context.beginPath();
      context.arc(ball.x, ball.y, BALL.radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawPowerups(state) {
    for (const p of state.powerups) {
      if (!p.active) continue;
      const s = POWERUP.size;
      context.fillStyle = PALETTE.powerup[p.kind];
      context.globalAlpha = 0.3;
      roundRect(p.x - s / 2 - 3, p.y - s / 2 - 3, s + 6, s + 6, 8);
      context.fill();
      context.globalAlpha = 1;
      roundRect(p.x - s / 2, p.y - s / 2, s, s, 6);
      context.fill();
      text(p.kind, p.x, p.y + 6, 15, '#11142a', 'center');
    }
  }

  function drawLasers(state) {
    context.fillStyle = PALETTE.laser;
    for (const l of state.lasers) {
      if (!l.active) continue;
      context.fillRect(l.x - 2, l.y - 12, 4, 12);
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = PALETTE.particle[p.color] || PALETTE.particle[0];
      context.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    context.globalAlpha = 1;
  }

  function drawHud(state, best) {
    text(scoreLabel(state.score), 24, 40, 26, PALETTE.text);
    text(levelLabel(state.level) + ' · ' + LEVELS[state.level - 1].name, 24, 68, 16, PALETTE.muted);
    text(livesLabel(state.lives), FIELD.width - 24, 40, 26, PALETTE.text, 'right');
    text(bestLabel(Math.max(best, state.score)), FIELD.width - 24, 68, 16, PALETTE.muted, 'right');
    if (state.combo >= 2) {
      text('COMBO x' + state.combo, FIELD.width / 2, 40, 24, PALETTE.accent, 'center');
    }
    let timers = '';
    if (state.wideTimer > 0) timers += ' WIDE ' + Math.ceil(state.wideTimer) + 's';
    if (state.laserTimer > 0) timers += ' LASER ' + Math.ceil(state.laserTimer) + 's';
    if (state.slowTimer > 0) timers += ' SLOW ' + Math.ceil(state.slowTimer) + 's';
    if (timers) text(timers.trim(), FIELD.width / 2, 68, 15, PALETTE.accent, 'center');
  }

  function drawPanel(lines) {
    const height = PANEL.bottom + lines.length * PANEL.line;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = PANEL.top;
    context.fillStyle = 'rgba(11,14,26,0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, PANEL.width, height, 14);
    context.fill();
    context.strokeStyle = 'rgba(79,195,247,0.5)';
    context.lineWidth = 2;
    roundRect(x, y, PANEL.width, height, 14);
    context.stroke();
    return { x, y, height };
  }

  function drawTitle(state, best) {
    drawField();
    drawBricks(state);
    drawPaddle(state);
    drawBalls(state);
    const panel = drawPanel(['', '', '', '', '', '']);
    const cx = FIELD.width / 2;
    text('NEON BREAKER', cx, panel.y + 74, 54, PALETTE.accent, 'center');
    text('Break every brick. Do not drop the ball.', cx, panel.y + 116, 20, PALETTE.text, 'center');
    text('Move: mouse or ← →  ·  Launch / fire laser: Space or click', cx, panel.y + 148, 18, PALETTE.muted, 'center');
    text('P pause  ·  Catch falling power-ups: W wide, M multi-ball,', cx, panel.y + 176, 18, PALETTE.muted, 'center');
    text('L laser, S slow ball  ·  3 levels, then the Vault falls', cx, panel.y + 204, 18, PALETTE.muted, 'center');
    text('Press Space or click to play', cx, panel.y + panel.height - 24, 22, PALETTE.paddle, 'center');
    if (best > 0) text(bestLabel(best), cx, panel.y + panel.height + 34, 18, PALETTE.muted, 'center');
  }

  function drawOver(state, best, won) {
    drawField();
    drawBricks(state);
    drawPaddle(state);
    const panel = drawPanel(['', '', '', '', '']);
    const cx = FIELD.width / 2;
    text(won ? 'YOU WIN!' : 'GAME OVER', cx, panel.y + 74, 52, won ? PALETTE.accent : '#e5534b', 'center');
    text(finalLabel(state.score), cx, panel.y + 122, 26, PALETTE.text, 'center');
    text(bestLabel(Math.max(best, state.score)) + '   ·   Best combo x' + state.bestCombo, cx, panel.y + 158, 18, PALETTE.muted, 'center');
    text(won ? 'Every brick in all 3 levels is gone.' : 'The ball slipped past. The bricks remain.', cx, panel.y + 188, 18, PALETTE.muted, 'center');
    text('Press Space or click to play again', cx, panel.y + panel.height - 26, 22, PALETTE.paddle, 'center');
  }

  function drawPaused() {
    context.fillStyle = 'rgba(11,14,26,0.66)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    text('PAUSED', FIELD.width / 2, FIELD.height / 2 - 8, 48, PALETTE.text, 'center');
    text('Press P or Space to resume', FIELD.width / 2, FIELD.height / 2 + 34, 20, PALETTE.muted, 'center');
  }

  function draw(state, screen, best) {
    resize();
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(-view.x / view.scale, -view.y / view.scale, canvas.width / view.scale, canvas.height / view.scale);
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
      return;
    }
    drawField();
    drawBricks(state);
    drawPowerups(state);
    drawLasers(state);
    drawPaddle(state);
    drawBalls(state);
    drawParticles(state);
    drawHud(state, best);
    if (screen === SCREEN_OVER) drawOver(state, best, false);
    else if (screen === SCREEN_WIN) drawOver(state, best, true);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_PLAY && state.balls.some((b) => b.active && b.stuck)) {
      text('Click or press Space to launch', FIELD.width / 2, 620, 22, PALETTE.muted, 'center');
    }
  }

  return { draw, resize };
}
