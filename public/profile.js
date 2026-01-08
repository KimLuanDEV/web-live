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
  coins: 200000,
  level: 1,
  exp: 0,            // 🔥 exp
  coinSent: 0,       // 🎁 đã tặng
  coinReceived: 0,   // 💎 đã nhận

};


function getUID(){
  let uid = localStorage.getItem("uid");
  if (!uid){
    uid = "u_" + crypto.randomUUID();
    localStorage.setItem("uid", uid);
  }
  return uid;
}


function getVipBadge(level){
  if (level >= 1000) return { key: "overlord", text: "🪐 VIP OVERLORD" };
  if (level >= 700) return { key: "void",  text: "🕳️ VIP VOID" };
  if (level >= 500) return { key: "god",     text: "👁️ VIP GOD" };
  if (level >= 400) return { key: "eternal", text: "🌀 VIP ETERNAL" };
  if (level >= 300) return { key: "celestial", text: "🌠 VIP CELESTIAL" };
  if (level >= 250) return { key: "immortal", text: "🌌 VIP IMMORTAL" };
  if (level >= 200) return { key: "emperor",  text: "👑 VIP EMPEROR" };
  if (level >= 150) return { key: "king",     text: "🔱 VIP KING" };
  if (level >= 100) return { key: "legend", text: "🔥 VIP LEGEND" };
  if (level >= 50) return { key: "diamond", text: "💎 VIP DIAMOND" };
  if (level >= 30) return { key: "gold", text: "👑 VIP GOLD" };
  if (level >= 10) return { key: "silver", text: "⭐ VIP SILVER" };
  return null;
}

function loadProfile(){
  const p = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;
  p.uid = getUID();
  localStorage.setItem(KEY, JSON.stringify(p));

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

// ⭐ AVATAR VIP PRO trong profile
const wrap = document.getElementById("avatarProfileWrap");
if (wrap) applyAvatarVIP(wrap, p.level || 1);


}


document.getElementById("btnSave").onclick = () => {
  const old = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;

  const profile = {
    uid: old.uid, // ⬅️ BẮT BUỘC
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

function applyAvatarVIP(el, level){
  if (!el) return;
  el.classList.add("avatar-pro");
  el.classList.remove(
    "lv-silver","lv-gold","lv-diamond",
    "lv-legend","lv-king","lv-immortal"
  );

  if (level >= 250) el.classList.add("lv-immortal");
  else if (level >= 150) el.classList.add("lv-king");
  else if (level >= 100) el.classList.add("lv-legend");
  else if (level >= 50) el.classList.add("lv-diamond");
  else if (level >= 30) el.classList.add("lv-gold");
  else if (level >= 10) el.classList.add("lv-silver");
}
