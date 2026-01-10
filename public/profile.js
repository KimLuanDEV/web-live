import { auth, db } from "./firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const nameInput = document.getElementById("nameInput");
const avatarPreview = document.getElementById("avatarPreview");
const coinVal = document.getElementById("coinVal");
const levelVal = document.getElementById("levelVal");
const coinSentVal = document.getElementById("coinSentVal");
const coinReceivedVal = document.getElementById("coinReceivedVal");
const expText = document.getElementById("expText");
const expFill = document.getElementById("expFill");
const vipBadgeBox = document.getElementById("vipBadgeBox");

function getVipBadge(level){
  level = Number(level) || 1;
  if (level >= 250) return { key:"immortal", text:"🌌 VIP IMMORTAL" };
  if (level >= 200) return { key:"emperor", text:"👑 VIP EMPEROR" };
  if (level >= 150) return { key:"king", text:"🔱 VIP KING" };
  if (level >= 100) return { key:"legend", text:"🔥 VIP LEGEND" };
  if (level >= 70) return { key:"diamond", text:"💎 VIP DIAMOND" };
  if (level >= 40) return { key:"gold", text:"👑 VIP GOLD" };
  if (level >= 20) return { key:"silver", text:"⭐ VIP SILVER" };
  if (level >= 10) return { key:"vip", text:"💠 VIP" };
  return null;
}

async function loadProfile(){
  const uid = auth.currentUser.uid;
  const snap = await getDoc(doc(db,"users",uid));
  const p = snap.data();

  nameInput.value = p.name;
  avatarPreview.src = p.avatar;

  coinVal.textContent = p.coins;
  levelVal.textContent = p.level;
  coinSentVal.textContent = p.coinSent;
  coinReceivedVal.textContent = p.coinReceived;

  const need = p.level * 100;
  expText.textContent = `${p.exp} / ${need}`;
  expFill.style.width = Math.min(100,(p.exp/need)*100)+"%";

  vipBadgeBox.innerHTML = "";
  const badge = getVipBadge(p.level);
  if(badge){
    vipBadgeBox.innerHTML = `<span class="vip-badge vip-${badge.key}">${badge.text}</span>`;
  }
}

btnSave.onclick = async ()=>{
  await updateDoc(doc(db,"users",auth.currentUser.uid),{
    name: nameInput.value.trim()
  });
  alert("✅ Đã lưu vào Firebase");
};

avatarInput.onchange = async ()=>{
  const file = avatarInput.files[0];
  if(!file) return;
  if(file.size > 300*1024) return alert("Ảnh quá lớn");

  const reader = new FileReader();
  reader.onload = async ()=>{
    avatarPreview.src = reader.result;
    await updateDoc(doc(db,"users",auth.currentUser.uid),{
      avatar: reader.result
    });

    if(window.socket){
      socket.emit("profile-update", { avatar: reader.result });
    }
  };
  reader.readAsDataURL(file);
};

auth.onAuthStateChanged(u=>{
  if(u) loadProfile();
});
