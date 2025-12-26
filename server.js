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
    rooms.set(roomId, { broadcasterId: null, viewers: new Set(), guests: new Set(), pendingGuests: new Set() });
  }
  return rooms.get(roomId);
}


function emitGuestList(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit("guest-list", { guests: Array.from(room.guests) });
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
socket.on("host-mute-guest", ({ roomId, guestId, mute }) => {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return; // chỉ host mới được điều khiển

  const gid = guestId && room.guests.has(guestId) ? guestId : null;
  if (!gid) return;
  io.to(gid).emit("guest-set-mic", { mute: !!mute });
});

// Host kick guest khỏi live
socket.on("host-kick-guest", ({ roomId, guestId }) => {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.broadcasterId !== socket.id) return;

  const gid = guestId && room.guests.has(guestId) ? guestId : null;
  if (!gid) return;

  // báo guest tự thoát
  io.to(gid).emit("guest-kicked");

  // remove guest + báo cho tất cả clients
  room.guests.delete(gid);
  io.to(roomId).emit("guest-offline", { guestId: gid });
  emitGuestList(roomId);
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
      // If already has guests, tell host
      if (room.guests.size) socket.emit("guest-list", { guests: Array.from(room.guests) });
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

      // If guests already online, inform this viewer so they can request to watch guests
      if (room.guests.size) socket.emit("guest-list", { guests: Array.from(room.guests) });
    }

    if (role === "guest") {
      // Guest requests to go live; host must approve
      room.pendingGuests.add(socket.id);
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

    // limit 4 guests
    if (room.guests.size >= 4) {
      io.to(guestId).emit("guest-rejected", { reason: "Room full" });
      return;
    }

    room.pendingGuests.delete(guestId);
    room.guests.add(guestId);

    io.to(guestId).emit("guest-approved", { roomId });
    io.to(roomId).emit("guest-online", { guestId });
    emitGuestList(roomId);
  });

  socket.on("guest-reject", ({ roomId, guestId }) => {
    if (!guestId) return;
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) room.pendingGuests.delete(guestId);
    }
    io.to(guestId).emit("guest-rejected");
  });

  // Any viewer (or host) asks to watch guest -> server tells guest to create offer to that viewer
  socket.on("watch-guest", ({ roomId, guestId }) => {
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room.guests.size) return;

    // If guestId provided -> watch one guest; else watch all guests
    if (guestId) {
      if (!room.guests.has(guestId)) return;
      io.to(guestId).emit("guest-watcher", { viewerId: socket.id, roomId });
      return;
    }
    for (const gid of room.guests) {
      io.to(gid).emit("guest-watcher", { viewerId: socket.id, roomId });
    }
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
      room.pendingGuests.delete(socket.id);
      if (room.guests.has(socket.id)) {
        room.guests.delete(socket.id);
        io.to(roomId).emit("guest-offline", { guestId: socket.id });
        emitGuestList(roomId);
      }
    }

    if (!room.broadcasterId && room.viewers.size === 0 && room.guests.size === 0 && room.pendingGuests.size === 0) {
      rooms.delete(roomId);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
