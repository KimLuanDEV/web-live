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
  // fake owner tạm thời (sau này lấy từ user đang đăng nhập)
  const myShop = {
    name: "Shop của tôi",
    logo: "https://i.pravatar.cc/100?u=" + currentBoothId
  };

  // tìm gian hàng tương ứng
  const booth = booths.find(b => b.id === currentBoothId);
  if (!booth) return;

  // gán owner → biến thành gian active
  booth.owner = myShop;

  // đóng modal
  document.getElementById("rentBackdrop").classList.add("hidden");

  // render lại market
  renderMarket();

  // thông báo
  alert(
    `🎉 Thuê gian thành công!\n` +
    `Gian #${currentBoothId}\n` +
    `⏱ ${selectedPlan.days} ngày\n` +
    `💎 ${selectedPlan.price.toLocaleString()}`
  );
};


function openBooth(id){
  location.href = `/booth.html?booth=${id}`;
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
