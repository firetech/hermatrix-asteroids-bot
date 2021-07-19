/*
 * The "brains" of my bot for playing the Asteroid game that was part of the
 * hermatrix.net ARG in July 2021.
 *
 * Copyright 2021 Joakim "firetech" Tufvegren
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

'use strict';

const BULLET_SPEED = 38.4;

export default class Bot {
  constructor(socket) {
    this.socket = socket;
    this.heldDir = null;
    this.heldSpeed = null;
    this.shooting = false;
    this.dead();
  }

  dist(pos) {
    return Math.sqrt(pos[0]*pos[0] + pos[1]*pos[1]);
  }

  angDiff(desired, current) {
    let diff = desired - current;
    diff += (diff > 180 ? -360 : (diff < -180 ? 360 : 0));
    return diff;
  }

  stopTurn() {
    if (this.heldDir) {
      this.socket.emit("ast.keyup", `Arrow${this.heldDir}`);
      this.heldDir = null;
    }
  }
  turn(dir) {
    if (this.heldDir != dir) {
      this.stopTurn();
      this.socket.emit("ast.keydown", `Arrow${dir}`);
      this.heldDir = dir;
    }
  }

  cancelSpeed() {
    if (this.heldSpeed) {
      clearTimeout(this.heldSpeed[1]);
      this.socket.emit("ast.keyup", `Arrow${this.heldSpeed[0]}`);
      this.heldSpeed = null;
    }
  }
  speed(dir, currentSpeed) {
    if (!this.heldSpeed || this.heldSpeed[0] != dir) {
      console.log(`Speed ${dir} (${currentSpeed.toFixed(2)})`);
      this.cancelSpeed();
      this.socket.emit("ast.keydown", `Arrow${dir}`);
      const holdTime = Math.min(Math.max(40, 25 * Math.abs(currentSpeed)), 100);
      this.heldSpeed = [ dir, setTimeout(this.cancelSpeed.bind(this), holdTime) ];
    }
  }

  tick(serverdata, drawObj = null) {
    const ship = serverdata.ship;
    const shipPos = ship.position;
    const shipVel = ship.velocity;
    let currentAngle = (ship.orientation + 90) % 360;
    if (currentAngle < -180) {
      currentAngle += 360;
    } else if (currentAngle > 180) {
      currentAngle -= 360;
    }
    const velAngle = Math.atan2(shipVel[1], shipVel[0]) * (180.0 / Math.PI);
    const velAngleDiff = this.angDiff(currentAngle, velAngle);
    let currentSpeed = this.dist(shipVel);
    if (velAngleDiff > 95 || velAngleDiff < -95) { // Reversing
      currentSpeed = -currentSpeed;
    }

    // Slow down to a halt
    if (!this.speedStatus.done) {
      const sameSpeed = Math.abs(this.speedStatus.lastSpeed - currentSpeed) < 1e-5;
      if (sameSpeed && this.speedStatus.count >= 25) {
        if (currentSpeed < 0 || currentSpeed > 1.25) {
          // Game is lagging too much, skip speed control.
          console.log(`Speed control giving up at ${currentSpeed.toFixed(2)}`);
        } else {
          console.log(`Final speed: ${currentSpeed.toFixed(2)}`);
        }
        this.speedStatus.done = true;
      } else {
        if (currentSpeed < 0) {
          this.speed('Up', currentSpeed);
        } else if (currentSpeed > 1.25) {
          this.speed('Down', currentSpeed);
        } else {
          this.cancelSpeed();
        }
        this.speedStatus = {
          lastSpeed: currentSpeed,
          count: (sameSpeed ? this.speedStatus.count + 1 : 1),
          done: false
        };
      }
    }

    // Select target asteroid
    let target = null;
    let targetDistance = null;
    let targetAngleDiff = null;
    let targetCollision = false;
    let shouldShoot = false;
    const lastShootTargets = this.shootTargets;
    this.shootTargets = [];
    const distFromCenter = this.dist(shipPos);
    if (!this.gotoCenter && distFromCenter > 500) {
      this.gotoCenter = true
    } else if (this.gotoCenter && distFromCenter < 150) {
      this.gotoCenter = false;
    }
    serverdata.asteroids.forEach((asteroid) => {
      let setTarget = false;
      const vel = asteroid.velocity;
      const nowPos = asteroid.position;
      const currentDistance = this.dist([
        nowPos[0] - shipPos[0],
        nowPos[1] - shipPos[1]
      ]);
      let ticksToReach = currentDistance / BULLET_SPEED;
      let lastTicksToReach;
      let targetPos;
      do {
        targetPos = [
          nowPos[0] + vel[0] * ticksToReach - shipPos[0],
          nowPos[1] + vel[1] * ticksToReach - shipPos[1]
        ];
        lastTicksToReach = ticksToReach;
        ticksToReach = this.dist(targetPos) / BULLET_SPEED;
      } while (Math.abs(ticksToReach - lastTicksToReach) > 1);
      const desiredAngle = Math.atan2(targetPos[1], targetPos[0]) * (180.0 / Math.PI);
      const angleDiff = this.angDiff(desiredAngle, currentAngle);
      const inSight = Math.abs(angleDiff) <= 5;
      if (inSight) {
        shouldShoot = true;
      }
      if (drawObj) {
        let foundShootTarget = {};
        const isShootTarget = inSight || lastShootTargets.some(
          (shootTarget) => {
            if(shootTarget.ticksToReach > 0 &&
                shootTarget.template_idx == asteroid.template_idx &&
                shootTarget.scale == asteroid.scale &&
                shootTarget.orientation == asteroid.orientation &&
                shootTarget.velocity[0] == asteroid.velocity[0] &&
                shootTarget.velocity[1] == asteroid.velocity[1] &&
                shootTarget.position[0] + shootTarget.velocity[0] == asteroid.position[0] &&
                shootTarget.position[1] + shootTarget.velocity[1] == asteroid.position[1]) {
              foundShootTarget = shootTarget;
              return true;
            }
            return false;
          });
        if (isShootTarget) {
          this.shootTargets.push({
            ...asteroid,
            obj: asteroid,
            ticksToReach: (inSight ? ticksToReach : foundShootTarget.ticksToReach - 1)
          });
        }
      }

      const relVelocity = -((vel[0] - shipVel[0]) * (nowPos[0] - shipPos[0]) + (vel[1] - shipVel[1]) * (nowPos[1] - shipPos[1])) / currentDistance;
      const timeToHit = currentDistance / relVelocity;
      let collisionRisk = false;
      if (relVelocity > 0 && timeToHit < 150) { // collision seems imminent, check closest point
        const futurePos = [
          nowPos[0] + vel[0] * 100,
          nowPos[1] + vel[1] * 100,
        ];
        // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line#Line_defined_by_two_points
        const closestDistance =
          Math.abs((futurePos[0] - nowPos[0])*(nowPos[1] - shipPos[1]) - (nowPos[0] - shipPos[0])*(futurePos[1] - nowPos[1])) /
            this.dist([futurePos[0] - nowPos[0], futurePos[1] - nowPos[1]]);
        collisionRisk = closestDistance < 150;
      }
      if (collisionRisk) {
        if (!targetCollision || timeToHit < targetCollision * 0.5 || Math.abs(angleDiff) < Math.abs(targetAngleDiff)) {
          target = asteroid;
          targetAngleDiff = angleDiff;
          targetCollision = timeToHit;
        }
      } else if (!targetCollision) {
        if (targetDistance === null || currentDistance < targetDistance) {
          target = asteroid;
          targetAngleDiff = angleDiff;
          targetDistance = currentDistance;
        }
      }
    });
    if (this.gotoCenter && !targetCollision && targetDistance > 300) {
      let centerTarget;
      if (currentSpeed >= 0) {
        // Center is (0, 0), so the heading there is the reverse of the vector given by the current position.
        centerTarget = [-shipPos[0], -shipPos[1]];
      } else {
        // Ship is reversing, so target away from center.
        centerTarget = [shipPos[0], shipPos[1]];
      }
      const desiredAngle = Math.atan2(centerTarget[1], centerTarget[0]) * (180.0 / Math.PI);
      targetAngleDiff = this.angDiff(desiredAngle, currentAngle);
      target = null;
    } else if (this.gotoCenter && distFromCenter <= 300) {
      this.gotoCenter = false;
    }
    if (drawObj) {
      drawObj.setTarget(target, !!targetCollision);
      drawObj.setShootTargets(this.shootTargets.map((data) => data.obj));
    }
    if (shouldShoot && !this.shooting) {
      this.socket.emit('ast.keydown', 'Space');
      this.shooting = true;
    } else if (!shouldShoot && this.shooting) {
      this.socket.emit('ast.keyup', 'Space');
      this.shooting = false;
    }
    if (targetAngleDiff <= -2.5) {
      this.turn('Right');
    } else if (targetAngleDiff >= 2.5) {
      this.turn('Left');
    } else {
      this.stopTurn();
    }
  }
  dead() {
    this.stopTurn();
    this.cancelSpeed();
    if (this.shooting) {
      this.socket.emit('ast.keyup', 'Space');
      this.shooting = false;
    }
    this.gotoCenter = false;
    this.speedStatus = {};
    this.shootTargets = [];
  }
};
