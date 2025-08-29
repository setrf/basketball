import Phaser from 'phaser';

type ArcadeBody = Phaser.Physics.Arcade.Body;
const WIDTH = 1280;
const HEIGHT = 720;

type TeamId = 'blue' | 'red';

class Hoop {
  scene: Phaser.Scene;
  rimL!: Phaser.Physics.Arcade.Image;
  rimR!: Phaser.Physics.Arcade.Image;
  board!: Phaser.Physics.Arcade.Image;
  top!: Phaser.GameObjects.Rectangle & { body: ArcadeBody };
  bot!: Phaser.GameObjects.Rectangle & { body: ArcadeBody };
  x: number; y: number; team: TeamId;
  constructor(scene: Phaser.Scene, x: number, y: number, team: TeamId) {
    this.scene = scene; this.x = x; this.y = y; this.team = team;
    const s = scene as Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics };
    // Board (to the side of the rim)
    this.board = s.physics.add.staticImage(x + (team === 'blue' ? 55 : -55), y - 60, 'px')
      .setScale(12, 80).setTint(0xffffff).setAlpha(0.9).setOrigin(0.5);
    (this.board.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    // Rim edges (open center)
    this.rimL = s.physics.add.staticImage(x - 46, y, 'rimNode');
    this.rimR = s.physics.add.staticImage(x + 46, y, 'rimNode');
    (this.rimL.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    (this.rimR.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    // Sensors
    this.top = s.add.rectangle(x, y - 6, 88, 10, 0xffffff, 0) as any;
    s.physics.add.existing(this.top, true);
    this.bot = s.add.rectangle(x, y + 12, 88, 10, 0xffffff, 0) as any;
    s.physics.add.existing(this.bot, true);
  }
}

class Player {
  scene: Phaser.Scene;
  sprite!: Phaser.Physics.Arcade.Image;
  team: TeamId;
  keys?: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; jump: Phaser.Input.Keyboard.Key; shoot: Phaser.Input.Keyboard.Key };
  isHuman: boolean;
  speed = 320;
  jumpVel = -650;
  hasBall = false;
  facing: 1 | -1 = 1;
  label!: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, x: number, y: number, team: TeamId, isHuman: boolean, texture: string, keys?: Player['keys']) {
    this.scene = scene; this.team = team; this.isHuman = isHuman; this.keys = keys;
    const s = scene as Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics };
    this.sprite = s.physics.add.image(x, y, texture).setCollideWorldBounds(true);
    this.sprite.setBounce(0);
    this.sprite.setDrag(1200, 0);
    this.sprite.setMaxVelocity(500, 1000);
    this.label = scene.add.text(x, y - 50, team.toUpperCase(), { fontSize: '14px', color: '#fff' }).setOrigin(0.5);
  }
  updateLabel() { this.label.setPosition(this.sprite.x, this.sprite.y - 50); }
}

class JamScene extends Phaser.Scene {
  ball!: Phaser.Physics.Arcade.Image;
  ballHolder: Player | null = null;
  hoops!: { left: Hoop; right: Hoop };
  teams = { blue: 0, red: 0 };
  p1!: Player; p2!: Player; a1!: Player; a2!: Player;
  scoreText!: Phaser.GameObjects.Text;
  lastTopPass: { hoop: Hoop | null; at: number } = { hoop: null, at: 0 };

  constructor() { super('jam'); }

  preload() { this.createTextures(); }

  create() {
    this.cameras.main.setBackgroundColor('#0b1020');
    this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);

    const court = this.add.graphics();
    court.lineStyle(6, 0x173158, 1); court.strokeRect(20, 20, WIDTH - 40, HEIGHT - 40);
    court.lineStyle(2, 0x173158, 1); court.strokeCircle(WIDTH * 0.5, HEIGHT * 0.5, 90);

    // Hoops (left hoop belongs to red team; right hoop to blue team)
    this.hoops = {
      left: new Hoop(this, 160, HEIGHT * 0.35, 'red'),
      right: new Hoop(this, WIDTH - 160, HEIGHT * 0.35, 'blue'),
    };

    // Ball
    this.ball = this.physics.add.image(WIDTH * 0.5, HEIGHT * 0.55, 'ball');
    this.ball.setCircle(12); this.ball.setBounce(0.68).setDamping(true).setDrag(0.01).setCollideWorldBounds(true);
    (this.ball.body as ArcadeBody).setMaxSpeed(1600);

    // Players: two per team
    const kb = this.input.keyboard!;
    const keysP1 = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      shoot: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
    };
    const keysP2 = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      shoot: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    };
    this.p1 = new Player(this, 260, HEIGHT - 80, 'blue', true, 'stick_blue', keysP1);
    this.p2 = new Player(this, WIDTH - 260, HEIGHT - 80, 'red', true, 'stick_red', keysP2);
    // AI teammates
    this.a1 = new Player(this, 360, HEIGHT - 80, 'blue', false, 'stick_blue');
    this.a2 = new Player(this, WIDTH - 360, HEIGHT - 80, 'red', false, 'stick_red');

    // Colliders
    const objs = [this.hoops.left.board, this.hoops.left.rimL, this.hoops.left.rimR, this.hoops.right.board, this.hoops.right.rimL, this.hoops.right.rimR];
    objs.forEach(o => this.physics.add.collider(this.ball, o));
    [this.p1, this.p2, this.a1, this.a2].forEach(p => {
      this.physics.add.collider(p.sprite, this.hoops.left.board);
      this.physics.add.collider(p.sprite, this.hoops.right.board);
    });

    // Pickups and steals
    [this.p1, this.p2, this.a1, this.a2].forEach(p => this.physics.add.overlap(this.ball, p.sprite, () => this.tryPickup(p)));

    // Scoring sensors
    this.physics.add.overlap(this.ball, this.hoops.left.top as any, () => this.armHoop(this.hoops.left));
    this.physics.add.overlap(this.ball, this.hoops.left.bot as any, () => this.checkScore(this.hoops.left));
    this.physics.add.overlap(this.ball, this.hoops.right.top as any, () => this.armHoop(this.hoops.right));
    this.physics.add.overlap(this.ball, this.hoops.right.bot as any, () => this.checkScore(this.hoops.right));

    // Score HUD
    this.scoreText = this.add.text(WIDTH * 0.5, 28, 'BLUE 0  -  0 RED', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
  }

  update(_: number, __: number) {
    this.updatePlayer(this.p1, this.hoops.right);
    this.updatePlayer(this.p2, this.hoops.left);
    this.updateAi(this.a1, this.hoops.right);
    this.updateAi(this.a2, this.hoops.left);
    [this.p1, this.p2, this.a1, this.a2].forEach(p => p.updateLabel());
    // Ball follow when held
    if (this.ballHolder) {
      const offX = this.ballHolder.team === 'blue' ? 18 : -18;
      this.ball.setPosition(this.ballHolder.sprite.x + offX, this.ballHolder.sprite.y - 20);
    }
  }

  // Textures
  createTextures() {
    const g = this.add.graphics();
    // ball
    g.clear(); g.fillStyle(0xff7a00, 1); g.fillCircle(12, 12, 12);
    g.lineStyle(2, 0x512300, 1); g.strokeCircle(12, 12, 10); g.moveTo(2,12); g.lineTo(22,12); g.strokePath(); g.moveTo(12,2); g.lineTo(12,22); g.strokePath();
    g.generateTexture('ball', 24, 24);
    // rim & px
    g.clear(); g.fillStyle(0xff3d3d, 1); g.fillCircle(6,6,6); g.generateTexture('rimNode', 12, 12);
    g.clear(); g.fillStyle(0xffffff, 1); g.fillRect(0,0,1,1); g.generateTexture('px', 1, 1);
    // stick players
    const makeStick = (name: string, color: number) => {
      g.clear(); g.lineStyle(4, 0x000000, 0.6);
      g.fillStyle(color, 1); g.fillRect(6, 20, 12, 36); // torso
      g.fillStyle(0xffffff, 1); g.fillCircle(12, 12, 10); // head
      g.lineBetween(6, 38, 0, 48); g.lineBetween(18, 38, 24, 48); // arms
      g.lineBetween(10, 56, 6, 70); g.lineBetween(14, 56, 18, 70); // legs
      g.generateTexture(name, 24, 72);
    };
    makeStick('stick_blue', 0x4dabff);
    makeStick('stick_red', 0xff5a5a);
    g.destroy();
  }

  // Mechanics
  tryPickup(p: Player) {
    if (this.ballHolder && this.ballHolder !== p) {
      // allow steals if ball is slow
      const speed = (this.ball.body as ArcadeBody).speed || 0;
      if (speed < 120) this.dropBall(); else return;
    }
    if (this.ballHolder) return;
    const body = this.ball.body as ArcadeBody;
    if (body.velocity.length() > 300) return;
    this.ballHolder = p;
    body.setAllowGravity(false); body.setVelocity(0, 0);
    this.ball.setBounce(0);
  }

  dropBall() {
    if (!this.ballHolder) return;
    const body = this.ball.body as ArcadeBody;
    this.ballHolder = null;
    body.setAllowGravity(true);
    this.ball.setBounce(0.68);
  }

  shoot(p: Player, towardHoop: Hoop) {
    if (this.ballHolder !== p) return;
    const body = this.ball.body as ArcadeBody;
    this.ballHolder = null; body.setAllowGravity(true);
    this.ball.setBounce(0.68);
    const dir = towardHoop.x > p.sprite.x ? 1 : -1;
    const vx = 480 * dir; const vy = -700;
    body.setVelocity(vx, vy);
  }

  dunkIfPossible(p: Player, hoop: Hoop): boolean {
    const d = Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, hoop.x, hoop.y);
    if (this.ballHolder === p && d < 90 && p.sprite.y < hoop.y + 80) {
      const body = this.ball.body as ArcadeBody;
      this.ballHolder = null; body.setAllowGravity(true);
      this.ball.setPosition(hoop.x, hoop.y + 4);
      body.setVelocity(0, 900);
      return true;
    }
    return false;
  }

  armHoop(hoop: Hoop) {
    const vy = (this.ball.body as ArcadeBody).velocity.y;
    if (vy > 80) { this.lastTopPass = { hoop, at: this.time.now }; }
  }
  checkScore(hoop: Hoop) {
    if (this.lastTopPass.hoop === hoop && this.time.now - this.lastTopPass.at < 900) {
      const scoringTeam: TeamId = hoop.team; // hoop belongs to defender's team
      const pointTeam: TeamId = scoringTeam === 'blue' ? 'red' : 'blue';
      this.teams[pointTeam] += 2;
      this.flashText(pointTeam.toUpperCase() + ' SCORES!');
      this.updateScore();
      this.resetAfterScore(pointTeam);
      this.lastTopPass = { hoop: null, at: 0 };
    }
  }

  updateScore() { this.scoreText.setText(`BLUE ${this.teams.blue}  -  ${this.teams.red} RED`); }

  resetAfterScore(scoringTeam: TeamId) {
    this.dropBall();
    const body = this.ball.body as ArcadeBody; body.setVelocity(0, 0);
    const x = scoringTeam === 'blue' ? WIDTH * 0.25 : WIDTH * 0.75;
    this.ball.setPosition(x, HEIGHT * 0.55);
  }

  flashText(msg: string) {
    const t = this.add.text(WIDTH * 0.5, HEIGHT * 0.18, msg, { fontSize: '36px', color: '#fff' }).setOrigin(0.5);
    t.setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 120, yoyo: true, repeat: 1, onComplete: () => t.destroy() });
  }

  updatePlayer(p: Player, targetHoop: Hoop) {
    if (!p.isHuman || !p.keys) return;
    const k = p.keys; const body = p.sprite.body as ArcadeBody;
    let vx = 0; if (k.left.isDown) { vx -= p.speed; p.facing = -1; } if (k.right.isDown) { vx += p.speed; p.facing = 1; }
    body.setVelocityX(vx);
    if (Phaser.Input.Keyboard.JustDown(k.jump) && Math.abs(body.velocity.y) < 10) {
      body.setVelocityY(p.jumpVel);
      this.dunkIfPossible(p, targetHoop);
    }
    if (Phaser.Input.Keyboard.JustDown(k.shoot)) {
      if (!this.dunkIfPossible(p, targetHoop)) this.shoot(p, targetHoop);
    }
  }

  updateAi(p: Player, targetHoop: Hoop) {
    if (p.isHuman) return;
    const body = p.sprite.body as ArcadeBody;
    const goalX = this.ballHolder && this.ballHolder.team === p.team ? targetHoop.x : this.ball.x;
    const dir = Math.sign(goalX - p.sprite.x) || 0;
    body.setVelocityX(dir * (p.speed * 0.85));
    if (Math.random() < 0.01 && Math.abs(body.velocity.y) < 10 && (Math.abs(p.sprite.x - targetHoop.x) < 140 || Math.abs(p.sprite.x - this.ball.x) < 80)) {
      body.setVelocityY(p.jumpVel);
    }
    if (this.ballHolder === p) {
      const near = Math.abs(p.sprite.x - targetHoop.x) < 220 && p.sprite.y < targetHoop.y + 120;
      if (near) { if (!this.dunkIfPossible(p, targetHoop)) this.shoot(p, targetHoop); }
    }
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0b1020',
  parent: 'game-root',
  width: WIDTH,
  height: HEIGHT,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1300 }, debug: false } },
  scene: [JamScene],
};

new Phaser.Game(config);
