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
const ACCEL_STEP = 0.64;

export default class Bot {
  constructor(socket) {
    this.enabled = true;
    this.socket = socket;
    this.heldDir = null;
    this.heldAccel = null;
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
    if (this.enabled && this.heldDir != dir) {
      this.stopTurn();
      this.socket.emit("ast.keydown", `Arrow${dir}`);
      this.heldDir = dir;
    }
  }

  cancelAccel() {
    if (this.heldAccel) {
      this.socket.emit("ast.keyup", `Arrow${this.heldAccel}`);
      this.heldAccel = null;
    }
  }
  accel(dir, currentSpeed) {
    if (this.enabled && (!this.heldAccel || this.heldAccel != dir)) {
      this.cancelAccel();
      this.socket.emit("ast.keydown", `Arrow${dir}`);
      this.heldAccel = dir;
    }
  }

  isEnabled() {
    return this.enabled;
  }
  setEnabled(value) {
    this.enabled = value
    if (!value) {
      this.dead();
    }
    // Make sure all keys are in the expected state.
    this.socket.emit("ast.keyup", "ArrowUp");
    this.socket.emit("ast.keyup", "ArrowDown");
    this.socket.emit("ast.keyup", "ArrowLeft");
    this.socket.emit("ast.keyup", "ArrowRight");
    this.socket.emit("ast.keyup", "Space");
  }

  tick(serverdata, drawObj = null) {
    if (!this.enabled) {
      return;
    }
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

    // Slow down to a halt to make the math simpler.
    const deltaSpeed = this.speedStatus.lastSpeed - currentSpeed;
    const sameSpeed = Math.abs(deltaSpeed) < 1e-3;
    if (this.speedStatus.done && !sameSpeed) {
      // Someone changed the speed.
      this.speedStatus = {};
    }
    if (!this.speedStatus.done) {
      if (!this.heldAccel && sameSpeed && this.speedStatus.count >= 10) {
        // By immediately following a number of ticks with one arrow pressed
        // with the same amount of ticks with the opposite arrow pressed, the
        // added acceleration is accurately cancelled.
        if (Math.abs(currentSpeed) > ACCEL_STEP/2) {
          const times = Math.round(
            Math.sqrt(Math.abs(currentSpeed) / ACCEL_STEP)
          );
          if (currentSpeed < 0) {
            this.speedStatus.next = [['Up', times], ['Down', times]];
          } else {
            this.speedStatus.next = [['Down', times], ['Up', times]];
          }
          console.log(
            `Speed ${currentSpeed.toFixed(2)}:`,
            `${this.speedStatus.next[0][0]} ${times} tick(s)`,
          );
        } else {
          console.log(`Final speed: ${currentSpeed.toFixed(2)}`);
          this.speedStatus.done = true;
        }
      }
      if (this.speedStatus.next && this.speedStatus.next.length > 0) {
        const firstTick = !this.heldAccel;
        this.accel(this.speedStatus.next[0][0], currentSpeed);
        if (firstTick || !sameSpeed) {
          // Ship velocity is clamped, so watch for velocity changes before
          // counting ticks, otherwise this will take forever.
          // No, this will not be completely accurate, but will also only happen
          // if a user accelerates the ship beyond maximum velocity and _then_
          // hands over control to this code.
          this.speedStatus.next[0][1] -= 1;
        }
        if (this.speedStatus.next[0][1] <= 0) {
          this.speedStatus.next.shift();
        }
      } else {
        this.cancelAccel();
      }
      this.speedStatus.lastSpeed = currentSpeed;
      this.speedStatus.count = (sameSpeed && this.speedStatus.count
                                ? this.speedStatus.count + 1
                                : 1);
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
      if (drawObj && drawObj.setShootTargets) {
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
    if (drawObj && drawObj.setTarget) {
      drawObj.setTarget(target, !!targetCollision);
    }
    if (drawObj && drawObj.setShootTargets) {
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
    this.cancelAccel();
    if (this.shooting) {
      this.socket.emit('ast.keyup', 'Space');
      this.shooting = false;
    }
    this.gotoCenter = false;
    this.speedStatus = {};
    this.shootTargets = [];
  }
};
