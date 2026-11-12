// 🔔 SOCKET AUTH + FORCE LOGOUT (MARKET)
let socket = null;

const floor = document.getElementById("marketFloor");


function showModal({ title="Notification", content="", confirm=false }) {
  return new Promise(resolve => {
    const modal = document.getElementById("lpModal");
    const titleEl = document.getElementById("lpModalTitle");
    const contentEl = document.getElementById("lpModalContent");
    const okBtn = document.getElementById("lpModalOk");
    const cancelBtn = document.getElementById("lpModalCancel");

    titleEl.textContent = title;
    contentEl.innerHTML = content;

    cancelBtn.classList.toggle("hidden", !confirm);

    modal.classList.remove("hidden");

    okBtn.onclick = () => {
      modal.classList.add("hidden");
      resolve(true);
    };

    cancelBtn.onclick = () => {
      modal.classList.add("hidden");
      resolve(false);
    };
  });
}




let booths = []; // sẽ load từ server
/* ===== STATE MODAL ===== */
let currentBoothId = null;
let selectedPlan = { days: 7, price: 1000 };
let rentMode = "rent"; // "rent" | "extend"
const BOOTHS_PER_TAB = 8;
let currentTab = 0;
// ===== MOBILE SWIPE TAB =====
let touchStartX = 0;
let touchEndX = 0;

const PRICE_PER_DAY = 150; // 💎 / ngày (tuỳ bạn chỉnh)


function goToTab(tabIndex){
  const totalTabs = Math.ceil(booths.length / BOOTHS_PER_TAB);
  if(totalTabs === 0) return;

  let target = tabIndex;

  // 🔁 VÒNG TRÒN
  if(tabIndex < 0) target = totalTabs - 1;
  if(tabIndex >= totalTabs) target = 0;

  const direction =
    target === 0 && currentTab === totalTabs - 1
      ? "left"   // cuối → đầu
      : target === totalTabs - 1 && currentTab === 0
        ? "right" // đầu → cuối
        : target > currentTab
          ? "left"
          : "right";

  // 🎞 animation
  floor.classList.add(
    direction === "left"
      ? "market-slide-left"
      : "market-slide-right"
  );

  setTimeout(()=>{
    currentTab = target;
    renderMarket();

    floor.classList.remove("market-slide-left", "market-slide-right");
  }, 200);
}






function daysLeft(ts){
  return Math.ceil((ts - Date.now()) / (24*60*60*1000));
}


/* ==========================================
   MARKET - XÁC THỰC ADMIN BẰNG MẬT KHẨU
========================================== */

let marketAdminVerified = false;

function isAdmin() {
  return marketAdminVerified;
}

async function checkMarketAdminSession() {
  let authorized = false;

  try {
    const response = await fetch(
      "/api/admin/auth/status",
      {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
      }
    );

    const data = await response.json();

    authorized = response.ok && data.ok === true;

  } catch (error) {
    console.error("Market admin session:", error);
  }

  const changed = marketAdminVerified !== authorized;

  marketAdminVerified = authorized;

  if (changed && booths.length > 0) {
    renderMarket();
  }

  return authorized;
}


function updateRentCoin(){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  const coin = me?.coins ?? 0;

  const el = document.getElementById("rentCoinVal");
  if(el){
    el.textContent = coin.toLocaleString("en-US");
  }
}


function checkRentAffordable(){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  const coin = me?.coins ?? 0;

  const btn = document.getElementById("confirmRent");
  const topupBtn = document.getElementById("btnTopupCoin");
  if(!btn) return;

  // 🔴 tô đỏ giá nếu thiếu
  if(priceVal){
    if(selectedPlan.price > coin){
      priceVal.classList.add("rent-price-over");
    }else{
      priceVal.classList.remove("rent-price-over");
    }
  }

  if(selectedPlan.trial){
  btn.disabled = false;
  btn.classList.remove("disabled");
  btn.textContent = "Start Free Trial";
  if(topupBtn) topupBtn.classList.add("hidden");
  priceVal.classList.remove("rent-price-over");
  return;
}


  if(selectedPlan.price > coin){
    btn.disabled = true;
    btn.classList.add("disabled");
    btn.textContent = "Insufficient Diamonds";

    if(topupBtn){
      topupBtn.classList.remove("hidden");
    }

  }else{
    btn.disabled = false;
    btn.classList.remove("disabled");
    btn.textContent = "Rent a Booth";

    if(topupBtn){
      topupBtn.classList.add("hidden");
    }
  }
}





async function loadMarketFromServer(){
  try{
    const res = await fetch("/api/market");
    const data = await res.json();
    if(!data.ok) return;

    const market = data.market || {};

    // xác định số gian (tối thiểu 12)
    const totalSlots = Math.max(12, Object.keys(market).length);

    booths = Array.from({ length: totalSlots }, (_, i)=>{
      const id = i + 1;
      const booth = market[id];

      if(!booth){
        return { id, owner: null };
      }

      return {
        id,
        owner: {
          uid: booth.ownerUid,
          name: booth.name,
          logo: booth.logo,
          expireAt: booth.expireAt,
          locked: booth.locked
        }
      };
    });

    renderMarket();
  }catch(e){
    console.error("Load market failed", e);
  }
}




function sortBoothsSmart(list){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  const myUid = me?.uid;

  return [...list].sort((a,b)=>{
    // Gian trống luôn xuống cuối
    if(!a.owner && b.owner) return 1;
    if(a.owner && !b.owner) return -1;
    if(!a.owner && !b.owner) return 0;

    // 1) Gian của tôi lên đầu
    const aMine = a.owner.uid === myUid;
    const bMine = b.owner.uid === myUid;
    if(aMine !== bMine) return aMine ? -1 : 1;

    // 2) Sắp hết hạn lên trước
    const aDL = a.owner.expireAt ? daysLeft(a.owner.expireAt) : Infinity;
    const bDL = b.owner.expireAt ? daysLeft(b.owner.expireAt) : Infinity;

    const aUrgent = aDL <= 3;
    const bUrgent = bDL <= 3;
    if(aUrgent !== bUrgent) return aUrgent ? -1 : 1;

    // 3) Càng gần hết hạn càng lên trước
    return aDL - bDL;
  });
}


function renderMarketTabs(totalBooths){
  const tabWrapId = "marketTabs";
  let wrap = document.getElementById(tabWrapId);

  if(!wrap){
    wrap = document.createElement("div");
    wrap.id = tabWrapId;
    wrap.className = "market-tabs";
    floor.parentNode.insertBefore(wrap, floor);
  }

  wrap.innerHTML = "";

  const totalTabs = Math.ceil(totalBooths / BOOTHS_PER_TAB);

  for(let i = 0; i < totalTabs; i++){
    const btn = document.createElement("button");
    btn.className = "market-tab" + (i === currentTab ? " active" : "");
    btn.textContent =
  `Booths ${i * BOOTHS_PER_TAB + 1}–${Math.min(
    (i + 1) * BOOTHS_PER_TAB,
    totalBooths
  )}`;

    btn.onclick = ()=>{
      currentTab = i;
      renderMarket();
    };

    wrap.appendChild(btn);
  }
}



function escapeMarketHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]
  );
}



/* ===== RENDER ===== */
function renderMarket(){
  floor.innerHTML = "";

  const sorted = sortBoothsSmart(booths);

  // 🔹 render tab bar
  renderMarketTabs(sorted.length);

  // 🔹 cắt danh sách theo tab
  const start = currentTab * BOOTHS_PER_TAB;
  const end = start + BOOTHS_PER_TAB;
  const pageBooths = sorted.slice(start, end);

  pageBooths.forEach(b=>{


    const div = document.createElement("div");


if (!b.owner) {
  div.className = "booth empty";

  div.innerHTML = `
    <div class="booth-card-content">

      <div class="booth-index">
        BOOTH ${String(b.id).padStart(2, "0")}
      </div>

      <div class="booth-plus">+</div>

      <div class="booth-text">
        Rent a Booth
      </div>

      <div class="booth-hint">
        Create your own space
      </div>

    </div>
  `;

  div.onclick = () => rentBooth(b.id);
}

    
    else{

  const me = JSON.parse(localStorage.getItem("user_profile"));
  const isMine = me && b.owner.uid === me.uid;

  let expireBadge = "";
  if(b.owner.expireAt){
    const d = daysLeft(b.owner.expireAt);
    if(d <= 1){
      expireBadge = `<div class="booth-expire-badge danger">EXPIRING SOON</div>`;
    }else if(d <= 3){
      expireBadge = `<div class="booth-expire-badge">NEAR EXPIRY</div>`;
    }
  }

const admin = isAdmin();

let adminControls = "";


if (admin) {
  adminControls = `
    <div class="booth-admin">

      <button
        type="button"
        onclick="event.stopPropagation(); toggleLock(
          ${b.id},
          ${b.owner.locked ? "false" : "true"}
        )"
      >
        ${b.owner.locked ? "Unlock" : "Lock"}
      </button>

      <button
        type="button"
        onclick="event.stopPropagation(); revokeBooth(${b.id})"
      >
        	Revoke
      </button>

    </div>
  `;
}


div.className =
  "booth" +
  (isMine ? " booth-mine" : "") +
  (b.owner.locked && !isAdmin() ? " booth-locked" : "");




const boothName = escapeMarketHtml(
  b.owner.name || "Shop"
);

const boothLogo = escapeMarketHtml(
  b.owner.logo || ""
);

const boothStatus = b.owner.locked
  ? "Temporarily Locked"
  : isMine
    ? "Your Booth"
    : "Tap to Visit";

div.innerHTML = `
  ${isMine ? `
    <div class="booth-mine-badge">
      	MINE
    </div>
  ` : ""}

  ${expireBadge}
  ${adminControls}

  <div class="booth-card-content">

    <div class="booth-index">
      BOOTH ${String(b.id).padStart(2, "0")}
    </div>

    <div class="booth-logo-shell">

      <span class="booth-placeholder">LP</span>

      ${boothLogo ? `
        <img
          class="booth-logo"
          src="${boothLogo}"
          alt=""
          loading="lazy"
          onerror="this.remove()"
        >
      ` : ""}

    </div>

    <div class="booth-name"
         title="${boothName}">
      ${boothName}
    </div>

    <div class="booth-hint">
      ${boothStatus}
    </div>

  </div>
`;


// nếu bị khoá → không cho click
if (!b.owner.locked || isAdmin()) {
  div.onclick = ()=> openBooth(b.id);
} else {
div.onclick = () => showModal({

  title: "Booth Locked",

  content:
    "This booth has been locked by an administrator."

});
}




}


    floor.appendChild(div);
  });

   updateMarketStats();
}


function enableMarketSwipe(){
  // chỉ bật cho thiết bị cảm ứng
  if(!("ontouchstart" in window)) return;

  floor.addEventListener("touchstart", e=>{
    // ❌ không swipe khi đang mở modal
    if(!document.getElementById("rentBackdrop").classList.contains("hidden")) return;
    if(!document.getElementById("lpModal").classList.contains("hidden")) return;

    touchStartX = e.changedTouches[0].screenX;
  }, { passive:true });

  floor.addEventListener("touchend", e=>{
    touchEndX = e.changedTouches[0].screenX;
    handleMarketSwipe();
  }, { passive:true });
}

function handleMarketSwipe(){
  const delta = touchEndX - touchStartX;

  // cần vuốt đủ xa để tránh chạm nhầm
  if(Math.abs(delta) < 60) return;

  if(delta < 0){
    // 👉 vuốt trái → tab kế
    goToTab(currentTab + 1);
  }else{
    // 👈 vuốt phải → tab trước
    goToTab(currentTab - 1);
  }
}







/* ==========================================
   MARKET STATISTICS - ENGLISH
========================================== */

function updateMarketStats() {

  const total = booths.length;

  const active = booths.filter(b => b.owner).length;

  const empty = total - active;

  const el = document.getElementById("marketStats");

  if (el) {

    el.textContent =
      `${total} booths · ${active} occupied · ${empty} available`;

  }

}


/* ===== OPEN RENT MODAL ===== */
function rentBooth(id){
  const me = JSON.parse(localStorage.getItem("user_profile"));

  // 🔒 Ẩn gói dùng thử nếu đã sử dụng
  const trialOpt = document.querySelector('.rent-option[data-trial="true"]');
  if(trialOpt){
  if(me?.hasUsedTrial === true){
    trialOpt.style.display = "none";
  }else{
    trialOpt.style.display = "";
  }
}



  if(!me || !me.uid){
showModal({

  title: "Sign In Required",

  content:
    "Please sign in to use this feature."

});

    return;
  }

  // 🔒 đã có gian thì không cho thuê thêm
  const alreadyHaveBooth = booths.some(
    b => b.owner && b.owner.uid === me.uid
  );


 if(alreadyHaveBooth){
showModal({

  title: "Rental Limit Reached",

  content:
    "You can only rent one booth at a time."

});
  return;
}


  rentMode = "rent";
  currentBoothId = id;
  document.getElementById("rentBoothId").textContent = id;
  document.getElementById("rentBackdrop").classList.remove("hidden");

  // 💎 cập nhật số dư kim cương trong modal
  updateRentCoin();
  checkRentAffordable();


// reset gói mặc định
selectedPlan = { days: 7, price: 1000 };

if(range){
  range.value = 7;
  daysVal.textContent = 7;
  priceVal.textContent = "1,000";
}

document.querySelectorAll(".rent-option")
  .forEach(o=>o.classList.remove("active"));

document
  .querySelector('.rent-option[data-days="7"]')
  ?.classList.add("active");

checkRentAffordable();



}





/* ===== CLOSE MODAL ===== */
document.getElementById("closeRent").onclick = ()=>{
  document.getElementById("rentBackdrop").classList.add("hidden");
};

/* ===== SELECT PLAN ===== */
document.querySelectorAll(".rent-option").forEach(opt=>{
  opt.onclick = ()=>{
    document.querySelectorAll(".rent-option")
      .forEach(o=>o.classList.remove("active"));
    opt.classList.add("active");

    const days = +opt.dataset.days;
    const price = +opt.dataset.price;
    const isTrial = opt.dataset.trial === "true";

    selectedPlan = {
  days,
  price,
  trial: isTrial
};

    if(range){
      range.value = days;
      daysVal.textContent = days;
      priceVal.textContent = price.toLocaleString("en-US");
    }

    checkRentAffordable(); // 👈 thêm dòng này
  };
});


const range = document.getElementById("rentDaysRange");
const daysVal = document.getElementById("rentDaysVal");
const priceVal = document.getElementById("rentPriceVal");

if(range){
  range.oninput = ()=>{
    const days = +range.value;
    const price = days * PRICE_PER_DAY;

    daysVal.textContent = days;
    priceVal.textContent = price.toLocaleString("en-US");

    selectedPlan = { days, price };

    // bỏ active quick plan
    document.querySelectorAll(".rent-option")
      .forEach(o=>o.classList.remove("active"));

      checkRentAffordable(); // 👈 thêm dòng này
  };
}


/* ===== CONFIRM RENT ===== */
document.getElementById("confirmRent").onclick = async ()=>{




const me = JSON.parse(localStorage.getItem("user_profile"));
if(!me || !me.uid){
showModal({

  title: "Sign In Required",

  content:
    "Please sign in to use this feature."

});

  return;
}


const uid = me.uid;


try{
  const api = "/api/market/rent";

  const res = await fetch(api,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-uid": uid
    },

    body: JSON.stringify({
  boothId: currentBoothId,
  days: selectedPlan.days,
  price: selectedPlan.price,
  trial: selectedPlan.trial === true
})
  });

  const data = await res.json();

 

if (!data.ok) {

  let msg = "Unable to complete your request.";

  if (data.error === "already_have_booth") {

    msg = "You can only rent one booth at a time.";

  } else if (data.error === "not_enough_coin") {

    msg = "Insufficient diamonds.";

  } else if (data.error === "not_owner") {

    msg = "You are not the owner of this booth.";

  } else if (data.error === "trial_used") {

    msg = "You have already used your free trial.";

  }

  // ⛔ Ẩn modal thuê trước
document.getElementById("rentBackdrop")
  ?.classList.add("hidden");

  await showModal({
    title: "Request Failed",
    content: msg
  });

  // 🔄 Mở lại modal thuê nếu cần
document.getElementById("rentBackdrop")
  ?.classList.remove("hidden");
  
  return;
}


  document.getElementById("rentBackdrop").classList.add("hidden");
  loadMarketFromServer();

await showModal({

  title: "Success",

  content:
    rentMode === "extend"
      ? "Your booth rental has been extended successfully."
      : "Your booth has been rented successfully."

});


}catch(e){
await showModal({

  title: "Connection Error",

  content:
    "Unable to connect to the server. Please try again."

});
}


};




/* ==========================================
   OPEN BOOTH - SMOOTH TRANSITION
========================================== */

function openBooth(id) {

  if (!id) return;

  const url =
    `/booth.html?booth=${encodeURIComponent(id)}`;

  if (window.LSPTransition?.go) {

    LSPTransition.go(url, {
      label: "Opening Booth..."
    });

  } else {

    window.location.href = url;

  }

}



/* ==========================================
   MARKET ADMIN - LOCK / UNLOCK / REVOKE
========================================== */

/* ==========================================
   MARKET ADMIN ACTIONS
   ENGLISH NOTIFICATIONS
========================================== */

async function marketAdminAction(id, action, lock = false) {

  // VERIFY ADMIN SESSION
  const authorized = await checkMarketAdminSession();

  if (!authorized) {

    await showModal({

      title: "Admin Verification Required",

      content:
        "Your Admin session is invalid or has expired. " +
        "Please sign in again through the Admin Dashboard."

    });

    return;
  }


  const isRevoke = action === "revoke";


  // ACTION TITLE
  const title = isRevoke
    ? "Revoke Booth"
    : lock
      ? "Lock Booth"
      : "Unlock Booth";


  // CONFIRM ACTION
  const confirmed = await showModal({

    title,

    content: isRevoke
      ? `Are you sure you want to revoke booth #${id}?`
      : lock
        ? `Are you sure you want to lock booth #${id}?`
        : `Are you sure you want to unlock booth #${id}?`,

    confirm: true

  });


  if (!confirmed) return;


  // KEEP ORIGINAL API ROUTES
  const url = isRevoke
    ? "/api/admin/market/revoke"
    : "/api/admin/market/lock";


  const payload = isRevoke
    ? { boothId: id }
    : {
        boothId: id,
        lock: Boolean(lock)
      };


  try {

    const response = await fetch(url, {

      method: "POST",

      credentials: "same-origin",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(payload)

    });


    const data = await response.json().catch(() => ({}));


    console.log("MARKET ADMIN RESPONSE:", {

      action,

      boothId: id,

      status: response.status,

      data

    });


    // REQUEST FAILED
    if (!response.ok || data.ok !== true) {

      let errorMessage =
        "Unable to complete this action.";


      if (response.status === 401) {

        errorMessage =
          "Your Admin session has expired. " +
          "Please sign in again using your Admin password.";

      } else if (response.status === 403) {

        errorMessage =
          "You do not have permission to perform this action.";

      } else if (response.status === 404) {

        errorMessage =
          "The booth or API endpoint could not be found.";

      } else if (response.status >= 500) {

        errorMessage =
          "A server error occurred while updating the booth.";

      }


      const errorCode = escapeMarketHtml(
        String(data.error || "UNKNOWN_ERROR")
      );


      await showModal({

        title: "Action Failed",

        content:
          `${errorMessage}` +
          `<div style="margin-top:10px;opacity:.7">` +
          `HTTP ${response.status} · ${errorCode}` +
          `</div>`

      });


      return;
    }


    // RELOAD MARKET AFTER SUCCESS
    await loadMarketFromServer();


    await showModal({

      title: "Success",

      content: isRevoke
        ? `Booth #${id} has been revoked.`
        : lock
          ? `Booth #${id} has been locked.`
          : `Booth #${id} has been unlocked.`

    });


  } catch (error) {

    console.error("Market admin error:", error);


    await showModal({

      title: "Connection Error",

      content:
        "Unable to connect to the server. " +
        "Please try again."

    });

  }

}
async function toggleLock(id, lock) {
  return marketAdminAction(id, "lock", lock);
}

async function revokeBooth(id) {
  return marketAdminAction(id, "revoke");
}



/* ===== TAB BAR ===== */

/* ==========================================
   MARKET TAB BAR
   LIVESTREAM PRO SMOOTH TRANSITION
========================================== */

document.querySelectorAll(".lp-tab").forEach(tab => {

  tab.onclick = () => {

    const t = tab.dataset.tab;

    // Đang ở Market
    if (t === "market") return;

const routes = {

  social: {
    url: "/social.html",
    label: "Opening News Feed..."
  },

  lobby: {
    url: "/lobby.html",
    label: "Opening LIVE Lobby..."
  },

  messages: {
    url: "/messages.html",
    label: "Opening Messages..."
  },

  profile: {
    url: "/profile.html",
    label: "Opening Your Profile..."
  }

};

    const route = routes[t];

    if (!route) return;

    // Chạy hoạt cảnh chuyển trang
    if (window.LSPTransition?.go) {

      LSPTransition.go(route.url, {
        label: route.label
      });

    } else {

      // Dự phòng nếu script hiệu ứng chưa tải
      window.location.href = route.url;

    }

  };

});



/* INIT */
(async function initMarket() {
  await checkMarketAdminSession();
  await loadMarketFromServer();
  enableMarketSwipe();
})();


/* ===== AUTO REFRESH MARKET ===== */
let marketAutoTimer = null;

function startMarketAutoRefresh(){
  if(marketAutoTimer) clearInterval(marketAutoTimer);

  marketAutoTimer = setInterval(()=>{
    // không refresh khi đang mở modal thuê
    const modalOpen = !document
      .getElementById("rentBackdrop")
      .classList.contains("hidden");

    if(modalOpen) return;

    // chỉ refresh khi tab đang active
    if(document.hidden) return;

    loadMarketFromServer();
  }, 30000); // ⏱ 30s (có thể đổi 60000)
}

// start auto refresh
startMarketAutoRefresh();


// pause / resume khi user chuyển tab
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden){
    if(marketAutoTimer){
      clearInterval(marketAutoTimer);
      marketAutoTimer = null;
    }
  }else{
    startMarketAutoRefresh();
  }
});






/* ==========================================
   TOPUP BUTTON - SMOOTH TRANSITION
========================================== */

const topupBtn = document.getElementById("btnTopupCoin");

if (topupBtn) {

  topupBtn.onclick = () => {

    if (window.LSPTransition?.go) {

LSPTransition.go("/topup.html", {
  label: "Opening Diamond Top-Up..."
});

    } else {

      window.location.href = "/topup.html";

    }

  };

}



/* ==========================================
   FORCE LOGOUT - ENGLISH INTERFACE
========================================== */

function showForceLogoutModal(message) {

  let modal = document.getElementById("forceLogoutModal");

  if (!modal) {

    modal = document.createElement("div");

    modal.id = "forceLogoutModal";

    modal.innerHTML = `

      <div class="fl-backdrop"></div>

      <div class="fl-box">

        <div class="fl-icon">🚫</div>

        <div class="fl-title">
          Session Ended
        </div>

        <div class="fl-msg"></div>

        <div class="fl-sub">
          You will be redirected to the login page...
        </div>

      </div>
    `;

    document.body.appendChild(modal);
  }


  modal.querySelector(".fl-msg").textContent =
    String(message || "Your login session has ended.");


  modal.classList.add("show");

}




/* ==========================================
   MARKET SOCKET - BFCache SAFE
========================================== */

const me = JSON.parse(
  localStorage.getItem("user_profile") || "{}"
);

if (typeof io === "function") {

  socket = io({
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000
  });

  // Khi kết nối hoặc kết nối lại thành công
  socket.on("connect", () => {

    console.log("Market Socket connected");

    // Đăng ký lại UID nếu người dùng đã đăng nhập
    if (me?.uid) {
      socket.emit("auth", {
        uid: me.uid,
        deviceId:
          localStorage.getItem("device_id") || null
      });
    }

    // Đồng bộ lại dữ liệu sau khi kết nối
    loadMarketFromServer();
  });

  // Cập nhật gian hàng realtime
  socket.on("market-update", () => {
    loadMarketFromServer();
  });

  // Theo dõi lỗi kết nối thực sự
  socket.on("connect_error", (error) => {
    console.warn(
      "Market Socket connection error:",
      error.message
    );
  });

  // Xử lý đăng xuất từ server
  if (me?.uid) {

    socket.on("force-logout", (data) => {

const msg =
  data?.message ||
  "You have been signed out.";

      showForceLogoutModal(msg);

      localStorage.removeItem("user_profile");
      localStorage.removeItem("login_uid");
      localStorage.removeItem("isGuest");

      setTimeout(() => {
        location.href = "/login.html";
      }, 3000);

    });

  }

  // Kết nối lần đầu
  socket.connect();
}

/* ==========================================
   BROWSER PAGE LIFECYCLE
========================================== */

// Chủ động đóng Socket trước khi rời trang
window.addEventListener("pagehide", () => {

  if (socket) {
    socket.disconnect();
  }

  if (marketAutoTimer) {
    clearInterval(marketAutoTimer);
    marketAutoTimer = null;
  }

});

// Khôi phục kết nối khi quay lại từ BFCache
window.addEventListener("pageshow", (event) => {

  if (!event.persisted) return;

  if (socket && !socket.connected) {
    socket.connect();
  }

  // Kiểm tra lại quyền admin và đồng bộ gian hàng
  checkMarketAdminSession();
  loadMarketFromServer();

  // Khôi phục cập nhật định kỳ
  startMarketAutoRefresh();

});


