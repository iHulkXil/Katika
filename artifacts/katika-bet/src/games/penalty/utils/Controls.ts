/**
 * Unified Keyboard, Dual-Player & Mobile Touch Controls
 * Preserved from jainalokk/soccer.io src/utils/Controls.js (MIT License)
 * Extended with frame-rate-independent power bar, simultaneous 2P bindings (WASD+Space vs Arrows+Enter),
 * and mobile touch/pointer controls.
 */
import type { Vec2 } from './Physics';

export interface ShootPayload {
  direction: Vec2;
  power: number;
}

export class Controls {
  private keys: Record<string, boolean> = {};

  public direction: Vec2 = { x: 0, y: 0.25 };
  public power = 0;
  public powerDirection = 1;
  public isPowerActive = false;
  public enabled = true;
  public role: 'shoot' | 'save' = 'shoot';
  public usePrimaryWasd = false; // True in simultaneous 2P mode so P1 uses WASD+Space and P2 uses Arrows

  private lastPowerTickTime = 0;
  private powerRafId: number | null = null;
  private onShoot: ((payload: ShootPayload) => void) | null = null;
  private onDive: ((dir: Vec2) => void) | null = null;
  private onChange: (() => void) | null = null;

  constructor() {
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._updatePowerBar = this._updatePowerBar.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  setCallbacks(callbacks: {
    onShoot?: (payload: ShootPayload) => void;
    onDive?: (dir: Vec2) => void;
    onChange?: () => void;
  }): void {
    this.onShoot = callbacks.onShoot ?? null;
    this.onDive = callbacks.onDive ?? null;
    this.onChange = callbacks.onChange ?? null;
  }

  setAimDirection(dir: Vec2): void {
    const len = Math.hypot(dir.x, dir.y);
    if (len > 1) {
      this.direction = { x: dir.x / len, y: dir.y / len };
    } else {
      this.direction = { x: dir.x, y: dir.y };
    }
    this.onChange?.();
  }

  startPowerBar(): void {
    if (!this.enabled || this.role !== 'shoot' || this.isPowerActive) return;
    this.isPowerActive = true;
    this.power = 0.08;
    this.powerDirection = 1;
    this.lastPowerTickTime = performance.now();
    this.onChange?.();
    this._updatePowerBar();
  }

  releaseShot(): void {
    if (!this.isPowerActive) return;
    this.isPowerActive = false;
    if (this.powerRafId !== null) {
      cancelAnimationFrame(this.powerRafId);
      this.powerRafId = null;
    }
    const shotPower = Math.max(0.22, this.power);
    const shotDir = { ...this.direction };
    this.power = 0;
    this.onChange?.();
    this.onShoot?.({ direction: shotDir, power: shotPower });
  }

  triggerTouchDive(dir: Vec2): void {
    if (!this.enabled) return;
    this.onDive?.(dir);
  }

  resetState(): void {
    this.isPowerActive = false;
    this.power = 0;
    this.powerDirection = 1;
    this.direction = { x: 0, y: 0.25 };
    this.keys = {};
    if (this.powerRafId !== null) {
      cancelAnimationFrame(this.powerRafId);
      this.powerRafId = null;
    }
    this.onChange?.();
  }

  private _updatePowerBar(): void {
    if (!this.isPowerActive) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastPowerTickTime) / 1000);
    this.lastPowerTickTime = now;

    // Smooth ~1.35 cycles/sec power oscillation regardless of display refresh rate
    this.power += 1.35 * dt * this.powerDirection;
    if (this.power >= 1) {
      this.power = 1;
      this.powerDirection = -1;
    } else if (this.power <= 0.08) {
      this.power = 0.08;
      this.powerDirection = 1;
    }
    this.onChange?.();
    this.powerRafId = requestAnimationFrame(this._updatePowerBar);
  }

  private _onKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = event.code;
    const isGameKey =
      code.startsWith('Arrow') ||
      code === 'Space' ||
      code === 'KeyW' ||
      code === 'KeyA' ||
      code === 'KeyS' ||
      code === 'KeyD';
    if (isGameKey) {
      event.preventDefault();
    }

    // In simultaneous 2P mode, Arrow keys ALWAYS control the Keeper dive directly!
    if (this.usePrimaryWasd && code.startsWith('Arrow')) {
      const dive: Vec2 = { x: 0, y: 0 };
      if (code === 'ArrowLeft') dive.x = -1;
      if (code === 'ArrowRight') dive.x = 1;
      if (code === 'ArrowUp') dive.y = 0.65;
      if (code === 'ArrowDown') dive.y = -0.3;
      if (dive.x !== 0 || dive.y !== 0) {
        this.onDive?.(dive);
      }
      return;
    }

    // In single/pass-and-play 'save' role, Arrow keys or WASD dive
    if (this.role === 'save') {
      const dive: Vec2 = { x: 0, y: 0 };
      if (code === 'ArrowLeft' || code === 'KeyA') dive.x = -1;
      if (code === 'ArrowRight' || code === 'KeyD') dive.x = 1;
      if (code === 'ArrowUp' || code === 'KeyW') dive.y = 0.65;
      if (code === 'ArrowDown' || code === 'KeyS') dive.y = -0.3;
      if (dive.x !== 0 || dive.y !== 0) {
        this.onDive?.(dive);
      }
      return;
    }

    // Striker aiming & power
    this.keys[code] = true;
    if (code === 'Space' && !event.repeat) {
      this.startPowerBar();
    }
    this._recomputeAimFromKeys();
  }

  private _onKeyUp(event: KeyboardEvent): void {
    const code = event.code;
    this.keys[code] = false;

    if (this.role === 'shoot' && code === 'Space') {
      this.releaseShot();
    }
    this._recomputeAimFromKeys();
  }

  private _recomputeAimFromKeys(): void {
    if (this.role !== 'shoot') return;

    let x = 0;
    let y = 0;

    const left = this.keys['KeyA'] || (!this.usePrimaryWasd && this.keys['ArrowLeft']);
    const right = this.keys['KeyD'] || (!this.usePrimaryWasd && this.keys['ArrowRight']);
    const up = this.keys['KeyW'] || (!this.usePrimaryWasd && this.keys['ArrowUp']);
    const down = this.keys['KeyS'] || (!this.usePrimaryWasd && this.keys['ArrowDown']);

    if (left) x -= 1;
    if (right) x += 1;
    if (up) y += 1;
    if (down) y -= 1;

    if (x !== 0 || y !== 0) {
      // Smooth incremental steer or snappy directional aim
      const len = Math.hypot(x, y);
      this.direction = {
        x: x / len,
        y: Math.max(-0.2, y / len),
      };
      this.onChange?.();
    }
  }

  dispose(): void {
    this.resetState();
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}
