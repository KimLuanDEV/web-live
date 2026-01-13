const socket = io();
const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");

let voicePC = null;
let voiceStream = null;
let voiceTarget = null;
let currentTarget = null;

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
  currentTarget = u;
  chatTitle.textContent = u.name;

  const headerAva = document.getElementById("chatHeaderAvatar");
  if(headerAva) headerAva.src = u.avatar || "";

  chatBox.innerHTML = "";
  openChat();
};



    userList.appendChild(div);
  });
});

document.getElementById("sendBtn").onclick = () => {
  const txt = document.getElementById("msgInput").value.trim();
  if(!txt || !currentTarget) return;

const msgId = Date.now() + "_" + Math.random().toString(36).slice(2);

socket.emit("private-message", {
  to: currentTarget.socketId,
  text: txt,
  msgId
});

pushMsg("Bạn", txt, true, msgId, "sent");




  document.getElementById("msgInput").value = "";
};

socket.on("private-message", ({ from, text, msgId }) => {
 pushMsg(from.name, text, false);
  

  // báo là đã xem
  socket.emit("msg-seen", {
    to: from.socketId,
    msgId
  });
});

socket.on("msg-status", ({ msgId, status }) => {
  const el = document.querySelector(`[data-msg-id="${msgId}"] .msg-status`);
  if(el){
    if(status === "delivered") el.textContent = "✓";
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

  chatBox.prepend(div);

  requestAnimationFrame();
}




const chatModal = document.getElementById("chatModal");

function openChat(){
  document.body.style.overflow = "hidden"; // khóa nền
  chatModal.classList.remove("hidden");

  setTimeout(() => {
    document.getElementById("msgInput").focus();
  }, 120);
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


callBtn.onclick = async () => {
  if(!currentTarget) return;

  voiceTarget = currentTarget.socketId;

  voiceStream = await navigator.mediaDevices.getUserMedia({ audio:true });

  voicePC = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

voicePC.ontrack = e => {
  const audio = document.createElement("audio");
  audio.srcObject = e.streams[0];
  audio.autoplay = true;
  audio.play();
};

  voiceStream.getTracks().forEach(t => voicePC.addTrack(t, voiceStream));

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

  alert("📞 Đang gọi " + currentTarget.name);
  muteBtn.classList.remove("hidden");
endCallBtn.classList.remove("hidden");
callBtn.classList.add("hidden");

};


socket.on("voice-offer", async ({ from, sdp }) => {
  if(!confirm("📞 Có cuộc gọi đến. Nhận?")) return;

  muteBtn.classList.remove("hidden");
endCallBtn.classList.remove("hidden");
callBtn.classList.add("hidden");


  voiceTarget = from;

  voiceStream = await navigator.mediaDevices.getUserMedia({ audio:true });

  voicePC = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  voiceStream.getTracks().forEach(t => voicePC.addTrack(t, voiceStream));

  voicePC.ontrack = e => {
    const audio = document.createElement("audio");
    audio.srcObject = e.streams[0];
    audio.autoplay = true;
    audio.play();
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
});


socket.on("voice-answer", async ({ sdp }) => {
  await voicePC.setRemoteDescription(sdp);
});

socket.on("voice-ice", async ({ candidate }) => {
  if(voicePC){
    await voicePC.addIceCandidate(candidate);
  }
});


socket.on("voice-end", () => {
  if(voicePC){
    voicePC.close();
    voicePC = null;
  }

  if(voiceStream){
    voiceStream.getTracks().forEach(t => t.stop());
    voiceStream = null;
  }

  alert("📞 Cuộc gọi đã kết thúc");

  muteBtn.classList.add("hidden");
micMuted = false;
muteBtn.classList.remove("active");
muteBtn.textContent = "🔇";
callBtn.classList.remove("hidden");

});

socket.on("private-call", ({ from }) => {
  if(confirm("📞 " + from.name + " đang gọi bạn. Nhận cuộc gọi?")){
    alert("🎙 Kết nối voice sẽ mở ở bước tiếp theo");
  }
});


const callBtn = document.getElementById("callBtn");   // 🔥 BẮT BUỘC
const endCallBtn = document.getElementById("endCallBtn");
const muteBtn = document.getElementById("muteBtn");
let micMuted = false;

endCallBtn.onclick = endVoiceCall;


function endVoiceCall(){
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

  endCallBtn.classList.add("hidden");
  callBtn.classList.remove("hidden");
muteBtn.classList.add("hidden");
micMuted = false;
muteBtn.classList.remove("active");
muteBtn.textContent = "🔇";

  alert("📞 Đã kết thúc cuộc gọi");
}


muteBtn.onclick = () => {
  if(!voiceStream) return;

  micMuted = !micMuted;

  voiceStream.getAudioTracks().forEach(t => {
    t.enabled = !micMuted;
  });

  muteBtn.classList.toggle("active", micMuted);
  muteBtn.textContent = micMuted ? "🔈" : "🔇";
};
