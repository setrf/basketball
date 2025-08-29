(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // High-DPI scaling
  function fitCanvas() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    // keep 16:9 base, but fit inside viewport
    let w = 960, h = 540;
    const scale = Math.min(maxW / w, maxH / h);
    w = Math.round(w * scale); h = Math.round(h * scale);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // store logical size for world
    viewW = w; viewH = h;
  }

  let viewW = canvas.clientWidth || 960;
  let viewH = canvas.clientHeight || 540;
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  // World & objects
  const GRAV = 2000; // px/s^2
  const BALL_R = 12;
  const RIM_R = 8;
  let score = 0;
  let armedAt = 0; // armed after crossing top sensor

  const state = {
    ball: { x: 0, y: 0, vx: 0, vy: 0 },
    aiming: false,
    aimStart: { x: 0, y: 0 },
    aimNow: { x: 0, y: 0 },
    ready: true,
  };

  function resetBall() {
    state.ball.x = Math.round(viewW * 0.25);
    state.ball.y = viewH - 120;
    state.ball.vx = 0; state.ball.vy = 0;
    state.ready = true; armedAt = 0;
  }

  // Hoop placement
  function hoop() {
    const x = Math.round(viewW * 0.75);
    const y = Math.round(viewH * 0.35);
    return { x, y, left: { x: x - 44, y }, right: { x: x + 44, y },
             board: { x: x + 56, y: y - 60, w: 12, h: 84 },
             topY: y - 6, botY: y + 10 };
  }

  function setScore(n) {
    score = n;
    const el = document.getElementById('score');
    if (el) el.textContent = 'Score: ' + score;
  }

  // Input
  function canvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y };
  }

  function onDown(e) {
    e.preventDefault();
    if (!state.ready) return;
    const p = canvasPos(e);
    const d2 = (p.x - state.ball.x) ** 2 + (p.y - state.ball.y) ** 2;
    if (Math.sqrt(d2) > BALL_R + 18) return; // start near ball
    state.aiming = true; state.aimStart = p; state.aimNow = p;
  }

  function onMove(e) {
    if (!state.aiming) return;
    state.aimNow = canvasPos(e);
  }

  function onUp(e) {
    if (!state.aiming) return;
    state.aiming = false;
    const dx = state.aimNow.x - state.aimStart.x;
    const dy = state.aimNow.y - state.aimStart.y;
    const v = Math.hypot(dx, dy);
    if (v < 6) return;
    // Launch opposite to drag vector
    const maxPull = 180; // px
    const pull = Math.min(v, maxPull);
    const k = 6; // power scale
    const ux = dx / (v || 1), uy = dy / (v || 1);
    state.ball.vx = -ux * pull * k;
    state.ball.vy = -uy * pull * k;
    state.ready = false;
  }

  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onUp);
  window.addEventListener('keydown', (e) => { if (e.key === 'r' || e.key === 'R') resetBall(); });

  // Physics utilities
  function reflectVelocity(vx, vy, nx, ny, restitution) {
    const dot = vx * nx + vy * ny;
    const rvx = vx - (1 + restitution) * dot * nx;
    const rvy = vy - (1 + restitution) * dot * ny;
    return { vx: rvx, vy: rvy };
  }

  function circleCollide(cx, cy, cr, px, py, pr) {
    const dx = px - cx, dy = py - cy;
    const d = Math.hypot(dx, dy);
    const pen = cr + pr - d;
    if (pen > 0) {
      const nx = (dx || 0.00001) / (d || 0.00001);
      const ny = (dy || 0.00001) / (d || 0.00001);
      return { nx, ny, pen };
    }
    return null;
  }

  function boardCollide(board, px, py, pr) {
    // simple AABB + push out on x
    const { x, y, w, h } = board;
    if (px + pr > x && px - pr < x + w && py + pr > y && py - pr < y + h) {
      const leftPen = (px + pr) - x;
      const rightPen = (x + w) - (px - pr);
      return leftPen < rightPen ? { nx: -1, ny: 0, pen: leftPen } : { nx: 1, ny: 0, pen: rightPen };
    }
    return null;
  }

  // Game loop
  let last = performance.now();
  function step(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(step);
  }

  function update(dt) {
    const h = hoop();
    const b = state.ball;

    // Integrate
    b.vy += GRAV * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Rim collisions
    const rest = 0.55;
    const cL = circleCollide(h.left.x, h.left.y, RIM_R, b.x, b.y, BALL_R);
    if (cL) {
      b.x += cL.nx * cL.pen; b.y += cL.ny * cL.pen;
      const rv = reflectVelocity(b.vx, b.vy, cL.nx, cL.ny, rest);
      b.vx = rv.vx; b.vy = rv.vy;
    }
    const cR = circleCollide(h.right.x, h.right.y, RIM_R, b.x, b.y, BALL_R);
    if (cR) {
      b.x += cR.nx * cR.pen; b.y += cR.ny * cR.pen;
      const rv = reflectVelocity(b.vx, b.vy, cR.nx, cR.ny, rest);
      b.vx = rv.vx; b.vy = rv.vy;
    }

    // Backboard
    const bc = boardCollide(h.board, b.x, b.y, BALL_R);
    if (bc) {
      b.x += bc.nx * bc.pen; b.y += bc.ny * bc.pen;
      const rv = reflectVelocity(b.vx, b.vy, bc.nx, bc.ny, 0.5);
      b.vx = rv.vx; b.vy = rv.vy;
    }

    // Floor bounds
    const floorY = viewH - 10;
    if (b.y > floorY - BALL_R) {
      b.y = floorY - BALL_R;
      b.vy *= -0.45; b.vx *= 0.985;
      if (Math.abs(b.vy) < 30) b.vy = 0;
      if (Math.abs(b.vx) < 15) b.vx = 0;
      if (!state.ready && Math.abs(b.vx) < 5 && Math.abs(b.vy) < 5) {
        // settle then reset shortly
        setTimeout(resetBall, 400);
      }
    }

    // Out of bounds
    if (b.x < -60 || b.x > viewW + 60 || b.y > viewH + 120) resetBall();

    // Scoring sensors
    if (b.vy > 0) {
      // arm when crossing top sensor while descending and within rim span
      if (b.y >= h.topY && (b.y - b.vy * dt) < h.topY && b.x > h.left.x + 4 && b.x < h.right.x - 4) {
        armedAt = performance.now();
      }
      // score when crossing bottom sensor shortly after arming
      if (armedAt && performance.now() - armedAt < 900) {
        if (b.y >= h.botY && (b.y - b.vy * dt) < h.botY && b.x > h.left.x + 4 && b.x < h.right.x - 4) {
          setScore(score + 2);
          armedAt = 0;
          setTimeout(resetBall, 400);
        }
      }
    }
  }

  function drawCourt(h) {
    // Court outer lines
    ctx.strokeStyle = '#173158';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, viewW - 32, viewH - 32);

    // Hoop (rim nodes)
    ctx.fillStyle = '#ff6666';
    ctx.beginPath(); ctx.arc(h.left.x, h.left.y, RIM_R, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(h.right.x, h.right.y, RIM_R, 0, Math.PI * 2); ctx.fill();

    // Backboard
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(h.board.x, h.board.y, h.board.w, h.board.h);
    ctx.globalAlpha = 1;

    // Sensors (debug, hidden) → draw faint
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.moveTo(h.left.x + 2, h.topY); ctx.lineTo(h.right.x - 2, h.topY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(h.left.x + 2, h.botY); ctx.lineTo(h.right.x - 2, h.botY); ctx.stroke();
  }

  function drawBall(b) {
    // shadow
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    const sy = Math.min(viewH - 10, b.y + BALL_R + 30);
    const sx = b.x; const sw = 28; const sh = 6;
    ctx.beginPath(); ctx.ellipse(sx, sy, sw, sh, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // ball
    ctx.fillStyle = '#ff7a00';
    ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#512300'; ctx.lineWidth = 2;
    ctx.stroke();
    // seams
    ctx.beginPath(); ctx.moveTo(b.x - BALL_R + 3, b.y); ctx.lineTo(b.x + BALL_R - 3, b.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x, b.y - BALL_R + 3); ctx.lineTo(b.x, b.y + BALL_R - 3); ctx.stroke();
  }

  function drawAim() {
    if (!state.aiming) return;
    const from = { x: state.ball.x, y: state.ball.y };
    const dx = state.aimNow.x - state.aimStart.x;
    const dy = state.aimNow.y - state.aimStart.y;
    let len = Math.hypot(dx, dy);
    const maxPull = 180; if (len > maxPull) len = maxPull;
    const ux = (dx || 0.0001) / (Math.hypot(dx, dy) || 1);
    const uy = (dy || 0.0001) / (Math.hypot(dx, dy) || 1);
    const end = { x: from.x + ux * len, y: from.y + uy * len };
    ctx.strokeStyle = '#87c5ff'; ctx.lineWidth = 4; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(end.x, end.y); ctx.stroke();
    // Arrow for launch direction (opposite)
    const opp = { x: from.x - ux * 36, y: from.y - uy * 36 };
    const ang = Math.atan2(-uy, -ux);
    const a = 26;
    ctx.beginPath();
    ctx.moveTo(opp.x, opp.y);
    ctx.lineTo(opp.x + Math.cos(ang + Math.PI * 0.75) * a, opp.y + Math.sin(ang + Math.PI * 0.75) * a);
    ctx.moveTo(opp.x, opp.y);
    ctx.lineTo(opp.x + Math.cos(ang - Math.PI * 0.75) * a, opp.y + Math.sin(ang - Math.PI * 0.75) * a);
    ctx.strokeStyle = '#5fb0ff'; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.clearRect(0, 0, viewW, viewH);
    const h = hoop();
    // Background gradient
    const g = ctx.createLinearGradient(0, 0, 0, viewH);
    g.addColorStop(0, '#0b1020'); g.addColorStop(1, '#0e1630');
    ctx.fillStyle = g; ctx.fillRect(0, 0, viewW, viewH);
    drawCourt(h);
    drawBall(state.ball);
    drawAim();
  }

  // Start
  setScore(0);
  resetBall();
  requestAnimationFrame(step);
})();

