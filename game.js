'use strict';
/* =====================================================
   game.js — 鬼哭の鐘 Game Engine
   ===================================================== */

// ─────────────────────────────────────────────────────
//  初期ステート生成
// ─────────────────────────────────────────────────────
function createCharFromDef(defId, level) {
  const def = CHAR_DEFS[defId];
  if (!def) return null;
  const lv = level || 1;
  const char = {
    defId,
    name:   def.name,
    emoji:  def.emoji,
    role:   def.role,
    level:  lv,
    exp:    0,
    nextExp: expNeeded(lv),
    skills: [...def.startSkills],
    equipment: { weapon:null, armor:null, accessory:null },
    statusEffects: [],
    buffs: [],
    analyzed: false,
    isAlive: true,
  };
  applyLevelStats(char, lv);
  char.hp = char.maxHp;
  char.mp = char.maxMp;
  return char;
}

function applyLevelStats(char, lv) {
  const def = CHAR_DEFS[char.defId];
  const b = def.baseStats;
  const g = def.growthStats;
  const extra = lv - 1;
  char.maxHp  = Math.floor(b.maxHp  + g.maxHp  * extra);
  char.maxMp  = Math.floor(b.maxMp  + g.maxMp  * extra);
  char.atk    = Math.floor(b.atk    + g.atk    * extra);
  char.def    = Math.floor(b.def    + g.def    * extra);
  char.mag    = Math.floor(b.mag    + g.mag    * extra);
  char.spd    = Math.floor(b.spd    + g.spd    * extra);
}

function expNeeded(lv) { return lv * 100; }

function createInitialState() {
  const player = createCharFromDef('player', 1);
  return {
    screen:   'title',
    chapter:  1,
    area:     'burned_village',
    player,
    party:    [player],          // active party (max 3+player)
    partyIds: ['player'],        // ordered IDs
    allChars: { player },        // all created characters
    inventory: [],
    gold:      100,
    spiritPoints: { cur:5, max:5 },
    flags:     {},
    areaEventIdx: {},            // areaId -> next event index
  };
}

// ─────────────────────────────────────────────────────
//  グローバルステート
// ─────────────────────────────────────────────────────
let G = createInitialState();

// ─────────────────────────────────────────────────────
//  ユーティリティ
// ─────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function addItem(itemId, count) {
  const n = count || 1;
  const inv = G.inventory;
  const slot = inv.find(s => s.id === itemId);
  if (slot) { slot.count += n; }
  else       { inv.push({ id: itemId, count: n }); }
}

function removeItem(itemId, count) {
  const n = count || 1;
  const slot = G.inventory.find(s => s.id === itemId);
  if (!slot) return false;
  slot.count -= n;
  if (slot.count <= 0) {
    G.inventory = G.inventory.filter(s => s.id !== itemId);
  }
  return true;
}

function getEquippedStat(char, stat) {
  let bonus = 0;
  const eq = char.equipment;
  ['weapon','armor','accessory'].forEach(slot => {
    if (!eq[slot]) return;
    const item = ITEMS[eq[slot]];
    if (!item) return;
    if (stat === 'atk' && item.atkBonus) bonus += item.atkBonus;
    if (stat === 'def' && item.defBonus) bonus += item.defBonus;
    if (stat === 'mag' && item.magBonus) bonus += item.magBonus;
    if (stat === 'spd' && item.spdBonus) bonus += item.spdBonus;
  });
  return bonus;
}

function getEffectiveStat(char, stat) {
  let base = char[stat] + getEquippedStat(char, stat);
  // buffs
  char.buffs.forEach(b => {
    if (b.stat === stat) base += b.amount;
  });
  return Math.max(1, base);
}

function getActiveParty() {
  return G.partyIds.map(id => G.allChars[id]).filter(c => c);
}

function aliveParty() {
  return getActiveParty().filter(c => c.isAlive);
}

function tickBuffs(char) {
  char.buffs = char.buffs.filter(b => {
    b.duration--;
    return b.duration > 0;
  });
}

function tickStatusEffects(char) {
  const msgs = [];
  char.statusEffects = char.statusEffects.filter(se => {
    if (se.type === 'poison') {
      const dmg = Math.max(1, Math.floor(char.maxHp * 0.08));
      char.hp = Math.max(0, char.hp - dmg);
      msgs.push(`${char.name}は毒で${dmg}のダメージ！`);
      if (char.hp === 0) char.isAlive = false;
    }
    if (se.type === 'burn') {
      const dmg = Math.max(1, Math.floor(char.maxHp * 0.06));
      char.hp = Math.max(0, char.hp - dmg);
      msgs.push(`${char.name}は炎上で${dmg}のダメージ！`);
      if (char.hp === 0) char.isAlive = false;
    }
    se.duration--;
    return se.duration > 0;
  });
  return msgs;
}

function hasStatus(char, type) {
  return char.statusEffects.some(s => s.type === type);
}

function addStatus(char, type, duration) {
  if (!hasStatus(char, type)) {
    char.statusEffects.push({ type, duration: duration || 3 });
  }
}

function statusLabel(char) {
  if (!char.isAlive) return '戦闘不能';
  const types = char.statusEffects.map(s => {
    if (s.type === 'poison')  return '毒';
    if (s.type === 'burn')    return '炎上';
    if (s.type === 'freeze')  return '氷結';
    if (s.type === 'stun')    return '眩暈';
    return s.type;
  });
  return types.join(' ') || '';
}

// ─────────────────────────────────────────────────────
//  画面管理
// ─────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const sc = $('screen-' + id);
  if (sc) sc.classList.add('active');
  G.screen = id;
}

function showOverlay(id) {
  const el = $(id);
  if (el) el.classList.remove('hidden');
}

function hideOverlay(id) {
  const el = $(id);
  if (el) el.classList.add('hidden');
}

function showMessage(html, cb) {
  $('overlay-msg-text').innerHTML = html;
  showOverlay('overlay-message');
  $('btn-overlay-ok').onclick = () => {
    hideOverlay('overlay-message');
    if (cb) cb();
  };
}

// ─────────────────────────────────────────────────────
//  レベルシステム
// ─────────────────────────────────────────────────────
// (removed pendingLevelUps - use showLevelUpsAndThen instead)

function gainExp(amount) {
  const msgs = [];
  getActiveParty().forEach(c => {
    if (!c.isAlive) return;
    c.exp += amount;
    while (c.exp >= c.nextExp) {
      c.exp -= c.nextExp;
      c.level++;
      c.nextExp = expNeeded(c.level);
      const gained = doLevelUp(c);
      msgs.push({ char: c, gained });
    }
  });
  return msgs;
}

function doLevelUp(char) {
  const def = CHAR_DEFS[char.defId];
  const g = def.growthStats;
  const prevMaxHp = char.maxHp;
  const prevMaxMp = char.maxMp;

  applyLevelStats(char, char.level);

  const hpGain = char.maxHp - prevMaxHp;
  const mpGain = char.maxMp - prevMaxMp;
  char.hp = Math.min(char.hp + hpGain, char.maxHp);
  char.mp = Math.min(char.mp + mpGain, char.maxMp);

  // スキル習得
  const newSkills = [];
  def.learnSkills.forEach(ls => {
    if (ls.level === char.level && !char.skills.includes(ls.skill)) {
      char.skills.push(ls.skill);
      newSkills.push(SKILLS[ls.skill] ? SKILLS[ls.skill].name : ls.skill);
    }
  });

  return { hpGain, mpGain, newSkills };
}

function showLevelUpsAndThen(results, cb) {
  if (!results || results.length === 0) { if (cb) cb(); return; }
  const { char, gained } = results.shift();
  let html = `<b>${char.name}</b> が Lv.<b>${char.level}</b> になった！<br>
    HP +${gained.hpGain}　MP +${gained.mpGain}`;
  if (gained.newSkills && gained.newSkills.length > 0) {
    html += `<br><span style="color:var(--blue)">新スキル: ${gained.newSkills.join(', ')}</span>`;
  }
  $('levelup-title').textContent = `${char.name} レベルアップ！`;
  $('levelup-details').innerHTML = html;
  showOverlay('overlay-levelup');
  $('btn-levelup-ok').onclick = () => {
    hideOverlay('overlay-levelup');
    showLevelUpsAndThen(results, cb);
  };
}

// ─────────────────────────────────────────────────────
//  キャンバスマップエンジン
// ─────────────────────────────────────────────────────
const MapEngine = {
  canvas:     null,
  ctx:        null,
  TILE:       32,
  imgs:       {},
  player:     { x:1, y:1, dir:'down' },
  keys:       {},
  moveTimer:    0,
  MOVE_DELAY:   150,
  loopId:       null,
  interactCD:   0,
  encCooldown:  0,   // 戦闘後エンカウント無効ステップ数

  init() {
    this.canvas = $('map-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width  = MAP_W * this.TILE;  // 640
    this.canvas.height = MAP_H * this.TILE;  // 480

    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'Enter') { this.tryInteract(); e.preventDefault(); }
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault();
    });
    document.addEventListener('keyup', e => { delete this.keys[e.code]; });
    this.preloadTiles();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  },

  preloadTiles() {
    const ids = [0, 1, 14, 36, 48, 60, 72, 79, 84, 85, 86, 87, 88, 89, 96, 108];
    ids.forEach(id => {
      const img = new Image();
      img.onload = () => { this.imgs[id] = img; };
      img.src = `assets/tiny-dungeon/Tiles/tile_${String(id).padStart(4,'0')}.png`;
    });
  },

  resizeCanvas() {
    if (!this.canvas) return;
    const maxW = Math.min(MAP_W * this.TILE, window.innerWidth);
    const scale = maxW / (MAP_W * this.TILE);
    this.canvas.style.width  = `${MAP_W * this.TILE * scale}px`;
    this.canvas.style.height = `${MAP_H * this.TILE * scale}px`;
  },

  startLoop() {
    if (this.loopId) cancelAnimationFrame(this.loopId);
    let last = performance.now();
    const loop = ts => {
      const dt = Math.min(ts - last, 100);
      last = ts;
      if (G.screen === 'map') { this.update(dt); this.render(); }
      this.loopId = requestAnimationFrame(loop);
    };
    this.loopId = requestAnimationFrame(loop);
  },

  stopLoop() {
    if (this.loopId) { cancelAnimationFrame(this.loopId); this.loopId = null; }
  },

  update(dt) {
    this.interactCD = Math.max(0, this.interactCD - dt);
    this.moveTimer += dt;
    if (this.moveTimer < this.MOVE_DELAY) return;

    let dx = 0, dy = 0;
    if      (this.keys['ArrowLeft'])  { dx=-1; this.player.dir='left';  }
    else if (this.keys['ArrowRight']) { dx= 1; this.player.dir='right'; }
    else if (this.keys['ArrowUp'])    { dy=-1; this.player.dir='up';    }
    else if (this.keys['ArrowDown'])  { dy= 1; this.player.dir='down';  }

    if (!dx && !dy) { this.moveTimer = this.MOVE_DELAY; return; }

    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (this.walkable(nx, ny)) {
      this.player.x = nx; this.player.y = ny; this.moveTimer = 0;
      this.onMove();
    } else {
      this.moveTimer = 0;
    }
  },

  walkable(x, y) {
    const md = MAP_DATA[G.area];
    if (!md) return false;
    const g = md.data;
    if (y < 0 || y >= g.length || x < 0 || x >= (g[0]||[]).length) return false;
    const t = g[y][x];
    if (t === T.WALL || t === T.WATER) return false;
    if ((md.npcs||[]).some(n => n.x === x && n.y === y)) return false;
    return true;
  },

  onMove() {
    const md = MAP_DATA[G.area];
    if (!md) return;
    const px = this.player.x, py = this.player.y;

    const warp = (md.warps||[]).find(w => w.x === px && w.y === py);
    if (warp) { this.doWarp(warp); return; }

    if (this.encCooldown > 0) { this.encCooldown--; return; }

    const tile = (md.data[py]||[])[px];
    if ((md.encounterTiles||[]).includes(tile) && Math.random() < (md.encounterRate||0)) {
      this.triggerEnc();
    }
  },

  doWarp(warp) {
    this.stopLoop();
    G.area = warp.toArea;
    if (AREAS[warp.toArea]) G.chapter = AREAS[warp.toArea].chapter;
    const md = MAP_DATA[warp.toArea];
    if (md) { this.player.x = warp.toX; this.player.y = warp.toY; }
    const cv = this.canvas;
    cv.style.transition = 'opacity 0.2s';
    cv.style.opacity = '0';
    setTimeout(() => {
      cv.style.opacity = '1';
      updateMapHUD();
      this.startLoop();
    }, 250);
  },

  triggerEnc() {
    const md = MAP_DATA[G.area];
    if (!md || !md.enemies || !md.enemies.length) return;
    const id = md.enemies[randInt(0, md.enemies.length-1)];
    this.stopLoop();
    startBattle([createEnemyInstance(id)], () => {
      this.encCooldown = 5;
      showScreen('map');
      updateMapHUD();
      this.startLoop();
    });
  },

  tryInteract() {
    if (this.interactCD > 0) return;
    const md = MAP_DATA[G.area];
    if (!md) return;

    const dirVec = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
    const [ddx, ddy] = dirVec[this.player.dir] || [0, 1];
    const tx = this.player.x + ddx;
    const ty = this.player.y + ddy;

    const npc = (md.npcs||[]).find(n => n.x === tx && n.y === ty);
    if (!npc) return;

    this.interactCD = 500;
    this.stopLoop();

    const resume = () => { showScreen('map'); updateMapHUD(); this.startLoop(); };

    if (!npc.event) {
      const lines = {
        soldier_seen:  '「…仲間が…皆、燃えた…」',
        child_seen:    '「…お母さんはどこ…？」',
      };
      const msg = npc.seenFlag && lines[npc.seenFlag] ? `${npc.name}${lines[npc.seenFlag]}` : `${npc.name}「…」`;
      G.flags[npc.seenFlag] = true;
      showMessage(msg, resume);
      return;
    }

    if (npc.seenFlag && G.flags[npc.seenFlag]) {
      showMessage(`${npc.name}「…もう話すことはない。」`, resume);
      return;
    }

    if (npc.seenFlag) G.flags[npc.seenFlag] = true;
    runEvent(npc.event, resume);
  },

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const TS  = this.TILE;
    const md  = MAP_DATA[G.area];

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!md) return;

    const g = md.data;
    const dirVec = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
    const [ddx, ddy] = dirVec[this.player.dir] || [0, 1];

    // タイル描画
    const now = Date.now();
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const tile = (g[ty] && g[ty][tx] !== undefined) ? g[ty][tx] : T.WALL;
        this.drawTile(ctx, tx*TS, ty*TS, tile);
        if (tile === T.WARP) {
          const pulse = 0.25 + 0.2 * Math.sin(now / 400 + tx + ty);
          const cx = tx*TS + TS/2, cy = ty*TS + TS/2;
          const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, TS*0.45);
          rg.addColorStop(0, `rgba(255,240,100,${Math.min(1, pulse + 0.2)})`);
          rg.addColorStop(0.5, `rgba(255,215,0,${pulse})`);
          rg.addColorStop(1, 'rgba(255,215,0,0)');
          ctx.fillStyle = rg;
          ctx.fillRect(tx*TS, ty*TS, TS, TS);
        }
      }
    }

    // NPC描画（青い光球）
    (md.npcs||[]).forEach(npc => {
      this.drawNpcOrb(ctx, npc.x*TS, npc.y*TS, now, npc.name);
      const adjacent = (npc.x === this.player.x+ddx && npc.y === this.player.y+ddy);
      if (adjacent) {
        ctx.fillStyle = 'rgba(255,255,180,0.92)';
        ctx.fillRect(npc.x*TS+4, npc.y*TS-18, 20, 16);
        ctx.fillStyle = '#222';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('!', npc.x*TS+9, npc.y*TS-5);
      }
    });

    // プレイヤー描画（金色の光球）
    this.drawPlayerOrb(ctx, this.player.x*TS, this.player.y*TS, now);

    // ミニHUD
    this.renderHUD(ctx);
  },

  drawTile(ctx, px, py, tileType) {
    const TS = this.TILE;
    if (tileType === T.WARP) return; // render()ループで処理

    // 地形ごとのベースカラー
    const baseColors = {
      [T.FLOOR]:     '#c8a96e',
      [T.WALL]:      '#3a2e20',
      [T.ENCOUNTER]: '#4a6840',
      [T.WATER]:     '#1e4870',
    };
    ctx.fillStyle = baseColors[tileType] || '#222';
    ctx.fillRect(px, py, TS, TS);

    // テクスチャ感を追加
    if (tileType === T.FLOOR) {
      // 土のランダムな粒（決定論的）
      const seed = (px * 7 + py * 13) % 8;
      if (seed < 3) {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(px + seed*4, py + (seed*3)%TS, 3, 2);
      }
      // 格子の薄い線
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(px, py, TS, 1);
      ctx.fillRect(px, py, 1, TS);
    }
    if (tileType === T.WALL) {
      // 石壁のモルタル風
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(px+2, py+2, TS-4, TS*0.45);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(px, py+TS*0.5, TS, 1);
      // ハイライト
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(px, py, TS, 2);
    }
    if (tileType === T.ENCOUNTER) {
      // 草の筋
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let i = 0; i < 3; i++) {
        const gx = px + 4 + i*9;
        ctx.fillRect(gx, py+TS*0.3, 2, TS*0.5);
      }
    }
    if (tileType === T.WATER) {
      // 水面の輝き
      ctx.fillStyle = 'rgba(100,180,255,0.2)';
      ctx.fillRect(px+2, py+4, TS*0.6, 3);
    }
  },

  // フィールドスプライトキャッシュ
  _fieldImgs: (() => {
    const cache = {};
    // プレイヤー
    const p = new Image(); p.src = PLAYER_FIELD_IMAGE; cache['__player'] = p;
    // NPC
    for (const [name, src] of Object.entries(NPC_FIELD_IMAGES)) {
      if (!cache[src]) { const i = new Image(); i.src = src; cache[src] = i; }
    }
    return cache;
  })(),

  // フィールドスプライト共通描画（左方向は水平反転）
  _drawFieldSprite(ctx, px, py, img, dir, TS, labelText, labelColor) {
    if (!img || !img.complete || !img.naturalWidth) return;

    const DW = TS * 1.6;
    const DH = DW * (img.naturalHeight / img.naturalWidth);
    const cx = px + TS / 2;
    const dy = py + TS - DH;   // タイル下端に足が揃う
    const flipX = (dir === 'left');

    ctx.save();

    // 足元の丸影
    const sh = ctx.createRadialGradient(cx, py+TS-3, 0, cx, py+TS-3, TS*0.55);
    sh.addColorStop(0, 'rgba(0,0,0,0.45)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(cx, py+TS-3, TS*0.5, TS*0.16, 0, 0, Math.PI*2);
    ctx.fill();

    // 反転処理
    if (flipX) {
      ctx.translate(cx * 2, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(img, cx - DW/2, dy, DW, DH);
    ctx.restore();

    // 名前ラベル
    if (labelText) this._drawLabel(ctx, cx, py + TS + 2, labelText, labelColor, TS);
  },

  drawPlayerSprite(ctx, px, py, now) {
    const TS  = this.TILE;
    const img = this._fieldImgs['__player'];
    this._drawFieldSprite(ctx, px, py, img, this.player.dir, TS, null, null);
  },

  drawNpcOrb(ctx, px, py, now, npcName) {
    const TS  = this.TILE;
    const src = NPC_FIELD_IMAGES[npcName];
    const img = src ? this._fieldImgs[src] : null;
    if (img && img.complete && img.naturalWidth) {
      this._drawFieldSprite(ctx, px, py, img, 'down', TS, null, null);
    } else {
      // 画像未ロード中: 小さい●で代替
      ctx.save();
      ctx.fillStyle = 'rgba(150,200,255,0.8)';
      ctx.beginPath();
      ctx.arc(px + TS/2, py + TS/2, TS*0.3, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  },

  _drawLabel(ctx, cx, ly, text, color, TS) {
    const fs = Math.round(TS * 0.42);
    ctx.save();
    ctx.font = `bold ${fs}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    for (const [ox, oy] of [[-1,0],[1,0],[0,-1],[0,1]]) ctx.fillText(text, cx+ox, ly+oy);
    ctx.fillStyle = color;
    ctx.fillText(text, cx, ly);
    ctx.restore();
  },

  drawPlayerOrb(ctx, px, py, now) {
    this.drawPlayerSprite(ctx, px, py, now);
  },

  drawSprite(ctx, px, py, spriteId) {
    const img = this.imgs[spriteId];
    const TS  = this.TILE;
    if (img) {
      ctx.drawImage(img, px, py, TS, TS);
    } else {
      ctx.fillStyle = '#f0f';
      ctx.fillRect(px+6, py+6, TS-12, TS-12);
    }
  },

  renderHUD(ctx) {
    const party = getActiveParty();
    if (!party.length) return;
    const boxH = party.length * 33 + 6;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(4, 4, 188, boxH);
    ctx.strokeStyle = 'rgba(201,162,39,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, 188, boxH);

    party.forEach((c, i) => {
      const y = 10 + i * 33;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px serif';
      ctx.fillText(`${c.name}  Lv.${c.level}`, 10, y + 11);

      // HPバー
      ctx.fillStyle = '#222';
      ctx.fillRect(10, y+15, 116, 7);
      const hpRatio = c.maxHp > 0 ? c.hp/c.maxHp : 0;
      ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(10, y+15, Math.floor(116*hpRatio), 7);
      ctx.fillStyle = '#bbb';
      ctx.font = '9px monospace';
      ctx.fillText(`HP ${c.hp}/${c.maxHp}`, 130, y+21);

      // MPバー
      ctx.fillStyle = '#222';
      ctx.fillRect(10, y+24, 116, 5);
      ctx.fillStyle = '#2196f3';
      ctx.fillRect(10, y+24, Math.floor(116*(c.mp/c.maxMp||0)), 5);
      ctx.fillStyle = '#88bbff';
      ctx.fillText(`MP ${c.mp}/${c.maxMp}`, 130, y+29);
    });
  },
};

// ─────────────────────────────────────────────────────
//  マップ画面
// ─────────────────────────────────────────────────────
function openMap() {
  showScreen('map');
  updateMapHUD();
  MapEngine.startLoop();
}

function updateMapHUD() {
  // マップ画面は背景画像なし（タイル描画で地形表現する）
  $('screen-map').style.backgroundImage = '';

  const area = AREAS[G.area];
  const labelEl = $('map-area-label');
  if (labelEl && area) {
    labelEl.textContent = `第${area.chapter}章 ── ${area.name}`;
  }

  // 霊力バー
  const sp = G.spiritPoints;
  const pct = sp.max > 0 ? (sp.cur / sp.max) * 100 : 0;
  const spBar = $('sp-bar');
  const spTxt = $('sp-text');
  if (spBar) spBar.style.width = pct + '%';
  if (spTxt) spTxt.textContent = `${sp.cur}/${sp.max}`;

  // アクションボタン（ショップ・宿屋・メニュー）
  const actDiv = $('map-actions');
  if (actDiv) {
    actDiv.innerHTML = '';
    if (area && area.hasShop) actDiv.appendChild(makeBtn('店', () => { MapEngine.stopLoop(); openShop(area.hasShop); }));
    if (area && area.hasInn)  actDiv.appendChild(makeBtn('宿屋', () => { MapEngine.stopLoop(); openInn(); }));
    actDiv.appendChild(makeBtn('メニュー', () => { MapEngine.stopLoop(); openMenu('status'); }));
  }
}

function makeBtn(label, onClick) {
  const btn = document.createElement('button');
  btn.className = 'action-btn';
  btn.textContent = label;
  btn.onclick = onClick;
  return btn;
}

// ─────────────────────────────────────────────────────
//  Dパッド（タッチ操作対応）
// ─────────────────────────────────────────────────────
function setupDpad() {
  const map = {
    'dpad-up':    'ArrowUp',
    'dpad-down':  'ArrowDown',
    'dpad-left':  'ArrowLeft',
    'dpad-right': 'ArrowRight',
    'dpad-act':   'Space',
  };
  Object.entries(map).forEach(([id, code]) => {
    const btn = $(id);
    if (!btn) return;
    const press = (e) => {
      e.preventDefault();
      MapEngine.keys[code] = true;
      if (code === 'Space') MapEngine.tryInteract();
    };
    const release = (e) => { e.preventDefault(); delete MapEngine.keys[code]; };
    btn.addEventListener('touchstart', press,   { passive:false });
    btn.addEventListener('touchend',   release, { passive:false });
    btn.addEventListener('mousedown',  press);
    btn.addEventListener('mouseup',    release);
    btn.addEventListener('mouseleave', release);
  });
}

// ─────────────────────────────────────────────────────
//  パーティバー描画
// ─────────────────────────────────────────────────────
function renderPartyBar(containerId) {
  const cont = $(containerId);
  if (!cont) return;
  cont.innerHTML = '';
  getActiveParty().forEach(c => {
    const div = document.createElement('div');
    div.className = 'party-member';
    const hpPct = c.maxHp > 0 ? (c.hp / c.maxHp) * 100 : 0;
    const mpPct = c.maxMp > 0 ? (c.mp / c.maxMp) * 100 : 0;
    const stLabel = statusLabel(c);
    div.innerHTML = `
      <div class="party-name">${c.emoji} ${c.name} <span style="font-size:10px;color:var(--text-dim)">Lv.${c.level}</span></div>
      <div class="party-hp-bar">
        <span class="bar-label hp">HP</span>
        <div class="bar-wrap"><div class="bar-fill hp" style="width:${hpPct}%"></div></div>
        <span class="bar-num">${c.hp}/${c.maxHp}</span>
      </div>
      <div class="party-mp-bar">
        <span class="bar-label mp">MP</span>
        <div class="bar-wrap"><div class="bar-fill mp" style="width:${mpPct}%"></div></div>
        <span class="bar-num">${c.mp}/${c.maxMp}</span>
      </div>
      ${stLabel ? `<div class="status-icon" style="color:var(--red);font-size:11px">${stLabel}</div>` : ''}
    `;
    cont.appendChild(div);
  });
}

// ─────────────────────────────────────────────────────
//  イベントシステム
// ─────────────────────────────────────────────────────
let Ev = {
  eventId:   null,
  steps:     [],
  stepIdx:   0,
  onDone:    null,
  choiceActive: false,
};

function runEvent(eventId, onDone) {
  const ev = EVENTS[eventId];
  if (!ev) {
    if (onDone) onDone();
    return;
  }
  Ev.eventId = eventId;
  Ev.steps   = ev.steps;
  Ev.stepIdx = 0;
  Ev.onDone  = onDone;
  Ev.choiceActive = false;
  showScreen('event');
  advanceEvent();
}

function advanceEvent() {
  if (Ev.choiceActive) return;
  if (Ev.stepIdx >= Ev.steps.length) {
    finishEvent();
    return;
  }
  const step = Ev.steps[Ev.stepIdx];
  Ev.stepIdx++;
  processEventStep(step);
}

function finishEvent() {
  const ev = EVENTS[Ev.eventId];
  if (ev && ev.isEnding) {
    showEnding(ev.endingType, ev.endingTitle);
    return;
  }
  if (Ev.onDone) Ev.onDone();
}

function processEventStep(step) {
  switch (step.type) {
    case 'narrator':
      setEventDialog('', '📜', step.text);
      break;
    case 'player':
      setEventDialog('勇', '⚔️', step.text);
      break;
    case 'companion': {
      const _cid = SPEAKER_TO_CHAR[step.speaker];
      // キャラが未参加かつ、このイベント内でそのキャラが joinParty されない場合はスキップ
      if (_cid && _cid !== 'player' && !G.partyIds.includes(_cid)) {
        const _willJoin = Ev.steps.some(s => s.type === 'joinParty' && s.charId === _cid);
        if (!_willJoin) { advanceEvent(); break; }
      }
      setEventDialog(step.speaker, step.emoji || '👤', step.text);
      break;
    }
    case 'enemy':
      setEventDialog(step.speaker, '👹', step.text);
      break;
    case 'gain':
      setEventDialog('', '✨', step.text);
      // アイテム付与は特殊ケースなのでスキップ（鈴はフラグ的なもの）
      break;
    case 'joinParty':
      joinCharacter(step.charId);
      advanceEvent();
      break;
    case 'choice':
      setEventDialog('', '❓', step.text);
      showEventChoices(step.choices);
      break;
    case 'battle':
      startBattle([createEnemyInstance(step.enemyId)], () => advanceEvent());
      break;
    case 'warp':
      G.area = step.areaId;
      G.chapter = AREAS[step.areaId] ? AREAS[step.areaId].chapter : G.chapter;
      // キャンバスマップのプレイヤー位置も更新
      if (typeof MAP_DATA !== 'undefined' && MAP_DATA[step.areaId]) {
        const ps = MAP_DATA[step.areaId].playerStart;
        if (ps) { MapEngine.player.x = ps.x; MapEngine.player.y = ps.y; }
      }
      advanceEvent();
      break;
    case 'next':
      runEvent(step.nextEvent, Ev.onDone);
      break;
    default:
      advanceEvent();
  }
}

function setEventDialog(speaker, portrait, text) {
  $('event-speaker').textContent = speaker || '';

  const portraitEl = $('event-portrait');
  const charId   = SPEAKER_TO_CHAR[speaker];
  const enemyId  = SPEAKER_TO_ENEMY[speaker];
  const imgSrc   = charId  ? CHAR_IMAGES[charId]
                 : enemyId ? ENEMY_IMAGES[enemyId]
                 : null;
  if (imgSrc) {
    portraitEl.innerHTML = `<img class="event-portrait-img" src="${imgSrc}" alt="${speaker}">`;
  } else {
    portraitEl.innerHTML = '';
    portraitEl.textContent = portrait || '';
  }

  $('event-text').textContent = text || '';
  $('event-choices').classList.add('hidden');
  $('event-choices').innerHTML = '';
  $('event-next-hint').style.display = 'block';
  Ev.choiceActive = false;
}

function showEventChoices(choices) {
  Ev.choiceActive = true;
  $('event-next-hint').style.display = 'none';
  const div = $('event-choices');
  div.innerHTML = '';
  div.classList.remove('hidden');
  choices.forEach((ch, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = ch.text;
    btn.onclick = () => makeChoice(ch);
    div.appendChild(btn);
  });
}

function makeChoice(choice) {
  if (choice.flagSet) {
    G.flags[choice.flagSet] = true;
  }
  Ev.choiceActive = false;
  $('event-choices').classList.add('hidden');
  if (choice.next) {
    runEvent(choice.next, Ev.onDone);
  } else {
    advanceEvent();
  }
}

function joinCharacter(charId) {
  if (G.allChars[charId]) return; // already exists
  if (!CHAR_DEFS[charId]) return;
  const char = createCharFromDef(charId, G.player.level);
  G.allChars[charId] = char;
  if (!G.partyIds.includes(charId)) {
    G.partyIds.push(charId);
  }
}

// ─────────────────────────────────────────────────────
//  バトルシステム
// ─────────────────────────────────────────────────────
let Battle = {
  enemies:      [],
  turnOrder:    [],
  currentTurn:  0,
  phase:        'player',   // player | enemy | anim | end
  msgQueue:     [],
  onDone:       null,
  analyzedIds:  new Set(),
};

function createEnemyInstance(defId) {
  const def = ENEMY_DEFS[defId];
  if (!def) return null;
  return {
    defId,
    name:   def.name,
    emoji:  def.emoji,
    level:  def.level,
    hp:     def.maxHp,
    maxHp:  def.maxHp,
    atk:    def.atk,
    def:    def.def,
    mag:    def.mag,
    spd:    def.spd,
    skills: def.skills,
    weakness:     def.weakness,
    weaknessHint: def.weaknessHint || '',
    isBoss:       def.isBoss || false,
    statusEffects: [],
    buffs:         [],
    isAlive:       true,
    analyzed:      false,
  };
}

function startBattle(enemies, onDone) {
  Battle.enemies     = enemies.filter(Boolean);
  Battle.onDone      = onDone;
  Battle.msgQueue    = [];
  Battle.currentTurn = 0;
  Battle.phase       = 'player';
  Battle.analyzedIds = new Set();

  // 全パーティの眩暈解除（戦闘開始時）
  getActiveParty().forEach(c => {
    c.statusEffects = c.statusEffects.filter(s => s.type !== 'stun');
  });

  // 背景画像をセット（ボス専用 > エリア共通）
  const battleEl = $('screen-battle');
  const bossEnemy = Battle.enemies.find(e => e && e.isBoss);
  const bossBgSrc = bossEnemy ? BOSS_BG_IMAGES[bossEnemy.defId] : null;
  const bgSrc = bossBgSrc || BG_IMAGES[G.area];
  if (bgSrc) {
    // ボス専用背景はドラマチックな構図なので暗転を最小限に
    const overlay = bossBgSrc
      ? 'linear-gradient(rgba(0,0,0,0.05),rgba(0,0,0,0.4))'
      : 'linear-gradient(rgba(0,0,0,0.15),rgba(0,0,0,0.55))';
    battleEl.style.backgroundImage = `${overlay}, url('${bgSrc}')`;
    battleEl.style.backgroundSize = 'cover';
    battleEl.style.backgroundPosition = 'center';
  } else {
    battleEl.style.backgroundImage = '';
  }

  $('battle-message').textContent = '';
  showScreen('battle');
  renderBattleScreen();
  buildTurnOrder();
  setTimeout(() => processTurnStart(), 300);
}

function buildTurnOrder() {
  const actors = [];
  getActiveParty().forEach((c, i) => {
    if (c.isAlive) actors.push({ type:'party', idx:i, spd: getEffectiveStat(c,'spd') });
  });
  Battle.enemies.forEach((e, i) => {
    if (e.isAlive) actors.push({ type:'enemy', idx:i, spd: e.spd });
  });
  actors.sort((a, b) => b.spd - a.spd);
  Battle.turnOrder = actors;
  Battle.currentTurn = 0;
}

function currentActor() {
  if (Battle.currentTurn >= Battle.turnOrder.length) return null;
  return Battle.turnOrder[Battle.currentTurn];
}

function advanceTurn() {
  Battle.currentTurn++;
  if (Battle.currentTurn >= Battle.turnOrder.length) {
    // ラウンド終了：状態異常ダメージ
    const roundMsgs = [];
    getActiveParty().forEach(c => {
      if (!c.isAlive) return;
      const ms = tickStatusEffects(c);
      ms.forEach(m => roundMsgs.push(m));
      tickBuffs(c);
    });
    Battle.enemies.forEach(e => {
      if (!e.isAlive) return;
      tickBuffs(e);
    });
    if (roundMsgs.length > 0) {
      enqueueMsgs(roundMsgs, () => {
        if (checkBattleEnd()) return;
        buildTurnOrder();
        renderBattleScreen();
        processTurnStart();
      });
      return;
    }
    buildTurnOrder();
    renderBattleScreen();
  }
  if (checkBattleEnd()) return;
  processTurnStart();
}

function processTurnStart() {
  const actor = currentActor();
  if (!actor) { advanceTurn(); return; }

  if (actor.type === 'party') {
    const char = getActiveParty()[actor.idx];
    if (!char || !char.isAlive) { advanceTurn(); return; }
    if (hasStatus(char, 'stun')) {
      enqueueMsgs([`${char.name}は眩暈で動けない！`], () => advanceTurn());
      return;
    }
    highlightActiveChar(actor.idx);
    showBattleActions();
  } else {
    const enemy = Battle.enemies[actor.idx];
    if (!enemy || !enemy.isAlive) { advanceTurn(); return; }
    Battle.phase = 'enemy';
    hideSubMenu();
    hideBattleActions();
    setTimeout(() => processEnemyTurn(enemy), 600);
  }
}

// ─── プレイヤーアクション ───
function playerActionAttack() {
  const actor = currentActor();
  if (!actor || actor.type !== 'party') return;
  const char = getActiveParty()[actor.idx];
  const enemy = Battle.enemies.find(e => e.isAlive);
  if (!enemy) return;

  const dmg = calcDamage(getEffectiveStat(char,'atk'), enemy.def, 1.0, null, enemy.weakness);
  enemy.hp = Math.max(0, enemy.hp - dmg);
  if (enemy.hp === 0) enemy.isAlive = false;

  hideBattleActions();
  enqueueMsgs([`${char.name}の攻撃！ ${enemy.name}に${dmg}ダメージ！`], () => {
    renderBattleScreen();
    if (checkBattleEnd()) return;
    advanceTurn();
  });
}

function playerActionSkill(skillId) {
  const actor = currentActor();
  if (!actor || actor.type !== 'party') return;
  const char = getActiveParty()[actor.idx];
  const skill = SKILLS[skillId];
  if (!skill) return;
  if (char.mp < skill.mpCost) { showMessage('MPが足りない！'); return; }

  char.mp -= skill.mpCost;
  hideSubMenu();
  hideBattleActions();

  const msgs = applyPlayerSkill(skill, char);
  enqueueMsgs(msgs, () => {
    renderBattleScreen();
    if (checkBattleEnd()) return;
    advanceTurn();
  });
}

function applyPlayerSkill(skill, char) {
  const msgs = [];
  const aliveEnemies = Battle.enemies.filter(e => e.isAlive);
  const aliveAllies  = aliveParty();

  switch (skill.type) {
    case 'attack': {
      const targets = skill.target === 'all_enemies' ? aliveEnemies : [aliveEnemies[0]];
      targets.forEach(e => {
        if (!e) return;
        const power = skill.power || 1.0;
        const stat  = (skill.element === 'spirit' || skill.element === 'holy') ? getEffectiveStat(char,'mag') : getEffectiveStat(char,'atk');
        let dmg = calcDamage(stat, e.def, power, skill.element, e.weakness);
        e.hp = Math.max(0, e.hp - dmg);
        if (e.hp === 0) e.isAlive = false;
        msgs.push(`${char.name}の${skill.name}！ ${e.name}に${dmg}ダメージ！`);
        if (skill.statusChance) {
          const sc = skill.statusChance;
          if (Math.random() * 100 < sc.chance) {
            addStatus(e, sc.type, 3);
            msgs.push(`${e.name}は${statusJp(sc.type)}になった！`);
          }
        }
      });
      break;
    }
    case 'attack_twice': {
      const e = aliveEnemies[0];
      if (e) {
        for (let i = 0; i < 2; i++) {
          const dmg = calcDamage(getEffectiveStat(char,'atk'), e.def, skill.power, null, e.weakness);
          e.hp = Math.max(0, e.hp - dmg);
          if (e.hp === 0) { e.isAlive = false; break; }
          msgs.push(`${char.name}の${skill.name} (${i+1}撃目)！ ${e.name}に${dmg}ダメージ！`);
        }
      }
      break;
    }
    case 'heal': {
      const targets = skill.target === 'single_ally' ? [aliveAllies[0]] : aliveAllies;
      targets.forEach(a => {
        if (!a) return;
        const amount = Math.floor(a.maxHp * (skill.healPct || 0.3));
        a.hp = Math.min(a.maxHp, a.hp + amount);
        msgs.push(`${char.name}の${skill.name}！ ${a.name}のHPが${amount}回復！`);
      });
      break;
    }
    case 'buff': {
      const targets = skill.target === 'all_allies' ? aliveAllies : [char];
      const eff = skill.effect;
      targets.forEach(a => {
        a.buffs.push({ stat: eff.stat, amount: eff.amount, duration: eff.duration });
        msgs.push(`${a.name}の${eff.stat.toUpperCase()}が上がった！ (${eff.duration}ターン)`);
      });
      break;
    }
    case 'debuff': {
      const targets = skill.target === 'all_enemies' ? aliveEnemies : [aliveEnemies[0]];
      const eff = skill.effect;
      targets.forEach(e => {
        if (!e) return;
        e.buffs.push({ stat: eff.stat, amount: eff.amount, duration: eff.duration });
        msgs.push(`${e.name}の${eff.stat.toUpperCase()}が下がった！`);
      });
      break;
    }
    case 'cure_all': {
      const target = aliveAllies[0];
      if (target) {
        target.statusEffects = [];
        msgs.push(`${target.name}の状態異常が回復した！`);
      }
      break;
    }
    case 'analyze': {
      const e = aliveEnemies[0];
      if (e) {
        e.analyzed = true;
        Battle.analyzedIds.add(e.defId);
        const hint = e.weaknessHint || `弱点: ${e.weakness || 'なし'}`;
        msgs.push(`${char.name}が${e.name}を分析した！\n${hint}`);
      }
      break;
    }
    default:
      msgs.push(`${char.name}の${skill.name}！`);
  }
  return msgs;
}

function playerActionItem(invIdx) {
  const slot = G.inventory[invIdx];
  if (!slot) return;
  const item = ITEMS[slot.id];
  if (!item) return;
  showItemTargetMenu(invIdx);
}

function showItemTargetMenu(invIdx) {
  const slot = G.inventory[invIdx];
  if (!slot) return;
  const item = ITEMS[slot.id];
  if (!item) return;

  const sub = $('battle-sub-menu');
  sub.innerHTML = '';
  sub.classList.remove('hidden');

  const header = document.createElement('div');
  header.className = 'sub-menu-header';
  header.textContent = `── ${item.name} — 誰に使う？ ──`;
  sub.appendChild(header);

  const targets = item.type === 'revive'
    ? getActiveParty().filter(c => !c.isAlive)
    : getActiveParty().filter(c => c.isAlive);

  if (targets.length === 0) {
    const p = document.createElement('div');
    p.style.cssText = 'padding:8px;color:var(--text-dim);font-size:13px';
    p.textContent = '対象がいない。';
    sub.appendChild(p);
  }

  targets.forEach(target => {
    const btn = document.createElement('button');
    btn.className = 'sub-menu-item';
    const hpPct = Math.floor((target.hp / target.maxHp) * 100);
    btn.innerHTML = `<span>${target.emoji} ${target.name}</span><span style="font-size:11px;color:var(--text-dim)">HP ${target.hp}/${target.maxHp} (${hpPct}%)</span>`;
    btn.onclick = () => {
      hideSubMenu();
      hideBattleActions();
      const msgs = applyItem(item, target);
      removeItem(slot.id, 1);
      enqueueMsgs(msgs, () => {
        renderBattleScreen();
        if (checkBattleEnd()) return;
        advanceTurn();
      });
    };
    sub.appendChild(btn);
  });

  const cancel = document.createElement('button');
  cancel.className = 'sub-menu-cancel';
  cancel.textContent = '← 戻る';
  cancel.onclick = showItemMenu;
  sub.appendChild(cancel);
}

function applyItem(item, target) {
  const msgs = [];
  const aliveAllies = aliveParty();
  const realTarget = item.type === 'revive' ? getActiveParty().find(c => !c.isAlive) : target;

  switch (item.type) {
    case 'heal':
      if (realTarget && realTarget.isAlive) {
        realTarget.hp = Math.min(realTarget.maxHp, realTarget.hp + item.healAmount);
        msgs.push(`${realTarget.name}のHPが${item.healAmount}回復！`);
      }
      break;
    case 'healMP':
      if (realTarget && realTarget.isAlive) {
        realTarget.mp = Math.min(realTarget.maxMp, realTarget.mp + item.mpAmount);
        msgs.push(`${realTarget.name}のMPが${item.mpAmount}回復！`);
      }
      break;
    case 'healBoth':
      if (realTarget && realTarget.isAlive) {
        realTarget.hp = Math.min(realTarget.maxHp, realTarget.hp + item.healAmount);
        realTarget.mp = Math.min(realTarget.maxMp, realTarget.mp + item.mpAmount);
        msgs.push(`${realTarget.name}のHPが${item.healAmount}、MPが${item.mpAmount}回復！`);
      }
      break;
    case 'cure':
      if (realTarget && realTarget.isAlive) {
        item.cures.forEach(cType => {
          realTarget.statusEffects = realTarget.statusEffects.filter(s => s.type !== cType);
        });
        msgs.push(`${realTarget.name}の状態異常が回復！`);
      }
      break;
    case 'revive':
      if (realTarget && !realTarget.isAlive) {
        realTarget.isAlive = true;
        realTarget.hp = Math.min(realTarget.maxHp, item.reviveHp || 50);
        realTarget.statusEffects = [];
        msgs.push(`${realTarget.name}が復活した！ HP ${realTarget.hp}`);
        buildTurnOrder(); // ターン順再構築
      } else {
        msgs.push('対象がいない…');
      }
      break;
    default:
      msgs.push(`${item.name}を使った。`);
  }
  return msgs;
}

function playerActionDefend() {
  const actor = currentActor();
  if (!actor || actor.type !== 'party') return;
  const char = getActiveParty()[actor.idx];
  char.buffs.push({ stat:'def', amount: Math.floor(char.def * 0.5), duration:1 });
  hideBattleActions();
  enqueueMsgs([`${char.name}は防御した！`], () => advanceTurn());
}

function playerActionRun() {
  // ボス戦では逃走不可（敵定義で直接判定）
  if (Battle.enemies.some(e => e.isBoss)) {
    showMessage('ボスからは逃げられない！');
    return;
  }

  const aliveP = aliveParty();
  const maxSpd = aliveP.length > 0 ? Math.max(...aliveP.map(c => getEffectiveStat(c,'spd'))) : 1;
  const enemyAlive = Battle.enemies.find(e => e.isAlive);
  const escapeRate = enemyAlive ? clamp((maxSpd / enemyAlive.spd) * 0.6, 0.2, 0.9) : 0.9;

  hideBattleActions();
  hideSubMenu();

  if (Math.random() < escapeRate) {
    Battle.phase = 'end';
    enqueueMsgs(['逃走した！'], () => {
      if (Battle.onDone) Battle.onDone();
    });
  } else {
    enqueueMsgs(['逃走に失敗した！'], () => {
      advanceTurn();
    });
  }
}

// ─── 敵AIターン ───
function processEnemyTurn(enemy) {
  if (!enemy.isAlive) { advanceTurn(); return; }

  const skillId = enemy.skills[randInt(0, enemy.skills.length - 1)];
  const sk = ENEMY_SKILLS[skillId];
  if (!sk) { advanceTurn(); return; }

  const aliveP = aliveParty();
  if (aliveP.length === 0) { checkBattleEnd(); return; }

  const msgs = [];

  if (sk.type === 'msg') {
    msgs.push(sk.message || `${enemy.name}の${sk.name}！`);
    enqueueMsgs(msgs, () => advanceTurn());
    return;
  }

  if (sk.type === 'selfbuff') {
    const eff = sk.buff;
    enemy.buffs.push({ stat: eff.stat, amount: eff.amount, duration: eff.duration });
    msgs.push(`${enemy.name}の${sk.name}！ 力が増した！`);
    enqueueMsgs(msgs, () => advanceTurn());
    return;
  }

  // ターゲット選択
  const targets = sk.target === 'all' ? aliveP : [aliveP[randInt(0, aliveP.length - 1)]];

  targets.forEach(target => {
    if (!target || !target.isAlive) return;

    if (sk.type === 'atk') {
      const atkBuff = enemy.buffs.reduce((s, b) => b.stat === 'atk' ? s + b.amount : s, 0);
      const basePow = Math.max(1, Math.max(enemy.atk, enemy.mag) + atkBuff);
      const defStat = getEffectiveStat(target, 'def');
      let dmg = Math.max(1, Math.floor(basePow * (sk.power || 1.0) - defStat * 0.6));
      dmg = randInt(Math.floor(dmg * 0.85), Math.ceil(dmg * 1.15));
      target.hp = Math.max(0, target.hp - dmg);
      if (target.hp === 0) target.isAlive = false;
      msgs.push(`${enemy.name}の${sk.name}！ ${target.name}に${dmg}ダメージ！`);
      if (sk.statusChance) {
        const sc = sk.statusChance;
        if (Math.random() * 100 < sc.chance && !hasStatus(target, sc.type)) {
          addStatus(target, sc.type, 3);
          msgs.push(`${target.name}は${statusJp(sc.type)}になった！`);
        }
      }
    } else if (sk.type === 'drain') {
      const dmg = Math.max(1, Math.floor(enemy.atk * (sk.power || 1.0) - getEffectiveStat(target,'def') * 0.6));
      const actual = Math.min(dmg, target.hp);
      target.hp = Math.max(0, target.hp - actual);
      if (target.hp === 0) target.isAlive = false;
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.floor(actual * 0.5));
      msgs.push(`${enemy.name}の${sk.name}！ ${target.name}から${actual}吸収！`);
    } else if (sk.type === 'status') {
      const sc = sk.statusChance;
      if (sc && Math.random() * 100 < sc.chance && !hasStatus(target, sc.type)) {
        addStatus(target, sc.type, 3);
        msgs.push(`${enemy.name}の${sk.name}！ ${target.name}は${statusJp(sc.type)}になった！`);
      } else {
        msgs.push(`${enemy.name}の${sk.name}！ しかし効果がなかった…`);
      }
    } else if (sk.type === 'debuff') {
      const eff = sk.debuff;
      target.buffs.push({ stat: eff.stat, amount: eff.amount, duration: eff.duration });
      msgs.push(`${enemy.name}の${sk.name}！ ${target.name}の${eff.stat.toUpperCase()}が下がった！`);
    }
  });

  enqueueMsgs(msgs, () => {
    renderBattleScreen();
    if (checkBattleEnd()) return;
    advanceTurn();
  });
}

// ─── ダメージ計算 ───
function calcDamage(atk, def, power, element, weakness) {
  let dmg = Math.max(1, Math.floor(atk * power - def * 0.5));
  // 弱点ボーナス
  if (element && weakness && element === weakness) {
    dmg = Math.floor(dmg * 1.8);
  }
  // ランダム幅 ±10%
  dmg = randInt(Math.floor(dmg * 0.9), Math.ceil(dmg * 1.1));
  return Math.max(1, dmg);
}

// ─── バトル終了判定 ───
function checkBattleEnd() {
  const allEnemiesDead = Battle.enemies.every(e => !e.isAlive);
  const allPartydead   = aliveParty().length === 0;

  if (allEnemiesDead) {
    endBattle('win');
    return true;
  }
  if (allPartydead) {
    endBattle('lose');
    return true;
  }
  return false;
}

function endBattle(result) {
  Battle.phase = 'end';
  if (result === 'win') {
    const msgs = [];
    // 報酬計算
    let totalExp  = 0;
    let totalGold = 0;
    const drops = [];
    Battle.enemies.forEach(e => {
      const def = ENEMY_DEFS[e.defId];
      if (!def) return;
      totalExp  += def.exp;
      totalGold += def.gold;
      (def.drops || []).forEach(d => {
        if (Math.random() * 100 < d.chance) drops.push(d.id);
      });
    });
    G.gold += totalGold;
    drops.forEach(id => addItem(id, 1));

    let rewardMsg = `勝利！\n${totalExp} EXP　${totalGold} 両獲得！`;
    if (drops.length > 0) {
      rewardMsg += `\n${drops.map(id => ITEMS[id] ? ITEMS[id].name : id).join(', ')} を手に入れた！`;
    }
    msgs.push(rewardMsg);

    const lvUps = gainExp(totalExp);
    enqueueMsgs(msgs, () => {
      renderBattleScreen();
      showLevelUpsAndThen(lvUps, () => {
        if (Battle.onDone) Battle.onDone();
      });
    });

  } else {
    // ゲームオーバー
    enqueueMsgs(['全員が倒れた…'], () => {
      const pName = (G.party && G.party[0]) ? G.party[0].name : '勇';
      $('gameover-msg').textContent = `${pName}たちは倒れた…`;
      showScreen('gameover');
    });
  }
}

// ─── メッセージキュー ───
function enqueueMsgs(msgs, cb) {
  const flat = msgs.filter(Boolean);
  if (flat.length === 0) { if (cb) cb(); return; }

  let i = 0;
  let timerId = null;
  const msgEl = $('battle-message');

  function advance() {
    if (timerId) { clearTimeout(timerId); timerId = null; }
    if (i >= flat.length) {
      msgEl.removeEventListener('click', advance);
      msgEl.removeEventListener('touchstart', advance);
      if (cb) cb();
      return;
    }
    msgEl.textContent = flat[i++];
    timerId = setTimeout(advance, 900);
  }

  msgEl.addEventListener('click', advance);
  msgEl.addEventListener('touchstart', advance, { passive: true });
  advance();
}

// ─── バトル画面描画 ───
function renderBattleScreen() {
  renderEnemyArea();
  renderBattleParty();
}

// 白背景除去済みキャンバスのキャッシュ
const _enemyCanvasCache = {};

function removeWhiteBg(img) {
  try {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, c.width, c.height);
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i+1], b = px[i+2];
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
      const saturation = Math.max(r, g, b) - Math.min(r, g, b);
      if (brightness > 180 && saturation < 50) {
        px[i+3] = Math.max(0, Math.floor(px[i+3] * (1 - (brightness - 180) / 75)));
      }
    }
    cx.putImageData(d, 0, 0);
    return c.toDataURL();
  } catch (e) {
    return img.src;
  }
}

function renderEnemyArea() {
  const cont = $('battle-enemy-area');
  cont.innerHTML = '';
  const totalCount = Battle.enemies.filter(e => e).length;
  const isSingle   = totalCount === 1;
  const hasBoss    = Battle.enemies.some(e => e && e.isBoss);
  cont.style.flexWrap   = isSingle ? 'nowrap' : 'wrap';
  cont.style.gap        = isSingle ? '0' : '12px';
  cont.style.alignItems = (hasBoss && isSingle) ? 'center' : 'flex-end';
  cont.style.minHeight  = (hasBoss && isSingle) ? '300px' : '220px';

  Battle.enemies.forEach(e => {
    if (!e) return;
    const div = document.createElement('div');
    div.className = 'battle-enemy';

    const hpPct = e.maxHp > 0 ? (e.hp / e.maxHp) * 100 : 0;
    const hintHtml = e.analyzed && e.weaknessHint
      ? `<div class="enemy-hint">🔍 ${e.weaknessHint}</div>`
      : (e.analyzed ? `<div class="enemy-hint">🔍 弱点: ${e.weakness || 'なし'}</div>` : '');
    const bossHtml = e.isBoss ? '<div class="boss-label">BOSS</div>' : '';
    const deadStyle = e.isAlive ? '' : 'opacity:0.25;filter:grayscale(1)';

    // 単体:大きく / 複数:小さく並べる（画面幅に収まるよう上限を設ける）
    const maxW = Math.max(200, Math.min(window.innerWidth, 420) - 32);
    const spriteSize = isSingle
      ? (e.isBoss ? Math.min(300, maxW) : Math.min(240, maxW))
      : (e.isBoss ? 180 : 150);

    // ── スプライト（canvas経由で白背景除去）──
    const imgSrc = ENEMY_IMAGES[e.defId];
    const spriteEl = document.createElement('div');
    spriteEl.className = 'enemy-sprite-wrap' + (e.isBoss ? ' boss' : '');
    spriteEl.style.cssText = deadStyle ? deadStyle.split(';').map(s=>s.trim()).join(';') : '';

    if (imgSrc) {
      const img = new Image();
      img.onload = () => {
        const cacheKey = e.defId;
        if (!_enemyCanvasCache[cacheKey]) {
          _enemyCanvasCache[cacheKey] = removeWhiteBg(img);
        }
        const processed = document.createElement('img');
        processed.src = _enemyCanvasCache[cacheKey];
        processed.style.cssText = `width:${spriteSize}px;height:${spriteSize}px;max-width:100%;object-fit:contain;filter:drop-shadow(0 6px 18px rgba(0,0,0,0.9)) drop-shadow(0 0 10px rgba(200,60,60,0.5));`;
        if (!e.isAlive) { processed.style.opacity = '0.25'; processed.style.filter += ' grayscale(1)'; }
        spriteEl.appendChild(processed);
      };
      img.onerror = () => {
        spriteEl.innerHTML = `<div class="enemy-emoji" style="font-size:${spriteSize*0.4}px">${e.emoji}</div>`;
      };
      img.src = imgSrc;
    } else {
      spriteEl.innerHTML = `<div class="enemy-emoji" style="font-size:${spriteSize*0.4}px">${e.emoji}</div>`;
    }

    const infoEl = document.createElement('div');
    infoEl.innerHTML = `
      ${bossHtml}
      <div class="enemy-name">${e.name}</div>
      <div class="enemy-hp-bar">
        <span class="bar-label hp">HP</span>
        <div class="bar-wrap"><div class="bar-fill hp" style="width:${hpPct}%"></div></div>
        <span class="enemy-hp-num">${e.isAlive ? e.hp+'/'+e.maxHp : '倒した'}</span>
      </div>
      ${hintHtml}
    `;
    div.appendChild(spriteEl);
    div.appendChild(infoEl);
    cont.appendChild(div);
  });
}

function renderBattleParty() {
  const cont = $('battle-party');
  cont.innerHTML = '';
  getActiveParty().forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'battle-char' + (!c.isAlive ? ' dead' : '');
    const actor = currentActor();
    if (actor && actor.type === 'party' && actor.idx === i) {
      div.classList.add('active-turn');
    }
    const hpPct = c.maxHp > 0 ? (c.hp / c.maxHp) * 100 : 0;
    const mpPct = c.maxMp > 0 ? (c.mp / c.maxMp) * 100 : 0;
    const stLabel = statusLabel(c);
    div.innerHTML = `
      <div class="battle-char-name">${c.emoji} ${c.name}</div>
      <div class="battle-char-hp">
        <span class="bar-label hp" style="font-size:10px">HP</span>
        <div class="bar-wrap"><div class="bar-fill hp" style="width:${hpPct}%"></div></div>
        <span style="font-size:10px;color:var(--text-dim);white-space:nowrap">${c.hp}/${c.maxHp}</span>
      </div>
      <div class="battle-char-mp">
        <span class="bar-label mp" style="font-size:10px">MP</span>
        <div class="bar-wrap"><div class="bar-fill mp" style="width:${mpPct}%"></div></div>
        <span style="font-size:10px;color:var(--text-dim);white-space:nowrap">${c.mp}/${c.maxMp}</span>
      </div>
      <div class="battle-char-status">${stLabel}</div>
    `;
    cont.appendChild(div);
  });
}

function highlightActiveChar(idx) {
  document.querySelectorAll('.battle-char').forEach((el, i) => {
    el.classList.toggle('active-turn', i === idx);
  });
}

function showBattleActions() {
  const actor = currentActor();
  if (!actor || actor.type !== 'party') return;
  const char = getActiveParty()[actor.idx];
  if (!char || !char.isAlive) { advanceTurn(); return; }

  Battle.phase = 'player';
  const cont = $('battle-actions');
  cont.innerHTML = '';

  const btns = [
    { label:'攻撃',   fn: playerActionAttack },
    { label:'スキル', fn: showSkillMenu },
    { label:'アイテム', fn: showItemMenu },
    { label:'防御',   fn: playerActionDefend },
    { label:'逃げる', fn: playerActionRun },
  ];

  btns.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.textContent = b.label;
    btn.onclick = b.fn;
    cont.appendChild(btn);
  });

  renderBattleScreen();
}

function hideBattleActions() {
  $('battle-actions').innerHTML = '';
}

function showSkillMenu() {
  const actor = currentActor();
  if (!actor || actor.type !== 'party') return;
  const char = getActiveParty()[actor.idx];
  const sub = $('battle-sub-menu');
  sub.innerHTML = '';
  sub.classList.remove('hidden');

  const header = document.createElement('div');
  header.className = 'sub-menu-header';
  header.textContent = '── スキル ──';
  sub.appendChild(header);

  char.skills.forEach(skillId => {
    const sk = SKILLS[skillId];
    if (!sk) return;
    const btn = document.createElement('button');
    btn.className = 'sub-menu-item';
    btn.disabled = char.mp < sk.mpCost;
    btn.innerHTML = `<span>${sk.name}</span><span class="item-cost">MP ${sk.mpCost}　<span style="font-size:11px;color:var(--text-dim)">${sk.description}</span></span>`;
    btn.onclick = () => { hideSubMenu(); playerActionSkill(skillId); };
    sub.appendChild(btn);
  });

  const cancel = document.createElement('button');
  cancel.className = 'sub-menu-cancel';
  cancel.textContent = 'キャンセル';
  cancel.onclick = hideSubMenu;
  sub.appendChild(cancel);
}

function showItemMenu() {
  const usableItems = G.inventory.filter(s => {
    const item = ITEMS[s.id];
    return item && ['heal','healMP','healBoth','cure','revive'].includes(item.type);
  });
  const sub = $('battle-sub-menu');
  sub.innerHTML = '';
  sub.classList.remove('hidden');

  const header = document.createElement('div');
  header.className = 'sub-menu-header';
  header.textContent = '── アイテム ──';
  sub.appendChild(header);

  if (usableItems.length === 0) {
    const p = document.createElement('div');
    p.style.cssText = 'padding:8px;color:var(--text-dim);font-size:13px';
    p.textContent = '使えるアイテムがない。';
    sub.appendChild(p);
  }

  usableItems.forEach((slot, i) => {
    const item = ITEMS[slot.id];
    if (!item) return;
    const btn = document.createElement('button');
    btn.className = 'sub-menu-item';
    btn.innerHTML = `<span>${item.name} ×${slot.count}</span><span style="font-size:11px;color:var(--text-dim)">${item.description}</span>`;
    btn.onclick = () => { hideSubMenu(); playerActionItem(G.inventory.indexOf(slot)); };
    sub.appendChild(btn);
  });

  const cancel = document.createElement('button');
  cancel.className = 'sub-menu-cancel';
  cancel.textContent = 'キャンセル';
  cancel.onclick = hideSubMenu;
  sub.appendChild(cancel);
}

function hideSubMenu() {
  $('battle-sub-menu').classList.add('hidden');
  $('battle-sub-menu').innerHTML = '';
}

function statusJp(type) {
  return { poison:'毒', burn:'炎上', freeze:'氷結', stun:'眩暈' }[type] || type;
}

// ─────────────────────────────────────────────────────
//  ショップ
// ─────────────────────────────────────────────────────
function openShop(shopId) {
  const shop = SHOPS[shopId];
  if (!shop) return;
  $('shop-title').textContent = shop.name;
  $('shop-gold').textContent = G.gold;

  const list = $('shop-list');
  list.innerHTML = '';

  shop.items.forEach(itemId => {
    const item = ITEMS[itemId];
    if (!item) return;
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <div class="shop-item-info">
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.description}</div>
      </div>
      <div class="shop-item-price">${item.price} 両</div>
    `;
    div.onclick = () => {
      if (G.gold < item.price) { showMessage('両が足りない！'); return; }
      if (['weapon','armor','accessory'].includes(item.type)) {
        // 装備品は全員に選択させる
        buyEquipment(item);
      } else {
        G.gold -= item.price;
        addItem(itemId, 1);
        $('shop-gold').textContent = G.gold;
        showMessage(`${item.name}を購入した！`);
      }
    };
    list.appendChild(div);
  });

  showOverlay('overlay-shop');
}

function buyEquipment(item) {
  const party = getActiveParty();
  let html = '誰に装備させる？<br>';
  party.forEach((c, i) => {
    const current = c.equipment[item.slot];
    const currentName = current ? (ITEMS[current] ? ITEMS[current].name : current) : 'なし';
    html += `<br><button class="ok-btn" style="margin:4px" onclick="equipItemTo('${item.id}','${c.defId}');hideOverlay('overlay-message')">${c.name} (現在: ${currentName})</button>`;
  });
  html += `<br><button class="close-btn" style="margin-top:8px" onclick="hideOverlay('overlay-message')">キャンセル</button>`;
  showMessage(html);
}

function equipItemTo(itemId, charId) {
  const item = ITEMS[itemId];
  const char = G.allChars[charId];
  if (!item || !char) return;
  if (G.gold < item.price) { showMessage('両が足りない！'); return; }
  G.gold -= item.price;
  if (char.equipment[item.slot]) {
    addItem(char.equipment[item.slot], 1); // 旧装備をインベントリに戻す
  }
  char.equipment[item.slot] = itemId;
  const shopGoldEl = $('shop-gold');
  if (shopGoldEl) shopGoldEl.textContent = G.gold;
}

function doUnequip(charId, slot) {
  const char = G.allChars[charId];
  if (!char) return;
  if (char.equipment[slot]) {
    addItem(char.equipment[slot], 1);
    char.equipment[slot] = null;
  }
}

// ─────────────────────────────────────────────────────
//  宿屋
// ─────────────────────────────────────────────────────
function openInn() {
  $('inn-gold').textContent = G.gold;
  showOverlay('overlay-inn');
}

function innRest() {
  const cost = 50;
  if (G.gold < cost) { showMessage('両が足りない！'); return; }
  G.gold -= cost;
  getActiveParty().forEach(c => {
    c.hp = c.maxHp;
    c.mp = c.maxMp;
    c.statusEffects = [];
  });
  G.spiritPoints.cur = G.spiritPoints.max;
  hideOverlay('overlay-inn');
  showMessage('ゆっくり休んだ。HP・MP・霊力が全快した！', () => openMap());
}

// ─────────────────────────────────────────────────────
//  メニュー画面
// ─────────────────────────────────────────────────────
function openMenu(tab) {
  renderMenu(tab || 'status');
  showScreen('menu');
}

function renderMenu(tab) {
  // タブのアクティブ状態
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  const body = $('menu-body');
  body.innerHTML = '';

  if (tab === 'status')    renderStatusTab(body);
  if (tab === 'inventory') renderInventoryTab(body);
  if (tab === 'equipment') renderEquipmentTab(body);
  if (tab === 'save')      renderSaveTab(body);
}

function renderStatusTab(body) {
  getActiveParty().forEach(c => {
    const expPct = c.nextExp > 0 ? (c.exp / c.nextExp) * 100 : 0;
    const div = document.createElement('div');
    div.className = 'status-member';
    const stLabel = statusLabel(c);
    div.innerHTML = `
      <div class="status-head">
        <div class="status-emoji">${c.emoji}</div>
        <div class="status-name-area">
          <div class="status-char-name">${c.name}</div>
          <div class="status-role">${c.role}</div>
          <div class="status-level">Lv.${c.level}　${stLabel ? '<span style="color:var(--red)">'+stLabel+'</span>' : '正常'}</div>
        </div>
      </div>
      <div class="status-stats">
        <div class="stat-row"><span class="stat-label">HP</span><span class="stat-val">${c.hp} / ${c.maxHp}</span></div>
        <div class="stat-row"><span class="stat-label">MP</span><span class="stat-val">${c.mp} / ${c.maxMp}</span></div>
        <div class="stat-row"><span class="stat-label">攻撃</span><span class="stat-val">${getEffectiveStat(c,'atk')} (${c.atk}+${getEquippedStat(c,'atk')})</span></div>
        <div class="stat-row"><span class="stat-label">防御</span><span class="stat-val">${getEffectiveStat(c,'def')} (${c.def}+${getEquippedStat(c,'def')})</span></div>
        <div class="stat-row"><span class="stat-label">魔力</span><span class="stat-val">${getEffectiveStat(c,'mag')} (${c.mag}+${getEquippedStat(c,'mag')})</span></div>
        <div class="stat-row"><span class="stat-label">素早さ</span><span class="stat-val">${getEffectiveStat(c,'spd')}</span></div>
      </div>
      <div class="exp-bar-wrap">
        <span style="font-size:11px;color:var(--gold);width:30px">EXP</span>
        <div class="exp-bar-bg"><div class="exp-bar-fill" style="width:${expPct}%"></div></div>
        <span class="exp-text">${c.exp} / ${c.nextExp}</span>
      </div>
      <div class="status-skills">
        <div class="skills-label">習得スキル</div>
        <div class="skill-tags">
          ${c.skills.map(sid => {
            const sk = SKILLS[sid];
            return sk ? `<span class="skill-tag">${sk.name}</span>` : '';
          }).join('')}
        </div>
      </div>
    `;
    body.appendChild(div);
  });
}

function renderInventoryTab(body) {
  const goldDiv = document.createElement('div');
  goldDiv.className = 'gold-display';
  goldDiv.textContent = `所持金: ${G.gold} 両`;
  body.appendChild(goldDiv);

  if (G.inventory.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'inv-empty';
    empty.textContent = 'アイテムがない。';
    body.appendChild(empty);
    return;
  }

  G.inventory.forEach((slot, i) => {
    const item = ITEMS[slot.id];
    if (!item) return;
    const div = document.createElement('div');
    div.className = 'inv-item';
    div.innerHTML = `
      <div class="inv-item-info">
        <div class="inv-item-name">${item.name}</div>
        <div class="inv-item-desc">${item.description}</div>
      </div>
      <div class="inv-item-count">×${slot.count}</div>
    `;
    if (['heal','healMP','healBoth','cure','revive'].includes(item.type)) {
      div.title = 'クリックで使用';
      div.onclick = () => useItemFromMenu(slot.id, i);
    }
    body.appendChild(div);
  });
}

function useItemFromMenu(itemId, idx) {
  const item = ITEMS[itemId];
  if (!item) return;
  const target = getActiveParty().find(c => c.isAlive && (item.type === 'revive' ? !c.isAlive : true));
  const realTarget = item.type === 'revive'
    ? getActiveParty().find(c => !c.isAlive)
    : getActiveParty().find(c => c.isAlive);
  if (!realTarget) { showMessage('対象がいない。'); return; }
  const msgs = applyItem(item, realTarget);
  removeItem(itemId, 1);
  showMessage(msgs.join('<br>'), () => renderMenu('inventory'));
}

function renderEquipmentTab(body) {
  getActiveParty().forEach(c => {
    const div = document.createElement('div');
    div.className = 'equip-member';
    const weaponName   = c.equipment.weapon    ? (ITEMS[c.equipment.weapon]    ? ITEMS[c.equipment.weapon].name    : c.equipment.weapon)    : null;
    const armorName    = c.equipment.armor     ? (ITEMS[c.equipment.armor]     ? ITEMS[c.equipment.armor].name     : c.equipment.armor)     : null;
    const accessName   = c.equipment.accessory ? (ITEMS[c.equipment.accessory] ? ITEMS[c.equipment.accessory].name : c.equipment.accessory) : null;

    div.innerHTML = `
      <div class="equip-member-name">${c.emoji} ${c.name}</div>
      <div class="equip-slots">
        <div class="equip-slot">
          <span class="equip-slot-label">武器</span>
          ${weaponName ? `<span class="equip-slot-item">${weaponName}</span>` : '<span class="equip-slot-none">なし</span>'}
          <button class="equip-btn" onclick="openEquipSelect('${c.defId}','weapon')">変更</button>
        </div>
        <div class="equip-slot">
          <span class="equip-slot-label">防具</span>
          ${armorName ? `<span class="equip-slot-item">${armorName}</span>` : '<span class="equip-slot-none">なし</span>'}
          <button class="equip-btn" onclick="openEquipSelect('${c.defId}','armor')">変更</button>
        </div>
        <div class="equip-slot">
          <span class="equip-slot-label">装飾</span>
          ${accessName ? `<span class="equip-slot-item">${accessName}</span>` : '<span class="equip-slot-none">なし</span>'}
          <button class="equip-btn" onclick="openEquipSelect('${c.defId}','accessory')">変更</button>
        </div>
      </div>
    `;
    body.appendChild(div);
  });
}

function openEquipSelect(charId, slot) {
  const char = G.allChars[charId];
  if (!char) return;
  const available = G.inventory.filter(s => {
    const item = ITEMS[s.id];
    return item && item.slot === slot;
  });

  let html = `<b>${char.name}</b>の${slot === 'weapon' ? '武器' : slot === 'armor' ? '防具' : '装飾'}を選ぶ<br><br>`;
  if (available.length === 0) {
    html += '装備できるアイテムがない。';
  } else {
    available.forEach(s => {
      const item = ITEMS[s.id];
      if (!item) return;
      html += `<button class="ok-btn" style="margin:4px;font-size:12px" onclick="doEquip('${charId}','${s.id}');hideOverlay('overlay-message');renderMenu('equipment')">${item.name}　${item.description}</button><br>`;
    });
  }
  if (char.equipment[slot]) {
    html += `<br><button class="close-btn" onclick="doUnequip('${charId}','${slot}');hideOverlay('overlay-message');renderMenu('equipment')">外す</button>`;
  }
  html += `<br><button class="close-btn" style="margin-top:8px" onclick="hideOverlay('overlay-message')">キャンセル</button>`;
  showMessage(html);
}

function doEquip(charId, itemId) {
  const char = G.allChars[charId];
  const item = ITEMS[itemId];
  if (!char || !item || !item.slot) return;
  // 元の装備をインベントリに戻す
  if (char.equipment[item.slot]) {
    addItem(char.equipment[item.slot], 1);
  }
  // 新しい装備を外してからセット
  removeItem(itemId, 1);
  char.equipment[item.slot] = itemId;
}

function renderSaveTab(body) {
  const slots = document.createElement('div');
  slots.className = 'save-slots';

  for (let i = 1; i <= 3; i++) {
    const key = `onirpg_save_${i}`;
    const saved = localStorage.getItem(key);
    const slot = document.createElement('div');
    slot.className = 'save-slot';

    if (saved) {
      let data;
      try { data = JSON.parse(saved); } catch(e) { data = null; }
      const area = data ? (AREAS[data.area] ? AREAS[data.area].name : data.area) : '不明';
      const time = data ? (data.savedAt || '') : '';
      slot.innerHTML = `
        <div class="save-info">
          <div class="save-area">スロット${i}: ${area}</div>
          <div class="save-time">${time}</div>
        </div>
        <div class="save-btns">
          <button class="save-btn" onclick="saveGame(${i})">セーブ</button>
          <button class="load-btn" onclick="loadGame(${i})">ロード</button>
        </div>
      `;
    } else {
      slot.innerHTML = `
        <div class="save-info"><div class="save-area">スロット${i}: 空</div></div>
        <div class="save-btns">
          <button class="save-btn" onclick="saveGame(${i})">セーブ</button>
        </div>
      `;
    }
    slots.appendChild(slot);
  }
  body.appendChild(slots);
}

// ─────────────────────────────────────────────────────
//  セーブ・ロード
// ─────────────────────────────────────────────────────
function saveGame(slot) {
  const key  = `onirpg_save_${slot}`;
  const data = JSON.parse(JSON.stringify(G));
  data.savedAt = new Date().toLocaleString('ja-JP');
  localStorage.setItem(key, JSON.stringify(data));
  showMessage(`スロット${slot}にセーブした！`, () => renderMenu('save'));
}

function loadGame(slot) {
  const key  = `onirpg_save_${slot}`;
  const raw  = localStorage.getItem(key);
  if (!raw) { showMessage('セーブデータがない。'); return; }
  try {
    G = JSON.parse(raw);
    showMessage(`スロット${slot}からロードした！`, () => {
      openMap();
    });
  } catch(e) {
    showMessage('セーブデータが壊れている。');
  }
}

// ─────────────────────────────────────────────────────
//  エンディング
// ─────────────────────────────────────────────────────
function showEnding(type, title) {
  $('ending-subtitle').textContent = `── ENDING ${type} ──`;
  $('ending-title').textContent = title;
  const ev = type === 'A' ? EVENTS['ev_ending_a'] : EVENTS['ev_ending_b'];
  const texts = ev ? ev.steps.filter(s => s.type !== 'narrator' || true).map(s => {
    if (s.type === 'narrator') return s.text;
    if (s.type === 'player')   return `勇「${s.text}」`;
    if (s.type === 'companion') return `${s.speaker}「${s.text}」`;
    return '';
  }).filter(Boolean) : [];
  $('ending-text').innerHTML = texts.map(t => `<p>${t}</p>`).join('');
  showScreen('ending');
}

// ─────────────────────────────────────────────────────
//  名前入力
// ─────────────────────────────────────────────────────
function showNameEntry() {
  $('nameentry-input').value = '';
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
  showScreen('nameentry');
  setTimeout(() => $('nameentry-input').focus(), 300);
}

// ─────────────────────────────────────────────────────
//  プロローグ
// ─────────────────────────────────────────────────────
const PROLOGUE_PAGES = [
  {
    bg: 'burned_village',
    chapter: '── 序章 ──',
    text: '百年前、この地に鬼が現れた。\n\n炎は村を、山を、人の記憶を喰らい、\nただ鐘の音だけが夜に響いた。',
  },
  {
    bg: 'mountain_path',
    chapter: '── 序章 ──',
    text: '呪いは今も生きている。\n\nその鐘を鳴らした者は、\n消えることのない怨念に縛られるという。',
  },
  {
    bg: 'spirit_realm_gate',
    chapter: '── 旅立ち ──',
    text: null, // playerName を動的に埋める
  },
];

let _prologuePage = 0;
let _prologuePlayerName = '';

function startPrologue(playerName) {
  _prologuePage = 0;
  _prologuePlayerName = playerName;
  showScreen('prologue');
  renderProloguePage();
}

function renderProloguePage() {
  const page = PROLOGUE_PAGES[_prologuePage];
  const bgEl = $('prologue-bg');
  const bgSrc = BG_IMAGES[page.bg];
  bgEl.style.backgroundImage = bgSrc ? `url('${bgSrc}')` : '';

  $('prologue-chapter').textContent = page.chapter;

  let text = page.text;
  if (text === null) {
    text = `そして今、${_prologuePlayerName}は\n故郷の焼け跡に立っていた。\n\n── 鬼哭の鐘を止めに行かなければならない。`;
  }
  $('prologue-text').textContent = text;
}

function advancePrologue() {
  _prologuePage++;
  if (_prologuePage >= PROLOGUE_PAGES.length) {
    startNewGameAfterPrologue();
  } else {
    renderProloguePage();
  }
}

function startNewGame(playerName) {
  G = createInitialState();
  G.party[0].name = playerName;
  G.allChars['player'].name = playerName;
  startPrologue(playerName);
}

function startNewGameAfterPrologue() {
  G.areaEventIdx['burned_village'] = 0;
  const startMD = MAP_DATA[G.area];
  if (startMD && startMD.playerStart) {
    MapEngine.player.x = startMD.playerStart.x;
    MapEngine.player.y = startMD.playerStart.y;
  }
  openMap();
}

// ─────────────────────────────────────────────────────
//  初期化
// ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // タイトルボタン
  $('btn-new-game').onclick = () => showNameEntry();

  // 名前入力プリセット
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.onclick = () => {
      $('nameentry-input').value = btn.dataset.name;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
  });

  // 名前確定
  $('btn-nameentry-ok').onclick = () => {
    const raw = $('nameentry-input').value.trim();
    const playerName = raw || '勇';
    startNewGame(playerName);
  };

  // プロローグ：タップで次へ
  $('screen-prologue').onclick = () => advancePrologue();

  $('btn-load-game').onclick = () => {
    for (let i = 1; i <= 3; i++) {
      const raw = localStorage.getItem(`onirpg_save_${i}`);
      if (raw) {
        try {
          G = JSON.parse(raw);
          const saveMD = MAP_DATA[G.area];
          if (saveMD && saveMD.playerStart) {
            MapEngine.player.x = saveMD.playerStart.x;
            MapEngine.player.y = saveMD.playerStart.y;
          }
          openMap();
          return;
        } catch(e) {}
      }
    }
    showMessage('セーブデータがありません。\nはじめからプレイしてください。');
  };

  // メニュー タブ切替
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => renderMenu(btn.dataset.tab);
  });

  // メニュー閉じるボタン
  $('btn-close-menu').onclick = () => openMap(); // startLoop も呼ばれる

  // イベント画面クリックで進む
  $('screen-event').onclick = (e) => {
    if (e.target.classList.contains('choice-btn')) return;
    if (!Ev.choiceActive) advanceEvent();
  };

  // ゲームオーバー タイトルへ
  $('btn-gameover-title').onclick = () => {
    G = createInitialState();
    showScreen('title');
  };

  // エンディング タイトルへ
  $('btn-ending-title').onclick = () => {
    G = createInitialState();
    showScreen('title');
  };

  // 宿屋
  $('btn-inn-rest').onclick = innRest;
  $('btn-inn-leave').onclick = () => hideOverlay('overlay-inn');

  // ショップ閉じる
  $('btn-close-shop').onclick = () => hideOverlay('overlay-shop');

  // オーバーレイのOKボタン（動的に再バインドされるが念のため）
  $('btn-overlay-ok').onclick = () => hideOverlay('overlay-message');

  // レベルアップ（動的バインドのためここでは仮）
  $('btn-levelup-ok').onclick = () => hideOverlay('overlay-levelup');

  // キャンバスマップエンジン初期化
  MapEngine.init();

  // Dパッド初期化
  setupDpad();

  // ショップ・宿屋を閉じた後にマップループ再開
  $('btn-close-shop').onclick = () => { hideOverlay('overlay-shop'); openMap(); };
  $('btn-inn-leave').onclick = () => { hideOverlay('overlay-inn'); openMap(); };

  // 初期画面
  showScreen('title');

  console.log('鬼哭の鐘 — ゲームエンジン起動（ビジュアルマップ版）');
});
