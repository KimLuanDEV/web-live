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

const KEY = "user_profile";


// 👥 / 💬 PROFILE ACTION VISIBILITY (FIX DỨT ĐIỂM)
const btnProfileFriends = document.querySelector(".btn-profile-friends");
const profileFriendActions = document.getElementById("profileFriendActions");

const btnMsgFriend      = document.getElementById("btnMsgFriend");
const btnAddFriend      = document.getElementById("btnAddFriend");
const btnFriendPending  = document.getElementById("btnFriendPending");
const btnUnfriend       = document.getElementById("btnUnfriend");
const btnBlock          = document.getElementById("btnBlock");


// 🔧 FIX LEGACY AVATAR (/avatars -> R2)
const R2_PUBLIC_URL = "https://pub-a6a541cf3a9c4d0aa06613e3d1dc1c60.r2.dev";

function fixMedia(url){
  if (!url) return "";
  if (url.startsWith("/avatars/") || url.startsWith("/covers/")) {
    return R2_PUBLIC_URL + url;
  }
  return url;
}




// RESET CỨNG
if (profileFriendActions) profileFriendActions.style.display = "none";
if (btnProfileFriends) btnProfileFriends.style.display = "";


// 🔒 Mặc định KHÔNG cho nhắn tin
if (btnMsgFriend) {
  btnMsgFriend.style.display = "none";
  btnMsgFriend.disabled = true;
}


// CHỈ KHI XEM PROFILE NGƯỜI KHÁC
if (viewUid && viewUid !== __profileAuth.uid) {

  if (btnProfileFriends) btnProfileFriends.style.display = "none";
  if (profileFriendActions) profileFriendActions.style.display = "flex";

  // reset từng nút
  if (btnAddFriend) btnAddFriend.style.display = "none";
  if (btnFriendPending) btnFriendPending.style.display = "none";
  if (btnUnfriend) btnUnfriend.style.display = "none";


  // 🚫 CHECK BLOCK TRƯỚC KHI HIỆN ACTION
fetch("/api/me/" + viewUid, {
  headers: {
    "x-uid": __profileAuth.uid
  }
})
.then(r => {
  if (r.status === 403) {
    // 👉 BỊ BLOCK → KHÔNG CHO KẾT BẠN
    btnAddFriend && (btnAddFriend.style.display = "none");
    btnFriendPending && (btnFriendPending.style.display = "none");
    btnUnfriend && (btnUnfriend.style.display = "none");
    btnMsgFriend && (btnMsgFriend.style.display = "none");
    btnBlock && (btnBlock.style.display = "none");

    showMsg("🚫 Bạn không thể tương tác với người này");
    throw new Error("blocked");
  }
  return r.json();
})
.catch(() => {});


  // 🔍 LẤY TRẠNG THÁI BẠN BÈ
  fetch("/api/friends/" + __profileAuth.uid)
    .then(r => r.json())
    .then(data => {
      const friends = data.friends || [];
      const requests = data.requests || []; // lời mời nhận được
      const sent = data.sent || [];          // 🔥 lời mời đã gửi

      const isFriend = friends.some(u => u.uid === viewUid);
      const isPendingSent = sent.some(u => u.uid === viewUid);

if (isFriend) {
  // 👥 ĐÃ LÀ BẠN
  if (btnUnfriend) btnUnfriend.style.display = "block";

  // 💬 CHO PHÉP NHẮN TIN
  if (btnMsgFriend) {
    btnMsgFriend.style.display = "block";
    btnMsgFriend.disabled = false;
  }
}

else if (isPendingSent) {
  if (btnFriendPending) btnFriendPending.style.display = "block";

  if (btnMsgFriend) {
    btnMsgFriend.style.display = "none";
    btnMsgFriend.disabled = true;
  }
}
else {
  if (btnAddFriend) btnAddFriend.style.display = "block";

  if (btnMsgFriend) {
    btnMsgFriend.style.display = "none";
    btnMsgFriend.disabled = true;
  }
}
    });

  // ➕ KẾT BẠN
  if (btnAddFriend) {

btnAddFriend.onclick = () => {

  // 🚫 SAFETY: nếu đang bị block → không gửi
  fetch("/api/me/" + viewUid, {
    headers: { "x-uid": __profileAuth.uid }
  })
  .then(r => {
    if (r.status === 403) {
      showMsg("🚫 Bạn không thể gửi lời mời cho người này");
      throw new Error("blocked");
    }
    socket.emit("friend-request", { to: viewUid });

    btnAddFriend.style.display = "none";
    btnFriendPending && (btnFriendPending.style.display = "block");
    showMsg("📨 Đã gửi lời mời kết bạn");
  })
  .catch(()=>{});
};



  }

    // ❌ HUỶ LỜI MỜI ĐÃ GỬI
if (btnFriendPending) {
  btnFriendPending.onclick = () => {
    showMsg("Huỷ lời mời kết bạn?", "Xác nhận");

    document.getElementById("msgOk").onclick = () => {
      socket.emit("friend-cancel", { uid: viewUid });
      closeMsg();

      // UI quay lại trạng thái chưa là bạn
      btnFriendPending.style.display = "none";
      if (btnAddFriend) btnAddFriend.style.display = "block";

      showMsg("❌ Đã huỷ lời mời");
    };
  };
}


  // 🚫 HUỶ BẠN
  if (btnUnfriend) {
    btnUnfriend.onclick = () => {
      showMsg("Huỷ kết bạn?", "Xác nhận");
      document.getElementById("msgOk").onclick = () => {
        socket.emit("friend-remove", { uid: viewUid });
        closeMsg();

        btnUnfriend.style.display = "none";
        if (btnAddFriend) btnAddFriend.style.display = "block";

        showMsg("🚫 Đã huỷ kết bạn");
      };
    };
  }

  // ⛔ BLOCK
  if (btnBlock) {
    btnBlock.onclick = () => {
      showMsg("Chặn người này?", "Xác nhận");
      document.getElementById("msgOk").onclick = () => {
        socket.emit("user-block", { uid: viewUid });
        closeMsg();
        showMsg("⛔ Đã chặn");
      };
    };
  }


// 💬 NHẮN TIN RIÊNG (CHỈ KHI ĐÃ LÀ BẠN)
if (btnMsgFriend) {
  btnMsgFriend.onclick = () => {
    if (btnMsgFriend.disabled) {
      showMsg("🔒 Chỉ có thể nhắn tin khi đã là bạn");
      return;
    }
    location.href = "/messages.html?to=" + encodeURIComponent(viewUid);
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


// 🔔 REALTIME: BẬT CHAT KHI ACCEPT KẾT BẠN
socket.on("friend-accepted", ({ a, b }) => {
  if (!viewUid || !btnMsgFriend) return;

  const myUid = __profileAuth.uid;
  if (!myUid) return;

  // nếu mình và người đang xem vừa trở thành bạn
  const justBecameFriends =
    (viewUid === a && myUid === b) ||
    (viewUid === b && myUid === a);

  if (!justBecameFriends) return;

  // 👉 BẬT CHAT
  btnMsgFriend.style.display = "block";
  btnMsgFriend.disabled = false;

  // 👉 ẨN NÚT KẾT BẠN / CHỜ
  btnAddFriend && (btnAddFriend.style.display = "none");
  btnFriendPending && (btnFriendPending.style.display = "none");

  // 👉 HIỆN HUỶ BẠN
  btnUnfriend && (btnUnfriend.style.display = "block");

  showMsg("👥 Hai bạn đã là bạn bè, có thể nhắn tin!");
});


// 🔔 REALTIME: TẮT CHAT KHI HUỶ KẾT BẠN
socket.on("friend-removed", ({ uid }) => {
  if (!viewUid || !btnMsgFriend) return;

  const myUid = __profileAuth.uid;
  if (!myUid) return;

  // nếu mình và người đang xem vừa bị huỷ bạn
  const justUnfriended = (viewUid === uid);

  if (!justUnfriended) return;

  // ❌ TẮT CHAT
  btnMsgFriend.style.display = "none";
  btnMsgFriend.disabled = true;

  // ❌ ẨN HUỶ BẠN
  btnUnfriend && (btnUnfriend.style.display = "none");

  // ➕ HIỆN KẾT BẠN
  btnAddFriend && (btnAddFriend.style.display = "block");

  showMsg("🚫 Hai bạn không còn là bạn bè");
});

// 🚫 REALTIME: BỊ BLOCK → ẨN PROFILE + TẮT CHAT
socket.on("user-blocked", ({ by }) => {
  if (!viewUid) return;

  const myUid = __profileAuth.uid;
  if (!myUid) return;

// nếu profile đang xem là người vừa block mình
  if (viewUid !== by) return;

  // ❌ ẨN TOÀN BỘ ACTION
  btnMsgFriend && (btnMsgFriend.style.display = "none");
  btnAddFriend && (btnAddFriend.style.display = "none");
  btnFriendPending && (btnFriendPending.style.display = "none");
  btnUnfriend && (btnUnfriend.style.display = "none");
  btnBlock && (btnBlock.style.display = "none");

  // ❌ ẨN PROFILE CONTENT
  document.querySelector(".profile-main")?.classList.add("hidden");

  showMsg("🚫 Bạn không thể xem hồ sơ của người này");

  // 👉 Đẩy về trang an toàn sau 1s
  setTimeout(() => {
    history.back();
  }, 1200);
});



// 🔓 REALTIME: UNBLOCK → HIỆN LẠI PROFILE
socket.on("user-unblocked-by", ({ by }) => {
  if (!viewUid) return;

  const myUid = __profileAuth.uid;
  if (!myUid) return;

  // nếu người đang xem vừa gỡ block mình
  if (viewUid !== by) return;

  // 👉 HIỆN LẠI PROFILE
  document.querySelector(".profile-main")?.classList.remove("hidden");

  // 👉 LOAD LẠI PROFILE ĐỂ ĐỒNG BỘ
fetch("/api/me/" + viewUid, {
  headers: {
    "x-uid": __profileAuth.uid
  }
})
  .then(r => {
    // 🚫 BỊ BLOCK → KHÔNG CHO XEM PROFILE
    if (r.status === 403) {
      showMsg("🚫 Bạn không thể xem hồ sơ của người này");
      setTimeout(() => history.back(), 1200);
      throw new Error("blocked");
    }
    return r.json();
  })
  .then(data => {
    if (!data || !data.profile) return;
    renderProfileViewOnly(data.profile);
  })
  .catch(err => {
    if (err.message !== "blocked") {
      console.warn("Load profile failed", err);
    }
  });


  showMsg("🔓 Bạn đã được gỡ chặn");
});




// 🔥 LOAD PROFILE (CỦA MÌNH / NGƯỜI KHÁC)
if (viewUid && viewUid !== __profileAuth.uid) {
  // 👀 ĐANG XEM PROFILE NGƯỜI KHÁC (READ-ONLY)

fetch("/api/me/" + viewUid, {
  headers: {
    "x-uid": __profileAuth.uid
  }
})
  .then(r => {
    // 🚫 BỊ BLOCK → KHÔNG CHO XEM PROFILE
    if (r.status === 403) {
      showMsg("🚫 Bạn không thể xem hồ sơ của người này");
      setTimeout(() => history.back(), 1200);
      throw new Error("blocked");
    }
    return r.json();
  })
  .then(data => {
    if (!data || !data.profile) return;
    renderProfileViewOnly(data.profile);
  })
  .catch(err => {
    if (err.message !== "blocked") {
      console.warn("Load profile failed", err);
    }
  });



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



// 🔥 REALTIME COIN UPDATE (PROFILE)
socket.on("coin-update", data => {
  if (!data) return;

  // 🪙 COIN
  if (coinVal) {
    coinVal.textContent = data.coins ?? 0;
  }

  // 📤 COIN ĐÃ TẶNG
  if (coinSentVal) {
    coinSentVal.textContent = data.coinSent ?? 0;
  }

  // 📥 COIN ĐÃ NHẬN
  if (coinReceivedVal) {
    coinReceivedVal.textContent = data.coinReceived ?? 0;
  }

  // ⭐ LEVEL
  if (levelVal) {
    levelVal.textContent = data.level ?? 1;
  }

  // ⚡ EXP BAR
  const level = data.level || 1;
  const exp   = data.exp || 0;
  const need  = level * 100;

  if (expText) {
    expText.textContent = `${exp} / ${need}`;
  }

  if (expFill) {
    expFill.style.width =
      Math.min(100, (exp / need) * 100) + "%";
  }

  // 💾 SYNC LOCALSTORAGE (reload vẫn đúng)
  try {
    const p = JSON.parse(localStorage.getItem(KEY)) || {};
    p.coins = data.coins ?? p.coins ?? 0;
    p.coinSent = data.coinSent ?? p.coinSent ?? 0;
    p.coinReceived = data.coinReceived ?? p.coinReceived ?? 0;
    p.level = data.level ?? p.level ?? 1;
    p.exp = data.exp ?? p.exp ?? 0;
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch (e) {}
});


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
  
avatarPreview.src = fixMedia(p.avatar);



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
 coverPreview.src = fixMedia(p.cover);
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
    avatar: fixAvatar(current.avatar) || defaultProfile.avatar,

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
  headers: { "x-uid": __profileAuth.uid || "" },
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
  headers: { "x-uid": __profileAuth.uid || "" },
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
 avatarPreview.src = fixMedia(p.avatar) || defaultProfile.avatar;


  displayName.textContent = p.name || "User";

  // bio (chỉ xem)
  const bioInput = document.getElementById("bioInput");
  if (bioInput){
    bioInput.value = p.bio || "";
    bioInput.disabled = true;
  }

  // cover
  if (p.cover && coverPreview){
   coverPreview.src = fixMedia(p.cover);

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


async function confirmClearChat(){
  if(!currentTargetUID) return;

  const ok = await showModal(
    "Bạn có chắc muốn xóa toàn bộ lịch sử tin nhắn?\nHành động này không thể hoàn tác.",
    "Xóa",
    "Huỷ"
  );

  if(!ok) return;

  clearChatHistory(currentTargetUID);
}


function clearChatHistory(peer){
  if(!auth?.uid || !peer) return;

  const key =
    auth.uid < peer
      ? "chat_" + auth.uid + "_" + peer
      : "chat_" + peer + "_" + auth.uid;

  // ❌ XÓA TOÀN BỘ LOCAL CHAT
  localStorage.removeItem(key);

  // ❌ reset UI
  renderedMsgIds.clear();
  chatBox.innerHTML = `
    <div class="msg-cleared">
      🗑️ Lịch sử tin nhắn đã được xóa
    </div>
  `;

  // ❌ reset badge
  renderUserList();

  // (tuỳ chọn) báo server
  socket.emit("chat-cleared", { peer });
}
