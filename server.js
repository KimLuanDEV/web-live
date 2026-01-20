

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


const webpush = require("web-push");

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


const AVATAR_DIR = "/opt/render/project/data/avatars";

if(!fs.existsSync(AVATAR_DIR)){
  fs.mkdirSync(AVATAR_DIR, { recursive:true });
  console.log("📁 Created", AVATAR_DIR);
}



const INBOX_FILE = "/opt/render/project/data/inbox.json";

function loadInbox(){
  if(!fs.existsSync(INBOX_FILE)) return {};
  return JSON.parse(fs.readFileSync(INBOX_FILE,"utf8"));
}

function saveInbox(db){
  fs.writeFileSync(INBOX_FILE, JSON.stringify(db,null,2));
}

let userInbox = new Map(Object.entries(loadInbox()));




const upload = multer({
  storage: multer.diskStorage({
    destination: "/opt/render/project/data/avatars",
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, Date.now() + "_" + Math.random().toString(36).slice(2) + ext);
    }
  })
});






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




const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));
app.use("/post-images", express.static("/opt/render/project/data/post-images"));
app.use("/post-videos", express.static("/opt/render/project/data/post-videos"));
app.use("/avatars", express.static("/opt/render/project/data/avatars"));


app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "poster.html"));
});

app.post("/api/upload-avatar", upload.single("avatar"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.json({ url: "/avatars/" + req.file.filename });
});


const postUpload = multer({
  storage: multer.diskStorage({
    destination: "/opt/render/project/data/post-images",
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, Date.now() + "_" + Math.random().toString(36).slice(2) + ext);
    }
  })
});

app.post("/api/upload-post-image", postUpload.single("image"), (req,res)=>{
  if(!req.file) return res.status(400).json({error:"no file"});
  res.json({ url: "/post-images/" + req.file.filename });
});


const postVideoUpload = multer({
  storage: multer.diskStorage({
    destination: "/opt/render/project/data/post-videos",

    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, Date.now() + "_" + Math.random().toString(36).slice(2) + ext);
    }
  }),
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB (tối đa nên dùng)

});

app.post("/api/upload-post-video", postVideoUpload.single("video"), (req,res)=>{
  if(!req.file) return res.status(400).json({error:"no file"});
  res.json({ url: "/post-videos/" + req.file.filename });
});


const rooms = new Map();

// ===== LIVESTREAM PRO SOCIAL =====
const lpPosts = loadSocial();



const activeUsers = new Map();   // uid -> Set(socketId)



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
      name: displayName,        // ✅ Tên hiển thị
      avatar:
        profile.avatar ||
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
    const p = db[uid].profile || {};
    list.push({
      uid,
      name: p.name || uid,
      avatar: p.avatar || "",
      level: p.level || 1
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


app.use(express.json());

webpush.setVapidDetails(
  "mailto:admin@livestream.pro",
  process.env.VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
);

// uid -> Set<subscription>
const pushSubs = new Map();




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
  profile: acc.profile,
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



app.get("/api/all-users", (req,res)=>{
  const db = loadUsers();
  const list = [];

  for(const uid in db){
    const p = db[uid].profile || {};
    list.push({
      uid,
      name: p.name || uid,
      avatar: p.avatar || "https://api.dicebear.com/7.x/thumbs/svg?seed=" + uid,
      level: p.level || 1,
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

socket.on("friend-request", ({ to }) => {
  const from = socket.data.uid;
  if (!from || !to || from === to) return;

  const db = loadUsers();
  const uFrom = db[from];
  const uTo = db[to];
  if (!uFrom || !uTo) return;

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




socket.on("private-message", async ({ to, text, msgId }) => {

  const fromUid = socket.data.uid;
  if (!fromUid || !to || !text) return;

  const id = msgId || Date.now() + "_" + Math.random();

  const msg = {
    id,
    from: fromUid,
    to,
    text,
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
        text,
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
    title: "💬 Tin nhắn mới",
    body: `${fromUser?.profile?.name || fromUid}: ${text}`,
    url: "/messages.html"
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
      avatar: u.profile.avatar,
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


socket.on("profile-update", ({ name, avatar, level }) => {

  // ===== 1. Cập nhật profile realtime cho lobby =====
  if (!socket.data.profile) socket.data.profile = {};
  if (name)   socket.data.profile.name   = safeName(name);
  if (avatar) socket.data.profile.avatar = avatar;
  if (level)  socket.data.profile.level  = Number(level) || socket.data.profile.level;

  // ===== 2. Lưu vĩnh viễn vào users.json =====
  const uid = socket.data.uid;
  if (uid) {
    const db = loadUsers();
    for (const k in db) {
      if (db[k].profile?.uid === uid) {
        if (name)   db[k].profile.name   = safeName(name);
        if (avatar) db[k].profile.avatar = avatar;
        if (level)  db[k].profile.level  = Number(level) || db[k].profile.level;
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
  socket.data.role = "viewer";

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



  if(blockGuest(socket,"gift")) return;   // 🔒 GUEST KHÔNG ĐƯỢC TẶNG QUÀ

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
  if (!room.broadcasterId || !room.liveStartTs) return;

  const type = String(gift.type || "").toLowerCase();
  const catalog = GIFT_CATALOG[type];
  if (!catalog) return;

  const qty = clampInt(gift.qty ?? 1, 1, 999);
  const cost = catalog.cost * qty;

  // ===== WALLET CHECK =====
  const cur = clampInt(socket.data.coins ?? START_COINS, 0, 1_000_000_000);
  if (cur < cost) {
    socket.emit("gift-failed", { reason: "no_coins", need: cost, coins: cur });
    return;
  }

  socket.data.coins = cur - cost;
  socket.emit("wallet-update", { coins: socket.data.coins });

  // ===== TÌM PROFILE THEO SOCKET.ID (CHUẨN) =====
 let donorProfile = null;
for (const p of safeMap(room.viewerProfiles).values()) {
  if (p.socketId === socket.id) {
    donorProfile = p;
    break;
  }
}


  const donorName = safeName(name || donorProfile?.name || socket.data.userName || "Ẩn danh");
  const uid = donorProfile?.uid;

// 🔔 Notify host khi nhận quà
const hostUid = room.hostProfile?.uid;
if(hostUid){
  pushNotify(hostUid,{
    type:"gift",
    text:`${donorName} đã tặng ${cost} coin`
  });

 const sockets = activeUsers.get(hostUid);
if (sockets) {
  for (const sid of sockets) {
    io.to(sid).emit("inbox-new");
  }
}

}



  // ===== UPDATE DONOR PROFILE =====
  if (donorProfile && uid) {
    donorProfile.coinSentRoom = (donorProfile.coinSentRoom || 0) + cost;

    // giftByUser LUÔN DÙNG UID
    room.giftByUser.set(uid, (room.giftByUser.get(uid) || 0) + cost);
  }

  // ===== UPDATE ROOM STATS =====
  room.giftTotal = clampInt((room.giftTotal || 0) + cost, 0, 1_000_000_000);

  // ===== SYNC VIEWER LIST (mini profile / avatar) =====
 const list = Array.from(safeMap(room.viewerProfiles).values());


for (const v of list) {
  if (v.mini) continue;   // ⛔ viewer thu nhỏ không nhận
  io.to(v.socketId).emit("viewer-list", {
    viewers: list.filter(x => !x.mini)
  });
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
    uid, // 👈 thêm để client nếu cần
    totalCoins: room.giftTotal,
    ts: Date.now(),
  };

 // gift
for (const v of list) {
  if (!v.mini) io.to(v.socketId).emit("gift", payload);
}
if (room.broadcasterId) io.to(room.broadcasterId).emit("gift", payload);

  // stats
for (const v of list) {
  if (!v.mini) io.to(v.socketId).emit("gift-stats", {
    totalCoins: room.giftTotal,
    topDonors: roomGiftTop(room, 5)
  });
}
if (room.broadcasterId) io.to(room.broadcasterId).emit("gift-stats", {
  totalCoins: room.giftTotal,
  topDonors: roomGiftTop(room, 5)
});

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
