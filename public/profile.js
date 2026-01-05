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

const DEFAULT_AVATAR =
  "https://img.freepik.com/premium-vector/live-streaming-logo-design-vector-illustration_875240-2017.jpg";

function loadProfile(){
  let p = JSON.parse(localStorage.getItem(KEY)) || {};

  // 🔒 ép avatar mặc định nếu thiếu
  if (!p.avatar) p.avatar = DEFAULT_AVATAR;
  if (!p.name) p.name = "Guest";
  if (!p.coins) p.coins = 200000;
  if (!p.level) p.level = 1;

  localStorage.setItem(KEY, JSON.stringify(p));

  nameInput.value = p.name;
  avatarPreview.src = p.avatar;
  coinVal.textContent = p.coins;
  levelVal.textContent = p.level;
}


document.getElementById("btnSave").onclick = () => {
  const name = nameInput.value.trim() || "Guest";
 const old = JSON.parse(localStorage.getItem(KEY)) || {};

const profile = {
  name,
  avatar: old.avatar || DEFAULT_AVATAR,
  coins: Number(coinVal.textContent) || 0,
  level: Number(levelVal.textContent) || 1,
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

  // 🔥 CẬP NHẬT REALTIME
  socket.emit("profile-update", { avatar: data.url });
};

