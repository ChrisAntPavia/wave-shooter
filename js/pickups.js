// Coins and hearts dropped by enemies.

class Pickup {
  constructor(x, y, kind, value) {
    this.x = x;
    this.y = y;
    this.kind = kind;            // 'coin' | 'heart'
    this.value = value;
    const a = rand(0, TAU);
    const s = rand(60, 180);
    this.vx = Math.cos(a) * s;   // little scatter when dropped
    this.vy = Math.sin(a) * s;
    this.radius = kind === 'coin' ? 6 : 9;
    this.life = 15;
    this.t = rand(0, TAU);
    this.attract = false;        // once true it flies to the player
    this.dead = false;
  }

  update(dt, player) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    const d = dist(this, player);
    if (this.attract || d < player.stats.magnetRadius) {
      this.attract = true;
      const a = angleTo(this, player);
      const pull = 500 + Math.max(0, 300 - d) * 2;
      this.vx += Math.cos(a) * pull * dt * 4;
      this.vy += Math.sin(a) * pull * dt * 4;
      const sp = Math.hypot(this.vx, this.vy);
      const max = 650;
      if (sp > max) { this.vx *= max / sp; this.vy *= max / sp; }
    } else {
      this.vx *= 0.9;
      this.vy *= 0.9;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = clamp(this.x, 0, WORLD.w);
    this.y = clamp(this.y, 0, WORLD.h);
  }

  draw(ctx) {
    // Blink during the last 3 seconds
    if (this.life < 3 && Math.floor(this.life * 8) % 2 === 0) return;

    const bob = Math.sin(this.t * 5) * 2;
    ctx.save();
    ctx.translate(this.x, this.y + bob);

    if (this.kind === 'coin') {
      const squash = Math.abs(Math.cos(this.t * 4));   // spin
      ctx.scale(0.35 + squash * 0.65, 1);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 2;
      ctx.strokeRect(-6, -6, 12, 12);
    } else {
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath();
      ctx.moveTo(0, 7);
      ctx.bezierCurveTo(-12, -2, -6, -11, 0, -4);
      ctx.bezierCurveTo(6, -11, 12, -2, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  }
}
