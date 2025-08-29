const app = new PIXI.Application({ width: 800, height: 600, backgroundColor: 0x0b0f14 });
document.body.appendChild(app.view);

const scoreText = new PIXI.Text('Score: 0', { fontSize: 32, fill: 0xffffff });
scoreText.x = 16;
scoreText.y = 16;
app.stage.addChild(scoreText);

const hoop = new PIXI.Graphics();
hoop.lineStyle(5, 0xff8c00);
hoop.drawRect(350, 150, 100, 20);
app.stage.addChild(hoop);

const ball = new PIXI.Text('🏀', { fontSize: 64 });
ball.anchor.set(0.5);
ball.x = 400;
ball.y = 500;
ball.interactive = true;
ball.buttonMode = true;
app.stage.addChild(ball);

let score = 0;
let dragging = false;
let start = null;
let velocity = { x: 0, y: 0 };
let gravity = 0.5;

ball.on('pointerdown', e => {
  dragging = true;
  start = { x: e.data.global.x, y: e.data.global.y };
});

app.stage.on('pointermove', e => {
  if (dragging) {
    // visual feedback for dragging can be added here
  }
});

app.stage.on('pointerup', e => {
  if (dragging) {
    dragging = false;
    const end = { x: e.data.global.x, y: e.data.global.y };
    velocity.x = (start.x - end.x) / 10;
    velocity.y = (start.y - end.y) / 10;
  }
});

app.ticker.add(() => {
  if (!dragging) {
    velocity.y += gravity;
    ball.x += velocity.x;
    ball.y += velocity.y;

    if (ball.x < 0 || ball.x > app.screen.width) {
      velocity.x *= -1;
    }

    if (ball.y > app.screen.height) {
      resetBall();
    }

    if (checkCollision()) {
      score++;
      scoreText.text = `Score: ${score}`;
      resetBall();
    }
  }
});

function checkCollision() {
  return (
    ball.x > hoop.x &&
    ball.x < hoop.x + hoop.width &&
    ball.y > hoop.y &&
    ball.y < hoop.y + hoop.height
  );
}

function resetBall() {
  ball.x = 400;
  ball.y = 500;
  velocity = { x: 0, y: 0 };
}
