# Wave Shooter

A top-down wave shooter that runs straight in the browser — no build step, no server.
Open `index.html` in Chrome, Edge, or Firefox to play.

## Controls
- **WASD** — move
- **Mouse** — aim, **left click** — shoot
- **Space** — dash (unlock it in the shop)
- **Esc** — pause

## Gameplay
- Enemies attack in waves. Each wave is harder and new enemy types show up as you go.
- Killed enemies drop coins. Walk near them to pick them up.
- After every wave a shop opens where you can spend coins on upgrades.
- A boss shows up every 5th wave.
- If you die, the run starts over at wave 1. Your best wave is saved.

## Project layout
| File | Purpose |
|---|---|
| `index.html` | Canvas, menu/shop/game-over overlays, script tags |
| `style.css` | Layout and overlay styling |
| `js/utils.js` | Math helpers, constants, localStorage wrapper |
| `js/input.js` | Keyboard and mouse state |
| `js/effects.js` | Particles, floating text, screen shake |
| `js/bullets.js` | Player and enemy bullets |
| `js/player.js` | Player movement, shooting, dash, health |
| `js/enemies.js` | Enemy types and their behaviour |
| `js/pickups.js` | Coins and heart drops |
| `js/waves.js` | Wave generation |
| `js/shop.js` | Upgrades and shop UI |
| `js/game.js` | Game states, main loop, collisions, HUD |
