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

let _shopNoticeTimer = null;
function showShopNotice(text) {
  const el = $('shop-notice');
  if (!el) return;
  el.textContent = text;
  el.classList.add('visible');
  if (_shopNoticeTimer) clearTimeout(_shopNoticeTimer);
  _shopNoticeTimer = setTimeout(() => {
    el.classList.remove('visible');
  }, 1800);
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
//  キャンバスマップエンジン（カメラ追従スクロール版）
//  実装パターン: MDN "Scrolling tilemaps" 準拠
//  - ビューポート分のみ描画（カリング）
//  - カメラはプレイヤー中心、マップ端でクランプ
//  - 移動はピクセル補間トゥイーン＋歩行アニメ
// ─────────────────────────────────────────────────────
const DIRV  = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };

// ── エリア別タイルテーマ ──────────────────────────────
// k=Kenney(屋外64px) / d=tiny-dungeon(石16px)。各タイルタイプの重ね描画レシピ。
const AREA_THEME = {
  burned_village:    'village',
  mountain_path:     'field',
  lake_village:      'village',
  oni_fortress:      'dungeon',
  mountain_ruins:    'dungeon',
  spirit_realm_gate: 'spirit',
  spirit_shallow:    'spirit',
  spirit_deep:       'spirit',
  bell_tower:        'dungeon',
};
// レシピ: [['k',idx] ...] を下から重ねる
const THEMES = {
  field: {
    floor:   [['k',8]],
    enc:     [['k',3],['k',4]],
    wall:    [['k',3],['k',180]],
    water:   [['k',3],['k',31]],
    warpbase:[['k',8]],
  },
  village: {
    floor:   [['k',3]],
    enc:     [['k',3],['k',4]],
    wall:    [['k',3],['k',180]],
    water:   [['k',3],['k',31]],
    warpbase:[['k',8]],
  },
  dungeon: {
    floor:   [['d',48]],
    enc:     [['d',49]],
    wall:    [['d',2]],
    water:   [['k',3],['k',31]],
    warpbase:[['d',48]],
  },
  spirit: {
    floor:   [['d',48]],
    enc:     [['d',49]],
    wall:    [['d',2]],
    water:   [['k',3],['k',31]],
    warpbase:[['d',48]],
    tint:    'rgba(96,44,150,0.30)',
  },
};

const MapEngine = {
  canvas:     null,
  ctx:        null,
  TILE:       40,                 // 描画タイルサイズ(px)
  VIEW_COLS:  15,                 // 表示列数（ビューポート）
  VIEW_ROWS:  11,                 // 表示行数
  sheets:     {},                 // 'kenney' / 'dungeon' のスプライトシート
  fieldImgs:  {},                 // NPCフィールドスプライト
  playerImg:  null,               // プレイヤー1枚絵スプライト

  player:  { x:1, y:1, px:0, py:0, dir:'down', moving:false, t:0,
             fromPx:0, fromPy:0, anim:0, animT:0 },
  camera:  { x:0, y:0 },
  keys:    {},
  MOVE_MS:    140,                // 1マス移動にかける時間
  loopId:       null,
  interactCD:   0,
  encCooldown:  0,
  _busy:        false,            // 戦闘/会話などで一時停止中

  // ── 初期化 ───────────────────────────────────────────
  init() {
    this.canvas = $('map-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.canvas.width  = this.VIEW_COLS * this.TILE;
    this.canvas.height = this.VIEW_ROWS * this.TILE;

    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'Enter') { this.tryInteract(); e.preventDefault(); }
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault();
    });
    document.addEventListener('keyup', e => { delete this.keys[e.code]; });

    this.preloadSheets();
    this.preloadFieldSprites();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  },

  preloadSheets() {
    const load = (src) => { const i = new Image(); i.src = src; return i; };
    this.sheets.kenney  = load('assets/kenney-rpg-base/Spritesheet/RPGpack_sheet.png');
    this.sheets.dungeon = load('assets/tiny-dungeon/Tilemap/tilemap_packed.png');
    this.playerImg      = load(PLAYER_FIELD_IMAGE);
  },

  preloadFieldSprites() {
    for (const src of Object.values(NPC_FIELD_IMAGES)) {
      if (!this.fieldImgs[src]) this.fieldImgs[src] = (() => { const i = new Image(); i.src = src; return i; })();
    }
  },

  resizeCanvas() {
    if (!this.canvas) return;
    const cw = this.VIEW_COLS * this.TILE;
    const ch = this.VIEW_ROWS * this.TILE;
    // 画面幅・高さに収まる最大スケール（アスペクト維持）
    const avW = window.innerWidth;
    const avH = window.innerHeight * 0.72;
    const scale = Math.min(avW / cw, avH / ch);
    this.canvas.style.width  = `${Math.floor(cw * scale)}px`;
    this.canvas.style.height = `${Math.floor(ch * scale)}px`;
  },

  // ── マップ寸法ヘルパー ────────────────────────────────
  curMap() { return MAP_DATA[G.area]; },
  cols()   { const m = this.curMap(); return m ? m.data[0].length : 0; },
  rows()   { const m = this.curMap(); return m ? m.data.length : 0; },

  // ── ループ ───────────────────────────────────────────
  startLoop() {
    this._busy = false;
    this.snapToTile();
    if (this.loopId) cancelAnimationFrame(this.loopId);
    let last = performance.now();
    const loop = ts => {
      const dt = Math.min(ts - last, 80);
      last = ts;
      if (G.screen === 'map' && !this._busy) { this.update(dt); }
      if (G.screen === 'map') this.render();
      this.loopId = requestAnimationFrame(loop);
    };
    this.loopId = requestAnimationFrame(loop);
  },

  stopLoop() {
    if (this.loopId) { cancelAnimationFrame(this.loopId); this.loopId = null; }
  },

  // 論理座標(player.x/y)からピクセル座標・カメラを再同期
  snapToTile() {
    const p = this.player;
    p.px = p.x * this.TILE;
    p.py = p.y * this.TILE;
    p.moving = false; p.t = 0; p.anim = 0; p.animT = 0;
    this.updateCamera();
  },

  // ── 更新 ─────────────────────────────────────────────
  update(dt) {
    this.interactCD = Math.max(0, this.interactCD - dt);
    const p = this.player;
    const TS = this.TILE;

    if (p.moving) {
      p.t += dt;
      const k = Math.min(1, p.t / this.MOVE_MS);
      p.px = p.fromPx + (p.x * TS - p.fromPx) * k;
      p.py = p.fromPy + (p.y * TS - p.fromPy) * k;
      if (k >= 1) {
        p.moving = false;
        p.px = p.x * TS; p.py = p.y * TS;
        this.onArrive();
        if (G.screen !== 'map') { this.updateCamera(); return; }
      }
    }

    if (!p.moving && !this._busy) {
      const dir = this.readDir();
      if (dir) {
        p.dir = dir;
        const [dx, dy] = DIRV[dir];
        const nx = p.x + dx, ny = p.y + dy;
        if (this.walkable(nx, ny)) {
          p.fromPx = p.px; p.fromPy = p.py;
          p.x = nx; p.y = ny;
          p.moving = true; p.t = 0; p.animT = 0;
        }
      }
    }
    this.updateCamera();
  },

  readDir() {
    const k = this.keys;
    if (k['ArrowLeft'])  return 'left';
    if (k['ArrowRight']) return 'right';
    if (k['ArrowUp'])    return 'up';
    if (k['ArrowDown'])  return 'down';
    return null;
  },

  walkable(x, y) {
    const md = this.curMap();
    if (!md) return false;
    const g = md.data;
    if (y < 0 || y >= g.length || x < 0 || x >= (g[0]||[]).length) return false;
    const t = g[y][x];
    if (t === T.WALL || t === T.WATER) return false;
    if ((md.npcs||[]).some(n => n.x === x && n.y === y && !(n.defeatedFlag && G.flags[n.defeatedFlag]))) return false;
    return true;
  },

  // 到着時：ワープ・エンカウント判定
  onArrive() {
    const md = this.curMap();
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
    this._busy = true;
    const cv = this.canvas;
    cv.style.transition = 'opacity 0.22s';
    cv.style.opacity = '0';
    setTimeout(() => {
      G.area = warp.toArea;
      if (AREAS[warp.toArea]) G.chapter = AREAS[warp.toArea].chapter;
      const md = MAP_DATA[warp.toArea];
      if (md) { this.player.x = warp.toX; this.player.y = warp.toY; }
      this.snapToTile();
      updateMapHUD();
      ensurePartyConsistency();
      cv.style.opacity = '1';
      this._busy = false;
    }, 240);
  },

  triggerEnc() {
    const md = this.curMap();
    if (!md || !md.enemies || !md.enemies.length) return;
    const id = md.enemies[randInt(0, md.enemies.length-1)];
    this._busy = true;
    // 戦闘突入フラッシュ
    this.battleFlash(() => {
      startBattle([createEnemyInstance(id)], () => {
        this.encCooldown = 5;
        showScreen('map');
        updateMapHUD();
        this._busy = false;
        this.snapToTile();
      });
    });
  },

  battleFlash(done) {
    const cv = this.canvas;
    cv.style.transition = 'filter 0.12s, transform 0.12s';
    cv.style.filter = 'brightness(3)';
    cv.style.transform = 'scale(1.04)';
    setTimeout(() => {
      cv.style.filter = ''; cv.style.transform = '';
      done();
    }, 160);
  },

  // ── インタラクト（会話） ─────────────────────────────
  tryInteract() {
    if (this.interactCD > 0 || this._busy || this.player.moving) return;
    const md = this.curMap();
    if (!md) return;

    const [ddx, ddy] = DIRV[this.player.dir] || [0, 1];
    const tx = this.player.x + ddx;
    const ty = this.player.y + ddy;

    const npc = (md.npcs||[]).find(n => n.x === tx && n.y === ty);
    if (!npc) return;
    if (npc.defeatedFlag && G.flags[npc.defeatedFlag]) return;

    this.interactCD = 400;
    this._busy = true;

    const resume = () => { showScreen('map'); updateMapHUD(); this._busy = false; this.snapToTile(); };

    const resumeOrBattle = npc.enemyId
      ? () => {
          startBattle([createEnemyInstance(npc.enemyId)], () => {
            if (npc.defeatedFlag) G.flags[npc.defeatedFlag] = true;
            resume();
          });
        }
      : resume;

    if (!npc.event) {
      const lines = {
        soldier_seen:  '「…仲間が…皆、燃えた…」',
        child_seen:    '「…お母さんはどこ…？」',
      };
      const msg = npc.seenFlag && lines[npc.seenFlag] ? `${npc.name}${lines[npc.seenFlag]}` : `${npc.name}「…」`;
      G.flags[npc.seenFlag] = true;
      showMessage(msg, resumeOrBattle);
      return;
    }

    if (npc.seenFlag && G.flags[npc.seenFlag]) {
      showMessage(`${npc.name}「…もう話すことはない。」`, resumeOrBattle);
      return;
    }

    if (npc.seenFlag) G.flags[npc.seenFlag] = true;
    runEvent(npc.event, resumeOrBattle);
  },

  // ── カメラ ───────────────────────────────────────────
  updateCamera() {
    const TS = this.TILE;
    const vw = this.VIEW_COLS * TS, vh = this.VIEW_ROWS * TS;
    const mapW = this.cols() * TS, mapH = this.rows() * TS;
    const p = this.player;
    let cx = p.px + TS/2 - vw/2;
    let cy = p.py + TS/2 - vh/2;
    cx = clamp(cx, 0, Math.max(0, mapW - vw));
    cy = clamp(cy, 0, Math.max(0, mapH - vh));
    if (mapW < vw) cx = (mapW - vw) / 2;   // マップが狭ければ中央寄せ
    if (mapH < vh) cy = (mapH - vh) / 2;
    this.camera.x = cx; this.camera.y = cy;
  },

  // ── タイル描画ヘルパー ───────────────────────────────
  drawKenney(idx, dx, dy) {
    const img = this.sheets.kenney;
    if (!img || !img.complete) return;
    const c = idx % 20, r = (idx / 20) | 0;
    this.ctx.drawImage(img, c*64, r*64, 64, 64, dx, dy, this.TILE, this.TILE);
  },
  drawDungeon(idx, dx, dy) {
    const img = this.sheets.dungeon;
    if (!img || !img.complete) return;
    const c = idx % 12, r = (idx / 12) | 0;
    this.ctx.drawImage(img, c*16, r*16, 16, 16, dx, dy, this.TILE, this.TILE);
  },

  // レシピを下から重ね描画
  drawRecipe(recipe, dx, dy) {
    for (const [sheet, idx] of recipe) {
      if (sheet === 'k') this.drawKenney(idx, dx, dy);
      else               this.drawDungeon(idx, dx, dy);
    }
  },

  // タイルタイプ → エリアテーマに沿った描画
  drawTileType(t, dx, dy, now) {
    const th = THEMES[this._theme] || THEMES.village;
    switch (t) {
      case T.FLOOR:     this.drawRecipe(th.floor, dx, dy); break;
      case T.ENCOUNTER: this.drawRecipe(th.enc,   dx, dy); break;
      case T.WATER:     this.drawRecipe(th.water, dx, dy); break;
      case T.WARP:
        this.drawRecipe(th.warpbase, dx, dy);
        this.drawWarpGlow(dx, dy, now); break;
      case T.WALL:
      default:          this.drawRecipe(th.wall,  dx, dy); break;
    }
    if (th.tint) {
      this.ctx.fillStyle = th.tint;
      this.ctx.fillRect(dx, dy, this.TILE, this.TILE);
    }
  },

  drawWarpGlow(dx, dy, now) {
    const ctx = this.ctx, TS = this.TILE;
    const pulse = 0.3 + 0.22 * Math.sin(now / 350);
    const cx = dx + TS/2, cy = dy + TS/2;
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, TS*0.55);
    rg.addColorStop(0, `rgba(255,240,120,${Math.min(1, pulse+0.25)})`);
    rg.addColorStop(0.5, `rgba(255,210,40,${pulse})`);
    rg.addColorStop(1, 'rgba(255,210,40,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(dx, dy, TS, TS);
  },

  // ── 描画 ─────────────────────────────────────────────
  render() {
    if (!this.ctx) return;
    const ctx = this.ctx, TS = this.TILE;
    const md  = this.curMap();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!md) return;

    const g   = md.data;
    const now = Date.now();
    const cam = this.camera;
    this._theme = AREA_THEME[G.area] || 'village';

    // 可視範囲（カリング）
    const startCol = Math.floor(cam.x / TS);
    const endCol   = Math.ceil((cam.x + this.canvas.width)  / TS);
    const startRow = Math.floor(cam.y / TS);
    const endRow   = Math.ceil((cam.y + this.canvas.height) / TS);

    // 地形タイル
    for (let ry = startRow; ry <= endRow; ry++) {
      for (let cx = startCol; cx <= endCol; cx++) {
        const t = (g[ry] && g[ry][cx] !== undefined) ? g[ry][cx] : T.WALL;
        const dx = Math.round(cx * TS - cam.x);
        const dy = Math.round(ry * TS - cam.y);
        this.drawTileType(t, dx, dy, now);
      }
    }

    const [ddx, ddy] = DIRV[this.player.dir] || [0, 1];

    // NPC（足元揃え・カメラ補正）
    (md.npcs||[]).forEach(npc => {
      if (npc.defeatedFlag && G.flags[npc.defeatedFlag]) return;
      const dx = Math.round(npc.x * TS - cam.x);
      const dy = Math.round(npc.y * TS - cam.y);
      if (dx < -TS*2 || dx > this.canvas.width+TS || dy < -TS*3 || dy > this.canvas.height+TS) return;
      const src = NPC_FIELD_IMAGES[npc.name];
      const img = src ? this.fieldImgs[src] : null;
      this.drawFieldSprite(dx, dy, img, 'down');
      // 隣接時の「！」
      if (npc.x === this.player.x+ddx && npc.y === this.player.y+ddy && !this.player.moving) {
        ctx.fillStyle = 'rgba(255,255,180,0.95)';
        ctx.fillRect(dx+TS/2-9, dy-20, 18, 16);
        ctx.fillStyle = '#222';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', dx+TS/2, dy-7);
        ctx.textAlign = 'left';
      }
    });

    // プレイヤー
    const pdx = Math.round(this.player.px - cam.x);
    const pdy = Math.round(this.player.py - cam.y);
    this.drawPlayer(pdx, pdy);

    // パーティHUD
    this.renderHUD(ctx);
  },

  // 足元の影＋スプライト（画像はタイル幅1.3倍・足が下端）
  drawFieldSprite(dx, dy, img, dir) {
    const ctx = this.ctx, TS = this.TILE;
    // 影
    const cx = dx + TS/2;
    const sh = ctx.createRadialGradient(cx, dy+TS-3, 0, cx, dy+TS-3, TS*0.5);
    sh.addColorStop(0, 'rgba(0,0,0,0.4)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(cx, dy+TS-3, TS*0.42, TS*0.14, 0, 0, Math.PI*2);
    ctx.fill();

    if (!img || !img.complete || !img.naturalWidth) {
      ctx.fillStyle = 'rgba(150,200,255,0.85)';
      ctx.beginPath(); ctx.arc(cx, dy+TS*0.55, TS*0.3, 0, Math.PI*2); ctx.fill();
      return;
    }
    const DW = TS * 1.35;
    const DH = DW * (img.naturalHeight / img.naturalWidth);
    const drawY = dy + TS - DH + 4;
    ctx.save();
    if (dir === 'left') { ctx.translate(cx*2, 0); ctx.scale(-1, 1); }
    ctx.drawImage(img, cx - DW/2, drawY, DW, DH);
    ctx.restore();
  },

  // プレイヤー（1枚絵スプライト＋歩行バウンド＋左右反転）
  drawPlayer(dx, dy) {
    const ctx = this.ctx, TS = this.TILE, p = this.player;
    const cx = dx + TS/2;
    // 歩行中の上下バウンド（移動進行度に同期した正弦）
    const bob = p.moving ? -Math.abs(Math.sin(p.t / this.MOVE_MS * Math.PI)) * (TS * 0.12) : 0;
    // 影
    const sh = ctx.createRadialGradient(cx, dy+TS-3, 0, cx, dy+TS-3, TS*0.5);
    sh.addColorStop(0, 'rgba(0,0,0,0.45)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(cx, dy+TS-3, TS*0.42, TS*0.14, 0, 0, Math.PI*2);
    ctx.fill();

    const img = this.playerImg;
    if (!img || !img.complete || !img.naturalWidth) {
      ctx.fillStyle = '#ffd54a';
      ctx.beginPath(); ctx.arc(cx, dy+TS*0.5, TS*0.32, 0, Math.PI*2); ctx.fill();
      return;
    }
    const DW = TS * 1.45;
    const DH = DW * (img.naturalHeight / img.naturalWidth);
    const drawY = dy + TS - DH + 4 + bob;
    ctx.save();
    if (p.dir === 'left') { ctx.translate(cx*2, 0); ctx.scale(-1, 1); }
    ctx.drawImage(img, cx - DW/2, drawY, DW, DH);
    ctx.restore();
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
      ctx.fillStyle = '#222';
      ctx.fillRect(10, y+15, 116, 7);
      const hpRatio = c.maxHp > 0 ? c.hp/c.maxHp : 0;
      ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(10, y+15, Math.floor(116*hpRatio), 7);
      ctx.fillStyle = '#bbb';
      ctx.font = '9px monospace';
      ctx.fillText(`HP ${c.hp}/${c.maxHp}`, 130, y+21);
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
function ensurePartyConsistency() {
  // 山道以降のエリアに到達しているのに朱鷺が未加入の場合は自動補完
  const POST_MOUNTAIN = ['lake_village','oni_fortress','mountain_ruins','spirit_realm_gate','spirit_shallow','spirit_deep','bell_tower'];
  if (POST_MOUNTAIN.includes(G.area) && !G.partyIds.includes('toki')) {
    joinCharacter('toki');
  }
  // 湖の村以降なら玄海・白も補完
  const POST_LAKE = ['oni_fortress','mountain_ruins','spirit_realm_gate','spirit_shallow','spirit_deep','bell_tower'];
  if (POST_LAKE.includes(G.area)) {
    if (!G.partyIds.includes('genkai')) joinCharacter('genkai');
    if (!G.partyIds.includes('haku'))   joinCharacter('haku');
  }
}

function openMap() {
  ensurePartyConsistency();
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

function fillPlayerName(text) {
  const name = (G.allChars && G.allChars['player']) ? G.allChars['player'].name : '勇';
  return text ? text.replace(/\{player\}/g, name) : text;
}

function processEventStep(step) {
  switch (step.type) {
    case 'narrator':
      setEventDialog('', '📜', fillPlayerName(step.text));
      break;
    case 'player': {
      const _pName = (G.allChars && G.allChars['player']) ? G.allChars['player'].name : '勇';
      setEventDialog(_pName, '⚔️', fillPlayerName(step.text), 'player');
      break;
    }
    case 'companion': {
      const _cid = SPEAKER_TO_CHAR[step.speaker];
      // キャラが未参加かつ、このイベント内でそのキャラが joinParty されない場合はスキップ
      if (_cid && _cid !== 'player' && !G.partyIds.includes(_cid)) {
        const _willJoin = Ev.steps.some(s => s.type === 'joinParty' && s.charId === _cid);
        if (!_willJoin) { advanceEvent(); break; }
      }
      setEventDialog(step.speaker, step.emoji || '👤', fillPlayerName(step.text));
      break;
    }
    case 'enemy':
      setEventDialog(step.speaker, '👹', fillPlayerName(step.text));
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
      startBattle([createEnemyInstance(step.enemyId)], () => {
        showScreen('event');
        advanceEvent();
      });
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

function setEventDialog(speaker, portrait, text, charIdOverride) {
  $('event-speaker').textContent = speaker || '';

  const portraitEl = $('event-portrait');
  const charId   = charIdOverride || SPEAKER_TO_CHAR[speaker];
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
  const introMsg = bossEnemy && ENEMY_DEFS[bossEnemy.defId] && ENEMY_DEFS[bossEnemy.defId].introMessage;
  if (introMsg) {
    setTimeout(() => enqueueMsgs([introMsg], () => processTurnStart()), 300);
  } else {
    setTimeout(() => processTurnStart(), 300);
  }
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

  // 単体対象の味方スキルはターゲット選択UIを出す
  if (skill.target === 'single_ally') {
    showSkillTargetMenu(skillId, char);
    return;
  }

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

function showSkillTargetMenu(skillId, char) {
  const skill = SKILLS[skillId];
  const sub = $('battle-sub-menu');
  sub.innerHTML = '';
  sub.classList.remove('hidden');

  const header = document.createElement('div');
  header.className = 'sub-menu-header';
  header.textContent = `── ${skill.name} — 誰に使う？ ──`;
  sub.appendChild(header);

  const targets = getActiveParty().filter(c => c.isAlive);

  targets.forEach(target => {
    const btn = document.createElement('button');
    btn.className = 'sub-menu-item';
    const hpPct = Math.floor((target.hp / target.maxHp) * 100);
    btn.innerHTML = `<span>${target.emoji} ${target.name}</span><span style="font-size:11px;color:var(--text-dim)">HP ${target.hp}/${target.maxHp} (${hpPct}%)</span>`;
    btn.onclick = () => {
      char.mp -= skill.mpCost;
      hideSubMenu();
      hideBattleActions();
      // single_ally なので target を上書きして適用
      const amount = Math.floor(target.maxHp * (skill.healPct || 0.3));
      target.hp = Math.min(target.maxHp, target.hp + amount);
      const msgs = [`${char.name}の${skill.name}！ ${target.name}のHPが${amount}回復！`];
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
  cancel.onclick = showSkillMenu;
  sub.appendChild(cancel);
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

    const lvUps = gainExp(totalExp);
    let rewardHtml = `<div class="reward-title">⚔ 勝　利 ⚔</div>`;
    rewardHtml += `<div class="reward-row">獲得経験値： <b>${totalExp}</b> EXP</div>`;
    rewardHtml += `<div class="reward-row">獲得両： <b>${totalGold}</b> 両</div>`;
    if (drops.length > 0) {
      const dropNames = drops.map(id => ITEMS[id] ? ITEMS[id].name : id).join('、');
      rewardHtml += `<div class="reward-row reward-drop">入手アイテム： ${dropNames}</div>`;
    }
    renderBattleScreen();
    showMessage(rewardHtml, () => {
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

// 白背景除去済みキャンバスのキャッシュ（v2: 閾値変更でリセット）
const _enemyCanvasCache = {};
const _REMOVE_BG_VER = 'v3';

function removeWhiteBg(img) {
  try {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, c.width, c.height);
    const px = d.data;
    // チェッカーパターン検出用：2x2ブロックの平均色を先に計算
    const w = c.width;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i+1], b = px[i+2];
      const brightness  = r * 0.299 + g * 0.587 + b * 0.114;
      const saturation  = Math.max(r, g, b) - Math.min(r, g, b);
      if (brightness > 200 && saturation < 60) {
        // 白・薄グレー背景 → 完全透過
        px[i+3] = 0;
      } else if (brightness > 160 && saturation < 35) {
        // フリンジ → 段階的に透過
        const t = (brightness - 160) / 40;
        px[i+3] = Math.floor(px[i+3] * (1 - t));
      } else if (brightness > 100 && brightness < 185 && saturation < 25) {
        // チェッカー柄グレー（JPEGに変換された透過部分）→ 完全透過
        px[i+3] = 0;
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
  cont.style.alignItems = 'center';
  if (hasBoss && isSingle) {
    cont.classList.add('boss-area');
  } else {
    cont.classList.remove('boss-area');
    cont.style.minHeight = '220px';
  }

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
      ? (e.isBoss ? maxW : Math.min(240, maxW))
      : (e.isBoss ? 180 : 150);

    // ── スプライト（canvas経由で白背景除去）──
    const imgSrc = ENEMY_IMAGES[e.defId];
    const spriteEl = document.createElement('div');
    spriteEl.className = 'enemy-sprite-wrap' + (e.isBoss ? ' boss' : '');
    spriteEl.style.cssText = deadStyle ? deadStyle.split(';').map(s=>s.trim()).join(';') : '';

    if (imgSrc) {
      if (e.isBoss) {
        // ボス画像は背景込みの完成画。canvas加工をスキップして原画をそのまま表示（画質保持）
        const processed = document.createElement('img');
        processed.src = imgSrc;
        processed.style.cssText = `width:100%;max-width:${spriteSize}px;height:auto;object-fit:contain;display:block;`;
        if (!e.isAlive) { processed.style.opacity = '0.25'; processed.style.filter = 'grayscale(1)'; }
        spriteEl.appendChild(processed);
      } else {
        const img = new Image();
        img.onload = () => {
          const cacheKey = `${e.defId}_${_REMOVE_BG_VER}`;
          if (!_enemyCanvasCache[cacheKey]) {
            _enemyCanvasCache[cacheKey] = removeWhiteBg(img);
          }
          const processed = document.createElement('img');
          processed.src = _enemyCanvasCache[cacheKey];
          processed.style.cssText = `width:${spriteSize}px;max-width:100%;height:auto;object-fit:contain;`;
          if (!e.isAlive) { processed.style.opacity = '0.25'; processed.style.filter = 'grayscale(1)'; }
          spriteEl.appendChild(processed);
        };
        img.onerror = () => {
          spriteEl.innerHTML = `<div class="enemy-emoji" style="font-size:${spriteSize*0.4}px">${e.emoji}</div>`;
        };
        img.src = imgSrc;
      }
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
      if (G.gold < item.price) { showShopNotice('両が足りない！'); return; }
      if (['weapon','armor','accessory'].includes(item.type)) {
        // 装備品は全員に選択させる
        buyEquipment(item);
      } else {
        G.gold -= item.price;
        addItem(itemId, 1);
        $('shop-gold').textContent = G.gold;
        showShopNotice(`${item.name} を購入しました（−${item.price}両）`);
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
  if (G.gold < item.price) { showShopNotice('両が足りない！'); return; }
  G.gold -= item.price;
  if (char.equipment[item.slot]) {
    addItem(char.equipment[item.slot], 1); // 旧装備をインベントリに戻す
  }
  char.equipment[item.slot] = itemId;
  const shopGoldEl = $('shop-gold');
  if (shopGoldEl) shopGoldEl.textContent = G.gold;
  showShopNotice(`${char.name}に「${item.name}」を装備しました（−${item.price}両）`);
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
  if (tab === 'skill')     renderSkillTab(body);
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
      div.style.cursor = 'pointer';
      div.onclick = () => useItemFromMenu(slot.id);
    }
    body.appendChild(div);
  });
}

function useItemFromMenu(itemId) {
  const item = ITEMS[itemId];
  if (!item) return;
  const isRevive = item.type === 'revive';
  const candidates = getActiveParty().filter(c => isRevive ? !c.isAlive : c.isAlive);
  if (candidates.length === 0) { showMessage(isRevive ? '戦闘不能の者がいない。' : '使える相手がいない。'); return; }
  selectFieldTarget(candidates, '誰に使う？', target => {
    const msgs = applyItem(item, target);
    removeItem(itemId, 1);
    showMessage(msgs.join('<br>'), () => renderMenu('inventory'));
  });
}

function selectFieldTarget(candidates, title, onSelect) {
  let html = `<div style="margin-bottom:8px;font-size:14px;color:var(--gold)">${title}</div>`;
  candidates.forEach(c => {
    const hpPct = Math.round(c.hp / c.maxHp * 100);
    const mpPct = c.maxMp > 0 ? Math.round(c.mp / c.maxMp * 100) : 0;
    html += `<button class="ok-btn" style="display:block;width:100%;margin:4px 0;text-align:left;padding:8px 12px"
      onclick="hideOverlay('overlay-message');window._fieldTargetCb && window._fieldTargetCb('${c.defId}')">
      <div>${c.emoji} ${c.name}</div>
      <div style="font-size:12px;color:var(--text-dim);margin-top:2px">
        <span style="color:#ff8a8a">HP ${c.hp}/${c.maxHp} (${hpPct}%)</span>
        <span style="margin-left:10px;color:#8ab4ff">MP ${c.mp}/${c.maxMp} (${mpPct}%)</span>
      </div>
    </button>`;
  });
  html += `<button class="close-btn" style="margin-top:8px;width:100%" onclick="hideOverlay('overlay-message')">キャンセル</button>`;
  window._fieldTargetCb = defId => {
    const target = getActiveParty().find(c => c.defId === defId);
    if (target) onSelect(target);
    window._fieldTargetCb = null;
  };
  showMessage(html);
}

function renderSkillTab(body) {
  const FIELD_SKILL_TYPES = ['heal'];
  const party = getActiveParty();
  let anySkill = false;
  party.forEach(c => {
    const fieldSkills = (c.skills || []).filter(sid => {
      const sk = PLAYER_SKILLS[sid];
      return sk && FIELD_SKILL_TYPES.includes(sk.type);
    });
    if (fieldSkills.length === 0) return;
    anySkill = true;
    const section = document.createElement('div');
    section.className = 'skill-section';
    section.innerHTML = `<div class="skill-section-name">${c.emoji} ${c.name}</div>`;
    fieldSkills.forEach(sid => {
      const sk = PLAYER_SKILLS[sid];
      const canUse = c.mp >= sk.mpCost;
      const btn = document.createElement('div');
      btn.className = 'inv-item' + (canUse ? '' : ' inv-item-disabled');
      btn.innerHTML = `
        <div class="inv-item-info">
          <div class="inv-item-name">${sk.name}</div>
          <div class="inv-item-desc">${sk.description}　消費MP: ${sk.mpCost}</div>
        </div>
        <div class="inv-item-count" style="color:var(--blue)">MP${c.mp}</div>
      `;
      if (canUse) {
        btn.onclick = () => useSkillFromMenu(c, sk);
      }
      section.appendChild(btn);
    });
    body.appendChild(section);
  });
  if (!anySkill) {
    const empty = document.createElement('div');
    empty.className = 'inv-empty';
    empty.textContent = 'フィールドで使える術がない。';
    body.appendChild(empty);
  }
}

function useSkillFromMenu(caster, skill) {
  const candidates = getActiveParty().filter(c => c.isAlive);
  if (candidates.length === 0) { showMessage('対象がいない。'); return; }
  selectFieldTarget(candidates, `${caster.name}の「${skill.name}」<br>誰に使う？`, target => {
    if (caster.mp < skill.mpCost) { showMessage('MPが足りない！'); return; }
    caster.mp -= skill.mpCost;
    const healAmt = Math.floor(target.maxHp * (skill.healPct || 0.3));
    target.hp = Math.min(target.maxHp, target.hp + healAmt);
    showMessage(`${caster.name}の${skill.name}！\n${target.name}のHPが ${healAmt} 回復した！`, () => renderMenu('skill'));
  });
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
  // プレイヤーのマップ上の位置をGに焼き込む（ロード時に正確に復元するため）
  G.playerPos = { x: MapEngine.player.x, y: MapEngine.player.y, dir: MapEngine.player.dir };
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
      restorePlayerPosition();
      openMap();
    });
  } catch(e) {
    showMessage('セーブデータが壊れている。');
  }
}

// セーブデータの位置（無ければエリア初期位置）へプレイヤーを復元
function restorePlayerPosition() {
  const md = MAP_DATA[G.area];
  const pp = G.playerPos;
  if (pp && Number.isFinite(pp.x) && Number.isFinite(pp.y)) {
    MapEngine.player.x = pp.x; MapEngine.player.y = pp.y;
    MapEngine.player.dir = pp.dir || 'down';
  } else if (md && md.playerStart) {
    MapEngine.player.x = md.playerStart.x; MapEngine.player.y = md.playerStart.y;
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
    if (s.type === 'player')   return `${(G.allChars && G.allChars['player']) ? G.allChars['player'].name : '勇'}「${s.text}」`;
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
    text: '百年前、この地に呪いが生まれた。\n\n村人は鬼に変えられ、\n鐘の音と共に幽路へ封じられた。',
  },
  {
    bg: 'mountain_path',
    chapter: '── 序章 ──',
    text: '百年が過ぎ、封印は静かに弱まっていた。\n\n──そして今、鬼たちは再び\n現世に戻りはじめている。',
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
    text = `そして今、${_prologuePlayerName}は\n焼け跡となった故郷に立っていた。\n\n── 鬼哭の鐘の謎を、追わなければならない。`;
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
          restorePlayerPosition();
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
