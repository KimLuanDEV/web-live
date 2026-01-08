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

// ⚠️ CHỈ DÙNG KHI TẠO PROFILE LẦN ĐẦU
const defaultProfile = {
  name: "User",
  avatar: "https://img.freepik.com/premium-vector/live-streaming-logo-design-vector-illustration_875240-2017.jpg",
  coins: 200000,
  level: 1,
  exp: 0,
  coinSent: 0,
  coinReceived: 0,
};

function getVipBadge(level){
  if (level >= 50) return { key: "diamond", text: "💎 VIP DIAMOND" };
  if (level >= 30) return { key: "gold", text: "👑 VIP GOLD" };
  if (level >= 10) return { key: "silver", text: "⭐ VIP SILVER" };
  return null;
}

/* =========================
   LOAD PROFILE (FIX RESET)
========================= */
function loadProfile(){
  let p;

  try {
    p = JSON.parse(localStorage.getItem(KEY));
  } catch {
    p = null;
  }

  // 👉 CHỈ TẠO PROFILE MỚI 1 LẦN DUY NHẤT
  if (!p || typeof p !== "object") {
    p = { ...defaultProfile };
    localStorage.setItem(KEY, JSON.stringify(p));
  }

  nameInput.value = p.name || "User";
  avatarPreview.src = p.avatar || defaultProfile.avatar;
  avatarPreview.onerror = () => {
    avatarPreview.src = defaultProfile.avatar;
  };

  // 🔥 COIN KHÔNG BAO GIỜ RESET
  coinVal.textContent = Number.isFinite(p.coins) ? p.coins : 0;
  levelVal.textContent = Number.isFinite(p.level) ? p.level : 1;
  coinSentVal.textContent = Number.isFinite(p.coinSent) ? p.coinSent : 0;
  coinReceivedVal.textContent = Number.isFinite(p.coinReceived) ? p.coinReceived : 0;

  // ⭐ EXP BAR
  const level = Number.isFinite(p.level) ? p.level : 1;
  const exp = Number.isFinite(p.exp) ? p.exp : 0;
  const need = level * 100;

  if (expText) expText.textContent = `${exp} / ${need}`;
  if (expFill) {
    expFill.style.width = Math.min(100, (exp / need) * 100) + "%";
  }

  // 🎖 VIP BADGE
  if (vipBadgeBox){
    vipBadgeBox.innerHTML = "";
    const badge = getVipBadge(level);
    if (badge){
      vipBadgeBox.innerHTML = `
        <span class="vip-badge vip-${badge.key}">
          ${badge.text}
        </span>
      `;
    }
  }
}

/* =========================
   SAVE PROFILE (AN TOÀN)
========================= */
document.getElementById("btnSave").onclick = () => {
  let old = {};
  try {
    old = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {}

  const profile = {
    name: nameInput.value.trim() || old.name || "User",
    avatar: old.avatar || defaultProfile.avatar,
    coins: Number.isFinite(old.coins) ? old.coins : defaultProfile.coins,
    level: Number.isFinite(old.level) ? old.level : 1,
    exp: Number.isFinite(old.exp) ? old.exp : 0,
    coinSent: Number.isFinite(old.coinSent) ? old.coinSent : 0,
    coinReceived: Number.isFinite(old.coinReceived) ? old.coinReceived : 0,
  };

  localStorage.setItem(KEY, JSON.stringify(profile));
  alert("✅ Đã lưu hồ sơ!");
};

loadProfile();

/* =========================
   AVATAR UPLOAD
========================= */
const avatarInput = document.getElementById("avatarInput");
const btnChangeAvatar = document.getElementById("btnChangeAvatar");

btnChangeAvatar.onclick = () => avatarInput.click();

avatarInput.onchange = () => {
  const file = avatarInput.files[0];
  if (!file) return;

  if (file.size > 300 * 1024) {
    alert("❌ Ảnh quá lớn (tối đa 300KB)");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result;
    avatarPreview.src = base64;

    let p = {};
    try {
      p = JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {}

    p.avatar = base64;
    localStorage.setItem(KEY, JSON.stringify(p));

    if (window.socket) {
      socket.emit("profile-update", { avatar: base64 });
    }
  };

  reader.readAsDataURL(file);
};
