const socket = io();
const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");

const list = document.getElementById("callList");
const sysModal = document.getElementById("sysModal");
const sysText = document.getElementById("sysText");
const sysOk = document.getElementById("sysOk");
const sysCancel = document.getElementById("sysCancel");

let onlineSet = new Set();
let allUsers = [];

let callPC = null;
let localStream = null;
let remoteAudio = null;
let callingUID = null;

/* ================= MODAL ================= */
function showModal(text, ok="OK", cancel=null){
  return new Promise(res=>{
    sysText.textContent = text;
    sysOk.textContent = ok;
    sysCancel.style.display = cancel ? "block" : "none";
    sysCancel.textContent = cancel || "";
    sysModal.classList.remove("hidden");

    sysOk.onclick = ()=>{ sysModal.classList.add("hidden"); res(true); };
    sysCancel.onclick = ()=>{ sysModal.classList.add("hidden"); res(false); };
  });
}

/* ================= WEBRTC ================= */
async function startAudioCall(isCaller, offerData=null){
  const iceRes = await fetch("/ice");
  const { iceServers } = await iceRes.json();

  callPC = new RTCPeerConnection({ iceServers });

  localStream = await navigator.mediaDevices.getUserMedia({ audio:true });
  localStream.getTracks().forEach(t=>callPC.addTrack(t, localStream));

  remoteAudio = document.createElement("audio");
  remoteAudio.autoplay = true;
  document.body.appendChild(remoteAudio);

  callPC.ontrack = e=>{
    remoteAudio.srcObject = e.streams[0];
  };

  callPC.onicecandidate = e=>{
    if(e.candidate && callingUID){
      socket.emit("call-ice", { to: callingUID, candidate: e.candidate });
    }
  };

  if(isCaller){
    const offer = await callPC.createOffer();
    await callPC.setLocalDescription(offer);
    socket.emit("call-offer", { to: callingUID, offer });
  }else{
    await callPC.setRemoteDescription(offerData);
    const answer = await callPC.createAnswer();
    await callPC.setLocalDescription(answer);
    socket.emit("call-answer", { to: callingUID, answer });
  }
}

function endCall(){
  if(callPC) callPC.close();
  callPC = null;

  if(localStream){
    localStream.getTracks().forEach(t=>t.stop());
    localStream = null;
  }

  if(remoteAudio){
    remoteAudio.remove();
    remoteAudio = null;
  }
}

/* ================= LOAD USERS ================= */
async function loadUsers(){
  const res = await fetch("/api/all-users");
  allUsers = await res.json();
  render();
}

loadUsers();

/* ================= SOCKET ================= */
socket.on("connect", ()=>{
  if(auth?.uid){
    socket.emit("auth-login", { uid: auth.uid });
  }
});

socket.on("active-users", ({ online })=>{
  onlineSet = new Set(online || []);
  render();
});

socket.on("incoming-call", async ({ from, name })=>{
  callingUID = from;
  const ok = await showModal(`${name} đang gọi`, "Nghe", "Từ chối");
  if(!ok) return;
});

socket.on("call-offer", async ({ from, offer })=>{
  callingUID = from;
  if(!callPC){
    await startAudioCall(false, offer);
  }
});

socket.on("call-answer", async ({ answer })=>{
  if(callPC) await callPC.setRemoteDescription(answer);
});

socket.on("call-ice", async candidate=>{
  if(callPC) await callPC.addIceCandidate(candidate);
});

/* ================= RENDER ================= */
function render(){
  list.innerHTML = "";

  allUsers.forEach(u=>{
    if(!u || u.uid === auth.uid) return;

    const online = onlineSet.has(u.uid);

    const div = document.createElement("div");
    div.className = "call-user " + (online ? "online" : "offline");

    div.innerHTML = `
      <img src="${u.avatar}" class="call-ava">
      <div class="call-info">
        <div class="call-name">
          ${u.name}
          ${u.verified ? `<span class="tick-blue">✔</span>` : ``}
        </div>
        <div class="call-status">${online ? "Online" : "Offline"}</div>
      </div>

      <button class="call-btn" ${online ? "" : "disabled"}>
        📞
      </button>
    `;

    div.querySelector(".call-btn").onclick = ()=>{
      if(!online) return;
      callingUID = u.uid;
      startAudioCall(true);
      socket.emit("call-request", { to: u.uid });
    };

    list.appendChild(div);
  });
}
