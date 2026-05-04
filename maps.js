'use strict';
/* =====================================================
   maps.js — タイルマップデータ
   ===================================================== */

// ─── タイルタイプ定数 ─────────────────────────────────
const T = {
  WALL:      0,   // 壁（通行不可）
  FLOOR:     1,   // 床（安全）
  ENCOUNTER: 2,   // 床（エンカウント発生）
  WARP:      3,   // ワープポイント（次エリアへ）
  WATER:     4,   // 水（通行不可）
};

// タイルタイプ → スプライトID（Tiny Dungeon個別PNG番号）
const TILE_SPRITE = {};
TILE_SPRITE[T.WALL]      = 0;    // tile_0000 石の壁
TILE_SPRITE[T.FLOOR]     = 48;   // tile_0048 砂色の床
TILE_SPRITE[T.ENCOUNTER] = 36;   // tile_0036 青い地面（危険地帯）
TILE_SPRITE[T.WARP]      = 79;   // tile_0079 出口
TILE_SPRITE[T.WATER]     = 14;   // tile_0014 水面

// マップサイズ（固定）
const MAP_W = 20;
const MAP_H = 15;

// ─── マップ構築ヘルパー ───────────────────────────────
function mkMap(fillTile) {
  return Array.from({length: MAP_H}, () => new Array(MAP_W).fill(fillTile !== undefined ? fillTile : T.FLOOR));
}

function addBorder(m) {
  for (let x = 0; x < MAP_W; x++) { m[0][x] = T.WALL; m[MAP_H-1][x] = T.WALL; }
  for (let y = 0; y < MAP_H; y++) { m[y][0] = T.WALL; m[y][MAP_W-1] = T.WALL; }
}

function fillRect(m, x1, y1, x2, y2, t) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) m[y][x] = t;
    }
  }
}

function hollowRect(m, x1, y1, x2, y2, t) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (y === y1 || y === y2 || x === x1 || x === x2) {
        if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) m[y][x] = t;
      }
    }
  }
}

// ─── エリアマップデータ ────────────────────────────────
const MAP_DATA = {};

// ── 第1章: 焼かれた村 ────────────────────────────────
(function() {
  const m = mkMap(T.FLOOR);
  addBorder(m);
  // 廃屋1・2（左上）
  hollowRect(m, 2, 2, 5, 4, T.WALL);
  hollowRect(m, 7, 2, 11, 4, T.WALL);
  // 廃屋3・4（中央）
  hollowRect(m, 2, 8, 6, 11, T.WALL);
  hollowRect(m, 12, 8, 17, 11, T.WALL);
  // 右出口（山道へ）
  m[13][18] = T.WARP;
  m[13][19] = T.FLOOR;

  MAP_DATA['burned_village'] = {
    data: m,
    playerStart: { x: 1, y: 13 },
    npcs: [
      { x:5,  y:6,  spriteId:84, name:'老人の霊',   event:'ev_intro',  seenFlag:'ev_intro_seen' },
      { x:10, y:7,  spriteId:88, name:'兵士の亡霊', event:null,        seenFlag:'soldier_seen'  },
      { x:14, y:9,  spriteId:96, name:'子供の霊',   event:null,        seenFlag:'child_seen'    },
    ],
    warps: [
      { x:18, y:13, toArea:'mountain_path', toX:1,  toY:7  },
      { x:19, y:13, toArea:'mountain_path', toX:1,  toY:7  },
    ],
    encounterRate: 0,
    encounterTiles: [],
    enemies: [],
  };
})();

// ── 第1章: 山道 ──────────────────────────────────────
(function() {
  const m = mkMap(T.ENCOUNTER);
  addBorder(m);
  // 中央の安全な通路
  for (let x = 1; x < MAP_W-1; x++) m[7][x] = T.FLOOR;
  // 岩場（装飾的な壁）
  hollowRect(m, 4, 2, 8, 5, T.WALL);
  hollowRect(m, 11, 9, 16, 12, T.WALL);
  // 左入口（村からの入口）
  m[7][0] = T.WARP;
  // 右出口（湖の村へ）
  m[13][18] = T.WARP;
  m[13][19] = T.FLOOR;

  MAP_DATA['mountain_path'] = {
    data: m,
    playerStart: { x: 1, y: 7 },
    npcs: [
      { x:10, y:3, spriteId:84, name:'山の精霊', event:'ev_meet_genkai_haku', seenFlag:'genkai_seen' },
    ],
    warps: [
      { x:0,  y:7,  toArea:'burned_village', toX:17, toY:13 },
      { x:18, y:13, toArea:'lake_village',   toX:1,  toY:7  },
      { x:19, y:13, toArea:'lake_village',   toX:1,  toY:7  },
    ],
    encounterRate: 0.10,
    encounterTiles: [T.ENCOUNTER],
    enemies: ['noOni', 'yamaOni'],
  };
})();

// ── 第2章: 湖の村 ─────────────────────────────────────
(function() {
  const m = mkMap(T.FLOOR);
  addBorder(m);
  // 建物群
  hollowRect(m, 2, 2, 5, 4, T.WALL);
  hollowRect(m, 8, 2, 12, 5, T.WALL);
  hollowRect(m, 3, 8, 7, 11, T.WALL);
  // 湖（右下）
  fillRect(m, 12, 10, 18, 13, T.WATER);
  // 左入口（山道から）
  m[7][0] = T.WARP;
  // 右出口（砦へ）
  m[8][18] = T.WARP;
  m[8][19] = T.FLOOR;

  MAP_DATA['lake_village'] = {
    data: m,
    playerStart: { x: 1, y: 7 },
    npcs: [
      { x:9,  y:4, spriteId:84, name:'村の長老',  event:'ev_lake_arrival', seenFlag:'lake_arrival_seen' },
      { x:5,  y:9, spriteId:86, name:'村の武士',  event:'ev_lake_shrine',  seenFlag:'lake_shrine_seen'  },
    ],
    warps: [
      { x:0,  y:7,  toArea:'mountain_path', toX:17, toY:13 },
      { x:18, y:8,  toArea:'oni_fortress',  toX:1,  toY:7  },
      { x:19, y:8,  toArea:'oni_fortress',  toX:1,  toY:7  },
    ],
    encounterRate: 0,
    encounterTiles: [],
    enemies: [],
  };
})();

// ── 第2章: 鬼の砦 ─────────────────────────────────────
(function() {
  const m = mkMap(T.ENCOUNTER);
  addBorder(m);
  // 外廊下（横）
  for (let x = 1; x < MAP_W-1; x++) { m[3][x] = T.FLOOR; m[11][x] = T.FLOOR; }
  // 外廊下（縦）
  for (let y = 3; y <= 11; y++) { m[y][2] = T.FLOOR; m[y][17] = T.FLOOR; }
  // 中央の建造物（壁）
  hollowRect(m, 6, 5, 14, 9, T.WALL);
  // 左入口（湖の村から）
  m[7][0] = T.WARP;
  // 右出口（廃墟へ）
  m[11][18] = T.WARP;
  m[11][19] = T.FLOOR;

  MAP_DATA['oni_fortress'] = {
    data: m,
    playerStart: { x: 1, y: 7 },
    npcs: [
      { x:4,  y:7, spriteId:87, name:'鬼の番兵', event:'ev_fortress_enter', seenFlag:'fortress_enter_seen' },
      { x:16, y:7, spriteId:87, name:'炎鬼将',   event:'ev_boss_ch2',      seenFlag:'boss_ch2_seen'       },
    ],
    warps: [
      { x:0,  y:7,  toArea:'lake_village',   toX:17, toY:8  },
      { x:18, y:11, toArea:'mountain_ruins', toX:1,  toY:7  },
      { x:19, y:11, toArea:'mountain_ruins', toX:1,  toY:7  },
    ],
    encounterRate: 0.12,
    encounterTiles: [T.ENCOUNTER],
    enemies: ['nakaOni', 'oniZamurai'],
  };
})();

// ── 第3章: 山奥の廃墟 ───────────────────────────────────
(function() {
  const m = mkMap(T.ENCOUNTER);
  addBorder(m);
  // 通路
  for (let x = 1; x < MAP_W-1; x++) m[7][x] = T.FLOOR;
  // 廃寺の残骸
  hollowRect(m, 3, 2, 9, 5, T.WALL);
  hollowRect(m, 10, 9, 17, 12, T.WALL);
  // 左入口（砦から）
  m[7][0] = T.WARP;
  // 右出口（幽冥の門へ）
  m[13][18] = T.WARP;
  m[13][19] = T.FLOOR;

  MAP_DATA['mountain_ruins'] = {
    data: m,
    playerStart: { x: 1, y: 7 },
    npcs: [
      { x:5,  y:3,  spriteId:84, name:'古い記録',  event:'ev_ruins_records', seenFlag:'ruins_records_seen' },
      { x:14, y:10, spriteId:88, name:'玄海',       event:'ev_ruins_haku',    seenFlag:'ruins_haku_seen'    },
    ],
    warps: [
      { x:0,  y:7,  toArea:'oni_fortress',      toX:17, toY:11 },
      { x:18, y:13, toArea:'spirit_realm_gate', toX:1,  toY:7  },
      { x:19, y:13, toArea:'spirit_realm_gate', toX:1,  toY:7  },
    ],
    encounterRate: 0.12,
    encounterTiles: [T.ENCOUNTER],
    enemies: ['oniBoshi', 'oniSho', 'yoroiOni'],
  };
})();

// ── 第3章: 幽冥の門 ──────────────────────────────────────
(function() {
  const m = mkMap(T.FLOOR);
  addBorder(m);
  // 石柱（左右対称）
  hollowRect(m, 5, 2, 7, 5, T.WALL);
  hollowRect(m, 12, 2, 14, 5, T.WALL);
  hollowRect(m, 5, 9, 7, 12, T.WALL);
  hollowRect(m, 12, 9, 14, 12, T.WALL);
  // 左入口（廃墟から）
  m[7][0] = T.WARP;
  // 右出口（幽路浅瀬へ）
  m[13][18] = T.WARP;
  m[13][19] = T.FLOOR;

  MAP_DATA['spirit_realm_gate'] = {
    data: m,
    playerStart: { x: 1, y: 7 },
    npcs: [
      { x:9, y:3,  spriteId:96, name:'幽冥の門番',  event:'ev_gate_open',  seenFlag:'gate_open_seen'  },
      { x:9, y:10, spriteId:87, name:'幽路の守護者', event:'ev_boss_ch3',   seenFlag:'boss_ch3_seen'   },
    ],
    warps: [
      { x:0,  y:7,  toArea:'mountain_ruins', toX:17, toY:13 },
      { x:18, y:13, toArea:'spirit_shallow', toX:1,  toY:7  },
      { x:19, y:13, toArea:'spirit_shallow', toX:1,  toY:7  },
    ],
    encounterRate: 0,
    encounterTiles: [],
    enemies: [],
  };
})();

// ── 第4章: 幽冥・浅瀬 ───────────────────────────────────
(function() {
  const m = mkMap(T.ENCOUNTER);
  addBorder(m);
  // 安全な中央通路（縦横）
  for (let x = 1; x < MAP_W-1; x++) { m[4][x] = T.FLOOR; m[10][x] = T.FLOOR; }
  for (let y = 4; y <= 10; y++) { m[y][4] = T.FLOOR; m[y][15] = T.FLOOR; }
  // 左入口（幽冥の門から）
  m[7][0] = T.WARP;
  // 右出口（幽冥深部へ）
  m[7][18] = T.WARP;
  m[7][19] = T.FLOOR;

  MAP_DATA['spirit_shallow'] = {
    data: m,
    playerStart: { x: 1, y: 7 },
    npcs: [
      { x:9, y:4,  spriteId:96, name:'迷える霊',  event:'ev_spirit_arrive',     seenFlag:'spirit_arrive_seen'     },
      { x:9, y:10, spriteId:96, name:'白の記憶',   event:'ev_spirit_haku_truth', seenFlag:'spirit_haku_truth_seen' },
    ],
    warps: [
      { x:0,  y:7,  toArea:'spirit_realm_gate', toX:17, toY:13 },
      { x:18, y:7,  toArea:'spirit_deep',       toX:1,  toY:7  },
      { x:19, y:7,  toArea:'spirit_deep',       toX:1,  toY:7  },
    ],
    encounterRate: 0.15,
    encounterTiles: [T.ENCOUNTER],
    enemies: ['yoroiOni', 'yuuOni', 'onryoOni'],
  };
})();

// ── 第4章: 幽冥・深部 ───────────────────────────────────
(function() {
  const m = mkMap(T.ENCOUNTER);
  addBorder(m);
  // 通路
  for (let x = 1; x < MAP_W-1; x++) { m[4][x] = T.FLOOR; m[10][x] = T.FLOOR; }
  // 左入口（浅瀬から）
  m[7][0] = T.WARP;
  // 右出口（鐘楼へ）
  m[13][18] = T.WARP;
  m[13][19] = T.FLOOR;

  MAP_DATA['spirit_deep'] = {
    data: m,
    playerStart: { x: 1, y: 7 },
    npcs: [
      { x:9, y:4,  spriteId:96, name:'呪術師の怨念', event:'ev_deep_curse', seenFlag:'deep_curse_seen' },
      { x:9, y:10, spriteId:87, name:'幽鬼王',        event:'ev_boss_ch4',  seenFlag:'boss_ch4_seen'   },
    ],
    warps: [
      { x:0,  y:7,  toArea:'spirit_shallow', toX:17, toY:7  },
      { x:18, y:13, toArea:'bell_tower',     toX:1,  toY:7  },
      { x:19, y:13, toArea:'bell_tower',     toX:1,  toY:7  },
    ],
    encounterRate: 0.15,
    encounterTiles: [T.ENCOUNTER],
    enemies: ['onryoOni', 'yuuOni'],
  };
})();

// ── 第5章: 鐘楼 ──────────────────────────────────────────
(function() {
  const m = mkMap(T.FLOOR);
  addBorder(m);
  // 塔の柱構造
  hollowRect(m, 4, 2, 7, 6, T.WALL);
  hollowRect(m, 12, 2, 16, 6, T.WALL);
  hollowRect(m, 4, 8, 7, 12, T.WALL);
  hollowRect(m, 12, 8, 16, 12, T.WALL);
  // 左入口（幽冥深部から）
  m[7][0] = T.WARP;
  // 出口なし（最終エリア）

  MAP_DATA['bell_tower'] = {
    data: m,
    playerStart: { x: 1, y: 7 },
    npcs: [
      { x:9, y:4,  spriteId:96, name:'白の残像',  event:'ev_bell_arrive', seenFlag:'bell_arrive_seen' },
      { x:9, y:10, spriteId:87, name:'鬼哭の霊',  event:'ev_final_boss',  seenFlag:'final_boss_seen'  },
    ],
    warps: [
      { x:0,  y:7, toArea:'spirit_deep', toX:17, toY:13 },
    ],
    encounterRate: 0,
    encounterTiles: [],
    enemies: [],
  };
})();
