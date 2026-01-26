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

   updateMarketStats();
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
document.getElementById("confirmRent").onclick = async ()=>{
  const uid = localStorage.getItem("uid");
  if(!uid){
    alert("🔐 Vui lòng đăng nhập");
    return;
  }

  try{
    const res = await fetch("/api/market/rent",{
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
      if(data.error==="not_enough_coin")
        return alert("❌ Không đủ kim cương");
      return alert("❌ Thuê gian thất bại");
    }

    // 👉 cập nhật booth local
    const booth = booths.find(b=>b.id===currentBoothId);
    booth.owner = {
      name: data.booth.name,
      logo: data.booth.logo
    };

    document.getElementById("rentBackdrop").classList.add("hidden");
    renderMarket();

    alert("🎉 Thuê gian thành công!");
  }catch(e){
    alert("⚠️ Lỗi kết nối server");
  }
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
