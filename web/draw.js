import {GameState, IsGameState} from "./common/common.js";
import AsteroidObjects from "./common/objects.json.proxy.js";

export class Draw {
  constructor(canvas) {
    this.data = null;
    this.target = null;
    this.debug = false;
    this.shootTargets = [];
    this.gameState = GameState.Stopped;
    this.lastGameState = GameState.Stopped;
    this.lastDrawTimestamp = 0;
    this.asteroid_templates = [];
    this.ship_template = [];
    this.scale = 1;
    this.canvas = canvas;
    this.asteroid_templates = AsteroidObjects["asteroids"];
    this.ship_template = AsteroidObjects["ship"];
  }
  draw() {
  }
  clear() {
  }
  shouldDraw() {
    if (this.gameState != GameState.Running) {
      if (!(this.gameState == GameState.Dead && this.lastGameState != GameState.Dead)) {
        return;
      }
    }
  }
  clearData() {
    this.data = null;
  }
  setData(data) {
    this.gameState = data.state;
    if (IsGameState(this.gameState)) {
      this.data = data;
    }
  }
  setTarget(asteroid, priority) {
    if (asteroid) {
      this.target = [asteroid, priority];
    } else {
      this.target = null;
    }
  }
  setShootTargets(targets) {
    this.shootTargets = targets;
  }
  setDebug(value) {
    this.debug = value;
  }
  isDrawState(gameState) {
    return IsGameState(gameState) || gameState == GameState.Dead;
  }
}
