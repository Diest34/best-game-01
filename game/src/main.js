// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between five screens: title, play, paused, game over and win.
//
// ?seed=N fixes the brick-break pattern. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BOUNCE, EVENT_BRICK, EVENT_LASER, EVENT_LEVEL, EVENT_LOST, EVENT_OVER, EVENT_POWERUP, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createSound } from './sound.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    sound.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. 3 lives. Break every brick.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) sound.win();
    announce(won ? `You win. Score ${world.state.score}. Best ${best}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleEvents(events) {
    if (events & EVENT_BRICK) sound.brick();
    else if (events & EVENT_BOUNCE) sound.bounce();
    if (events & EVENT_POWERUP) sound.powerup();
    if (events & EVENT_LASER) sound.laser();
    if (events & EVENT_LOST) {
      sound.lost();
      announce(`Ball lost. ${world.state.lives} lives left.`);
    }
    if (events & EVENT_LEVEL) {
      sound.level();
      announce(`Level ${world.state.level}.`);
    }
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    if (screen === SCREEN_PLAY) {
      // The pointer steers by position when it moved; the keys steer by direction.
      // One-shot presses act on the first fixed step of the frame only.
      const target = input.pointerTarget();
      const pressed = (actions & ACTION_CONFIRM) !== 0;
      let first = true;
      let events = 0;
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const usePress = first && pressed;
        first = false;
        if (target !== null) {
          const rect = canvas.getBoundingClientRect();
          const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
          const offsetX = (rect.width - FIELD.width * scale) / 2;
          const fieldX = (target - offsetX) / scale;
          events |= world.step(STEP, fieldX, true, usePress, usePress);
        } else {
          events |= world.step(STEP, input.direction(), false, usePress, usePress);
        }
      }
      handleEvents(events);
    }
    renderer.draw(world.state, screen, best);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', () => renderer.resize());
  renderer.resize();
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
