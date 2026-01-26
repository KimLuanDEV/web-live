const floor = document.getElementById("marketFloor");

/* ===== SLOT GIAN HÀNG (TẠM THỜI TOÀN TRỐNG) ===== */
const booths = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  owner: null
}));

/* ===== STATE MODAL ===== */
let currentBoothId = null;
let selectedPlan = { days: 7, price: 1000 };

/* ===== RENDER ===== */
function renderMarket(){
  floor.innerHTML = "";
  booths.forEach(b=>{
    const div = document.createElement("div");

    if(!b.owner){
      div.className = "booth empty";
      div.innerHTML = `
        <div>
          <div class="booth-plus">＋</div>
          <div class="booth-text">Thuê gian</div>
        </div>
      `;
      div.onclick = ()=> rentBooth(b.id);
    }else{
      div.className = "booth active";
      div.innerHTML = `
        <div>
          <img class="booth-logo" src="${b.owner.logo}">
          <div class="booth-name">${b.owner.name}</div>
        </div>
      `;
      div.onclick = ()=> openBooth(b.id);
    }

    floor.appendChild(div);
  });
}

/* ===== OPEN RENT MODAL ===== */
function rentBooth(id){
  currentBoothId = id;
  document.getElementById("rentBoothId").textContent = id;
  document.getElementById("rentBackdrop").classList.remove("hidden");
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

    selectedPlan = {
      days: +opt.dataset.days,
      price: +opt.dataset.price
    };
  };
});

/* ===== CONFIRM RENT ===== */
document.getElementById("confirmRent").onclick = ()=>{
  alert(
    `✅ Thuê gian #${currentBoothId}\n` +
    `⏱ ${selectedPlan.days} ngày\n` +
    `💎 ${selectedPlan.price.toLocaleString()}`
  );

  // TODO (bạn làm sau):
  // - trừ coin
  // - lưu gian hàng
  // - set booths[index].owner = {...}
  // - renderMarket()

  document.getElementById("rentBackdrop").classList.add("hidden");
};

/* ===== OPEN BOOTH (SAU NÀY) ===== */
function openBooth(id){
  alert("🏪 Mở gian hàng #" + id);
  // location.href = `/booth.html?id=${id}`;
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
renderMarket();
