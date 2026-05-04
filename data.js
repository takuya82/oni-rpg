'use strict';
/* =====================================================
   data.js — 鬼哭の鐘 Game Data
   ===================================================== */

// ── スキル定義 ──────────────────────────────────────
const SKILLS = {
  normalAttack: { id:'normalAttack', name:'攻撃',      mpCost:0,  type:'attack', power:1.0, target:'single_enemy', description:'武器で攻撃する' },
  slash:        { id:'slash',        name:'斬撃',      mpCost:5,  type:'attack', power:1.8, target:'single_enemy', description:'必殺の一撃 (ATK×1.8)' },
  doubleSlash:  { id:'doubleSlash',  name:'二段斬り',  mpCost:10, type:'attack_twice', power:1.2, target:'single_enemy', description:'素早く2回斬る (ATK×1.2×2)' },
  musouSen:     { id:'musouSen',     name:'無双斬',    mpCost:25, type:'attack', power:3.5, target:'single_enemy', description:'全力一撃 (ATK×3.5)' },
  naginata:     { id:'naginata',     name:'薙刀技',    mpCost:6,  type:'attack', power:1.6, target:'single_enemy', description:'薙刀で薙ぎ払う' },
  rekkaJin:     { id:'rekkaJin',     name:'烈火刃',    mpCost:12, type:'attack', power:2.0, element:'fire', statusChance:{type:'burn',chance:40}, target:'single_enemy', description:'炎の斬撃。30%で「炎上」' },
  kango:        { id:'kango',        name:'看護',      mpCost:8,  type:'heal', healPct:0.35, target:'single_ally', description:'味方HP35%回復' },
  sakuChiru:    { id:'sakuChiru',    name:'桜散',      mpCost:22, type:'attack', power:1.5, target:'all_enemies', description:'全体に桜吹雪 (ATK×1.5)' },
  healingIn:    { id:'healingIn',    name:'癒しの印',  mpCost:10, type:'heal', healPct:0.45, target:'single_ally', description:'味方HP45%回復' },
  barrier:      { id:'barrier',      name:'結界',      mpCost:15, type:'buff', effect:{stat:'def',amount:20,duration:3}, target:'all_allies', description:'全体DEF+20 (3ターン)' },
  reiGeki:      { id:'reiGeki',      name:'霊撃',      mpCost:14, type:'attack', power:2.2, element:'spirit', target:'single_enemy', description:'霊の一撃。鬼に効果大 (ATK×2.2)' },
  kaiJu:        { id:'kaiJu',        name:'解呪',      mpCost:12, type:'cure_all', target:'single_ally', description:'全状態異常を治す' },
  fullHeal:     { id:'fullHeal',     name:'大回復',    mpCost:30, type:'heal', healPct:0.8, target:'single_ally', description:'味方HP80%回復' },
  yuuShi:       { id:'yuuShi',       name:'幽視',      mpCost:5,  type:'analyze', target:'single_enemy', description:'敵の弱点と情報を見抜く' },
  yuuHa:        { id:'yuuHa',        name:'幽波',      mpCost:16, type:'attack', power:2.4, element:'spirit', target:'single_enemy', description:'幽界の波動 (MAG×2.4)' },
  kiokuNoKiri:  { id:'kiokuNoKiri',  name:'記憶の霧',  mpCost:18, type:'debuff', effect:{stat:'atk',amount:-20,duration:2}, target:'all_enemies', description:'全体ATK-20 (2ターン)' },
  kananoChikara:{ id:'kananoChikara',name:'鐘の力',    mpCost:40, type:'attack', power:6.0, element:'holy', target:'all_enemies', description:'鐘の霊力を解放 (MAG×6.0)' },
};

// ── アイテム定義 ─────────────────────────────────────
const ITEMS = {
  herb:        { id:'herb',        name:'薬草',      type:'heal',     healAmount:80,   mpAmount:0,   price:30,  description:'HPを80回復する' },
  bigHerb:     { id:'bigHerb',     name:'上薬草',    type:'heal',     healAmount:200,  mpAmount:0,   price:90,  description:'HPを200回復する' },
  elixir:      { id:'elixir',      name:'霊水',      type:'healMP',   healAmount:0,    mpAmount:40,  price:70,  description:'MPを40回復する' },
  fullElixir:  { id:'fullElixir',  name:'霊泉水',    type:'healBoth', healAmount:300,  mpAmount:80,  price:300, description:'HP300・MP80回復' },
  antidote:    { id:'antidote',    name:'解毒薬',    type:'cure',     cures:['poison'],              price:35,  description:'毒を治す' },
  cureAll:     { id:'cureAll',     name:'万能薬',    type:'cure',     cures:['poison','burn','freeze','stun'], price:120, description:'全状態異常を治す' },
  revival:     { id:'revival',     name:'復活薬',    type:'revive',   reviveHp:60,                  price:500, description:'戦闘不能を60HPで復活' },
  ironSword:   { id:'ironSword',   name:'鉄の剣',    type:'weapon',   slot:'weapon',   atkBonus:12,  price:150, description:'+12攻撃力' },
  steelSword:  { id:'steelSword',  name:'鋼の剣',    type:'weapon',   slot:'weapon',   atkBonus:24,  price:380, description:'+24攻撃力' },
  spiritBlade: { id:'spiritBlade', name:'霊刀',      type:'weapon',   slot:'weapon',   atkBonus:36,  magBonus:12, price:800, description:'+36攻撃力 +12魔力' },
  leatherArmor:{ id:'leatherArmor',name:'革鎧',      type:'armor',    slot:'armor',    defBonus:10,  price:120, description:'+10防御力' },
  chainArmor:  { id:'chainArmor',  name:'鎖帷子',    type:'armor',    slot:'armor',    defBonus:22,  price:350, description:'+22防御力' },
  spiritRobe:  { id:'spiritRobe',  name:'霊装束',    type:'armor',    slot:'armor',    defBonus:15,  magBonus:18, price:650, description:'+15防御力 +18魔力' },
  oniTalisman: { id:'oniTalisman', name:'鬼の護符',  type:'accessory',slot:'accessory',defBonus:8,   spdBonus:8,  price:300, description:'+8防御力 +8素早さ' },
  bellFragment:{ id:'bellFragment',name:'鐘の欠片',  type:'accessory',slot:'accessory',magBonus:25,  price:0,   description:'鐘の霊力の残滓 +25魔力' },
};

// ── キャラクター定義 ──────────────────────────────────
const CHAR_DEFS = {
  player: {
    id:'player', name:'勇', emoji:'⚔️', role:'武者',
    baseStats:  { maxHp:130, maxMp:40,  atk:18, def:12, mag:8,  spd:13 },
    growthStats:{ maxHp:14,  maxMp:3,   atk:2,  def:1.5,mag:0.5,spd:1  },
    startSkills:['normalAttack','slash'],
    learnSkills:[{ level:5,  skill:'doubleSlash' },
                 { level:14, skill:'musouSen' }],
  },
  toki: {
    id:'toki', name:'朱鷺', emoji:'🌸', role:'武士の娘',
    baseStats:  { maxHp:110, maxMp:55,  atk:15, def:10, mag:14, spd:15 },
    growthStats:{ maxHp:12,  maxMp:4,   atk:1.5,def:1,  mag:1.2,spd:1.5},
    startSkills:['normalAttack','naginata','kango'],
    learnSkills:[{ level:7,  skill:'rekkaJin' },
                 { level:16, skill:'sakuChiru' }],
  },
  genkai: {
    id:'genkai', name:'玄海', emoji:'🔮', role:'山伏',
    baseStats:  { maxHp:95,  maxMp:80,  atk:10, def:9,  mag:22, spd:9  },
    growthStats:{ maxHp:10,  maxMp:8,   atk:1,  def:0.8,mag:2.5,spd:0.8},
    startSkills:['normalAttack','healingIn','reiGeki'],
    learnSkills:[{ level:6,  skill:'barrier' },
                 { level:12, skill:'kaiJu' },
                 { level:18, skill:'fullHeal' }],
  },
  haku: {
    id:'haku', name:'白', emoji:'🌙', role:'謎の少女',
    baseStats:  { maxHp:90,  maxMp:100, atk:9,  def:7,  mag:28, spd:17 },
    growthStats:{ maxHp:8,   maxMp:10,  atk:0.8,def:0.7,mag:3,  spd:1.5},
    startSkills:['normalAttack','yuuShi','yuuHa'],
    learnSkills:[{ level:9,  skill:'kiokuNoKiri' },
                 { level:20, skill:'kananoChikara' }],
  },
};

// ── 敵スキル（enemy-only） ────────────────────────────
const ENEMY_SKILLS = {
  atkNormal:  { name:'攻撃',       type:'atk', power:1.0,  target:'single' },
  oniStrike:  { name:'鬼撃ち',     type:'atk', power:1.6,  target:'single' },
  oniCharge:  { name:'突進',       type:'atk', power:2.2,  target:'single' },
  roar:       { name:'咆哮',       type:'debuff', debuff:{stat:'atk',amount:-18,duration:2}, target:'all' },
  darkWave:   { name:'暗黒波',     type:'atk', power:1.6,  target:'all' },
  fireFang:   { name:'炎の牙',     type:'atk', power:1.8,  element:'fire',  statusChance:{type:'burn',  chance:40}, target:'single' },
  iceBlast:   { name:'氷爆',       type:'atk', power:1.6,  element:'ice',   statusChance:{type:'freeze',chance:35}, target:'single' },
  frigidRoar: { name:'氷吼',       type:'atk', power:1.3,  target:'all' },
  darkAura:   { name:'暗黒オーラ', type:'selfbuff', buff:{stat:'atk',amount:22,duration:3}, target:'self' },
  massRoar:   { name:'大咆哮',     type:'debuff', debuff:{stat:'spd',amount:-12,duration:2}, target:'all' },
  soulDrain:  { name:'魂吸取',     type:'drain', power:1.3, target:'single' },
  darkExp:    { name:'暗黒爆発',   type:'atk', power:2.2,  target:'all' },
  haunt:      { name:'亡魂の叫び', type:'status', statusChance:{type:'stun',chance:55}, target:'single' },
  curse:      { name:'呪い',       type:'status', statusChance:{type:'poison',chance:65}, target:'single' },
  soulShatter:{ name:'魂砕き',     type:'atk', power:2.8,  target:'single' },
  kikokuBlast:{ name:'鬼哭炸裂',   type:'atk', power:3.5,  target:'all' },
  msgReturn:  { name:'引き返せ',   type:'msg', message:'「引き返せ」と氷鬼将が言った…' },
};

// ── 敵定義 ──────────────────────────────────────────
const ENEMY_DEFS = {
  // Ch1 雑魚
  noOni:      { id:'noOni',      name:'野鬼',     emoji:'👺', level:1,  maxHp:40,  atk:11, def:3,  mag:0,  spd:11, exp:18,  gold:12,  skills:['atkNormal'],                    drops:[],                              weakness:null, desc:'野原に現れる小さな鬼' },
  yamaOni:    { id:'yamaOni',    name:'山鬼',     emoji:'👹', level:2,  maxHp:60,  atk:14, def:6,  mag:0,  spd:8,  exp:28,  gold:20,  skills:['atkNormal','oniStrike'],         drops:[{id:'herb',   chance:35}],      weakness:null, desc:'山に住む鬼' },
  nakaOni:    { id:'nakaOni',    name:'中鬼',     emoji:'👹', level:2,  maxHp:80,  atk:17, def:9,  mag:0,  spd:7,  exp:40,  gold:30,  skills:['atkNormal','oniStrike'],         drops:[{id:'herb',   chance:40}],      weakness:null, desc:'力の強い鬼' },
  // Ch2 雑魚
  oniZamurai: { id:'oniZamurai', name:'鬼侍',     emoji:'⚔️', level:4,  maxHp:110, atk:22, def:16, mag:0,  spd:12, exp:65,  gold:50,  skills:['atkNormal','oniStrike'],         drops:[{id:'herb',   chance:25}],      weakness:'fire', desc:'侍のように戦う鬼。炎が弱点' },
  oniBoshi:   { id:'oniBoshi',   name:'鬼法師',   emoji:'🧙', level:4,  maxHp:85,  atk:13, def:8,  mag:28, spd:10, exp:75,  gold:55,  skills:['atkNormal','curse'],             drops:[{id:'elixir', chance:35}],      weakness:'spirit', desc:'呪術を使う鬼。霊撃が弱点' },
  // Ch3 雑魚
  oniSho:     { id:'oniSho',     name:'鬼将',     emoji:'🛡️', level:8,  maxHp:160, atk:32, def:24, mag:5,  spd:9,  exp:130, gold:100, skills:['atkNormal','oniStrike','roar'],   drops:[{id:'bigHerb',chance:30}],      weakness:'spirit', desc:'鬼の将。霊撃が通じやすい' },
  yoroiOni:   { id:'yoroiOni',   name:'鎧鬼',     emoji:'🦾', level:9,  maxHp:220, atk:37, def:32, mag:0,  spd:6,  exp:160, gold:120, skills:['atkNormal','oniCharge'],          drops:[{id:'cureAll',chance:20}],      weakness:'spirit', desc:'鎧をつけた鬼。霊撃が効く' },
  // Ch4 雑魚
  yuuOni:     { id:'yuuOni',     name:'幽鬼',     emoji:'👻', level:13, maxHp:130, atk:30, def:16, mag:38, spd:19, exp:210, gold:160, skills:['atkNormal','curse','haunt'],       drops:[{id:'elixir', chance:40}],      weakness:'holy', desc:'幽路に漂う鬼の霊。聖なる力が弱点' },
  onryoOni:   { id:'onryoOni',   name:'怨霊鬼',   emoji:'💀', level:14, maxHp:175, atk:35, def:20, mag:44, spd:16, exp:255, gold:190, skills:['atkNormal','curse','darkWave'],    drops:[{id:'revival',chance:15}],      weakness:'holy', desc:'強烈な怨念を持つ霊。聖なる力が弱点' },
  // ボス
  honooOniSho:{ id:'honooOniSho',name:'焔鬼将',   emoji:'🔥', level:3,  maxHp:300, atk:26, def:16, mag:18, spd:10, exp:180, gold:250, skills:['atkNormal','fireFang','roar'],    drops:[{id:'fullElixir',chance:100}], weakness:'spirit', isBoss:true, desc:'炎をまとった鬼の将。霊撃も効く', weaknessHint:'玄海が呟く。「炎の鬼将…霊撃が通じそうだ」' },
  kooruOniSho:{ id:'kooruOniSho',name:'氷鬼将',   emoji:'❄️', level:7,  maxHp:520, atk:36, def:26, mag:30, spd:12, exp:380, gold:450, skills:['atkNormal','iceBlast','frigidRoar','msgReturn'], drops:[{id:'spiritBlade',chance:100}], weakness:'fire', isBoss:true, desc:'氷をまとった鬼の将。炎が弱点', weaknessHint:'朱鷺が気づく。「氷の鬼…炎なら！烈火刃が効くはず」' },
  oniTaisho:  { id:'oniTaisho',  name:'鬼大将',   emoji:'👑', level:12, maxHp:850, atk:52, def:38, mag:42, spd:13, exp:650, gold:750, skills:['atkNormal','oniStrike','darkAura','massRoar'], drops:[{id:'spiritRobe',chance:100}], weakness:'spirit', isBoss:true, desc:'全鬼を率いる大将。霊の力が弱点', weaknessHint:'白が感じ取る。「この鬼…霊撃と幽波が効く」' },
  yuuOniO:    { id:'yuuOniO',    name:'幽鬼王',   emoji:'🌑', level:17, maxHp:1300,atk:68, def:48, mag:72, spd:16, exp:1100,gold:1100,skills:['atkNormal','soulDrain','darkExp','haunt'], drops:[{id:'bellFragment',chance:100}], weakness:'holy', isBoss:true, desc:'幽路を支配する鬼の王。聖なる力が弱点', weaknessHint:'玄海が叫ぶ。「幽路の王じゃ…鐘の力か、霊撃で打て！」' },
  kikokuShin: { id:'kikokuShin', name:'鬼哭の霊', emoji:'💫', level:22, maxHp:2100,atk:82, def:58, mag:95, spd:18, exp:2500,gold:0,    skills:['atkNormal','soulShatter','kikokuBlast','curse'], drops:[], weakness:'holy', isBoss:true, desc:'百年の怨念が凝縮した存在', weaknessHint:'白が叫ぶ。「鐘の力よ…kananoChikara！今こそ使って！」' },
};

// ── エリア定義 ────────────────────────────────────────
const AREAS = {
  burned_village:    { id:'burned_village',    name:'焼かれた村',      emoji:'🔥', chapter:1, desc:'煙がたちこめる故郷の村。生存者の気配はない。',            enemies:['yamaOni','noOni'],          encounterRate:0,  spCost:0, events:['ev_intro','ev_explore','ev_boss_ch1'],     hasShop:null,    hasInn:false, nextArea:'mountain_path' },
  mountain_path:     { id:'mountain_path',     name:'山道',            emoji:'🏔️', chapter:1, desc:'険しい山道。鬼の足音が追ってくる。',                       enemies:['yamaOni','noOni','nakaOni'], encounterRate:45, spCost:1, events:['ev_mountain_escape','ev_mountain_companions'], hasShop:null, hasInn:false, nextArea:'lake_village' },
  lake_village:      { id:'lake_village',      name:'湖のほとりの村',  emoji:'🏘️', chapter:2, desc:'静かな湖のほとりの村。鬼の話が広まっている。',              enemies:['oniZamurai','oniBoshi'],    encounterRate:30, spCost:1, events:['ev_lake_arrival','ev_lake_shrine'],        hasShop:'lake_village', hasInn:true, nextArea:'oni_fortress' },
  oni_fortress:      { id:'oni_fortress',      name:'鬼の砦',          emoji:'🏯', chapter:2, desc:'鬼たちが拠点とする砦。威圧感が漂う。',                      enemies:['oniZamurai','oniBoshi','nakaOni'], encounterRate:50, spCost:2, events:['ev_fortress_enter','ev_boss_ch2'], hasShop:null, hasInn:false, nextArea:'mountain_ruins' },
  mountain_ruins:    { id:'mountain_ruins',    name:'山中の廃寺',      emoji:'⛩️', chapter:3, desc:'荒れ果てた廃寺。古い記録が眠っている。',                   enemies:['oniSho','yoroiOni'],        encounterRate:45, spCost:2, events:['ev_ruins_records','ev_ruins_haku'],        hasShop:'mountain_inn', hasInn:false, nextArea:'spirit_realm_gate' },
  spirit_realm_gate: { id:'spirit_realm_gate', name:'幽路の入口',      emoji:'🌀', chapter:3, desc:'幽路への扉が見える場所。白の体が揺らぎ始めた。',            enemies:[],                          encounterRate:0,  spCost:0, events:['ev_gate_open','ev_gate_haku','ev_boss_ch3'], hasShop:'spirit_shop', hasInn:false, nextArea:'spirit_shallow' },
  spirit_shallow:    { id:'spirit_shallow',    name:'幽路・浅層',      emoji:'🌫️', chapter:4, desc:'幽路の浅い層。死者の魂が漂っている。',                     enemies:['yuuOni','onryoOni'],       encounterRate:55, spCost:3, events:['ev_spirit_arrive','ev_spirit_haku_truth'],  hasShop:null,    hasInn:false, nextArea:'spirit_deep' },
  spirit_deep:       { id:'spirit_deep',       name:'幽路・深層',      emoji:'⚫', chapter:4, desc:'幽路の深い層。呪いの根源が近い。',                          enemies:['yuuOni','onryoOni'],       encounterRate:60, spCost:3, events:['ev_deep_curse','ev_boss_ch4'],              hasShop:null,    hasInn:false, nextArea:'bell_tower' },
  bell_tower:        { id:'bell_tower',        name:'鬼哭の鐘楼',      emoji:'🔔', chapter:5, desc:'伝説の鐘が安置された鐘楼。選択の時が来た。',              enemies:[],                          encounterRate:0,  spCost:0, events:['ev_bell_arrive','ev_final_boss','ev_bell_choice'], hasShop:null, hasInn:false, nextArea:null },
};

// ── ショップ定義 ─────────────────────────────────────
const SHOPS = {
  lake_village: { name:'村の雑貨屋', items:['herb','bigHerb','elixir','antidote','ironSword','leatherArmor'] },
  mountain_inn: { name:'廃寺近くの行商人', items:['herb','bigHerb','elixir','fullElixir','antidote','cureAll','steelSword','chainArmor','oniTalisman'] },
  spirit_shop:  { name:'幽路の入口の祠', items:['fullElixir','cureAll','revival','spiritBlade','spiritRobe'] },
};

// ── ストーリーイベント ────────────────────────────────
const EVENTS = {

  ev_intro: { id:'ev_intro', steps:[
    { type:'narrator', text:'── 火が消えた後の静寂。煙が空を黒く染めている。' },
    { type:'narrator', text:'主人公の勇は瓦礫の中で目を覚ました。' },
    { type:'player',   text:'…村が。村が燃えている。' },
    { type:'narrator', text:'勇は立ち上がり、周囲を見渡した。動くものは何もない。' },
    { type:'player',   text:'みんな…どこに行ったんだ。' },
    { type:'narrator', text:'その時、離れた場所で鬼の影が動いた。' },
    { type:'narrator', text:'鬼は一言も発せず、残った神社を壊し始めた。' },
    { type:'player',   text:'（なぜ、神社まで壊すんだ…）' },
  ]},

  ev_explore: { id:'ev_explore', steps:[
    { type:'narrator', text:'勇は村の中を歩き回った。' },
    { type:'narrator', text:'生存者の気配はない。しかし、不思議なことに死体も見当たらない。' },
    { type:'player',   text:'みんなどこへ行った…' },
    { type:'narrator', text:'廃屋の片隅に、幼い頃に母からもらった鈴が落ちていた。' },
    { type:'gain',     text:'鈴を拾った。形見にしよう。', item:'bellSuzuri' },
    { type:'narrator', text:'その時、砂埃の中から大きな影が現れた。' },
  ]},

  ev_boss_ch1: { id:'ev_boss_ch1', steps:[
    { type:'narrator', text:'焔に包まれた鬼の将が、目の前に立ちはだかった。' },
    { type:'enemy',    speaker:'焔鬼将', text:'…（無言のまま、勇を見下ろしている）' },
    { type:'player',   text:'どけっ！' },
    { type:'battle',   enemyId:'honooOniSho' },
    { type:'narrator', text:'鬼将が倒れた。' },
    { type:'narrator', text:'その瞬間、鬼の目から何かが零れた気がした。' },
    { type:'narrator', text:'──涙？' },
    { type:'player',   text:'（気のせいだ。逃げないと。）' },
    { type:'warp',     areaId:'mountain_path' },
  ]},

  ev_mountain_escape: { id:'ev_mountain_escape', steps:[
    { type:'narrator', text:'勇は山道を走った。背後に鬼の足音が続く。' },
    { type:'player',   text:'くそ、まだ追ってくる…！' },
    { type:'narrator', text:'しばらく走ると、足音が遠のいた。' },
  ]},

  ev_mountain_companions: { id:'ev_mountain_companions', steps:[
    { type:'narrator', text:'岩陰に誰かが身を潜めているのが見えた。' },
    { type:'choice',   text:'岩陰から声がする。', choices:[
      { text:'声をかける', flagSet:'helped_toki', next:'ev_meet_toki_yes' },
      { text:'先を急ぐ',    flagSet:null,           next:'ev_meet_toki_no'  },
    ]},
  ]},

  ev_meet_toki_yes: { id:'ev_meet_toki_yes', steps:[
    { type:'narrator',   text:'岩陰から若い女性が現れた。薙刀を手に持っている。' },
    { type:'companion',  speaker:'朱鷺', emoji:'🌸', text:'…助けてくれるの？' },
    { type:'player',     text:'名前は？' },
    { type:'companion',  speaker:'朱鷺', emoji:'🌸', text:'朱鷺よ。武士の娘。父は鬼に…（言葉が詰まる）' },
    { type:'companion',  speaker:'朱鷺', emoji:'🌸', text:'一緒に行く。一人で戦うよりも。' },
    { type:'joinParty',  charId:'toki' },
    { type:'next',       nextEvent:'ev_meet_genkai_haku' },
  ]},

  ev_meet_toki_no: { id:'ev_meet_toki_no', steps:[
    { type:'narrator',  text:'勇は足を止めなかった。' },
    { type:'narrator',  text:'しかし、しばらく後、後ろから足音が追いついてきた。' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'…置いていかないでよ。薙刀ならある。役に立つから。' },
    { type:'joinParty', charId:'toki' },
    { type:'next',      nextEvent:'ev_meet_genkai_haku' },
  ]},

  ev_meet_genkai_haku: { id:'ev_meet_genkai_haku', steps:[
    { type:'narrator',  text:'山道の先に、白い衣の老人が座っていた。' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'お主らも鬼から逃げてきたか。' },
    { type:'player',    text:'あんたは？' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'玄海じゃ。山伏をしておる。霊術なら使える。' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'鬼を追うなら同行しよう。霊の知識が役に立つかもしれん。' },
    { type:'joinParty', charId:'genkai' },
    { type:'narrator',  text:'玄海が仲間になった！' },
    { type:'narrator',  text:'さらに山道を進むと、一人の少女が立っていた。' },
    { type:'narrator',  text:'少女は虚ろな目でこちらを見ている。' },
    { type:'companion', speaker:'白', emoji:'🌙', text:'…わからない。名前も、どこから来たかも。' },
    { type:'companion', speaker:'白', emoji:'🌙', text:'でも…あなたたちについていきたい。何かを知っている気がする。' },
    { type:'joinParty', charId:'haku' },
    { type:'narrator',  text:'白が仲間になった！' },
    { type:'warp',      areaId:'lake_village' },
  ]},

  ev_lake_arrival: { id:'ev_lake_arrival', steps:[
    { type:'narrator',  text:'山を越えると、湖のほとりに小さな村があった。' },
    { type:'narrator',  text:'村人が鬼の話をしている。' },
    { type:'narrator',  text:'「鬼が神社を壊して回っているらしい」' },
    { type:'player',    text:'（なぜ神社を壊すんだ…村でもそうだった）' },
  ]},

  ev_lake_shrine: { id:'ev_lake_shrine', steps:[
    { type:'narrator',  text:'村の神社は半壊していた。' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'またここも壊されておる…。なぜ鬼は神社を壊すのか。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'…鬼は、泣いていた。' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'え？' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'神社を壊しながら…泣いていた気がする。私には何か…見える。' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'何言ってるの。鬼が泣く？そんなわけないでしょ。' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'そうじゃな。気のせいじゃろう。先を急ごう。' },
  ]},

  ev_fortress_enter: { id:'ev_fortress_enter', steps:[
    { type:'narrator',  text:'鬼の砦に近づくと、見張りの鬼たちが現れた。' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'こいつら、ただじゃ通さないわ。戦うしかない！' },
  ]},

  ev_boss_ch2: { id:'ev_boss_ch2', steps:[
    { type:'narrator',  text:'砦の奥に、氷をまとった大きな鬼将が立っていた。' },
    { type:'enemy',     speaker:'氷鬼将', text:'引き返せ。' },
    { type:'player',    text:'なんだと…？' },
    { type:'enemy',     speaker:'氷鬼将', text:'引き返せ。頼む。' },
    { type:'companion', speaker:'玄海',   emoji:'🔮', text:'こいつら、こんな言葉まで使うとは。罠じゃ、罠じゃ！' },
    { type:'battle',    enemyId:'kooruOniSho' },
    { type:'narrator',  text:'氷鬼将が倒れた。その手に、子供の髪飾りが握られていた。' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'この髪飾り…子供のものよね。盗んだのかしら。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'（違う、と何かが囁く気がした）' },
    { type:'warp',      areaId:'mountain_ruins' },
  ]},

  ev_ruins_records: { id:'ev_ruins_records', steps:[
    { type:'narrator',  text:'廃寺の奥に、古い記録が残っていた。' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'読んでみよう。「百年前、この地に疫病が流行り、恨みを持った術士が村人を鬼に変えた…」' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'「鬼は神社の霊力で呪いを封じようとしたが、人間に壊された。鬼はさらに深い幽路へと」…。' },
    { type:'player',    text:'待て、神社の霊力で呪いを封じようとした？鬼が？' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'嘘よ。これは罠。鬼が書いた偽の記録だわ。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'（違う気がする…でも、言えない）' },
  ]},

  ev_ruins_haku: { id:'ev_ruins_haku', steps:[
    { type:'companion', speaker:'白',   emoji:'🌙', text:'…この場所。来たことがある気がする。' },
    { type:'player',    text:'白、どうした？' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'この廃寺は…百年前に建てられたはずで…私は…。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'（自分の手を見る）…見えてくる。幽路の光が。' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'こやつ…半霊体か。人間と霊の間の存在。だから自分のことが分からないのじゃ。' },
  ]},

  ev_gate_open: { id:'ev_gate_open', steps:[
    { type:'narrator',  text:'山の奥深く、空気が歪んでいる場所があった。' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'これが幽路の扉じゃ。霊力を注げば開く。' },
    { type:'narrator',  text:'勇たちは霊力を注いだ。扉がゆっくりと開く。' },
  ]},

  ev_gate_haku: { id:'ev_gate_haku', steps:[
    { type:'companion', speaker:'白',   emoji:'🌙', text:'（突然、胸を押さえる）…！' },
    { type:'player',    text:'白、どうした！？' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'体が…消えそう。幽路が近いから…私の体が引き寄せられる。' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'無理しなくていい。ここで待ってて。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'ダメ。私が行かないと。私には…やらなければいけないことがある気がする。' },
  ]},

  ev_boss_ch3: { id:'ev_boss_ch3', steps:[
    { type:'narrator',  text:'幽路の入口に、巨大な鬼大将が立ちはだかった。' },
    { type:'enemy',     speaker:'鬼大将', text:'…進むな。これ以上は。' },
    { type:'player',    text:'どけ！呪いの根源を断ちに行く！' },
    { type:'enemy',     speaker:'鬼大将', text:'…根源を断てば、我々は…。' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'こいつら何を言ってるの！また罠でしょ。行くよ！' },
    { type:'battle',    enemyId:'oniTaisho' },
    { type:'narrator',  text:'鬼大将が倒れた。最後に一言、残した。' },
    { type:'enemy',     speaker:'鬼大将', text:'…頼む。終わりにして…くれ。' },
    { type:'warp',      areaId:'spirit_shallow' },
  ]},

  ev_spirit_arrive: { id:'ev_spirit_arrive', steps:[
    { type:'narrator',  text:'幽路に足を踏み入れた。淡い光に満ちた、静かな世界。' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'これが幽路か…。死者の魂が漂っておる。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'（歩きながら）…思い出してきた。ここに来たことがある。' },
  ]},

  ev_spirit_haku_truth: { id:'ev_spirit_haku_truth', steps:[
    { type:'narrator',  text:'白が突然立ち止まった。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'思い出した。全部。' },
    { type:'player',    text:'白…？' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'私は…百年前の、あの村の人間よ。術士が村を呪った日、私は逃げようとして…ここで死んだ。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'鬼になった人たちは…みんな私の知っている人たちよ。隣の家のおじさん、友達の家族、村長…。' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'白…。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'神社を壊していたのは、神社の封印が鬼を縛り付けていたから。封印を壊して、自分たちを自由にしたかっただけ。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'鬼将の手にあった髪飾りは…彼の娘のもの。呪いで鬼になる前に、娘と別れる時に渡されたものよ。' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'（泣きそうな顔で）じゃあ、私たちが倒してきた鬼は…。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'終わりにしたかった人たちよ。鐘を鳴らせば…呪いは解ける。みんな、解放される。' },
    { type:'player',    text:'鐘？' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'幽路の奥に鬼哭の鐘がある。百年前に術士が封印した鐘。鳴らせば呪いは全て解ける。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'でも…幽路が閉じる。幽路にいる存在は全て消える。私も。' },
  ]},

  ev_deep_curse: { id:'ev_deep_curse', steps:[
    { type:'narrator',  text:'幽路の深層。空気が重く、呪いの気配が濃い。' },
    { type:'narrator',  text:'どこからか声が聞こえた。' },
    { type:'enemy',     speaker:'呪術師の怨念', text:'恨みは消えぬ。恨みある限り、鬼は生まれ続ける。' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'呪術師の怨念じゃ。百年経っても消えておらん。' },
    { type:'enemy',     speaker:'呪術師の怨念', text:'村を滅ぼした人間どもよ。お前たちの子孫も、鬼になれ。' },
    { type:'player',    text:'（この怨念が全ての根源か。）' },
  ]},

  ev_boss_ch4: { id:'ev_boss_ch4', steps:[
    { type:'narrator',  text:'怨念が凝縮し、巨大な霊体となった。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'幽鬼王…幽路の番人。ここを守っている。' },
    { type:'battle',    enemyId:'yuuOniO' },
    { type:'narrator',  text:'幽鬼王が消えた。道が開く。' },
    { type:'warp',      areaId:'bell_tower' },
  ]},

  ev_bell_arrive: { id:'ev_bell_arrive', steps:[
    { type:'narrator',  text:'幽路の中心に、古い鐘楼があった。' },
    { type:'narrator',  text:'鐘は静かに、しかし確かな霊力を発している。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'鬼哭の鐘よ。百年間、鳴らされるのを待っていた。' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'（白の手を握って）白…。' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'鐘を鳴らせば幽路は閉じる。全ての縛りが解け、鬼だった者も魂が安らぐ。しかし白も消える。' },
  ]},

  ev_final_boss: { id:'ev_final_boss', steps:[
    { type:'narrator',  text:'鐘楼の前に、鬼哭の霊が現れた。百年の怨念が形を成した存在。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'鬼哭の霊よ。あなたの怨みは分かる。でも、もう終わりにしましょう。' },
    { type:'enemy',     speaker:'鬼哭の霊', text:'終わり？なぜ終わりにできよう。村は滅んだ。家族は消えた。恨みが残る限り、終わりはない！' },
    { type:'battle',    enemyId:'kikokuShin' },
    { type:'next',      nextEvent:'ev_bell_choice' },
  ]},

  ev_bell_choice: { id:'ev_bell_choice', steps:[
    { type:'companion', speaker:'白',   emoji:'🌙', text:'勇、鐘を鳴らして。みんなを解放して。百年間苦しんできた人たちを。' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'でも白が…！' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'大丈夫。私はもう百年前に死んでいるもの。今まで一緒にいられたことが…嬉しかった。' },
    { type:'choice',    text:'鐘の前に立った。', choices:[
      { text:'鐘を鳴らす',  flagSet:'ring_bell', next:'ev_ending_a' },
      { text:'鳴らさない', flagSet:'no_bell',   next:'ev_ending_b' },
    ]},
  ]},

  ev_ending_a: { id:'ev_ending_a', isEnding:true, endingType:'A', endingTitle:'鐘響く春', steps:[
    { type:'narrator',  text:'勇は鐘を打った。' },
    { type:'narrator',  text:'音は幽路に響き渡り、世界が白く輝いた。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'ありがとう。勇、朱鷺、玄海。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'みんなのこと、ずっと覚えているから。' },
    { type:'narrator',  text:'白の姿が、光の粒子となって消えた。' },
    { type:'narrator',  text:'幽路の全ての鬼が解放された。百年の呪いが、今終わった。' },
    { type:'narrator',  text:'勇と朱鷺と玄海は、現世に戻った。' },
    { type:'player',    text:'（白は消えた。でも、彼女が望んだ結末だ。）' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'（泣きながら）バカ…バカ白…。' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'（静かに）…よくやった。これでよかった。' },
    { type:'narrator',  text:'── 春。' },
    { type:'narrator',  text:'故郷の跡地に、一本の桜の木が咲いていた。誰が植えたか、誰も知らない。' },
    { type:'narrator',  text:'風が吹くと、鈴の音に似た音がした。' },
  ]},

  ev_ending_b: { id:'ev_ending_b', isEnding:true, endingType:'B', endingTitle:'終わらない旅', steps:[
    { type:'narrator',  text:'勇は鐘の前で立ち尽くした。' },
    { type:'player',    text:'俺には…お前を消せない。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'勇…。' },
    { type:'player',    text:'別の方法を探す。お前を消さない方法を。絶対に。' },
    { type:'companion', speaker:'白',   emoji:'🌙', text:'（長い沈黙の後）…分かった。一緒に探しましょう。' },
    { type:'narrator',  text:'幽路は閉じなかった。鬼は残った。世界には今も鬼がいる。' },
    { type:'narrator',  text:'しかし、勇と白は歩き続けた。呪いを解く別の方法を求めて。' },
    { type:'companion', speaker:'朱鷺', emoji:'🌸', text:'（小さく）私も一緒に行く。全員で探す。' },
    { type:'companion', speaker:'玄海', emoji:'🔮', text:'やれやれ…老いた体に鞭打つことになるとは。' },
    { type:'narrator',  text:'四人の旅は、終わらない。' },
  ]},

};
