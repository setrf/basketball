const ball = document.querySelector('.ball');
const hoop = document.querySelector('.hoop');
const scoreDisplay = document.querySelector('.score span');

let score = 0;

ball.addEventListener('click', () => {
  ball.style.animation = 'throw 1s ease-in-out';

  setTimeout(() => {
    const ballRect = ball.getBoundingClientRect();
    const hoopRect = hoop.getBoundingClientRect();

    if (
      ballRect.top > hoopRect.top &&
      ballRect.bottom < hoopRect.bottom &&
      ballRect.left > hoopRect.left &&
      ballRect.right < hoopRect.right
    ) {
      score++;
      scoreDisplay.textContent = score;
    }

    ball.style.animation = '';
  }, 1000);
});
