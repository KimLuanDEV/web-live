const KEY = "user_profile";

const nameInput = document.getElementById("nameInput");
const avatarPreview = document.getElementById("avatarPreview");
const coinVal = document.getElementById("coinVal");
const levelVal = document.getElementById("levelVal");
const coinSentVal = document.getElementById("coinSentVal");
const coinReceivedVal = document.getElementById("coinReceivedVal");
const expText = document.getElementById("expText");
const expFill = document.getElementById("expFill");
const vipBadgeBox = document.getElementById("vipBadgeBox");

const defaultProfile = {
  name: "User",
  avatar: "https://img.freepik.com/premium-vector/live-streaming-logo-design-vector-illustration_875240-2017.jpg",
  coins: 10000,
  level: 1,
  exp: 0,            // 🔥 exp
  coinSent: 0,       // 🎁 đã tặng
  coinReceived: 0,   // 💎 đã nhận

};


function getVipBadge(level){
  level = Number(level) || 1;

  if (level >= 250) {
    return { key:"immortal", text:"🌌 VIP IMMORTAL", color:"#ff3b3b" };
  }
  if (level >= 200) {
    return { key:"emperor", text:"👑 VIP EMPEROR", color:"#ffd36e" };
  }
  if (level >= 150) {
    return { key:"king", text:"🔱 VIP KING", color:"#c77dff" };
  }
  if (level >= 100) {
    return { key:"legend", text:"🔥 VIP LEGEND", color:"#ff6a00" };
  }
  if (level >= 70) {
    return { key:"diamond", text:"💎 VIP DIAMOND", color:"#5fd1ff" };
  }
  if (level >= 40) {
    return { key:"gold", text:"👑 VIP GOLD", color:"#ffd36e" };
  }
  if (level >= 20) {
    return { key:"silver", text:"⭐ VIP SILVER", color:"#cfd8dc" };
  }
  if (level >= 10) {
    return { key:"vip", text:"💠 VIP", color:"#8bc34a" };
  }
  return null;
}


function loadProfile(){
  const p = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;

  nameInput.value = p.name;
  avatarPreview.src = p.avatar;
  avatarPreview.onerror = () => {
  avatarPreview.src = defaultProfile.avatar;
};
  coinVal.textContent = p.coins || 0;
  levelVal.textContent = p.level || 1;

  coinSentVal.textContent = p.coinSent || 0;
  coinReceivedVal.textContent = p.coinReceived || 0;

  // ⭐ EXP BAR
  const level = p.level || 1;
  const exp = p.exp || 0;
  const need = level * 100;

  if (expText) expText.textContent = `${exp} / ${need}`;
  if (expFill) {
    const percent = Math.min(100, (exp / need) * 100);
    expFill.style.width = percent + "%";
  }

  // 🎖 VIP BADGE
if (vipBadgeBox){
  vipBadgeBox.innerHTML = "";
  const badge = getVipBadge(p.level || 1);
  if (badge){
    vipBadgeBox.innerHTML = `
      <span class="vip-badge vip-${badge.key}">
        ${badge.text}
      </span>
    `;
  }
}


}


document.getElementById("btnSave").onclick = () => {
  const old = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;
  const profile = {
    name: nameInput.value.trim() || "Guest",
    avatar: old.avatar || defaultProfile.avatar,
    coins: Number(coinVal.textContent) || 0,
    level: Number(levelVal.textContent) || 1,
    exp: old.exp || 0, 
    coinSent: old.coinSent || 0,
    coinReceived: old.coinReceived || 0,
  };
  localStorage.setItem(KEY, JSON.stringify(profile));
  alert("✅ Đã lưu hồ sơ!");
};

loadProfile();


const avatarInput = document.getElementById("avatarInput");
const btnChangeAvatar = document.getElementById("btnChangeAvatar");

btnChangeAvatar.onclick = () => avatarInput.click();

avatarInput.onchange = async () => {
  const file = avatarInput.files[0];
  if (!file) return;

  // ⚠️ Giới hạn size để tránh localStorage quá lớn
  if (file.size > 300 * 1024) {
    alert("❌ Ảnh quá lớn (tối đa 300KB)");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const base64 = reader.result; // ✅ data:image/...

    // update UI
    avatarPreview.src = base64;

    // ✅ LƯU TRỰC TIẾP VÀO PROFILE (KHÔNG PHỤ THUỘC SERVER)
    const p = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;
    p.avatar = base64;
    localStorage.setItem(KEY, JSON.stringify(p));

    // realtime sync nếu đang ở room
    if (window.socket) {
      socket.emit("profile-update", { avatar: base64 });
    }
  };

  reader.readAsDataURL(file);
};


function addExp(amount){
  const p = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;
  p.exp = (p.exp || 0) + amount;

  let need = p.level * 100;

  while (p.exp >= need) {
    p.exp -= need;
    p.level++;
    need = p.level * 100;
  }

  localStorage.setItem(KEY, JSON.stringify(p));
  loadProfile();
}
