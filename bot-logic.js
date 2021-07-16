'use strict';

export default class Bot {
  constructor(socket) {
    this.socket = socket;
    this.heldDir = null;
    this.heldSpeed = null;
    this.shooting = false;
    this.gotoCenter = false;
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
    console.log(`Speed ${dir} (${currentSpeed.toFixed(2)})`);
    this.cancelSpeed();
    if (!this.heldSpeed || this.heldSpeed[0] != dir) {
      this.socket.emit("ast.keydown", `Arrow${dir}`);
    }
    this.heldSpeed = [ dir, setTimeout(this.cancelSpeed.bind(this), Math.max(25 * Math.abs(currentSpeed), 40)) ];
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
    // Slow down to a halt
    const velAngle = Math.atan2(shipVel[1], shipVel[0]) * (180.0 / Math.PI);
    const velAngleDiff = this.angDiff(currentAngle, velAngle);
    let currentSpeed = this.dist(shipVel);
    if (velAngleDiff > 95 || velAngleDiff < -95) {
      currentSpeed = -currentSpeed;
    }
    if (currentSpeed < 0) {
      this.speed('Up', currentSpeed);
    } else if (currentSpeed > 1.25) {
      this.speed('Down', currentSpeed);
    }
    // Select target asteroid
    let target = null;
    let targetDistance = null;
    let targetAngleDiff = null;
    let targetCollision = false;
    let shouldShoot = false;
    const distFromCenter = this.dist(shipPos);
    if (!this.gotoCenter && distFromCenter > 500) {
      this.gotoCenter = true
    } else if (this.gotoCenter && distFromCenter < 150) {
      this.gotoCenter = false;
    }
    serverdata.asteroids.forEach((asteroid, index) => {
      let setTarget = false;
      const vel = asteroid.velocity;
      const nowPos = asteroid.position;
      const currentDistance = this.dist([
        nowPos[0] - shipPos[0],
        nowPos[1] - shipPos[1]
      ]);
      let ticksToReach = currentDistance / 38.5;
      let lastTicksToReach;
      let targetPos;
      do {
        targetPos = [
          nowPos[0] + vel[0] * ticksToReach - shipPos[0],
          nowPos[1] + vel[1] * ticksToReach - shipPos[1]
        ];
        lastTicksToReach = ticksToReach;
        ticksToReach = this.dist(targetPos) / 38.5;
      } while (Math.abs(ticksToReach - lastTicksToReach) > 1);
      const desiredAngle = Math.atan2(targetPos[1], targetPos[0]) * (180.0 / Math.PI);
      const angleDiff = this.angDiff(desiredAngle, currentAngle);
      if (Math.abs(angleDiff) < 7.5) {
        shouldShoot = true;
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
        if (!targetCollision || (timeToHit < targetCollision * 0.75 && angleDiff < targetAngleDiff)) {
          target = asteroid;
          targetAngleDiff = angleDiff;
          targetCollision = timeToHit;
        }
      } else if (!targetCollision && !this.gotoCenter) {
        if (targetDistance === null || currentDistance < targetDistance) {
          target = asteroid;
          targetAngleDiff = angleDiff;
          targetDistance = currentDistance;
        }
      }
    });
    if (this.gotoCenter && !targetCollision) {
      const desiredAngle = Math.atan2(-shipPos[1], -shipPos[0]) * (180.0 / Math.PI);
      targetAngleDiff = this.angDiff(desiredAngle, currentAngle);
      target = null; // Should already be null, but whatever.
    }
    if (drawObj) {
      drawObj.setTarget(target, !!targetCollision);
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
  }
};
