const DRINKS = [
  { id: 'sprite', name: 'Sprite', rarity: 'blue', weight: 24 },
  { id: 'coca', name: 'Coca Cola', rarity: 'blue', weight: 24 },
  { id: 'fanta', name: 'Fanta', rarity: 'blue', weight: 24 },
  { id: 'pepsi', name: 'Pepsi', rarity: 'blue', weight: 24 },
  { id: 'redbull', name: 'Red Bull', rarity: 'red', weight: 4 },
];

const DRINK_IMAGE_IDS = ['pepsi', 'coca', 'fanta', 'sprite', 'redbull'];

const SPIN_COST = 1;
const SELL_PRICES = { blue: 50, red: 100 };
const INITIAL_BALANCE = 1000;
const REEL_ITEM_H = 84;
const REEL_STRIP_ITEMS = 28;
const REEL_CAN_MARGIN = 1;
const BACKGROUND_BASE_W = 640;
const BACKGROUND_BASE_H = 480;

const WALL_POSTERS = [
  { src: 'assets/among-us.png', x: 26, y: 34, w: 96, h: 134, angle: -0.055 },
  { src: 'assets/comix-zone.png', x: 64, y: 186, w: 96, h: 134, angle: 0.04 },
  { src: 'assets/quackshot.png', x: 512, y: 42, w: 96, h: 134, angle: 0.05 },
  { src: 'assets/doom.png', x: 492, y: 190, w: 96, h: 134, angle: -0.045 },
  { src: 'assets/rdr2.png', x: 204, y: 12, w: 184, h: 118, angle: -0.025 },
];

const state = {
  balance: INITIAL_BALANCE,
  inventory: [],
  spinning: false,
  lastWin: null,
  totalWon: 0,
  capsSpent: 0,
};

let spinSession = null;

const drinkImages = {};

const els = {
  balance: document.getElementById('balance'),
  spinBtn: document.getElementById('spin-btn'),
  openInventory: document.getElementById('open-inventory'),
  closeInventory: document.getElementById('close-inventory'),
  inventoryModal: document.getElementById('inventory-modal'),
  inventoryGrid: document.getElementById('inventory-grid'),
  winModal: document.getElementById('win-modal'),
  winTitle: document.getElementById('win-title'),
  winText: document.getElementById('win-text'),
  winDrink: document.getElementById('win-drink'),
  closeWin: document.getElementById('close-win'),
  message: document.getElementById('message'),
  lastWin: document.getElementById('last-win'),
  totalWon: document.getElementById('total-won'),
  capsSpent: document.getElementById('caps-spent'),
  slots: [
    document.getElementById('slot-0'),
    document.getElementById('slot-1'),
    document.getElementById('slot-2'),
  ],
};

function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function drawCapIcon(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 16, 16);
  const dark = '#4f3b08';
  const edge = '#7a5c12';
  const mid = '#b98d1e';
  const top = '#e0b83c';
  const shine = '#ffe27a';

  const rows = [
    [5, 10],
    [3, 12],
    [2, 13],
    [2, 13],
    [1, 14],
    [2, 13],
    [1, 14],
    [2, 13],
    [2, 13],
    [3, 12],
    [5, 10],
  ];

  rows.forEach(([x0, x1], i) => {
    const y = i + 3;
    for (let x = x0; x <= x1; x++) {
      const isBorder = x === x0 || x === x1 || i === 0 || i === rows.length - 1;
      const isTopHalf = i < 4;
      px(ctx, x, y, isBorder ? dark : (isTopHalf ? top : mid));
    }
  });

  for (let x = 4; x <= 11; x += 2) px(ctx, x, 3, edge);
  for (let x = 3; x <= 13; x += 2) px(ctx, x, 7, edge);
  for (let x = 4; x <= 12; x += 2) px(ctx, x, 11, edge);

  px(ctx, 5, 5, shine);
  px(ctx, 6, 5, shine);
  px(ctx, 5, 6, shine);
  px(ctx, 9, 6, '#f3c94f');
  px(ctx, 10, 7, '#f3c94f');
  px(ctx, 6, 12, '#6a4d0c');
  px(ctx, 7, 12, '#6a4d0c');
}

async function loadDrinkImages() {
  await Promise.all(
    DRINK_IMAGE_IDS.map(async (id) => {
      drinkImages[id] = await loadImage(`assets/drinks/${id}.png`);
    }),
  );
}

function drawCanToContext(ctx, drink, destW, destH, margin = REEL_CAN_MARGIN) {
  const img = drinkImages[drink.id];
  if (!img) return;

  const innerW = destW - margin * 2;
  const innerH = destH - margin * 2;
  const srcAspect = img.width / img.height;

  let drawW = innerW;
  let drawH = drawW / srcAspect;
  let dx = margin;
  let dy = margin + (innerH - drawH) / 2;

  if (drawH < innerH) {
    drawH = innerH;
    drawW = drawH * srcAspect;
    dx = margin + (innerW - drawW) / 2;
    dy = margin;
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

function drawCan(canvas, drink) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCanToContext(ctx, drink, canvas.width, canvas.height);
}

function drawBackground(canvas, posters = []) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const w = canvas.width;
  const h = canvas.height;

  const wall = '#3d2066';
  const wallDark = '#2a1548';
  const wallLight = '#4a2d7a';
  const floor = '#2a1a3e';
  const floorLight = '#3d2858';
  const tile = '#1f1230';

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const isFloor = y > h * 0.72;
      if (isFloor) {
        const tileX = Math.floor(x / 32);
        const tileY = Math.floor((y - h * 0.72) / 16);
        px(ctx, x, y, (tileX + tileY) % 2 ? floor : tile);
      } else {
        px(ctx, x, y, (x + y) % 20 < 2 ? wallDark : ((x * y) % 47 < 3 ? wallLight : wall));
      }
    }
  }

  for (let x = 0; x < w; x++) {
    px(ctx, x, Math.floor(h * 0.72), floorLight);
  }

  const posterScale = Math.min(
    1.75,
    Math.max(0.75, Math.min(w / BACKGROUND_BASE_W, h / BACKGROUND_BASE_H) * 1.2),
  );
  const stageX = Math.round((w - BACKGROUND_BASE_W * posterScale) / 2);
  const stageY = Math.round((h - BACKGROUND_BASE_H * posterScale) / 2);

  posters.forEach(p => drawWallPoster(
    ctx,
    p.img,
    Math.round(stageX + p.x * posterScale),
    Math.round(stageY + p.y * posterScale),
    Math.round(p.w * posterScale),
    Math.round(p.h * posterScale),
    p.angle,
  ));
}

function drawPosterFrame(ctx, x, y, pw, ph) {
  for (let py = 0; py < ph; py++) {
    for (let px_ = 0; px_ < pw; px_++) {
      const border = py < 4 || py >= ph - 4 || px_ < 4 || px_ >= pw - 4;
      const gold = py < 2 || px_ < 2 || py >= ph - 2 || px_ >= pw - 2;
      px(ctx, x + px_, y + py, border ? (gold ? '#f5d76e' : '#8b6914') : '#0d0221');
    }
  }
}

function drawTape(ctx, x, y, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(245, 215, 110, 0.78)';
  ctx.fillRect(-10, -3, 20, 6);
  ctx.fillStyle = 'rgba(255, 241, 166, 0.35)';
  ctx.fillRect(-7, -2, 5, 1);
  ctx.fillRect(2, 1, 6, 1);
  ctx.restore();
}

function drawWallPoster(ctx, img, x, y, w, h, angle = 0) {
  const border = 4;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w, h);

  drawPosterFrame(ctx, -w / 2 - border, -h / 2 - border, w + border * 2, h + border * 2);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);

  drawTape(ctx, -w / 2 + 10, -h / 2 + 6, -0.2);
  drawTape(ctx, w / 2 - 10, -h / 2 + 6, 0.18);
  drawTape(ctx, -w / 2 + 10, h / 2 - 6, 0.16);
  drawTape(ctx, w / 2 - 10, h / 2 - 6, -0.18);

  ctx.restore();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadWallPosters() {
  const loaded = [];
  for (const poster of WALL_POSTERS) {
    try {
      const img = await loadImage(poster.src);
      loaded.push({ ...poster, img });
    } catch (_) {}
  }
  return loaded;
}

function drawMachine(canvas, displayImage = null) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const w = canvas.width;
  const h = canvas.height;

  const body = '#a93226';
  const bodyDark = '#7b241c';
  const bodyLight = '#c0392b';
  const chrome = '#bdc3c7';
  const chromeDark = '#7f8c8d';
  const displayX = 70;
  const displayY = 145;
  const displayW = w - displayX * 2;
  const displayH = 120;

  for (let y = 20; y < h - 10; y++) {
    for (let x = 20; x < w - 20; x++) {
      const edge = x < 28 || x > w - 29 || y < 28 || y > h - 18;
      let col = body;
      if (x < 30) col = bodyDark;
      else if (x > w - 31) col = bodyLight;
      if (edge) col = bodyDark;
      px(ctx, x, y, col);
    }
  }

  for (let y = 40; y < 120; y++) {
    for (let x = 40; x < w - 40; x++) {
      px(ctx, x, y, y < 50 ? chrome : chromeDark);
    }
  }

  for (let y = 130; y < 280; y++) {
    for (let x = 50; x < w - 50; x++) {
      px(ctx, x, y, '#111');
    }
  }

  if (displayImage) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(displayImage, displayX, displayY, displayW, displayH);
  }

  for (let x = 68; x < w - 68; x++) {
    px(ctx, x, 145, chrome);
    px(ctx, x, 265, chromeDark);
  }
  for (let y = 145; y < 266; y++) {
    px(ctx, 68, y, chrome);
    px(ctx, w - 69, y, chromeDark);
  }

  for (let y = 290; y < 340; y++) {
    for (let x = 60; x < w - 60; x++) {
      px(ctx, x, y, (y < 300) ? '#555' : '#333');
    }
  }

  for (let y = 350; y < 390; y++) {
    for (let x = 100; x < w - 100; x++) {
      px(ctx, x, y, y < 360 ? chrome : chromeDark);
    }
  }

  for (let y = h - 30; y < h - 10; y++) {
    for (let x = 30; x < w - 30; x++) {
      px(ctx, x, y, bodyDark);
    }
  }

  px(ctx, 30, 25, '#f5c542');
  px(ctx, w - 31, 25, '#f5c542');
}

function weightedRandom() {
  const total = DRINKS.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const drink of DRINKS) {
    r -= drink.weight;
    if (r <= 0) return drink;
  }
  return DRINKS[0];
}

function showMessage(text, duration = 2500) {
  els.message.textContent = text;
  els.message.classList.add('show');
  clearTimeout(showMessage._timer);
  showMessage._timer = setTimeout(() => els.message.classList.remove('show'), duration);
}

function updateUI() {
  els.balance.textContent = state.balance;
  els.lastWin.textContent = state.lastWin ?? '—';
  els.totalWon.textContent = state.totalWon;
  els.capsSpent.textContent = state.capsSpent;

  if (state.spinning && spinSession) {
    const canStopNextReel = !spinSession.stopInProgress && spinSession.nextStop < 3;
    els.spinBtn.disabled = !canStopNextReel;
    els.spinBtn.textContent = canStopNextReel ? `СТОП ${spinSession.nextStop + 1}` : 'СТОП...';
    return;
  }

  els.spinBtn.disabled = state.balance < SPIN_COST;
  els.spinBtn.textContent = 'КРУТИТЬ (1 🧢)';
}

function renderSlot(canvas, drink) {
  drawCan(canvas, drink);
}

function renderInventory() {
  els.inventoryGrid.innerHTML = '';
  if (state.inventory.length === 0) {
    els.inventoryGrid.innerHTML = '<p class="inventory-empty">Пусто... Крути автомат!</p>';
    return;
  }

  state.inventory.forEach((entry, index) => {
    const drink = DRINKS.find(d => d.id === entry.id);
    const item = document.createElement('div');
    item.className = 'inventory-item';
    item.title = 'Нажми, чтобы продать';

    const cvs = document.createElement('canvas');
    cvs.width = 64;
    cvs.height = 80;
    drawCan(cvs, drink);

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = drink.name;

    const rarity = document.createElement('div');
    rarity.className = `rarity rarity-${drink.rarity}`;
    rarity.textContent = drink.rarity === 'red' ? '★ РЕДКИЙ' : '● ОБЫЧНЫЙ';

    item.appendChild(cvs);
    item.appendChild(name);
    item.appendChild(rarity);

    item.addEventListener('click', () => sellItem(index));
    els.inventoryGrid.appendChild(item);
  });
}

function sellItem(index) {
  const entry = state.inventory[index];
  const drink = DRINKS.find(d => d.id === entry.id);
  const price = SELL_PRICES[drink.rarity];
  state.inventory.splice(index, 1);
  state.balance += price;
  saveGame();
  updateUI();
  renderInventory();
  showMessage(`Продано: ${drink.name} (+${price} 🧢)`);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function buildReelStrip(finalDrink) {
  const strip = document.createElement('canvas');
  strip.width = 68;
  strip.height = REEL_ITEM_H * REEL_STRIP_ITEMS;
  const sctx = strip.getContext('2d');
  sctx.imageSmoothingEnabled = false;

  for (let i = 0; i < REEL_STRIP_ITEMS - 1; i++) {
    const drink = DRINKS[Math.floor(Math.random() * DRINKS.length)];
    const item = document.createElement('canvas');
    item.width = 68;
    item.height = REEL_ITEM_H;
    drawCan(item, drink);
    sctx.drawImage(item, 0, i * REEL_ITEM_H);
  }

  const finalItem = document.createElement('canvas');
  finalItem.width = 68;
  finalItem.height = REEL_ITEM_H;
  drawCan(finalItem, finalDrink);
  sctx.drawImage(finalItem, 0, (REEL_STRIP_ITEMS - 1) * REEL_ITEM_H);

  return strip;
}

function drawReelView(slotCanvas, strip, scrollY) {
  const ctx = slotCanvas.getContext('2d');
  const w = slotCanvas.width;
  const h = slotCanvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  const maxY = strip.height - REEL_ITEM_H;
  const y = scrollY >= maxY ? maxY : ((scrollY % maxY) + maxY) % maxY;
  ctx.drawImage(strip, 0, y, w, REEL_ITEM_H, 0, 0, w, h);
}

function runSpinFrame(now) {
  const TARGET_SCROLL = (REEL_STRIP_ITEMS - 1) * REEL_ITEM_H;
  const FAST_SPEED = 0.55;
  const STOP_MS = 900;
  const session = spinSession;
  if (!session || session.finished) return;

  const dt = now - session.last;
  session.last = now;

  for (let i = 0; i < 3; i++) {
    const maxY = session.strips[i].height - REEL_ITEM_H;

    if (session.reelStates[i] === 'spinning') {
      session.scrolls[i] += FAST_SPEED * dt * (1 + i * 0.06);
      session.scrolls[i] %= maxY;
      drawReelView(els.slots[i], session.strips[i], session.scrolls[i]);
    } else if (session.reelStates[i] === 'stopping') {
      const t = Math.min((now - session.stopStartAt[i]) / STOP_MS, 1);
      const eased = easeOutCubic(t);
      session.scrolls[i] = session.stopFrom[i] + (TARGET_SCROLL - session.stopFrom[i]) * eased;
      drawReelView(els.slots[i], session.strips[i], session.scrolls[i]);

      if (t >= 1) {
        session.reelStates[i] = 'stopped';
        drawCan(els.slots[i], session.results[i]);
        playStopSound(i);
        session.nextStop += 1;
        session.stopInProgress = false;
        updateUI();
      }
    }
  }

  if (session.reelStates.every(s => s === 'stopped')) {
    finishSpinRound(session);
    return;
  }

  session.animationFrame = requestAnimationFrame(runSpinFrame);
}

function showWinModal(drink) {
  drawCan(els.winDrink, drink);
  const isRare = drink.rarity === 'red';
  els.winTitle.textContent = isRare ? '!!! ДЖЕКПОТ !!!' : 'СОВПАДЕНИЕ!';
  els.winText.textContent = isRare
    ? `${drink.name} — легендарный напиток!\nДобавлен в инвентарь.`
    : `${drink.name} добавлен в инвентарь!`;
  els.winModal.querySelector('.win-content').classList.toggle('rare-win', isRare);
  els.winModal.classList.remove('hidden');
}

function startSpinRound() {
  if (state.balance < SPIN_COST) return;
  state.balance -= SPIN_COST;
  state.capsSpent += SPIN_COST;
  state.spinning = true;
  saveGame();

  const results = [weightedRandom(), weightedRandom(), weightedRandom()];
  const strips = results.map(r => buildReelStrip(r));
  spinSession = {
    results,
    strips,
    scrolls: [0, 0, 0],
    reelStates: ['spinning', 'spinning', 'spinning'],
    stopFrom: [0, 0, 0],
    stopStartAt: [0, 0, 0],
    nextStop: 0,
    stopInProgress: false,
    finished: false,
    last: performance.now(),
    animationFrame: null,
  };

  updateUI();
  spinSession.animationFrame = requestAnimationFrame(runSpinFrame);
}

function stopNextReel() {
  const session = spinSession;
  if (!session || session.stopInProgress || session.nextStop >= 3) return;

  const index = session.nextStop;
  const maxY = session.strips[index].height - REEL_ITEM_H;
  session.reelStates[index] = 'stopping';
  session.stopFrom[index] = session.scrolls[index] % maxY;
  session.stopStartAt[index] = performance.now();
  session.stopInProgress = true;
  updateUI();
}

async function finishSpinRound(session) {
  if (session.finished) return;
  session.finished = true;
  await delay(300);
  if (spinSession !== session) return;

  const results = session.results;
  const allMatch = results[0].id === results[1].id && results[1].id === results[2].id;

  if (allMatch) {
    state.lastWin = results[0].name;
    state.totalWon += 1;
    state.inventory.push({ id: results[0].id, wonAt: Date.now() });
    saveGame();
    showWinModal(results[0]);
  } else {
    showMessage('Не повезло... Попробуй ещё!');
  }

  state.spinning = false;
  spinSession = null;
  updateUI();
}

function spin() {
  if (state.spinning) {
    stopNextReel();
    return;
  }

  startSpinRound();
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function playStopSound(slotIndex) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 200 + slotIndex * 80;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (_) {}
}

function saveGame() {
  localStorage.setItem('vendingRoulette', JSON.stringify({
    balance: state.balance,
    inventory: state.inventory,
    lastWin: state.lastWin,
    totalWon: state.totalWon,
    capsSpent: state.capsSpent,
  }));
}

function loadGame() {
  try {
    const data = JSON.parse(localStorage.getItem('vendingRoulette'));
    if (data) {
      state.balance = data.balance ?? INITIAL_BALANCE;
      state.inventory = data.inventory ?? [];
      state.lastWin = data.lastWin ?? null;
      state.totalWon = data.totalWon ?? state.inventory.length;
      state.capsSpent = data.capsSpent ?? Math.max(0, INITIAL_BALANCE - state.balance);
    }
  } catch (_) {}
}

async function init() {
  loadGame();

  drawCapIcon(document.getElementById('cap-icon'));
  await loadDrinkImages();
  const posters = await loadWallPosters();
  const displayImage = await loadImage('assets/main.png');
  const backgroundCanvas = document.getElementById('background');
  const resizeBackground = () => {
    backgroundCanvas.width = window.innerWidth;
    backgroundCanvas.height = window.innerHeight;
    drawBackground(backgroundCanvas, posters);
  };

  resizeBackground();
  window.addEventListener('resize', resizeBackground);
  drawMachine(document.getElementById('machine'), displayImage);

  els.slots.forEach(slot => renderSlot(slot, DRINKS[0]));

  els.spinBtn.addEventListener('click', spin);
  els.openInventory.addEventListener('click', () => {
    renderInventory();
    els.inventoryModal.classList.remove('hidden');
  });
  els.closeInventory.addEventListener('click', () => {
    els.inventoryModal.classList.add('hidden');
  });
  els.inventoryModal.addEventListener('click', e => {
    if (e.target === els.inventoryModal) els.inventoryModal.classList.add('hidden');
  });
  els.closeWin.addEventListener('click', () => {
    els.winModal.classList.add('hidden');
  });

  updateUI();
}

init();
