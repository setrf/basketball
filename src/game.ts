import Phaser from 'phaser';

// Choose a better default orientation for desktop users.
// Landscape on wide screens, portrait on tall/mobile screens.
const prefersLandscape = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= window.innerHeight;
};
const GAME_WIDTH = prefersLandscape() ? 1280 : 720;
const GAME_HEIGHT = prefersLandscape() ? 720 : 1280;

class MainScene extends Phaser.Scene {
  private ball!: Phaser.Physics.Arcade.Image;
  private rimLeft!: Phaser.Physics.Arcade.Image;
  private rimRight!: Phaser.Physics.Arcade.Image;
  private backboard!: Phaser.Physics.Arcade.Image;
  private sensorTop!: Phaser.Types.Physics.Arcade.GameObjectWithBody;
  private sensorBottom!: Phaser.Types.Physics.Arcade.GameObjectWithBody;

  private aimGfx!: Phaser.GameObjects.Graphics;
  private dragging = false;
  private dragStart = new Phaser.Math.Vector2();
  private canShoot = true;
  private lastShotAt = 0;

  private score = 0;
  private streak = 0;
  private passArmed = false; // armed after top sensor, score when bottom sensor
  private passArmedAt = 0;

  constructor() {
    super('main');
  }

  preload() {
    // Generate simple textures via Graphics at runtime (no external assets)
    this.createGeneratedTextures();
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1020');
    const W = this.scale.width;
    const H = this.scale.height;
    this.physics.world.setBounds(0, 0, W, H);

    // Court baseline (optional visual)
    const gfx = this.add.graphics();
    gfx.lineStyle(4, 0x1c2a4a, 1);
    gfx.strokeRect(16, 16, GAME_WIDTH - 32, GAME_HEIGHT - 32);

    // Backboard & rim placement (right side, upper half)
    const rimX = W - Math.max(120, Math.round(W * 0.12));
    const rimY = Math.round(H * 0.38);

    // Backboard
    this.backboard = this.physics.add.staticImage(rimX + 55, rimY - 60, 'px')
      .setScale(12, 80)
      .setTint(0xffffff)
      .setAlpha(0.8)
      .setOrigin(0.5);
    (this.backboard.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    // Rim edges (two small colliders, open center)
    this.rimLeft = this.physics.add.staticImage(rimX - 46, rimY, 'rimNode');
    this.rimRight = this.physics.add.staticImage(rimX + 46, rimY, 'rimNode');
    (this.rimLeft.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    (this.rimRight.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    // Net sensors (overlaps only)
    this.sensorTop = this.add.rectangle(rimX, rimY - 6, 88, 10, 0xffffff, 0) as any;
    this.physics.add.existing(this.sensorTop, true);
    this.sensorBottom = this.add.rectangle(rimX, rimY + 12, 88, 10, 0xffffff, 0) as any;
    this.physics.add.existing(this.sensorBottom, true);

    // Ball
    this.ball = this.physics.add.image(Math.max(110, Math.round(W * 0.17)), H - 140, 'ball');
    this.ball.setCircle(22).setOffset(-2, -2);
    this.ball.setBounce(0.65);
    this.ball.setDamping(true).setDrag(0.007);
    this.ball.setCollideWorldBounds(true);
    (this.ball.body as Phaser.Physics.Arcade.Body).setMaxSpeed(1500);

    // Colliders
    this.physics.add.collider(this.ball, this.backboard);
    this.physics.add.collider(this.ball, this.rimLeft);
    this.physics.add.collider(this.ball, this.rimRight);

    // Overlaps for scoring
    this.physics.add.overlap(this.ball, this.sensorTop as any, () => {
      // Only arm if moving downward through top sensor
      if ((this.ball.body as Phaser.Physics.Arcade.Body).velocity.y > 80) {
        this.passArmed = true;
        this.passArmedAt = this.time.now;
      }
    });
    this.physics.add.overlap(this.ball, this.sensorBottom as any, () => {
      if (this.passArmed && this.time.now - this.passArmedAt < 800) {
        this.addScore();
        this.passArmed = false;
      }
    });

    // Input & aiming
    this.aimGfx = this.add.graphics();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onPointerUp(p));

    // Hook into DOM HUD pills if present
    this.updateHud();
  }

  update(time: number, delta: number) {
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    // Reset conditions: off-screen or long idle after a shot
    if (this.ball.y > this.scale.height + 200) {
      this.resetBall();
    }
    if (!this.dragging && !this.canShoot) {
      if (body.speed < 30 && time - this.lastShotAt > 1000) {
        this.resetBall();
      }
    }
  }

  private onPointerDown(p: Phaser.Input.Pointer) {
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    const withinBall = Phaser.Math.Distance.Between(p.x, p.y, this.ball.x, this.ball.y) <= 42;
    if (!this.canShoot || !withinBall) return;
    this.dragging = true;
    this.dragStart.set(p.x, p.y);
    body.setVelocity(0, 0);
    this.drawAim(p.x, p.y);
  }

  private onPointerMove(p: Phaser.Input.Pointer) {
    if (!this.dragging) return;
    this.drawAim(p.x, p.y);
  }

  private onPointerUp(p: Phaser.Input.Pointer) {
    if (!this.dragging) return;
    this.dragging = false;

    const dx = p.x - this.dragStart.x;
    const dy = p.y - this.dragStart.y;
    const vec = new Phaser.Math.Vector2(dx, dy);
    const maxPull = 240; // pixels
    if (vec.length() < 10) {
      this.aimGfx.clear();
      return; // tiny pull: ignore
    }
    if (vec.length() > maxPull) vec.setLength(maxPull);

    // Launch opposite to drag vector; scale power
    const power = 6; // tune power multiplier
    const vx = -vec.x * power;
    const vy = -vec.y * power;

    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    body.setVelocity(vx, vy);

    this.canShoot = false;
    this.lastShotAt = this.time.now;
    this.aimGfx.clear();
  }

  private drawAim(x: number, y: number) {
    // draw from ball to pointer, with capped length
    const origin = new Phaser.Math.Vector2(this.ball.x, this.ball.y);
    const target = new Phaser.Math.Vector2(x, y);
    const vec = target.clone().subtract(origin);
    const maxPull = 240;
    if (vec.length() > maxPull) vec.setLength(maxPull);

    const end = origin.clone().add(vec);
    const oppEnd = origin.clone().subtract(vec); // launch direction

    this.aimGfx.clear();
    this.aimGfx.lineStyle(4, 0x87c5ff, 0.9);
    this.aimGfx.beginPath();
    this.aimGfx.moveTo(origin.x, origin.y);
    this.aimGfx.lineTo(end.x, end.y);
    this.aimGfx.strokePath();

    // arrow head pointing launch direction
    const arrowLen = 26;
    const dir = oppEnd.clone().subtract(origin).normalize();
    const base = origin.clone().add(dir.clone().scale(36));
    const left = base.clone().add(dir.clone().rotate(Math.PI * 0.75).scale(arrowLen));
    const right = base.clone().add(dir.clone().rotate(-Math.PI * 0.75).scale(arrowLen));
    this.aimGfx.lineStyle(4, 0x5fb0ff, 0.9);
    this.aimGfx.beginPath();
    this.aimGfx.moveTo(base.x, base.y);
    this.aimGfx.lineTo(left.x, left.y);
    this.aimGfx.moveTo(base.x, base.y);
    this.aimGfx.lineTo(right.x, right.y);
    this.aimGfx.strokePath();
  }

  private addScore() {
    this.score += 1;
    this.streak += 1;
    // small popup text
    const t = this.add.text(this.ball.x, this.ball.y - 30, '+1', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      fontSize: '36px',
      color: '#9cf',
      stroke: '#001',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 600, onComplete: () => t.destroy() });
    this.updateHud();
  }

  private resetBall() {
    this.passArmed = false;
    this.canShoot = true;
    const W = this.scale.width; const H = this.scale.height;
    this.ball.setPosition(Math.max(110, Math.round(W * 0.17)), H - 140);
    this.ball.setVelocity(0, 0);
    (this.ball.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
    // reset streak if last action didn’t score recently
    if (this.time.now - this.passArmedAt > 1200) this.streak = 0;
    this.updateHud();
  }

  private updateHud() {
    const scorePill = document.getElementById('score-pill');
    const streakPill = document.getElementById('streak-pill');
    if (scorePill) scorePill.textContent = `Score: ${this.score}`;
    if (streakPill) streakPill.textContent = `Streak: ${this.streak}`;
  }

  private createGeneratedTextures() {
    // Ball (radial gradient)
    const g = this.add.graphics({ x: 0, y: 0 });
    g.setVisible(false);
    const R = 24;
    const size = R * 2 + 4;
    g.clear();
    g.fillStyle(0xff7a00, 1);
    g.fillCircle(R + 2, R + 2, R);
    g.lineStyle(3, 0x5a2a00, 1);
    // simple basketball seams
    g.strokeCircle(R + 2, R + 2, R - 4);
    g.beginPath();
    g.moveTo(4, R + 2); g.lineTo(size - 4, R + 2); g.strokePath();
    g.beginPath();
    g.moveTo(R + 2, 4); g.lineTo(R + 2, size - 4); g.strokePath();
    g.generateTexture('ball', size, size);

    // Rim node (small circle)
    g.clear();
    g.fillStyle(0xff3d3d, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('rimNode', 12, 12);

    // 1px white pixel (backboard base)
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture('px', 1, 1);
    g.destroy();
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0b1020',
  parent: 'game-root',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1400 },
      debug: false,
    },
  },
  scene: [MainScene],
};

new Phaser.Game(config);
