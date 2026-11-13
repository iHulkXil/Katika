/**
 * Ball Physics, Goal Detection & Goalkeeper Save/AI Math
 * Preserved from jainalokk/soccer.io src/utils/Physics.js (MIT License)
 * with frame-rate-independent drag, swept goal-line crossing, post rebound,
 * and calibrated goalkeeper reach.
 */
import * as THREE from 'three';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GoalBounds {
  left: number;
  right: number;
  bottom: number;
  top: number;
  front: number; // Goal line (z = 0)
  back: number;  // Back net (z = -goalDepth)
}

/**
 * Preserved soccer.io shot velocity mapping + difficulty-scaled accuracy spread.
 * Power (0..1) and normalized aim direction produce forward (-Z) trajectory toward goal.
 */
export function calculateBallTrajectory(
  direction: Vec2,
  power: number,
  difficulty: number,
): Vec3 {
  const clampedPower = Math.max(0.22, Math.min(1, power));
  const velocity: Vec3 = {
    x: direction.x * clampedPower * 22,
    y: Math.max(0.18, (direction.y + 0.55) * 0.65) * clampedPower * 16.5,
    z: -(18 + clampedPower * 24), // Fast, crisp 11m penalty flight (~0.32s - 0.55s)
  };

  // Preserved soccer.io spread logic (less randomness at higher difficulty)
  const randomFactor = Math.max(0, (100 - difficulty) / 100);
  velocity.x += (Math.random() * 2 - 1) * randomFactor * 2.4;
  velocity.y += (Math.random() * 2 - 1) * randomFactor * 1.4;

  return velocity;
}

/**
 * Frame-rate-independent ball physics step with gravity, aerodynamic drag, ground bounce, and spin.
 */
export function updateBallPhysics(
  ballMesh: THREE.Object3D,
  velocity: Vec3,
  deltaTime: number,
  ballRadius = 0.22,
): Vec3 {
  const dt = Math.min(deltaTime, 0.05);
  const next: Vec3 = { ...velocity };

  // Gravity
  next.y -= 9.8 * dt;

  // Frame-rate-independent air drag (equivalent to ~0.99/frame at 60fps -> 0.547/sec)
  const drag = Math.pow(0.58, dt);
  next.x *= drag;
  next.y *= drag;
  next.z *= drag;

  // Update position
  ballMesh.position.x += next.x * dt;
  ballMesh.position.y += next.y * dt;
  ballMesh.position.z += next.z * dt;

  // Ground collision & bounce (restitution = 0.6 preserved from soccer.io)
  if (ballMesh.position.y < ballRadius) {
    ballMesh.position.y = ballRadius;
    next.y = -next.y * 0.6;
    // Ground rolling friction
    const groundFriction = Math.pow(0.42, dt);
    next.x *= groundFriction;
    next.z *= groundFriction;
  }

  // Ball spin rotation proportional to velocity
  ballMesh.rotation.x += next.z * dt * 2.2;
  ballMesh.rotation.z -= next.x * dt * 2.2;

  return next;
}

/**
 * Swept goal-line intersection check (fixes soccer.io tunneling & back-net bug).
 * Checks whether the ball segment [prevPos -> currPos] crossed z = 0 inside the goal frame.
 */
export function checkGoalLineCross(
  prevPos: Vec3,
  currPos: Vec3,
  goalBounds: GoalBounds,
  ballRadius = 0.22,
): { crossed: boolean; hitPost: boolean; hitCrossbar: boolean; crossX: number; crossY: number } {
  // Check if ball crossed goal line (z = 0) moving forward (-Z)
  if (prevPos.z >= -0.05 && currPos.z <= 0) {
    const denom = prevPos.z - currPos.z;
    const t = denom > 0.0001 ? Math.max(0, Math.min(1, prevPos.z / denom)) : 1;
    const crossX = prevPos.x + (currPos.x - prevPos.x) * t;
    const crossY = prevPos.y + (currPos.y - prevPos.y) * t;

    const postHalf = 0.14;
    const leftInner = goalBounds.left + ballRadius * 0.65;
    const rightInner = goalBounds.right - ballRadius * 0.65;
    const topInner = goalBounds.top - ballRadius * 0.65;

    const hitLeftPost =
      Math.abs(crossX - goalBounds.left) <= ballRadius + postHalf &&
      crossY <= goalBounds.top + postHalf;
    const hitRightPost =
      Math.abs(crossX - goalBounds.right) <= ballRadius + postHalf &&
      crossY <= goalBounds.top + postHalf;
    const hitCrossbar =
      Math.abs(crossY - goalBounds.top) <= ballRadius + postHalf &&
      crossX >= goalBounds.left - postHalf &&
      crossX <= goalBounds.right + postHalf;

    if (hitLeftPost || hitRightPost || hitCrossbar) {
      return {
        crossed: false,
        hitPost: hitLeftPost || hitRightPost,
        hitCrossbar,
        crossX,
        crossY,
      };
    }

    const insideGoal =
      crossX > leftInner &&
      crossX < rightInner &&
      crossY >= goalBounds.bottom &&
      crossY < topInner;

    return { crossed: insideGoal, hitPost: false, hitCrossbar: false, crossX, crossY };
  }

  // Fallback containment check inside goal net volume
  const insideVolume =
    currPos.z < 0 &&
    currPos.z > goalBounds.back &&
    currPos.x > goalBounds.left + ballRadius * 0.5 &&
    currPos.x < goalBounds.right - ballRadius * 0.5 &&
    currPos.y < goalBounds.top - ballRadius * 0.5 &&
    currPos.y >= goalBounds.bottom;

  return {
    crossed: insideVolume,
    hitPost: false,
    hitCrossbar: false,
    crossX: currPos.x,
    crossY: currPos.y,
  };
}

/**
 * Keep ball inside the net once it enters the goal so it settles realistically instead of passing through back wall.
 */
export function clampBallInsideNet(
  ballMesh: THREE.Object3D,
  velocity: Vec3,
  goalBounds: GoalBounds,
  ballRadius = 0.22,
): boolean {
  let impactedNet = false;
  if (ballMesh.position.z < goalBounds.back + ballRadius) {
    ballMesh.position.z = goalBounds.back + ballRadius;
    velocity.z = Math.abs(velocity.z) * 0.22;
    velocity.x *= 0.45;
    velocity.y *= 0.45;
    impactedNet = true;
  }
  if (ballMesh.position.x < goalBounds.left + ballRadius) {
    ballMesh.position.x = goalBounds.left + ballRadius;
    velocity.x = Math.abs(velocity.x) * 0.35;
    impactedNet = true;
  } else if (ballMesh.position.x > goalBounds.right - ballRadius) {
    ballMesh.position.x = goalBounds.right - ballRadius;
    velocity.x = -Math.abs(velocity.x) * 0.35;
    impactedNet = true;
  }
  if (ballMesh.position.y > goalBounds.top - ballRadius) {
    ballMesh.position.y = goalBounds.top - ballRadius;
    velocity.y = -Math.abs(velocity.y) * 0.35;
    impactedNet = true;
  }
  return impactedNet;
}

/**
 * Calibrated goalkeeper save detection:
 * Checks ball proximity near the goal line (z in [-0.9..0.6]) against keeper torso & outstretched arms/gloves.
 * Higher difficulty improves keeper reflex reach slightly instead of shrinking it.
 */
export function checkSave(
  ballPos: THREE.Vector3,
  keeperPos: THREE.Vector3,
  isDiving: boolean,
  difficulty: number,
): boolean {
  if (ballPos.z > 0.75 || ballPos.z < -1.1) return false;

  const difficultyBonus = (difficulty / 100) * 0.25;
  const reachX = (isDiving ? 1.08 : 0.68) + difficultyBonus;
  const reachY = (isDiving ? 1.15 : 1.05) + difficultyBonus * 0.5;

  // Keeper group origin is at feet (y = 0); torso/gloves center is ~0.95m off ground
  const keeperCenterY = keeperPos.y + 0.95;
  const dx = Math.abs(ballPos.x - keeperPos.x);
  const dy = Math.abs(ballPos.y - keeperCenterY);
  const dz = Math.abs(ballPos.z - keeperPos.z);

  return dx <= reachX && dy <= reachY && dz <= 0.85;
}

/**
 * Preserved soccer.io AI goalkeeper dive prediction scaled by difficulty (1..100).
 */
export function getGoalkeeperDiveDirection(ballVelocity: Vec3, difficulty: number): Vec2 {
  const accuracy = Math.max(0.15, Math.min(0.95, difficulty / 100));
  const normX = THREE.MathUtils.clamp(ballVelocity.x / 18, -1, 1);
  const normY = THREE.MathUtils.clamp((ballVelocity.y - 3.5) / 8, -0.4, 0.9);

  if (Math.random() < accuracy) {
    const jitter = (1 - accuracy) * 0.45;
    return {
      x: THREE.MathUtils.clamp(normX + (Math.random() * 2 - 1) * jitter, -1, 1),
      y: THREE.MathUtils.clamp(normY + (Math.random() * 2 - 1) * jitter * 0.6, -0.4, 0.9),
    };
  }

  // Wrong guess: dive opposite side
  const wrongSign = normX >= 0 ? -1 : 1;
  return {
    x: wrongSign * (0.55 + Math.random() * 0.45),
    y: (Math.random() - 0.3) * 0.7,
  };
}
