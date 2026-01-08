const rooms = new Map();

function getSfuRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      producers: new Map(), // socketId -> producer
      consumers: new Map()
    });
  }
  return rooms.get(roomId);
}

module.exports = { getSfuRoom };
