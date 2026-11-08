// Builds the list of enemies for each wave.

const Waves = {
  isBossWave(wave) {
    return wave % 5 === 0;
  },

  // Returns a shuffled list of enemy type names to spawn this wave.
  build(wave) {
    let budget = 10 + wave * 6;
    const queue = [];

    if (this.isBossWave(wave)) {
      budget = Math.floor(budget * 0.5);   // boss waves have fewer extras
    }

    const pool = Object.keys(ENEMY_TYPES).filter((k) => {
      const t = ENEMY_TYPES[k];
      return t.cost > 0 && t.unlock <= wave;
    });

    // Newly unlocked types get extra weight so the player actually meets them.
    const weightOf = (k) => (ENEMY_TYPES[k].unlock === wave ? 3 : 1);

    while (budget > 0) {
      const affordable = pool.filter((k) => ENEMY_TYPES[k].cost <= budget);
      if (affordable.length === 0) break;
      const total = affordable.reduce((s, k) => s + weightOf(k), 0);
      let r = Math.random() * total;
      let chosen = affordable[0];
      for (const k of affordable) {
        r -= weightOf(k);
        if (r <= 0) { chosen = k; break; }
      }
      queue.push(chosen);
      budget -= ENEMY_TYPES[chosen].cost;
    }

    shuffle(queue);
    if (this.isBossWave(wave)) {
      queue.splice(Math.min(4, queue.length), 0, 'boss');  // boss arrives early in the wave
    }
    return queue;
  },

  // Names of enemy types that appear for the first time this wave.
  newTypes(wave) {
    const names = Object.values(ENEMY_TYPES).filter((t) => t.unlock === wave).map((t) => t.name);
    if (this.isBossWave(wave) && wave === 5) names.push('Boss');
    return names;
  },

  spawnInterval(wave) {
    return Math.max(0.3, 1.1 - wave * 0.05);
  },

  groupSize(wave) {
    return randInt(1, Math.min(5, 1 + Math.floor(wave / 3)));
  },
};
