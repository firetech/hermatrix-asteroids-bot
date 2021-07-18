import {mat4} from "./gl-matrix.js";
import {Draw} from "./draw.js";
import {GameState} from "./common.js";
const _DrawGL2 = class extends Draw {
  constructor(canvas, context) {
    super(canvas);
    this.context = context;
    this.program = null;
  }
  init() {
    const vertexShaderSrc = `
    attribute vec3 pos;
    uniform mat4 view;
    uniform mat4 projection;
    uniform mat4 transformation;
    void main() 
      { 
        gl_Position = projection * view * transformation * vec4(pos, 1);
      }
    `;
    const fragementShaderSrc = `
      precision mediump float;
      uniform vec4 fColor;
      void main() { gl_FragColor = fColor; }
    `;
    const gl = this.context;
    this.program = gl.createProgram();
    if (this.program == null) {
      return false;
    }
    const program = this.program;
    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSrc);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragementShaderSrc);
    if (vertexShader == null || fragmentShader == null) {
      return false;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.validateProgram(program);
    return true;
  }
  createShader(type, src) {
    const gl = this.context;
    let s = gl.createShader(type);
    if (s == null) {
      return null;
    }
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  Mesh(arr) {
    const gl = this.context;
    let buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
    return buf;
  }
  renderViewport() {
    const gl = this.context;
    if (this.program == null) {
      return;
    }
    const mesh = this.Mesh([]);
    if (mesh == null) {
      return;
    }
    gl.clearColor(0, 0, 0, 0.6);
    gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
    gl.enableVertexAttribArray(0);
    const viewport = [0, 0, this.canvas.width, this.canvas.height];
    gl.viewport.apply(gl, viewport);
  }
  renderData(data) {
    const gl = this.context;
    if (this.program == null) {
      return;
    }
    let view = mat4.create();
    let ortho_proj = mat4.create();
    const scaleX = _DrawGL2.scaleX;
    const scaleY = _DrawGL2.scaleY;
    mat4.ortho(ortho_proj, -scaleX, scaleX, -scaleY, scaleY, 0.1, 100);
    mat4.lookAt(view, [0, 0, 1], [0, 0, 0], [0, 1, 0]);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "projection"), false, ortho_proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "view"), false, view);
    this.renderShip(data.ship.position, data.ship.orientation);
    data.asteroids.forEach((asteroid) => {
      let mode = 0;
      if (this.target && this.target[0] == asteroid) {
        mode = (this.target[1] ? 1 : 2);
      } else if (this.shootTargets.includes(asteroid)) {
        mode = 3;
      }
      this.renderAsteroid(asteroid.position, asteroid.orientation, asteroid.template_idx, asteroid.scale, mode, asteroid.velocity);
    });
    data.bullets.forEach((bullet) => {
      this.renderBullet(bullet.position, bullet.velocity);
    });
  }
  renderShip(position, orientation) {
    if (this.program == null) {
      return;
    }
    if (this.ship_template.length != 3) {
      return;
    }
    let coords = [];
    coords.push(this.ship_template[0].x, this.ship_template[0].y, 0);
    coords.push(this.ship_template[1].x, this.ship_template[1].y, 0);
    coords.push(this.ship_template[2].x, this.ship_template[2].y, 0);
    const mesh = this.Mesh(coords);
    if (mesh == null) {
      return;
    }
    const gl = this.context;
    const green = [0, 180 / 255, 0, 1];
    const red = [180 / 255, 0, 0, 1];
    const color = this.gameState == GameState.Dead ? red : green;
    let transform = mat4.create();
    mat4.translate(transform, transform, [position[0], position[1], 0]);
    mat4.rotate(transform, transform, orientation / 180 * Math.PI, [0, 0, 1]);
    gl.uniform4fv(gl.getUniformLocation(this.program, "fColor"), color);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "transformation"), false, transform);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  renderAsteroid(position, orientation, template_idx, scale, targetMode, velocity) {
    if (this.program == null) {
      return;
    }
    const gl = this.context;
    const template = this.asteroid_templates[template_idx];
    if (!template) {
      return;
    }
    let coords = [];
    template.forEach((template_coords) => {
      const x = template_coords["x"];
      const y = template_coords["y"];
      coords.push(x, y, 0);
    });
    const mesh = this.Mesh(coords);
    if (mesh == null) {
      return;
    }
    let transform = mat4.create();
    mat4.translate(transform, transform, [position[0], position[1], 0]);
    mat4.rotate(transform, transform, orientation / 180 * Math.PI, [0, 0, 1]);
    mat4.scale(transform, transform, [scale, scale, 1]);
    let color;
    switch (targetMode) {
      case 1:
        color = [1, 0, 0, 1];
        break;
      case 2:
        color = [0.7, 0, 1, 1];
        break;
      case 3:
        color = [0, 0.7, 1, 1];
        break;
      default:
        color = [1, 1, 1, 1];
        break;
    }
    gl.uniform4fv(gl.getUniformLocation(this.program, "fColor"), color);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "transformation"), false, transform);
    const len = coords.length / 3;
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINE_LOOP, 0, len);

    this.renderBullet(position, [velocity[0]*10, velocity[1]*10]);
  }
  renderBullet(position, velocity) {
    if (this.program == null) {
      return;
    }
    const gl = this.context;
    const x = position[0];
    const y = position[1];
    let coords = [];
    coords.push(-10, 0, 0, 10, 0, 0);
    coords.push(0, -10, 0, 0, 10, 0);
    const mesh = this.Mesh(coords);
    if (mesh == null) {
      return;
    }
    let transform = mat4.create();
    mat4.translate(transform, transform, [x, y, 0]);
    const purpleShade = [(144 + Math.floor(Math.random() * 66)) / 255, 0, 1, 1];
    gl.uniform4fv(gl.getUniformLocation(this.program, "fColor"), purpleShade);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "transformation"), false, transform);
    const len = coords.length / 3;
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, len);

    coords = [];
    coords.push(0, 0, 0, velocity[0], velocity[1], 0);
    const mesh2 = this.Mesh(coords);
    if (mesh2 == null) {
      return;
    }
    transform = mat4.create();
    mat4.translate(transform, transform, [x, y, 0]);
    gl.uniform4fv(gl.getUniformLocation(this.program, "fColor"), [0, 1, 0, 1]);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "transformation"), false, transform);
    const len2 = coords.length / 3;
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, len2);
  }
  draw() {
    this.renderViewport();
    if (this.data == null) {
      return;
    }
    const data = this.data;
    const lastTimestamp = Math.max(this.lastDataTimestamp, this.lastDrawTimestamp);
    const now = Date.now();
    const timediff = now - lastTimestamp;
    const factor = (1 / (100 / timediff)) * this.tickFactor;
    if (this.gameState == GameState.Running && timediff < 1e3) {
      data.ship.position = this.addVelocity(data.ship.position, data.ship.velocity, factor);
      data.asteroids.forEach((asteroid, idx) => {
        data.asteroids[idx].position = this.addVelocity(asteroid.position, asteroid.velocity, factor);
      });
      data.bullets.forEach((bullet, idx) => {
        data.bullets[idx].position = this.addVelocity(bullet.position, bullet.velocity, factor);
      });
    }
    this.renderData(data);
    this.lastDrawTimestamp = Date.now();
  }
  addVelocity(pos, velocity, factor) {
    return [
      pos[0] + velocity[0] * factor,
      pos[1] + velocity[1] * factor
    ];
  }
};
export let DrawGL2 = _DrawGL2;
DrawGL2.scaleX = 1920;
DrawGL2.scaleY = 1080;
