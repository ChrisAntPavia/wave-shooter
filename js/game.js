// Game state machine, main loop, collisions, spawning and HUD.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const Game = {
  state: 'MENU',          // MENU | PLAYING | WAVE_CLEAR | SHOP | PAUSED | GAME_OVER
  wave: 0,
  coins: 0,
  totalCoins: 0,
  kills: 0,
  best: Storage.get('waveShooterBest', 0),

  player: null,
  bullets: [],
  enemyBullets: [],
  enemies: [],
  pickups: [],
  spawnQueue: [],
  spawnTimer: 0,
  stateTimer: 0,
  banner: null,           // { text, sub, time }
  camera: { x: 0, y: 0 },
  view: { w: 0, h: 0 },

  // ---------- Flow ----------
  startRun() {
    this.player = new Player();
    this.wave = 0;
    this.coins = 0;
    this.totalCoins = 0;
    this.kills = 0;
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.pickups = [];
    Effects.reset();
    Shop.reset();
    showOverlay(null);
    this.startWave();
  },

  startWave() {
    this.wave++;
    this.spawnQueue = Waves.build(this.wave);
    this.spawnTimer = 1.2;            // short breather before the first spawn
    this.bullets = [];
    this.enemyBullets = [];
    const fresh = Waves.newTypes(this.wave);
    this.banner = {
      text: Waves.isBossWave(this.wave) ? `WAVE ${this.wave} — BOSS` : `WAVE ${this.wave}`,
      sub: fresh.length ? `New enemy: ${fresh.join(', ')}` : '',
      time: 2.5,
    };
    this.state = 'PLAYING';
  },

  waveCleared() {
    this.state = 'WAVE_CLEAR';
    this.stateTimer = 1.5;
    this.enemyBullets = [];
    for (const p of this.pickups) p.attract = true;
    this.banner = { text: 'WAVE CLEARED!', sub: '', time: 1.5 };
  },

  openShop() {
    // Hand over any coins still flying toward the player.
    for (const p of this.pickups) if (p.kind === 'coin') this.collect(p, true);
    this.pickups = [];
    Input.mouse.down = false;
    this.state = 'SHOP';
    Shop.open();
  },

  closeShop() {
    Shop.close();
    this.startWave();
  },

  gameOver() {
    this.state = 'GAME_OVER';
    Effects.burst(this.player.x, this.player.y, '#4fa3ff', 40, 300, 6);
    Effects.addShake(15);
    const newBest = this.wave > this.best;
    if (newBest) {
      this.best = this.wave;
      Storage.set('waveShooterBest', this.best);
    }
    setTimeout(() => {
      document.getElementById('go-wave').textContent = this.wave;
      document.getElementById('go-kills').textContent = this.kills;
      document.getElementById('go-coins').textContent = this.totalCoins;
      document.getElementById('go-best').textContent = this.best;
      document.getElementById('go-newbest').classList.toggle('hidden', !newBest);
      showOverlay('gameover');
    }, 900);
  },

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      showOverlay('pause');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      showOverlay(null);
    }
  },

  // ---------- Entities ----------
  addEnemy(type, x, y) {
    const e = new Enemy(type, x, y, this.wave);
    this.enemies.push(e);
    return e;
  },

  spawnFromEdge(type) {
    const p = this.player;
    let x, y;
    for (let tries = 0; tries < 12; tries++) {
      const side = randInt(0, 3);
      const m = 20;
      if (side === 0) { x = rand(m, WORLD.w - m); y = m; }
      else if (side === 1) { x = WORLD.w - m; y = rand(m, WORLD.h - m); }
      else if (side === 2) { x = rand(m, WORLD.w - m); y = WORLD.h - m; }
      else { x = m; y = rand(m, WORLD.h - m); }
      if (Math.hypot(x - p.x, y - p.y) > 450) break;
    }
    this.addEnemy(type, x, y);
  },

  killEnemy(e) {
    e.dead = true;
    this.kills++;
    Effects.burst(e.x, e.y, e.color, e.type === 'boss' ? 60 : 14, e.type === 'boss' ? 350 : 200, e.type === 'boss' ? 8 : 5);
    if (e.type === 'boss') Effects.addShake(18);

    // Drop coins: split the value across a few coin pickups.
    const n = Math.min(e.coin, 10);
    const per = Math.floor(e.coin / n);
    let extra = e.coin - per * n;
    for (let i = 0; i < n; i++) {
      this.pickups.push(new Pickup(e.x, e.y, 'coin', per + (extra-- > 0 ? 1 : 0)));
    }
    if (e.type === 'boss' || Math.random() < 0.04) {
      this.pickups.push(new Pickup(e.x, e.y, 'heart', e.type === 'boss' ? 50 : 20));
    }
    e.onDeath();
  },

  collect(p, silent = false) {
    p.dead = true;
    if (p.kind === 'coin') {
      this.coins += p.value;
      this.totalCoins += p.value;
      if (!silent) Effects.text(p.x, p.y - 10, `+${p.value}`, '#ffd23f', 14);
    } else {
      this.player.heal(p.value);
      if (!silent) Effects.text(p.x, p.y - 10, `+${p.value} HP`, '#ff4d6d', 15);
    }
  },

  // ---------- Update ----------
  update(dt) {
    if (DEBUG && (this.state === 'PLAYING')) {
      if (Input.wasPressed('n')) { this.spawnQueue = []; for (const e of this.enemies) e.dead = true; }
      if (Input.wasPressed('c')) this.coins += 1000;
    }

    if (Input.wasPressed('escape')) this.togglePause();

    if (this.banner) {
      this.banner.time -= dt;
      if (this.banner.time <= 0) this.banner = null;
    }

    if (this.state === 'PLAYING' || this.state === 'WAVE_CLEAR') {
      this.updateWorld(dt);
    }

    if (this.state === 'PLAYING') {
      // Spawning
      if (this.spawnQueue.length > 0) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.spawnTimer = Waves.spawnInterval(this.wave);
          const g = Waves.groupSize(this.wave);
          for (let i = 0; i < g && this.spawnQueue.length > 0; i++) {
            this.spawnFromEdge(this.spawnQueue.shift());
          }
        }
      } else if (this.enemies.length === 0) {
        this.waveCleared();
      }

      if (this.player.dead) this.gameOver();
    } else if (this.state === 'WAVE_CLEAR') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this.openShop();
    } else if (this.state === 'GAME_OVER') {
      Effects.update(dt);
    }

    this.updateCamera();
  },

  updateWorld(dt) {
    const player = this.player;
    player.update(dt);

    for (const e of this.enemies) e.update(dt);
    this.separateEnemies();

    for (const b of this.bullets) b.update(dt);
    for (const b of this.enemyBullets) b.update(dt);

    // Player bullets vs enemies
    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead || b.hit.has(e) || !b.sweptHit(e)) continue;
        b.hit.add(e);
        e.hurt(b.damage);
        Effects.burst(b.x, b.y, b.crit ? '#ff9f1c' : '#fff6a8', 4, 120, 3);
        if (b.crit) Effects.text(e.x, e.y - e.radius - 8, 'CRIT!', '#ff9f1c', 13);
        if (e.hp <= 0) this.killEnemy(e);
        if (b.pierce > 0) b.pierce--;
        else { b.dead = true; break; }
      }
    }

    // Enemy contact + enemy bullets vs player
    for (const e of this.enemies) {
      if (!e.dead && circlesHit(e, player)) player.takeDamage(e.damage);
    }
    for (const b of this.enemyBullets) {
      if (!b.dead && circlesHit(b, player)) {
        b.dead = true;
        player.takeDamage(b.damage);
      }
    }

    // Pickups
    for (const p of this.pickups) {
      p.update(dt, player);
      if (!p.dead && dist(p, player) < player.radius + p.radius) this.collect(p);
    }

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.enemyBullets = this.enemyBullets.filter((b) => !b.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.pickups = this.pickups.filter((p) => !p.dead);

    Effects.update(dt);
  },

  // Push overlapping enemies apart so they don't stack into one blob.
  separateEnemies() {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const min = a.radius + b.radius;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        const nx = dx / d, ny = dy / d;
        const wa = a.type === 'boss' ? 0.1 : 1;   // boss barely moves
        const wb = b.type === 'boss' ? 0.1 : 1;
        a.x -= nx * push * wa; a.y -= ny * push * wa;
        b.x += nx * push * wb; b.y += ny * push * wb;
      }
    }
  },

  updateCamera() {
    if (!this.player) return;
    const { w, h } = this.view;
    this.camera.x = WORLD.w > w ? clamp(this.player.x - w / 2, 0, WORLD.w - w) : (WORLD.w - w) / 2;
    this.camera.y = WORLD.h > h ? clamp(this.player.y - h / 2, 0, WORLD.h - h) : (WORLD.h - h) / 2;
  },

  // ---------- Render ----------
  render() {
    const { w, h } = this.view;
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(0, 0, w, h);
    if (!this.player) return;

    ctx.save();
    const sx = Effects.shake > 0 ? rand(-Effects.shake, Effects.shake) : 0;
    const sy = Effects.shake > 0 ? rand(-Effects.shake, Effects.shake) : 0;
    ctx.translate(-this.camera.x + sx, -this.camera.y + sy);

    this.drawFloor();
    for (const p of this.pickups) p.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    for (const b of this.enemyBullets) b.draw(ctx);
    for (const b of this.bullets) b.draw(ctx);
    if (!this.player.dead) this.player.draw(ctx);
    Effects.draw(ctx);

    ctx.restore();

    if (this.state !== 'MENU') this.drawHud();
    if (this.state === 'PLAYING' || this.state === 'WAVE_CLEAR') this.drawCrosshair();
  },

  drawFloor() {
    ctx.fillStyle = '#161a22';
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);

    const grid = 50;
    const x0 = Math.max(0, Math.floor(this.camera.x / grid) * grid);
    const y0 = Math.max(0, Math.floor(this.camera.y / grid) * grid);
    const x1 = Math.min(WORLD.w, this.camera.x + this.view.w);
    const y1 = Math.min(WORLD.h, this.camera.y + this.view.h);
    ctx.strokeStyle = '#1f2430';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += grid) { ctx.moveTo(x, Math.max(0, this.camera.y)); ctx.lineTo(x, y1); }
    for (let y = y0; y <= y1; y += grid) { ctx.moveTo(Math.max(0, this.camera.x), y); ctx.lineTo(x1, y); }
    ctx.stroke();

    ctx.strokeStyle = '#3a4357';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, WORLD.w, WORLD.h);
  },

  drawHud() {
    const p = this.player;
    const { w, h } = this.view;
    ctx.textBaseline = 'middle';

    // HP bar
    const bw = 220, bh = 18;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(16, 16, bw + 4, bh + 4);
    ctx.fillStyle = '#3a1e24';
    ctx.fillRect(18, 18, bw, bh);
    ctx.fillStyle = p.hp / p.stats.maxHp > 0.3 ? '#4cd964' : '#ff5a5a';
    ctx.fillRect(18, 18, bw * clamp(p.hp / p.stats.maxHp, 0, 1), bh);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(p.hp)} / ${p.stats.maxHp}`, 18 + bw / 2, 18 + bh / 2 + 1);

    // Coins
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(18, 50, 14, 14);
    ctx.fillText(`${this.coins}`, 40, 58);

    // Dash cooldown
    if (p.stats.dashUnlocked) {
      const ready = p.dashCd <= 0;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(16, 76, 104, 14);
      ctx.fillStyle = ready ? '#4fa3ff' : '#2a4d75';
      ctx.fillRect(18, 78, 100 * (1 - p.dashCd / p.dashCdMax), 10);
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#c9d6ea';
      ctx.fillText(ready ? 'DASH ready' : 'DASH', 126, 84);
    }

    // Wave + enemies left
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = '#e8ecf3';
    ctx.fillText(`Wave ${this.wave}`, w / 2, 26);
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#9aa4b8';
    ctx.fillText(`Enemies left: ${this.spawnQueue.length + this.enemies.length}`, w / 2, 50);

    // Best wave
    ctx.textAlign = 'right';
    ctx.fillText(`Best: ${this.best}`, w - 18, 26);

    // Boss HP bar
    const boss = this.enemies.find((e) => e.type === 'boss');
    if (boss) {
      const bbw = Math.min(500, w - 80);
      const bx = (w - bbw) / 2, by = h - 44;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 3, by - 3, bbw + 6, 22);
      ctx.fillStyle = '#ff6fb5';
      ctx.fillRect(bx, by, bbw * clamp(boss.hp / boss.maxHp, 0, 1), 16);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillText('BOSS', w / 2, by + 9);
    }

    // Banner
    if (this.banner) {
      const alpha = clamp(this.banner.time / 0.5, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = 'bold 44px "Segoe UI", sans-serif';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(this.banner.text, w / 2, h * 0.28);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.banner.text, w / 2, h * 0.28);
      if (this.banner.sub) {
        ctx.font = 'bold 20px "Segoe UI", sans-serif';
        ctx.lineWidth = 4;
        ctx.strokeText(this.banner.sub, w / 2, h * 0.28 + 42);
        ctx.fillStyle = '#ffb347';
        ctx.fillText(this.banner.sub, w / 2, h * 0.28 + 42);
      }
      ctx.globalAlpha = 1;
    }

    if (DEBUG) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ff5a5a';
      ctx.font = '12px monospace';
      ctx.fillText('DEBUG: N skip wave, C +1000 coins', 16, h - 16);
    }
  },

  drawCrosshair() {
    const { x, y } = Input.mouse;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, TAU);
    ctx.moveTo(x - 14, y); ctx.lineTo(x - 5, y);
    ctx.moveTo(x + 5, y); ctx.lineTo(x + 14, y);
    ctx.moveTo(x, y - 14); ctx.lineTo(x, y - 5);
    ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 14);
    ctx.stroke();
  },
};

// ---------- Overlays ----------
function showOverlay(id) {
  for (const o of ['menu', 'pause', 'gameover']) {
    document.getElementById(o).classList.toggle('hidden', o !== id);
  }
}

document.getElementById('btn-play').addEventListener('click', () => Game.startRun());
document.getElementById('btn-again').addEventListener('click', () => Game.startRun());
document.getElementById('btn-next').addEventListener('click', () => Game.closeShop());
document.getElementById('btn-resume').addEventListener('click', () => Game.togglePause());
document.getElementById('menu-best').textContent = Game.best;

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) Input.mouse.down = true;
});

window.addEventListener('blur', () => {
  if (Game.state === 'PLAYING') Game.togglePause();
});

// ---------- Canvas size ----------
function resize() {
  Game.view.w = canvas.width = window.innerWidth;
  Game.view.h = canvas.height = window.innerHeight;
  Game.updateCamera();
}
window.addEventListener('resize', resize);
resize();

// ---------- Main loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  Game.update(dt);
  Game.render();
  Input.endFrame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
