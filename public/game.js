class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // No assets to load for now
  }

  create() {
    this.scene.start('PlayScene');
  }
}

class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayScene' });
  }

  create() {
    this.score = 0;

    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff' });

    this.hoop = this.physics.add.sprite(400, 150, null);
    this.hoop.body.setCircle(30);
    this.hoop.body.setAllowGravity(false);
    this.hoop.body.setImmovable(true);

    this.ball = this.add.text(400, 500, '🏀', { fontSize: '64px' });
    this.physics.world.enable(this.ball);
    this.ball.body.setCircle(32);
    this.ball.body.setCollideWorldBounds(true);
    this.ball.body.setBounce(0.8, 0.8);

    this.input.on('pointerdown', this.startDrag, this);
    this.input.on('pointerup', this.endDrag, this);

    this.physics.add.overlap(this.ball, this.hoop, this.scorePoint, null, this);
  }

  startDrag(pointer) {
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
  }

  endDrag(pointer) {
    this.dragEndX = pointer.x;
    this.dragEndY = pointer.y;

    const dx = this.dragEndX - this.dragStartX;
    const dy = this.dragEndY - this.dragStartY;

    this.ball.body.setVelocity(-dx * 2, -dy * 2);
  }

  scorePoint() {
    this.score++;
    this.scoreText.setText('Score: ' + this.score);
    this.resetBall();
  }

  resetBall() {
    this.ball.body.setVelocity(0, 0);
    this.ball.x = 400;
    this.ball.y = 500;
  }

  update() {
    // Game loop
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
      debug: false
    }
  },
  scene: [BootScene, PlayScene]
};

const game = new Phaser.Game(config);
