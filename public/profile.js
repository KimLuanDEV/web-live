const socket = io();
const params = new URLSearchParams(location.search);
const viewUid = params.get("uid"); // uid đang xem (có thể null)

// 🔁 giữ socket sống để server không mất uid
setInterval(() => {
  if (socket.connected && __profileAuth.uid) {
    socket.emit("auth-ping", { uid: __profileAuth.uid });
  }
}, 4000);


// 🔐 AUTH ACCOUNT – bắt buộc
const __profileAuth = JSON.parse(localStorage.getItem("user_profile") || "{}");


// ===============================
// 👥 / 💬 PROFILE ACTION VISIBILITY
// ===============================
const btnProfileFriends = document.querySelector(".btn-profile-friends");
const profileFriendActions = document.getElementById("profileFriendActions");
const btnMsgFriend = document.getElementById("btnMsgFriend");
const btnUnfriend  = document.getElementById("btnUnfriend");
const btnBlock     = document.getElementById("btnBlock");

// 🔒 RESET MẶC ĐỊNH (RẤT QUAN TRỌNG)
if (profileFriendActions) profileFriendActions.hidden = true;
if (btnProfileFriends) btnProfileFriends.style.display = "";

// 👀 CHỈ KHI XEM PROFILE NGƯỜI KHÁC
if (viewUid && viewUid !== __profileAuth.uid) {

  // ❌ Ẩn nút "Bạn bè"
  if (btnProfileFriends) {
    btnProfileFriends.style.display = "none";
  }

  // ✅ Hiện 3 nút action
  if (profileFriendActions) {
    profileFriendActions.hidden = false;
  }

  // 💬 Nhắn tin
  if (btnMsgFriend) {
    btnMsgFriend.onclick = () => {
      location.href = "/messages.html?to=" + encodeURIComponent(viewUid);
    };
  }

  // 🚫 Huỷ bạn
  if (btnUnfriend) {
    btnUnfriend.onclick = () => {
      showMsg("Bạn có chắc chắn muốn huỷ kết bạn?", "Xác nhận");
      document.getElementById("msgOk").onclick = () => {
        socket.emit("friend-remove", { uid: viewUid });
        closeMsg();
        showMsg("✅ Đã huỷ kết bạn");
      };
    };
  }

  // ⛔ Block
  if (btnBlock) {
    btnBlock.onclick = () => {
      showMsg(
        "Chặn người này? Bạn sẽ không nhận được tin nhắn hay lời mời nữa.",
        "Xác nhận"
      );
      document.getElementById("msgOk").onclick = () => {
        socket.emit("user-block", { uid: viewUid });
        closeMsg();
        showMsg("⛔ Đã chặn người dùng");
      };
    };
  }
}




// 🔥 Nếu có UID thật → chắc chắn không phải Guest
if (__profileAuth.uid) {
  localStorage.removeItem("isGuest");
}

if (__profileAuth.uid) {
  socket.emit("auth-login", { uid: __profileAuth.uid });
}


// 🔥 LOAD PROFILE (CỦA MÌNH / NGƯỜI KHÁC)
if (viewUid && viewUid !== __profileAuth.uid) {
  // 👀 ĐANG XEM PROFILE NGƯỜI KHÁC (READ-ONLY)
  fetch("/api/me/" + viewUid)
    .then(r => r.json())
    .then(data => {
      if (!data || !data.profile) return;
      renderProfileViewOnly(data.profile);
    })
    .catch(()=>{});
} else if (__profileAuth.uid) {
  // 👤 PROFILE CỦA MÌNH
  fetch("/api/me/" + __profileAuth.uid)
    .then(r => r.json())
    .then(data => {
      if (!data || !data.profile) return;

      const p = {
        ...defaultProfile,
        ...data.profile
      };

      localStorage.setItem(KEY, JSON.stringify(p));
      loadProfile();
    })
    .catch(()=>{});
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
// ===== COVER ELEMENTS (PHẢI Ở TRƯỚC loadProfile) =====
const coverPreview = document.getElementById("coverPreview");
const coverInput   = document.getElementById("coverInput");
const btnChangeCover = document.getElementById("btnChangeCover");


let __coverUploading = false;

// 🧯 WATCHDOG – chống treo UI vĩnh viễn
setInterval(() => {
  if (__coverUploading) {
    console.warn("⚠️ watchdog reset coverUploading");
    __coverUploading = false;
  }

  document.body.style.pointerEvents = "auto";
  document.body.style.overflow = "auto";
}, 3000);




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


// 🔥 SAFETY RESET – tránh treo event mobile
window.addEventListener("pageshow", () => {
  if (typeof __coverUploading !== "undefined") {
    __coverUploading = false;
  }
});


const displayName = document.getElementById("displayName");

displayName.onclick = ()=>{

  // 🚫 ĐANG XEM PROFILE NGƯỜI KHÁC → KHÔNG CHO SỬA TÊN
  if (viewUid && viewUid !== __profileAuth.uid) return;


  displayName.classList.add("hidden");
  nameInput.classList.remove("hidden");
  nameInput.focus();
};

nameInput.onblur = ()=>{

    // 🚫 ĐANG XEM PROFILE NGƯỜI KHÁC → KHÔNG GHI
  if (viewUid && viewUid !== __profileAuth.uid) {
    nameInput.classList.add("hidden");
    displayName.classList.remove("hidden");
    return;
  }


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

if (p.cover && coverPreview) {
  coverPreview.src = p.cover;
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

 // 🚫 ĐANG XEM PROFILE NGƯỜI KHÁC → KHÔNG LƯU
  if (viewUid && viewUid !== __profileAuth.uid) return;

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
    avatar: profile.avatar,
    bio: profile.bio
  });
}


  showMsg("✅ Đã lưu hồ sơ!");
};


loadProfile();
loadFriendCount();
loadFriendRequestCount();


const avatarInput = document.getElementById("avatarInput");
const btnChangeAvatar = document.getElementById("btnChangeAvatar");

document.querySelector(".avatar-wrap").onclick = () => {

   // 🚫 ĐANG XEM PROFILE NGƯỜI KHÁC → KHÔNG ĐỔI AVATAR
  if (viewUid && viewUid !== __profileAuth.uid) return;

  avatarInput.click();
};


avatarInput.onchange = async () => {

   // 🚫 ĐANG XEM PROFILE NGƯỜI KHÁC → KHÔNG ĐỔI AVATAR
  if (viewUid && viewUid !== __profileAuth.uid) return;

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
    hideTabbar();
  };
}

function closePass(){
  passModal.classList.add("hidden");
  showTabbar();
}

// Ẩn tab bar khi mở đổi mật khẩu (mobile)
function hideTabbar(){
  document.querySelector(".mobile-tabbar")?.classList.add("hide-force");
}

function showTabbar(){
  document.querySelector(".mobile-tabbar")?.classList.remove("hide-force");
}



// 👉 Tap nền đen để đóng passModal (mobile-friendly)
passModal
  ?.querySelector(".modal-backdrop")
  ?.addEventListener("click", closePass);



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



const bioInput = document.getElementById("bioInput");

if (bioInput) {

  bioInput.onblur = () => {

    // 🚫 ĐANG XEM PROFILE NGƯỜI KHÁC → KHÔNG GHI
    if (viewUid && viewUid !== __profileAuth.uid) return;

    const p = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;
    p.bio = bioInput.value.slice(0, 300);
    localStorage.setItem(KEY, JSON.stringify(p));

    if (__profileAuth.uid) {
      socket.emit("profile-update", { bio: p.bio });
    }

    showMsg("✅ Đã lưu giới thiệu");
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



// 📱 Mobile: focus input → đẩy bottom-sheet lên
document.querySelectorAll("#passModal input").forEach(inp=>{
  inp.addEventListener("focus", ()=>{
    document.body.classList.add("keyboard-open");
  });
  inp.addEventListener("blur", ()=>{
    document.body.classList.remove("keyboard-open");
  });
});



if (btnChangeCover && coverInput) {
  btnChangeCover.onclick = () => coverInput.click();
}

if (coverInput) {
  coverInput.onchange = async () => {

   // 🚫 ĐANG XEM PROFILE NGƯỜI KHÁC → KHÔNG ĐỔI COVER
    if (viewUid && viewUid !== __profileAuth.uid) return;

    if (__coverUploading) return;
    __coverUploading = true;

    try {
      const file = coverInput.files[0];
      if (!file) return;

      const fd = new FormData();

      const resized = await resizeCoverImage(file);
      fd.append("cover", resized, "cover.jpg");

      const res = await fetch("/api/upload-cover", {
        method: "POST",
        body: fd
      });

      const data = await res.json();
      if (!data.url) {
        showMsg("❌ Upload ảnh bìa thất bại");
        return;
      }

      const coverUrl = data.url;

      // ✅ update UI
      coverPreview.src = coverUrl;

      // ✅ lưu local
      const p = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;
      p.cover = coverUrl;
      localStorage.setItem(KEY, JSON.stringify(p));

      // ✅ sync realtime (DELAY cho mobile)
      if (__profileAuth.uid) {
        setTimeout(() => {
          socket.emit("profile-update", { cover: coverUrl });
        }, 300);
      }

      showMsg("✅ Đã cập nhật ảnh bìa");
    } catch (e) {
      console.error("Cover upload failed", e);
      showMsg("❌ Lỗi xử lý ảnh bìa");
    } finally {
      __coverUploading = false;
       // 🔥 reset input để mobile nhận change lần sau
  coverInput.value = "";
    }
  };
}




async function resizeCoverImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => img.src = e.target.result;

    img.onload = () => {
      const maxW = 1280;
      const scale = Math.min(1, maxW / img.width);

      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(),
        "image/jpeg",
        0.85
      );
    };

    reader.readAsDataURL(file);
  });
}



async function loadFriendCount(){
  const uid = __profileAuth.uid;
  if(!uid) return;

  try{
    const res = await fetch("/api/friends/" + uid);
    const data = await res.json();

    const count = (data.friends || []).length;
    const badge = document.getElementById("friendCount");

    if(!badge) return;

    if(count > 0){
      badge.textContent = count;
      badge.hidden = false;
    }else{
      badge.hidden = true;
    }
  }catch(e){
    console.warn("loadFriendCount failed", e);
  }
}


socket.on("friend-updated", ()=>{
  loadFriendCount();
  loadFriendRequestCount();
});



async function loadFriendRequestCount(){
  const uid = __profileAuth.uid;
  if(!uid) return;

  try{
    const res = await fetch("/api/friends/" + uid);
    const data = await res.json();

    const pending = (data.requests || []).length;
    const badge = document.getElementById("friendReqCount");

    if(!badge) return;

    if(pending > 0){
      badge.textContent = pending;
      badge.hidden = false;
    }else{
      badge.hidden = true;
    }
  }catch(e){
    console.warn("loadFriendRequestCount failed", e);
  }
}



function renderProfileViewOnly(p){
  // avatar + name
  avatarPreview.src = p.avatar || defaultProfile.avatar;
  displayName.textContent = p.name || "User";

  // bio (chỉ xem)
  const bioInput = document.getElementById("bioInput");
  if (bioInput){
    bioInput.value = p.bio || "";
    bioInput.disabled = true;
  }

  // cover
  if (p.cover && coverPreview){
    coverPreview.src = p.cover;
  }

  // level / stats
  levelVal.textContent = p.level || 1;
  coinVal.textContent = p.coins || 0;
  coinSentVal.textContent = p.coinSent || 0;
  coinReceivedVal.textContent = p.coinReceived || 0;

  // ẨN CÁC CHỨC NĂNG CHỈ DÀNH CHO CHỦ TÀI KHOẢN
  document.querySelectorAll(
    "#btnSave, #btnChangeAvatar, #btnChangeCover, #btnChangePass, .btn-logout"
  ).forEach(el => el && (el.style.display = "none"));
}

// 🔒 ẨN ICON CAMERA KHI XEM PROFILE NGƯỜI KHÁC
document.querySelectorAll(".avatar-camera").forEach(el=>{
  el.style.display = "none";
});


