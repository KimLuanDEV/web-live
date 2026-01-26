let socket = null;
if (typeof io !== "undefined") {
  socket = io();
}

const floor = document.getElementById("marketFloor");


function showModal({ title="Thông báo", content="", confirm=false }) {
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

function isAdmin(){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  return me && me.role === "admin";
}

function updateRentCoin(){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  const coin = me?.coins ?? 0;

  const el = document.getElementById("rentCoinVal");
  if(el){
    el.textContent = coin.toLocaleString();
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

  if(selectedPlan.price > coin){
    btn.disabled = true;
    btn.classList.add("disabled");
    btn.textContent = "❌ Không đủ kim cương";

    if(topupBtn){
      topupBtn.classList.remove("hidden");
    }

  }else{
    btn.disabled = false;
    btn.classList.remove("disabled");
    btn.textContent = "Thuê gian hàng";

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
    btn.textContent = `Gian ${i*BOOTHS_PER_TAB + 1}–${Math.min((i+1)*BOOTHS_PER_TAB, totalBooths)}`;

    btn.onclick = ()=>{
      currentTab = i;
      renderMarket();
    };

    wrap.appendChild(btn);
  }
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

    if(!b.owner){
      div.className = "booth empty";
      div.innerHTML = `
        <div>
          <div class="booth-plus">＋</div>
          <div class="booth-text">Thuê gian hàng</div>
        </div>
      `;
      div.onclick = ()=> rentBooth(b.id);
    }else{

  const me = JSON.parse(localStorage.getItem("user_profile"));
  const isMine = me && b.owner.uid === me.uid;

  let expireBadge = "";
  if(b.owner.expireAt){
    const d = daysLeft(b.owner.expireAt);
    if(d <= 1){
      expireBadge = `<div class="booth-expire-badge danger">HẾT HẠN SỚM</div>`;
    }else if(d <= 3){
      expireBadge = `<div class="booth-expire-badge">SẮP HẾT HẠN</div>`;
    }
  }

const admin = isAdmin();

let adminControls = "";
if(admin){
  adminControls = `
    <div class="booth-admin">

      <button onclick="event.stopPropagation(); toggleLock(${b.id}, ${b.owner.locked ? 'false' : 'true'})">
        ${b.owner.locked ? "🔓 Mở khoá" : "🔒 Khoá"}
      </button>
      <button onclick="event.stopPropagation(); revokeBooth(${b.id})">🧹 Thu hồi</button>
    </div>
  `;
}

div.className =
  "booth" +
  (isMine ? " booth-mine" : "") +
  (b.owner.locked && !isAdmin() ? " booth-locked" : "");



div.innerHTML = `
  ${isMine ? `<div class="booth-mine-badge">CỦA TÔI</div>` : ""}
  ${expireBadge}
  ${adminControls}
  <div>
    <img class="booth-logo" src="${b.owner.logo}">
    <div class="booth-name">${b.owner.name}</div>
  </div>
`;

// nếu bị khoá → không cho click
if (!b.owner.locked || isAdmin()) {
  div.onclick = ()=> openBooth(b.id);
} else {
  div.onclick = ()=> showModal({
  title: "🚫 Gian hàng bị khoá",
  content: "Gian hàng này hiện đang bị Admin khoá."
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







function updateMarketStats(){
  const total = booths.length;
  const active = booths.filter(b => b.owner).length;
  const empty = total - active;

  const el = document.getElementById("marketStats");
  if(el){
    el.textContent = `${total} gian • ${active} đang thuê • ${empty} trống`;
  }
}


/* ===== OPEN RENT MODAL ===== */
function rentBooth(id){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  if(!me || !me.uid){
  showModal({
  title: "🔐 Chưa đăng nhập",
  content: "Vui lòng đăng nhập để sử dụng chức năng này."
});

    return;
  }

  // 🔒 đã có gian thì không cho thuê thêm
  const alreadyHaveBooth = booths.some(
    b => b.owner && b.owner.uid === me.uid
  );


 if(alreadyHaveBooth){
  showModal({
    title: "⚠️ Không thể thuê",
    content: "Bạn chỉ được thuê 1 gian hàng."
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

    selectedPlan = { days, price };

    if(range){
      range.value = days;
      daysVal.textContent = days;
      priceVal.textContent = price.toLocaleString();
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
    priceVal.textContent = price.toLocaleString();

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
  title: "🔐 Chưa đăng nhập",
  content: "Vui lòng đăng nhập để sử dụng chức năng này."
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
      price: selectedPlan.price
    })
  });

  const data = await res.json();

 

if(!data.ok){
  let msg = "❌ Thao tác thất bại";

  if(data.error === "already_have_booth")
    msg = "Bạn chỉ được thuê 1 gian hàng";
  else if(data.error === "not_enough_coin")
    msg = "Không đủ kim cương";
  else if(data.error === "not_owner")
    msg = "Bạn không phải chủ gian hàng";

  await showModal({
    title: "⚠️ Không thể thực hiện",
    content: msg
  });
  return;
}


  document.getElementById("rentBackdrop").classList.add("hidden");
  loadMarketFromServer();

 await showModal({
  title: "🎉 Thành công",
  content:
    rentMode === "extend"
      ? "Gia hạn gian hàng thành công!"
      : "Thuê gian hàng thành công!"
});


}catch(e){
  await showModal({
    title: "⚠️ Lỗi",
    content: "Không thể kết nối tới server. Vui lòng thử lại."
  });
}


};



function openBooth(id){
  location.href = `/booth.html?booth=${id}`;
}



async function toggleLock(id, lock){
  const ok = await showModal({
  title: lock ? "🔒 Khoá gian hàng" : "🔓 Mở khoá gian hàng",
  content: lock
    ? "Bạn có chắc muốn khoá gian hàng này?"
    : "Bạn có chắc muốn mở khoá gian hàng này?",
  confirm: true
});
if(!ok) return;


  const me = JSON.parse(localStorage.getItem("user_profile"));
  await fetch("/api/admin/market/lock",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-uid": me.uid
    },
    body: JSON.stringify({ boothId:id, lock })
  });

  
}

async function revokeBooth(id){
  const ok = await showModal({
  title: "🧹 Thu hồi gian hàng",
  content: "Bạn có chắc muốn thu hồi gian hàng này?",
  confirm: true
});
if(!ok) return;


  const me = JSON.parse(localStorage.getItem("user_profile"));
  await fetch("/api/admin/market/revoke",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-uid": me.uid
    },
    body: JSON.stringify({ boothId:id })
  });

  
}




/* ===== TAB BAR ===== */
document.querySelectorAll(".lp-tab").forEach(tab=>{
  tab.onclick = ()=>{
    const t = tab.dataset.tab;
    if(t==="market") return;
    if(t==="social") location.href="/social.html";
    if(t==="lobby") location.href="/lobby.html";
    if(t==="messages") location.href="/messages.html";
    if(t==="profile") location.href="/profile.html";
  };
});

/* INIT */
loadMarketFromServer();
enableMarketSwipe();


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


/* ===== REALTIME MARKET UPDATE ===== */
if (socket) {
  socket.on("market-update", data=>{
    loadMarketFromServer();
  });
}



const topupBtn = document.getElementById("btnTopupCoin");
if(topupBtn){
  topupBtn.onclick = ()=>{
    location.href = "/topup.html";
  };
}
