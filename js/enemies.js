// Enemy definitions and behaviour.
// unlock = first wave the type can spawn, cost = how much of the wave budget it uses.

const ENEMY_TYPES = {
  grunt:    { name: 'Grunt',    hp: 30,   speed: 90,  radius: 14, color: '#e74c3c', damage: 10, coin: 2,  unlock: 1, cost: 1, shape: 'circle' },
  runner:   { name: 'Runner',   hp: 15,   speed: 175, radius: 10, color: '#f1c40f', damage: 6,  coin: 1,  unlock: 2, cost: 1, shape: 'triangle' },
  tank:     { name: 'Tank',     hp: 160,  speed: 50,  radius: 24, color: '#2e8b57', damage: 25, coin: 8,  unlock: 4, cost: 4, shape: 'square' },
  shooter:  { name: 'Shooter',  hp: 40,   speed: 85,  radius: 14, color: '#9b59b6', damage: 9,  coin: 4,  unlock: 5, cost: 3, shape: 'diamond' },
  splitter: { name: 'Splitter', hp: 60,   speed: 75,  radius: 18, color: '#e67e22', damage: 12, coin: 4,  unlock: 7, cost: 3, shape: 'splitter' },
  charger:  { name: 'Charger',  hp: 55,   speed: 70,  radius: 15, color: '#1abc9c', damage: 20, coin: 5,  unlock: 9, cost: 3, shape: 'arrow' },
  boss:     { name: 'Boss',     hp: 1400, speed: 55,  radius: 42, color: '#ff6fb5', damage: 30, coin: 80, unlock: Infinity, cost: 0, shape: 'hexagon' },
};

class Enemy {
  constructor(type, x, y, wave) {
    const t = ENEMY_TYPES[type];
    this.type = type;
    this.def = t;
    this.x = x;
    this.y = y;
    this.wave = wave;

    const hpMult = 1 + 0.12 * (wave - 1);
    this.maxHp = t.hp * hpMult;
    this.hp = this.maxHp;
    this.damage = t.damage * (1 + 0.05 * (wave - 1));
    this.speed = t.speed * Math.min(1.5, 1 + 0.02 * (wave - 1));
    this.radius = t.radius;
    this.color = t.color;
    this.coin = t.coin;

    this.angle = 0;
    this.flash = 0;
    this.dead = false;
    this.spawnAnim = 0.35;   // grows in when spawned

    // Behaviour-specific state
    this.shootCd = rand(1, 2);
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.state = 'walk';
    this.timer = 0;
    this.chargeCd = rand(1, 2);
    this.chargeAngle = 0;
    this.burstCd = 2.5;
    this.summonCd = 6;
  }

  update(dt) {
    const p = Game.player;
    const d = dist(this, p);
    const a = angleTo(this, p);
    this.flash = Math.max(0, this.flash - dt);
    this.spawnAnim = Math.max(0, this.spawnAnim - dt);

    let mvx = 0, mvy = 0, spd = this.speed;

    switch (this.type) {
      case 'shooter': {
        this.angle = a;
        if (d > 340) { mvx = Math.cos(a); mvy = Math.sin(a); }
        else if (d < 220) { mvx = -Math.cos(a); mvy = -Math.sin(a); }
        else {
          const s = a + (Math.PI / 2) * this.strafeDir;
          mvx = Math.cos(s); mvy = Math.sin(s);
          if (Math.random() < dt * 0.3) this.strafeDir *= -1;
        }
        this.shootCd -= dt;
        if (this.shootCd <= 0 && d < 650) {
          this.shootCd = rand(1.5, 2.3);
          Game.enemyBullets.push(new Bullet(this.x, this.y, a, 270, this.damage, 'enemy'));
        }
        break;
      }

      case 'charger': {
        if (this.state === 'walk') {
          this.angle = a;
          mvx = Math.cos(a); mvy = Math.sin(a);
          this.chargeCd -= dt;
          if (this.chargeCd <= 0 && d < 380) {
            this.state = 'wind';
            this.timer = 0.6;
            this.chargeAngle = a;
          }
        } else if (this.state === 'wind') {
          this.timer -= dt;
          this.chargeAngle = a;          // keeps tracking while winding up
          this.angle = a;
          if (this.timer <= 0) { this.state = 'dash'; this.timer = 0.45; }
        } else {
          mvx = Math.cos(this.chargeAngle); mvy = Math.sin(this.chargeAngle);
          spd = 560;
          this.timer -= dt;
          if (this.timer <= 0) { this.state = 'walk'; this.chargeCd = rand(1.2, 2); }
        }
        break;
      }

      case 'boss': {
        this.angle += dt * 0.6;
        mvx = Math.cos(a); mvy = Math.sin(a);
        const enraged = this.hp < this.maxHp / 2;

        this.burstCd -= dt;
        if (this.burstCd <= 0) {
          this.burstCd = enraged ? 1.8 : 2.6;
          const n = enraged ? 20 : 14;
          for (let i = 0; i < n; i++) {
            const ba = this.angle + (i / n) * TAU;
            Game.enemyBullets.push(new Bullet(this.x, this.y, ba, 200, this.damage * 0.5, 'enemy', { radius: 7 }));
          }
        }

        this.summonCd -= dt;
        if (this.summonCd <= 0) {
          this.summonCd = enraged ? 5 : 7;
          for (let i = 0; i < 3; i++) {
            const sa = rand(0, TAU);
            Game.addEnemy('grunt', this.x + Math.cos(sa) * 60, this.y + Math.sin(sa) * 60);
          }
        }
        break;
      }

      default: // grunt, runner, tank, splitter
        this.angle = a;
        mvx = Math.cos(a); mvy = Math.sin(a);
    }

    this.x += mvx * spd * dt;
    this.y += mvy * spd * dt;
    this.x = clamp(this.x, this.radius, WORLD.w - this.radius);
    this.y = clamp(this.y, this.radius, WORLD.h - this.radius);
  }

  hurt(amount) {
    this.hp -= amount;
    this.flash = 0.08;
  }

  // Called by Game when this enemy dies.
  onDeath() {
    if (this.type === 'splitter') {
      for (let i = 0; i < 3; i++) {
        const sa = rand(0, TAU);
        Game.addEnemy('runner', this.x + Math.cos(sa) * 18, this.y + Math.sin(sa) * 18);
      }
    }
  }

  draw(ctx) {
    const r = this.radius * (1 - this.spawnAnim / 0.35 * 0.7);

    // Charger telegraph line
    if (this.type === 'charger' && this.state === 'wind') {
      ctx.strokeStyle = `rgba(26, 188, 156, ${0.3 + 0.5 * Math.abs(Math.sin(this.timer * 30))})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(this.chargeAngle) * 260, this.y + Math.sin(this.chargeAngle) * 260);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    drawShape(ctx, this.def.shape, r);
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 3;
    ctx.stroke();

    if (this.def.shape === 'splitter') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let i = 0; i < 3; i++) {
        const ia = (i / 3) * TAU;
        ctx.beginPath();
        ctx.arc(Math.cos(ia) * r * 0.45, Math.sin(ia) * r * 0.45, r * 0.25, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    // Small HP bar once damaged (boss uses the big HUD bar instead)
    if (this.type !== 'boss' && this.hp < this.maxHp) {
      const w = this.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.x - w / 2, this.y - this.radius - 10, w, 4);
      ctx.fillStyle = '#ff5a5a';
      ctx.fillRect(this.x - w / 2, this.y - this.radius - 10, w * clamp(this.hp / this.maxHp, 0, 1), 4);
    }
  }
}

function drawShape(ctx, shape, r) {
  ctx.beginPath();
  switch (shape) {
    case 'triangle':
      ctx.moveTo(r, 0);
      ctx.lineTo(-r * 0.8, r * 0.8);
      ctx.lineTo(-r * 0.8, -r * 0.8);
      ctx.closePath();
      break;
    case 'square':
      ctx.rect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7);
      break;
    case 'diamond':
      ctx.moveTo(r, 0);
      ctx.lineTo(0, r * 0.8);
      ctx.lineTo(-r, 0);
      ctx.lineTo(0, -r * 0.8);
      ctx.closePath();
      break;
    case 'arrow':
      ctx.moveTo(r * 1.1, 0);
      ctx.lineTo(-r * 0.8, r * 0.85);
      ctx.lineTo(-r * 0.35, 0);
      ctx.lineTo(-r * 0.8, -r * 0.85);
      ctx.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      break;
    default: // circle, splitter
      ctx.arc(0, 0, r, 0, TAU);
  }
}
