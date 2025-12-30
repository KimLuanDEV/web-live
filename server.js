const ROOM_RELEASE_DELAY = 15000; // 15 giây (tuỳ bạn)


const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const twilio = require("twilio");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "lobby.html"));
});



const rooms = new Map();






function normRoomId(roomId) {
  return String(roomId || "").trim().toLowerCase();
}


function getRoom(roomId) {
  roomId = normRoomId(roomId);
  if (!rooms.has(roomId)) {
   rooms.set(roomId, {
  broadcasterId: null,
  viewers: new Set(),
  guestIds: [],
  pendingGuestIds: [],
  liveStartTs: null,
  pinnedNote: null,
  hostProfile: null,

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
  hasGuest: !!(room.guestIdss && room.guestIdss.length),
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
  const room = rooms.get(roomId);
  if (!room) return;

  // 🚨 báo cho toàn bộ viewer + guest
  io.to(roomId).emit("room-closed", { reason });

  // clear state
  room.broadcasterId = null;
  room.guestIdss = [];
  room.pendingGuestIds = [];
  room.liveStartTs = null;
  room.viewers.clear();

  emitLobbyUpdate();

  // xoá room sau 1 chút cho client kịp nhận event
  setTimeout(() => {
    rooms.delete(roomId);
  }, 1000);
}


io.on("connection", (socket) => {

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


socket.on("host-update-profile", ({ roomId, name }) => {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return;

  room.hostProfile = {
    name: String(name || "Host").slice(0, 20),
    avatar: "", // ❌ không dùng nữa
    ts: Date.now(),
  };

  io.to(roomId).emit("host-profile-update", room.hostProfile);
  emitLobbyUpdate();
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


// Host yêu cầu tắt/bật mic của guest
socket.on("host-mute-guest", ({ roomId, guestId, mute }) => {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return;   // chỉ host mới được điều khiển

  const gid = guestId || (room.guestIdss && room.guestIdss[0]);
  if (!gid) return;
  io.to(gid).emit("guest-set-mic", { mute: !!mute });
});
});

// Host yêu cầu tắt/bật camera của guest
socket.on("host-cam-guest", ({ roomId, guestId, off }) => {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return; // chỉ host mới được điều khiển

  const gid = guestId || (room.guestIdss && room.guestIdss[0]);
  if (!gid) return;

  io.to(gid).emit("guest-set-cam", { off: !!off });
});
});


// Host kick guest khỏi live
socket.on("host-kick-guest", ({ roomId, guestId }) => {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return;

  const gid = guestId || (room.guestIdss && room.guestIdss[0]);
  if (!gid) return;

  io.to(gid).emit("guest-kicked");

  room.guestIdss = (room.guestIdss || []).filter(x => x !== gid);
  room.pendingGuestIds = (room.pendingGuestIds || []).filter(x => x !== gid);

  io.to(roomId).emit("guest-offline", { guestId: gid, guestIds: room.guestIdss });
  emitLobbyUpdate();
});
// ===== LIVE TIMER (server-side source of truth) =====
// Host starts live => store start timestamp; late joiners will receive it.
socket.on("live-start", ({ roomId, startTs }) => {
  if (!roomId) return;
  const room = getRoom(roomId);
  if (room.broadcasterId !== socket.id) return; // only host can start
  const ts = typeof startTs === "number" ? startTs : Date.now();
  room.liveStartTs = ts;
  io.to(roomId).emit("live-start", { startTs: ts });
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
    hasGuest: !!(room.guestIdss && room.guestIdss.length),
  };

  // ⛔ dừng live
  room.liveStartTs = null;

  // 🔔 gửi cho riêng HOST
  socket.emit("live-ended-stats", stats);

  emitLobbyUpdate();


  closeRoom(roomId, "host_stop");
});







  // Host calls this after starting camera so server re-pings existing viewers
  socket.on("broadcaster-ready", ({ roomId }) => {
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || room.broadcasterId !== socket.id) return;

    for (const vid of room.viewers) {
      io.to(room.broadcasterId).emit("watcher", { viewerId: vid, roomId });
    }
    io.to(roomId).emit("broadcaster-online");
  });

  // Join room with role: broadcaster | viewer | guest
  socket.on("join-room", ({ roomId, role, profile }) => {
     roomId = normRoomId(roomId);
    if (!roomId || !role) return;

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = role;

    const room = getRoom(roomId);

    if (role === "broadcaster") {
       if (room.releaseTimer) {
    clearTimeout(room.releaseTimer);
    room.releaseTimer = null;
  }
  room.pendingRelease = false;

  const old = room.broadcasterId;
  room.broadcasterId = socket.id;

       // ✅ Lưu profile host
    const name = String(profile?.name || "").trim().slice(0, 20);
    const avatar = String(profile?.avatar || "").trim().slice(0, 300);
    room.hostProfile = {
      name: name || "Host",
      avatar: avatar || "",
      ts: Date.now(),
    };

      if (old && old !== socket.id) {
        io.to(roomId).emit("broadcaster-changed");
      }

      // Tell broadcaster current viewers list
      socket.emit("room-viewers", Array.from(room.viewers));
      socket.to(roomId).emit("broadcaster-online");
      emitViewerCount(roomId);
      // If already has guests, tell host
      if (room.guestIdss && room.guestIdss.length) socket.emit("guest-online", { guestIds: room.guestIdss });
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

      // If guests already online, inform this viewer so they can request to watch guest(s)
      if (room.guestIdss && room.guestIdss.length) socket.emit("guest-online", { guestIds: room.guestIdss });
    }

    if (role === "guest") {
      room.pendingGuestIds = (room.pendingGuestIds || []).filter(x => x !== socket.id);
      const wasActive = (room.guestIds || []).includes(socket.id);
      room.guestIds = (room.guestIds || []).filter(x => x !== socket.id);

      emitLobbyUpdate();

      if (wasActive) {
        io.to(roomId).emit("guest-offline", { guestId: socket.id, guestIds: room.guestIds });
      }
      if (room.broadcasterId) io.to(room.broadcasterId).emit("guest-pending-list", { pending: room.pendingGuestIds });
    }

    if (!room.broadcasterId && room.viewers.size === 0 && !(room.guestIds && room.guestIds.length)) {
      rooms.delete(roomId);
    }
  });
});


app.get("/lobby", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "lobby.html"));
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
