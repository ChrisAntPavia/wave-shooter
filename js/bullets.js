// Bullets for both the player and enemies.

class Bullet {
  constructor(x, y, angle, speed, damage, owner, opts = {}) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.owner = owner;                 // 'player' | 'enemy'
    this.pierce = opts.pierce || 0;     // extra enemies it can pass through
    this.crit = !!opts.crit;
    this.radius = opts.radius || (owner === 'player' ? (this.crit ? 6 : 4) : 6);
    this.color = opts.color || (owner === 'player' ? (this.crit ? '#ff9f1c' : '#fff6a8') : '#ff4fd8');
    this.life = 2.5;
    this.hit = new Set();               // enemies already hit (for pierce)
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    const m = 50;
    if (this.life <= 0 || this.x < -m || this.y < -m || this.x > WORLD.w + m || this.y > WORLD.h + m) {
      this.dead = true;
    }
  }

  draw(ctx) {
    if (this.owner === 'enemy') {
      ctx.fillStyle = 'rgba(255, 79, 216, 0.25)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, TAU);
    ctx.fill();
  }
}
