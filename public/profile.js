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


function resizeImageTo512(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => {
      img.src = e.target.result;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 512;
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");

      // Crop center square
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;

      ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);

      canvas.toBlob(
        blob => {
          if (!blob) return reject("resize failed");
          resolve(blob);
        },
        "image/jpeg",
        0.92 // quality 92%
      );
    };

    img.onerror = reject;
    reader.readAsDataURL(file);
  });
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

  const fd = new FormData();
  fd.append("avatar", file);

  const res = await fetch("/api/upload-avatar", {
    method: "POST",
    body: fd
  });

  const data = await res.json();
  if (!data.url) {
    showMsg("❌ Upload thất bại");
    return;
  }

  const avatarUrl = data.url;

  // update UI
  avatarPreview.src = avatarUrl;

  // lưu vào profile
  const p = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;
  p.avatar = avatarUrl;
  localStorage.setItem(KEY, JSON.stringify(p));

  // sync realtime
  if (__profileAuth.uid) {
    socket.emit("profile-update", { avatar: avatarUrl });
    socket.emit("auth-login", { uid: __profileAuth.uid });
  }
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
  const oldEl  = document.getElementById("oldPass");
  const newEl  = document.getElementById("newPass");
  const new2El = document.getElementById("newPass2");

  const securityCode = (oldEl?.value || "").trim();
  const newPassword  = (newEl?.value || "").trim();
  const newPassword2 = (new2El?.value || "").trim();

  if(!securityCode || !newPassword || !newPassword2){
    showMsg("❌ Nhập đầy đủ thông tin");
    return;
  }

  if(newPassword.length < 6){
    showMsg("❌ Mật khẩu mới phải >= 6 ký tự");
    return;
  }

  if(newPassword !== newPassword2){
    showMsg("❌ Mật khẩu nhập lại không khớp");
    return;
  }

  const username = __profileAuth?.uid;
  if(!username){
    showMsg("❌ Chưa đăng nhập");
    return;
  }

  const res = await fetch("/api/change-password",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      username,
      securityCode,
      newPassword
    })
  });

  const data = await res.json();

  if(data.ok){
    showMsg("✅ Đổi mật khẩu thành công");
    closePass();

    // xoá input cho sạch
    if(oldEl)  oldEl.value  = "";
    if(newEl)  newEl.value  = "";
    if(new2El) new2El.value = "";
    return;
  }

  // map lỗi theo backend
  if(data.error === "missing"){
    showMsg("❌ Thiếu dữ liệu");
    return;
  }
  if(data.error === "notfound"){
    showMsg("❌ Tài khoản không tồn tại");
    return;
  }
  if(data.error === "invalid"){
    showMsg("❌ Mã bảo mật không đúng");
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

const tabbar =
  document.querySelector(".mobile-tabbar") ||
  document.querySelector(".lp-tabbar");

function isNearBottom(){
  const scrollY = window.scrollY;
  const winH = window.innerHeight;
  const docH = document.body.scrollHeight;

  return scrollY + winH >= docH - 120; // cách đáy 120px
}

window.addEventListener("scroll", ()=>{
  if(!tabbar) return;

  const cur = window.scrollY;

  // 🔽 Vuốt xuống → ẩn
  if(cur > lastScroll + 10){
    tabbar.classList.add("hide");
  }
  // 🔼 Vuốt lên → hiện
  else if(cur < lastScroll - 10){
    tabbar.classList.remove("hide");
  }

  // 🧲 Gần đáy → ép hiện lại
  if(isNearBottom()){
    tabbar.classList.remove("hide");
  }

  lastScroll = cur;
},{ passive:true });




// nếu có bottom-sheet mobile
document.getElementById("sheetLogout")?.addEventListener("click", ()=>{
  closeProfileSheet?.();
  confirmLogoutProfile();
});


function confirmLogoutProfile(){
  const modal = document.getElementById("msgModal");
  const title = document.getElementById("msgTitle");
  const text  = document.getElementById("msgText");
  const okBtn = document.getElementById("msgOk");

  title.textContent = "Xác nhận đăng xuất";
  text.textContent  = "Bạn có chắc chắn muốn đăng xuất không?";

  modal.classList.remove("hidden");

  // reset để tránh chồng event
  okBtn.onclick = null;

  okBtn.onclick = () => {
    localStorage.removeItem("user_profile");
    localStorage.removeItem("login_uid");
    localStorage.removeItem("isGuest");
    location.href = "/login.html";
  };
}


// ===== MOBILE TAB SETTINGS =====
const profileSheet = document.getElementById("profileSheet");
const tabSettings = document.getElementById("tabSettings");

if(tabSettings){
  tabSettings.onclick = () => {
    profileSheet.classList.remove("hidden");
  };
}

function closeProfileSheet(){
  profileSheet.classList.add("hidden");
}

/* mở modal đổi mật khẩu từ sheet */
function openChangePass(){
  closeProfileSheet();
  document.getElementById("passModal")?.classList.remove("hidden");
}


function confirmLogout(){
  closeProfileSheet();

  document.getElementById("msgTitle").textContent = "Xác nhận";
  document.getElementById("msgText").textContent =
    "Bạn có chắc chắn muốn đăng xuất không?";

  document.getElementById("msgModal").classList.remove("hidden");

  const ok = document.getElementById("msgOk");
  ok.onclick = () => {
    localStorage.removeItem("user_profile");
    localStorage.removeItem("isGuest");
    location.href = "/login.html";
  };
}
