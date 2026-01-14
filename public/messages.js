const socket = io();
const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");
const callBtn = document.getElementById("callBtn");   // 🔥 BẮT BUỘC
const endCallBtn = document.getElementById("endCallBtn");
const muteBtn = document.getElementById("chatMuteBtn");
const callStatus = document.getElementById("callStatus");
const netStatus = document.getElementById("netStatus");
const sysModal = document.getElementById("sysModal");
const sysText = document.getElementById("sysText");
const sysOk = document.getElementById("sysOk");
const sysCancel = document.getElementById("sysCancel");
const ringtone = document.getElementById("ringtone");
const ringback = document.getElementById("ringback");
const callModal = document.getElementById("callModal");
const callName = document.getElementById("callName");
const callAvatar = document.getElementById("callAvatar");
const callMute = document.getElementById("callMute");
const callEnd = document.getElementById("callEnd");
const callNet = document.getElementById("callNet");
const callTimer = document.getElementById("callTimer");
const callCam = document.getElementById("callCam");
const pip = document.getElementById("localVideo");
const callUI = document.getElementById("callModal");
const callFlip = document.getElementById("callFlip");
const flipBtn = document.getElementById("callFlip");

let currentFacing = "user"; // user = trước, environment = sau
let uiTimer = null;
let micMuted = false;
let netTimer = null;
let voicePC = null;
let voiceStream = null;
let voiceTarget = null;
let currentTarget = null;
let currentTargetUID = null;
let callStartTime = 0;
let callTimerInterval = null;
let vibrateLoop = null;
let camOff = false;
let drag = {
  active:false,
  x:0,
  y:0,
  startX:0,
  startY:0
};

callCam.onclick = ()=>{
  camOff = !camOff;

  const tracks = voiceStream.getVideoTracks();
  tracks.forEach(t => t.enabled = !camOff);

  if(camOff){
    localVideo.style.display = "none";  // ẩn PIP
    flipBtn.style.display = "none";     // ẩn nút lật
    callCam.textContent = "📷";
  }else{
    localVideo.style.display = "block"; // hiện PIP
    flipBtn.style.display = "block";    // hiện nút lật
    callCam.textContent = "🚫";
  }
};


// 🔗 Gắn nút trong Call Modal với nút chat
callMute.onclick = () => muteBtn.click();
callEnd.onclick  = () => endCallBtn.click();


function startVibrate(){
  if(!("vibrate" in navigator)) return;

  stopVibrate(); // clear cũ nếu có

  vibrateLoop = setInterval(() => {
    navigator.vibrate([300, 150, 300]);
  }, 900); // cứ 0.9s rung lại
}



function showCallUI(){
  callUI.classList.remove("ui-hidden");

  // auto hide sau 3s
  clearTimeout(uiTimer);
  uiTimer = setTimeout(()=>{
    callUI.classList.add("ui-hidden");
  }, 3000);
}

// tap bất kỳ đâu trên call
callUI.addEventListener("click", e=>{
  // không toggle khi bấm vào nút
  if(e.target.closest(".call-actions")) return;

  if(callUI.classList.contains("ui-hidden")){
    showCallUI();
  }else{
    callUI.classList.add("ui-hidden");
  }
});


function stopVibrate(){
  if(vibrateLoop){
    clearInterval(vibrateLoop);
    vibrateLoop = null;
  }
  if("vibrate" in navigator){
    navigator.vibrate(0);
  }
}


function startCallTimer(){
  callStartTime = Date.now();
  callTimer.textContent = "00:00";

  callTimerInterval = setInterval(()=>{
    const s = Math.floor((Date.now() - callStartTime)/1000);
    const m = Math.floor(s / 60);
    const ss = s % 60;
    callTimer.textContent =
      String(m).padStart(2,"0") + ":" + String(ss).padStart(2,"0");
  }, 1000);
}

function stopCallTimer(){
  if(callTimerInterval){
    clearInterval(callTimerInterval);
    callTimerInterval = null;
  }
}


function openCallModal(user){
 callModal.classList.remove("hidden");
showCallUI();   // hiện rồi tự ẩn

  callName.textContent = user.name;
  callAvatar.src = user.avatar || "";
}

function closeCallModal(){
  callModal.classList.add("hidden");
}


function stopAllRings(){
  ringtone.pause(); ringtone.currentTime = 0;
  ringback.pause(); ringback.currentTime = 0;
}

function chatKey(){
  if(!auth?.uid || !currentTargetUID) return null;

  const a = auth.uid;
  const b = currentTargetUID;

  return a < b
    ? "chat_" + a + "_" + b
    : "chat_" + b + "_" + a;
}




function saveChat(msg){
  const key = chatKey();
  if(!key) return;

  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  arr.push(msg);
  localStorage.setItem(key, JSON.stringify(arr));
}



function loadChat(){
  const key = chatKey();
  if(!key) return;

  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  chatBox.innerHTML = "";

  arr.forEach(m=>{
    const isMe = m.from === auth.uid;

    pushMsg(
      isMe ? "Bạn" : currentTarget.name,
      m.text,
      isMe,
      null,
      "",
      isMe ? auth.avatar : currentTarget.avatar
    );
  });
}




function showModal(text, okText="OK", cancelText=null){
  return new Promise(resolve=>{
    sysText.textContent = text;
    sysOk.textContent = okText;
    sysCancel.style.display = cancelText ? "block" : "none";
    sysCancel.textContent = cancelText || "";

    sysModal.classList.remove("hidden");

    sysOk.onclick = () => {
      sysModal.classList.add("hidden");
      resolve(true);
    };
    sysCancel.onclick = () => {
      sysModal.classList.add("hidden");
      resolve(false);
    };
  });
}

function startNetMonitor(){
  stopNetMonitor();

  netTimer = setInterval(async () => {
    if(!voicePC) return;

    const stats = await voicePC.getStats();
    let rtt = 0, loss = 0;

    stats.forEach(r => {
      if(r.type === "candidate-pair" && r.currentRoundTripTime){
        rtt = r.currentRoundTripTime * 1000;
      }
      if(r.type === "inbound-rtp" && r.packetsLost){
        loss = r.packetsLost;
      }
    });

    let level = "good", bars = "📶📶📶📶";

    if(rtt > 300 || loss > 30){
      level = "bad";
      bars = "📶";
    }else if(rtt > 150 || loss > 10){
      level = "mid";
      bars = "📶📶";
    }else{
      bars = "📶📶📶📶";
    }

    netStatus.textContent = bars;
    netStatus.className = "net-status " + level;
  }, 2000);
}

function stopNetMonitor(){
  if(netTimer){
    clearInterval(netTimer);
    netTimer = null;
  }
}



function setCallUI(active){
  if(active){
    callBtn.classList.add("hidden");
    muteBtn.classList.remove("hidden");
    endCallBtn.classList.remove("hidden");
    callStatus.classList.remove("hidden");
  }else{
    callBtn.classList.remove("hidden");
    muteBtn.classList.add("hidden");
    endCallBtn.classList.add("hidden");
    callStatus.classList.add("hidden");
    micMuted = false;
    muteBtn.classList.remove("active");
    muteBtn.textContent = "🔇";
  }
}




socket.emit("auth-login", { uid: auth.uid });

const userList = document.getElementById("userList");
const chatBox = document.getElementById("chatBox");
const chatTitle = document.getElementById("chatTitle");

socket.on("active-users", ({ users }) => {
  userList.innerHTML = "";

  users.forEach(u => {
   if(u.uid === auth.uid) return;


    const div = document.createElement("div");
    div.className = "badge";
    div.innerHTML = `<img src="${u.avatar}" width="24" style="border-radius:50%"> ${u.name}`;

   div.onclick = () => {
  currentTarget = u;         // vẫn giữ để lấy name, avatar
  currentTargetUID = u.uid; // 🔥 dùng UID này cho chat

  chatTitle.textContent = u.name;

  const headerAva = document.getElementById("chatHeaderAvatar");
  if(headerAva) headerAva.src = u.avatar || "";

  loadChat();
  openChat();
  

};



    userList.appendChild(div);
  });
});

document.getElementById("sendBtn").onclick = () => {
  const input = document.getElementById("msgInput");
  const txt = input.value.trim();
  if(!txt || !currentTarget) return;

  const msgId = Date.now() + "_" + Math.random().toString(36).slice(2);

 socket.emit("private-message", {
  to: currentTarget.uid,   // 🔥 GỬI THEO UID
  text: txt,
  msgId
});

  pushMsg("Bạn", txt, true, msgId, "⏳");

saveChat({
  from: auth.uid,
  to: currentTargetUID,
  text: txt,
  time: Date.now(),
  peer: currentTargetUID   // 🔥 QUAN TRỌNG
});


};


socket.on("private-message", ({ from, text, msgId }) => {
 pushMsg(from.name, text, false);
  
saveChat({
  from: from.uid,
  to: auth.uid,
  text: text,
  time: Date.now(),
  peer: from.uid   // 🔥 QUAN TRỌNG
});



 
socket.emit("msg-seen", {
  to: from.uid,
  msgId
});

});

socket.on("msg-status", ({ msgId, status }) => {
  const el = document.querySelector(`[data-msg-id="${msgId}"] .msg-status`);
  if(el){
    if(status === "delivered"){
      el.textContent = "✓";

      // ✅ XÓA INPUT TẠI ĐÂY
      const input = document.getElementById("msgInput");
      input.value = "";
      input.blur();
      setTimeout(()=>input.focus(),20);
    }
    if(status === "seen") el.textContent = "👁";
  }
});



function pushMsg(name, text, isMe=false, msgId=null, status=""){
  const div = document.createElement("div");
  div.className = "chat-line " + (isMe ? "me" : "other");
  div.dataset.msgId = msgId || "";

  const time = new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"});

  div.innerHTML = `
    <div class="bubble">${text}</div>
    <div class="chat-time">
      ${time}
      ${isMe ? `<span class="msg-status">${status}</span>` : ""}
    </div>
  `;

 chatBox.appendChild(div);

 // ⬇️ Luôn cuộn xuống tin mới nhất
requestAnimationFrame(() => {
  chatBox.scrollTop = chatBox.scrollHeight;
});

}




const chatModal = document.getElementById("chatModal");

function openChat(){
  document.body.style.overflow = "hidden"; // khóa nền
  chatModal.classList.remove("hidden");


}

function closeChat(){
  document.body.style.overflow = ""; // mở lại
  chatModal.classList.add("hidden");
  currentTarget = null;
}


let baseHeight = window.innerHeight;

window.addEventListener("resize", () => {
  const h = window.innerHeight;
  const diff = baseHeight - h;

  // nếu bàn phím mở
  if(diff > 150){
    document
      .getElementById("chatModal")
      .style.setProperty("--kb", diff + "px");
  }else{
    document
      .getElementById("chatModal")
      .style.setProperty("--kb", "0px");
  }
});


socket.on("voice-rejected", () => {
  showModal("📞 Cuộc gọi đã bị từ chối");

  if(voicePC){
    voicePC.close();
    voicePC = null;
  }

  if(voiceStream){
    voiceStream.getTracks().forEach(t => t.stop());
    voiceStream = null;
  }

  setCallUI(false);
});


socket.on("voice-offer", async ({ from, sdp }) => {
  
  startVibrate();   // 📳 rung khi có người gọi
  ringtone.play();   // 🔔 chuông cho người nhận



const ok = await showModal("📞 " + from.name + " đang gọi bạn", "Nhận", "Từ chối");
if(!ok){
  socket.emit("voice-reject", { to: from.uid });   // 🔥 báo server
  stopAllRings();
  stopVibrate();   // 🛑 tắt rung
  closeCallModal();   // 🔥 Ẩn modal khi từ chối
  return;
}

   // 🔥 HIỆN AVATAR + TÊN NGƯỜI GỌI NGAY
openCallModal(from);

stopAllRings();   // 🔔 TẮT CHUÔNG NGAY KHI BẤM NHẬN
stopVibrate();   // 🛑 tắt rung

setCallUI(true);
openCallModal(from);

netStatus.classList.remove("hidden");
startNetMonitor();


 voiceTarget = from.uid;   // 🔥 CHỈ LẤY UID


  voiceStream = await navigator.mediaDevices.getUserMedia({
  audio:true,
  video:true
});

// GẮN video preview
document.getElementById("localVideo").srcObject = voiceStream;

// 🔴 TẮT camera mặc định
voiceStream.getVideoTracks().forEach(t => t.enabled = false);
camOff = true;
callCam.textContent = "📷";


const ice = await fetch("/ice").then(r=>r.json());

voicePC = new RTCPeerConnection({
  iceServers: ice.iceServers,
  iceTransportPolicy: "relay"
});





// add tất cả track 1 lần duy nhất
voiceStream.getTracks().forEach(t => voicePC.addTrack(t, voiceStream));

// tắt camera mặc định bằng enable=false
voiceStream.getVideoTracks().forEach(t => t.enabled = false);
camOff = true;
callCam.textContent = "📷";
flipBtn.style.display = "none";
localVideo.style.display = "none";



  voicePC.ontrack = e => {
  const rv = document.getElementById("remoteVideo");
  rv.srcObject = e.streams[0];
  rv.muted = false;
  rv.playsInline = true;

  // 🔥 unlock audio/video on mobile
  rv.play().catch(()=>{
    document.addEventListener("click", () => rv.play(), { once:true });
    document.addEventListener("touchstart", () => rv.play(), { once:true });
  });
};


  voicePC.onicecandidate = e => {
    if(e.candidate){
      socket.emit("voice-ice", {
        to: voiceTarget,
        candidate: e.candidate
      });
    }
  };

  await voicePC.setRemoteDescription(sdp);
  const answer = await voicePC.createAnswer();
  await voicePC.setLocalDescription(answer);

  socket.emit("voice-answer", {
    to: voiceTarget,
    sdp: answer
  });

  startCallTimer();   // ⏱ BÊN ĐƯỢC GỌI CHẠY
});




socket.on("voice-answer", async ({ sdp }) => {
  await voicePC.setRemoteDescription(sdp);

  setCallUI(true);
netStatus.classList.remove("hidden");
startNetMonitor();
 startCallTimer();   // ⏱
});


socket.on("voice-ice", async ({ candidate }) => {
  if(voicePC && candidate){
    try{
      await voicePC.addIceCandidate(new RTCIceCandidate(candidate));
    }catch(e){
      console.warn("ICE add failed", e);
    }
  }
});



socket.on("voice-end", ({ reason } = {}) => {

  stopVibrate();   // 🛑 tắt rung

  if(voicePC){
    voicePC.close();
    voicePC = null;
  }

  if(voiceStream){
    voiceStream.getTracks().forEach(t => t.stop());
    voiceStream = null;
  }

if(reason === "rejected"){
  showModal("❌ Người nhận đã từ chối cuộc gọi");
}else{
  showModal("📞 Cuộc gọi đã kết thúc");
}

 
 
  stopAllRings();
  stopVibrate();   // 🛑 tắt rung

  setCallUI(false);
  stopCallTimer();
  callTimer.textContent = "00:00";

  closeCallModal();

netStatus.classList.add("hidden");
stopNetMonitor();
 
});









endCallBtn.onclick = endVoiceCall;



callBtn.onclick = async () => {
  if(!currentTarget) return;

  voiceTarget = currentTarget.uid;


 voiceStream = await navigator.mediaDevices.getUserMedia({
  audio:true,
  video:true
});

// GẮN video preview
document.getElementById("localVideo").srcObject = voiceStream;

// 🔴 TẮT camera mặc định
voiceStream.getVideoTracks().forEach(t => t.enabled = false);
camOff = true;
callCam.textContent = "📷";



const ice = await fetch("/ice").then(r=>r.json());

voicePC = new RTCPeerConnection({
  iceServers: ice.iceServers,
  iceTransportPolicy: "relay"
});


voicePC.ontrack = e => {
  const rv = document.getElementById("remoteVideo");
  rv.srcObject = e.streams[0];
  rv.muted = false;
  rv.playsInline = true;

  // 🔥 unlock audio/video on mobile
  rv.play().catch(()=>{
    document.addEventListener("click", () => rv.play(), { once:true });
    document.addEventListener("touchstart", () => rv.play(), { once:true });
  });
};


// add tất cả track 1 lần duy nhất
voiceStream.getTracks().forEach(t => voicePC.addTrack(t, voiceStream));

// tắt camera mặc định bằng enable=false
voiceStream.getVideoTracks().forEach(t => t.enabled = false);
camOff = true;
callCam.textContent = "📷";
flipBtn.style.display = "none";
localVideo.style.display = "none";


  voicePC.onicecandidate = e => {
    if(e.candidate){
      socket.emit("voice-ice", {
        to: voiceTarget,
        candidate: e.candidate
      });
    }
  };

  const offer = await voicePC.createOffer();
  await voicePC.setLocalDescription(offer);

  socket.emit("voice-offer", {
    to: voiceTarget,
    sdp: offer
  });

  ringback.play();   // 🔔 tút tút cho người gọi
  showModal("📞 Đang gọi " + currentTarget.name);
 setCallUI(true);
 openCallModal(currentTarget);

netStatus.classList.remove("hidden");
startNetMonitor();


};

function endVoiceCall(){

  stopVibrate();


  if(voiceStream){
    voiceStream.getTracks().forEach(t => t.stop());
    voiceStream = null;
  }

  if(voicePC){
    voicePC.close();
    voicePC = null;
  }

  socket.emit("voice-end", { to: voiceTarget });

  voiceTarget = null;

  setCallUI(false);
  closeCallModal();

netStatus.classList.add("hidden");
stopNetMonitor();

stopCallTimer();
callTimer.textContent = "00:00";

  showModal("📞 Đã kết thúc cuộc gọi");
  stopAllRings();
  stopVibrate();   // 🛑 tắt rung

}


muteBtn.onclick = () => {
  if(!voiceStream) return;

  micMuted = !micMuted;

  voiceStream.getAudioTracks().forEach(t => {
    t.enabled = !micMuted;
  });

  muteBtn.classList.toggle("active", micMuted);
  muteBtn.textContent = micMuted ? "🔇" : "🔈";

   syncCallMute();   // 🔥 cập nhật nút trong modal
};

// 🔄 Đồng bộ nút mute trong Call Modal
function syncCallMute(){
  callMute.classList.toggle("active", micMuted);
  callMute.textContent = micMuted ? "🔇" : "🔈";
}



pip.addEventListener("pointerdown", e=>{
  drag.active = true;
  pip.setPointerCapture(e.pointerId);

  const rect = pip.getBoundingClientRect();
  drag.startX = e.clientX;
  drag.startY = e.clientY;
  drag.x = rect.left;
  drag.y = rect.top;

  pip.style.transition = "none";
});

pip.addEventListener("pointermove", e=>{
  if(!drag.active) return;

  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;

  pip.style.left = drag.x + dx + "px";
  pip.style.top  = drag.y + dy + "px";
  pip.style.right = "auto";
  pip.style.bottom = "auto";
  pip.style.position = "fixed";
});

pip.addEventListener("pointerup", ()=>{
  drag.active = false;
  pip.style.transition = "";
});

pip.addEventListener("pointercancel", ()=>{
  drag.active = false;
});


async function flipCamera(){
  if(!voiceStream) return;

  currentFacing =
    currentFacing === "user" ? "environment" : "user";

  const newStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: currentFacing },
    audio: true
  });

  // replace video track
  const newVideo = newStream.getVideoTracks()[0];
  const sender = voicePC.getSenders()
    .find(s => s.track && s.track.kind === "video");

  if(sender){
    await sender.replaceTrack(newVideo);
  }

  // update local stream
  voiceStream.getVideoTracks().forEach(t=>t.stop());
  voiceStream.removeTrack(voiceStream.getVideoTracks()[0]);
  voiceStream.addTrack(newVideo);

  // update video element
  localVideo.srcObject = voiceStream;
}


callFlip.onclick = ()=>{
  flipCamera();
};
