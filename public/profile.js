



const params = new URLSearchParams(location.search);
const viewUid = params.get("uid"); // uid đang xem (có thể null)

// 🔁 giữ socket sống để server không mất uid
setInterval(() => {
  if (socket.connected && __profileAuth.uid) {
    socket.emit("auth-ping", { uid: __profileAuth.uid });
  }
}, 4000);


// 🔐 AUTH ACCOUNT – bắt buộc
window.__profileAuth = JSON.parse(localStorage.getItem("user_profile") || "{}");


const KEY = "user_profile";



/* ==========================================
   PROFILE - SMOOTH PAGE NAVIGATION
========================================== */

function navigateProfilePage(url, label = "Opening page...") {

  label = profileEnglishText(label);

  if (
    window.LSPTransition &&
    typeof window.LSPTransition.go === "function"
  ) {

    return window.LSPTransition.go(url, {
      label
    });

  }

  // Dự phòng nếu file hiệu ứng chưa tải
  window.location.href = url;

}



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

function isAdminUser(u) {
  return (
    u?.role === "admin" ||
    (Array.isArray(u?.roles) && u.roles.includes("admin"))
  );
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

// 🔥 ADMIN CHECK
const meIsAdmin =
  __profileAuth.role === "admin" ||
  (__profileAuth.roles || []).includes("admin");

const targetIsAdmin =
  window.allUsers?.[viewUid] &&
  (
    window.allUsers[viewUid].role === "admin" ||
    (window.allUsers[viewUid].roles || []).includes("admin")
  );

// ===============================
// 👥 / 💬 LOGIC HIỂN THỊ ACTION
// ===============================

// ✅ CHO NHẮN TIN NẾU:
// - đã là bạn
// - HOẶC mình là admin
// - HOẶC người kia là admin
if (isFriend || meIsAdmin || targetIsAdmin) {

  // 👥 nếu là bạn thì cho huỷ bạn
  if (isFriend && btnUnfriend) {
    btnUnfriend.style.display = "block";
  }

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



/* ==========================================
   PRIVATE MESSAGE TRANSITION
========================================== */

if (btnMsgFriend) {

  btnMsgFriend.onclick = () => {

    if (btnMsgFriend.disabled) {

      showMsg(
        "🔒 Chỉ có thể nhắn tin khi đã là bạn"
      );

      return;
    }

    const url =
      "/messages.html?to=" +
      encodeURIComponent(viewUid);

    navigateProfilePage(
      url,
      "Đang mở cuộc trò chuyện..."
    );

  };

}



  
}




// 🔥 Nếu có UID thật → chắc chắn không phải Guest
if (__profileAuth.uid) {
  localStorage.removeItem("isGuest");
}

if (__profileAuth.uid) {
  socket.emit("socket-login", {
  uid: __profileAuth.uid
});
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

      // ✅ LUÔN TIN SERVER (coin thật nằm ở đây)
   const old = JSON.parse(localStorage.getItem(KEY)) || {};

const p = {
  ...defaultProfile,
  ...data.profile,
  role: __profileAuth.role,      // 🔥 LẤY TỪ LOGIN
  roles: __profileAuth.roles || []
};



      localStorage.setItem(KEY, JSON.stringify(p));
      loadProfile();
    })
    .catch(() => {});
}









const nameInput = document.getElementById("nameInput");
const avatarPreview = document.getElementById("avatarPreview");
const coinVal = document.getElementById("coinVal");
const coinDepositVal =
  document.getElementById("coinDepositVal");
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
const btnWithdraw = document.getElementById("btnWithdraw");
const btnWithdrawFromSheet =
  document.getElementById("btnWithdrawFromSheet");

if (btnWithdrawFromSheet) {
  btnWithdrawFromSheet.onclick = () => {
    closeProfileSheet();

    // 🚫 chỉ cho rút tiền của chính mình
    if (viewUid && viewUid !== __profileAuth.uid) {
      showMsg("🚫 Bạn không thể rút tiền từ tài khoản này");
      return;
    }

    const received =
      Number(document.getElementById("coinReceivedVal")?.textContent || 0);

    if (received <= 0) {
      showMsg("💎 Bạn chưa có kim cương để rút");
      return;
    }

    // 👉 chuyển sang trang rút tiền
    navigateProfilePage(
  `/withdraw.html?received=${received}`,
  "Đang mở trang Rút kim cương..."
);
  };
}



if (btnWithdraw) {
  btnWithdraw.onclick = () => {
    // 🚫 chỉ cho rút profile của chính mình
    if (viewUid && viewUid !== __profileAuth.uid) {
      showMsg("🚫 Bạn không thể rút tiền từ tài khoản này");
      return;
    }

    const received = Number(coinReceivedVal.textContent || 0);

    if (received <= 0) {
      showMsg("💎 Bạn chưa có kim cương để rút");
      return;
    }

    // 👉 mở trang rút tiền
    navigateProfilePage(
  `/withdraw.html?received=${received}`,
  "Đang mở trang Rút kim cương..."
);
  };
}



const btnInvest = document.getElementById("btnInvest");

if (btnInvest) {
  btnInvest.onclick = () => {
    // 🚫 không cho đầu tư khi xem profile người khác
    if (viewUid && viewUid !== __profileAuth.uid) {
      showMsg("🚫 Bạn không thể đầu tư bằng tài khoản này");
      return;
    }

    navigateProfilePage(
  "/invest.html",
  "Đang mở Thị trường đầu tư..."
);
  };
}



const btnTopupCoin = document.getElementById("btnTopupCoin");

if (btnTopupCoin) {
  btnTopupCoin.onclick = () => {

    // 🚫 đang xem profile người khác → không cho nạp
    if (viewUid && viewUid !== __profileAuth.uid) {
      showMsg("🚫 Bạn không thể nạp coin cho tài khoản này");
      return;
    }

navigateProfilePage(
  "/topup.html",
  "Đang mở trang Nạp kim cương..."
);
  };
}






let __coverUploading = false;



// 🔥 REALTIME COIN UPDATE (PROFILE)
socket.on("coin-update", data => {




  // 🚫 ĐANG XEM PROFILE NGƯỜI KHÁC → KHÔNG UPDATE COIN
  if (viewUid && viewUid !== __profileAuth.uid) return;

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

  if(coinDepositVal){
    coinDepositVal.textContent =
      data.coinDeposit ?? 0
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
  avatar: "https://i.ibb.co/GvJWn19q/icon-192.png",
  coins: 0,
  level: 1,
  exp: 0,            // 🔥 exp
  coinSent: 0,       // 🎁 đã tặng
  coinReceived: 0,   // 💎 đã nhận
  coinDeposit:0,
  bio: "",

};


// 🔥 SAFETY RESET – tránh treo event mobile
window.addEventListener("pageshow", () => {
  if (typeof __coverUploading !== "undefined") {
    __coverUploading = false;
  }
});


const displayName = document.getElementById("displayName");

// 🔁 NHẬN DANH SÁCH USER → FIX MẤT TÍCH XANH KHI RELOAD
window.allUsers = window.allUsers || {};

socket.on("all-users", list => {
  list.forEach(u => {
    window.allUsers[u.uid] = u;
  });

  // 👉 render lại badge cho profile đang xem
  const uid = viewUid || __profileAuth.uid;
  if (uid) {
    renderProfileVerified(uid);
  }
});



// ✅ VERIFIED BADGE FOR PROFILE (ADMIN)
function renderProfileVerified(uid){
  if (!uid) return;

  const box = document.getElementById("displayName");
  const nameText = document.getElementById("profileNameText");
  if (!box || !nameText) return;

  // xoá badge cũ
  box.querySelector(".lp-verified")?.remove();

  const u = window.allUsers?.[uid];
  if (!u) return;

  const isAdmin =
    u.role === "admin" ||
    (Array.isArray(u.roles) && u.roles.includes("admin"));

  if (isAdmin) {
    box.insertAdjacentHTML(
      "beforeend",
      `<span class="lp-verified" title="Admin Livestream Pro">✔︎</span>`
    );
  }
}





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
    return { key:"immortal", text:"SVIP 8", color:"#ff3b3b" };
  }
  if (level >= 200) {
    return { key:"emperor", text:"SVIP 7", color:"#ffd36e" };
  }
  if (level >= 150) {
    return { key:"king", text:"SVIP 6", color:"#c77dff" };
  }
  if (level >= 100) {
    return { key:"legend", text:"SVIP 5", color:"#ff6a00" };
  }
  if (level >= 70) {
    return { key:"diamond", text:"SVIP 4", color:"#5fd1ff" };
  }
  if (level >= 40) {
    return { key:"gold", text:"SVIP 3", color:"#ffd36e" };
  }
  if (level >= 20) {
    return { key:"silver", text:"SVIP 2", color:"#cfd8dc" };
  }
  if (level >= 10) {
    return { key:"vip", text:"SVIP 1", color:"#8bc34a" };
  }
  return null;
}


function loadProfile(){
  const p = JSON.parse(localStorage.getItem(KEY)) || defaultProfile;

  nameInput.value = p.name;

 profileNameText.textContent = p.name;
renderProfileVerified(__profileAuth.uid);

  

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
  coinDepositVal.textContent = p.coinDeposit || 0
  
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



// Chỉ cập nhật huy hiệu xác minh trên Profile
setTimeout(() => {
  renderProfileVerified(__profileAuth.uid);
}, 100);




}


const btnMessages =
  document.getElementById("btnMessages");

if (btnMessages) {

  btnMessages.onclick = () => {

    navigateProfilePage(
      "/messages.html",
      "Đang mở Tin nhắn..."
    );

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
    showMsg("Nhập đầy đủ thông tin");
    return;
  }

  if(newPassword.length < 6){
    showMsg("Mật khẩu mới phải >= 6 ký tự");
    return;
  }

  if(newPassword !== newPassword2){
    showMsg("Mật khẩu nhập lại không khớp");
    return;
  }

  const username = __profileAuth?.uid;
  if(!username){
    showMsg("Chưa đăng nhập");
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
    showMsg("Đổi mật khẩu thành công");
    closePass();

    // xoá input cho sạch
    if(oldEl)  oldEl.value  = "";
    if(newEl)  newEl.value  = "";
    if(new2El) new2El.value = "";
    return;
  }

  // map lỗi theo backend
  if(data.error === "missing"){
    showMsg("Thiếu dữ liệu");
    return;
  }
  if(data.error === "notfound"){
    showMsg("Tài khoản không tồn tại");
    return;
  }
  if(data.error === "invalid"){
    showMsg("Mã bảo mật không đúng");
    return;
  }

  showMsg("Đổi mật khẩu thất bại");
}




/* ==========================================
   GLOBAL MESSAGE - RESET CLICK HANDLER
========================================== */

function showMsg(text, title = "Thông báo") {

  const modal = document.getElementById("msgModal");
  const titleEl = document.getElementById("msgTitle");
  const textEl = document.getElementById("msgText");
  const okBtn = document.getElementById("msgOk");

  if (!modal || !titleEl || !textEl || !okBtn) return;

  titleEl.textContent = title;
  textEl.textContent = text;

  // Xóa sự kiện xác nhận cũ, kể cả đăng xuất.
  okBtn.onclick = null;

  // Thông báo thông thường: xác nhận chỉ đóng popup.
  okBtn.onclick = () => {
    closeMsg();
  };

  modal.classList.remove("hidden");
}

function closeMsg() {

  const modal = document.getElementById("msgModal");
  const okBtn = document.getElementById("msgOk");

  if (!modal) return;

  modal.classList.add("hidden");

  // Không giữ lại hành động từ popup trước.
  if (okBtn) {
    okBtn.onclick = null;
  }
}




/* ==========================================
   PROFILE MOBILE TAB BAR
   SMOOTH PAGE TRANSITION
========================================== */

document.querySelectorAll(".tab-item").forEach(tab => {

  tab.onclick = () => {

    const type = tab.dataset.tab;

    // Đang ở trang Profile
    if (type === "profile") return;

    // Nút Settings sử dụng xử lý riêng
    if (!type) return;

    const routes = {

      lobby: {
        url: "/lobby.html",
        label: "Đang mở Sảnh LIVE..."
      },

      chat: {
        url: "/messages.html",
        label: "Đang mở Tin nhắn..."
      },

      hot: {
        url: "/social.html",
        label: "Đang mở Bảng tin..."
      }

    };

    const route = routes[type];

    if (!route) return;

    navigateProfilePage(
      route.url,
      route.label
    );

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

    showMsg("Đã lưu giới thiệu");
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



function confirmLogoutProfile() {

  // Hiển thị popup và reset mọi sự kiện cũ.
  showMsg(
    "Bạn có chắc chắn muốn đăng xuất không?",
    "Xác nhận đăng xuất"
  );

  const okBtn = document.getElementById("msgOk");

  if (!okBtn) return;

  // Chỉ popup đăng xuất mới có hành động này.
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

if (tabSettings && profileSheet) {
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
  hideTabbar();
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
        showMsg("Upload ảnh bìa thất bại");
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

      showMsg("Đã cập nhật ảnh bìa");
    } catch (e) {
      console.error("Cover upload failed", e);
      showMsg("Lỗi xử lý ảnh bìa");
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
  profileNameText.textContent = p.name || "User";
  renderProfileVerified(p.uid);

  // bio (chỉ xem)
  const bioInput = document.getElementById("bioInput");
  if (bioInput){
    bioInput.value = p.bio || "";
    bioInput.disabled = true;
  }

// ===== FIX COVER =====
if (coverPreview){
  coverPreview.src =
    p.cover
      ? fixMedia(p.cover)
      : "/assets/ui/default-cover.jpg";
}

  // ===== BASIC STATS =====
  const level = Number(p.level || 1);
  const exp   = Number(p.exp || 0);
  const need  = level * 100;

  levelVal.textContent = level;

  coinVal.textContent = p.coins || 0;
  coinSentVal.textContent = p.coinSent || 0;
  coinReceivedVal.textContent = p.coinReceived || 0;

  if (coinDepositVal){
    coinDepositVal.textContent = p.coinDeposit || 0;
  }

  // ===== EXP BAR =====
  if (expText){
    expText.textContent = `${exp} / ${need}`;
  }

  if (expFill){
    expFill.style.width =
      Math.min(100, (exp / need) * 100) + "%";
  }

  // ===== VIP BADGE =====
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

  // ===== AVATAR EFFECT =====
  const wrap = document.querySelector(".avatar-wrap");
  if (wrap){
    if (level >= 1) wrap.classList.add("halo-on");
    else wrap.classList.remove("halo-on");
  }

  avatarPreview.classList.remove(
    "avatar-lv1",
    "avatar-lv10",
    "avatar-lv50",
    "avatar-lv100"
  );

  if (level >= 1){
    avatarPreview.classList.add("avatar-lv100");
  }

  const crown = document.getElementById("avatarCrown");
  if (crown){
    if (level >= 1) crown.classList.remove("hidden");
    else crown.classList.add("hidden");
  }

  // ===== ẨN CHỨC NĂNG CHỦ TÀI KHOẢN =====
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



socket.on("system-notify", data => {
  if (!data) return;

  // 💰 NẠP COIN
  if (data.type === "topup") {
    showToast(data.text || "Bạn vừa được nạp coin", "success");
    return;
  }

   // ➖ TRỪ COIN
  if (data.type === "withdraw") {
     notifyWithdraw(data);
  }

  // 🚫 KHOÁ TÀI KHOẢN
  if (data.type === "lock") {
    showToast(
      data.reason || "🚫 Tài khoản của bạn đã bị khoá",
      "error"
    );

    localStorage.removeItem("user_profile");
    localStorage.removeItem("login_uid");
    localStorage.removeItem("isGuest");

    setTimeout(() => {
      location.href = "/login.html";
    }, 2000);
  }
});


function showToast(text, type = "info", timeout = 3500){
  const box = document.getElementById("toast-container");
  if(!box) return;

  const icons = {
    info:"ℹ️",
    success:"✅",
    error:"❌",
    warn:"⚠️"
  };

  const div = document.createElement("div");
  div.className = `toast ${type}`;
  div.innerHTML = `
    <span class="icon">${icons[type] || "🔔"}</span>
    <span class="msg">${text}</span>
  `;

  box.appendChild(div);

  setTimeout(()=>div.remove(), timeout);
}



function showWithdrawNotify(data){
  const text =
    data.text ||
    "Tài khoản của bạn vừa bị trừ coin";

  openSysModal(text);
}

function notifyWithdraw(data){
  const text =
    data?.text ||
    "➖ Tài khoản của bạn vừa bị trừ coin";

  // ưu tiên modal nếu tồn tại
  if (typeof openSysModal === "function") {
    openSysModal(text);
    return;
  }

  // fallback toast
  if (typeof showToast === "function") {
    showToast(text, "error", 5000);
    return;
  }

  // fallback cuối cùng
  alert(text);
}



function showForceLogoutModal(message){
  let modal = document.getElementById("forceLogoutModal");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "forceLogoutModal";
    modal.innerHTML = `
      <div class="fl-backdrop"></div>
      <div class="fl-box">
        <div class="fl-icon">🚫</div>
        <div class="fl-title">Phiên đăng nhập kết thúc</div>
        <div class="fl-msg"></div>
        <div class="fl-sub">Bạn sẽ được chuyển về trang đăng nhập…</div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.querySelector(".fl-msg").textContent = message;
  modal.classList.add("show");
}


/*
socket.on("force-logout", (data) => {
  const msg = data?.message || "Tài khoản của bạn đã bị đăng xuất";

  showForceLogoutModal(msg);

  // clear auth
  localStorage.removeItem("user_profile");
  localStorage.removeItem("login_uid");
  localStorage.removeItem("isGuest");

  // redirect sau 2s
  setTimeout(()=>{
    location.href = "/login.html";
  }, 3000);
});
*/


const btnTransferCoin = document.getElementById("btnTransferCoin");
const transferModal = document.getElementById("transferModal");

if(btnTransferCoin){

  btnTransferCoin.onclick = ()=>{

    // chỉ cho chuyển coin của chính mình
    if(viewUid && viewUid !== __profileAuth.uid){
      showMsg("🚫 Bạn không thể chuyển kim cương từ tài khoản này");
      return;
    }

    transferModal.classList.remove("hidden");
  };

}

function closeTransfer(){
  transferModal.classList.add("hidden");
}

let pendingTransfer = null;

function submitTransfer(){

  const target = document
    .getElementById("transferTarget")
    .value
    .trim();

  const amount = Number(
    document.getElementById("transferAmount").value
  );

  if(!target || !amount || amount <= 0){
    showMsg("⚠️ Nhập tên nhân vật hoặc UID");
    return;
  }

const name =
  document.getElementById("previewName")
    .textContent.trim();

  const level =
    document.getElementById("previewLevel").textContent;

  const avatar =
    document.getElementById("previewAvatar").src;

  if(!name){
    showMsg("⚠️ Chưa xác định người nhận");
    return;
  }

  // lưu tạm
  pendingTransfer = {target,amount};

  // render confirm modal
  document.getElementById("confirmAvatar").src = avatar;
  document.getElementById("confirmName").textContent = name;
  document.getElementById("confirmLevel").textContent = level;
  document.getElementById("confirmAmount").textContent =
  amount.toLocaleString("en-US");

  document
    .getElementById("transferConfirmModal")
    .classList.remove("hidden");
}



function closeTransferConfirm(){
  document
    .getElementById("transferConfirmModal")
    .classList.add("hidden");
}

function confirmTransfer(){

  if(!pendingTransfer) return;

  const avatar = document.getElementById("confirmAvatar").src;
  const name   = document.getElementById("confirmName").textContent;
  const level  = document.getElementById("confirmLevel").textContent;
  const amount = pendingTransfer.amount;

  socket.emit("coin-transfer",{
    target: pendingTransfer.target,
    amount: amount
  });

  // render success UI
  document.getElementById("successAvatar").src = avatar;
  document.getElementById("successName").textContent = name;
  document.getElementById("successLevel").textContent = level;
  document.getElementById("successAmount").textContent =
  amount.toLocaleString("en-US");

  pendingTransfer = null;

  closeTransferConfirm();
  closeTransfer();

  document
    .getElementById("transferSuccessModal")
    .classList.remove("hidden");
}


function closeTransferSuccess(){
  document
    .getElementById("transferSuccessModal")
    .classList.add("hidden");
}


const targetInput = document.getElementById("transferTarget");

targetInput.addEventListener("blur", () => {

  const target = targetInput.value.trim();
  if(!target) return;

  socket.emit("transfer-preview",{target});

});

socket.on("transfer-preview-result",(data)=>{

  const box = document.getElementById("transferPreview");

  if(!data.ok){
    box.classList.add("hidden");
    showMsg("❌ Không tìm thấy người chơi");
    return;
  }

  document.getElementById("previewAvatar").src = data.avatar;

document.getElementById("previewName").textContent =
  data.name || "Người dùng";

document.getElementById("previewLevel").textContent =
  "Cấp độ " + (Number(data.level) || 1);

document.getElementById("previewCoins").textContent =
  "Số dư: " +
  Number(data.coins || 0).toLocaleString("en-US");


  box.classList.remove("hidden");

});



const btnTransferHistory =
document.getElementById("btnTransferHistory")

if(btnTransferHistory){

  btnTransferHistory.onclick = ()=>{

    document
      .getElementById("transferHistoryModal")
      .classList.remove("hidden")

    socket.emit("coin-transfer-history")

  }

}

function closeTransferHistory(){

  document
    .getElementById("transferHistoryModal")
    .classList.add("hidden");

}





let transferHistory = []
let historyTab = "send"

const tabSend = document.getElementById("tabSend")
const tabReceive = document.getElementById("tabReceive")

if(tabSend){
  tabSend.onclick = ()=>{
    historyTab = "send"
    tabSend.classList.add("active")
    tabReceive.classList.remove("active")
    renderTransferHistory()
  }
}

if(tabReceive){
  tabReceive.onclick = ()=>{
    historyTab = "receive"
    tabReceive.classList.add("active")
    tabSend.classList.remove("active")
    renderTransferHistory()
  }
}


socket.on("coin-transfer-history-result",(data)=>{

  transferHistory = data.history || []

  renderTransferHistory()

})


function renderTransferHistory(){

  const box =
  document.getElementById("transferHistoryList")

  if(!box) return

  box.innerHTML = ""

  const filtered =
  transferHistory.filter(
    t => t.type === historyTab
  )

if (filtered.length === 0) {
  box.innerHTML = `
    <div class="history-empty">
      Chưa có giao dịch trong mục này.
    </div>
  `;
  return;
}

  filtered.forEach(t=>{

    const div = document.createElement("div")

    div.className = "transfer-item"

    const amountClass =
      t.type === "send"
      ? "transfer-send"
      : "transfer-receive"

    const amountSign =
      t.type === "send"
      ? "-"
      : "+"

    div.innerHTML = `
      <div class="transfer-left">

        <img class="transfer-avatar"
        src="${t.avatar || '/assets/default-avatar.png'}">

        <div>
          <div class="transfer-name">
            ${t.name}
          </div>

          <div class="transfer-time">
            ${new Date(t.time).toLocaleString("en-US")}
          </div>
        </div>

      </div>


<div class="transfer-amount ${amountClass}">
  ${amountSign}${Number(t.amount || 0).toLocaleString("en-US")}
  <span class="history-unit">KIM CƯƠNG</span>
</div>

    `

    box.appendChild(div)

  })

}




const btnDepositHistory =
  document.getElementById("btnDepositHistory")

const depositHistoryScreen =
  document.getElementById("depositHistoryScreen")

const depositHistoryList =
  document.getElementById("depositHistoryList")


if(btnDepositHistory){

  btnDepositHistory.onclick = ()=>{

    // 🚫 không cho xem lịch sử người khác
    if(viewUid && viewUid !== __profileAuth.uid){
      showMsg("🚫 Không thể xem lịch sử nạp của người khác")
      return
    }

    fetch("/api/deposit-history",{
      headers:{
        "x-uid":__profileAuth.uid
      }
    })
    .then(r=>r.json())
    .then(data=>{

      depositHistoryList.innerHTML = ""

      const list = data.history || data || []

      // ❗ không có dữ liệu
      if(list.length === 0){

depositHistoryList.innerHTML = `
  <div class="history-empty">
    Chưa có giao dịch nạp kim cương.
  </div>
`;

        depositHistoryScreen.classList.remove("hidden")
        return
      }

      // render lịch sử
      list.slice().reverse().forEach(item=>{

        const div = document.createElement("div")
        div.className = "transfer-item"

        div.innerHTML = `
        <div class="transfer-left">

          <img class="transfer-avatar"
          src="/icons/icon-192.png">

          <div>
            <div class="transfer-name">
            Nạp kim cương
            </div>

            <div class="transfer-time">
            ${new Date(item.time).toLocaleString("en-US")}
            </div>
          </div>

        </div>


<div class="transfer-amount transfer-receive">
  +${Number(item.amount || 0).toLocaleString("en-US")}
  <span class="history-unit">KIM CƯƠNG</span>
</div>

        `

        depositHistoryList.appendChild(div)

      })

      depositHistoryScreen.classList.remove("hidden")

    })

  }

}


function closeDepositHistory(){
  depositHistoryScreen.classList.add("hidden")
}



/* ==========================================
   AUTO FIT COIN VALUES - ROYAL DASHBOARD
   Tự co cỡ chữ theo chiều rộng ô
========================================== */

(function () {

  const VALUE_IDS = [
    "coinVal",
    "coinSentVal",
    "coinReceivedVal",
    "coinDepositVal"
  ];

  const MAX_FONT = 22;
  const MIN_FONT = 8;

  function fitCoinValue(el) {
    if (!el || !el.isConnected) return;

    const availableWidth = el.clientWidth;

    if (availableWidth <= 0) return;

    // Luôn thử lại từ cỡ chữ lớn nhất
    el.style.setProperty(
      "font-size",
      MAX_FONT + "px",
      "important"
    );

    // Nếu đã vừa thì không cần giảm
    if (el.scrollWidth <= availableWidth + 1) return;

    // Tìm cỡ chữ lớn nhất vừa trong ô
    let low = MIN_FONT;
    let high = MAX_FONT;

    for (let i = 0; i < 12; i++) {
      const mid = (low + high) / 2;

      el.style.setProperty(
        "font-size",
        mid + "px",
        "important"
      );

      if (el.scrollWidth <= availableWidth + 1) {
        low = mid;
      } else {
        high = mid;
      }
    }

    el.style.setProperty(
      "font-size",
      low.toFixed(2) + "px",
      "important"
    );
  }

  function initAutoFitCoinValues() {

    const elements = VALUE_IDS
      .map(id => document.getElementById(id))
      .filter(Boolean);

    if (!elements.length) return;

    const resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        fitCoinValue(entry.target);
      });
    });

    elements.forEach(el => {

      // Tự cập nhật khi số dư thay đổi realtime
      const mutationObserver = new MutationObserver(() => {
        fitCoinValue(el);
      });

      mutationObserver.observe(el, {
        childList: true,
        characterData: true,
        subtree: true
      });

      // Tự cập nhật khi kích thước ô thay đổi
      resizeObserver.observe(el);

      // Căn chỉnh lần đầu
      fitCoinValue(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initAutoFitCoinValues,
      { once: true }
    );
  } else {
    initAutoFitCoinValues();
  }

})();



/* ================================================
   LIVESTREAM PRO
   PROFILE - ENGLISH UI TRANSLATION
   Keep all existing features and Socket.IO events
================================================ */

const PROFILE_ENGLISH = new Map(Object.entries({

  // ===== PROFILE =====
  "Nhập tên của bạn": "Enter your name",
  "Viết vài dòng về bạn...": "Write something about yourself...",
  "Bạn bè": "Friends",
  "💬 Nhắn tin": "💬 Message",
  "➕ Kết bạn": "➕ Add Friend",
  "⏳ Đã gửi lời mời": "⏳ Request Sent",
  "🚫 Huỷ bạn": "🚫 Unfriend",

  "TIẾN ĐỘ KINH NGHIỆM": "LEVEL PROGRESS",
  "✦ TÀI KHOẢN CỦA BẠN": "✦ YOUR ACCOUNT",
  "QUẢN LÝ TÀI SẢN": "ASSET MANAGEMENT",

  // ===== ACCOUNT STATISTICS =====
  "NẠP": "TOP UP",
  "Kim cương": "Diamonds",
  "ĐẦU TƯ": "INVEST",
  "Đã sử dụng": "Used",
  "RÚT": "WITHDRAW",
  "Ví tiền": "Wallet",
  "TỔNG NẠP": "TOTAL TOP-UP",
  "Đã nạp vào": "Total Deposited",
  "GỬI": "SEND",
  "Chuyển kim cương": "Transfer Diamonds",
  "LỊCH SỬ": "HISTORY",
  "Lịch sử giao dịch": "Transaction History",
  "Thư viện": "Library",

  "💾 Lưu": "💾 Save",
  "🔐 Đổi mật khẩu": "🔐 Change Password",
  "📩 Tin nhắn": "📩 Messages",

  // ===== PASSWORD SECURITY =====
  "Đổi mật khẩu": "Change Password",
  "Cập nhật thông tin bảo mật tài khoản của bạn":
    "Update your account security settings",

  "MÃ BẢO MẬT": "SECURITY CODE",
  "Nhập mã bảo mật": "Enter security code",
  "MẬT KHẨU MỚI": "NEW PASSWORD",
  "Nhập mật khẩu mới": "Enter new password",
  "XÁC NHẬN MẬT KHẨU": "CONFIRM PASSWORD",
  "Nhập lại mật khẩu mới": "Re-enter new password",

  "Sử dụng mật khẩu riêng tư và không chia sẻ mã bảo mật với người khác.":
    "Use a strong password and never share your security code.",

  "Hủy": "Cancel",
  "Huỷ": "Cancel",
  "Xác nhận": "Confirm",
  "Xác nhận đổi": "Change Password",
  "Thông báo": "Notification",

  // ===== ACCOUNT SETTINGS =====
  "Cài đặt tài khoản": "Account Settings",
  "Quản lý tài khoản và quyền truy cập":
    "Manage your account and access permissions",

  "Đóng cài đặt": "Close Settings",
  "TÀI KHOẢN & BẢO MẬT": "ACCOUNT & SECURITY",
  "Rút tiền": "Withdraw",
  "Quản lý yêu cầu rút tiền":
    "Manage withdrawal requests",

  "Cập nhật bảo mật tài khoản":
    "Update account security",

  "PHIÊN ĐĂNG NHẬP": "LOGIN SESSION",
  "Đăng xuất": "Log Out",
  "Kết thúc phiên đăng nhập hiện tại":
    "End your current login session",

  // ===== TRANSFER DIAMONDS =====
  "Chuyển kim cương đến tài khoản khác":
    "Send diamonds to another account",

  "TÀI KHOẢN NHẬN": "RECIPIENT ACCOUNT",
  "Nhập tên nhân vật hoặc UID":
    "Enter username or UID",

  "Nhập thông tin chính xác để tìm người nhận.":
    "Enter accurate information to find the recipient.",

  "Ảnh đại diện người nhận": "Recipient avatar",
  "Người nhận": "Recipient",
  "NGƯỜI NHẬN": "RECIPIENT",

  "SỐ KIM CƯƠNG": "DIAMOND AMOUNT",
  "Nhập số lượng muốn chuyển":
    "Enter the amount to transfer",

  "Kiểm tra số lượng trước khi xác nhận.":
    "Check the amount before confirming.",

  "Hủy bỏ": "Cancel",
  "Tiếp tục": "Continue",

  // ===== TRANSFER CONFIRMATION =====
  "Xác nhận giao dịch": "Confirm Transaction",

  "Vui lòng kiểm tra thông tin người nhận và số kim cương trước khi chuyển.":
    "Please review the recipient and diamond amount before transferring.",

  "CHUYỂN ĐẾN": "TRANSFER TO",
  "SỐ KIM CƯƠNG CHUYỂN": "TRANSFER AMOUNT",
  "Số lượng chuyển": "Transfer Amount",
  "KIM CƯƠNG": "DIAMONDS",

  "Giao dịch không thể hoàn tác. Vui lòng xác nhận đúng người nhận.":
    "This transaction cannot be reversed. Please verify the recipient.",

  "⚠ Giao dịch không thể hoàn tác":
    "⚠ This transaction cannot be reversed",

  "Quay lại": "Back",
  "Xác nhận chuyển": "Confirm Transfer",
  "Xác nhận chuyển kim cương":
    "Confirm Diamond Transfer",

  // ===== TRANSFER RESULT =====
  "ĐÃ GỬI YÊU CẦU": "REQUEST SUBMITTED",

  "Yêu cầu chuyển đã được gửi":
    "Transfer Request Submitted",

  "Hệ thống đang xử lý giao dịch chuyển kim cương của bạn.":
    "Your diamond transfer is being processed.",

  "SỐ KIM CƯƠNG YÊU CẦU CHUYỂN":
    "REQUESTED DIAMONDS",

  "Hoàn tất": "Done",
  "Chuyển kim cương thành công":
    "Diamonds Transferred Successfully",

  "Đã chuyển": "Transferred",

  // ===== TRANSFER HISTORY =====
  "LỊCH SỬ CHUYỂN KIM CƯƠNG":
    "DIAMOND TRANSFER HISTORY",

  "Lịch sử chuyển": "Transfer History",
  "Thông tin giao dịch kim cương":
    "Diamond transaction details",

  "Đóng": "Close",
  "Đã gửi": "Sent",
  "Đã nhận": "Received",
  "CHI TIẾT GIAO DỊCH": "TRANSACTION DETAILS",

  "Chưa có giao dịch trong mục này.":
    "No transactions found in this category.",

  // ===== DEPOSIT HISTORY =====
  "LỊCH SỬ NẠP KIM CƯƠNG":
    "DIAMOND DEPOSIT HISTORY",

  "Lịch sử nạp": "Deposit History",

  "Thông tin các lần nạp kim cương":
    "Your diamond deposit records",

  "CHI TIẾT GIAO DỊCH NẠP":
    "DEPOSIT DETAILS",

  "Chưa có giao dịch nạp kim cương.":
    "No diamond deposits found.",

  "Nạp kim cương": "Diamond Top-up",

  // ===== FRIENDS & SOCIAL =====
  "🚫 Bạn không thể tương tác với người này":
    "🚫 You cannot interact with this user.",

  "🚫 Bạn không thể gửi lời mời cho người này":
    "🚫 You cannot send a friend request to this user.",

  "📨 Đã gửi lời mời kết bạn":
    "📨 Friend request sent.",

  "Huỷ lời mời kết bạn?":
    "Cancel this friend request?",

  "Huỷ kết bạn?":
    "Remove this friend?",

  "Xác nhận": "Confirm",

  "❌ Đã huỷ lời mời":
    "❌ Friend request canceled.",

  "🚫 Đã huỷ kết bạn":
    "🚫 Friend removed.",

  "Chặn người này?":
    "Block this user?",

  "⛔ Đã chặn":
    "⛔ User blocked.",

  "🔒 Chỉ có thể nhắn tin khi đã là bạn":
    "🔒 You can only message friends.",

  "👥 Hai bạn đã là bạn bè, có thể nhắn tin!":
    "👥 You are now friends and can send messages!",

  "🚫 Hai bạn không còn là bạn bè":
    "🚫 You are no longer friends.",

  "🚫 Bạn không thể xem hồ sơ của người này":
    "🚫 You cannot view this user's profile.",

  "🔓 Bạn đã được gỡ chặn":
    "🔓 This user has unblocked you.",

  // ===== PROFILE ACTIONS =====
  "🚫 Bạn không thể rút tiền từ tài khoản này":
    "🚫 You cannot withdraw from this account.",

  "💎 Bạn chưa có kim cương để rút":
    "💎 You have no diamonds available for withdrawal.",

  "🚫 Bạn không thể đầu tư bằng tài khoản này":
    "🚫 You cannot invest using this account.",

  "🚫 Bạn không thể nạp coin cho tài khoản này":
    "🚫 You cannot top up this account.",

  "✅ Đã cập nhật tên hiển thị":
    "✅ Display name updated successfully.",

  "✅ Đã lưu hồ sơ!":
    "✅ Profile saved successfully!",

  "Đã lưu giới thiệu":
    "About section saved successfully.",

  "❌ Upload thất bại":
    "❌ Upload failed.",

  "Upload ảnh bìa thất bại":
    "Cover photo upload failed.",

  "Đã cập nhật ảnh bìa":
    "Cover photo updated successfully.",

  "Lỗi xử lý ảnh bìa":
    "Failed to process the cover photo.",

  // ===== PASSWORD NOTIFICATIONS =====
  "Nhập đầy đủ thông tin":
    "Please fill in all required fields.",

  "Mật khẩu mới phải >= 6 ký tự":
    "The new password must contain at least 6 characters.",

  "Mật khẩu nhập lại không khớp":
    "Passwords do not match.",

  "Chưa đăng nhập":
    "You are not logged in.",

  "Đổi mật khẩu thành công":
    "Password changed successfully.",

  "Thiếu dữ liệu":
    "Missing required information.",

  "Tài khoản không tồn tại":
    "Account not found.",

  "Mã bảo mật không đúng":
    "Incorrect security code.",

  "Đổi mật khẩu thất bại":
    "Failed to change password.",

  // ===== LOGOUT & ACCOUNT =====
  "Bạn có chắc chắn muốn đăng xuất không?":
    "Are you sure you want to log out?",

  "Xác nhận đăng xuất":
    "Confirm Logout",

  "Phiên đăng nhập kết thúc":
    "Session Ended",

  "Bạn sẽ được chuyển về trang đăng nhập…":
    "You will be redirected to the login page...",

  "Tài khoản của bạn đã bị đăng xuất":
    "You have been signed out.",

  "🚫 Tài khoản của bạn đã bị khoá":
    "🚫 Your account has been locked.",

  "Bạn vừa được nạp coin":
    "Coins have been added to your account.",

  "Tài khoản của bạn vừa bị trừ coin":
    "Coins have been deducted from your account.",

  "➖ Tài khoản của bạn vừa bị trừ coin":
    "➖ Coins have been deducted from your account.",

  // ===== TRANSFER ERRORS =====
  "🚫 Bạn không thể chuyển kim cương từ tài khoản này":
    "🚫 You cannot transfer diamonds from this account.",

  "⚠️ Nhập tên nhân vật hoặc UID":
    "⚠️ Please enter a username or UID.",

  "⚠️ Chưa xác định người nhận":
    "⚠️ Recipient has not been identified.",

  "❌ Không tìm thấy người chơi":
    "❌ Player not found.",

  "Người dùng": "User",

  "🚫 Không thể xem lịch sử nạp của người khác":
    "🚫 You cannot view another user's deposit history.",

  // ===== MESSAGE HISTORY =====
  "Bạn có chắc muốn xóa toàn bộ lịch sử tin nhắn? Hành động này không thể hoàn tác.":
    "Are you sure you want to delete all message history? This action cannot be undone.",

  "Xóa": "Delete",
  "🗑️ Lịch sử tin nhắn đã được xóa":
    "🗑️ Message history has been deleted.",

  // ===== PAGE TRANSITIONS =====
  "Đang mở trang mới...": "Opening page...",
  "Đang mở cuộc trò chuyện...": "Opening conversation...",
  "Đang mở trang Rút kim cương...":
    "Opening Diamond Withdrawal...",
  "Đang mở Thị trường đầu tư...":
    "Opening Investment Market...",
  "Đang mở trang Nạp kim cương...":
    "Opening Diamond Top-up...",
  "Đang mở Tin nhắn...": "Opening Messages...",
  "Đang mở Bảng tin...": "Opening News Feed...",
  "Đang mở Sảnh LIVE...": "Opening LIVE Lobby...",

  // ===== ACCESSIBILITY =====
  "Đóng cài đặt": "Close Settings",
  "Ảnh đại diện người nhận": "Recipient avatar"

}));


/* ================================================
   TRANSLATE TEXT
================================================ */

function profileEnglishText(value) {

  if (typeof value !== "string") return value;

  const original = value;
  const clean = original.replace(/\s+/g, " ").trim();

  if (!clean) return original;

  let translated = PROFILE_ENGLISH.get(clean);

  // Dynamic level
  if (!translated) {

    const levelMatch = clean.match(/^Cấp độ\s+(\d+)$/i);

    if (levelMatch) {
      translated = "Level " + levelMatch[1];
    }

  }

  // Dynamic balance
  if (!translated) {

    const balanceMatch = clean.match(/^Số dư:\s*(.+)$/i);

    if (balanceMatch) {
      translated = "Balance: " + balanceMatch[1];
    }

  }

  if (!translated) return original;

  const leading = original.match(/^\s*/)?.[0] || "";
  const trailing = original.match(/\s*$/)?.[0] || "";

  return leading + translated + trailing;

}


/* ================================================
   TRANSLATE STATIC & DYNAMIC DOM
================================================ */

function profileTranslateElement(el) {

  if (!(el instanceof Element)) return;

  if (el.matches("script, style, noscript")) return;

  const attributes = [
    "placeholder",
    "title",
    "aria-label",
    "alt",
    "data-lsp-label"
  ];

  for (const attr of attributes) {

    if (!el.hasAttribute(attr)) continue;

    const oldText = el.getAttribute(attr);
    const newText = profileEnglishText(oldText);

    if (oldText !== newText) {
      el.setAttribute(attr, newText);
    }

  }

}


function profileTranslateTextNode(node) {

  if (!node || node.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const parent = node.parentElement;

  if (!parent) return;

  // Never change scripts, styles or user-written content
  if (parent.closest(
    "script, style, noscript, " +
    "#profileNameText, #previewName, " +
    "#confirmName, #successName, " +
    "#bioInput, [contenteditable]"
  )) {
    return;
  }

  const oldText = node.nodeValue;
  const newText = profileEnglishText(oldText);

  if (newText !== oldText) {
    node.nodeValue = newText;
  }

}


function profileTranslateTree(root) {

  if (!root) return;

  if (root.nodeType === Node.TEXT_NODE) {
    profileTranslateTextNode(root);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  profileTranslateElement(root);

  root.querySelectorAll("*").forEach(el => {
    profileTranslateElement(el);
  });

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT
  );

  let textNode;

  while ((textNode = walker.nextNode())) {
    profileTranslateTextNode(textNode);
  }

}


/* ================================================
   INITIALIZE ENGLISH UI
================================================ */

function initializeProfileEnglish() {

  document.documentElement.lang = "en";

  document.title = "Profile | Livestream Pro";

  // Translate existing interface
  profileTranslateTree(document.body);

  // Translate dynamically generated notifications,
  // modals, transaction history and Socket.IO updates
  const observer = new MutationObserver(records => {

    for (const record of records) {

      if (record.type === "characterData") {
        profileTranslateTextNode(record.target);
        continue;
      }

      if (record.type === "attributes") {
        profileTranslateElement(record.target);
        continue;
      }

      if (record.type === "childList") {

        record.addedNodes.forEach(node => {
          profileTranslateTree(node);
        });

      }

    }

  });

  observer.observe(document.body, {

    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,

    attributeFilter: [
      "placeholder",
      "title",
      "aria-label",
      "alt",
      "data-lsp-label"
    ]

  });

}


// Start after DOM is available
if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    initializeProfileEnglish,
    { once: true }
  );

} else {

  initializeProfileEnglish();

}