'use strict';
/* =====================================================
   images.js — 鬼哭の鐘 画像マッピング
   ===================================================== */

const CHAR_IMAGES = {
  player: 'assets/images/chars/player.png',
  toki:   'assets/images/chars/toki.png',
  genkai: 'assets/images/chars/genkai.png',
  haku:   'assets/images/chars/haku.png',
};

const ENEMY_IMAGES = {
  noOni:       'assets/images/enemies/noOni.png',
  yamaOni:     'assets/images/enemies/yamaOni.png',
  nakaOni:     'assets/images/enemies/nakaOni.png',
  oniZamurai:  'assets/images/enemies/oniZamurai.png',
  oniBoshi:    'assets/images/enemies/oniBoshi.png',
  oniSho:      'assets/images/enemies/oniSho.png',
  yoroiOni:    'assets/images/enemies/yoroiOni.png',
  yuuOni:      'assets/images/enemies/yuuOni.png',
  onryoOni:    'assets/images/enemies/onryoOni.png',
  honooOniSho: 'assets/images/enemies/honooOniSho.png',
  kooruOniSho: 'assets/images/enemies/kooruOniSho.png',
  oniTaisho:   'assets/images/enemies/oniTaisho.png',
  yuuOniO:     'assets/images/enemies/yuuOniO.png',
  kikokuShin:  'assets/images/enemies/kikokuShin.png',
};

const BG_IMAGES = {
  burned_village:    'assets/images/bg/burned_village.png',
  mountain_path:     'assets/images/bg/mountain_path.png',
  lake_village:      'assets/images/bg/lake_village.png',
  oni_fortress:      'assets/images/bg/oni_fortress.png',
  mountain_ruins:    'assets/images/bg/mountain_ruins.png',
  spirit_realm_gate: 'assets/images/bg/spirit_realm_gate.png',
  spirit_shallow:    'assets/images/bg/spirit_shallow.png',
  spirit_deep:       'assets/images/bg/spirit_deep.png',
  bell_tower:        'assets/images/bg/bell_tower.png',
};

// イベント画面でのスピーカー名 → キャラID マッピング
const SPEAKER_TO_CHAR = {
  '勇':  'player',
  '朱鷺': 'toki',
  '玄海': 'genkai',
  '白':  'haku',
};

// フィールドマップ用スプライト
const PLAYER_FIELD_IMAGE = 'assets/images/chars/player_field.png';

// ── 村人系 NPC ──────────────────────────────────────────
const NPC_FIELD_IMAGES_VILLAGER = {
  // 老人（男）
  '老人の霊':     'assets/images/chars/npc_field_murabito_senior_man_green.png',
  '村の長老':     'assets/images/chars/npc_field_murabito_senior_man_green.png',
  '玄海':         'assets/images/chars/npc_field_murabito_senior_man_green.png',
  // 老人（女）
  '古い記録':     'assets/images/chars/npc_field_murabito_senior_woman_purple.png',
  '迷える霊':     'assets/images/chars/npc_field_murabito_senior_woman_green.png',
  // 大人（男）
  '兵士の亡霊':   'assets/images/chars/npc_field_murabito_middle_man_green.png',
  '村の武士':     'assets/images/chars/npc_field_murabito_middle_man_blue.png',
  // 大人（女）
  '山の精霊':     'assets/images/chars/npc_field_murabito_young_woman_green.png',
  // 子供（男）
  '子供の霊':     'assets/images/chars/npc_field_murabito_child_02_man_orange.png',
  // 子供（女）
  '白の記憶':     'assets/images/chars/npc_field_murabito_child_02_woman_green.png',
  '白の残像':     'assets/images/chars/npc_field_murabito_child_02_woman_green.png',
};

// ── モンスター系 NPC ────────────────────────────────────
const FIELD_MONSTER_IMG_POOL = [
  'assets/images/chars/npc_field_monster_okamiotoko_01_brown.png',
  'assets/images/chars/npc_field_monster_okamiotoko_02_gray.png',
  'assets/images/chars/npc_field_monster_kyuketsuki_02_blue.png',
  'assets/images/chars/npc_field_monster_mummy_02_red.png',
  'assets/images/chars/npc_field_monster_zombie_02_green.png',
];
function _rndMonsterImg() {
  return FIELD_MONSTER_IMG_POOL[Math.floor(Math.random() * FIELD_MONSTER_IMG_POOL.length)];
}
const NPC_FIELD_IMAGES_MONSTER = {
  '鬼の番兵':     _rndMonsterImg(),
  '炎鬼将':       _rndMonsterImg(),
  '鬼哭の霊':     _rndMonsterImg(),
  '幽冥の門番':   _rndMonsterImg(),
  '呪術師の怨念': _rndMonsterImg(),
  '幽路の守護者': _rndMonsterImg(),
  '幽鬼王':       _rndMonsterImg(),
};

// 検索用マージ（game.js から参照する統合マップ）
const NPC_FIELD_IMAGES = { ...NPC_FIELD_IMAGES_VILLAGER, ...NPC_FIELD_IMAGES_MONSTER };
