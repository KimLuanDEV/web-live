const KEY = "user_profile";

const nameInput = document.getElementById("nameInput");
const avatarPreview = document.getElementById("avatarPreview");
const coinVal = document.getElementById("coinVal");
const levelVal = document.getElementById("levelVal");

const defaultProfile = {
  name: "Guest",
  avatar: "https://img.freepik.com/premium-vector/live-streaming-logo-design-vector-illustration_875240-2017.jpg",
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
  const profile = {
    name,
    avatar: `https://img.freepik.com/premium-vector/live-streaming-logo-design-vector-illustration_875240-2017.jpg`,
    coins: Number(coinVal.textContent) || 0,
    level: Number(levelVal.textContent) || 1,
  };
  localStorage.setItem(KEY, JSON.stringify(profile));
  alert("✅ Đã lưu hồ sơ!");
};

loadProfile();


const avatarInput = document.getElementById("avatarInput");
const btnChangeAvatar = document.getElementById("btnChangeAvatar");
const DEFAULT_AVATAR = "https://img.freepik.com/premium-vector/live-streaming-text-neon-sign-illustration_189374-265.jpg?w=360";

let avatar = localStorage.getItem("userAvatar");
if (!avatar) {
  avatar = DEFAULT_AVATAR;
  localStorage.setItem("userAvatar", avatar);
}

avatarPreview.src = avatar;



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

