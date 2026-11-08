// Shop upgrades and the shop overlay UI.

const UPGRADES = [
  { id: 'damage',      name: 'Damage',       desc: '+20% bullet damage',              base: 20, max: 15, apply: (p) => { p.stats.damage *= 1.2; } },
  { id: 'firerate',    name: 'Fire Rate',    desc: '+15% shots per second',           base: 20, max: 12, apply: (p) => { p.stats.fireRate *= 1.15; } },
  { id: 'maxhp',       name: 'Max HP',       desc: '+20 max HP (and heals 20)',       base: 15, max: 15, apply: (p) => { p.stats.maxHp += 20; p.heal(20); } },
  { id: 'heal',        name: 'Full Heal',    desc: 'Restore all HP',                  consumable: true,  apply: (p) => { p.hp = p.stats.maxHp; } },
  { id: 'speed',       name: 'Move Speed',   desc: '+10% movement speed',             base: 15, max: 8,  apply: (p) => { p.stats.speed *= 1.1; } },
  { id: 'multishot',   name: 'Multishot',    desc: '+1 bullet per shot',              base: 50, max: 4,  apply: (p) => { p.stats.bulletCount += 1; } },
  { id: 'pierce',      name: 'Pierce',       desc: 'Bullets pass through +1 enemy',   base: 35, max: 5,  apply: (p) => { p.stats.pierce += 1; } },
  { id: 'bulletspeed', name: 'Bullet Speed', desc: '+15% bullet speed',               base: 12, max: 8,  apply: (p) => { p.stats.bulletSpeed *= 1.15; } },
  { id: 'crit',        name: 'Critical Hit', desc: '+10% chance to deal 2x damage',   base: 25, max: 6,  apply: (p) => { p.stats.critChance += 0.1; } },
  { id: 'magnet',      name: 'Coin Magnet',  desc: '+50% coin pickup radius',         base: 10, max: 6,  apply: (p) => { p.stats.magnetRadius *= 1.5; } },
  { id: 'regen',       name: 'Regeneration', desc: '+0.5 HP per second',              base: 30, max: 8,  apply: (p) => { p.stats.regen += 0.5; } },
  { id: 'dash',        name: 'Dash',         desc: 'Unlock a quick dash on Space with brief invulnerability', base: 40, max: 1, apply: (p) => { p.stats.dashUnlocked = true; } },
];

const Shop = {
  levels: {},

  reset() {
    this.levels = {};
    for (const u of UPGRADES) this.levels[u.id] = 0;
  },

  price(u) {
    if (u.consumable) return 10 + Game.wave * 3;
    return Math.round(u.base * Math.pow(1.5, this.levels[u.id]));
  },

  isMaxed(u) {
    return !u.consumable && this.levels[u.id] >= u.max;
  },

  canBuy(u) {
    if (this.isMaxed(u)) return false;
    if (u.id === 'heal' && Game.player.hp >= Game.player.stats.maxHp) return false;
    return Game.coins >= this.price(u);
  },

  buy(u) {
    if (!this.canBuy(u)) return;
    Game.coins -= this.price(u);
    if (!u.consumable) this.levels[u.id]++;
    u.apply(Game.player);
    this.render();
  },

  open() {
    document.getElementById('shop-wave').textContent = Game.wave;
    document.getElementById('shop').classList.remove('hidden');
    this.render();
  },

  close() {
    document.getElementById('shop').classList.add('hidden');
  },

  render() {
    const p = Game.player;
    document.getElementById('shop-coins').textContent = Game.coins;
    document.getElementById('shop-hp').textContent = `${Math.ceil(p.hp)}/${p.stats.maxHp}`;

    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    for (const u of UPGRADES) {
      const maxed = this.isMaxed(u);
      const card = document.createElement('div');
      card.className = 'card' + (this.canBuy(u) ? '' : ' disabled') + (maxed ? ' maxed' : '');

      const lvl = u.consumable ? '' : `Lv ${this.levels[u.id]}/${u.max}`;
      const price = maxed ? 'MAX' : `${this.price(u)} coins`;
      card.innerHTML = `
        <div class="name">${u.name}</div>
        <div class="desc">${u.desc}</div>
        <div class="meta"><span class="lvl">${lvl}</span><span class="price">${price}</span></div>`;
      card.addEventListener('click', () => this.buy(u));
      grid.appendChild(card);
    }
  },
};
