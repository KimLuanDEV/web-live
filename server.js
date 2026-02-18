

const MAX_VIEWERS = 40;        // Render safe
const SOFT_CAP    = 30;       // bắt đầu degrade

const bcrypt = require("bcrypt");
const crypto = require("crypto");


const ROOM_RELEASE_DELAY = 15000; // 15 giây (tuỳ bạn)

const multer = require("multer");
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const twilio = require("twilio");


const fs = require("fs");





function ensureWheelSecret(round){
  if (!round) return;

  if (round.secretResult && round.secretResult.multiplier != null) {
    return; // ✅ đã có → không tạo lại
  }

  const weightedMultipliers = [
    { m: 0.5, w: 55 },
    { m: 1.2, w: 20 },
    { m: 1.5, w: 12 },
    { m: 2,   w: 10 },
    { m: 5,   w: 2 },
    { m: 10,  w: 1 }
  ];

  const total = weightedMultipliers.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;

  let multiplier = 0;
  for (const item of weightedMultipliers){
    if ((r -= item.w) <= 0){
      multiplier = item.m;
      break;
    }
  }

  const multipliers = weightedMultipliers.map(x => x.m);
  const index = multipliers.indexOf(multiplier);

  const hash = crypto
    .createHash("sha256")
    .update(round.id + ":" + multiplier)
    .digest("hex");

  round.secretResult = {
    multiplier,
    index,
    hash
  };

  console.log("🔐 [WHEEL] secretResult created for round", round.id);
}


// ================================
// 🧠 HEALTH DATA (PER USER)
// ================================
const HEALTH_DIR = path.join("/opt/render/project/data", "health");

if (!fs.existsSync(HEALTH_DIR)) {
  fs.mkdirSync(HEALTH_DIR, { recursive: true });
  console.log("📁 Created health data dir");
}




const ONE_DAY = 24 * 60 * 60 * 1000; // 🔥 24h


// ================================
// 🔢 RPS ROUND COUNT PERSIST (24H)
// ================================
const RPS_ROUND_COUNT_FILE =
  "/opt/render/project/data/rps_round_count.json";

function loadRpsRoundCount(){
  try{
    if (!fs.existsSync(RPS_ROUND_COUNT_FILE)) {
      return {
        dayTs: getTodayStartTsVN(),
        count: 0
      };
    }
    return JSON.parse(
      fs.readFileSync(RPS_ROUND_COUNT_FILE, "utf8")
    );
  }catch(e){
    console.error("❌ Load RPS round count failed", e);
    return {
      dayTs: getTodayStartTsVN(),
      count: 0
    };
  }
}

function saveRpsRoundCount(data){
  try{
    fs.writeFileSync(
      RPS_ROUND_COUNT_FILE,
      JSON.stringify(data, null, 2)
    );
  }catch(e){
    console.error("❌ Save RPS round count failed", e);
  }
}



  // ================================
// 🔢 ROUND COUNT PERSIST (24H)
// ================================
const WHEEL_ROUND_COUNT_FILE =
  "/opt/render/project/data/wheel_round_count.json";

function loadWheelRoundCount(){
  try{
    if (!fs.existsSync(WHEEL_ROUND_COUNT_FILE)) {
      return {
        dayTs: getTodayStartTsVN(),
        count: 0
      };
    }
    return JSON.parse(
      fs.readFileSync(WHEEL_ROUND_COUNT_FILE, "utf8")
    );
  }catch(e){
    console.error("❌ Load wheel round count failed", e);
    return {
      dayTs: getTodayStartTsVN(),
      count: 0
    };
  }
}

function saveWheelRoundCount(data){
  try{
    fs.writeFileSync(
      WHEEL_ROUND_COUNT_FILE,
      JSON.stringify(data, null, 2)
    );
  }catch(e){
    console.error("❌ Save wheel round count failed", e);
  }
}



function getTodayStartTsVN() {
  // VN = UTC+7
  const offsetMin = 7 * 60;

  const now = Date.now();

  // đổi sang "giờ VN"
  const vnNow = now + offsetMin * 60 * 1000;

  // lấy 00:00 theo VN (tính trên epoch VN)
  const vnDayStart = Math.floor(vnNow / ONE_DAY) * ONE_DAY;

  // trả về timestamp thật (UTC epoch)
  return vnDayStart - offsetMin * 60 * 1000;
}





// ================================
// ✊✋✌️ RPS HISTORY (GLOBAL)
// ================================
const RPS_HISTORY_FILE =
  "/opt/render/project/data/rps_history.json";

const MAX_RPS_HISTORY = 20;

function loadRpsHistory(){
  try{
    if(!fs.existsSync(RPS_HISTORY_FILE)) return [];
    return JSON.parse(fs.readFileSync(RPS_HISTORY_FILE,"utf8"));
  }catch(e){
    console.error("❌ Load RPS history failed", e);
    return [];
  }
}

function saveRpsHistory(list){
  try{
    fs.writeFileSync(
      RPS_HISTORY_FILE,
      JSON.stringify(list,null,2)
    );
  }catch(e){
    console.error("❌ Save RPS history failed", e);
  }
}

let rpsHistoryGlobal = loadRpsHistory();



// ================================
// 🥚 EGG HISTORY (GLOBAL)
// ================================
const EGG_HISTORY_FILE =
  "/opt/render/project/data/egg_history.json";

const MAX_EGG_HISTORY = 20;

function loadEggHistory(){
  try{
    if(!fs.existsSync(EGG_HISTORY_FILE)) return [];
    return JSON.parse(
      fs.readFileSync(EGG_HISTORY_FILE,"utf8")
    );
  }catch(e){
    console.error("❌ Load egg history failed", e);
    return [];
  }
}

function saveEggHistory(list){
  try{
    fs.writeFileSync(
      EGG_HISTORY_FILE,
      JSON.stringify(list,null,2)
    );
  }catch(e){
    console.error("❌ Save egg history failed", e);
  }
}

let eggHistory = loadEggHistory();



const eggRoundState = loadEggRoundCount();

let eggRoundCount = eggRoundState.count || 0;
let eggRoundDayTs = eggRoundState.dayTs || getTodayStartTsVN();

// reset nếu qua ngày mới
const eggTodayStart = getTodayStartTsVN();
if (eggTodayStart !== eggRoundDayTs) {
  eggRoundCount = 0;
  eggRoundDayTs = eggTodayStart;

  saveEggRoundCount({
    dayTs: eggRoundDayTs,
    count: eggRoundCount
  });
}



// ================================
// 🎡 WHEEL HISTORY (REALTIME + PERSIST)
// ================================
const WHEEL_HISTORY_FILE =
  "/opt/render/project/data/wheel_history.json";

const MAX_WHEEL_HISTORY = 20;

function loadWheelHistory(){
  try{
    if (!fs.existsSync(WHEEL_HISTORY_FILE)) return [];
    return JSON.parse(
      fs.readFileSync(WHEEL_HISTORY_FILE, "utf8")
    );
  }catch(e){
    console.error("❌ Load wheel history failed", e);
    return [];
  }
}




function saveWheelHistory(list){
  try{
    fs.writeFileSync(
      WHEEL_HISTORY_FILE,
      JSON.stringify(list, null, 2)
    );
  }catch(e){
    console.error("❌ Save wheel history failed", e);
  }
}

// 📜 history global
let wheelHistory = loadWheelHistory();

// ================================
// 🔢 ROUND COUNT TODAY (SERVER)
// ================================
const wheelRoundState = loadWheelRoundCount();

let wheelRoundCountToday = wheelRoundState.count || 0;
let wheelRoundDayTs = wheelRoundState.dayTs || getTodayStartTsVN();



// 🔥 chỉ giữ lịch sử vòng quay trong 24h
const now = Date.now();
wheelHistory = wheelHistory.filter(
  h => h.ts && now - h.ts <= ONE_DAY
);

// 💾 lưu lại sau khi dọn rác
saveWheelHistory(wheelHistory);







const INVEST_HISTORY_FILE =
  "/opt/render/project/data/invest_history.json";


const INVEST_STATE_FILE =
  "/opt/render/project/data/invest_state.json";



// ================================
// 🥚 EGG ROUND COUNT PERSIST (24H)
// ================================
const EGG_ROUND_COUNT_FILE =
  "/opt/render/project/data/egg_round_count.json";

function loadEggRoundCount(){
  try{
    if (!fs.existsSync(EGG_ROUND_COUNT_FILE)) {
      return {
        dayTs: getTodayStartTsVN(),
        count: 0
      };
    }
    return JSON.parse(
      fs.readFileSync(EGG_ROUND_COUNT_FILE, "utf8")
    );
  }catch(e){
    console.error("❌ Load egg round count failed", e);
    return {
      dayTs: getTodayStartTsVN(),
      count: 0
    };
  }
}

function saveEggRoundCount(data){
  try{
    fs.writeFileSync(
      EGG_ROUND_COUNT_FILE,
      JSON.stringify(data, null, 2)
    );
  }catch(e){
    console.error("❌ Save egg round count failed", e);
  }
}


  function loadInvestState(){
  try{
    if(!fs.existsSync(INVEST_STATE_FILE)) return null;
    return JSON.parse(
      fs.readFileSync(INVEST_STATE_FILE, "utf8")
    );
  }catch(e){
    console.error("❌ Load invest state failed", e);
    return null;
  }
}


function saveInvestState(state){
  if (!state || !INVEST_STATE_FILE) return;
  try{
    fs.writeFileSync(
      INVEST_STATE_FILE,
      JSON.stringify(state, null, 2)
    );
  }catch(e){
    console.error("❌ Save invest state failed", e);
  }
}





const webpush = require("web-push");

const { uploadToR2 } = require("./r2");




// ================================
// 📊 INVEST ROUND STATE (GLOBAL)
// ================================
let investRound = null;




// 🔄 Load invest round từ file
investRound = loadInvestState();

// nếu chưa có round hoặc round đã hết hạn → tạo mới
if (!investRound || investRound.endAt <= Date.now()) {
  const id = Date.now();
  investRound = {
    id,
    startAt: id,
    endAt: id + 60000,
    orders: [],
    chart: generateChart(id),
    closedEarly: [] // 🔒 BẮT BUỘC
  };
  saveInvestState(investRound);
}

// 🛡️ phòng trường hợp file cũ thiếu field
if (!Array.isArray(investRound.closedEarly)) {
  investRound.closedEarly = [];
}
if (!Array.isArray(investRound.orders)) {
  investRound.orders = [];
}



const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

function normalizeAvatar(url) {
  if (!url) return "";

  // avatar legacy dạng /avatars/xxx.jpg
  if (url.startsWith("/avatars/")) {
    return R2_PUBLIC_URL + url;
  }

  return url;
}




const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }
});

const avatarCoverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const postMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB (video)
});



const LIVE_STATE_FILE = path.join("/opt/render/project/data", "live_state.json");
const SOCIAL_FILE = path.join("/opt/render/project/data", "social_posts.json");
const MEDIA_DIRS = [
  "/opt/render/project/data/post-images",
  "/opt/render/project/data/post-videos"
];

MEDIA_DIRS.forEach(dir=>{
  if(!fs.existsSync(dir)){
    fs.mkdirSync(dir,{ recursive:true });
    console.log("📁 Created", dir);
  }
});






function loadInvestHistory(){
  try{
    if(!fs.existsSync(INVEST_HISTORY_FILE)) return [];
    return JSON.parse(
      fs.readFileSync(INVEST_HISTORY_FILE, "utf8")
    );
  }catch(e){
    console.error("❌ Load invest history failed", e);
    return [];
  }
}

function saveInvestHistory(list){
  try{
    fs.writeFileSync(
      INVEST_HISTORY_FILE,
      JSON.stringify(list, null, 2)
    );
  }catch(e){
    console.error("❌ Save invest history failed", e);
  }
}


const INBOX_FILE = "/opt/render/project/data/inbox.json";

function loadInbox(){
  try{
    if(!fs.existsSync(INBOX_FILE)) return {};
    const raw = fs.readFileSync(INBOX_FILE,"utf8");
    if(!raw.trim()) return {};
    return JSON.parse(raw);
  }catch(e){
    console.error("❌ Inbox JSON corrupted → reset", e.message);
    return {};
  }
}


const MARKET_FILE = "/opt/render/project/data/market_booths.json";

function loadMarket(){
  if(!fs.existsSync(MARKET_FILE)) return {};
  return JSON.parse(fs.readFileSync(MARKET_FILE,"utf8"));
}
function saveMarket(db){
  fs.writeFileSync(MARKET_FILE, JSON.stringify(db,null,2));
}


// 🔒 HELPER: CHẶN MỌI HÀNH ĐỘNG KHI BOOTH BỊ KHOÁ
function blockIfBoothLockedById(boothId, uid) {
  if (!boothId || !uid) return false;

  const market = loadMarket();
  const booth = market[boothId];
  if (!booth) return false;

  const users = loadUsers();
  const me = users[uid];
  const isAdmin = me?.role === "admin";

  return booth.locked && !isAdmin;
}


function blockSocketIfBoothLocked(socket, boothId) {
  const uid = socket.data.uid;
  if (!uid || !boothId) return false;

  if (blockIfBoothLockedById(boothId, uid)) {
    socket.emit("booth-locked", {
      boothId,
      message: "🚫 Gian hàng đang bị Admin khoá"
    });
    return true;
  }
  return false;
}



function cleanupExpiredBooths(){
  const market = loadMarket();
  let changed = false;
  const now = Date.now();

  Object.keys(market).forEach(id=>{
    const booth = market[id];
    if(!booth) return;

    if(booth.expireAt && booth.expireAt < now){
      console.log("⏱ Booth expired:", id);
      market[id] = null;
      changed = true;
    }
  });

  if(changed){
    saveMarket(market);
  }
}



// ================================
// 🐣 ANIMAL FARM DATA
// ================================
const ANIMAL_FILE =
  "/opt/render/project/data/animal_farm.json";

function loadAnimals(){
  try{
    if(!fs.existsSync(ANIMAL_FILE)) return {};
    return JSON.parse(fs.readFileSync(ANIMAL_FILE,"utf8"));
  }catch(e){
    console.error("❌ Load animal data failed", e);
    return {};
  }
}

function saveAnimals(db){
  try{
    fs.writeFileSync(
      ANIMAL_FILE,
      JSON.stringify(db,null,2)
    );
  }catch(e){
    console.error("❌ Save animal data failed", e);
  }
}

let animalDB = loadAnimals();


Object.values(animalDB).forEach(list=>{
  list.forEach(a=>{

    if(typeof a.broken === "undefined")
      a.broken = null;

    if(typeof a.stage === "undefined")
      a.stage = 0;

    if(typeof a.finalized === "undefined"){
      // 🔥 nếu đã stage 2 thì auto finalize
      a.finalized = (a.stage === 2);
    }

  });
});
saveAnimals(animalDB);




// ================================
// 🏰 BARN CONFIG
// ================================
const BARN_CONFIG = {
  1: { max: 4,  price: 500 },
  2: { max: 6,  price: 1200 },
  3: { max: 10, price: 3000 },
  4: { max: 16, price: 7000 }
};





const WITHDRAW_FILE = "/opt/render/project/data/withdraw_requests.json";

function loadWithdraws(){
  if(!fs.existsSync(WITHDRAW_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(WITHDRAW_FILE, "utf8"));
  } catch {
    return [];
  }
}


function saveWithdraws(list){
  fs.writeFileSync(WITHDRAW_FILE, JSON.stringify(list, null, 2));
}





function saveInbox(db){
  fs.writeFileSync(INBOX_FILE, JSON.stringify(db,null,2));
}

let userInbox = new Map(Object.entries(loadInbox()));









function loadLiveState() {
  try {
    if (!fs.existsSync(LIVE_STATE_FILE)) return {};
    return JSON.parse(fs.readFileSync(LIVE_STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveLiveState(state) {
  try {
    fs.writeFileSync(LIVE_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error("Save live state failed:", e);
  }
}

function loadSocial(){
  try{
    if(!fs.existsSync(SOCIAL_FILE)) return [];
    return JSON.parse(fs.readFileSync(SOCIAL_FILE,"utf8"));
  }catch(e){
    console.error("Load social failed",e);
    return [];
  }
}

function saveSocial(){
  try{
    fs.writeFileSync(SOCIAL_FILE, JSON.stringify(lpPosts,null,2));
  }catch(e){
    console.error("Save social failed",e);
  }
}


// ================================
// 🧠 TREND ENGINE (LEVEL 11)
// ================================
function pickTrend(rng) {
  const r = rng();
  if (r < 0.45) return "UP";
  if (r < 0.9)  return "DOWN";
  return "SIDE";
}





function generateChart(roundId) {
  const base = 100;
  const vol = {
  gold: 1,
  silver: 1.5,
  diamond: 3,
  oil: 5,        // 🔥 rung mạnh
  estate: 3.5,
  atomic: 8.5 
};


const chart = {
  gold: [],
  silver: [],
  diamond: [],
  oil: [],
  estate: [],
  atomic: []
};


  // 🔥 1️⃣ RNG gốc cho cả phiên
  const roundRng = seededRandom("trend:" + roundId);

  // 🧠 2️⃣ Chọn trend cho từng asset
const trends = {
  gold: pickTrend(roundRng),
  silver: pickTrend(roundRng),
  diamond: pickTrend(roundRng),
  oil: pickTrend(roundRng),
  estate: pickTrend(roundRng),
   atomic: pickTrend(roundRng)
};


  // 📈 3️⃣ Bias theo trend
  const trendBias = {
    UP:   0.04,
    DOWN: -0.04,
    SIDE: 0
  };

  for (let t = 0; t < 60; t++) {
    for (const k in chart) {
      const rng = seededRandom(roundId + ":" + k + ":" + t);
      const prev = chart[k][t - 1] ?? base;

      const noise = (rng() - 0.5) * vol[k];
      const bias  = trendBias[trends[k]];

let next = prev + noise + bias;

// 🔥 KHÔNG CLAMP – GIÁ TỰ DO
chart[k][t] = Number(next.toFixed(4));


    }
  }

  // 🔎 (optional) log debug
  console.log("📊 Round", roundId, "trends:", trends);

  return chart;
}



// ================================
// 📊 TÍNH KẾT QUẢ TỪ CHART (LEVEL 10)
// ================================
function calcResultFromChart(chart) {
  const result = {};

  for (const asset in chart) {
    const prices = chart[asset];

    if (!Array.isArray(prices) || prices.length < 2) {
      result[asset] = 0;
      continue;
    }

    const start = prices[0];
    const end   = prices[prices.length - 1];

    // % thay đổi THỰC, KHÔNG clamp
    const percent = Math.round(
      (end - start) / start * 100
    );

    result[asset] = percent;
  }

  return result;
}



function seededRandom(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}


const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const activeUsers = new Map(); 


// ================================
// 🔢 RPS ROUND COUNT STATE
// ================================
const rpsRoundState = loadRpsRoundCount();

let rpsRoundCount = rpsRoundState.count || 0;
let rpsRoundDayTs = rpsRoundState.dayTs || getTodayStartTsVN();


// ================================
// 🎡 WHEEL ROUND STATE (GLOBAL)
// ================================
let wheelRound = {
  id: Date.now(),
  startAt: Date.now(),
  endAt: Date.now() + 60000,
  bets: []
};




// ================================
// 🥚 EGG ROUND STATE (GLOBAL)
// ================================





const ROUND_DURATION = 60000;       // 60s tổng
const RESULT_ANIM = 10000;          // 10s hoạt cảnh
const NEXT_ROUND_TIME = ROUND_DURATION - RESULT_ANIM; // 50s
const EGG_DISPLAY_POOL = [
  { type:"normal",    img:"egg1.png",  w:20 },
  { type:"forest",    img:"egg5.png",  w:20 },
  { type:"gold",      img:"egg2.png",  w:15 },
  { type:"thunder",   img:"egg6.png",  w:15 },
  { type:"diamond",   img:"egg3.png",  w:10 },
  { type:"shadow",    img:"egg7.png",  w:8 },
  { type:"dragon",    img:"egg4.png",  w:6 },
  { type:"phoenix",   img:"egg8.png",  w:4 },
  { type:"celestial", img:"egg9.png",  w:1 },
  { type:"voidlord",  img:"egg10.png", w:1 }
];

function pickDisplayEgg(){
  const total = EGG_DISPLAY_POOL.reduce((s,x)=>s+x.w,0);
  let r = Math.random()*total;
  for(const e of EGG_DISPLAY_POOL){
    if((r -= e.w) <= 0) return e;
  }
  return EGG_DISPLAY_POOL[0];
}


function ensureEggSecret(round){
  if(!round) return;

  if(round.secretResult && round.secretResult.multiplier != null){
    return;
  }

  const multiplier = pickEggMultiplier();

  const hash = crypto
    .createHash("sha256")
    .update(round.id + ":" + multiplier)
    .digest("hex");

  round.secretResult = {
    multiplier,
    hash,
    overridden:false
  };
}

let eggRound = (() => {

  eggRoundCount++;

  saveEggRoundCount({
    dayTs: eggRoundDayTs,
    count: eggRoundCount
  });

  const id = eggRoundCount;

  const round = {
    id,
    startAt: Date.now(),
    endAt: Date.now() + ROUND_DURATION,
    bets: [],
    displayEgg: pickDisplayEgg(),
    secretResult: null
  };

  ensureEggSecret(round);

  return round;
})();




function pickEggMultiplier(){

  const r = Math.random();

  // 💀 50% x0
  if(r < 0.50){
    return 0;
  }

  // 🔻 22% (0.1 → 0.9)
  if(r < 0.72){
    return Number((0.1 + Math.random() * 0.8).toFixed(2));
  }

  // ⚖️ 13% (1.0 → 1.9)
  if(r < 0.85){
    return Number((1 + Math.random() * 0.9).toFixed(2));
  }

  // 🔥 8% (2.0 → 2.9)
  if(r < 0.93){
    return Number((2 + Math.random() * 0.9).toFixed(2));
  }

  // 💎 5% (3.0 → 4.9)
  if(r < 0.98){
    return Number((3 + Math.random() * 1.9).toFixed(2));
  }

  // 🚀 1.5% (5 → 9.9)
  if(r < 0.995){
    return Number((5 + Math.random() * 4.9).toFixed(2));
  }

  // 🎰 0.5% (10 → 20)
  return Number((10 + Math.random() * 10).toFixed(2));
}




ensureWheelSecret(wheelRound);

const RPS_BET_LOCK_BEFORE_MS = 5000; // 🔒 khóa trước 5s


// ================================
// ✊✋✌️ RPS ROUND STATE (GLOBAL)
// ================================
const todayStart = getTodayStartTsVN();
if (todayStart !== rpsRoundDayTs) {
  rpsRoundCount = 0;
  rpsRoundDayTs = todayStart;

  saveRpsRoundCount({
    dayTs: rpsRoundDayTs,
    count: rpsRoundCount
  });
}

rpsRoundCount++;

let rpsRound = {
  id: rpsRoundCount,          // ✅ round trong ngày
  startAt: Date.now(),
  endAt: Date.now() + 60000,
  secretHand: pickRpsHand(),
  bets: []
};


function pickRpsHand(){
  return ["rock","paper","scissors"][
    Math.floor(Math.random()*3)
  ];
}

function calcRps(me, enemy){
  if(me === enemy) return "draw";
  if(
    (me==="rock" && enemy==="scissors") ||
    (me==="paper" && enemy==="rock") ||
    (me==="scissors" && enemy==="paper")
  ) return "win";
  return "lose";
}


// ================================
// 🐣 AUTO GROW ANIMALS (FIX)
// ================================
setInterval(()=>{

  const now = Date.now();
  let changedUsers = new Set();

  Object.keys(animalDB).forEach(uid=>{

    animalDB[uid].forEach(a=>{

      const age = now - a.createdAt;
      const growTime = a.growTime || 60000;

if(age >= growTime){

  // 🔒 Nếu đã finalize rồi → KHÔNG BAO GIỜ ĐỤNG NỮA
  if(a.finalized) return;

  if(a.stage !== 2){

    const failRateMap = {
      normal: 0.5,
      forest: 0.5,
      gold: 0.5,
      thunder: 0.5,
      diamond: 0.5,
      shadow: 0.5,
      dragon: 0.5,
      phoenix: 0.5,
      celestial: 0.5,
      voidlord: 0.5
    };

    const failRate = failRateMap[a.type] || 0.1;
    a.broken = Math.random() < failRate;

    a.stage = 2;
    a.finalized = true;  // 🔥 LOCK VĨNH VIỄN

    changedUsers.add(uid);
  }
}



    });

  });

  if(changedUsers.size > 0){
    saveAnimals(animalDB);

    changedUsers.forEach(uid=>{
      emitToUser(uid,"animal-update", animalDB[uid]);
    });
  }

}, 3000);




// ================================
// ⏱️ AUTO SPIN WHEEL EVERY 60s
// ================================
setInterval(() => {
  try {

    // 🔐 ĐẢM BẢO ROUND LUÔN CÓ KẾT QUẢ
ensureWheelSecret(wheelRound);

// 🔁 RESET ROUND KHI QUA NGÀY MỚI (0H VN)
const todayStart = getTodayStartTsVN();
if (todayStart !== wheelRoundDayTs) {
  wheelRoundCountToday = 0;
  wheelRoundDayTs = todayStart;

  saveWheelRoundCount({
    dayTs: wheelRoundDayTs,
    count: wheelRoundCountToday
  });
}




    const users = loadUsers();

// 🎯 DÙNG KẾT QUẢ ĐÃ CHỐT TỪ ĐẦU ROUND
const multiplier = wheelRound.secretResult.multiplier;
const index      = wheelRound.secretResult.index;



// 🏆 TOP WINNERS CHO PHIÊN HIỆN TẠI
const roundWinners = [];
// 🔢 ROUND ĐANG KẾT THÚC
const currentRoundToday = wheelRoundCountToday + 1;



wheelRound.bets.forEach(o => {
  const me = users[o.uid];
  if (!me?.profile) return;

  let winAmount = 0;

  if (multiplier > 0){
    winAmount = Math.floor(o.bet * multiplier);

    // 💰 cộng coin
    me.profile.coins += winAmount;

    // 🏆 chỉ add top nếu thắng
    roundWinners.push({
      uid: o.uid,
      name: me.profile.name || "Người chơi",
      winAmount
    });
  }

  // ============================
  // 📜 LƯU LỊCH SỬ CƯỢC CỦA USER
  // ============================
  me.wheelBetHistory ||= [];

me.wheelBetHistory.unshift({
  roundId: wheelRound.id,            // (giữ nếu cần debug)
  roundToday: currentRoundToday,  // ✅ ROUND TRONG NGÀY
  ts: Date.now(),
  bet: o.bet,
  multiplier,
  winAmount
});


  // 🔥 CHỈ GIỮ 24H
  const now = Date.now();
  me.wheelBetHistory = me.wheelBetHistory.filter(
    h => now - h.ts <= ONE_DAY
  );
});



// 📜 LƯU LỊCH SỬ – 1 DÒNG / 1 ROUND
wheelHistory.unshift({
  roundId: wheelRound.id,
  multiplier,
  ts: Date.now()
});




// 🥇 TOP 3 THẮNG NHIỀU NHẤT TRONG PHIÊN NÀY
const topRoundWinners = roundWinners
  .sort((a, b) => b.winAmount - a.winAmount)
  .slice(0, 3);

// 🔔 gửi cho client
io.emit("wheel-top-winners", topRoundWinners);


    saveUsers(users);

    wheelRound.bets.forEach(o => emitCoinUpdate(o.uid));


// ➕ ROUND MỚI TRONG NGÀY
wheelRoundCountToday++;


saveWheelRoundCount({
  dayTs: wheelRoundDayTs,
  count: wheelRoundCountToday
});


io.emit("wheel-round-result", {
  roundId: wheelRound.id,
  index,
  multiplier,
  roundCountToday: wheelRoundCountToday
});




// 🔒 giữ tối đa N kết quả
wheelHistory = wheelHistory.slice(0, MAX_WHEEL_HISTORY);

// 💾 lưu file (chống restart)
saveWheelHistory(wheelHistory);

// 🔔 realtime push – CHỈ 1 LẦN / ROUND
io.emit("wheel-history-update", wheelHistory.slice(0, MAX_WHEEL_HISTORY));



 const id = Date.now();

// 🎯 WEIGHTED MULTIPLIER (CHỐT NGAY KHI ROUND BẮT ĐẦU)
const weightedMultipliers = [
  { m: 0.5, w: 55 },
  { m: 1.2, w: 20 },
  { m: 1.5, w: 12 },
  { m: 2,   w: 10 },
  { m: 5,   w: 2 },
  { m: 10,  w: 1 }
];

function pickMultiplierWeighted(){
  const total = weightedMultipliers.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const item of weightedMultipliers){
    if ((r -= item.w) <= 0) return item.m;
  }
  return 0;
}

const secretMultiplier = pickMultiplierWeighted();
const multipliers = weightedMultipliers.map(x => x.m);
const secretIndex = multipliers.indexOf(secretMultiplier);

// 🔐 COMMIT HASH (ADMIN VERIFY)
const commitHash = crypto
  .createHash("sha256")
  .update(id + ":" + secretMultiplier)
  .digest("hex");

wheelRound = {
  id,
  startAt: id,
  endAt: id + 60000,
  bets: [],

  // 🔐 TUYỆT ĐỐI KHÔNG EMIT
  secretResult: {
    multiplier: secretMultiplier,
    index: secretIndex,
    hash: commitHash
  }
};



    
    io.emit("wheel-round-new", {
      roundId: wheelRound.id,
      endAt: wheelRound.endAt
    });

io.emit("admin-wheel-bet-reset", {
  roundId: wheelRound.id
});



// 🔔 CẬP NHẬT ROUND ĐANG CHẠY CHO TẤT CẢ CLIENT
io.emit("wheel-round-count", {
  roundCountToday: wheelRoundCountToday + 1
});


  } catch (e) {
    console.error("❌ wheel round error", e);
  }
}, 60000);


// ================================
// ⏱️ AUTO RPS RESULT EVERY 60s
// ================================
setInterval(() => {
  try {
    const users = loadUsers();
    const enemy = rpsRound.secretHand;

    // =========================
    // 1️⃣ TÍNH KẾT QUẢ & CẬP NHẬT COIN
    // =========================
rpsRound.bets.forEach(o => {
  const me = users[o.uid];
  if (!me?.profile) return;

  const result = calcRps(o.hand, enemy);
  let win = 0;

  if (result === "win") {
    win = o.bet * 2;           // 🔥 thắng x2
    me.profile.coins += win;
  } else if (result === "draw") {
    me.profile.coins += o.bet; // 🔄 hoàn tiền
  }
  // ❌ lose: không cộng gì

  me.rpsHistory ||= [];

  // ✅ TẠO 1 OBJECT DUY NHẤT
  const historyItem = {
    roundId: rpsRound.id,
    ts: Date.now(),
    myHand: o.hand,
    enemy,
    bet: o.bet,
    result,
    win
  };

  // 📜 LƯU VÀO USER
  me.rpsHistory.unshift(historyItem);

  // 🔒 GIỚI HẠN LỊCH SỬ (VD 30)
  if (me.rpsHistory.length > 30) {
    me.rpsHistory.length = 30;
  }

  // 🔥 REALTIME APPEND CHO RIÊNG USER
  emitToUser(o.uid, "rps-my-history-append", historyItem);
});


    // =========================
    // 2️⃣ LƯU USER TRƯỚC
    // =========================
    saveUsers(users);

    // =========================
    // 3️⃣ EMIT COIN REALTIME (SAU KHI SAVE)
    // =========================
    rpsRound.bets.forEach(o=>{
      emitCoinUpdate(o.uid);
    });

    // =========================
    // 4️⃣ EMIT KẾT QUẢ ROUND
    // =========================
    io.emit("rps-round-result",{
      roundId: rpsRound.id,
      enemyHand: enemy
    });


// =========================
// 📜 LƯU LỊCH SỬ ROUND (DÙ CÓ BET HAY KHÔNG)
// =========================
rpsHistoryGlobal.unshift({
  roundId: rpsRound.id,
  ts: Date.now(),
  enemy: enemy,
  betCount: rpsRound.bets.length,
  hasBet: rpsRound.bets.length > 0
});


// chỉ giữ N round
rpsHistoryGlobal = rpsHistoryGlobal.slice(0, MAX_RPS_HISTORY);

// 💾 lưu file
saveRpsHistory(rpsHistoryGlobal);

// 🔔 realtime push cho client
io.emit("rps-history-update", rpsHistoryGlobal);




// 🔁 RESET ROUND KHI QUA NGÀY MỚI (0H VN)
const todayStart = getTodayStartTsVN();
if (todayStart !== rpsRoundDayTs) {
  rpsRoundCount = 0;
  rpsRoundDayTs = todayStart;
}

// ➕ ROUND MỚI
rpsRoundCount++;

saveRpsRoundCount({
  dayTs: rpsRoundDayTs,
  count: rpsRoundCount
});

rpsRound = {
  id: rpsRoundCount,          // ✅ #1 → #N trong ngày
  startAt: Date.now(),
  endAt: Date.now() + 60000,
  secretHand: pickRpsHand(),
  bets: []
};


// 🔔 ADMIN REALTIME – ROUND MỚI
io.emit("admin-rps-secret-update", {
  roundId: rpsRound.id,
  secretHand: rpsRound.secretHand,
  endAt: rpsRound.endAt,
  overridden: false
});


io.emit("admin-rps-bet-reset", {
  roundId: rpsRound.id
});




io.emit("rps-round-new",{
  roundId: rpsRound.id,
  endAt: rpsRound.endAt
});




  } catch(e){
    console.error("❌ RPS ROUND ERROR", e);
  }
}, 60000);



// ================================
// 🥚 AUTO EGG RESULT
// ================================
setInterval(() => {
  try {

    const users = loadUsers();
    const multiplier = eggRound.secretResult.multiplier;


    eggRound.bets.forEach(o=>{
      const me = users[o.uid];
      if(!me?.profile) return;

      const win = Math.floor(o.bet * multiplier);
      me.profile.coins += win;
    });

    saveUsers(users);

    eggRound.bets.forEach(o=>{
      emitCoinUpdate(o.uid);
    });

    const now = Date.now();
    const animEndAt = now + RESULT_ANIM;



// 📜 LƯU LỊCH SỬ ROUND
eggHistory.unshift({
  roundId: eggRound.id,
  multiplier,
  ts: Date.now(),
  eggType: eggRound.displayEgg.type
});

// Giữ tối đa 20
eggHistory = eggHistory.slice(0, MAX_EGG_HISTORY);

saveEggHistory(eggHistory);

// Push realtime
io.emit("egg-history-update", eggHistory);




    // 🔥 EMIT RESULT + ANIM TIMER
io.emit("egg-round-result",{
  roundId: eggRound.id,
  multiplier,
  animEndAt,
  eggType: eggRound.displayEgg.type   // 🔥 QUAN TRỌNG
});


setTimeout(()=>{

  // 🔄 Nếu qua ngày mới VN → reset counter
  const todayStart = getTodayStartTsVN();
  if (todayStart !== eggRoundDayTs) {
    eggRoundCount = 0;
    eggRoundDayTs = todayStart;
  }

  // ➕ Tăng round
  eggRoundCount++;

  // 💾 Lưu persist
  saveEggRoundCount({
    dayTs: eggRoundDayTs,
    count: eggRoundCount
  });

  const id = eggRoundCount;
  const now = Date.now();

  eggRound = {
    id,                         // 🔥 Round #1 #2 #3
    startAt: now,               // vẫn dùng timestamp cho thời gian
    endAt: now + NEXT_ROUND_TIME,
    bets: [],
    displayEgg: pickDisplayEgg(),
    secretResult: null
  };

  ensureEggSecret(eggRound);

  // 🔥 emit cho admin biết trước
  io.emit("admin-egg-secret-update", {
    roundId: eggRound.id,
    multiplier: eggRound.secretResult.multiplier,
    hash: eggRound.secretResult.hash,
    endAt: eggRound.endAt,
    eggType: eggRound.displayEgg.type
  });

  io.emit("egg-round-new",{
    roundId: eggRound.id,
    endAt: eggRound.endAt,
    displayEgg: eggRound.displayEgg
  });

}, RESULT_ANIM);



  } catch(e){
    console.error("❌ egg round error", e);
  }

}, ROUND_DURATION);







// ================================
// 🔐 SOCKET AUTH & FORCE LOGOUT (FIX)
// ================================
io.on("connection", socket => {

  const { uid, deviceId } = socket.handshake.auth || {};

  socket.data.deviceId = deviceId;

  if (!uid) return;

  bindSocketToUser(uid, socket);



  // ================================
  // 🔐 SEND CURRENT EGG SECRET TO ADMIN (REALTIME FIX)
  // ================================
  const usersNow = loadUsers();
  const meNow = usersNow[uid];

  if (meNow?.role === "admin" && eggRound?.secretResult) {

    socket.emit("admin-egg-secret-update", {
      roundId: eggRound.id,
      multiplier: eggRound.secretResult.multiplier,
      hash: eggRound.secretResult.hash,
      endAt: eggRound.endAt,
      eggType: eggRound.displayEgg?.type,
      overridden: eggRound.secretResult.overridden || false
    });

  }




  // 🔥 GỬI COIN NGAY KHI CONNECT (QUAN TRỌNG)
  const users = loadUsers();
  const me = users[uid];

  const coins = Number(me?.profile?.coins || 0);


// ================================
// 🥚 BUY EGG
// ================================
socket.on("animal-buy-egg", type=>{

  const uid = socket.data.uid;
  if(!uid) return;

  const users = loadUsers();
  const me = users[uid];
  if(!me?.profile) return;

  // 🏰 CHECK BARN SLOT (PHẢI ĐẶT SAU KHI CÓ me)
  const barnLevel = me.barnLevel || 1;
  const maxSlot = BARN_CONFIG[barnLevel]?.max || 4;

  animalDB[uid] ||= [];

  if(animalDB[uid].length >= maxSlot){
    socket.emit("animal-error",{
      message:"BARN_FULL"
    });
    return;
  }

const eggMap = {

  // ===== COMMON =====
  normal:{ 
    price:100, 
    grow:60000, 
    min:150, 
    max:210 
  },
  forest:{ 
    price:180, 
    grow:60000, 
    min:270, 
    max:380 
  },

  // ===== RARE =====
  gold:{ 
    price:300, 
    grow:60000, 
    min:450, 
    max:650 
  },
  thunder:{ 
    price:450, 
    grow:48000, 
    min:700, 
    max:950 
  },

  // ===== EPIC =====
  diamond:{ 
    price:800, 
    grow:60000, 
    min:1200, 
    max:1800 
  },
  shadow:{ 
    price:1200, 
    grow:60000, 
    min:1800, 
    max:2600 
  },

  // ===== LEGENDARY =====
  dragon:{ 
    price:2000, 
    grow:60000, 
    min:3200, 
    max:4800 
  },
  phoenix:{ 
    price:3500, 
    grow:60000, 
    min:5600, 
    max:8000 
  },

  // ===== MYTHIC =====
  celestial:{ 
    price:6000, 
    grow:60000, 
    min:10000, 
    max:14000 
  },
  voidlord:{ 
    price:10000, 
    grow:60000, 
    min:17000, 
    max:24000 
  }

};



  const cfg = eggMap[type];
  if(!cfg) return;

  if(me.profile.coins < cfg.price){
    socket.emit("animal-error",{ message:"NOT_ENOUGH_COIN" });
    return;
  }

  me.profile.coins -= cfg.price;

  animalDB[uid].push({
    stage:0,
    broken: null,
    finalized: false, 
    createdAt: Date.now(),
    growTime: cfg.grow,
    value: Math.floor(cfg.min + Math.random()*(cfg.max-cfg.min)),
    type
  });

  saveUsers(users);
  saveAnimals(animalDB);

  emitCoinUpdate(uid);
  socket.emit("animal-update", animalDB[uid]);
});



// ================================
// 🐔 SELL ANIMAL
// ================================
socket.on("animal-sell", index=>{

  const uid = socket.data.uid;
  if(!uid) return;

  const list = animalDB[uid];
  if(!list || !list[index]) return;

  const a = list[index];

  // ❌ Chưa sẵn sàng
  if(a.stage !== 2){
    socket.emit("animal-error",{ message:"NOT_READY" });
    return;
  }

  // 💀 Trứng bị hỏng
  if(a.broken){
    socket.emit("animal-error",{ message:"EGG_BROKEN" });
    return;
  }

  const users = loadUsers();
  const me = users[uid];
  if(!me?.profile) return;

  // 💰 Cộng coin
  me.profile.coins += a.value;

  // 🗑 Xóa khỏi chuồng
  list.splice(index,1);

  saveUsers(users);
  saveAnimals(animalDB);

  emitCoinUpdate(uid);

  socket.emit("animal-update", list);
});



socket.on("animal-discard", index=>{

  const uid = socket.data.uid;
  if(!uid) return;

  const list = animalDB[uid];
  if(!list || !list[index]) return;

  const a = list[index];
  if(a.stage !== 2 || !a.broken) return;

  list.splice(index,1);

  saveAnimals(animalDB);

  socket.emit("animal-update", list);
});



// ================================
// 🏰 UPGRADE BARN
// ================================
socket.on("barn-upgrade", ()=>{

  const uid = socket.data.uid;
  if(!uid) return;

  const users = loadUsers();
  const me = users[uid];
  if(!me?.profile) return;

  const current = me.barnLevel || 1;
  const next = current + 1;

  if(!BARN_CONFIG[next]){
    socket.emit("animal-error",{ message:"MAX_LEVEL" });
    return;
  }

  const price = BARN_CONFIG[next].price;

  if(me.profile.coins < price){
    socket.emit("animal-error",{ message:"NOT_ENOUGH_COIN" });
    return;
  }

  me.profile.coins -= price;
  me.barnLevel = next;

  saveUsers(users);
  emitCoinUpdate(uid);

  socket.emit("barn-update",{
    level: next,
    config: BARN_CONFIG
  });

});



socket.emit("egg-history", eggHistory);



socket.emit("coin-update", { coins });


// ✊✋✌️ gửi lịch sử RPS cho user mới vào
socket.emit("rps-history", rpsHistoryGlobal);

// ✊✋✌️ gửi lịch sử RPS của RIÊNG USER
socket.emit("rps-my-history", me?.rpsHistory || []);




// 📜 gửi lịch sử vòng quay cho user mới vào
socket.emit("wheel-history", wheelHistory);


// 🐣 SEND ANIMAL DATA
socket.emit("animal-update", animalDB[uid] || []);



socket.emit("wheel-round-count", {
  roundCountToday: wheelRoundCountToday + 1
});



// 🥚 SEND EGG ROUND STATE
const myEggBet = eggRound.bets.find(b => b.uid === uid);

socket.emit("egg-round-state",{
  roundId: eggRound.id,
  endAt: eggRound.endAt,
  hasBet: !!myEggBet,
  bet: myEggBet?.bet || 0,
  displayEgg: eggRound.displayEgg
});


socket.emit("barn-update", {
  level: meNow?.barnLevel || 1,
  config: BARN_CONFIG
});

  
// ✊✋✌️ RPS ROUND INFO

const myBet = rpsRound.bets.find(b => b.uid === uid);

socket.emit("rps-round-state",{
  roundId: rpsRound.id,
  endAt: rpsRound.endAt,

  hasBet: !!myBet,
  myHand: myBet?.hand || null,
  bet: myBet?.bet || 0
});



// ================================
// 🎡 GAME WHEEL – SERVER SIDE
// ================================
socket.on("wheel-bet", data => {


  const uid = socket.data.uid;
  if (!uid) return socket.emit("wheel-error",{ message:"NOT_LOGIN" });

  const bet = Math.floor(Number(data?.bet));
  if (!bet || bet <= 0)
    return socket.emit("wheel-error",{ message:"BET_INVALID" });

  const users = loadUsers();
  const me = users[uid];
  if (!me?.profile)
    return socket.emit("wheel-error",{ message:"USER_INVALID" });

  // ⛔ mỗi phiên chỉ 1 cược
  if (wheelRound.bets.some(b => b.uid === uid))
    return socket.emit("wheel-error",{ message:"ALREADY_BET" });

  if (me.profile.coins < bet)
    return socket.emit("wheel-error",{ message:"NOT_ENOUGH_COIN" });

  // 🔻 trừ coin NGAY KHI CƯỢC
  me.profile.coins -= bet;
  saveUsers(users);
  emitCoinUpdate(uid);

  wheelRound.bets.push({ uid, bet });

  // 🔔 EMIT LIVE BET CHO ADMIN
io.emit("admin-wheel-bet-new", {
  roundId: wheelRound.id,
  uid,
  bet
});


  socket.emit("wheel-bet-ok", {
    roundId: wheelRound.id,
    bet
  });
});


// ================================
// 🥚 EGG BET
// ================================
socket.on("egg-bet", data=>{

  const uid = socket.data.uid;
  if(!uid) return socket.emit("egg-error",{ message:"NOT_LOGIN" });

  const bet = Math.floor(Number(data?.bet));
  if(!bet || bet <= 0)
    return socket.emit("egg-error",{ message:"BET_INVALID" });

  const users = loadUsers();
  const me = users[uid];
  if(!me?.profile)
    return socket.emit("egg-error",{ message:"USER_INVALID" });

  // ⛔ mỗi round chỉ 1 bet
  if(eggRound.bets.some(b=>b.uid === uid))
    return socket.emit("egg-error",{ message:"ALREADY_BET" });

  // ⛔ khóa trước 5s cuối
  if(eggRound.endAt - Date.now() <= 5000)
    return socket.emit("egg-error",{ message:"ROUND_CLOSED" });

  // 🔥 CHẶN KHÔNG ĐỦ COIN
  if(me.profile.coins < bet)
    return socket.emit("egg-error",{ message:"NOT_ENOUGH_COIN" });

  // 🔻 trừ coin ngay
  me.profile.coins -= bet;
  saveUsers(users);

  eggRound.bets.push({ uid, bet });

  emitCoinUpdate(uid);

  socket.emit("egg-bet-ok");
});





// user đã vào lệnh trong round hiện tại?
const alreadyBet =
  Array.isArray(wheelRound.bets) &&
  wheelRound.bets.some(b => b.uid === uid);

if (alreadyBet && wheelRound.endAt > Date.now()) {
  // 🔒 KHÓA – PHẢI ĐỢI ROUND MỚI
  socket.emit("wheel-locked", {
    reason: "WAIT_NEXT_ROUND",
    roundId: wheelRound.id,
    endAt: wheelRound.endAt
  });
} else {
  // ✅ CHO PHÉP VÀO GAME
  socket.emit("wheel-open", {
    roundId: wheelRound.id,
    endAt: wheelRound.endAt
  });
}


  socket.on("disconnect", () => {
    const uid = socket.data.uid;
    if (!uid) return;

    const set = activeUsers.get(uid);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) {
        activeUsers.delete(uid);
      }
    }
  });
});




let investPrice = {
  gold: 100,
  silver: 100,
  diamond: 100
};



// 💾 lưu lại ngay
saveInvestState(investRound);


let investHistory = loadInvestHistory();
const MAX_HISTORY = 10;


setInterval(() => {
  const sec = Math.floor(
    (Date.now() - investRound.startAt) / 1000
  );

  if (sec < 0 || sec >= 60) return;

  io.emit("invest-price", {
    roundId: investRound.id,
    second: sec,
price: {
  gold: investRound.chart.gold[sec],
  silver: investRound.chart.silver[sec],
  diamond: investRound.chart.diamond[sec],
  oil: investRound.chart.oil[sec],
  estate: investRound.chart.estate[sec],
  atomic: investRound.chart.atomic[sec]
}

  });
}, 1000);






setInterval(() => {
  const round = investRound;

// ================================
// 🎯 KẾT QUẢ PHIÊN – LẤY TỪ CHART
// ================================
const result = calcResultFromChart(round.chart);

// 🔥 GIÁ CHỐT CUỐI PHIÊN (CHUẨN SERVER)
const endPrice = {
  gold: round.chart.gold.at(-1),
  silver: round.chart.silver.at(-1),
  diamond: round.chart.diamond.at(-1),
  oil: round.chart.oil.at(-1),
  estate: round.chart.estate.at(-1),
  atomic: round.chart.atomic.at(-1)
};




  // ================================
  // 💰 CHỈ XỬ LÝ COIN NẾU CÓ LỆNH
  // ================================
  if (round.orders.length) {
    const users = loadUsers();

    round.orders.forEach(o => {
      const me = users[o.uid];
      if (!me?.profile) return;

const prices = round.chart[o.asset];
if (!prices) return;

const entry = o.entryPrice;
const end   = prices[prices.length - 1];

let rawPercent =
  Math.round((end - entry) / entry * 100);

// 🔁 đảo chiều nếu chọn DOWN
let percent =
  o.direction === "down"
    ? -rawPercent
    : rawPercent;

// 🔒 clamp an toàn
percent = Math.max(-30, Math.min(30, percent));


const profit =
  Math.round(o.coin * percent / 100);

// ➕ hoàn coin + lời/lỗ
me.profile.coins += o.coin + profit;


me.investHistory = me.investHistory || [];

me.investHistory.unshift({
  roundId: round.id,
  ts: Date.now(),
  asset: o.asset,
  direction: o.direction,
  coin: o.coin,
  percent,
  profit,
  entryPrice: o.entryPrice,
  endPrice: end
});

// 🔥 CHỈ GIỮ LỊCH SỬ 24H
const now = Date.now();
me.investHistory = me.investHistory.filter(
  h => now - h.ts <= ONE_DAY
);



    });

    saveUsers(users);
  }

  // ================================
  // 🔔 EMIT KẾT QUẢ PHIÊN (AI CŨNG NHẬN)
  // ================================
io.emit("invest-round-result", {
  roundId: round.id,
  result,
  endPrice // 🔥 GỬI GIÁ CHỐT CHUẨN
});


  // ================================
  // 📜 LƯU LỊCH SỬ (DÙ CÓ LỆNH HAY KHÔNG)
  // ================================
investHistory.unshift({
  roundId: round.id,
  ts: Date.now(),
  chart: round.chart,
  result,
  orders: round.orders.map(o => ({
    uid: o.uid,
    asset: o.asset,
    coin: o.coin,
    entryPrice: o.entryPrice
  }))
});

// 🔥 CHỈ GIỮ ROUND TRONG 24H
const now = Date.now();
investHistory = investHistory.filter(
  r => now - r.ts <= ONE_DAY
);


// 🔐 LƯU FILE → CHỐNG RESTART
saveInvestHistory(investHistory);


  // ================================
  // 🔄 TẠO PHIÊN MỚI
  // ================================
 const id = Date.now();

investRound = {
  id,
  startAt: id,
  endAt: id + 60000,
  orders: [],
  chart: generateChart(id),
  closedEarly: [] // 🔒 LƯU USER ĐÃ CHỐT SỚM
};


saveInvestState(investRound);



  io.emit("invest-round-new", {
    roundId: investRound.id,
    endAt: investRound.endAt
  });

}, 60000);







function kickOldSessions(uid, newSocket) {
  const sockets = activeUsers.get(uid);
  if (!sockets) return;

  for (const sid of sockets) {
    const s = io.sockets.sockets.get(sid);
    if (!s) continue;

    // 🛑 CÙNG THIẾT BỊ → KHÔNG KICK
    if (
      s.data.deviceId &&
      newSocket.data.deviceId &&
      s.data.deviceId === newSocket.data.deviceId
    ) {
      continue;
    }

    // ⛔ ĐANG POLLING → KHÔNG KICK NGAY (TRÁNH 400)
    if (s.conn?.transport?.name === "polling") {
      console.log("⏳ Skip kick polling socket:", s.id);
      continue;
    }

    // ❌ KHÁC THIẾT BỊ → KICK
    s.emit("force-logout", {
      reason: "logged_in_elsewhere",
      message: "⚠️ Tài khoản đã đăng nhập trên thiết bị khác"
    });

    s.disconnect(true);
  }
}


function emitToUser(uid, event, data) {
  const sockets = activeUsers.get(uid);
  if (!sockets) return;

  for (const sid of sockets) {
    const s = io.sockets.sockets.get(sid);
    if (s) s.emit(event, data);
  }
}




function bindSocketToUser(uid, socket) {
  let set = activeUsers.get(uid);
  if (!set) {
    set = new Set();
    activeUsers.set(uid, set);
  }

  // 🔥 chỉ kick khác device
 set.add(socket.id);          // bind trước
kickOldSessions(uid, socket); // kick sau


  socket.data.uid = uid;

  console.log("🔐 SOCKET BIND:", uid, socket.id, socket.data.deviceId);
}




// 🔧 Parse JSON body (BẮT BUỘC cho admin API)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// 🔥 SERVE FILE DATA (CHO GAME PHÁ ÁN)
app.use("/data", express.static(path.join(__dirname, "data")));







app.post("/api/rps/bet",(req,res)=>{
  const uid = req.headers["x-uid"];
  const { bet, hand } = req.body;

// ⏱️ SERVER-SIDE TIME CHECK (ANTI-LAG)
const now = Date.now();
const remainMs = rpsRound.endAt - now;

if (remainMs <= RPS_BET_LOCK_BEFORE_MS) {
  return res.json({
    ok: false,
    message: "⛔ Đã quá thời gian đặt cược"
  });
}


  if(!uid || !hand)
    return res.json({ ok:false });

  const users = loadUsers();
  const me = users[uid];
  if(!me?.profile)
    return res.json({ ok:false });

  const coin = Math.floor(Number(bet));
  if(!coin || coin <= 0)
    return res.json({ ok:false });

  if(me.profile.coins < coin)
    return res.json({ ok:false, message:"NOT_ENOUGH_COIN" });

  // ⛔ mỗi round chỉ 1 lệnh
  if (rpsRound.bets.some(b => b.uid === uid))
    return res.json({ ok:false, message:"ALREADY_BET" });

  // 🔻 trừ coin NGAY
  me.profile.coins -= coin;
  saveUsers(users);
  emitCoinUpdate(uid);

  rpsRound.bets.push({
    uid,
    hand,
    bet: coin
  });

// 🔔 REALTIME PUSH CHO ADMIN
io.emit("admin-rps-bet-new", {
  roundId: rpsRound.id,
  uid,
  hand,
  bet: coin,
  name: me.profile.name || "Người chơi"
});



  return res.json({
    ok:true,
    roundId: rpsRound.id,
    endAt: rpsRound.endAt
  });
});

// 🛑 ADMIN OVERRIDE EGG RESULT (DANGEROUS)
app.post("/api/admin/egg/override", (req, res) => {

  const uid = req.headers["x-uid"];
  const { multiplier } = req.body;

  if (!uid) return res.status(401).json({ ok:false });

  const users = loadUsers();
  const me = users[uid];

  if (me?.role !== "admin")
    return res.status(403).json({ ok:false });

  if (!eggRound || !eggRound.secretResult)
    return res.json({ ok:false, message:"NO_ACTIVE_ROUND" });

  if (Date.now() >= eggRound.endAt)
    return res.json({ ok:false, message:"ROUND_ENDED" });

  const m = Number(multiplier);
  if (isNaN(m) || m < 0)
    return res.json({ ok:false, message:"INVALID_MULTIPLIER" });

  const hash = crypto
    .createHash("sha256")
    .update(eggRound.id + ":" + m + ":override")
    .digest("hex");

  eggRound.secretResult = {
    multiplier: m,
    hash,
    overridden: true,
    overriddenBy: uid,
    overriddenAt: Date.now()
  };

  console.warn(
    "🛑 [EGG OVERRIDE]",
    "round", eggRound.id,
    "→ x" + m,
    "by", uid
  );

  // 🔔 realtime cho admin
  io.emit("admin-egg-secret-update", {
    roundId: eggRound.id,
    multiplier: m,
    hash,
    endAt: eggRound.endAt,
    eggType: eggRound.displayEgg.type,
    overridden: true
  });

  res.json({
    ok:true,
    roundId: eggRound.id,
    result: eggRound.secretResult
  });
});



// 🛑 ADMIN OVERRIDE WHEEL RESULT (DANGEROUS)
app.post("/api/admin/wheel/override", (req, res) => {
  const uid = req.headers["x-uid"];
  const { multiplier } = req.body;

  if (!uid) return res.status(401).json({ ok:false });

  const users = loadUsers();
  const me = users[uid];
  if (me?.role !== "admin")
    return res.status(403).json({ ok:false });

  if (!wheelRound || !wheelRound.secretResult)
    return res.json({ ok:false, message:"NO_ACTIVE_ROUND" });

  // ⛔ không cho override khi round đã kết thúc
  if (Date.now() >= wheelRound.endAt)
    return res.json({ ok:false, message:"ROUND_ENDED" });

  const allowed = [0.5,1.2,1.5,2,5,10];
  if (!allowed.includes(multiplier))
    return res.json({ ok:false, message:"INVALID_MULTIPLIER" });

  const index = allowed.indexOf(multiplier);

  const hash = crypto
    .createHash("sha256")
    .update(wheelRound.id + ":" + multiplier + ":override")
    .digest("hex");

  // 🔥 OVERRIDE THẲNG
  wheelRound.secretResult = {
    multiplier,
    index,
    hash,
    overridden: true,
    overriddenBy: uid,
    overriddenAt: Date.now()
  };

  console.warn(
    "🛑 [WHEEL OVERRIDE]",
    "round", wheelRound.id,
    "→ x" + multiplier,
    "by", uid
  );

  res.json({
    ok:true,
    roundId: wheelRound.id,
    result: wheelRound.secretResult
  });
});





app.post("/api/invest/close-early", (req, res) => {
  try {
    const uid = req.headers["x-uid"];
    if (!uid) {
      return res.json({ ok:false, message:"NOT_LOGIN" });
    }

    if (!investRound || !Array.isArray(investRound.orders)) {
      return res.json({
        ok:false,
        message:"Phiên chưa sẵn sàng"
      });
    }

    const order = investRound.orders.find(o => o.uid === uid);
    if (!order) {
      return res.json({
        ok:false,
        message:"Bạn chưa vào lệnh"
      });
    }

    // ⏱ kiểm tra 10 giây
    if (!order.entryTime || Date.now() - order.entryTime < 10_000) {
      return res.json({
        ok:false,
        message:"⏳ Chỉ được chốt sau 10 giây"
      });
    }

    const asset = order.asset;
    const chart = investRound.chart?.[asset];
    if (!Array.isArray(chart)) {
      return res.json({
        ok:false,
        message:"Không có dữ liệu giá"
      });
    }

    const nowSec = Math.min(
      chart.length - 1,
      Math.floor((Date.now() - investRound.startAt) / 1000)
    );

    const priceNow = chart[nowSec];
    if (typeof priceNow !== "number") {
      return res.json({
        ok:false,
        message:"Không lấy được giá hiện tại"
      });
    }

    // 📈 tính %
    let rawPercent =
      Math.round((priceNow - order.entryPrice) / order.entryPrice * 100);

    let percent =
      order.direction === "down" ? -rawPercent : rawPercent;

    percent = Math.max(-30, Math.min(30, percent));

    const profit =
      Math.round(order.coin * percent / 100);

    // 💰 cộng coin
    const users = loadUsers();
    const me = users[uid];
    if (!me?.profile) {
      return res.json({ ok:false, message:"USER_INVALID" });
    }

    me.profile.coins += order.coin + profit;

    me.investHistory = me.investHistory || [];
    me.investHistory.unshift({
      roundId: investRound.id, 
      ts: Date.now(),
      asset,
      direction: order.direction,
      coin: order.coin,
      percent,
      profit,
      entryPrice: order.entryPrice,
      endPrice: priceNow,
      earlyClose: true
    });

    const now = Date.now();
me.investHistory = me.investHistory.filter(
  h => now - h.ts <= ONE_DAY
);


    saveUsers(users);
    emitCoinUpdate(uid);


// 🔒 ĐÁNH DẤU ĐÃ CHỐT SỚM TRONG ROUND
investRound.closedEarly ||= [];
if (!investRound.closedEarly.includes(uid)) {
  investRound.closedEarly.push(uid);
}

// ❌ xoá lệnh khỏi round
investRound.orders =
  investRound.orders.filter(o => o.uid !== uid);

saveInvestState(investRound);


    // ✅ TRẢ KẾT QUẢ CHO CLIENT
    return res.json({
      ok:true,
      percent,
      profit,
      coin: order.coin,
      direction: order.direction,
      entryPrice: order.entryPrice,
      endPrice: priceNow
    });

  } catch (err) {
    console.error("❌ close-early error:", err);
    return res.status(500).json({
      ok:false,
      message:"SERVER_ERROR"
    });
  }
});


// 🔐 ADMIN – GET CURRENT RPS BETS
app.get("/api/admin/rps/bets", (req, res) => {

  const uid = req.headers["x-uid"];
  if (!uid) return res.status(401).json({ ok:false });

  const users = loadUsers();
  const me = users[uid];

  if (me?.role !== "admin")
    return res.status(403).json({ ok:false });

  if (!rpsRound || !Array.isArray(rpsRound.bets)) {
    return res.json({ ok:true, list: [] });
  }

  const list = rpsRound.bets.map(b => {
    const u = users[b.uid];
    return {
      uid: b.uid,
      name: u?.profile?.name || "Người chơi",
      bet: b.bet,
      hand: b.hand
    };
  });

  res.json({
    ok:true,
    roundId: rpsRound.id,
    list
  });
});




// ================================
// 🔐 ADMIN – XEM TRƯỚC KẾT QUẢ RPS
// ================================
app.get("/api/admin/rps/secret", (req, res) => {

  const uid = req.headers["x-uid"];
  if (!uid) return res.status(401).json({ ok:false });

  const users = loadUsers();
  const me = users[uid];

  if (me?.role !== "admin") {
    return res.status(403).json({ ok:false });
  }

  if (!rpsRound) {
    return res.json({ ok:false, message:"NO_ACTIVE_ROUND" });
  }

  return res.json({
    ok: true,
    roundId: rpsRound.id,
    endAt: rpsRound.endAt,
    secretHand: rpsRound.secretHand
  });
});


// 🛑 ADMIN OVERRIDE RPS RESULT (DANGEROUS)
app.post("/api/admin/rps/override", (req, res) => {

  const uid = req.headers["x-uid"];
  const { hand } = req.body;

  if (!uid) return res.status(401).json({ ok:false });

  const users = loadUsers();
  const me = users[uid];

  if (me?.role !== "admin") {
    return res.status(403).json({ ok:false });
  }

  if (!rpsRound) {
    return res.json({ ok:false, message:"NO_ACTIVE_ROUND" });
  }

  // ⛔ Không cho override khi round đã kết thúc
  if (Date.now() >= rpsRound.endAt) {
    return res.json({ ok:false, message:"ROUND_ENDED" });
  }

  const allowed = ["rock","paper","scissors"];
  if (!allowed.includes(hand)) {
    return res.json({ ok:false, message:"INVALID_HAND" });
  }

  // 🔥 OVERRIDE THẲNG
  rpsRound.secretHand = hand;

// 🔔 REALTIME PUSH CHO ADMIN
io.emit("admin-rps-secret-update", {
  roundId: rpsRound.id,
  secretHand: rpsRound.secretHand,
  endAt: rpsRound.endAt,
  overridden: true
});



  console.warn(
    "🛑 [RPS OVERRIDE]",
    "round", rpsRound.id,
    "→", hand,
    "by", uid
  );

  res.json({
    ok:true,
    roundId: rpsRound.id,
    secretHand: rpsRound.secretHand
  });
});



// 🔐 ADMIN – GET CURRENT WHEEL BETS
app.get("/api/admin/wheel/bets", (req, res) => {
  const uid = req.headers["x-uid"];
  if (!uid) return res.status(401).json({ ok:false });

  const users = loadUsers();
  const me = users[uid];
  if (me?.role !== "admin")
    return res.status(403).json({ ok:false });

  if (!wheelRound || !Array.isArray(wheelRound.bets)) {
    return res.json({ ok:true, list: [] });
  }

  const list = wheelRound.bets.map(b => {
    const u = users[b.uid];
    return {
      uid: b.uid,
      name: u?.profile?.name || "Người chơi",
      bet: b.bet
    };
  });

  res.json({
    ok:true,
    roundId: wheelRound.id,
    list
  });
});


app.get("/api/admin/wheel/secret", (req, res) => {
  const uid = req.headers["x-uid"];
  if (!uid) return res.status(401).json({ ok:false });

  const users = loadUsers();
  const me = users[uid];

  if (me?.role !== "admin") {
    return res.status(403).json({ ok:false });
  }

  if (!wheelRound?.secretResult) {
    return res.json({ ok:false, message:"NO_ROUND" });
  }

res.json({
  ok: true,
  roundId: wheelRound.id,              // giữ nếu cần debug
  roundToday: wheelRoundCountToday + 1, // ✅ ROUND TRONG NGÀY
  startAt: wheelRound.startAt,
  endAt: wheelRound.endAt,
  result: wheelRound.secretResult
});

});



// ================================
// 🧠 HEALTH – GET DATA
// ================================
app.get("/api/health/:uid", (req, res) => {
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).json({ ok: false, error: "NO_UID" });
  }

  const file = path.join(HEALTH_DIR, `${uid}.json`);

  if (!fs.existsSync(file)) {
    return res.json({
      ok: true,
      healthData: {}
    });
  }

  try {
    const raw = fs.readFileSync(file, "utf8");
    const json = raw ? JSON.parse(raw) : {};
    return res.json({
      ok: true,
      healthData: json.healthData || {}
    });
  } catch (e) {
    console.error("❌ Load health failed:", e);
    return res.status(500).json({
      ok: false,
      error: "READ_HEALTH_FAILED"
    });
  }
});



// ================================
// 📜 WHEEL – MY BET HISTORY
// ================================
app.get("/api/wheel/my-history", (req, res) => {
  const uid = req.headers["x-uid"];
  if (!uid) return res.json({ ok:false });

  const users = loadUsers();
  const me = users[uid];
  if (!me) return res.json({ ok:false });

  res.json({
    ok: true,
    list: me.wheelBetHistory || []
  });
});



app.get("/api/invest/my-history", (req, res) => {
  const uid = req.headers["x-uid"];
  if (!uid) return res.json({ ok: false });

  const users = loadUsers();
  const me = users[uid];
  if (!me) return res.json({ ok: false });

  res.json({
    ok: true,
    list: me.investHistory || []
  });
});



app.get("/api/invest/chart", (req, res) => {
  res.json({
    ok: true,
    roundId: investRound.id,
    startAt: investRound.startAt,
    chart: investRound.chart
  });
});



app.get("/api/invest/round", (req, res) => {
  const uid = req.headers["x-uid"];

  res.json({
    ok: true,
    roundId: investRound.id,
    startAt: investRound.startAt,
    endAt: investRound.endAt,
    orders: investRound.orders || [],
    closedEarly: investRound.closedEarly?.includes(uid) || false
  });
});



// ================================
// 🔒 CHECK USER CÓ ĐƯỢC VÀO INVEST KHÔNG
// ================================
app.get("/api/invest/can-enter", (req, res) => {
  const uid = req.headers["x-uid"];
  if (!uid) {
    return res.json({ ok: false, reason: "NOT_LOGIN" });
  }

  // round hiện tại
  if (!investRound) {
    return res.json({ ok: true });
  }

  const now = Date.now();

  // 🔍 user có lệnh đang mở không
  const hasOrder =
    Array.isArray(investRound.orders) &&
    investRound.orders.some(o => o.uid === uid);

  // 🔒 round chưa kết thúc + đã vào lệnh
  if (hasOrder && investRound.endAt > now) {
    return res.json({
      ok: false,
      locked: true,
      roundId: investRound.id,
      endAt: investRound.endAt
    });
  }

  // 🔒 user đã chốt sớm trong round này
  if (
    Array.isArray(investRound.closedEarly) &&
    investRound.closedEarly.includes(uid) &&
    investRound.endAt > now
  ) {
    return res.json({
      ok: false,
      locked: true,
      roundId: investRound.id,
      endAt: investRound.endAt
    });
  }

  // ✅ cho phép vào
  return res.json({ ok: true });
});



// ================================
// 📜 INVEST HISTORY – CHỈ 24H
// ================================
app.get("/api/invest/history", (req, res) => {
  const now = Date.now();

  // 🔥 lọc lại lần nữa cho chắc (kể cả file cũ)
  const list24h = (investHistory || []).filter(
    r => r.ts && now - r.ts <= ONE_DAY
  );

  res.json({
    ok: true,
    list: list24h
  });
});



// ================================
// 🧠 HEALTH – SAVE DATA
// ================================
app.post("/api/health/:uid", (req, res) => {
  const { uid } = req.params;
  const healthData = req.body;

  if (!uid) {
    return res.status(400).json({ ok: false, error: "NO_UID" });
  }

  if (!healthData || typeof healthData !== "object") {
    return res.status(400).json({
      ok: false,
      error: "INVALID_DATA"
    });
  }

  const file = path.join(HEALTH_DIR, `${uid}.json`);

  try {
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          uid,
          healthData,
          updatedAt: Date.now()
        },
        null,
        2
      )
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error("❌ Save health failed:", e);
    return res.status(500).json({
      ok: false,
      error: "SAVE_HEALTH_FAILED"
    });
  }
});




app.post("/api/invest", (req, res) => {
  try {
    const uid = req.headers["x-uid"];
    const { type, coin, direction } = req.body;

    // 🔐 auth
    if (!uid) {
      return res.json({ ok:false, message:"NOT_LOGIN" });
    }

    // 🔒 chặn user đã chốt sớm
    if (Array.isArray(investRound.closedEarly) &&
        investRound.closedEarly.includes(uid)) {
      return res.json({
        ok:false,
        message:"⛔ Bạn đã chốt lệnh sớm trong phiên này. Vui lòng chờ phiên tiếp theo."
      });
    }

    // 🎯 validate body
    if (!type || !coin || !["up","down"].includes(direction)) {
      return res.json({
        ok:false,
        message:"Dữ liệu vào lệnh không hợp lệ"
      });
    }

    // ⛔ chặn vào nhiều lệnh
    if (investRound.orders.some(o => o.uid === uid)) {
      return res.json({
        ok:false,
        message:"⛔ Bạn đã vào lệnh trong phiên này"
      });
    }

    // ⏳ chặn sát giờ
    const leftSec = Math.floor(
      (investRound.endAt - Date.now()) / 1000
    );
    if (leftSec <= 5) {
      return res.json({
        ok:false,
        message:"⏳ Phiên sắp kết thúc"
      });
    }

    // 👤 user
    const users = loadUsers();
    const me = users[uid];
    if (!me?.profile) {
      return res.json({ ok:false, message:"USER_INVALID" });
    }

    if (me.profile.coins < coin) {
      return res.json({
        ok:false,
        message:"💎 Không đủ coin"
      });
    }

    // 📊 xác định entry price TRƯỚC
    const nowSec = Math.floor(
      (Date.now() - investRound.startAt) / 1000
    );

    const entryPrice =
      investRound.chart?.[type]?.[nowSec];

    if (typeof entryPrice !== "number") {
      return res.json({
        ok:false,
        message:"Không lấy được giá vào lệnh"
      });
    }

    // ➖ trừ coin SAU KHI OK HẾT
    me.profile.coins -= coin;
    saveUsers(users);
    emitCoinUpdate(uid);

    // 📥 lưu lệnh
    investRound.orders.push({
      uid,
      asset: type,
      coin,
      direction,
      entrySec: nowSec,
      entryPrice,
      entryTime: Date.now()
    });

    saveInvestState(investRound);

    // 🔔 realtime
    io.emit("invest-order-new", {
      uid,
      asset: type,
      coin,
      direction,
      entrySec: nowSec,
      entryPrice
    });

    return res.json({
      ok:true,
      roundId: investRound.id,
      endAt: investRound.endAt
    });

  } catch (err) {
    console.error("❌ /api/invest error:", err);
    return res.status(500).json({
      ok:false,
      message:"SERVER_ERROR"
    });
  }
});







// ===== GET INBOX (SYNC KHI MỞ MESSAGES) =====
app.get("/api/inbox", (req, res) => {
  const uid = req.headers["x-uid"];
  if (!uid) return res.status(403).json({ error: "no_auth" });

  const list = userInbox.get(uid) || [];

  res.json({
    ok: true,
    list
  });
});



app.get("/api/withdraw-history", (req, res) => {
  const uid = req.headers["x-uid"];
  if (!uid) return res.status(403).json({ error: "no_auth" });

  const list = loadWithdraws();

  // 🔒 chỉ trả về của chính user
  const mine = list.filter(w => w.uid === uid);

  res.json({
    ok: true,
    list: mine
  });
});


// 🔐 BẢO VỆ TRANG ADMIN
app.get("/lsp-admin-128995.html", (req, res) => {
  const uid = req.headers["x-uid"];
  if (!uid) return res.status(403).send("Forbidden");

  const db = loadUsers();
  const acc = db[uid];

  if (!acc || acc.role !== "admin") {
    return res.status(403).send("Not allowed");
  }

  res.sendFile(path.join(__dirname, "public", "lsp-admin-128995.html"));
});


app.post("/api/admin/market/approve-dispute", (req,res)=>{
  const { adminUid, orderId } = req.body;

  const users = loadUsers();
  if(!users[adminUid] || users[adminUid].role !== "admin")
    return res.status(403).json({ error:"not_admin" });

  const market = loadMarket();
  let found, booth, boothId;

  for(const [id,b] of Object.entries(market)){
    const o = (b.orders||[]).find(x=>x.id===orderId);
    if(o){
      found=o; booth=b; boothId=id;
      break;
    }
  }

  if(!found || found.status !== "dispute"){
    return res.json({ ok:false, error:"NOT_DISPUTE" });
  }

  // ✅ set done
  found.status = "done";
  found.doneAt = Date.now();
  found.adminApproved = true;   // 🧑‍⚖️ ĐÁNH DẤU ADMIN DUYỆT
  found.adminApprovedAt = Date.now();


  // 💰 trả tiền cho seller
  const seller = users[booth.ownerUid];
  const amount = Number(found.escrow || 0);

  if(seller?.profile && amount > 0){
    seller.profile.coinReceived =
      (seller.profile.coinReceived || 0) + amount;
    found.escrow = 0;
  }

  saveUsers(users);
  saveMarket(market);

  emitCoinUpdate(booth.ownerUid);

  io.emit("order-updated",{ boothId, order: found });

  // 🔔 notify buyer + seller
  sendPushToUser(found.buyerUid,{
    title:"🧑‍⚖️ Khiếu nại đã được xử lý",
    body:"Admin đã chấp nhận đơn hàng.",
    tag:"dispute-approved"
  });

  sendPushToUser(booth.ownerUid,{
    title:"💰 Đơn hàng được duyệt",
    body:`Admin đã chấp nhận đơn ${found.productName}`,
    tag:"dispute-approved"
  });

  res.json({ ok:true });
});



app.get("/api/admin/market/disputes", (req,res)=>{
  const adminUid = req.headers["x-uid"];
  const users = loadUsers();

  if(!users[adminUid] || users[adminUid].role !== "admin")
    return res.status(403).json({ error:"not_admin" });

  const market = loadMarket();
  const list = [];

  for(const [boothId, booth] of Object.entries(market)){
    (booth?.orders || []).forEach(o=>{
      if(o.status === "dispute"){
        list.push({
          boothId,
          boothName: booth.name,
          ownerUid: booth.ownerUid,
          order: o
        });
      }
    });
  }

  res.json({ ok:true, list });
});




// ===== ADMIN LIST USERS =====
app.get("/api/admin/users", (req, res) => {
  const adminUid = req.headers["x-uid"];
  if (!adminUid) return res.status(403).json({ error: "no_auth" });

  const db = loadUsers();
  const admin = db[adminUid];

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ error: "not_admin" });
  }

  const users = Object.values(db).map(u => ({
    uid: u.profile?.uid,
    name: u.profile?.name || "",
    coins: u.profile?.coins || 0,
    level: u.profile?.level || 1,
    exp: u.profile?.exp || 0,
    coinSent: u.profile?.coinSent || 0,
    coinReceived: u.profile?.coinReceived || 0,
    role: u.role || "user",
    blocked: !!u.profile?.accountBlocked


  }));

  res.json({ ok: true, users });
});

// ===== ADMIN: LIVE ROOMS =====
app.get("/api/admin/live-rooms", (req, res) => {
  const adminUid = req.headers["x-uid"];
  if (!adminUid) return res.status(403).json({ error: "no_auth" });

  const db = loadUsers();
  const admin = db[adminUid];

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ error: "not_admin" });
  }

  res.json({
    ok: true,
    rooms: getLobbyList(),
    ts: Date.now()
  });
});

app.get("/api/market", (req,res)=>{
  cleanupExpiredBooths();
  const market = loadMarket();

  // 🔧 đảm bảo product nào cũng có images[]
  Object.values(market).forEach(booth=>{
    (booth?.products || []).forEach(p=>{
      if (!Array.isArray(p.images) || p.images.length === 0) {
        p.images = p.image ? [p.image] : [];
      }
    });
  });

  res.json({ ok:true, market });
});


app.post("/api/market/order/received", (req,res)=>{
  const uid = req.headers["x-uid"];
  const { orderId } = req.body;

  if(!uid) return res.json({ ok:false, error:"NOT_LOGIN" });

  const market = loadMarket();
  let found, booth, boothId;

  for(const [id,b] of Object.entries(market)){
    const o = (b.orders || []).find(x=>x.id===orderId);
    if(o){
      found = o;
      booth = b;
      boothId = id;
      break;
    }
  }

  if(!found) return res.json({ ok:false, error:"ORDER_NOT_FOUND" });
  if(found.buyerUid !== uid)
    return res.json({ ok:false, error:"NO_PERMISSION" });

  if(found.status !== "contacted"){
    return res.json({
      ok:false,
      error:"INVALID_STATUS",
      message:"Chỉ có thể xác nhận khi shop đã liên hệ."
    });
  }


  found.status = "buyer_received";
  found.receivedAt = Date.now();

  saveMarket(market);

  io.emit("order-updated",{ boothId, order: found });


// =========================
// 🔔 NOTIFY SELLER: BUYER ĐÃ NHẬN HÀNG
// =========================
const notifyText =
  `📦 Người mua đã xác nhận nhận hàng: ${found.productName} ×${found.qty}`;

// 1️⃣ REALTIME (nếu seller đang online)
const sockets = activeUsers.get(booth.ownerUid);
if (sockets) {
  for (const sid of sockets) {
    io.to(sid).emit("system-notify", {
      type: "order-received",
      boothId,
      orderId: found.id,
      text: notifyText,
      ts: Date.now()
    });
  }
}

// 2️⃣ PUSH NOTIFICATION (offline / tab khác)
sendPushToUser(booth.ownerUid, {
  title: "📦 Người mua đã nhận hàng",
  body: notifyText,
  tag: "order-received"
});

  res.json({ ok:true });
});




app.post("/api/market/order/dispute", (req,res)=>{
  const uid = req.headers["x-uid"];
  const { orderId, reason } = req.body;

  if(!uid) return res.json({ ok:false, error:"NOT_LOGIN" });

  const market = loadMarket();
  let found, booth, boothId;

  for(const [id,b] of Object.entries(market)){
    const o = (b.orders||[]).find(x=>x.id===orderId);
    if(o){
      found=o; booth=b; boothId=id;
      break;
    }
  }

  if(!found) return res.json({ ok:false, error:"ORDER_NOT_FOUND" });
  if(found.buyerUid !== uid)
    return res.json({ ok:false, error:"NO_PERMISSION" });

  if(!["contacted","buyer_received"].includes(found.status)){
    return res.json({
      ok:false,
      message:"Không thể khiếu nại ở trạng thái này."
    });
  }

  // 🔒 gắn dispute
  found.status = "dispute";

found.dispute = {
  reason,
  evidences: Array.isArray(req.body.evidences)
    ? req.body.evidences
    : [],
  ts: Date.now()
};


  saveMarket(market);

  io.emit("order-updated",{ boothId, order: found });

  // 🔔 notify seller
  sendPushToUser(booth.ownerUid,{
    title:"⚠️ Đơn hàng bị khiếu nại",
    body:`${found.productName} ×${found.qty}`,
    tag:"order-dispute"
  });

  res.json({ ok:true });
});



app.post("/api/admin/market/refund", (req,res)=>{
  const { adminUid, orderId } = req.body;

  const users = loadUsers();
  if(!users[adminUid] || users[adminUid].role!=="admin")
    return res.status(403).json({ error:"not_admin" });

  const market = loadMarket();
  let found, booth, boothId;

  for(const [id,b] of Object.entries(market)){
    const o=(b.orders||[]).find(x=>x.id===orderId);
    if(o){
      found=o; booth=b; boothId=id;
      break;
    }
  }

  if(!found || found.status!=="dispute")
    return res.json({ ok:false, error:"NOT_DISPUTE" });

  const buyer = users[found.buyerUid];
  if(buyer?.profile){
    buyer.profile.coins += found.escrow;
  }

  found.status = "refunded";
  found.escrow = 0;
  found.refundedAt = Date.now();

  saveUsers(users);
  saveMarket(market);

  emitCoinUpdate(found.buyerUid);

  io.emit("order-updated",{ boothId, order: found });

  res.json({ ok:true });
});


app.post("/api/market/order/hide", (req, res) => {
  const uid = req.headers["x-uid"];
  const { orderId, role } = req.body; 
  // role = "buyer" | "seller"

  if (!uid) return res.json({ ok: false, error: "NOT_LOGIN" });

  const market = loadMarket();
  let order, booth, boothId;

  // ✅ PHẢI LẤY boothId TỪ KEY
  for (const [id, b] of Object.entries(market)) {
    const o = (b.orders || []).find(x => x.id === orderId);
    if (o) {
      order = o;
      booth = b;
      boothId = id; // 🔥 CHÍNH LÀ CHỖ NÀY
      break;
    }
  }

  if (!order) return res.json({ ok:false, error:"ORDER_NOT_FOUND" });

// 🔒 CHỈ CHO XOÁ KHI ĐƠN ĐÃ HOÀN TẤT HOẶC ĐÃ HUỶ
if (!["done", "cancelled", "refunded"].includes(order.status)) {

  return res.json({
    ok: false,
    error: "ORDER_NOT_ALLOWED",
    message: "🔒 Chỉ có thể xoá lịch sử khi đơn hàng đã hoàn tất hoặc đã huỷ."
  });
}




  if (role === "buyer") {
    if (order.buyerUid !== uid)
      return res.json({ ok:false, error:"NO_PERMISSION" });
    order.hiddenByBuyer = true;
  }

  if (role === "seller") {
    if (booth.ownerUid !== uid)
      return res.json({ ok:false, error:"NO_PERMISSION" });
    order.hiddenBySeller = true;
  }

  saveMarket(market);

  // 🔄 realtime update ĐÚNG boothId
  io.emit("order-updated", {
    boothId,
    order
  });

  res.json({ ok:true });
});


// 📎 UPLOAD BẰNG CHỨNG KHIẾU NẠI (ảnh / video)
app.post("/api/upload-dispute-media", postMediaUpload.single("file"), async (req, res) => {

    if (!req.file)
      return res.status(400).json({ error: "NO_FILE" });

    const safeName = req.file.originalname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    const key = `disputes/${Date.now()}_${safeName}`;

    const url = await uploadToR2(
      req.file.buffer,
      key,
      req.file.mimetype
    );

    res.json({
      ok: true,
      url,
      type: req.file.mimetype.startsWith("video")
        ? "video"
        : "image"
    });
  }
);





app.post("/api/market/order/done", (req, res) => {
  const uid = req.headers["x-uid"];
  const { orderId } = req.body;

  if (!uid) return res.json({ ok: false, error: "NOT_LOGIN" });

  const market = loadMarket();
  let found, booth, boothId;

  // 🔍 tìm đơn + boothId ĐÚNG
  for (const [id, b] of Object.entries(market)) {
    const o = (b.orders || []).find(x => x.id === orderId);
    if (o) {
      found = o;
      booth = b;
      boothId = id;
      break;
    }
  }

  if (!found) return res.json({ ok: false, error: "ORDER_NOT_FOUND" });

  // 🔒 chỉ chủ shop
  if (booth.ownerUid !== uid)
    return res.json({ ok: false, error: "NO_PERMISSION" });

  // 🔒 chỉ khi người mua đã nhận hàng
  if (found.status !== "buyer_received") {
    return res.json({
      ok: false,
      error: "WAIT_BUYER",
      message: "Chờ người mua xác nhận đã nhận hàng."
    });
  }

  // =========================
  // ✅ 1️⃣ cập nhật trạng thái
  // =========================
  found.status = "done";
  found.doneAt = Date.now();

  // =========================
  // 💰 2️⃣ TRẢ TIỀN CHO SELLER
  // =========================
  const users = loadUsers();
  const seller = users[booth.ownerUid];

  const amount = Number(found.escrow || found.totalPrice || 0);

  if (seller && seller.profile && amount > 0) {
    seller.profile.coinReceived =
      (seller.profile.coinReceived || 0) + amount;

    // 🔓 giải phóng escrow
    found.escrow = 0;
  }

  saveUsers(users);
  saveMarket(market);

  // 🔄 realtime update ĐÚNG boothId
  io.emit("order-updated", {
    boothId,
    order: found
  });

  // 🔄 realtime update coin cho seller
  emitCoinUpdate(booth.ownerUid);

  // =========================
  // 🔔 notify buyer
  // =========================
  const notifyText = `✅ Đơn hàng đã hoàn tất: ${found.productName} ×${found.qty}`;

  const sockets = activeUsers.get(found.buyerUid);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("system-notify", {
        type: "order-done",
        boothId,
        text: notifyText,
        ts: Date.now()
      });
    }
  }

  sendPushToUser(found.buyerUid, {
    title: "✅ Đơn hàng hoàn tất",
    body: notifyText,
    tag: "order-done"
  });

  res.json({ ok: true });
});





app.post("/api/market/order/contact", (req, res) => {
  const uid = req.headers["x-uid"];
  const { orderId } = req.body;

  if (!uid) return res.json({ ok:false, error:"NOT_LOGIN" });

  const market = loadMarket();
  let found, booth;

  for (const b of Object.values(market)) {
    const o = (b.orders || []).find(x => x.id === orderId);
    if (o) {
      found = o;
      booth = b;
      break;
    }
  }

  if (!found) return res.json({ ok:false, error:"ORDER_NOT_FOUND" });

  // 🔒 chỉ chủ gian
  if (booth.ownerUid !== uid)
    return res.json({ ok:false, error:"NO_PERMISSION" });

  // 🔒 chỉ khi pending
  if (found.status !== "pending") {
    return res.json({
      ok:false,
      error:"INVALID_STATUS",
      message:"Đơn hàng không thể xác nhận."
    });
  }

  // ✅ cập nhật trạng thái
  found.status = "contacted";
  found.contactedAt = Date.now();

  saveMarket(market);

  // 🔄 realtime update booth
io.emit("order-updated", {
  boothId: booth.boothId,
  order: found
});



  // 🔔 notify buyer
  const notifyText = `📞 Shop đã liên hệ đơn hàng: ${found.productName}`;

  const sockets = activeUsers.get(found.buyerUid);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("system-notify", {
        type: "order-contacted",
        boothId: booth.id,
        text: notifyText,
        ts: Date.now()
      });
    }
  }

  sendPushToUser(found.buyerUid, {
    title: "📞 Đơn hàng đã được xác nhận",
    body: notifyText,
    tag: "order-contacted"
  });

  res.json({ ok:true });
});



app.post("/api/market/order/cancel", (req,res)=>{
  const uid = req.headers["x-uid"];
  const { orderId } = req.body;

  if(!uid) return res.json({ ok:false, error:"NOT_LOGIN" });

  const market = loadMarket();
  let found, booth, product;

  for(const b of Object.values(market)){
    const o = (b.orders || []).find(x => x.id === orderId);
    if(o){
      found = o;
      booth = b;
      product = (b.products || []).find(p => p.id === o.productId);
      break;
    }
  }

  if(!found) return res.json({ ok:false, error:"ORDER_NOT_FOUND" });
  if(found.buyerUid !== uid)
    return res.json({ ok:false, error:"NO_PERMISSION" });

if(found.status === "contacted"){
  return res.json({
    ok:false,
    error:"ORDER_CONTACTED",
    message:"Shop đã liên hệ, không thể huỷ đơn hàng."
  });
}

if(found.status !== "pending"){
  return res.json({
    ok:false,
    error:"CANNOT_CANCEL",
    message:"Đơn hàng không thể huỷ."
  });
}


  // =========================
  // 1️⃣ cập nhật trạng thái
  // =========================
  found.status = "cancelled";
  found.cancelledAt = Date.now();

  // =========================
  // 2️⃣ hoàn stock
  // =========================
  if(product) product.stock += found.qty;

  // =========================
  // 3️⃣ HOÀN / ĐIỀU CHỈNH COIN
  // =========================
  const users = loadUsers();

  // 👤 BUYER
  const buyer = users[found.buyerUid];
  if(buyer && buyer.profile){
    buyer.profile.coins += found.totalPrice;
    buyer.profile.coinSent = Math.max(
      0,
      (buyer.profile.coinSent || 0) - found.totalPrice
    );
  }

  // 🏪 SELLER
  const owner = users[booth.ownerUid];
  if(owner && owner.profile){
    owner.profile.coinReceived = Math.max(
      0,
      (owner.profile.coinReceived || 0) - found.totalPrice
    );
  }

  saveUsers(users);
  saveMarket(market);

  // 🔄 REALTIME UPDATE COIN
  emitCoinUpdate(found.buyerUid);
  emitCoinUpdate(booth.ownerUid);

  // =========================
  // 4️⃣ notify chủ gian
  // =========================
  const notifyText = `❌ Đơn hàng bị huỷ: ${found.productName} ×${found.qty}`;

  const sockets = activeUsers.get(booth.ownerUid);
  if(sockets){
    for(const sid of sockets){
      io.to(sid).emit("system-notify",{
        type:"order-cancel",
        boothId: booth.id,
        text: notifyText,
        ts: Date.now()
      });
    }
  }

  sendPushToUser(booth.ownerUid,{
    title:"❌ Đơn hàng bị huỷ",
    body: notifyText,
    tag:"order-cancel"
  });


// 🔄 REALTIME ORDER UPDATE (KHÔNG RELOAD)
io.emit("order-updated", {
  boothId: booth.boothId,
  order: found
});




  res.json({ ok:true });
});





app.post("/api/upload-product-image",
  postMediaUpload.single("image"),
  async (req, res) => {

  if (!req.file)
    return res.status(400).json({ error: "No file" });

  const safeName = req.file.originalname
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  const key = `products/${Date.now()}_${safeName}`;

  const url = await uploadToR2(
    req.file.buffer,
    key,
    req.file.mimetype
  );

  res.json({ url });
});





// ===== ADD PRODUCT TO BOOTH =====
app.post("/api/market/product/add", (req, res) => {
  const uid = req.headers["x-uid"];
  const { boothId, product } = req.body || {};

  if (!uid || !boothId || !product)
    return res.status(400).json({ error: "missing" });

  // 🔒 booth bị khoá thì chặn
  if (blockIfBoothLockedById(boothId, uid)) {
    return res.status(403).json({ error: "booth_locked" });
  }

  const users = loadUsers();
  const me = users[uid];
  if (!me || !me.profile)
    return res.status(403).json({ error: "no_auth" });

  const market = loadMarket();
  const booth = market[boothId];

  if (!booth)
    return res.status(404).json({ error: "booth_not_found" });

  if (booth.ownerUid !== uid)
    return res.status(403).json({ error: "not_owner" });

  // ✅ đảm bảo có mảng products
  booth.products ||= [];

const images =
  Array.isArray(product.images) && product.images.length
    ? product.images
    : (product.image ? [product.image] : []);

const newProduct = {
  id: "p_" + Date.now(),
  name: String(product.name || "").trim(),
  price: Number(product.price || 0),

  image: images[0] || "",   // ảnh đại diện
  images: images,           // ✅ LƯU TẤT CẢ ẢNH

  desc: product.desc || "",
  stock: Number(product.stock || 0),
  createdAt: Date.now()
};


  booth.products.unshift(newProduct);

  saveMarket(market);
  emitMarketUpdate("product-add", boothId);

  res.json({
    ok: true,
    product: newProduct
  });
});


// ===== UPDATE PRODUCT =====
app.post("/api/market/product/update", (req, res) => {
  const uid = req.headers["x-uid"];
  const { boothId, productId, product } = req.body || {};

  if (!uid || !boothId || !productId || !product)
    return res.status(400).json({ error: "missing" });

  if (blockIfBoothLockedById(boothId, uid))
    return res.status(403).json({ error: "booth_locked" });

  const market = loadMarket();
  const booth = market[boothId];
  if (!booth) return res.status(404).json({ error: "booth_not_found" });

  if (booth.ownerUid !== uid)
    return res.status(403).json({ error: "not_owner" });

  const p = (booth.products || []).find(x => x.id === productId);
  if (!p) return res.status(404).json({ error: "product_not_found" });

  // ✏️ update fields
  p.name  = String(product.name || p.name).trim();
  p.price = Number(product.price ?? p.price);
  p.desc  = product.desc ?? p.desc;
  p.stock = Number(product.stock ?? p.stock);

  // 🖼️ update gallery nếu có gửi lên
if (Array.isArray(product.images) && product.images.length) {
  p.images = product.images;
  p.image  = product.images[0];
}


  saveMarket(market);
  emitMarketUpdate("product-update", boothId);

  res.json({ ok: true });
});


// ===== BUY PRODUCT =====
// ===== BUY PRODUCT =====
// ===== BUY PRODUCT (FIXED) =====
app.post("/api/market/product/buy", (req, res) => {
  const buyerUid = req.headers["x-uid"];
  const { boothId, productId, buyerInfo } = req.body || {};

  if (!buyerUid || !boothId || !productId || !buyerInfo)
    return res.status(400).json({ error: "missing" });

  const qty = Math.max(1, Number(buyerInfo.qty || 1));

  const users = loadUsers();
  const buyer = users[buyerUid];
  if (!buyer || !buyer.profile)
    return res.status(403).json({ error: "no_auth" });

  const market = loadMarket();

  const booth = market[boothId];
  if (!booth)
    return res.status(404).json({ error: "booth_not_found" });

  // 🔒 BOOTH BỊ KHOÁ → KHÔNG CHO MUA
if (blockIfBoothLockedById(boothId, buyerUid)) {
  return res.status(403).json({
    ok: false,
    error: "booth_locked"
  });
}


  const product = (booth.products || []).find(p => p.id === productId);
  if (!product)
    return res.status(404).json({ error: "product_not_found" });

  if (product.stock < qty)
    return res.json({ ok: false, error: "out_of_stock" });

  const price = Number(product.price || 0);
  const totalPrice = price * qty;
  const buyerCoins = Number(buyer.profile.coins || 0);

  if (buyerCoins < totalPrice)
    return res.json({ ok: false, error: "not_enough_coin" });

  // 💎 TRỪ COIN NGƯỜI MUA
  buyer.profile.coins -= totalPrice;
  buyer.profile.coinSent =
    (buyer.profile.coinSent || 0) + totalPrice;


  // 📦 TRỪ STOCK
  product.stock -= qty;

  // 🧾 LƯU ĐƠN HÀNG
  booth.orders ||= [];
  booth.orders.unshift({
    id: "o_" + Date.now(),
    productId,
    productName: product.name,
    price,
    qty,
    totalPrice,
    buyerUid,
    buyerInfo,
    status: "pending", // pending | contacted | done
    escrow: totalPrice,
    createdAt: Date.now()
  });

  saveUsers(users);
  saveMarket(market);

  emitMarketUpdate("product-buy", boothId);
  emitCoinUpdate(buyerUid);
  emitCoinUpdate(booth.ownerUid);

  // 🔔 INBOX CHO CHỦ SHOP
  if (!userInbox.has(booth.ownerUid))
    userInbox.set(booth.ownerUid, []);

  userInbox.get(booth.ownerUid).unshift({
    type: "market-order",
    boothId,
    text: `🛒 Đơn hàng mới: ${product.name} ×${qty}`,
    time: Date.now(),
    read: false
  });

  saveInbox(Object.fromEntries(userInbox));



// ===============================
// 🔔 REALTIME + PUSH NOTIFY CHỦ GIAN
// ===============================
const notifyText = `🛒 Đơn hàng mới: ${product.name} ×${qty}`;

// 1️⃣ REALTIME NẾU CHỦ GIAN ĐANG ONLINE
const sockets = activeUsers.get(booth.ownerUid);
if (sockets) {
  for (const sid of sockets) {
    io.to(sid).emit("system-notify", {
      type: "market-order",
      boothId,
      productId,
      text: notifyText,
      ts: Date.now()
    });
  }
}

// 2️⃣ PUSH NOTIFICATION (KHI OFFLINE / TAB KHÁC)
sendPushToUser(booth.ownerUid, {
  title: "🛒 Đơn hàng mới",
  body: `${product.name} ×${qty} — ${totalPrice.toLocaleString()} 💎`,
  tag: "market-order"
});



  res.json({ ok: true });



  
});




app.get("/api/me/coin", (req, res) => {
  const uid = req.headers["x-uid"];
  if (!uid) return res.json({ ok:false });

  const users = loadUsers();
  const me = users[uid];
  if (!me || !me.profile) return res.json({ ok:false });

  res.json({
    ok: true,
    coins: Number(me.profile.coins) || 0
  });
});




// ===== DELETE PRODUCT =====
app.post("/api/market/product/delete", (req, res) => {
  const uid = req.headers["x-uid"];
  const { boothId, productId } = req.body || {};

  if (!uid || !boothId || !productId)
    return res.status(400).json({ error: "missing" });

  if (blockIfBoothLockedById(boothId, uid))
    return res.status(403).json({ error: "booth_locked" });

  const market = loadMarket();
  const booth = market[boothId];
  if (!booth) return res.status(404).json({ error: "booth_not_found" });

  if (booth.ownerUid !== uid)
    return res.status(403).json({ error: "not_owner" });

  booth.products = (booth.products || []).filter(p => p.id !== productId);

  saveMarket(market);
  emitMarketUpdate("product-delete", boothId);

  res.json({ ok: true });
});


app.post("/api/market/extend", (req, res) => {
  const uid = req.headers["x-uid"];
  const { boothId, days, price } = req.body || {};

  if (!uid || !boothId || !days || !price)
    return res.status(400).json({ error: "missing" });

  const users = loadUsers();
  const user = users[uid];
  if (!user || !user.profile)
    return res.status(403).json({ error: "no_auth" });

  if ((user.profile.coins || 0) < price)
    return res.status(400).json({ error: "not_enough_coin" });

  const market = loadMarket();
  const booth = market[boothId];

  if (!booth)
    return res.status(404).json({ error: "booth_not_found" });

  if (booth.ownerUid !== uid)
    return res.status(403).json({ error: "not_owner" });

// 🔒 BOOTH BỊ KHOÁ → KHÔNG CHO GIA HẠN
if (blockIfBoothLockedById(boothId, uid)) {
  return res.status(403).json({ error: "booth_locked" });
}


  
  // ➕ GIA HẠN
  booth.expireAt = Math.max(booth.expireAt, Date.now())
    + days * 24 * 60 * 60 * 1000;

  // ➖ TRỪ COIN
  user.profile.coins -= price;
  user.profile.coinSent = (user.profile.coinSent || 0) + price;

  saveUsers(users);
  saveMarket(market);
  emitCoinUpdate(uid);
  emitMarketUpdate("extend", boothId);

  res.json({
    ok: true,
    expireAt: booth.expireAt,
    coins: user.profile.coins
  });
});



app.get("/api/market/booth/:id", (req, res) => {
  const boothId = req.params.id;
  const uid = req.headers["x-uid"];

  const users = loadUsers();
  const me = uid ? users[uid] : null;
  const isAdmin = me?.role === "admin";

  const market = loadMarket();
  const booth = market[boothId];

  if (!booth) {
    return res.status(404).json({
      ok: false,
      message: "Gian hàng không tồn tại"
    });
  }

  // 🔒 Booth bị khoá
  if (booth.locked && !isAdmin) {
    return res.status(403).json({
      ok: false,
      locked: true,
      message: "Gian hàng này đang bị Admin khoá"
    });
  }

// 🔧 đảm bảo product nào cũng có images[]
(booth.products || []).forEach(p=>{
  if (!Array.isArray(p.images) || p.images.length === 0) {
    p.images = p.image ? [p.image] : [];
  }
});

res.json({
  ok: true,
  booth
});

});




app.post("/api/admin/market/lock", (req,res)=>{
  const uid = req.headers["x-uid"];
  const { boothId, lock } = req.body || {};

  const users = loadUsers();
  if(!users[uid] || users[uid].role !== "admin")
    return res.status(403).json({ error:"no_permission" });

  const market = loadMarket();
  if(!market[boothId])
    return res.status(404).json({ error:"not_found" });


  market[boothId].locked = !!lock;
  saveMarket(market);

  emitMarketUpdate(lock ? "lock" : "unlock", boothId); // 🔥 REALTIME


// 🚨 KICK REALTIME TOÀN BỘ USER ĐANG TRONG BOOTH
io.emit("booth-force-locked", {
  boothId,
  locked: !!lock,
  ts: Date.now()
});




// 🔔 NOTIFY CHỦ GIAN
const booth = market[boothId];
const ownerUid = booth.ownerUid;

if (ownerUid) {
  const msg = lock
    ? `🔒 Gian hàng #${boothId} của bạn đã bị Admin khoá`
    : `🔓 Gian hàng #${boothId} của bạn đã được Admin mở khoá`;

  // 1️⃣ LƯU INBOX (offline vẫn thấy)
  if (!userInbox.has(ownerUid)) userInbox.set(ownerUid, []);
  userInbox.get(ownerUid).unshift({
    type: "market-booth",
    boothId,
    action: lock ? "lock" : "unlock",
    text: msg,
    time: Date.now(),
    read: false
  });
  saveInbox(Object.fromEntries(userInbox));

  // 2️⃣ REALTIME NẾU ONLINE
  const sockets = activeUsers.get(ownerUid);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("system-notify", {
        type: "market-booth",
        boothId,
        action: lock ? "lock" : "unlock",
        text: msg
      });
    }
  }

  // 3️⃣ PUSH NOTIFICATION (KHI OFFLINE)
  sendPushToUser(ownerUid, {
    title: lock ? "🔒 Gian hàng bị khoá" : "🔓 Gian hàng được mở khoá",
    body: msg,
    tag: "market-booth"
  });
}






  res.json({ ok:true });


});


app.post("/api/admin/market/revoke", (req,res)=>{
  const uid = req.headers["x-uid"];
  const { boothId } = req.body || {};

  const users = loadUsers();
  if(!users[uid] || users[uid].role !== "admin")
    return res.status(403).json({ error:"no_permission" });

  const market = loadMarket();
  if(!market[boothId])
    return res.status(404).json({ error:"not_found" });

market[boothId] = null;
saveMarket(market);

emitMarketUpdate("revoke", boothId); // 🔥 REALTIME

res.json({ ok:true });


});



app.post("/api/market/rent", (req,res)=>{
  const uid = req.headers["x-uid"];
  const { boothId, days, price, trial } = req.body || {};

  if(!uid || !boothId || !days)
    return res.status(400).json({ error:"missing" });

  const db = loadUsers();
  const user = db[uid];
  if(!user || !user.profile)
    return res.status(403).json({ error:"no_auth" });

  const market = loadMarket();

  // 🔒 MỖI USER CHỈ ĐƯỢC 1 GIAN
  const alreadyHaveBooth = Object.values(market).some(
    b => b && b.ownerUid === uid
  );
  if (alreadyHaveBooth) {
    return res.status(400).json({ error: "already_have_booth" });
  }

  if(market[boothId])
    return res.status(400).json({ error:"already_rented" });

  // =================================================
  // 🎁 TRIAL MODE – DÙNG THỬ MIỄN PHÍ 30 NGÀY
  // =================================================
  if(trial === true){

    if(user.profile.hasUsedTrial){
      return res.status(400).json({ error:"trial_used" });
    }

    market[boothId] = {
      boothId,
      ownerUid: uid,
      name: user.profile.name,
      logo: user.profile.avatar,
      expireAt: Date.now() + 30*24*60*60*1000,
      locked: false,
      trial: true,
      products: []
    };

    user.profile.hasUsedTrial = true;

    saveUsers(db);
    saveMarket(market);

    emitMarketUpdate("rent", boothId);

    return res.json({
      ok: true,
      trial: true,
      booth: market[boothId]
    });
  }

  // =================================================
  // 💎 RENT THƯỜNG – TRỪ COIN
  // =================================================
  const cost = Number(price || 0);
  const coins = Number(user.profile.coins || 0);

  if(cost <= 0)
    return res.status(400).json({ error:"invalid_price" });

  if(coins < cost)
    return res.status(400).json({ error:"not_enough_coin" });

  // ➖ TRỪ COIN
  user.profile.coins -= cost;
  user.profile.coinSent = (user.profile.coinSent || 0) + cost;

  market[boothId] = {
    boothId,
    ownerUid: uid,
    name: user.profile.name,
    logo: user.profile.avatar,
    expireAt: Date.now() + days*24*60*60*1000,
    locked: false,
    products: []
  };

  saveUsers(db);
  saveMarket(market);

  emitCoinUpdate(uid);
  emitMarketUpdate("rent", boothId);

  res.json({
    ok:true,
    booth: market[boothId],
    coins: user.profile.coins
  });
});




// ===== ADMIN DELETE COMMENT / REPLY =====
app.post("/api/admin/delete-comment", (req, res) => {
  const { adminUid, postId, commentId, replyId, reason } = req.body || {};

  if (!adminUid || !postId || !commentId) {
    return res.status(400).json({ error: "missing" });
  }

  const db = loadUsers();
  const admin = db[adminUid];

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ error: "not_admin" });
  }

  const post = lpPosts.find(p => p.id === postId);
  if (!post || !Array.isArray(post.comments)) {
    return res.status(404).json({ error: "post_not_found" });
  }

  const cmt = post.comments.find(c => c.id === commentId);
  if (!cmt) {
    return res.status(404).json({ error: "comment_not_found" });
  }

  // 🔹 XOÁ REPLY
  if (replyId) {
    const idx = (cmt.replies || []).findIndex(r => r.id === replyId);
    if (idx === -1) {
      return res.status(404).json({ error: "reply_not_found" });
    }

    const reply = cmt.replies[idx];
    cmt.replies.splice(idx, 1);

    saveSocial();

    // 🔔 inbox user bị xoá reply
    if (reply.uid) {
      userInbox.set(reply.uid, userInbox.get(reply.uid) || []);
      userInbox.get(reply.uid).unshift({
        type: "reply-deleted",
        text: `🗑️ Reply của bạn đã bị Admin xoá${reason ? `\nLý do: ${reason}` : ""}`,
        time: Date.now(),
        read: false
      });
      saveInbox(Object.fromEntries(userInbox));
    }

    io.emit("social-update", {
      type: "reply-deleted",
      postId,
      commentId,
      replyId
    });

    return res.json({ ok: true });
  }

  // 🔸 XOÁ COMMENT
  const idx = post.comments.findIndex(c => c.id === commentId);
  const removed = post.comments[idx];
  post.comments.splice(idx, 1);
  saveSocial();

  // 🔔 inbox user bị xoá comment
  if (removed.uid) {
    userInbox.set(removed.uid, userInbox.get(removed.uid) || []);
    userInbox.get(removed.uid).unshift({
      type: "comment-deleted",
      text: `🗑️ Comment của bạn đã bị Admin xoá${reason ? `\nLý do: ${reason}` : ""}`,
      time: Date.now(),
      read: false
    });
    saveInbox(Object.fromEntries(userInbox));
  }

  io.emit("social-update", {
    type: "comment-deleted",
    postId,
    commentId
  });

  res.json({ ok: true });
});


// ===== ADMIN DELETE POST =====
app.post("/api/admin/delete-post", (req, res) => {
  const { adminUid, postId, reason } = req.body || {};

  if (!adminUid || !postId) {
    return res.status(400).json({ error: "missing" });
  }

  const db = loadUsers();
  const admin = db[adminUid];

  // 🔒 chỉ admin
  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ error: "not_admin" });
  }

  const idx = lpPosts.findIndex(p => p.id === postId);
  if (idx === -1) {
    return res.status(404).json({ error: "post_not_found" });
  }

  const post = lpPosts[idx];

  // 🧾 log admin action (nên có)
  post.adminDeleted = {
    by: adminUid,
    reason: reason || "",
    ts: Date.now()
  };

  // ❌ xoá khỏi danh sách hiển thị
  lpPosts.splice(idx, 1);
  saveSocial();

  // 🔔 thông báo cho chủ bài đăng (nếu còn tồn tại)
  const ownerUid = post.uid;
  if (ownerUid) {
    if (!userInbox.has(ownerUid)) userInbox.set(ownerUid, []);
    userInbox.get(ownerUid).unshift({
      type: "post-deleted",
      text: `🗑️ Bài đăng của bạn đã bị Admin xoá${reason ? `\nLý do: ${reason}` : ""}`,
      time: Date.now(),
      read: false
    });
    saveInbox(Object.fromEntries(userInbox));
  }

  // 🔁 realtime cập nhật feed
  io.emit("social-update", { type: "post-deleted", postId });

  res.json({ ok: true });
});


app.post("/api/admin/close-room", (req, res) => {
  const { adminUid, roomId, reason } = req.body || {};

  if(!adminUid || !roomId){
    return res.status(400).json({ error: "missing" });
  }

  const db = loadUsers();
  const admin = db[adminUid];

  if(!admin || admin.role !== "admin"){
    return res.status(403).json({ error: "not_admin" });
  }

  const rid = String(roomId).trim().toLowerCase();
  const room = rooms.get(rid);

  if(!room || !room.broadcasterId){
    return res.status(404).json({ error: "room_not_live" });
  }

  // 🚨 ĐÓNG ROOM
  closeRoom(rid, "admin_closed");

  // 🔔 notify host nếu có
  if(room.hostProfile?.uid){
    const uid = room.hostProfile.uid;

    // realtime
    const sockets = activeUsers.get(uid);
    if(sockets){
      for(const sid of sockets){
        io.to(sid).emit("system-notify", {
          type: "room-closed",
          text: "🚫 Phòng live của bạn đã bị Admin đóng"
        });
      }
    }

    // push offline
    sendPushToUser(uid, {
      title: "🚫 Phòng live bị đóng",
      body: reason || "Phòng live của bạn đã bị Admin đóng",
      tag: "admin-close-room"
    });
  }

  res.json({ ok:true });
});



// ===== ADMIN LOCK / UNLOCK USER =====
app.post("/api/admin/lock-user", (req, res) => {

const body = req.body || {};
const { adminUid, targetUid, lock, reason } = body;




  if (!adminUid || !targetUid) {
    return res.status(400).json({ error: "missing" });
  }

  const db = loadUsers();
  const admin = db[adminUid];
  const user = db[targetUid];

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ error: "not_admin" });
  }

  if (!user || !user.profile) {
    return res.status(404).json({ error: "user_not_found" });
  }

  // 🚫 KHÔNG CHO KHOÁ ADMIN
if (user.role === "admin" || targetUid === adminUid) {
  return res.status(403).json({ error: "cannot_lock_admin" });
}


  user.profile.accountBlocked = !!lock;

  user.profile.blockedAt = lock ? Date.now() : null;

// 🧾 LOG LÝ DO KHOÁ / MỞ KHOÁ
user.profile.blockLogs ||= [];
user.profile.blockLogs.unshift({
  by: adminUid,
  action: lock ? "lock" : "unlock",
  reason: reason || "",
  ts: Date.now()
});




  saveUsers(db);

// 🔔 PUSH NOTIFY KHI KHOÁ USER
if (lock) {
  const msg = reason
  ? `🚫 Tài khoản của bạn đã bị khoá.\nLý do: ${reason}`
  : "🚫 Tài khoản của bạn đã bị khoá. Vui lòng liên hệ hỗ trợ.";

  // 1️⃣ realtime nếu online
  const sockets = activeUsers.get(targetUid);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("system-notify", {
        type: "blocked",
        text: msg
      });
    }
  }

  // 2️⃣ push notification (offline)
  sendPushToUser(targetUid, {
    title: "Tài khoản bị khoá 🚫",
    body: msg,
    tag: "account-blocked"
  });
}


// 🔓 PUSH NOTIFY KHI MỞ KHOÁ USER
if (!lock) {
 const msg = reason
  ? `🔓 Tài khoản của bạn đã được mở khoá.\nGhi chú: ${reason}`
  : "🔓 Tài khoản của bạn đã được mở khoá. Bạn có thể sử dụng lại dịch vụ.";

  // 1️⃣ realtime nếu online
  const sockets = activeUsers.get(targetUid);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("system-notify", {
        type: "unblocked",
        text: msg
      });
    }
  }

  // 2️⃣ push notification (offline)
  sendPushToUser(targetUid, {
    title: "Tài khoản đã được mở khoá 🔓",
    body: msg,
    tag: "account-unblocked"
  });
}



  res.json({
    ok: true,
    uid: targetUid,
    blocked: user.profile.blocked
  });
});




app.post("/api/upload-chat-image", chatUpload.single("image"), async (req, res) => {

  if (!req.file) return res.status(400).json({ error: "No file" });

const safeName = req.file.originalname
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt
  .replace(/[^a-zA-Z0-9._-]/g, "_");


const key = `chat/images/${Date.now()}_${safeName}`;


  const url = await uploadToR2(
    req.file.buffer,
    key,
    req.file.mimetype
  );

  res.json({ url });
});

app.post("/api/upload-chat-video", chatUpload.single("video"), async (req, res) => {

  if (!req.file) return res.status(400).json({ error: "No file" });

const safeName = req.file.originalname
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt
  .replace(/[^a-zA-Z0-9._-]/g, "_");


const key = `chat/videos/${Date.now()}_${safeName}`;

  const url = await uploadToR2(
    req.file.buffer,
    key,
    req.file.mimetype
  );

  res.json({ url });
});

app.get("/", (_, res) => {
  res.redirect("/social.html");
});



app.post("/api/upload-avatar", avatarCoverUpload.single("avatar"), async (req, res) => {

    if (!req.file) return res.status(400).json({ error: "No file" });

    const safeName = req.file.originalname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    const uid = req.headers["x-uid"] || "guest";

    const key = `avatars/${uid}_${Date.now()}_${safeName}`;

    const url = await uploadToR2(
      req.file.buffer,
      key,
      req.file.mimetype
    );

    res.json({ url });
  }
);

app.post("/api/upload-cover", avatarCoverUpload.single("cover"), async (req, res) => {

    if (!req.file) return res.status(400).json({ error: "No file" });

    const safeName = req.file.originalname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    const uid = req.headers["x-uid"] || "guest";

    const key = `covers/${uid}_${Date.now()}_${safeName}`;

    const url = await uploadToR2(
      req.file.buffer,
      key,
      req.file.mimetype
    );

    res.json({ url });
  }
);

app.post("/api/upload-post-image",
  postMediaUpload.single("image"),
  async (req, res) => {

  if (!req.file) return res.status(400).json({ error: "No file" });

  const safeName = req.file.originalname
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  const key = `posts/images/${Date.now()}_${safeName}`;

  const url = await uploadToR2(
    req.file.buffer,
    key,
    req.file.mimetype
  );

  res.json({ url });
});

app.post("/api/upload-post-video",
  postMediaUpload.single("video"),
  async (req, res) => {

  if (!req.file) return res.status(400).json({ error: "No file" });

  const safeName = req.file.originalname
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  const key = `posts/videos/${Date.now()}_${safeName}`;

  const url = await uploadToR2(
    req.file.buffer,
    key,
    req.file.mimetype
  );

  res.json({ url });
});

app.post("/api/withdraw-request", async (req, res) => {
  const uid = req.headers["x-uid"];
  const { amount, bank, securityCode } = req.body || {};


  if (!securityCode) {
  return res.status(400).json({
    error: "missing_security_code"
  });
}


if (!uid || !bank || amount == null) {
  return res.status(400).json({ error: "missing" });
}

const amt = Number(amount);
if (!Number.isFinite(amt) || amt <= 0) {
  return res.status(400).json({ error: "invalid_amount" });
}


  const db = loadUsers();


  const user = db[uid];

  if (!user || !user.profile) {
    return res.status(404).json({ error: "user_not_found" });
  }


// 🔐 KIỂM TRA MÃ BẢO MẬT
const okSec = await bcrypt.compare(
  String(securityCode),
  user.securityCode
);

if (!okSec) {
  return res.status(403).json({
    error: "invalid_security_code"
  });
}



  const canWithdraw = Number(user.profile.coinReceived || 0);

  if (amount > canWithdraw) {
    return res.status(400).json({ error: "not_enough_received" });
  }

  if (amount < 100) {
  return res.status(400).json({ error: "min_withdraw" });
}


  const list = loadWithdraws();



// ➖ TRỪ KIM CƯƠNG NGAY KHI GỬI
user.profile.coinReceived -= amt;
user.profile.coins = Math.max(0, (user.profile.coins || 0) - amt);

// 🧾 LOG (rất nên có)
user.profile.withdrawHold ||= [];
user.profile.withdrawHold.unshift({
  amount: amt,
  ts: Date.now(),
  status: "pending"
});

list.unshift({
  id: Date.now() + "_" + uid,
  uid,
  name: user.profile.name,
  amount: amt,
  bank,
  status: "pending",
  createdAt: Date.now()
});

saveUsers(db);          // 🔥 LƯU USER NGAY
saveWithdraws(list);
emitWithdrawUpdate();
emitCoinUpdate(uid);    // 🔁 realtime coin


  // 🔔 thông báo cho user
  const text = `📤 Đã gửi yêu cầu rút ${Number(amount).toLocaleString()} 💎`;

  if (!userInbox.has(uid)) userInbox.set(uid, []);
  userInbox.get(uid).unshift({
    type: "withdraw-request",
    text,
    time: Date.now(),
    read: false
  });
  saveInbox(Object.fromEntries(userInbox));

  res.json({ ok: true });
});

app.get("/api/admin/withdraw-requests", (req, res) => {
  const adminUid = req.headers["x-uid"];
  if (!adminUid) return res.status(403).json({ error: "no_auth" });

  const db = loadUsers();
  const admin = db[adminUid];
  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ error: "not_admin" });
  }

  const list = loadWithdraws();
  res.json({ ok: true, list });
});

app.post("/api/admin/withdraw-action", (req, res) => {
  const { adminUid, withdrawId, id, action, note } = req.body || {};
  const wid = withdrawId || id;

  // 🔍 validate
  if (!adminUid || !wid || !action) {
    return res.status(400).json({ error: "missing" });
  }

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "invalid_action" });
  }

  const db = loadUsers();
  const admin = db[adminUid];
  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ error: "not_admin" });
  }

  const list = loadWithdraws();
  const reqItem = list.find(x => x.id === wid);
  if (!reqItem) {
    return res.status(404).json({ error: "not_found" });
  }

  if (reqItem.status !== "pending") {
    return res.status(400).json({ error: "already_processed" });
  }

  const user = db[reqItem.uid];
  if (!user?.profile) {
    return res.status(404).json({ error: "user_not_found" });
  }

  const amount = Number(reqItem.amount) || 0;

  // =========================
  // ❌ REJECT → HOÀN LẠI
  // =========================
  if (action === "reject") {
    reqItem.status = "rejected";
    reqItem.note = note || "";
    reqItem.handledBy = adminUid;
    reqItem.handledAt = Date.now();

    // hoàn lại đúng những gì đã hold
    user.profile.coins = (user.profile.coins || 0) + amount;
    user.profile.coinReceived =
      (user.profile.coinReceived || 0) + amount;

    saveUsers(db);
    saveWithdraws(list);

    emitCoinUpdate(reqItem.uid);
    io.emit("withdraw-update", { id: wid, action });

    return res.json({ ok: true });
  }

  // =========================
  // ✅ APPROVE → CHỈ ĐỔI STATUS
  // =========================
  reqItem.status = "approved";
  reqItem.note = note || "";
  reqItem.handledBy = adminUid;
  reqItem.handledAt = Date.now();

  saveUsers(db);
  saveWithdraws(list);

  emitCoinUpdate(reqItem.uid);
  io.emit("withdraw-update", { id: wid, action });

  return res.json({ ok: true });
});


app.post("/api/profile/bank-default", (req, res) => {
  const uid = req.headers["x-uid"];
  const { name, account, owner } = req.body || {};

  if (!uid || !name || !account || !owner) {
    return res.status(400).json({ error: "missing" });
  }

  const db = loadUsers();
  const user = db[uid];
  if (!user || !user.profile) {
    return res.status(404).json({ error: "user_not_found" });
  }

  user.profile.bankDefault = {
    name,
    account,
    owner
  };

  saveUsers(db);
  res.json({ ok: true });
});

app.get("/api/profile/bank-default", (req, res) => {
  const uid = req.headers["x-uid"];
  if (!uid) return res.status(403).json({ error: "no_auth" });

  const db = loadUsers();
  const user = db[uid];
  if (!user || !user.profile) {
    return res.json({ ok: true, bank: null });
  }

  res.json({
    ok: true,
    bank: user.profile.bankDefault || null
  });
});


const rooms = new Map();

// ===== LIVESTREAM PRO SOCIAL =====
const lpPosts = loadSocial();



// 🔴🟢 EMIT REALTIME ONLINE / OFFLINE ĐẠI LÝ
function emitAgentStatus(uid, online) {
  if (!uid) return;

  const db = loadUsers();
  const acc = db[uid];
  if (!acc) return;

  const roles = acc.roles || [];
const role  = acc.role;

const isAgent =
  role === "agent" ||
  roles.includes("agent");

if (!isAgent) return;


  io.emit("agent-status", {
    uid,
    online,
    ts: Date.now()
  });
}



function getPost(id){
  return lpPosts.find(p=>p.id===id);
}


function getActiveUserList(){
  const list = [];

for (const [uid, sockets] of activeUsers.entries()) {
  for (const socketId of sockets) {
    const s = io.sockets.sockets.get(socketId);
    if (!s) continue;


    
    if(!s) continue;

    const profile = s.data.profile || {};

    const displayName =
      profile.name ||
      profile.displayName ||
      "Người chơi";

    list.push({
      socketId,
      uid,   
      name: displayName,  
         
avatar:
  normalizeAvatar(profile.avatar) ||
  "https://api.dicebear.com/7.x/thumbs/svg?seed=" +
  encodeURIComponent(displayName),


      level: Number(profile.level || 1),
      role: s.data.role || "user",
      roomId: s.data.roomId || null
    });
  }
}
  return list;
}




function emitActiveUsers(){
  io.emit("active-users", {
    users: getActiveUserList(),
    online: Array.from(activeUsers.keys()),
    ts: Date.now()
  });
}


function emitAllUsers(){
  const db = loadUsers();
  const list = [];

  for(const uid in db){
    const acc = db[uid];
    const p = acc.profile || {};

    list.push({
      uid,
      name: p.name || uid,
      avatar: normalizeAvatar(p.avatar) || "",
      cover: p.cover || "",
      level: p.level || 1,
      role: acc.role || "user" ,  // 🔥 QUAN TRỌNG
      roles: acc.roles || []   // 🔥 THÊM DÒNG NÀY
    });
  }

  io.emit("all-users", list);
}




function pushNotify(uid, payload){
  if(!uid) return;
  if(!userInbox.has(uid)) userInbox.set(uid, []);
  userInbox.get(uid).unshift({
    ...payload,
    ts: Date.now(),
    read:false
  });
}



const USERS_FILE = path.join("/opt/render/project/data", "users.json");



function loadUsers(){
  if(!fs.existsSync(USERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(USERS_FILE,"utf8"));
}
function saveUsers(db){
  fs.writeFileSync(USERS_FILE, JSON.stringify(db,null,2));
}


function emitWithdrawUpdate() {
  io.emit("withdraw-update", {
    ts: Date.now()
  });
}



function emitMarketUpdate(action, boothId){
  io.emit("market-update", {
    action,      // "lock" | "unlock" | "revoke" | "rent" | "extend"
    boothId,
    ts: Date.now()
  });
}




// 🔥 REALTIME COIN SYNC
function emitCoinUpdate(uid) {
  if (!uid) return;

  const db = loadUsers();
  const user = db[uid];
  if (!user || !user.profile) return;

  const payload = {
    coins: user.profile.coins || 0,
    coinSent: user.profile.coinSent || 0,
    coinReceived: user.profile.coinReceived || 0,
    level: user.profile.level || 1,
    exp: user.profile.exp || 0
  };

  const sockets = activeUsers.get(uid);
  if (!sockets) return;

  for (const sid of sockets) {
    io.to(sid).emit("coin-update", payload);
  }
}





webpush.setVapidDetails(
  "mailto:admin@livestream.pro",
  process.env.VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
);

// uid -> Set<subscription>
const pushSubs = new Map();



// ===== ADMIN TOPUP COIN =====
app.post("/api/admin/topup", (req, res) => {
  const { adminUid, targetUid, amount, note } = req.body;

  if (!adminUid || !targetUid || !amount) {
    return res.status(400).json({ error: "missing" });
  }

  const db = loadUsers();
  const admin = db[adminUid];
  const user  = db[targetUid];

  // 🔐 check admin
  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ error: "not_admin" });
  }

  if (!user || !user.profile) {
    return res.status(404).json({ error: "user_not_found" });
  }

  const add = Math.max(0, Number(amount) || 0);

  user.profile.coins = (user.profile.coins || 0) + add;

  // 🧾 log (optional nhưng nên có)
  user.profile.adminLogs ||= [];
  user.profile.adminLogs.unshift({
    type: "topup",
    by: adminUid,
    amount: add,
    note: note || "",
    ts: Date.now()
  });

  saveUsers(db);

  // 🔁 realtime sync
  emitCoinUpdate(targetUid);


// 🔔 THÔNG BÁO USER KHI ĐƯỢC NẠP COIN
const notifyText =
  `💰 Bạn vừa được nạp ${add.toLocaleString()} coin` +
  (note ? `\n📝 Ghi chú: ${note}` : "");

// 1️⃣ LƯU INBOX (xem lại được)
if (!userInbox.has(targetUid)) userInbox.set(targetUid, []);
userInbox.get(targetUid).unshift({
  type: "topup",
  from: adminUid,
  text: notifyText,
  amount: add,
  time: Date.now(),
  read: false
});
saveInbox(Object.fromEntries(userInbox));

// 2️⃣ REALTIME NẾU USER ĐANG ONLINE
const sockets = activeUsers.get(targetUid);
if (sockets) {
  for (const sid of sockets) {
    io.to(sid).emit("system-notify", {
      type: "topup",
      text: notifyText,
      amount: add
    });
  }
}

// 3️⃣ PUSH NOTIFICATION (KHI OFFLINE)
sendPushToUser(targetUid, {
  title: "💰 Nạp coin thành công",
  body: `Bạn vừa được nạp ${add.toLocaleString()} coin`,
  tag: "admin-topup"
});



  res.json({
    ok: true,
    uid: targetUid,
    coins: user.profile.coins
  });
});

// ===== ADMIN WITHDRAW COIN =====
app.post("/api/admin/withdraw", (req, res) => {
  const { adminUid, targetUid, amount, note } = req.body || {};

  if (!adminUid || !targetUid || !amount) {
    return res.status(400).json({ error: "missing" });
  }

  const db = loadUsers();
  const admin = db[adminUid];
  const user  = db[targetUid];

  // 🔐 chỉ admin
  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ error: "not_admin" });
  }

  if (!user || !user.profile) {
    return res.status(404).json({ error: "user_not_found" });
  }

  const sub = Math.max(0, Number(amount) || 0);
  const cur = Number(user.profile.coins || 0);

  if (sub <= 0) {
    return res.status(400).json({ error: "invalid_amount" });
  }

  if (cur < sub) {
    return res.status(400).json({ error: "not_enough_coin" });
  }

  // ➖ TRỪ COIN
  user.profile.coins = cur - sub;

  // 🧾 LOG ADMIN
  user.profile.adminLogs ||= [];
  user.profile.adminLogs.unshift({
    type: "withdraw",
    by: adminUid,
    amount: sub,
    note: note || "",
    before: cur,
    after: user.profile.coins,
    ts: Date.now()
  });

  saveUsers(db);

  // 🔁 realtime sync
  emitCoinUpdate(targetUid);

  const notifyText =
    `➖ ${sub.toLocaleString()} coin đã bị trừ` +
    (note ? `\n📝 Lý do: ${note}` : "");

  // 1️⃣ inbox
  if (!userInbox.has(targetUid)) userInbox.set(targetUid, []);
  userInbox.get(targetUid).unshift({
    type: "withdraw",
    from: adminUid,
    text: notifyText,
    amount: sub,
    time: Date.now(),
    read: false
  });
  saveInbox(Object.fromEntries(userInbox));

  // 2️⃣ realtime nếu online
  const sockets = activeUsers.get(targetUid);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("system-notify", {
        type: "withdraw",
        text: notifyText,
        amount: sub
      });
    }
  }

  // 3️⃣ push offline
  sendPushToUser(targetUid, {
    title: "➖ Bị trừ coin",
    body: `Tài khoản của bạn bị trừ ${sub.toLocaleString()} coin`,
    tag: "admin-withdraw"
  });

  res.json({
    ok: true,
    uid: targetUid,
    coins: user.profile.coins
  });
});



app.post("/api/register", async (req,res)=>{

  const { username, password, name, securityCode } = req.body;

  if(!username || !password || !name || !securityCode)
    return res.json({ error:"missing" });

  const db = loadUsers();
  if(db[username]) return res.json({error:"exists"});

  const hash = await bcrypt.hash(password,10);
  const secHash = await bcrypt.hash(securityCode,10);

  db[username] = {
    password: hash,
    securityCode: secHash, 
    profile:{
      uid: username,
      name,
      avatar: "https://i.ibb.co/ZR2yR7dJ/Chat-GPT-Image-Jan-12-2026-02-44-07-AM.jpg",
      bio: "",  
      coins:0,
      level:1,
      exp:0,
      coinSent:0,
      coinReceived:0
    }
  };

  saveUsers(db);
  res.json({ok:true});
});


app.post("/api/prelogin", async (req,res)=>{
  const { username, password } = req.body;
  const db = loadUsers();

  const acc = db[username];
  if(!acc) return res.json({ ok:false });

  const ok = await bcrypt.compare(String(password), acc.password);
  if(!ok) return res.json({ ok:false });

  // Đúng user + pass → cho phép nhập mã bảo mật
  res.json({ ok:true });
});



app.post("/api/login", async (req,res)=>{
  const { username, password, securityCode } = req.body;
  const db = loadUsers();

  const acc = db[username];

  // 🚫 USER BỊ KHOÁ → KHÔNG CHO LOGIN
if (acc.profile?.accountBlocked) {

  return res.status(403).json({
    error: "blocked",
    message: "Tài khoản của bạn đã bị khoá"
  });
}


  if(!acc) return res.json({ error:"invalid" });

 const okPass = await bcrypt.compare(String(password), acc.password);

let okSec;
if (securityCode === "__TRUSTED__") {
  okSec = true;            // ✅ bypass khi máy đã trusted
} else {
  okSec = await bcrypt.compare(String(securityCode), acc.securityCode);
}


  if(!okPass || !okSec){
    return res.json({ error:"invalid" });
  }

  const trusted = crypto.randomBytes(24).toString("hex");

acc.trusted = acc.trusted || {};
acc.trusted[trusted] = Date.now() + 30*24*60*60*1000; // 30 ngày

saveUsers(db);

res.json({
  ok:true,
  profile: {
    ...acc.profile,
    role: acc.role || "user" ,  // 🔥 THÊM
    roles: acc.roles || []     // 🔥 THÊM DÒNG NÀY
  },
  trustedToken: trusted
});


});

app.post("/api/check-trusted", (req,res)=>{
  const { username, trustedToken } = req.body;
  const db = loadUsers();
  const acc = db[username];



  if(!acc || !acc.trusted) return res.json({ ok:false });

  const exp = acc.trusted[trustedToken];
  if(!exp || exp < Date.now()){
    delete acc.trusted[trustedToken];
    saveUsers(db);
    return res.json({ ok:false });
  }

  res.json({ ok:true });
});



app.get("/api/me/:uid", (req, res) => {
  const targetUid = req.params.uid;
  const viewerUid = req.headers["x-uid"]; // uid người đang xem

  const db = loadUsers();
  const target = db[targetUid];
  if (!target || !target.profile) {
    return res.status(404).json({ error: "User not found" });
  }

  // 🚫 BLOCK CHECK (2 CHIỀU)
  if (viewerUid && db[viewerUid]) {
    const me = db[viewerUid].profile;
    const you = target.profile;

const blockedByMe =
  (me.blockedUsers || []).includes(targetUid);
const blockedByYou =
  (you.blockedUsers || []).includes(viewerUid);


    if (blockedByMe || blockedByYou) {
      return res.status(403).json({
        error: "blocked"
      });
    }
  }

  res.json({
    profile: target.profile
  });
});




// ===== API: DANH SÁCH ĐẠI LÝ NẠP COIN =====
app.get("/api/topup-agents", (req, res) => {
  const db = loadUsers();
  const list = [];

  for (const uid in db) {
    const acc = db[uid];

const roles = acc.roles || [];
const role  = acc.role;

if (
  !roles.includes("agent") &&
  role !== "agent"
) continue;



    const p = acc.profile || {};
    const bank = p.bank || {};

    list.push({
      uid,
      name: p.name || uid,
      avatar: normalizeAvatar(p.avatar) ||
        "https://api.dicebear.com/7.x/thumbs/svg?seed=" + uid,
      bank: bank.name || "",
      account: bank.account || "",
      owner: bank.owner || "",
      qr: bank.qr || "",
      online: activeUsers.has(uid)

    });
  }

  res.json({
    ok: true,
    agents: list
  });
});




app.get("/api/all-users", (req,res)=>{
  const db = loadUsers();
  const list = [];

  for(const uid in db){
    const p = db[uid].profile || {};
    list.push({
      uid,
      name: p.name || uid,
      avatar: p.avatar || "https://api.dicebear.com/7.x/thumbs/svg?seed=" + uid,
      cover: p.cover || "",
      bio: p.bio || "",
      level: p.level || 1,
      role: db[uid].role || "user",
      verified: !!p.verified   // ⭐ thêm
    });
  }

  res.json(list);
});



 // ===== RESET / CHANGE PASSWORD =====

app.post("/api/change-password", async (req,res)=>{
  const { username, securityCode, newPassword } = req.body;
  if(!username || !securityCode || !newPassword)
    return res.json({ error:"missing" });

  const db = loadUsers();

  const acc = db[username];
if(!acc) return res.json({ error:"notfound" });

const ok = await bcrypt.compare(String(securityCode), acc.securityCode);
if(!ok) return res.json({ error:"invalid" });

acc.password = await bcrypt.hash(String(newPassword), 10);

  saveUsers(db);

  res.json({ ok:true });
});


app.post("/api/push-subscribe", (req, res) => {
  const { uid, sub } = req.body;
  if (!uid || !sub) return res.sendStatus(400);

  if (!pushSubs.has(uid)) pushSubs.set(uid, []);
  const arr = pushSubs.get(uid);

  // tránh trùng endpoint
  if (!arr.find(s => s.endpoint === sub.endpoint)) {
    arr.push(sub);
  }

  res.json({ ok: true });
});




// ♻️ RESTORE LIVE ROOMS AFTER SERVER RESTART
const persisted = loadLiveState();

for (const roomId in persisted) {
  const data = persisted[roomId];

rooms.set(roomId, {
  broadcasterId: null,
  viewers: new Set(),
  viewerProfiles: new Map(),
  liveStartTs: null,
  pinnedNote: null,
  hostProfile: null,
  giftTotal: 0,
  giftByUser: new Map(),
  releaseTimer: null,
  pendingRelease: false,
  streamReady: false // ✅ THÊM
});


}

console.log("♻️ Restored live rooms:", Object.keys(persisted));






// ===== GIFT ENGINE (coins) =====
const GIFT_CATALOG = {
  heart:  { emoji: "❤️", cost: 50,  title: "Tim" },
  flower: { emoji: "🌸", cost: 100,  title: "Hoa" },
  rocket: { emoji: "🚀", cost: 200, title: "Rocket" },
  coin:   { emoji: "💰", cost: 500, title: "Túi tiền" },
  king:   { emoji: "👑", cost: 1000, title: "Vương miện" },
  galaxy: { emoji: "🌌", cost: 2000, title: "Dải ngân hà" },
  meteor: { emoji: "☄️", cost: 5000, title: "Sao băng" },
  dragon: { emoji: "🐉", cost: 10000, title: "Rồng" },
  phoenix:{ emoji: "🦅", cost: 10000, title: "Phượng hoàng" },
  dragonking: { emoji: "🐲", cost: 10000, title: "Dragon King" },
  supernova:  { emoji: "🌠", cost: 10000, title: "Supernova" },
};




const START_COINS = 0; // coin mặc định cho mỗi người (demo)
function clampInt(n, min, max){
  n = Number(n);
  if (!Number.isFinite(n)) n = 0;
  n = Math.floor(n);
  return Math.max(min, Math.min(max, n));
}
function safeName(name){
  return String(name || "Ẩn danh").trim().slice(0, 20);
}
function roomGiftTop(room, limit=5){
  const arr = [];
  try{

   for (const [k,v] of safeMap(room.giftByUser).entries()){
  arr.push({ name: k, coins: v });
}

    
  }catch{}
  arr.sort((a,b)=>b.coins-a.coins);
  return arr.slice(0, limit);
}
// ===== /GIFT ENGINE =====

function normRoomId(roomId) {
  return String(roomId || "").trim().toLowerCase();
}


function safeMap(m){ return m instanceof Map ? m : new Map(); }
function safeSet(s){ return s instanceof Set ? s : new Set(); }

function calcBitrate(viewerCount){
  if(viewerCount < 5)   return 1500; // kbps
  if(viewerCount < 15)  return 1000;
  if(viewerCount < 30)  return 600;
  if(viewerCount < 50)  return 400;
  return 250;
}


function getRoom(roomId) {
  roomId = normRoomId(roomId);
  if (!rooms.has(roomId)) {

 rooms.set(roomId, {
  broadcasterId: null,
  viewers: new Set(),
  viewerProfiles: new Map(),
  liveStartTs: null,
  pinnedNote: null,
  hostProfile: null,
  giftTotal: 0,
  giftByUser: new Map(),
  releaseTimer: null,
  pendingRelease: false,
 
});


  }
  return rooms.get(roomId);
}





function emitViewerCount(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

const active = [...safeMap(room.viewerProfiles).values()]
  .filter(v => !v.mini).length;


  io.to(roomId).emit("viewer-count", { count: active });

   const vc = safeMap(room.viewerProfiles).size;
  const br = calcBitrate(vc);
  io.to(roomId).emit("set-bitrate", { bitrate: br });
}


/* ===== LOBBY (SẢNH CHỜ) ===== */
function getLobbyList() {
  const list = [];
  for (const [roomId, room] of rooms.entries()) {
    // điều kiện "đang live": có host + đã live-start
    if (room.broadcasterId && room.liveStartTs) {
      list.push({
  roomId,
  viewers: safeSet(room.viewers).size,
  liveStartTs: room.liveStartTs,
  host: room.hostProfile || null, // 👈 thêm
});

    }
  }
  // ưu tiên phòng đông người xem
  list.sort((a, b) => (b.viewers - a.viewers) || (b.liveStartTs - a.liveStartTs));
  return list;
}

function emitLobbyUpdate() {
  io.emit("lobby-update", { rooms: getLobbyList(), ts: Date.now() });
}


// ICE servers from Twilio (TURN). Client will filter invalid STUN urls if any.
app.get("/ice", async (_req, res) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return res.status(500).json({ error: "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN" });
    }

    const client = twilio(accountSid, authToken);
    const token = await client.tokens.create();

    return res.json({ iceServers: token.iceServers });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


async function sendPushToUser(uid, payload) {
  const subs = pushSubs.get(uid);
  if (!subs || !subs.length) return;

  for (let i = subs.length - 1; i >= 0; i--) {
    try {
      await webpush.sendNotification(subs[i], JSON.stringify(payload));
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        subs.splice(i, 1); // xoá sub chết
      }
    }
  }
}





function closeRoom(roomId, reason = "host_left") {
  const room = rooms.get(roomId);   // 🔥 LẤY ROOM TRƯỚC
  if (!room) return;




  // 🔔 notify host
  if(room.hostProfile?.uid){
    pushNotify(room.hostProfile.uid,{
      type:"system",
      text:"Phòng live của bạn đã bị đóng"
    });
  }

  // 💾 xóa live_state
  const state = loadLiveState();
  delete state[roomId];
  saveLiveState(state);

  // 🚨 báo cho toàn bộ viewer + guest
  io.to(roomId).emit("room-closed", { reason });

  // clear state
  room.broadcasterId = null;
  room.liveStartTs = null;
  room.viewers.clear();
  safeMap(room.viewerProfiles).clear();


  room.giftTotal = 0;
  room.giftByUser = new Map();

  emitLobbyUpdate();

  // xoá room sau 1 chút cho client kịp nhận event
  setTimeout(() => {
    rooms.delete(roomId);
  }, 1000);
}








io.on("connection", (socket) => {







 // lấy deviceId từ client
  socket.data.deviceId = socket.handshake.auth?.deviceId;

  // 🔐 ADMIN / USER REGISTER
  socket.on("register-admin", (uid) => {
    if (!uid) return;
    bindSocketToUser(uid, socket);
    console.log("🧑‍⚖️ ADMIN REGISTER:", uid, socket.id);
  });

  socket.on("register-user", (uid) => {
    if (!uid) return;
    bindSocketToUser(uid, socket);
    console.log("👤 USER REGISTER:", uid, socket.id);
  });



// 🔐 AUTH SOCKET (BẮT BUỘC – TOÀN APP)
socket.on("auth", ({ uid, deviceId }) => {
  if (!uid) return;

  socket.data.uid = uid;
  socket.data.deviceId = deviceId || null;

  bindSocketToUser(uid, socket);
});



socket.on("disconnect", () => {
  const uid = socket.data.uid;
  if (!uid) return;

  const set = activeUsers.get(uid);
  if (!set) return;

  set.delete(socket.id);
  if (set.size === 0) activeUsers.delete(uid);

  console.log("🔌 SOCKET DISCONNECT:", uid, socket.id);
});




// ================================
// 💬 CHAT 1–1 (ADMIN BYPASS FRIEND)
// ================================
socket.on("chat-send", async ({ toUid, text, media }) => {
  const fromUid = socket.data.uid;
  if (!fromUid || !toUid) return;

  const db = loadUsers();
  const fromAcc = db[fromUid];
  const toAcc   = db[toUid];
  if (!fromAcc || !toAcc) return;

  // 🚫 BLOCK CHECK (2 CHIỀU)
  if (
    (fromAcc.profile.blockedUsers || []).includes(toUid) ||
    (toAcc.profile.blockedUsers || []).includes(fromUid)
  ) {
    return;
  }

  // 🔥 ADMIN BYPASS FRIEND CHECK
  const senderIsAdmin =
    socket.data.role === "admin" ||
    (socket.data.roles || []).includes("admin");

  const receiverIsAdmin =
    toAcc.role === "admin" ||
    (toAcc.roles || []).includes("admin");

  if (!senderIsAdmin && !receiverIsAdmin) {
    const friends = fromAcc.profile.friends || [];
    if (!friends.includes(toUid)) {
      return; // ❌ không phải bạn → chặn
    }
  }

  // 💾 TẠO MESSAGE
  const msg = {
    id: Date.now() + "_" + Math.random().toString(36).slice(2),
    from: fromUid,
    to: toUid,
    text: text || "",
    media: media || null,
    time: Date.now(),
    read: false
  };

  // 📥 LƯU INBOX CHO CẢ 2
  [fromUid, toUid].forEach(uid => {
    if (!userInbox.has(uid)) userInbox.set(uid, []);
    userInbox.get(uid).unshift(msg);
  });
  saveInbox(Object.fromEntries(userInbox));

  // 🔁 REALTIME NẾU ONLINE
  const sockets = activeUsers.get(toUid);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("chat-receive", msg);
    }
  }

  // 🔔 PUSH NẾU OFFLINE
  await sendPushToUser(toUid, {
    title: senderIsAdmin
      ? "🛡️ Admin đã nhắn cho bạn"
      : "💬 Tin nhắn mới",
    body: text?.slice(0, 80) || "Bạn có tin nhắn mới",
    url: `/messages.html?uid=${fromUid}`,
    tag: "chat-message"
  });
});




// ================================
// 🔔 USER ĐÃ CHUYỂN KHOẢN (TOPUP)
// ================================
socket.on("topup-transferred", async ({ fromUid, agentUid, time }) => {
  if (!fromUid || !agentUid) return;

  console.log("💸 TOPUP TRANSFER:", fromUid, "→", agentUid);

  const ts = time || Date.now();

  // =====================
  // 1️⃣ REALTIME cho đại lý (nếu online)
  // =====================
  const sockets = activeUsers.get(agentUid);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("topup-user-waiting", {
        fromUid,
        time: ts
      });
    }
  }

  // =====================
  // 2️⃣ LƯU INBOX cho đại lý (offline vẫn thấy)
  // =====================
  if (!userInbox.has(agentUid)) {
    userInbox.set(agentUid, []);
  }

  userInbox.get(agentUid).unshift({
    type: "topup-waiting",
    from: fromUid,
    text: `💸 ${fromUid} đã chuyển khoản – vui lòng kiểm tra`,
    time: ts,
    read: false
  });

  saveInbox(Object.fromEntries(userInbox));

  // =====================
  // 3️⃣ PUSH NOTIFICATION cho đại lý (khi offline)
  // =====================
  await sendPushToUser(agentUid, {
    title: "💳 Yêu cầu nạp coin",
    body: `${fromUid} đã chuyển khoản`,
    url: "/lsp-admin-128995.html#topup",
    tag: "topup-waiting"
  });

  // =====================
  // 4️⃣ THÔNG BÁO CHO ADMIN (realtime)
  // =====================
  for (const [uid, sockets] of activeUsers.entries()) {
    const db = loadUsers();
    if (db[uid]?.role !== "admin") continue;

    for (const sid of sockets) {
      io.to(sid).emit("topup-admin-notify", {
        fromUid,
        agentUid,
        time: ts
      });
    }
  }

});




// 🔐 LOGIN SOCKET (CHUẨN HOÁ)
socket.on("socket-login", ({ uid }) => {
  bindSocketToUser(uid, socket);
  emitAgentStatus(uid, true);
});

socket.on("auth-login", ({ uid }) => {
  bindSocketToUser(uid, socket);
  emitAgentStatus(uid, true);
});


// ❌ HANDLE DISCONNECT (BẮT BUỘC)
socket.on("disconnect", () => {
  const uid = socket.data.uid;
  if (!uid) return;

  const set = activeUsers.get(uid);
  if (set) {
    set.delete(socket.id);
    if (set.size === 0) {
      activeUsers.delete(uid);
      emitAgentStatus(uid, false);
    }
  }

  console.log("❌ SOCKET OFFLINE:", uid, socket.id);
});


socket.on("lp-gift-post", async ({ postId, toUid, fromUid, giftId, coin }) => {

  // 🔒 CHẶN USER BỊ KHOÁ
  if (blockIfLocked(socket)) return;

  // 🚫 CHẶN GUEST
  if (String(socket.data.uid || "").startsWith("guest_")) {
    socket.emit("need-login", { feature: "gift" });
    return;
  }

  if (!postId || !toUid || !fromUid || !coin) return;

  const db = loadUsers();
  const from = db[fromUid];
  const to   = db[toUid];
  const post = getPost(postId);

  if (!from || !to || !post) return;

  // 🚫 không cho tự tặng chính mình
  if (fromUid === toUid) return;

  const cost = Number(coin);
  if (!Number.isFinite(cost) || cost <= 0) return;

  // 🚫 không đủ kim cương
  if ((from.profile.coins || 0) < cost) {
    socket.emit("gift-failed", { reason: "not_enough_coin" });
    return;
  }

  // ===== TRỪ / CỘNG ĐÚNG NGHIỆP VỤ =====
  from.profile.coins -= cost;
  from.profile.coinSent = (from.profile.coinSent || 0) + cost;

  to.profile.coinReceived =
    (to.profile.coinReceived || 0) + cost;

  // ===== LƯU GIFT VÀO POST =====
  post.gifts ||= { total: 0, byUser: {} };
  post.gifts.total += cost;
  post.gifts.byUser[fromUid] =
    (post.gifts.byUser[fromUid] || 0) + cost;

  saveUsers(db);
  saveSocial();

  // ===== REALTIME UPDATE =====
  io.emit("lp-gift-post", {
  postId,
  total: post.gifts.total,
  fromUid,
  amount: cost
});




  emitCoinUpdate(fromUid);
  emitCoinUpdate(toUid);

  // ===== INBOX + PUSH =====
  const giftText =
    `🎁 ${from.profile.name} đã tặng bạn ${cost.toLocaleString()} 💎`;

  if (!userInbox.has(toUid)) userInbox.set(toUid, []);
  userInbox.get(toUid).unshift({
    type: "post-gift",
    from: fromUid,
    text: giftText,
    postId,
    amount: cost,
    time: Date.now(),
    read: false
  });

  saveInbox(Object.fromEntries(userInbox));

  await sendPushToUser(toUid, {
    title: "🎁 Bạn nhận được quà",
    body: giftText,
    url: `/social.html#post-${postId}`,
    tag: "post-gift"
  });
});





socket.on("clear-my-messages", ({ peer }) => {
  const me = socket.data.uid;
  if(!me || !peer) return;

  console.log("🧹 Clear my messages:", me, "→", peer);

  // 1️⃣ XÓA OFFLINE INBOX (CẢ 2 USER)
  [me, peer].forEach(uid => {
    const inbox = userInbox.get(uid);
    if(!inbox) return;

    const filtered = inbox.filter(
      m => !(m.from === me && m.to === peer)
    );

    userInbox.set(uid, filtered);
  });

  saveInbox(Object.fromEntries(userInbox));

  // 2️⃣ REALTIME: báo B để xóa local
  const sockets = activeUsers.get(peer);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("peer-cleared-my-messages", {
        by: me
      });
    }
  }
});





  // 🚫 THU HỒI TIN NHẮN
socket.on("revoke-message", ({ msgId }) => {
  if (!msgId) return;

  const fromUid = socket.data.uid;
  if (!fromUid) return;

  // 1️⃣ CẬP NHẬT INBOX SERVER (offline messages)
  for (const [uid, inbox] of userInbox.entries()) {
    let changed = false;

    for (const m of inbox) {
      if (m.id === msgId && m.from === fromUid) {
        m.text = "__REVOKED__";
        m.revoked = true;
        changed = true;
      }
    }

    if (changed) {
      userInbox.set(uid, inbox);
    }
  }

  saveInbox(Object.fromEntries(userInbox));

  // 2️⃣ BẮN REALTIME CHO TẤT CẢ SOCKET KHÁC
  socket.broadcast.emit("revoke-message", { msgId });
});


socket.on("user-block", ({ uid }) => {
  const me = socket.data.uid;
  if (!me || !uid || me === uid) return;

  const db = loadUsers();
  const uMe = db[me];
  if (!uMe) return;

uMe.profile.blockedUsers ||= [];

  if (!uMe.profile.blockedUsers.includes(uid)) {
  uMe.profile.blockedUsers.push(uid);
  }

  // 🔥 BLOCK → TỰ HUỶ KẾT BẠN NẾU CÓ
  uMe.profile.friends = (uMe.profile.friends || []).filter(x => x !== uid);
  const uYou = db[uid];
  if (uYou) {
    uYou.profile.friends =
      (uYou.profile.friends || []).filter(x => x !== me);

    // xoá request 2 chiều nếu còn
    uYou.profile.friendRequests =
      (uYou.profile.friendRequests || []).filter(x => x !== me);
  }

  saveUsers(db);


  // 🔔 REALTIME: BLOCK (BÁO CHO NGƯỜI BỊ BLOCK)
const sockets = activeUsers.get(uid);
if (sockets) {
  for (const sid of sockets) {
    io.to(sid).emit("user-blocked", {
      by: me
    });
  }
}


  socket.emit("user-blocked", { uid });
});




socket.on("user-unblock", ({ uid }) => {
  const me = socket.data.uid;
  if (!me || !uid) return;

  const db = loadUsers();
  const uMe = db[me];
  if (!uMe) return;

uMe.profile.blockedUsers =
  (uMe.profile.blockedUsers || []).filter(x => x !== uid);


  saveUsers(db);

  // 🔔 realtime cho chính mình
  socket.emit("user-unblocked", { uid });

  // 🔔 realtime cho người vừa được unblock
  const sockets = activeUsers.get(uid);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("user-unblocked-by", {
        by: me
      });
    }
  }
});




socket.on("friend-request", ({ to }) => {

  
  const from = socket.data.uid;
  if (!from || !to || from === to) return;

  const db = loadUsers();
  const uFrom = db[from];
  const uTo = db[to];
  if (!uFrom || !uTo) return;


// 🚫 BLOCK CHECK
if (
  (uFrom.profile.blockedUsers || []).includes(to) ||
  (uTo.profile.blockedUsers || []).includes(from)
) {
  return;
}

  uFrom.profile.friends ||= [];
  uTo.profile.friends ||= [];
  uTo.profile.friendRequests ||= [];

  // đã là bạn → bỏ qua
  if (uFrom.profile.friends.includes(to)) return;

  // đã gửi rồi → bỏ qua
  if (uTo.profile.friendRequests.includes(from)) return;

  uTo.profile.friendRequests.push(from);
  saveUsers(db);

  // realtime nếu online
  const sockets = activeUsers.get(to);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("friend-request", {
        from,
        name: uFrom.profile.name,
        avatar: uFrom.profile.avatar
      });
    }
  }
});

socket.on("friend-respond", ({ from, accept }) => {
  const to = socket.data.uid;
  if (!from || !to) return;

  const db = loadUsers();
  const uFrom = db[from];
  const uTo = db[to];
  if (!uFrom || !uTo) return;

  uFrom.profile.friends ||= [];
  uTo.profile.friends ||= [];
  uTo.profile.friendRequests ||= [];

  // xoá request
  uTo.profile.friendRequests =
    uTo.profile.friendRequests.filter(x => x !== from);

  if (accept) {
    if (!uFrom.profile.friends.includes(to))
      uFrom.profile.friends.push(to);

    if (!uTo.profile.friends.includes(from))
      uTo.profile.friends.push(from);
  }

  saveUsers(db);

  // báo realtime cho người gửi
  const sockets = activeUsers.get(from);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("friend-respond", {
        uid: to,
        accept
      });
    }
  }

// 🔔 REALTIME: ĐÃ LÀ BẠN (BẬT CHAT CHO CẢ 2)
if (accept) {
  const socketsA = activeUsers.get(from); // người gửi lời mời
  const socketsB = activeUsers.get(to);   // người accept

  [socketsA, socketsB].forEach(socks => {
    if (!socks) return;
    for (const sid of socks) {
      io.to(sid).emit("friend-accepted", {
        a: from,
        b: to
      });
    }
  });
}


});


socket.on("friend-cancel", ({ uid }) => {
  const meUid = socket.data.uid;
  if (!meUid || !uid) return;

  const db = loadUsers();
  const me = db[meUid];
  const other = db[uid];

  if (!me || !other) return;

  // me.sent = lời mời đã gửi
  me.friends ||= {};
  other.friends ||= {};

  me.friends.sent = (me.friends.sent || []).filter(u => u !== uid);
  other.friends.requests = (other.friends.requests || []).filter(u => u !== meUid);

  saveUsers(db);
});





socket.on("friend-remove", ({ uid }) => {
  const me = socket.data.uid;
  if (!me || !uid) return;

  const db = loadUsers();
  const uMe = db[me];
  const uYou = db[uid];
  if (!uMe || !uYou) return;

  uMe.profile.friends ||= [];
  uYou.profile.friends ||= [];

  // ❌ xoá 2 chiều
  uMe.profile.friends = uMe.profile.friends.filter(x => x !== uid);
  uYou.profile.friends = uYou.profile.friends.filter(x => x !== me);

  saveUsers(db);

  // 🔁 realtime nếu người kia online
  const sockets = activeUsers.get(uid);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit("friend-removed", { uid: me });
    }
  }

  // báo lại cho người bấm
  socket.emit("friend-removed", { uid });
});

socket.on("lp-like-reply", async ({ postId, commentIndex, replyId, uid }) => {
  const post = getPost(postId);
  if (!post) return;

  const c = post.comments?.[commentIndex];
  if (!c || !c.replies) return;

  const r = c.replies.find(x => x.id === replyId);
  if (!r) return;

  r.likes = r.likes || [];

  const i = r.likes.indexOf(uid);
  const liked = i === -1;

  if (liked) r.likes.push(uid);
  else r.likes.splice(i, 1);

  saveSocial();

  io.emit("lp-like-reply", {
    postId,
    commentIndex,
    replyId,
    likes: r.likes.length
  });

  // 🔔 PUSH cho chủ reply
  if (liked && r.uid && r.uid !== uid) {
    await sendPushToUser(r.uid, {
      title: "❤️ Trả lời được thích",
      body: `${socket.data.profile?.name || "Ai đó"} đã thích trả lời của bạn`,
      url: `/social.html#post-${postId}`
    });
  }
});

socket.on("lp-reply-child", ({ postId, commentIndex, replyId, uid, name, avatar, text })=>{
  const post = getPost(postId);
  if(!post) return;

  const c = post.comments?.[commentIndex];
  if(!c || !c.replies) return;

  const parent = c.replies.find(r => r.id === replyId);
  if(!parent) return;

  parent.replies = parent.replies || [];

  const child = {
    id: Date.now() + "_" + Math.random().toString(36).slice(2),
    uid, name, avatar,
    text: String(text).slice(0,200),
    time: Date.now(),
    likes: [],
    replies:[]
  };

  parent.replies.push(child);
  saveSocial();

  io.emit("lp-reply-child", {
    postId,
    commentIndex,
    replyId,
    child
  });
});

socket.on("lp-like-comment", async ({ postId, index, uid }) => {
  const post = getPost(postId);
  if (!post || !post.comments || !post.comments[index]) return;

  const c = post.comments[index];
  c.likes = c.likes || [];

  const i = c.likes.indexOf(uid);
  const liked = i === -1;

  if (liked) c.likes.push(uid);
  else c.likes.splice(i, 1);

  saveSocial();

  io.emit("lp-like-comment", {
    postId,
    index,
    likes: c.likes.length
  });

  // 🔔 PUSH cho chủ comment
  if (liked && c.uid && c.uid !== uid) {
    await sendPushToUser(c.uid, {
      title: "❤️ Bình luận được thích",
      body: `${socket.data.profile?.name || "Ai đó"} đã thích bình luận của bạn`,
      url: `/social.html#post-${postId}`
    });
  }
});

socket.on("lp-delete", ({ postId, uid })=>{
  const idx = lpPosts.findIndex(p => p.id === postId && p.uid === uid);
  if(idx < 0) return;  // không phải chủ bài → không cho

  lpPosts.splice(idx,1);
  saveSocial();

  io.emit("lp-delete", { postId });
});


  // ===== LIVESTREAM PRO SOCIAL =====

// gửi feed khi user vừa kết nối
socket.emit("lp-init", lpPosts.slice(0, 50));



socket.on("lp-edit-post", ({ postId, uid, text, images })=>{
  const post = getPost(postId);
  if(!post) return;

  // 🔐 chỉ chủ bài mới được sửa
  if(post.uid !== uid) return;

  post.text = String(text || "").slice(0,500);

  // 🔥 QUAN TRỌNG: cập nhật ảnh
  if (Array.isArray(images)) {
    post.images = images;
    delete post.image; // xoá legacy field nếu còn
  }

  post.edited = Date.now();

  saveSocial();

  // 🔥 EMIT ĐẦY ĐỦ
  io.emit("lp-edit-post", {
    postId,
    text: post.text,
    images: post.images || []
  });
});




socket.on("lp-post", post => {
 if(!post || !post.uid || (!post.text && !post.image && !post.video)) return;

  const clean = {
    id: Date.now() + "_" + Math.random().toString(36).slice(2),
    uid: String(post.uid),
    name: String(post.name || "User").slice(0,20),
    avatar: String(post.avatar || ""),
    text: String(post.text || "").slice(0, 500),
    images: post.images || [],   // 🔥 MẢNG ẢNH
    video: String(post.video || ""),   // 👈 THÊM
    time: Date.now(),
    likes: [],
    comments: []
  };

  lpPosts.unshift(clean);
  saveSocial();

  if(lpPosts.length > 200) lpPosts.length = 200;

  io.emit("lp-post", clean);
});


socket.on("lp-like", async ({ postId, uid }) => {
  const post = getPost(postId);
  if (!post || !uid) return;

  post.likes = post.likes || [];

  const i = post.likes.indexOf(uid);
  const liked = i < 0;

  if (liked) post.likes.push(uid);
  else post.likes.splice(i, 1);

  saveSocial();

  io.emit("lp-like", {
    postId,
    likes: post.likes.length
  });

  // 🔔 PUSH cho chủ bài (nếu like mới & không tự like)
  if (liked && post.uid !== uid) {
    await sendPushToUser(post.uid, {
      title: "❤️ Bài viết được thích",
      body: `${socket.data.profile?.name || "Ai đó"} đã thích bài viết của bạn`,
      url: `/social.html#post-${postId}`
    });
  }
});


socket.on("lp-comment", async ({ postId, uid, name, avatar, text }) => {
  const post = getPost(postId);
  if (!post || !uid || !text) return;

  post.comments = post.comments || [];

  const c = {
    uid,
    name,
    avatar,
    text: text.slice(0,200),
    time: Date.now(),
    likes:[]
  };

  post.comments.push(c);
  saveSocial();

  io.emit("lp-comment", {
    postId,
    postOwnerUid: post.uid,
    comment: c,
    count: post.comments.length
  });

  // 🔔 PUSH cho chủ bài
  if (post.uid !== uid) {
    await sendPushToUser(post.uid, {
      title: "💬 Bình luận mới",
      body: `${name}: ${text.slice(0,60)}`,
      url: `/social.html#post-${postId}`
    });
  }
});



socket.on("lp-reply", async ({ postId, commentIndex, uid, name, avatar, text }) => {
  const post = getPost(postId);
  if (!post || !text) return;

  const c = post.comments?.[commentIndex];
  if (!c) return;

  c.replies = c.replies || [];

  const r = {
    id: Date.now()+"_"+Math.random().toString(36).slice(2),
    uid, name, avatar,
    text: text.slice(0,200),
    time: Date.now(),
    likes:[]
  };

  c.replies.push(r);
  saveSocial();

  io.emit("lp-reply", {
    postId,
    commentIndex,
    reply: r,
    count: c.replies.length
  });

  // 🔔 PUSH cho người bị reply
  if (c.uid && c.uid !== uid) {
    await sendPushToUser(c.uid, {
      title: "💬 Trả lời bình luận",
      body: `${name}: ${text.slice(0,60)}`,
      url: `/social.html#post-${postId}`
    });
  }
});



socket.on("lp-delete-comment", ({ postId, index, uid })=>{
  const post = getPost(postId);
  if(!post || !post.comments || !post.comments[index]) return;

  const c = post.comments[index];

  // 🔐 chỉ cho chủ comment hoặc chủ bài
  if(c.uid !== uid && post.uid !== uid) return;

  post.comments.splice(index,1);
  saveSocial();

  io.emit("lp-delete-comment", { postId, index });
});



socket.on("lp-delete-reply", ({ postId, commentIndex, replyId, uid })=>{
  const post = getPost(postId);
  if(!post) return;

  const c = post.comments?.[commentIndex];
  if(!c || !c.replies) return;

  const idx = c.replies.findIndex(r=>r.id===replyId);
  if(idx < 0) return;

  const r = c.replies[idx];

  // 🔐 chỉ chủ reply hoặc chủ bài
  if(r.uid !== uid && post.uid !== uid) return;

  c.replies.splice(idx,1);
  saveSocial();

  io.emit("lp-delete-reply", {
    postId,
    commentIndex,
    replyId
  });
});



socket.on("lp-delete-reply-child", ({ postId, commentIndex, replyId, childId, uid })=>{
  const post = getPost(postId);
  if(!post) return;

  const c = post.comments?.[commentIndex];
  if(!c || !c.replies) return;

  const parent = c.replies.find(r=>r.id===replyId);
  if(!parent || !parent.replies) return;

  const idx = parent.replies.findIndex(x=>x.id===childId);
  if(idx < 0) return;

  const child = parent.replies[idx];

  // 🔐 chỉ chủ reply-of-reply hoặc chủ bài
  if(child.uid !== uid && post.uid !== uid) return;

  parent.replies.splice(idx,1);
  saveSocial();

  io.emit("lp-delete-reply-child", {
    postId,
    commentIndex,
    replyId,
    childId
  });
});


socket.on("lp-like-reply-child", async ({ postId, commentIndex, replyId, childId, uid }) => {
  const post = getPost(postId);
  if (!post) return;

  const c = post.comments?.[commentIndex];
  if (!c || !c.replies) return;

  const parent = c.replies.find(r => r.id === replyId);
  if (!parent || !parent.replies) return;

  const child = parent.replies.find(x => x.id === childId);
  if (!child) return;

  child.likes = child.likes || [];

  const i = child.likes.indexOf(uid);
  const liked = i === -1;

  if (liked) child.likes.push(uid);
  else child.likes.splice(i, 1);

  saveSocial();

  io.emit("lp-like-reply-child", {
    postId,
    commentIndex,
    replyId,
    childId,
    likes: child.likes.length
  });

  // 🔔 PUSH cho chủ reply-child
  if (liked && child.uid && child.uid !== uid) {
    await sendPushToUser(child.uid, {
      title: "❤️ Trả lời được thích",
      body: `${socket.data.profile?.name || "Ai đó"} đã thích trả lời của bạn`,
      url: `/social.html#post-${postId}`
    });
  }
});




socket.on("private-message", async ({ to, text, type, media, msgId }) => {


  if (blockIfLocked(socket)) return;


  const fromUid = socket.data.uid;
if (!fromUid || !to) return;





// 🔒 CHỈ CHO PHÉP NHẮN TIN VỚI BẠN BÈ
const db = loadUsers();
const me = db[fromUid];
const you = db[to];

if (!me || !you) return;

// 🚫 BLOCK CHECK (2 chiều)
me.profile.blockedUsers ||= [];
you.profile.blockedUsers ||= [];

const blockedMe = me.profile.blockedUsers.includes(to);
const blockedByYou = you.profile.blockedUsers.includes(fromUid);


if (blockedMe || blockedByYou) {
  socket.emit("msg-blocked", {
    reason: "blocked",
    to
  });
  return;
}

// 🔧 NORMALIZE FRIEND LIST (FIX BUG)
const myFriends = Array.isArray(me.profile.friends)
  ? me.profile.friends
  : [];

const yourFriends = Array.isArray(you.profile.friends)
  ? you.profile.friends
  : [];

const isAdmin = me.role === "admin";




// 🔒 USER THƯỜNG → BẮT BUỘC LÀ BẠN 2 CHIỀU
if (
  !isAdmin &&
  (!myFriends.includes(to) || !yourFriends.includes(fromUid))
) {
  socket.emit("msg-blocked", {
    reason: "not_friend",
    to
  });
  return;
}



// 🔥 CHUẨN HOÁ NỘI DUNG TIN NHẮN
let payloadText = text || "";

if (type === "image" && media) {
  payloadText = "/img " + media;
}

if (type === "video" && media) {
  payloadText = "/video " + media;
}



 const id = msgId || Date.now() + "_" + Math.random().toString(36).slice(2);


  const msg = {
    id,
    from: fromUid,
    to,
    text: payloadText,
    peer: fromUid, 
    time: Date.now(),
    seen: false,
    delivered: false
  };

  // 1️⃣ LƯU VÀO INBOX NGƯỜI NHẬN
  if (!userInbox.has(to)) userInbox.set(to, []);
  userInbox.get(to).push(msg);
  saveInbox(Object.fromEntries(userInbox));

  // 2️⃣ GỬI REALTIME NẾU ONLINE
  const sockets = activeUsers.get(to);

  if (sockets) {
    const db = loadUsers();
    const user = db[fromUid];

    const fromProfile = {
      ...(socket.data.profile || {}),
      uid: fromUid,
      verified: !!user?.profile?.verified
    };

    for (const sid of sockets) {
      io.to(sid).emit("private-message", {
        from: fromProfile,
        text: payloadText,
        msgId: id
      });
      io.to(sid).emit("inbox-new");
    }

    msg.delivered = true;
  }

 // 3️⃣ 🔔 LUÔN GỬI PUSH (KỂ CẢ ONLINE)
const subs = pushSubs.get(to);

if (subs && subs.length) {
  const db = loadUsers();
  const fromUser = db[fromUid];

 const payload = JSON.stringify({
  title: `💬 ${fromUser.profile.name}`,
  body:
    type === "image" ? "📷 Hình ảnh"
  : type === "video" ? "🎥 Video"
  : payloadText,

  tag: "chat",

  // 🔥 DATA QUAN TRỌNG NHẤT
  data: {
    type: "chat",
    fromUid
  },

  // fallback nếu browser không support postMessage
  url: `/messages.html?openChat=${fromUid}`
});



  for (let i = subs.length - 1; i >= 0; i--) {
    try {
      await webpush.sendNotification(subs[i], payload);
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        subs.splice(i, 1); // 🧹 xoá sub chết
      } else {
        console.log("❌ Push failed:", e.message);
      }
    }
  }
}




  // 4️⃣ BÁO NGƯỜI GỬI TRẠNG THÁI
  socket.emit("msg-status", {
    msgId: id,
    status: sockets ? "delivered" : "stored"
  });
});




app.get("/api/friends/:uid", (req, res) => {
  const uid = req.params.uid;
  const db = loadUsers();
  const me = db[uid];
  if (!me) return res.json({ friends: [], requests: [] });

  const friends = (me.profile.friends || []).map(fid => {
    const u = db[fid];
    if (!u) return null;
    return {
      uid: fid,
      name: u.profile.name,
      avatar: normalizeAvatar(u.profile.avatar),
      level: u.profile.level || 1,
      verified: !!u.profile.verified
    };
  }).filter(Boolean);

  const requests = (me.profile.friendRequests || []).map(fid => {
    const u = db[fid];
    if (!u) return null;
    return {
      uid: fid,
      name: u.profile.name,
      avatar: u.profile.avatar,
      level: u.profile.level || 1
    };
  }).filter(Boolean);

  res.json({ friends, requests });
});


app.get("/api/blocked/:uid", (req, res) => {
  const uid = req.params.uid;
  const db = loadUsers();
  const me = db[uid];
  if (!me) return res.json({ blocked: [] });

const blocked = (me.profile.blockedUsers || []).map(bid => {

    const u = db[bid];
    if (!u) return null;
    return {
      uid: bid,
      name: u.profile.name,
      avatar: normalizeAvatar(u.profile.avatar),
      level: u.profile.level || 1,
      verified: !!u.profile.verified
    };
  }).filter(Boolean);

  res.json({ blocked });
});



socket.on("msg-seen", ({ to, msgId }) => {

const sockets = activeUsers.get(to);
if (sockets) {
  for (const sid of sockets) {
    io.to(sid).emit("msg-status", {
      msgId,
      status: "seen"
    });
  }
}


  // 🔥 update inbox
  const uid = socket.data.uid;
  
 const inbox = userInbox.get(uid);
if(inbox){
  for(const m of inbox){
    if(m.id === msgId){
      m.seen = true;
      break;
    }
  }

saveInbox(Object.fromEntries(userInbox));
  // nếu hết tin chưa đọc → tắt badge
  const unread = inbox.filter(m=>!m.seen).length;
  if(unread === 0){
    socket.emit("inbox-clear");
  }
}

});



  function isGuest(socket){
  return String(socket.data.uid || "").startsWith("guest_");
}

function blockGuest(socket, feature){
  if(isGuest(socket)){
    socket.emit("need-login", { feature });
    return true;
  }
  return false;
}


function blockIfLocked(socket){
  const uid = socket.data.uid;
  if (!uid) return false;

  const db = loadUsers();
 if (db[uid]?.profile?.accountBlocked) {

    socket.emit("account-blocked", {
      message: "Tài khoản của bạn đã bị khoá"
    });
    return true;
  }
  return false;
}



if(socket.data.uid?.startsWith("guest_")){
  socket.data.role = "guest";
}


  socket.on("get-inbox", ()=>{
  const uid = socket.data.uid;
  if(!uid){
    socket.emit("inbox-data", []);
    return;
  }
  socket.emit("inbox-data", userInbox.get(uid) || []);
});


socket.on("msg-seen-all", ()=>{
  const uid = socket.data.uid;
  if(!uid) return;

  const inbox = userInbox.get(uid);
  if(!inbox) return;

  let changed = false;

  for(const m of inbox){
    if(!m.seen){
      m.seen = true;
      changed = true;
    }
  }

  if(changed){
    socket.emit("inbox-clear"); // 🔴 tắt badge
  }
});



socket.on("auth-ping", ({ uid }) => {
  if (!uid) return;
  socket.data.uid = uid;

  if (!activeUsers.has(uid)) {
    activeUsers.set(uid, new Set([socket.id]));
    emitActiveUsers(); // 🔥 chỉ emit khi uid mới
    return;
  }

  activeUsers.get(uid).add(socket.id);
});



 socket.on("auth-login", ({ uid }) => {
  uid = String(uid || "").trim();
  if (!uid) return;

  // 🚫 BỎ QUA GUEST
  if (uid.startsWith("guest_")) {
    socket.data.uid = uid;
    socket.data.role = "guest";
    return;
  }

  const db = loadUsers();
  if (db[uid]) {
    socket.data.profile = {
      ...db[uid].profile,
      ...socket.data.profile
    };
  }

    // 🔥 GẮN ROLE CHUẨN VÀO SOCKET (FIX ADMIN CHAT)
  socket.data.role = db[uid]?.role || "user";


  // ✅ KHÔNG ĐÁ – CHỈ GHI ĐÈ SOCKET MỚI
 if (!activeUsers.has(uid)) {
  activeUsers.set(uid, new Set());
}
activeUsers.get(uid).add(socket.id);


 // 🔥 GỬI TIN OFFLINE – CHỈ 1 LẦN
const inbox = userInbox.get(uid);
if (inbox && inbox.length) {

  // 👉 CHỈ LẤY TIN CHƯA GỬI
  const toSend = inbox.filter(m => !m.delivered);

  if (toSend.length) {

    // gắn verified cho sender
    for (const m of toSend) {
      const u = db[m.from];
      m.verified = !!u?.profile?.verified;
    }

    socket.emit("offline-messages", toSend);

    // ✅ ĐÁNH DẤU ĐÃ GỬI
    for (const m of toSend) {
      m.delivered = true;
    }


    saveInbox(Object.fromEntries(userInbox)); // ✅ FIX QUAN TRỌNG

    // 🔴 badge chỉ khi còn tin CHƯA XEM
    const unread = inbox.filter(m => !m.seen).length;
    if (unread > 0) {
      socket.emit("inbox-new", { count: unread });
    }
  }

  }

  socket.data.uid = uid;
  emitActiveUsers();
  emitCoinUpdate(uid);
  emitAllUsers(); // 🔁 đảm bảo FE luôn có role
});






socket.on("host-reconnect", ({ roomId }) => {
  const room = getRoom(roomId);
  if (!room) return;

  room.broadcasterId = socket.id;
  room.pendingRelease = false;

  if (room.releaseTimer) {
    clearTimeout(room.releaseTimer);
    room.releaseTimer = null;
  }

  socket.join(roomId);

 socket.emit("host-resume", {
  liveStartTs: room.liveStartTs,
  viewers: Array.from(safeMap(room.viewerProfiles).values())
});


  io.to(roomId).emit("host-back-online");
});




socket.on("host-profile-update", ({ roomId, level }) => {
  const room = getRoom(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return;

  if (!room.hostProfile) room.hostProfile = {};

  room.hostProfile.level = Number(level) || room.hostProfile.level || 1;

  io.to(roomId).emit("host-profile-sync", room.hostProfile);
  emitLobbyUpdate();
});


socket.on("profile-update", ({ name, avatar, level, cover, bio }) => {


  // ===== 1. Cập nhật profile realtime cho lobby =====
  if (!socket.data.profile) socket.data.profile = {};
  if (name)   socket.data.profile.name   = safeName(name);
  if (avatar) socket.data.profile.avatar = avatar;
  if (level)  socket.data.profile.level  = Number(level) || socket.data.profile.level;
  if (cover) socket.data.profile.cover = cover;

  // ===== 2. Lưu vĩnh viễn vào users.json =====
  const uid = socket.data.uid;
  if (uid) {
    const db = loadUsers();
    for (const k in db) {
      if (db[k].profile?.uid === uid) {
        if (name)   db[k].profile.name   = safeName(name);
        if (avatar) db[k].profile.avatar = avatar;
        if (level)  db[k].profile.level  = Number(level) || db[k].profile.level;
        if (cover) db[k].profile.cover = cover;
        if (bio !== undefined) {db[k].profile.bio = String(bio).slice(0, 500);}

        saveUsers(db);
        break;
      }
    }
  }

    // ===== SYNC AVATAR VÀO TOÀN BỘ SOCIAL POSTS =====
  if (uid && avatar) {
    let changed = false;

    for (const p of lpPosts) {
      if (p.uid === uid) {
        p.avatar = avatar;
        changed = true;
      }

      if (p.comments) {
        for (const c of p.comments) {
          if (c.uid === uid) {
            c.avatar = avatar;
            changed = true;
          }

          if (c.replies) {
            for (const r of c.replies) {
              if (r.uid === uid) {
                r.avatar = avatar;
                changed = true;
              }

              if (r.replies) {
                for (const ch of r.replies) {
                  if (ch.uid === uid) {
                    ch.avatar = avatar;
                    changed = true;
                  }
                }
              }
            }
          }
        }
      }
    }

    if (changed) saveSocial();

    // 🔥 broadcast cho client update DOM
    io.emit("social-avatar-sync", { uid, avatar });
  }

  // ===== SYNC NAME VÀO TOÀN BỘ SOCIAL POSTS =====
if (uid && name) {
  let changed = false;

  for (const p of lpPosts) {
    if (p.uid === uid) {
      p.name = safeName(name);
      changed = true;
    }

    if (p.comments) {
      for (const c of p.comments) {
        if (c.uid === uid) {
          c.name = safeName(name);
          changed = true;
        }

        if (c.replies) {
          for (const r of c.replies) {
            if (r.uid === uid) {
              r.name = safeName(name);
              changed = true;
            }

            if (r.replies) {
              for (const ch of r.replies) {
                if (ch.uid === uid) {
                  ch.name = safeName(name);
                  changed = true;
                }
              }
            }
          }
        }
      }
    }
  }

  if (changed) saveSocial();

  // 🔥 broadcast cho client update DOM
  io.emit("social-name-sync", { uid, name: safeName(name) });
}


  // ===== 3. Nếu user đang ở trong room thì sync viewer list =====
  const roomId = socket.data.roomId;
  if (roomId) {
    const room = rooms.get(roomId);
    
  if (room) {
  for (const p of safeMap(room.viewerProfiles).values()) {
    if (p.socketId === socket.id) {
      if (name)   p.name   = safeName(name);
      if (avatar) p.avatar = avatar;
      if (level)  p.level  = Number(level) || p.level;
      break;
    }
  }


      const list = Array.from(safeMap(room.viewerProfiles).values());

      for (const v of list) {
        if (!v.mini) {
          io.to(v.socketId).emit("viewer-list", {
            viewers: list.filter(x => !x.mini)
          });
        }
      }
    }
  }

  // ===== 4. Luôn refresh Sảnh người chơi =====
  emitActiveUsers();
  emitAllUsers();   // 🔥 THÊM DÒNG NÀY
});





socket.on("viewer-join", ({ roomId, profile }) => {
  // ✅ lưu profile cho Player Lobby
socket.data.profile = profile;


if(isGuest(socket)){
  // ép profile Guest an toàn
  profile = {
    uid: socket.data.uid,
    name: "Guest",
    avatar: "https://api.dicebear.com/7.x/thumbs/svg?seed=guest",
    level: 1,
    coins: 0
  };
}


  roomId = normRoomId(roomId);
  if (!roomId) return;

  const room = getRoom(roomId);

if (!room.streamReady) {
  socket.emit("wait-host-stream");
  return;
}

  const vc = safeMap(room.viewerProfiles).size;
if(vc >= MAX_VIEWERS){
  socket.emit("room-full");
  return;
}

  if (!room) return;

  // ✅ BẮT BUỘC: join phòng + set data để disconnect cleanup chạy đúng
  socket.join(roomId);
  socket.data.roomId = roomId;
  // 🔥 KHÔNG GHI ĐÈ ROLE ADMIN
if (socket.data.role !== "admin") {
  socket.data.role = "viewer";
}


  // ✅ UID ổn định (ưu tiên profile.uid)
  const uid = String(profile?.uid || "").trim() || safeName(profile?.name);

  // 👻 CHỐNG MULTI-TAB: kick socket cũ
  const old = room.viewerProfiles.get(uid);
  if (old && old.socketId && old.socketId !== socket.id) {
    io.to(old.socketId).emit("force-disconnect", { reason: "multi_tab" });

    const oldSocket = io.sockets.sockets.get(old.socketId);
    if (oldSocket) oldSocket.disconnect(true);

    room.viewers.delete(old.socketId);
  }

  // add viewer
  room.viewers.add(socket.id);

  // upsert profile (giữ dữ liệu room cũ nếu có)
  room.viewerProfiles.set(uid, {
    uid,
    socketId: socket.id,
    name: safeName(profile?.name),
    avatar: profile?.avatar || "https://i.ibb.co/ZR2yR7dJ/Chat-GPT-Image-Jan-12-2026-02-44-07-AM.jpg",
    level: Number(profile?.level) || 1,
    coins: Number(profile?.coins) || 0,
    coinSentRoom: old?.coinSentRoom || room.giftByUser.get(uid) || 0,
    coinReceivedRoom: old?.coinReceivedRoom || 0,
    mini: false   // 👈 thêm
  });

  emitViewerCount(roomId);

  // ✅ CHỈ emit 1 lần cho cả phòng (đỡ spam)
 const list = Array.from(safeMap(room.viewerProfiles).values());


for (const v of list) {
  if (v.mini) continue;   // ⛔ viewer thu nhỏ không nhận
  io.to(v.socketId).emit("viewer-list", {
    viewers: list.filter(x => !x.mini)
  });
}

  emitLobbyUpdate();
});


socket.on("viewer-mini-mode", ({ roomId, mini }) => {
  const room = getRoom(roomId);
  if (!room) return;

for (const v of safeMap(room.viewerProfiles).values()) {
  if (v.socketId === socket.id) {
    v.mini = mini === true;
    break;
  }
}


  emitViewerCount(roomId); // update số viewer active
});



socket.on("resume-viewers", ({ roomId }) => {
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return;

  // gửi danh sách viewer hiện tại cho host
 socket.emit("resume-viewers-list", {
  viewers: Array.from(safeSet(room.viewers))
});

});




socket.on("host-start-live", ({ roomId }) => {


  const room = getRoom(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return;

  room.streamReady = false;

  if (!room.liveStartTs) {
    room.liveStartTs = Date.now();
  }

 // gửi cho toàn phòng (viewer)
io.to(roomId).emit("host-live", {
  liveStartTs: room.liveStartTs
});

// 🔥 gửi riêng cho host (chắc chắn nhận được)
io.to(socket.id).emit("host-live", {
  liveStartTs: room.liveStartTs
});

  emitLobbyUpdate();
});



socket.on("room-check", ({ roomId }, cb) => {
  const rid = normRoomId(roomId);
  if (!rid) return cb?.({ ok: false, reason: "empty" });

  const room = rooms.get(rid);

  // CHỈ CHẶN khi phòng đang có host online (đang chiếm room)
  // -> host thoát/reload thì broadcasterId sẽ bị clear ở disconnect, nên tạo lại được.
  const taken = !!(room && room.broadcasterId);

  if (taken) return cb?.({ ok: false, reason: "taken", roomId: rid });

  return cb?.({ ok: true, roomId: rid });
});





  // Client (lobby.html) gọi để lấy danh sách phòng đang live
socket.on("lobby-get", () => {
  socket.emit("lobby-update", { rooms: getLobbyList(), ts: Date.now() });
});

  // ===== ICE RESTART RELAY =====
  // Any peer can ask another peer to perform ICE restart
  socket.on("request-ice-restart", ({ to, reason }) => {
    if (!to) return;
    io.to(to).emit("request-ice-restart", { from: socket.id, reason: String(reason || "") });
  });



// ===== LIVE TIMER (server-side source of truth) =====
// Host starts live => store start timestamp; late joiners will receive it.
socket.on("live-start", ({ roomId }) => {
  if (!roomId) return;

  const room = getRoom(roomId);
  if (!room) return;

  // 🔥 CHO PHÉP host đã join dù socket.id có thay đổi do auth
  if (!room.broadcasterId || room.broadcasterId !== socket.id) {
    room.broadcasterId = socket.id;   // 👑 force bind host
  }

  if (!room.liveStartTs) {
    room.liveStartTs = Date.now();
  }

  emitLobbyUpdate();
});



socket.on("live-stop", ({ roomId }) => {
  if (!roomId) return;
  const room = getRoom(roomId);
  if (room.broadcasterId !== socket.id) return;

// 📊 Thống kê buổi live
  const stats = {
    durationMs: room.liveStartTs ? Date.now() - room.liveStartTs : 0,
    viewers: safeSet(room.viewers).size,

    giftsCoins: room.giftTotal || 0,
    topDonors: roomGiftTop(room, 5),
  };

  // ⛔ dừng live
  room.liveStartTs = null;

  // 🔔 gửi cho riêng HOST
  socket.emit("live-ended-stats", stats);

  emitLobbyUpdate();

const state = loadLiveState();
delete state[roomId];
saveLiveState(state);

  closeRoom(roomId, "host_stop");
});



  // Join room with role: broadcaster | viewer | guest
  socket.on("join-room", ({ roomId, role, profile }) => {

    if (blockIfLocked(socket)) return;


    // 🔒 Guest chỉ được join với role=viewer
if(isGuest(socket) && role !== "viewer"){
  socket.emit("need-login", { feature:"join-as-host" });
  return;
}

     roomId = normRoomId(roomId);
    if (!roomId || !role) return;

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = role;
    socket.role = role;

    // store profile (name/coins) for Gift Engine
   socket.data.userName = safeName(
  profile?.name || (role === "broadcaster" ? "Host" : "Viewer")
);

    socket.data.coins = clampInt(profile?.coins, 0, 1_000_000_000);
    if (!socket.data.coins) socket.data.coins = START_COINS;

    // sync wallet to this socket
    socket.emit("wallet-sync", { coins: socket.data.coins });



    const room = getRoom(roomId);

// 👑 GỬI PROFILE HOST CHO VIEWER VỪA JOIN
if (role === "viewer" && room.hostProfile) {
  socket.emit("host-profile-sync", room.hostProfile);
}



    if (role === "broadcaster") {



       if (room.releaseTimer) {
    clearTimeout(room.releaseTimer);
    room.releaseTimer = null;
  }
  room.pendingRelease = false;

  const old = room.broadcasterId;
  room.broadcasterId = socket.id;


// 🔄 AUTO RESUME LIVE NẾU ĐANG LIVE TRƯỚC ĐÓ
if (room.liveStartTs) {
  // gửi lại mốc thời gian cho host
  socket.emit("live-resume", {
    startTs: room.liveStartTs
  });

  // báo cho viewer biết host đã quay lại
  io.to(roomId).emit("host-back-online");
}


       // ✅ Lưu profile host
    const name = String(profile?.name || "").trim().slice(0, 20);
    const avatar = String(profile?.avatar || "").trim();

 room.hostProfile = {
  uid: profile?.uid || socket.data.uid,   // 🔥 THÊM
  name: name || "Host",
  avatar: avatar || "",
  level: Number(profile?.level) || 1,
  ts: Date.now(),
};



      if (old && old !== socket.id) {
        io.to(roomId).emit("broadcaster-changed");
      }

      // Tell broadcaster current viewers list
      socket.emit("room-viewers", Array.from(room.viewers));
      socket.to(roomId).emit("broadcaster-online");
      emitViewerCount(roomId);
    }

    if (role === "viewer") {
      room.viewers.add(socket.id);
      emitViewerCount(roomId);
      emitLobbyUpdate();

      io.to(roomId).emit("viewer-join", { id: socket.id, count: room.viewers.size });

      if (room.broadcasterId) {
        io.to(room.broadcasterId).emit("watcher", { viewerId: socket.id, roomId });
        socket.emit("broadcaster-online");
      } else {
        socket.emit("broadcaster-offline");
      }
    }

    // If room is already live, send start timestamp to this socket (late joiners)
    if (room.liveStartTs) {
      socket.emit("live-start", { startTs: room.liveStartTs });
    }

    // If has pinned note, send to late joiner
    if (room.pinnedNote) {
      socket.emit("pin-note-update", room.pinnedNote);
    }
  

    // Gift stats for late joiners
    try{
      socket.emit("gift-stats", {
        totalCoins: room.giftTotal || 0,
        topDonors: roomGiftTop(room, 5)
      });
    }catch{}

});

 socket.on("chat", ({ roomId, text }) => {

  if (blockIfLocked(socket)) return;

  if (!roomId || !text) return;

  const room = getRoom(roomId);
  if (!room) return;

  const r = String(socket.data.role || "").toLowerCase();
  const role = (r === "broadcaster") ? "host" : "viewer";

  let profile = null;

  // 👑 HOST
  if (role === "host") {
    profile = room.hostProfile;
  }

  // 👀 VIEWER / GUEST → TÌM THEO socketId
  if (role !== "host") {
    for (const p of safeMap(room.viewerProfiles).values()) {
    if (p.socketId === socket.id) {
    profile = p;
    break;
  }
}
  }

  const msg = {
    role,
    name: profile?.name || "Ẩn danh",
    avatar: profile?.avatar,
    level: Number(profile?.level) || 1,
    text: String(text).slice(0, 300),
    ts: Date.now(),
  };

for (const v of safeMap(room.viewerProfiles).values()) {
  if (!v.mini) io.to(v.socketId).emit("chat", msg);
}

// host vẫn nhận
if (room.broadcasterId) io.to(room.broadcasterId).emit("chat", msg);

});




// ===== REACTIONS (emoji/hearts) =====
// client emits: { roomId, emoji, x, y }
socket.on("reaction", ({ roomId, emoji, x, y }) => {
  if(blockGuest(socket,"reaction")) return;   // 🔒



  if (!roomId) return;
  const em = String(emoji || "❤️").slice(0, 4);
  const msg = {
    emoji: em,
    x: typeof x === "number" ? x : Number(x),
    y: typeof y === "number" ? y : Number(y),
    ts: Date.now(),
  };

const room = getRoom(roomId);
if (!room) return;

for (const v of safeMap(room.viewerProfiles).values()) {
  if (!v.mini) io.to(v.socketId).emit("reaction", msg);
}

if (room.broadcasterId) io.to(room.broadcasterId).emit("reaction", msg);

});

  // ===== PIN NOTE (host creates custom pinned content + draggable position) =====
  function __clamp01(n){ n = Number(n); if (!isFinite(n)) return 0.5; return Math.max(0, Math.min(1, n)); }

  socket.on("pin-note-set", ({ roomId, text, x, y }) => {
if(blockGuest(socket,"pin")) return;


    if (!roomId) return;
    const room = getRoom(roomId);
    if (room.broadcasterId !== socket.id) return; // host only
    const t = String(text || "").trim().slice(0, 220);
    if (!t) return;
    const note = { text: t, x: __clamp01(x), y: __clamp01(y), ts: Date.now() };
    room.pinnedNote = note;

 for (const v of safeMap(room.viewerProfiles).values()) {
  if (!v.mini) io.to(v.socketId).emit("pin-note-update", note);
}

if (room.broadcasterId) io.to(room.broadcasterId).emit("pin-note-update", note);

  });

socket.on("pin-note-move", ({ roomId, x, y }) => {
  if(blockGuest(socket,"pin")) return;

  if (!roomId) return;
  const room = getRoom(roomId);
  if (!room || room.broadcasterId !== socket.id) return;
  if (!room.pinnedNote) return;

  room.pinnedNote.x = __clamp01(x);
  room.pinnedNote.y = __clamp01(y);
  room.pinnedNote.ts = Date.now();

  for (const v of safeMap(room.viewerProfiles).values()) {
  if (!v.mini) io.to(v.socketId).emit("pin-note-update", room.pinnedNote);
}


  if (room.broadcasterId) io.to(room.broadcasterId).emit("pin-note-update", room.pinnedNote);
});

 socket.on("pin-note-clear", ({ roomId }) => {
  if(blockGuest(socket,"pin")) return;

  if (!roomId) return;
  const room = getRoom(roomId);
  if (!room || room.broadcasterId !== socket.id) return;

  room.pinnedNote = null;

 for (const v of safeMap(room.viewerProfiles).values()) {
  if (!v.mini) io.to(v.socketId).emit("pin-note-update", null);
}



  if (room.broadcasterId) io.to(room.broadcasterId).emit("pin-note-update", null);
});

  // ===== /PIN NOTE =====


// ===== ANTI SPAM GIFT =====
const GIFT_COOLDOWN_MS = 1500; // 1.5s / lần gửi

const giftCooldown = new Map(); // key: socket.id

function canSendGift(socket) {
  const now = Date.now();
  const last = giftCooldown.get(socket.id) || 0;
  if (now - last < GIFT_COOLDOWN_MS) return false;
  giftCooldown.set(socket.id, now);
  return true;
}



// ===== GIFT ENGINE (paid gifts) =====
socket.on("send-gift", ({ roomId, gift, name }) => {

  if (blockIfLocked(socket)) return;   // 🚫 THÊM DÒNG NÀY

  if (blockGuest(socket, "gift")) return;

  roomId = normRoomId(roomId);
  if (!roomId || !gift) return;

  // 🚫 CHẶN SPAM
  if (!canSendGift(socket)) {
    socket.emit("gift-failed", {
      reason: "spam",
      message: "Bạn gửi quà quá nhanh ⏳"
    });
    return;
  }

  const room = getRoom(roomId);
  if (!room?.broadcasterId || !room.liveStartTs) return;

  const type = String(gift.type || "").toLowerCase();
  const catalog = GIFT_CATALOG[type];
  if (!catalog) return;

  const qty = clampInt(gift.qty ?? 1, 1, 999);
  const cost = catalog.cost * qty;

  // ===== WALLET CHECK (PERSIST users.json) =====
  const senderUid = socket.data.uid;
  if (!senderUid) return;

  const db = loadUsers();
  const sender = db[senderUid];
  if (!sender?.profile) return;

  const curCoins = clampInt(sender.profile.coins ?? 0, 0, 1_000_000_000);
  if (curCoins < cost) {
    socket.emit("gift-failed", {
      reason: "no_coins",
      need: cost,
      coins: curCoins
    });
    return;
  }

  // 🔥 TRỪ COIN THẬT
  sender.profile.coins = curCoins - cost;
  sender.profile.coinSent =
    (sender.profile.coinSent || 0) + cost;

  const hostUid = room.hostProfile?.uid;
  if (hostUid && db[hostUid]?.profile) {
    db[hostUid].profile.coinReceived =
      (db[hostUid].profile.coinReceived || 0) + cost;
  }

  // ===== 🎯 CỘNG EXP + LEVEL CHO NGƯỜI NHẬN QUÀ =====
if (hostUid && db[hostUid]?.profile) {
  const hp = db[hostUid].profile;

  // + EXP (1 coin = 1 exp)
  hp.exp = (hp.exp || 0) + cost;

  // ⬆️ LEVEL UP (loop để tránh miss nhiều level)
  let leveledUp = false;
  while (hp.exp >= (hp.level || 1) * 100) {
    hp.exp -= (hp.level || 1) * 100;
    hp.level = (hp.level || 1) + 1;
    leveledUp = true;
  }

  // 🔔 realtime sync cho host
  emitCoinUpdate(hostUid);

  // (optional) notify level up
  if (leveledUp) {
    pushNotify(hostUid, {
      type: "level-up",
      text: `🎉 Bạn đã lên cấp ${hp.level}!`
    });
  }
}

// ===== 💎 CỘNG EXP x2 CHO NGƯỜI TẶNG =====
if (senderUid && db[senderUid]?.profile) {
  const sp = db[senderUid].profile;

  // 🎁 donor nhận EXP gấp đôi
  sp.exp = (sp.exp || 0) + cost * 1.5;

  // ⬆️ LEVEL UP donor
  while (sp.exp >= (sp.level || 1) * 100) {
    sp.exp -= (sp.level || 1) * 100;
    sp.level = (sp.level || 1) + 1;
  }

  // 🔔 realtime sync cho donor
  emitCoinUpdate(senderUid);
}


  saveUsers(db);

  // 🔔 REALTIME WALLET
  emitCoinUpdate(senderUid);
  if (hostUid) emitCoinUpdate(hostUid);

  socket.data.coins = sender.profile.coins;
  socket.emit("wallet-update", { coins: sender.profile.coins });


  // ===== TÌM DONOR PROFILE =====
  let donorProfile = null;
  for (const p of safeMap(room.viewerProfiles).values()) {
    if (p.socketId === socket.id) {
      donorProfile = p;
      break;
    }
  }


  // ✅ SYNC COIN VÀO VIEWER PROFILE (để viewer list/mini profile đúng)
if (donorProfile) {
  donorProfile.coins = sender.profile.coins;
  donorProfile.coinSentRoom = (donorProfile.coinSentRoom || 0) + cost;
}


  const donorName = safeName(
    name || donorProfile?.name || socket.data.userName || "Ẩn danh"
  );

  // 🔒 SYNC DONOR PROFILE (RẤT QUAN TRỌNG)
  if (donorProfile) {
    donorProfile.coins = sender.profile.coins;
    donorProfile.coinSentRoom =
      (donorProfile.coinSentRoom || 0) + cost;
  }

  // 🔔 Notify host
  if (hostUid) {
    pushNotify(hostUid, {
      type: "gift",
      text: `${donorName} đã tặng ${cost} coin`
    });

    const sockets = activeUsers.get(hostUid);
    if (sockets) {
      for (const sid of sockets) {
        io.to(sid).emit("inbox-new");
      }
    }
  }

  // ===== UPDATE ROOM STATS =====
  room.giftTotal = clampInt(
    (room.giftTotal || 0) + cost,
    0,
    1_000_000_000
  );

  if (donorProfile?.uid) {
    room.giftByUser.set(
      donorProfile.uid,
      (room.giftByUser.get(donorProfile.uid) || 0) + cost
    );
  }

  // ===== SYNC VIEWER LIST =====
  const list = Array.from(safeMap(room.viewerProfiles).values());
  for (const v of list) {
    if (!v.mini) {
      io.to(v.socketId).emit("viewer-list", {
        viewers: list.filter(x => !x.mini)
      });
    }
  }

  // ===== EMIT GIFT EVENT =====
  const payload = {
    gift: {
      type,
      emoji: catalog.emoji,
      cost: catalog.cost,
      qty,
      coins: cost
    },
    donor: donorName,
    uid: donorProfile?.uid || senderUid,
    totalCoins: room.giftTotal,
    ts: Date.now()
  };

  for (const v of list) {
    if (!v.mini) io.to(v.socketId).emit("gift", payload);
  }
  if (room.broadcasterId) {
    io.to(room.broadcasterId).emit("gift", payload);
  }

  // stats
  for (const v of list) {
    if (!v.mini) {
      io.to(v.socketId).emit("gift-stats", {
        totalCoins: room.giftTotal,
        topDonors: roomGiftTop(room, 5)
      });
    }
  }
  if (room.broadcasterId) {
    io.to(room.broadcasterId).emit("gift-stats", {
      totalCoins: room.giftTotal,
      topDonors: roomGiftTop(room, 5)
    });
  }

});


socket.on("host-stream-ready", ({ roomId }) => {
  const room = getRoom(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return;

  room.streamReady = true;

  // 🔔 báo cho viewer đang đợi
  io.to(roomId).emit("host-stream-ready");
});


  // WebRTC signaling passthrough
  socket.on("offer", ({ to, description }) => {
    io.to(to).emit("offer", { from: socket.id, description });
  });

  socket.on("answer", ({ to, description }) => {
    io.to(to).emit("answer", { from: socket.id, description });
  });

  socket.on("candidate", ({ to, candidate }) => {
    io.to(to).emit("candidate", { from: socket.id, candidate });
  });

  socket.on("disconnect", () => {



    



const uid = socket.data.uid;
if (uid && activeUsers.has(uid)) {
  const set = activeUsers.get(uid);
  set.delete(socket.id);

  if (set.size === 0) {
    activeUsers.delete(uid);
  }

  emitActiveUsers();
}




  const roomId = socket.data.roomId;
  const role = socket.data.role;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  /* ========= VIEWER ========= */
  if (role === "viewer") {
    // xoá khỏi viewers set
    room.viewers.delete(socket.id);

    // xoá profile viewer
   for (const [uid, profile] of safeMap(room.viewerProfiles).entries()) {
  if (profile.socketId === socket.id) {
    room.viewerProfiles.delete(uid);
    break;
  }
}


    emitViewerCount(roomId);

const list = Array.from(safeMap(room.viewerProfiles).values());


for (const v of list) {
  if (v.mini) continue;   // ⛔ viewer thu nhỏ không nhận
  io.to(v.socketId).emit("viewer-list", {
    viewers: list.filter(x => !x.mini)
  });
}


    emitLobbyUpdate();
   

  }




  /* ========= HOST ========= */
  if (role === "broadcaster") {
    room.streamReady = false;
    room.pendingRelease = true;

 room.releaseTimer = setTimeout(() => {
  // ⛔ CHỈ đóng room nếu host KHÔNG quay lại
  if (room.pendingRelease && !room.broadcasterId) {
    closeRoom(roomId, "host_timeout");
  }
}, ROOM_RELEASE_DELAY);


    io.to(roomId).emit("host-temp-offline");

  

  }



// ===== SOCKET DISCONNECT TRACK =====

if (uid) {
  const set = activeUsers.get(uid);
  if (set) {
    set.delete(socket.id);
    if (set.size === 0) {
      activeUsers.delete(uid);

      // ⚪ AGENT OFFLINE REALTIME
      emitAgentStatus(uid, false);
    }
  }
}

  

  /* ========= CLEAN ROOM ========= */
/*
 if (!room.broadcasterId && safeSet(room.viewers).size === 0) {
  rooms.delete(roomId);
}
*/
});



});





app.get("/lobby", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "lobby.html"));
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


// ⏱ kiểm tra gian hết hạn mỗi 60 giây
setInterval(()=>{
  try{
    cleanupExpiredBooths();
  }catch(e){
    console.error("cleanupExpiredBooths error", e);
  }
}, 60 * 1000);





