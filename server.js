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
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * Room state:
 * - broadcasterId: socket.id người phát
 * - viewers: Set socket.id người xem
 * - guestId: socket.id guest đang "lên live" (co-host)
 */
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { broadcasterId: null, viewers: new Set(), guestId: null });
  }
  return rooms.get(roomId);
}

function emitViewerCount(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit("viewer-count", { count: room.viewers.size });
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

io.on("connection", (socket) => {

// Host yêu cầu tắt/bật mic của guest
socket.on("host-mute-guest", ({ roomId, mute }) => {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return;   // chỉ host mới được điều khiển

  if (!room.guestId) return;
  io.to(room.guestId).emit("guest-set-mic", { mute: !!mute });
});

// Host yêu cầu tắt/bật camera của guest
socket.on("host-cam-guest", ({ roomId, off }) => {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return; // chỉ host mới được điều khiển
  if (!room.guestId) return;

  io.to(room.guestId).emit("guest-set-cam", { off: !!off });
});


// Host kick guest khỏi live
socket.on("host-kick-guest", ({ roomId }) => {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return;

  if (!room.guestId) return;
  const gid = room.guestId;

  // báo guest tự thoát
  io.to(gid).emit("guest-kicked");

  // clear guest trong room + báo cho tất cả viewers
  room.guestId = null;
  io.to(roomId).emit("guest-offline");
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
  socket.on("join-room", ({ roomId, role }) => {
    if (!roomId || !role) return;

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = role;

    const room = getRoom(roomId);

    if (role === "broadcaster") {
      const old = room.broadcasterId;
      room.broadcasterId = socket.id;

      if (old && old !== socket.id) {
        io.to(roomId).emit("broadcaster-changed");
      }

      // Tell broadcaster current viewers list
      socket.emit("room-viewers", Array.from(room.viewers));
      socket.to(roomId).emit("broadcaster-online");
      emitViewerCount(roomId);
      // If already has guest, tell host
      if (room.guestId) socket.emit("guest-online", { guestId: room.guestId });
    }

    if (role === "viewer") {
      room.viewers.add(socket.id);
      emitViewerCount(roomId);

      if (room.broadcasterId) {
        io.to(room.broadcasterId).emit("watcher", { viewerId: socket.id, roomId });
        socket.emit("broadcaster-online");
      } else {
        socket.emit("broadcaster-offline");
      }

      // If guest already online, inform this viewer so they can request to watch guest
      if (room.guestId) socket.emit("guest-online", { guestId: room.guestId });
    }

    if (role === "guest") {
      // Guest requests to go live; host must approve
      if (room.broadcasterId) {
        io.to(room.broadcasterId).emit("guest-request", { guestId: socket.id, roomId });
      }
      socket.emit("guest-pending");
    }
  });

  // ===== CHAT REALTIME =====
  socket.on("chat", ({ roomId, name, text }) => {
    if (!roomId || !text) return;

    const msg = {
      name: (name || "Ẩn danh").slice(0, 20),
      text: String(text).slice(0, 300),
      ts: Date.now(),
    };

    io.to(roomId).emit("chat", msg);
  });

  // ===== GUEST CO-HOST FLOW =====
  // Host approves guest: guest becomes room.guestId; all clients get guest-online
  socket.on("guest-approve", ({ roomId, guestId }) => {
    if (!roomId || !guestId) return;
    const room = getRoom(roomId);
    if (room.broadcasterId !== socket.id) return;

    room.guestId = guestId;
    io.to(guestId).emit("guest-approved", { roomId });
    io.to(roomId).emit("guest-online", { guestId });
  });

  socket.on("guest-reject", ({ guestId }) => {
    if (!guestId) return;
    io.to(guestId).emit("guest-rejected");
  });

  // Any viewer (or host) asks to watch guest -> server tells guest to create offer to that viewer
  socket.on("watch-guest", ({ roomId }) => {
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room.guestId) return;
    io.to(room.guestId).emit("guest-watcher", { viewerId: socket.id, roomId });
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

    if (role === "viewer") {
      room.viewers.delete(socket.id);
      emitViewerCount(roomId);
      if (room.broadcasterId) {
        io.to(room.broadcasterId).emit("disconnectPeer", { peerId: socket.id });
      }
    }

    if (role === "broadcaster") {
      if (room.broadcasterId === socket.id) {
        room.broadcasterId = null;
        io.to(roomId).emit("broadcaster-offline");
      }
    }

    if (role === "guest") {
      if (room.guestId === socket.id) {
        room.guestId = null;
        io.to(roomId).emit("guest-offline");
      }
    }

    if (!room.broadcasterId && room.viewers.size === 0 && !room.guestId) {
      rooms.delete(roomId);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
