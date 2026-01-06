const KEY = "user_profile";

const nameInput = document.getElementById("nameInput");
const avatarPreview = document.getElementById("avatarPreview");
const coinVal = document.getElementById("coinVal");
const levelVal = document.getElementById("levelVal");
const coinSentVal = document.getElementById("coinSentVal");
const coinReceivedVal = document.getElementById("coinReceivedVal");

const defaultProfile = {
  name: "Guest",
  avatar: "https://img.freepik.com/premium-vector/live-streaming-logo-design-vector-illustration_875240-2017.jpg",
  coins: 200000,
  level: 1,
  exp: 0,            // 🔥 exp
  coinSent: 0,       // 🎁 đã tặng
  coinReceived: 0,   // 💎 đã nhận

};

function loadProfile(){
  const p = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;
  nameInput.value = p.name;
  avatarPreview.src = p.avatar;
  coinVal.textContent = p.coins;
  levelVal.textContent = p.level;
  coinSentVal.textContent = p.coinSent || 0;
  coinReceivedVal.textContent = p.coinReceived || 0;
  expVal && (expVal.textContent = p.exp || 0);

}

document.getElementById("btnSave").onclick = () => {
  const old = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;
  const name = nameInput.value.trim() || "Guest";
  const profile = {
    name,
    avatar: `https://img.freepik.com/premium-vector/live-streaming-logo-design-vector-illustration_875240-2017.jpg`,
    coins: Number(coinVal.textContent) || 0,
    level: Number(levelVal.textContent) || 1,
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

  // 🔥 CẬP NHẬT REALTIME
  socket.emit("profile-update", { avatar: data.url });
};

