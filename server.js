const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * Room state:
 * - broadcasterId: socket.id của người phát
 * - viewers: Set socket.id người xem
 */
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { broadcasterId: null, viewers: new Set() });
  }
  return rooms.get(roomId);
}


const twilio = require("twilio");

app.get("/ice", async (req, res) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return res.status(500).json({ error: "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN" });
    }

    const client = twilio(accountSid, authToken);

    // Twilio Tokens API returns iceServers array (STUN + TURN with credentials)
    const token = await client.tokens.create();

    return res.json({ iceServers: token.iceServers });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});



io.on("connection", (socket) => {
  // user joins a room with a role
  socket.on("join-room", ({ roomId, role }) => {
    if (!roomId || !role) return;

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = role;

    const room = getRoom(roomId);

    if (role === "broadcaster") {
      // replace old broadcaster if exists
      const old = room.broadcasterId;
      room.broadcasterId = socket.id;

      // tell viewers to reload/reattach if a broadcaster changed
      if (old && old !== socket.id) {
        io.to(roomId).emit("broadcaster-changed");
      }

      // tell broadcaster current viewers list
      socket.emit("room-viewers", Array.from(room.viewers));
      socket.to(roomId).emit("broadcaster-online");
    }

    if (role === "viewer") {
      room.viewers.add(socket.id);

      // notify broadcaster to create peer connection for this viewer
      if (room.broadcasterId) {
        io.to(room.broadcasterId).emit("watcher", { viewerId: socket.id, roomId });
        socket.emit("broadcaster-online");
      } else {
        socket.emit("broadcaster-offline");
      }
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
      // tell broadcaster to close peer for this viewer
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

    // cleanup empty rooms
    if (!room.broadcasterId && room.viewers.size === 0) {
      rooms.delete(roomId);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
