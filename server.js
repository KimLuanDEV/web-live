
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

const rooms = new Map();

function normalizeProfile(p = {}) {
  return {
    name: String(p.name || "User").trim().slice(0, 20),
    avatar: String(p.avatar || "").trim().slice(0, 500),
    ts: Date.now(),
  };
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      broadcasterId: null,
      viewers: new Set(),
      guestId: null,
      liveStartTs: null,
      pinnedNote: null,
      hostProfile: null,
    });
  }
  return rooms.get(roomId);
}

function emitViewerCount(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit("viewer-count", { count: room.viewers.size });
}

function getLobbyList() {
  const list = [];
  for (const [roomId, room] of rooms.entries()) {
    if (room.broadcasterId && room.liveStartTs) {
      list.push({
        roomId,
        viewers: room.viewers.size,
        liveStartTs: room.liveStartTs,
        hasGuest: !!room.guestId,
        host: room.hostProfile || null,
      });
    }
  }
  list.sort((a, b) => (b.viewers - a.viewers) || (b.liveStartTs - a.liveStartTs));
  return list;
}

function emitLobbyUpdate() {
  io.emit("lobby-update", { rooms: getLobbyList(), ts: Date.now() });
}

app.get("/ice", async (_req, res) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      return res.status(500).json({ error: "Missing TWILIO creds" });
    }
    const client = twilio(accountSid, authToken);
    const token = await client.tokens.create();
    return res.json({ iceServers: token.iceServers });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

io.on("connection", (socket) => {
  socket.on("lobby-get", () => {
    socket.emit("lobby-update", { rooms: getLobbyList(), ts: Date.now() });
  });

  socket.on("join-room", ({ roomId, role, profile }) => {
    if (!roomId || !role) return;
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = role;
    socket.data.profile = normalizeProfile(profile);

    const room = getRoom(roomId);

    if (role === "broadcaster") {
      room.broadcasterId = socket.id;
      room.hostProfile = socket.data.profile;
      emitLobbyUpdate();
    }

    if (role === "viewer") {
      room.viewers.add(socket.id);
      emitViewerCount(roomId);
      emitLobbyUpdate();
    }

    if (room.hostProfile) {
      socket.emit("host-profile", room.hostProfile);
    }

    if (room.liveStartTs) {
      socket.emit("live-start", { startTs: room.liveStartTs });
    }
  });

  socket.on("update-profile", ({ roomId, profile }) => {
    if (!roomId) return;
    const room = getRoom(roomId);
    const p = normalizeProfile(profile);
    socket.data.profile = p;

    if (socket.id === room.broadcasterId) {
      room.hostProfile = p;
      emitLobbyUpdate();
    }

    io.to(roomId).emit("profile-updated", {
      socketId: socket.id,
      role: socket.data.role,
      profile: p,
    });
  });

  socket.on("live-start", ({ roomId, startTs }) => {
    const room = getRoom(roomId);
    if (room.broadcasterId !== socket.id) return;
    room.liveStartTs = typeof startTs === "number" ? startTs : Date.now();
    io.to(roomId).emit("live-start", { startTs: room.liveStartTs });
    emitLobbyUpdate();
  });

  socket.on("live-stop", ({ roomId }) => {
    const room = getRoom(roomId);
    if (room.broadcasterId !== socket.id) return;
    room.liveStartTs = null;
    io.to(roomId).emit("live-stop");
    emitLobbyUpdate();
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.viewers.delete(socket.id);

    if (room.broadcasterId === socket.id) {
      room.broadcasterId = null;
      room.hostProfile = null;
      room.liveStartTs = null;
      io.to(roomId).emit("broadcaster-offline");
      emitLobbyUpdate();
    }

    emitViewerCount(roomId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on", PORT));
