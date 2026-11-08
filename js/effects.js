// Particles, floating text and screen shake.

const Effects = {
  particles: [],
  texts: [],
  shake: 0,

  reset() {
    this.particles = [];
    this.texts = [];
    this.shake = 0;
  },

  burst(x, y, color, count = 12, speed = 180, size = 4) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const s = rand(speed * 0.3, speed);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.3, 0.7),
        maxLife: 0.7,
        size: rand(size * 0.5, size),
        color,
      });
    }
  },

  text(x, y, str, color = '#fff', size = 16) {
    this.texts.push({ x, y, str, color, size, life: 0.9 });
  },

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
  },

  update(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const t of this.texts) {
      t.y -= 40 * dt;
      t.life -= dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);

    this.shake = Math.max(0, this.shake - dt * 30);
  },

  draw(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      ctx.globalAlpha = clamp(t.life / 0.5, 0, 1);
      ctx.font = `bold ${t.size}px "Segoe UI", sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  },
};
