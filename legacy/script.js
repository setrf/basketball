const ball = document.querySelector('.ball');
const hoop = document.querySelector('.hoop');
const scoreDisplay = document.querySelector('.score span');
const highScoreDisplay = document.querySelector('.high-score span');
const gameArea = document.querySelector('.game-area');
const resetButton = document.querySelector('.reset-button');

let score = 0;
let highScore = localStorage.getItem('basketball-high-score') || 0;
let isDragging = false;
let startX, startY;
let endX, endY;

let hoopX = gameArea.offsetWidth / 2 - 50;
let hoopSpeed = 2;

highScoreDisplay.textContent = highScore;

function moveHoop() {
  hoopX += hoopSpeed;
  if (hoopX + 100 > gameArea.offsetWidth || hoopX < 0) {
    hoopSpeed *= -1;
  }
  hoop.style.left = `${hoopX}px`;
}

ball.addEventListener('mousedown', e => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  ball.style.cursor = 'grabbing';
});

gameArea.addEventListener('mousemove', e => {
  if (!isDragging) return;
  endX = e.clientX;
  endY = e.clientY;
});

gameArea.addEventListener('mouseup', e => {
  if (!isDragging) return;
  isDragging = false;
  ball.style.cursor = 'pointer';

  const dx = endX - startX;
  const dy = endY - startY;

  let velocityX = -dx / 10;
  let velocityY = -dy / 10;

  let gravity = 0.5;
  let ballX = ball.offsetLeft;
  let ballY = ball.offsetTop;

  const gameLoop = setInterval(() => {
    moveHoop();
    velocityX *= 0.99;
    velocityY += gravity;

    ballX += velocityX;
    ballY += velocityY;

    if (ballY + ball.offsetHeight > gameArea.offsetHeight) {
      ballY = gameArea.offsetHeight - ball.offsetHeight;
      velocityY *= -0.8;
    }

    if (ballX < 0 || ballX + ball.offsetWidth > gameArea.offsetWidth) {
      velocityX *= -1;
    }

    ball.style.left = `${ballX}px`;
    ball.style.top = `${ballY}px`;

    if (checkCollision()) {
      score++;
      scoreDisplay.textContent = score;
      if (score > highScore) {
        highScore = score;
        highScoreDisplay.textContent = highScore;
        localStorage.setItem('basketball-high-score', highScore);
      }
      clearInterval(gameLoop);
      resetBall();
    }

    if (ballY > gameArea.offsetHeight) {
      clearInterval(gameLoop);
      resetBall();
    }
  }, 16);
});

function checkCollision() {
  const ballRect = ball.getBoundingClientRect();
  const hoopRect = hoop.getBoundingClientRect();

  return (
    ballRect.left < hoopRect.right &&
    ballRect.right > hoopRect.left &&
    ballRect.top < hoopRect.bottom &&
    ballRect.bottom > hoopRect.top
  );
}

function resetBall() {
  ball.style.left = '50%';
  ball.style.top = 'auto';
  ball.style.bottom = '10px';
}

resetButton.addEventListener('click', () => {
  localStorage.removeItem('basketball-high-score');
  highScore = 0;
  highScoreDisplay.textContent = highScore;
});

setInterval(moveHoop, 16);