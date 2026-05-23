import {Vec2, Mat2} from "./math/math.js";
import {Vertex, isInsideObject} from "./utils.js";
import {GameState, IsGameState} from "./common.js";
import AsteroidObjects from "./objects.json.proxy.js";
const GAME_TICK_MS = 64;
export var Size;
(function(Size2) {
  Size2[Size2["Large"] = 0] = "Large";
  Size2[Size2["Medium"] = 1] = "Medium";
  Size2[Size2["Small"] = 2] = "Small";
})(Size || (Size = {}));
function sizeToScale(size) {
  if (size == 1) {
    return 0.75;
  }
  if (size == 2) {
    return 0.5;
  }
  return 1;
}
export var RotateDirection;
(function(RotateDirection2) {
  RotateDirection2[RotateDirection2["Left"] = 0] = "Left";
  RotateDirection2[RotateDirection2["Right"] = 1] = "Right";
})(RotateDirection || (RotateDirection = {}));
export var AccelerationDirection;
(function(AccelerationDirection2) {
  AccelerationDirection2[AccelerationDirection2["Forward"] = 0] = "Forward";
  AccelerationDirection2[AccelerationDirection2["Back"] = 1] = "Back";
})(AccelerationDirection || (AccelerationDirection = {}));
class Velocity {
  constructor(value = 0, time_ms = 1) {
    this.value = 0;
    this.value = value / time_ms;
  }
  set(value, time_ms = 1) {
    this.value = value / time_ms;
  }
  get value_ms() {
    return this.value;
  }
  get distance_per_gametick() {
    return this.value * GAME_TICK_MS;
  }
}
function rotation(deg) {
  let res = new Mat2();
  res.set(0, 0, Math.cos(deg / 180 * Math.PI));
  res.set(1, 1, Math.cos(deg / 180 * Math.PI));
  res.set(0, 1, -Math.sin(deg / 180 * Math.PI));
  res.set(1, 0, Math.sin(deg / 180 * Math.PI));
  return res;
}
function multiply(m, v) {
  let res = new Vec2();
  res.set(0, m.at(0, 0) * v.at(0) + m.at(0, 1) * v.at(1));
  res.set(1, m.at(1, 0) * v.at(0) + m.at(1, 1) * v.at(1));
  return res;
}
export class Asteroid {
  constructor(start, velocity, size, orientation) {
    this.edges = [];
    this._center = new Vec2();
    this.vertices = [];
    this.template_idx = 0;
    this.velocity = velocity;
    this.size = size;
    this.position = start;
    this.orientation = orientation;
  }
  get center() {
    return this.position.add(this._center);
  }
  setEdges(edges) {
    this._center = new Vec2([0, 0]);
    const rot = rotation(this.orientation);
    const self = this;
    const scale = sizeToScale(this.size);
    edges.forEach((edge) => {
      let e = new Vec2();
      e.set(0, edge.at(0) * scale);
      e.set(1, edge.at(1) * scale);
      e = multiply(rot, e);
      self.edges.push(e);
      self._center = self._center.add(e);
    });
    this._center.set(0, this._center.at(0) / edges.length);
    this._center.set(1, this._center.at(1) / edges.length);
    this.calculateVertices();
  }
  calculateVertices() {
    for (let i = 0; i < this.edges.length; ++i) {
      let j = i + 1 < this.edges.length ? i + 1 : 0;
      const p1 = this.edges[i] ?? new Vec2();
      const p2 = this.edges[j] ?? new Vec2();
      this.vertices.push(new Vertex(p1, p2));
    }
  }
  tick() {
    this.position = this.position.add(this.velocity);
  }
}
const _Ship = class {
  constructor() {
    this.position = new Vec2([0, 0]);
    this.directedVelocity = new Vec2([0, 0]);
    this.velocity = new Velocity(0);
    this.acceleration = 0;
    this.rotation = 0;
  }
  get tip() {
    const tip = new Vec2([0, -20]);
    const rot = rotation(this.rotation);
    return multiply(rot, tip).add(this.position);
  }
  get orientation() {
    const direction = new Vec2([0, 1]);
    const rot = rotation(this.rotation);
    const orientation = multiply(rot, direction);
    return orientation;
  }
  get vertices() {
    return _Ship._vertices;
  }
  get edges() {
    let result = [];
    const rot = rotation(this.rotation);
    _Ship._edges.forEach((edge) => {
      result.push(multiply(rot, edge).add(this.position));
    });
    return result;
  }
  static setEdges(edges) {
    _Ship._edges = edges;
  }
  tick() {
    const dv = new Velocity(this.acceleration * GAME_TICK_MS, GAME_TICK_MS);
    let new_velocity = this.velocity.value_ms + dv.value_ms;
    new_velocity = Math.min(_Ship.max_velocity.value_ms, Math.max(_Ship.min_velocity.value_ms, new_velocity));
    this.velocity.set(new_velocity);
    const orientation = this.orientation;
    const add = new Vec2([
      this.velocity.distance_per_gametick * orientation.at(0),
      this.velocity.distance_per_gametick * orientation.at(1)
    ]);
    this.directedVelocity = add;
    this.position = this.position.add(add);
  }
};
export let Ship = _Ship;
Ship._edges = [];
Ship._vertices = [];
Ship.max_velocity = new Velocity(20, 50);
Ship.min_velocity = new Velocity(-15, 50);
export class Bullet {
  constructor() {
    this.position = new Vec2([0, 0]);
    this.velocity = new Vec2([0, 0]);
  }
  tick() {
    this.position = this.position.add(this.velocity);
  }
}
const _Asteroids = class {
  constructor() {
    this.asteroids = [];
    this.bullets = [];
    this.ship = new Ship();
    this.width = 0;
    this.height = 0;
    this.max_asteroids = 10;
    this.max_x = 0;
    this.max_y = 0;
    this.last_bullet_shot = 0;
    this.bullet_timeout_ms = 198;
    this.score = 0;
    this.raw_score = 0;
    this.ship_hit_cb = () => {
    };
    this.asteroid_hit_cb = (_score) => {
    };
  }
  static populate_templates() {
    _Asteroids.asteroid_templates = [];
    const ast_templates = AsteroidObjects["asteroids"];
    ast_templates.forEach((template) => {
      const edges = [];
      template.forEach((edge_tpl) => {
        const edge = new Vec2([edge_tpl["x"], edge_tpl["y"]]);
        _Asteroids.max_asteroid_dimension = Math.max(_Asteroids.max_asteroid_dimension, edge.length);
        edges.push(edge);
      });
      const asteroid = new Asteroid(new Vec2(), new Vec2(), 0, 0);
      asteroid.setEdges(edges);
      _Asteroids.asteroid_templates.push(asteroid);
    });
    _Asteroids.max_asteroid_dimension = Math.ceil(_Asteroids.max_asteroid_dimension);
    console.log(_Asteroids.max_asteroid_dimension);
    const ship_edges = [];
    AsteroidObjects["ship"].forEach((edge) => {
      ship_edges.push(new Vec2([edge["x"], edge["y"]]));
    });
    Ship.setEdges(ship_edges);
  }
  init(width, height) {
    this.width = width;
    this.height = height;
    this.max_x = width / 2;
    this.max_y = height / 2;
    for (let i = 0; i < this.max_asteroids; ++i) {
      this.addAsteroid();
    }
  }
  start() {
    this.score = 0;
    this.raw_score = 0;
    this.ship.velocity = new Velocity(5, 50);
  }
  createChildAsteroids(asteroid) {
    const result = {
      child1: null,
      child2: null
    };
    const rand_rot = () => {
      const t = (Math.random() - 0.5) * 2;
      return t * 10;
    };
    const size = asteroid.size == 0 ? 1 : 2;
    const pos = asteroid.position;
    {
      const template_idx = Math.floor(Math.random() * _Asteroids.asteroid_templates.length);
      const orientation = Math.random() * 360;
      const rot = rotation(90 + rand_rot());
      const velocity = multiply(rot, asteroid.velocity);
      const child = new Asteroid(pos, velocity, size, orientation);
      child.setEdges(_Asteroids.asteroid_templates[template_idx].edges);
      child.template_idx = template_idx;
      result.child1 = child;
    }
    {
      const template_idx = Math.floor(Math.random() * _Asteroids.asteroid_templates.length);
      const orientation = Math.random() * 360;
      const rot = rotation(-90 + rand_rot());
      const velocity = multiply(rot, asteroid.velocity);
      const child = new Asteroid(pos, velocity, size, orientation);
      child.setEdges(_Asteroids.asteroid_templates[template_idx].edges);
      child.template_idx = template_idx;
      result.child2 = child;
    }
    return result;
  }
  addAsteroid() {
    const randX = (Math.random() - 0.5) * 0.4;
    const randY = (Math.random() - 0.5) * 0.4;
    const startX = (randX + (randX < 0 ? -0.8 : 0.8)) * this.max_x;
    const startY = (randY + (randY < 0 ? -0.8 : 0.8)) * this.max_y;
    const dirX = startX < 0 ? 1 : -1;
    const dirY = startY < 0 ? 1 : -1;
    const velocityX = new Velocity((Math.random() * 5 + 1) * dirX, 50).distance_per_gametick;
    const velocityY = new Velocity((Math.random() * 5 + 1) * dirY, 50).distance_per_gametick;
    const orientation = 0;
    const template_idx = Math.floor(Math.random() * _Asteroids.asteroid_templates.length);
    const asteroid = new Asteroid(new Vec2([startX, startY]), new Vec2([velocityX, velocityY]), 0, orientation);
    asteroid.setEdges(_Asteroids.asteroid_templates[template_idx].edges);
    asteroid.template_idx = template_idx;
    this.asteroids.push(asteroid);
  }
  tick() {
    let todelete = [];
    this.ship.tick();
    {
      const x = this.ship.position.at(0);
      const y = this.ship.position.at(1);
      if (Math.abs(x) > this.max_x + 10) {
        this.ship.position.set(0, -x);
      }
      if (Math.abs(y) > this.max_y + 10) {
        this.ship.position.set(1, -y);
      }
    }
    this.asteroids.forEach((asteroid, idx) => {
      asteroid.tick();
      const x = asteroid.position.at(0);
      const y = asteroid.position.at(1);
      if (Math.abs(x) > this.max_x + 30 || Math.abs(y) > this.max_y + 30) {
        todelete.push(idx);
      }
    });
    todelete.reverse().forEach((idx) => {
      this.asteroids.splice(idx, 1);
    });
    todelete = [];
    this.bullets.forEach((bullet, idx) => {
      bullet.tick();
      const x = bullet.position.at(0);
      const y = bullet.position.at(1);
      if (Math.abs(x) > this.max_x + 5 || Math.abs(y) > this.max_y + 5) {
        todelete.push(idx);
      }
    });
    todelete.reverse().forEach((idx) => {
      this.bullets.splice(idx, 1);
    });
    this.calculateBulletHits();
    while (this.asteroids.length < this.max_asteroids) {
      this.addAsteroid();
    }
    if (this.calculateShipHit()) {
      this.ship_hit_cb();
    }
  }
  calculateBulletHits() {
    const confirmed = [];
    const potentials = [];
    let hits = 0;
    const confirmedIdx = new Set();
    const safeDistance = _Asteroids.max_asteroid_dimension + 20;
    this.bullets.forEach((bullet, bulledIdx) => {
      this.asteroids.forEach((asteroid, asteroidIdx) => {
        if (asteroid.center.subtract(bullet.position).length < safeDistance) {
          potentials.push({
            asteroid,
            asteroidIdx,
            bullet,
            bulletIdx: bulledIdx
          });
        }
      });
    });
    potentials.forEach((potential) => {
      if (!confirmedIdx.has(potential.asteroidIdx) && isInsideObject(potential.asteroid.vertices, potential.bullet.position.subtract(potential.asteroid.center))) {
        confirmed.push(potential);
        confirmedIdx.add(potential.asteroidIdx);
        ++hits;
      }
    });
    const newAsteroids = [];
    if (confirmed.length == 0) {
      return;
    }
    confirmed.reverse().forEach((conf) => {
      const asteroid = conf.asteroid;
      if (asteroid.size != 2) {
        const tmp = this.createChildAsteroids(asteroid);
        newAsteroids.push(tmp.child1);
        newAsteroids.push(tmp.child2);
      }
      this.bullets.splice(conf.bulletIdx, 1);
      this.asteroids.splice(conf.asteroidIdx, 1);
    });
    newAsteroids.forEach((asteroid) => {
      this.asteroids.push(asteroid);
    });
    let factor = Math.floor(this.raw_score / 250);
    factor = Math.min(9, Math.max(0, factor)) + 1;
    this.raw_score += hits;
    this.score += hits * factor;
    this.asteroid_hit_cb(hits * factor);
  }
  calculateShipHit() {
    const self = this;
    var hit = false;
    const safeDistance = _Asteroids.max_asteroid_dimension + 20;
    this.asteroids.every((asteroid) => {
      self.ship.edges.every((edge) => {
        if (edge.subtract(asteroid.center).length < safeDistance && isInsideObject(asteroid.vertices, edge.subtract(asteroid.center))) {
          hit = true;
          return false;
        }
        return true;
      });
      return !hit;
    });
    return hit;
  }
  rotateShip(direction) {
    const dir = direction == 0 ? 1 : -1;
    this.ship.rotation += dir * 5;
  }
  increaseAcceleration(direction) {
    const factor = direction == 0 ? 1 : -1;
    this.ship.acceleration = Math.min(5, this.ship.acceleration + factor * 0.01);
  }
  decreaseAcceleration() {
    const factor = this.ship.acceleration > 0 ? 1 : -1;
    const acc = Math.max(0, Math.abs(this.ship.acceleration) - 1e-3);
    this.ship.acceleration = acc * factor;
  }
  shootBullet() {
    const now = new Date().getTime();
    if (now - this.last_bullet_shot < this.bullet_timeout_ms) {
      return;
    }
    this.last_bullet_shot = now;
    const bullet = new Bullet();
    const orientation = this.ship.orientation;
    bullet.position = this.ship.tip;
    const linvelocity = new Velocity(30, 50);
    bullet.velocity = new Vec2([
      orientation.at(0) * linvelocity.distance_per_gametick,
      orientation.at(1) * linvelocity.distance_per_gametick
    ]);
    bullet.position.add(bullet.velocity);
    this.bullets.push(bullet);
  }
};
export let Asteroids = _Asteroids;
Asteroids.asteroid_templates = [];
Asteroids.max_asteroid_dimension = 0;
const _Wrapper = class {
  constructor(socket) {
    this.pressedKeys = new Set();
    this.gameState = GameState.Stopped;
    this.asteroid_hit_cb = (_score) => {
    };
    Asteroids.populate_templates();
    this.socket = socket;
    this.game = new Asteroids();
    if (_Wrapper.allowedKeys.size == 0) {
      _Wrapper.allowedKeys.add("ArrowUp");
      _Wrapper.allowedKeys.add("ArrowRight");
      _Wrapper.allowedKeys.add("ArrowDown");
      _Wrapper.allowedKeys.add("ArrowLeft");
      _Wrapper.allowedKeys.add("Space");
    }
    const self = this;
    socket.on("ast.init", async (w, h) => {
      console.log("do init");
      if (!w || !h) {
        return;
      }
      self.init(w, h);
    });
    socket.on("ast.start", () => {
      self.start();
    });
    socket.on("ast.keydown", (key) => {
      self.keydown(key);
    });
    socket.on("ast.keyup", (key) => {
      self.keyup(key);
    });
    socket.on("ast.pause", () => {
      self.gameState = GameState.Paused;
    });
    socket.on("ast.stop", () => {
      self.gameState = GameState.Stopped;
    });
  }
  init(width_reported, height_reported) {
    if (width_reported < 10 || height_reported < 10) {
      this.socket.emit("ast.error", "size too small");
      return;
    }
    width_reported = Math.floor(width_reported);
    height_reported = Math.floor(height_reported);
    this.game = new Asteroids();
    this.gameState = GameState.Stopped;
    const self = this;
    this.game.ship_hit_cb = () => {
      self.gameState = GameState.Dead;
      self.game.score = 0;
      self.game.raw_score = 0;
    };
    this.game.asteroid_hit_cb = (score) => {
      self.asteroid_hit_cb(score);
    };
    let width_client = width_reported;
    while (width_client % 16 != 0) {
      --width_client;
    }
    let height_client = width_client / 16 * 9;
    if (height_client > height_reported) {
      height_client = height_reported;
      while (height_client % 9 != 0) {
        --height_client;
      }
      width_client = height_client / 9 * 16;
    }
    const width = 3840;
    const height = 2160;
    const scale = width_client / width;
    this.game.init(width, height);
    this.socket.emit("ast.initialized", width_client, height_client, scale);
  }
  start() {
    const self = this;
    console.log("Starting game");
    this.game.start();
    this.gameState = GameState.Running;
    setTimeout(() => {
      self.tick();
    }, 500);
    self.socket.emit("ast.started");
  }
  keydown(key) {
    if (!_Wrapper.allowedKeys.has(key)) {
      return;
    }
    if (this.pressedKeys.has(key)) {
      return;
    }
    this.pressedKeys.add(key);
  }
  keyup(key) {
    if (!this.pressedKeys.has(key)) {
      return;
    }
    this.pressedKeys.delete(key);
  }
  tick() {
    if (!IsGameState(this.gameState)) {
      return;
    }
    const self = this;
    if (this.gameState == GameState.Running) {
      if (this.pressedKeys.has("ArrowLeft")) {
        this.game.rotateShip(0);
      } else if (this.pressedKeys.has("ArrowRight")) {
        this.game.rotateShip(1);
      }
      if (this.pressedKeys.has("ArrowUp")) {
        this.game.increaseAcceleration(0);
      } else if (this.pressedKeys.has("ArrowDown")) {
        this.game.increaseAcceleration(1);
      } else {
        this.game.decreaseAcceleration();
      }
      if (this.pressedKeys.has("Space")) {
        this.game.shootBullet();
      }
      this.game.tick();
    }
    const asteroidData = this.asteroidPositions();
    const res = {
      state: this.gameState,
      score: this.game.score,
      ship: {
        position: this.game.ship.position.values,
        orientation: this.game.ship.rotation,
        velocity: this.game.ship.directedVelocity.values
      },
      asteroids: asteroidData,
      bullets: this.bulletPositions()
    };
    this.socket.emit("ast.tick", res);
    setTimeout(() => {
      self.tick();
    }, GAME_TICK_MS);
  }
  asteroidPositions() {
    if (this.game === void 0) {
      return;
    }
    let result = [];
    this.game.asteroids.forEach((asteroid) => {
      const pos = asteroid.position;
      const x = pos.at(0);
      const y = pos.at(1);
      result.push({
        position: [x, y],
        orientation: asteroid.orientation,
        template_idx: asteroid.template_idx,
        scale: sizeToScale(asteroid.size),
        velocity: asteroid.velocity.values
      });
    });
    return result;
  }
  bulletPositions() {
    if (this.game === void 0) {
      return;
    }
    let result = [];
    this.game.bullets.forEach((bullet) => {
      result.push({position: bullet.position.values, velocity: bullet.velocity.values});
    });
    return result;
  }
};
export let Wrapper = _Wrapper;
Wrapper.allowedKeys = new Set();
