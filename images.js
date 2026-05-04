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
