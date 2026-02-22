const socket = io();

socket.emit("ks-get-rooms");

socket.on("ks-room-list", rooms=>{
  const box = document.getElementById("roomList");
  box.innerHTML = "";

  rooms.forEach(r=>{
    const div = document.createElement("div");
    div.className = "ks-room";
    div.innerHTML = `
      <div>
        Phòng #${r.id} (${r.players}/2)
      </div>
      <button onclick="joinRoom(${r.id})">
        Tham gia
      </button>
    `;
    box.appendChild(div);
  });
});

function createRoom(){
  socket.emit("ks-create-room");
}

function joinRoom(id){
  socket.emit("ks-join-room", id);
}