import 'phaser';

export default class GameScene extends Phaser.Scene {
  private ball: Phaser.Physics.Arcade.Sprite;
  private hoop: Phaser.Physics.Arcade.Sprite;
  private scoreText: Phaser.GameObjects.Text;
  private score = 0;

  constructor() {
    super('game');
  }

  create() {
    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', color: '#fff' });

    this.hoop = this.physics.add.sprite(400, 150, null);
    this.hoop.body.setCircle(30);
    this.hoop.body.setAllowGravity(false);
    this.hoop.body.setImmovable(true);

    this.ball = this.physics.add.sprite(400, 500, null);
    this.ball.body.setCircle(32);
    this.ball.setCollideWorldBounds(true);
    this.ball.setBounce(0.8, 0.8);

    this.input.on('pointerdown', this.startDrag, this);
    this.input.on('pointerup', this.endDrag, this);

    this.physics.add.overlap(this.ball, this.hoop, this.scorePoint, null, this);
  }

  startDrag(pointer: Phaser.Input.Pointer) {
    this.ball.body.setAllowGravity(false);
    this.ball.body.setVelocity(0, 0);
    this.ball.setPosition(pointer.x, pointer.y);
  }

  endDrag(pointer: Phaser.Input.Pointer) {
    const dx = pointer.x - this.ball.x;
    const dy = pointer.y - this.ball.y;
    this.ball.body.setAllowGravity(true);
    this.ball.body.setVelocity(-dx * 5, -dy * 5);
  }

  scorePoint() {
    this.score++;
    this.scoreText.setText(`Score: ${this.score}`);
    this.resetBall();
  }

  resetBall() {
    this.ball.setPosition(400, 500);
    this.ball.setVelocity(0, 0);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false,
    },
  },
  scene: GameScene,
};

new Phaser.Game(config);
