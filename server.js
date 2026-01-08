const ROOM_RELEASE_DELAY = 15000; // 15 giây (tuỳ bạn)

const multer = require("multer");
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const twilio = require("twilio");


const fs = require("fs");

const LIVE_STATE_FILE = path.join(__dirname, "live_state.json");


const upload = multer({
  storage: multer.diskStorage({
    destination: "public/avatars",
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, Date.now() + ext);
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



const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "poster.html"));
});

app.post("/api/upload-avatar", upload.single("avatar"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.json({ url: "/avatars/" + req.file.filename });
});



const rooms = new Map();


// ♻️ RESTORE LIVE ROOMS AFTER SERVER RESTART
const persisted = loadLiveState();

for (const roomId in persisted) {
  const data = persisted[roomId];
  rooms.set(roomId, {
    broadcasterId: null,        // chờ host quay lại
    viewers: new Set(),
    liveStartTs: data.liveStartTs,
    pinnedNote: data.pinnedNote || null,
    hostProfile: data.hostProfile || null,
    giftTotal: data.giftTotal || 0,
    giftByUser: new Map(data.giftByUser || []),
    releaseTimer: null,
    pendingRelease: false,
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


const START_COINS = 200000; // coin mặc định cho mỗi người (demo)
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
    for (const [k,v] of room.giftByUser.entries()){
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


function getRoom(roomId) {
  roomId = normRoomId(roomId);
  if (!rooms.has(roomId)) {
   rooms.set(roomId, {
  broadcasterId: null,
  viewers: new Set(),
  viewerProfiles: new Map(), // 👈 thêm
  liveStartTs: null,
  pinnedNote: null,
  hostProfile: null,
  giftTotal: 0,
  giftByUser: new Map(),
  releaseTimer: null,        // ⏱️ timer giải phóng
  pendingRelease: false,     // đang chờ giải phóng?
});

  }
  return rooms.get(roomId);
}


function emitViewerCount(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit("viewer-count", { count: room.viewers.size });
}


/* ===== LOBBY (SẢNH CHỜ) ===== */
function getLobbyList() {
  const list = [];
  for (const [roomId, room] of rooms.entries()) {
    // điều kiện "đang live": có host + đã live-start
    if (room.broadcasterId && room.liveStartTs) {
      list.push({
  roomId,
  viewers: room.viewers.size,
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


function closeRoom(roomId, reason = "host_left") {

  const state = loadLiveState();
delete state[roomId];
saveLiveState(state);


  const room = rooms.get(roomId);
  if (!room) return;

  // 🚨 báo cho toàn bộ viewer + guest
  io.to(roomId).emit("room-closed", { reason });

  // clear state
  room.broadcasterId = null;
  room.liveStartTs = null;
  room.viewers.clear();

  
  room.giftTotal = 0;
  room.giftByUser = new Map();
emitLobbyUpdate();

  // xoá room sau 1 chút cho client kịp nhận event
  setTimeout(() => {
    rooms.delete(roomId);
  }, 1000);
}


io.on("connection", (socket) => {

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
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const room = getRoom(roomId);
  if (!room) return;

  // 🚫 CHẶN HOST
  if (room.broadcasterId === socket.id) {
    console.warn("⛔ Host không được dùng profile-update");
    return;
  }

  // 🔑 LẤY PROFILE VIEWER
  const profile = room.viewerProfiles.get(
    [...room.viewerProfiles.keys()].find(
      uid => room.viewerProfiles.get(uid).socketId === socket.id
    )
  );

  if (!profile) return;

  if (name) profile.name = safeName(name);
  if (avatar) profile.avatar = avatar;
  if (level) profile.level = Number(level) || profile.level;

  io.to(roomId).emit("viewer-list", {
    viewers: Array.from(room.viewerProfiles.values())
  });
});





socket.on("viewer-join", ({ roomId, profile }) => {
  roomId = normRoomId(roomId);
  if (!roomId) return;

  const room = getRoom(roomId);
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
    avatar: profile?.avatar || "https://img.freepik.com/premium-vector/live-streaming-text-neon-sign-illustration_189374-265.jpg?w=360",
    level: Number(profile?.level) || 1,
    coins: Number(profile?.coins) || 0,
    coinSentRoom: old?.coinSentRoom || room.giftByUser.get(uid) || 0,
    coinReceivedRoom: old?.coinReceivedRoom || 0
  });

  emitViewerCount(roomId);

  // ✅ CHỈ emit 1 lần cho cả phòng (đỡ spam)
  io.to(roomId).emit("viewer-list", {
    viewers: Array.from(room.viewerProfiles.values())
  });

  emitLobbyUpdate();
});




socket.on("resume-viewers", ({ roomId }) => {
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return;

  // gửi danh sách viewer hiện tại cho host
  socket.emit("resume-viewers-list", {
    viewers: Array.from(room.viewers)
  });
});




socket.on("host-start-live", ({ roomId }) => {
  const room = getRoom(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return;

  if (!room.liveStartTs) {
    room.liveStartTs = Date.now();
  }

  io.to(roomId).emit("host-live", {
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
  if (room.broadcasterId !== socket.id) return;

  // ✅ SET 1 LẦN DUY NHẤT
  if (!room.liveStartTs) {
    room.liveStartTs = Date.now();
  }

// 💾 persist live state
const state = loadLiveState();
state[roomId] = {
  liveStartTs: room.liveStartTs,
  hostProfile: room.hostProfile,
  pinnedNote: room.pinnedNote,
  giftTotal: room.giftTotal,
  giftByUser: Array.from(room.giftByUser.entries()),
};
saveLiveState(state);


  // báo cho toàn bộ phòng
  io.to(roomId).emit("live-start", {
    startTs: room.liveStartTs
  });

  emitLobbyUpdate();
});


socket.on("live-stop", ({ roomId }) => {
  if (!roomId) return;
  const room = getRoom(roomId);
  if (room.broadcasterId !== socket.id) return;

// 📊 Thống kê buổi live
  const stats = {
    durationMs: room.liveStartTs ? Date.now() - room.liveStartTs : 0,
    viewers: room.viewers.size,
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
  name: name || "Host",
  avatar: avatar || "",
  level: Number(profile?.level) || 1,   // 🔥 FIX QUAN TRỌNG
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
    for (const p of room.viewerProfiles.values()) {
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

  io.to(roomId).emit("chat", msg);
});




// ===== REACTIONS (emoji/hearts) =====
// client emits: { roomId, emoji, x, y }
socket.on("reaction", ({ roomId, emoji, x, y }) => {
  if (!roomId) return;
  const em = String(emoji || "❤️").slice(0, 4);
  const msg = {
    emoji: em,
    x: typeof x === "number" ? x : Number(x),
    y: typeof y === "number" ? y : Number(y),
    ts: Date.now(),
  };
  io.to(roomId).emit("reaction", msg);
});

  // ===== PIN NOTE (host creates custom pinned content + draggable position) =====
  function __clamp01(n){ n = Number(n); if (!isFinite(n)) return 0.5; return Math.max(0, Math.min(1, n)); }

  socket.on("pin-note-set", ({ roomId, text, x, y }) => {
    if (!roomId) return;
    const room = getRoom(roomId);
    if (room.broadcasterId !== socket.id) return; // host only
    const t = String(text || "").trim().slice(0, 220);
    if (!t) return;
    const note = { text: t, x: __clamp01(x), y: __clamp01(y), ts: Date.now() };
    room.pinnedNote = note;
    io.to(roomId).emit("pin-note-update", note);
  });

  socket.on("pin-note-move", ({ roomId, x, y }) => {
    if (!roomId) return;
    const room = getRoom(roomId);
    if (room.broadcasterId !== socket.id) return; // host only
    if (!room.pinnedNote) return;
    room.pinnedNote.x = __clamp01(x);
    room.pinnedNote.y = __clamp01(y);
    room.pinnedNote.ts = Date.now();
    io.to(roomId).emit("pin-note-update", room.pinnedNote);
  });

  socket.on("pin-note-clear", ({ roomId }) => {
    if (!roomId) return;
    const room = getRoom(roomId);
    if (room.broadcasterId !== socket.id) return; // host only
    room.pinnedNote = null;
    io.to(roomId).emit("pin-note-update", null);
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
  for (const p of room.viewerProfiles.values()) {
    if (p.socketId === socket.id) {
      donorProfile = p;
      break;
    }
  }

  const donorName = safeName(name || donorProfile?.name || socket.data.userName || "Ẩn danh");
  const uid = donorProfile?.uid;

  // ===== UPDATE DONOR PROFILE =====
  if (donorProfile && uid) {
    donorProfile.coinSentRoom = (donorProfile.coinSentRoom || 0) + cost;

    // giftByUser LUÔN DÙNG UID
    room.giftByUser.set(uid, (room.giftByUser.get(uid) || 0) + cost);
  }

  // ===== UPDATE ROOM STATS =====
  room.giftTotal = clampInt((room.giftTotal || 0) + cost, 0, 1_000_000_000);

  // ===== SYNC VIEWER LIST (mini profile / avatar) =====
  io.to(roomId).emit("viewer-list", {
    viewers: Array.from(room.viewerProfiles.values())
  });

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

  io.to(roomId).emit("gift", payload);
  io.to(roomId).emit("gift-stats", {
    totalCoins: room.giftTotal,
    topDonors: roomGiftTop(room, 5)
  });
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
    for (const [uid, profile] of room.viewerProfiles.entries()) {
      if (profile.socketId === socket.id) {
        room.viewerProfiles.delete(uid);
        break;
      }
    }

    emitViewerCount(roomId);

    io.to(roomId).emit("viewer-list", {
      viewers: Array.from(room.viewerProfiles.values())
    });

    emitLobbyUpdate();
  }

  /* ========= HOST ========= */
  if (role === "broadcaster") {
    room.pendingRelease = true;

    room.releaseTimer = setTimeout(() => {
      if (room.pendingRelease) {
        closeRoom(roomId, "host_left");
      }
    }, ROOM_RELEASE_DELAY);

    io.to(roomId).emit("host-temp-offline");
  }

  /* ========= CLEAN ROOM ========= */
  if (!room.broadcasterId && room.viewers.size === 0) {
    rooms.delete(roomId);
  }
});



});


app.get("/lobby", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "lobby.html"));
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
