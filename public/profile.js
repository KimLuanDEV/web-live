const KEY = "user_profile";

const nameInput = document.getElementById("nameInput");
const avatarPreview = document.getElementById("avatarPreview");
const coinVal = document.getElementById("coinVal");
const levelVal = document.getElementById("levelVal");
// ===== AVATAR DEFAULT SYNC =====
const DEFAULT_AVATAR = "/avatars/default.png";



// 🔒 BẮT BUỘC: đảm bảo avatar LUÔN có trong localStorage
let avatar = localStorage.getItem("userAvatar");
if (!avatar) {
  avatar = avatarPreview?.src || DEFAULT_AVATAR;
  localStorage.setItem("userAvatar", avatar);
}

// đồng bộ UI
if (avatarPreview) avatarPreview.src = avatar;


const defaultProfile = {
  name: "Guest",
  avatar: DEFAULT_AVATAR,
  coins: 200000,
  level: 1,
};


function loadProfile(){
  const p = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;
  nameInput.value = p.name;
  avatarPreview.src = p.avatar;
  coinVal.textContent = p.coins;
  levelVal.textContent = p.level;
}

document.getElementById("btnSave").onclick = () => {
  const name = nameInput.value.trim() || "Guest";

  // 🔑 avatar thật (upload hoặc default)
  const avatar = localStorage.getItem("userAvatar") || DEFAULT_AVATAR;

  const profile = {
    name,
    avatar,
    coins: Number(coinVal.textContent) || 0,
    level: Number(levelVal.textContent) || 1,
  };

  localStorage.setItem(KEY, JSON.stringify(profile));

  // 🔥 CẬP NHẬT REALTIME NẾU ĐANG TRONG PHÒNG
  if (window.socket) {
    socket.emit("profile-update", { avatar });
  }

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

  // 🔥 CẬP NHẬT REALTIME
  socket.emit("profile-update", { avatar: data.url });
};

