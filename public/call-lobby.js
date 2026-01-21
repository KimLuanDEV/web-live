const socket = io();

const lobbyEl = document.getElementById("lobby");
const modal = document.getElementById("callModal");
const membersEl = document.getElementById("callMembers");
const callTitle = document.getElementById("callTitle");

let localStream = null;
let peers = new Map();
let currentCallId = null;
let muted = false;

// ===== PROFILE DEMO (bạn thay bằng profile thật) =====
const profile = {
  uid: localStorage.uid || ("u_" + Math.random().toString(36).slice(2)),
  name: localStorage.name || "User",
  avatar: localStorage.avatar || "https://api.dicebear.com/7.x/thumbs/svg?seed=user"
};

socket.emit("auth-login", { uid: profile.uid });

/* ===== LOBBY ===== */
socket.on("call-lobby-update", ({ rooms }) => {
  lobbyEl.innerHTML = "";

  rooms.forEach(r => {
    const div = document.createElement("div");
    div.className = "call-card";
    div.innerHTML = `
      <div class="call-type">${r.type === "video" ? "🎥 Video call" : "🎧 Audio call"}</div>
      <div class="call-count">👥 ${r.members} người</div>
      <button class="btn" onclick="joinCall('${r.callId}')">Tham gia</button>
    `;
    lobbyEl.appendChild(div);
  });
});

socket.emit("call-lobby-get");

/* ===== CREATE / JOIN ===== */
function createCall(type){
  socket.emit("call-create", { type, profile });
}

socket.on("call-created", ({ callId, type }) => {
  openCall(callId, type);
});

function joinCall(callId){
  socket.emit("call-join", { callId, profile });
  openCall(callId);
}

/* ===== OPEN CALL ===== */
async function openCall(callId, type = "audio"){
  currentCallId = callId;
  modal.classList.add("active");
  callTitle.textContent = type === "video" ? "🎥 Video call" : "🎧 Audio call";

  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: type === "video"
  });
}

/* ===== MEMBERS ===== */
socket.on("call-members", ({ members }) => {
  membersEl.innerHTML = "";

  members.forEach(m => {
    const div = document.createElement("div");
    div.className = "member";
    div.innerHTML = `
      <img src="${m.avatar}">
      <div>${m.name}</div>
    `;
    membersEl.appendChild(div);

    if(m.socketId !== socket.id){
      connectPeer(m.socketId);
    }
  });
});

/* ===== WEBRTC ===== */
function createPeerConnection(to){
  const pc = new RTCPeerConnection();

  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.onicecandidate = e => {
    if(e.candidate){
      socket.emit("call-ice", {
        to,
        candidate: e.candidate
      });
    }
  };

  pc.ontrack = e => {
    let audio = document.getElementById("a_" + to);
    if(!audio){
      audio = document.createElement("audio");
      audio.id = "a_" + to;
      audio.autoplay = true;
      document.body.appendChild(audio);
    }
    audio.srcObject = e.streams[0];
  };

  return pc;
}

async function connectPeer(to){
  if(peers.has(to)) return;

  const pc = createPeerConnection(to);
  peers.set(to, pc);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("call-offer", {
    to,
    sdp: offer
  });
}

socket.on("call-offer", async ({ from, sdp }) => {
  const pc = createPeerConnection(from);
  peers.set(from, pc);

  await pc.setRemoteDescription(sdp);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("call-answer", {
    to: from,
    sdp: answer
  });
});

socket.on("call-answer", async ({ from, sdp }) => {
  const pc = peers.get(from);
  if(pc) await pc.setRemoteDescription(sdp);
});

socket.on("call-ice", ({ from, candidate }) => {
  const pc = peers.get(from);
  if(pc) pc.addIceCandidate(candidate);
});

/* ===== CONTROLS ===== */
function toggleMute(){
  muted = !muted;
  localStream.getAudioTracks().forEach(t => t.enabled = !muted);
}

function leaveCall(){
  socket.emit("call-leave");
  cleanupCall();
}

function cleanupCall(){
  modal.classList.remove("active");
  peers.forEach(pc => pc.close());
  peers.clear();

  if(localStream){
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }

  membersEl.innerHTML = "";
  currentCallId = null;
}
