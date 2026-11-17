// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a simple autopilot that tracks
// the lowest ball, so the frame is what a short game really looks like and the same seed
// always gives the same frame. The end scene's pilot never moves, so the ball is lost and
// the game-over panel shows.

import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 38;
const END_LIMIT_SECONDS = 600;

/** Steer the paddle toward the lowest active ball; 0 when no ball is in play. */
function autopilot(state) {
  let ball = null;
  for (const b of state.balls) {
    if (b.active && !b.stuck && (ball === null || b.y > ball.y)) ball = b;
  }
  if (ball === null) return 0;
  const centre = state.paddle.x + state.paddle.width / 2;
  if (ball.x > centre + 10) return 1;
  if (ball.x < centre - 10) return -1;
  return 0;
}

/** Steer the paddle away from the lowest active ball, so the ball is lost: the end scene. */
function badPilot(state) {
  return -autopilot(state);
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return
 * the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, false, false, false);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  // Launch the ball, then play. The play scene jumps to level 2 first so the frame shows a
  // harder wall with bricks already broken and a combo running.
  if (name === 'play') {
    for (const b of world.state.balls) b.active = false;
    world.state.level = 2;
    world.loadLevel();
  }
  world.launchBall();
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const pilot = name === 'end' ? badPilot : autopilot;
  for (let index = 0; index < limit / STEP; index += 1) {
    // A served ball sits stuck until launched: launch it whenever one is waiting.
    const stuck = world.state.balls.some((b) => b.active && b.stuck);
    const events = world.step(STEP, pilot(world.state), false, false, stuck);
    if (events & (EVENT_OVER | EVENT_WIN)) break;
  }
  if (world.state.won) return { screen: SCREEN_WIN, best: world.state.score };
  if (world.state.over) return { screen: SCREEN_OVER, best: world.state.score };
  return { screen: SCREEN_PLAY, best: world.state.score };
}
