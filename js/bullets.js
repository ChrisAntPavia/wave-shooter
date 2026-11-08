// Bullets for both the player and enemies.

class Bullet {
  constructor(x, y, angle, speed, damage, owner, opts = {}) {
    this.x = x;
    this.y = y;
    // Previous position, used for swept collision so fast bullets can't skip over enemies.
    this.px = opts.originX ?? x;
    this.py = opts.originY ?? y;
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
    // On the first frame keep the origin (e.g. player centre) as the sweep start.
    if (this.moved) { this.px = this.x; this.py = this.y; }
    this.moved = true;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    const m = 50;
    if (this.life <= 0 || this.x < -m || this.y < -m || this.x > WORLD.w + m || this.y > WORLD.h + m) {
      this.dead = true;
    }
  }

  // Did this bullet's path this frame pass within range of the circle c?
  sweptHit(c) {
    const r = this.radius + c.radius;
    const sx = this.x - this.px, sy = this.y - this.py;
    const len2 = sx * sx + sy * sy;
    let t = len2 > 0 ? ((c.x - this.px) * sx + (c.y - this.py) * sy) / len2 : 0;
    t = clamp(t, 0, 1);
    const dx = this.px + sx * t - c.x, dy = this.py + sy * t - c.y;
    return dx * dx + dy * dy < r * r;
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
