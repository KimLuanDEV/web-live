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
