// The player: movement, aiming, shooting, dashing, health.

class Player {
  constructor() {
    this.x = WORLD.w / 2;
    this.y = WORLD.h / 2;
    this.radius = 16;
    this.angle = 0;

    // Every value here can be changed by shop upgrades.
    this.stats = {
      maxHp: 100,
      speed: 230,
      damage: 10,
      fireRate: 5,          // shots per second
      bulletSpeed: 620,
      bulletCount: 1,
      pierce: 0,
      critChance: 0.05,
      magnetRadius: 90,
      regen: 0,             // HP per second
      dashUnlocked: false,
    };

    this.hp = this.stats.maxHp;
    this.fireCd = 0;
    this.invuln = 0;
    this.hurtFlash = 0;
    this.dashCd = 0;
    this.dashCdMax = 1.2;
    this.dashTime = 0;
    this.dashDir = { x: 0, y: 0 };
    this.dead = false;
  }

  update(dt) {
    // --- Movement ---
    let mx = 0, my = 0;
    if (Input.isDown('w', 'arrowup')) my -= 1;
    if (Input.isDown('s', 'arrowdown')) my += 1;
    if (Input.isDown('a', 'arrowleft')) mx -= 1;
    if (Input.isDown('d', 'arrowright')) mx += 1;
    const len = Math.hypot(mx, my);
    if (len > 0) { mx /= len; my /= len; }

    this.dashCd = Math.max(0, this.dashCd - dt);
    if (this.stats.dashUnlocked && Input.wasPressed(' ') && this.dashCd <= 0 && len > 0) {
      this.dashTime = 0.18;
      this.dashCd = this.dashCdMax;
      this.dashDir = { x: mx, y: my };
      this.invuln = Math.max(this.invuln, 0.25);
      Effects.burst(this.x, this.y, '#4fa3ff', 10, 140, 4);
    }

    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.x += this.dashDir.x * 950 * dt;
      this.y += this.dashDir.y * 950 * dt;
      if (Math.random() < 0.8) Effects.particles.push({
        x: this.x, y: this.y, vx: 0, vy: 0, life: 0.25, maxLife: 0.25, size: 10, color: 'rgba(79,163,255,0.5)',
      });
    } else {
      this.x += mx * this.stats.speed * dt;
      this.y += my * this.stats.speed * dt;
    }
    this.x = clamp(this.x, this.radius, WORLD.w - this.radius);
    this.y = clamp(this.y, this.radius, WORLD.h - this.radius);

    // --- Aim ---
    this.angle = angleTo(this, Input.worldMouse());

    // --- Shooting ---
    this.fireCd -= dt;
    if (Input.mouse.down && this.fireCd <= 0) {
      this.shoot();
      this.fireCd = 1 / this.stats.fireRate;
    }

    // --- Timers / regen ---
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.stats.regen > 0) {
      this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.regen * dt);
    }
  }

  shoot() {
    const n = this.stats.bulletCount;
    const spread = 0.13;
    const muzzle = this.radius + 8;
    for (let i = 0; i < n; i++) {
      const a = this.angle + (i - (n - 1) / 2) * spread;
      const crit = Math.random() < this.stats.critChance;
      Game.bullets.push(new Bullet(
        this.x + Math.cos(this.angle) * muzzle,
        this.y + Math.sin(this.angle) * muzzle,
        a,
        this.stats.bulletSpeed,
        this.stats.damage * (crit ? 2 : 1),
        'player',
        { pierce: this.stats.pierce, crit },
      ));
    }
  }

  takeDamage(amount) {
    if (this.invuln > 0 || this.dead) return;
    this.hp -= amount;
    this.invuln = 0.6;
    this.hurtFlash = 0.25;
    Effects.addShake(8);
    Effects.burst(this.x, this.y, '#ff5a5a', 8, 160, 4);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  heal(amount) {
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
  }

  draw(ctx) {
    // Blink while invulnerable
    if (this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0 && this.dashTime <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Magnet range hint
    ctx.strokeStyle = 'rgba(255, 210, 63, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, this.stats.magnetRadius, 0, TAU);
    ctx.stroke();

    ctx.rotate(this.angle);
    // Barrel
    ctx.fillStyle = '#c9d6ea';
    ctx.fillRect(4, -4, this.radius + 10, 8);
    // Body
    ctx.fillStyle = this.hurtFlash > 0 ? '#ff6b6b' : '#4fa3ff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#1b4f8a';
    ctx.lineWidth = 3;
    ctx.stroke();
    // "Eye" so facing is obvious
    ctx.fillStyle = '#e8f3ff';
    ctx.beginPath();
    ctx.arc(6, 0, 4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
