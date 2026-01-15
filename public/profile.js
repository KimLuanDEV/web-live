const socket = io();

// 🔁 giữ socket sống để server không mất uid
setInterval(() => {
  if (socket.connected && __profileAuth.uid) {
    socket.emit("auth-ping", { uid: __profileAuth.uid });
  }
}, 4000);


// 🔐 AUTH ACCOUNT – bắt buộc
const __profileAuth = JSON.parse(localStorage.getItem("user_profile") || "{}");
// 🔥 Nếu có UID thật → chắc chắn không phải Guest
if (__profileAuth.uid) {
  localStorage.removeItem("isGuest");
}

if (__profileAuth.uid) {
  socket.emit("auth-login", { uid: __profileAuth.uid });
}

// nếu bị login nơi khác → đá
socket.on("force-logout", () => {
   showMsg("⚠️ Tài khoản của bạn đã đăng nhập trên thiết bị khác");
  localStorage.removeItem("user_profile");
  location.href = "/login.html";
});


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
  coins: 0,
  level: 1,
  exp: 0,            // 🔥 exp
  coinSent: 0,       // 🎁 đã tặng
  coinReceived: 0,   // 💎 đã nhận
  bio: "",

};


const displayName = document.getElementById("displayName");

displayName.onclick = ()=>{
  displayName.classList.add("hidden");
  nameInput.classList.remove("hidden");
  nameInput.focus();
};

nameInput.onblur = ()=>{
  const val = nameInput.value.trim() || "User";

  // update UI
  displayName.textContent = val;
  displayName.classList.remove("hidden");
  nameInput.classList.add("hidden");

  // 🔥 tự lưu vào profile
  const p = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;
  p.name = val;
  localStorage.setItem(KEY, JSON.stringify(p));

  // 🔄 sync realtime nếu đang login
  if (__profileAuth.uid){

  const current = JSON.parse(localStorage.getItem(KEY)) || {};

  socket.emit("profile-update", {
  name: current.name,
  avatar: current.avatar   // 🔥 gửi avatar hiện tại
});

    socket.emit("auth-login", { uid: __profileAuth.uid });
  }

  showMsg("✅ Đã cập nhật tên hiển thị");
};



function getVipBadge(level){
  level = Number(level) || 1;

  if (level >= 250) {
    return { key:"immortal", text:"💎 VIP IMMORTAL", color:"#ff3b3b" };
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
  displayName.textContent = p.name;
  avatarPreview.src = p.avatar;

  const bioInput = document.getElementById("bioInput");
if(bioInput) bioInput.value = p.bio || "";


  avatarPreview.onerror = () => {
  avatarPreview.src = defaultProfile.avatar;
};
  coinVal.textContent = p.coins || 0;
  levelVal.textContent = p.level || 1;

  // ===== AVATAR VIP RING =====
  const lv = Number(p.level || 1);
  const ava = avatarPreview;

  // 🌟 Halo for high VIP
const wrap = document.querySelector(".avatar-wrap");
if(wrap){
  if(lv >= 1) wrap.classList.add("halo-on");   // LEGEND+
  else wrap.classList.remove("halo-on");
}


  ava.classList.remove("avatar-lv1","avatar-lv10","avatar-lv50","avatar-lv100");

  if(lv >= 1) ava.classList.add("avatar-lv100");
 


  // 👑 Crown for VIP
  const crown = document.getElementById("avatarCrown");
  if(crown){
    if(lv >= 1) crown.classList.remove("hidden");   // GOLD+
    else crown.classList.add("hidden");
  }


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

const btnMessages = document.getElementById("btnMessages");
if(btnMessages){
  btnMessages.onclick = () => {
    window.location.href = "/messages.html";
  };
}



document.getElementById("btnSave").onclick = () => {
  const current = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;
  const uid = __profileAuth.uid || current.uid;

  const profile = {
    uid,
    name: nameInput.value.trim() || "Guest",
    avatar: current.avatar || defaultProfile.avatar,   // ✅ GIỮ AVATAR MỚI
    coins: Number(coinVal.textContent) || 0,
    level: Number(levelVal.textContent) || 1,
    exp: current.exp || 0,
    coinSent: current.coinSent || 0,
    coinReceived: current.coinReceived || 0,
    bio: current.bio || ""
  };

  localStorage.setItem(KEY, JSON.stringify(profile));

  if(uid){
    socket.emit("profile-update", {
      name: profile.name,
      avatar: profile.avatar
    });
    socket.emit("auth-login", { uid });
  }

  showMsg("✅ Đã lưu hồ sơ!");
};


loadProfile();


const avatarInput = document.getElementById("avatarInput");
const btnChangeAvatar = document.getElementById("btnChangeAvatar");

document.querySelector(".avatar-wrap").onclick = () => {
  avatarInput.click();
};


avatarInput.onchange = async () => {
  const file = avatarInput.files[0];
  if (!file) return;

  // ⚠️ Giới hạn size để tránh localStorage quá lớn
  if (file.size > 300 * 1024) {
     showMsg("❌ Ảnh quá lớn (tối đa 300KB)");
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
    if (socket && __profileAuth.uid) {
  socket.emit("profile-update", { avatar: base64 });
  socket.emit("auth-login", { uid: __profileAuth.uid }); // 🔐 GIỮ KHÓA LOGIN
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


// ===== CHANGE PASSWORD =====
const passModal = document.getElementById("passModal");
const btnChangePass = document.getElementById("btnChangePass");

if(btnChangePass){
  btnChangePass.onclick = ()=>{
    passModal.classList.remove("hidden");
  };
}

function closePass(){
  passModal.classList.add("hidden");
}

async function submitChangePass(){
  const oldPass = document.getElementById("oldPass").value;
  const newPass = document.getElementById("newPass").value;
  const newPass2 = document.getElementById("newPass2").value;

  if(!oldPass || !newPass || !newPass2){
     showMsg("❌ Nhập đầy đủ thông tin");
    return;
  }

  if(newPass.length < 6){
     showMsg("❌ Mật khẩu mới phải >= 6 ký tự");
    return;
  }

  if(newPass !== newPass2){
     showMsg("❌ Mật khẩu nhập lại không khớp");
    return;
  }

  const uid = __profileAuth.uid;
  if(!uid){
    showMsg("❌ Chưa đăng nhập");
    return;
  }

  const res = await fetch("/api/change-password",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      uid,
      oldPass,
      newPass
    })
  });

 const data = await res.json();

if(data.ok || data.success){
   showMsg("✅ Đổi mật khẩu thành công");
  closePass();

  // xoá input cho sạch
  oldPass.value = "";
  newPass.value = "";
  newPass2.value = "";
  return;
}

// các dạng lỗi
if(data.error === "pass"){
   showMsg("❌ Mật khẩu cũ không đúng");
  return;
}

if(data.error === "otp"){
   showMsg("❌ OTP sai hoặc hết hạn");
  return;
}

 showMsg("❌ Đổi mật khẩu thất bại");

}


function showMsg(text, title="Thông báo"){
  document.getElementById("msgTitle").textContent = title;
  document.getElementById("msgText").textContent = text;
  document.getElementById("msgModal").classList.remove("hidden");
}

function closeMsg(){
  document.getElementById("msgModal").classList.add("hidden");
}



// ===== MOBILE TAB BAR (PROFILE) =====
document.querySelectorAll(".tab-item").forEach(tab=>{
  tab.onclick = ()=>{
    const type = tab.dataset.tab;

    if(type === "profile") return;

    if(type === "lobby"){
      location.href = "/lobby.html";
    }

    if(type === "chat"){

      location.href = "/messages.html";
    }

    if(type === "hot"){

     location.href = "/social.html";
    }


  };
});

document.getElementById("tabCreate")?.addEventListener("click", ()=>{
  const isGuest = localStorage.getItem("isGuest") === "1";
  if(isGuest){
    showMsg("🔒 Đăng nhập để tạo phòng livestream");
    return;
  }
  location.href = "/lobby.html";
});


const bioInput = document.getElementById("bioInput");

if(bioInput){
  bioInput.oninput = ()=>{
    const p = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;
    p.bio = bioInput.value.slice(0, 300); // giới hạn 300 ký tự
    localStorage.setItem(KEY, JSON.stringify(p));

    if(__profileAuth.uid){
      socket.emit("profile-update", { bio: p.bio });
    }
  };
}


let lastScroll = 0;
const tabbar = document.querySelector(".mobile-tabbar");

window.addEventListener("scroll", ()=>{
  const cur = window.scrollY;

  if(cur > lastScroll + 10){
    tabbar.classList.add("hide");
  }
  else if(cur < lastScroll - 10){
    tabbar.classList.remove("hide");
  }

  lastScroll = cur;
});


