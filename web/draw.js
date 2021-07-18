import {GameState, IsGameState} from "./common.js";

export class Draw {
  constructor(canvas) {
    this.data = null;
    this.target = null;
    this.shootTargets = [];
    this.gameState = GameState.Stopped;
    this.lastGameState = GameState.Stopped;
    this.lastDataTimestamp = 0;
    this.tickFactor = 1.0;
    this.lastDrawTimestamp = 0;
    this.asteroid_templates = [];
    this.ship_template = [];
    this.scale = 1;
    this.canvas = canvas;
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
    const dataTimestamp = Date.now();
    if (this.lastDataTimestamp) {
      this.tickFactor = 100 / (dataTimestamp - this.lastDataTimestamp);
    }
    this.lastDataTimestamp = dataTimestamp;
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
  loadAsteroidTemplates() {
    const self = this;
    $.ajax({
      url: "objects.json",
      async: false
    }).done(function(json) {
      self.asteroid_templates = json["asteroids"];
      self.ship_template = json["ship"];
    });
  }
  isDrawState(gameState) {
    return IsGameState(gameState) || gameState == GameState.Dead;
  }
}
