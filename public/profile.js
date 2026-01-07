const KEY = "user_profile";

const coinSentVal = document.getElementById("coinSentVal");
const coinReceivedVal = document.getElementById("coinReceivedVal");
const nameInput = document.getElementById("nameInput");
const avatarPreview = document.getElementById("avatarPreview");
const coinVal = document.getElementById("coinVal");
const levelVal = document.getElementById("levelVal");
const expText = document.getElementById("expText");
const expFill = document.getElementById("expFill");
const vipBadgeBox = document.getElementById("vipBadgeBox");

const defaultProfile = {
  name: "User",
  avatar: "https://img.freepik.com/premium-vector/live-streaming-logo-design-vector-illustration_875240-2017.jpg",
  coins: 200000,
  level: 1,

  exp: 0,          // ✅ THÊM
  coinSent: 0,       // 🎁 đã tặng
  coinReceived: 0,   // 💎 đã nhận
};


function getVipBadge(level){
  if (level >= 50) return { key: "diamond", text: "💎 VIP DIAMOND" };
  if (level >= 30) return { key: "gold", text: "👑 VIP GOLD" };
  if (level >= 10) return { key: "silver", text: "⭐ VIP SILVER" };
  return null;
}


function loadProfile(){
  const p = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;

  nameInput.value = p.name;
  avatarPreview.src = p.avatar;
  coinVal.textContent = p.coins;
  levelVal.textContent = p.level;

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
}

document.getElementById("btnSave").onclick = () => {
  const old = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;

  const profile = {
    name: nameInput.value.trim() || "Guest",
    avatar: avatarPreview.src,
    coins: Number(coinVal.textContent) || 0,
    level: Number(levelVal.textContent) || 1,
    exp: old.exp || 0,              // ⭐ BẮT BUỘC
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

  const fd = new FormData();
  fd.append("avatar", file);

  const res = await fetch("/api/upload-avatar", {
    method: "POST",
    body: fd
  });

  const data = await res.json();
  if (!data.url) return alert("Upload thất bại");

  avatarPreview.src = data.url;
  localStorage.setItem("userAvatar", data.url);

 if (window.socket) {
  socket.emit("profile-update", {
    name: profile.name,
    avatar: profile.avatar,
    level: profile.level
  });
 }
};




