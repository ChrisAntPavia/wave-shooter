// Keyboard + mouse state.

const Input = {
  keys: {},
  pressed: {},              // true only on the frame a key went down
  mouse: { x: 0, y: 0, down: false },

  isDown(...names) { return names.some((n) => this.keys[n]); },
  wasPressed(name) { return !!this.pressed[name]; },
  endFrame() { this.pressed = {}; },

  // Mouse position in world coordinates (screen + camera offset).
  worldMouse() {
    return { x: this.mouse.x + Game.camera.x, y: this.mouse.y + Game.camera.y };
  },
};

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (!Input.keys[k]) Input.pressed[k] = true;
  Input.keys[k] = true;
  if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  Input.keys[e.key.toLowerCase()] = false;
});

window.addEventListener('blur', () => {
  Input.keys = {};
  Input.mouse.down = false;
});

window.addEventListener('mousemove', (e) => {
  Input.mouse.x = e.clientX;
  Input.mouse.y = e.clientY;
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) Input.mouse.down = false;
});

// mousedown is bound to the canvas in game.js so clicks on overlay buttons don't fire shots.
window.addEventListener('contextmenu', (e) => e.preventDefault());
