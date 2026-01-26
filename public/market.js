const floor = document.getElementById("marketFloor");

let booths = []; // sẽ load từ server
/* ===== STATE MODAL ===== */
let currentBoothId = null;
let selectedPlan = { days: 7, price: 1000 };
let rentMode = "rent"; // "rent" | "extend"



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
          expireAt: booth.expireAt
        }
      };
    });

    renderMarket();
  }catch(e){
    console.error("Load market failed", e);
  }
}


function handleActiveBooth(booth){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  if (!me || !me.uid) {
    openBooth(booth.id);
    return;
  }

  // nếu là gian của tôi → gia hạn
  if (booth.owner.uid === me.uid) {
    openExtendModal(booth.id);
  } else {
    openBooth(booth.id);
  }
}



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
  const me = JSON.parse(localStorage.getItem("user_profile"));
  if(!me || !me.uid){
    alert("🔐 Vui lòng đăng nhập");
    return;
  }

  // 🔒 đã có gian thì không cho thuê thêm
  const alreadyHaveBooth = booths.some(
    b => b.owner && b.owner.uid === me.uid
  );

  if(alreadyHaveBooth){
    alert("⚠️ Bạn đã có gian hàng rồi");
    return;
  }

  rentMode = "rent";
  currentBoothId = id;
  document.getElementById("rentBoothId").textContent = id;
  document.getElementById("rentBackdrop").classList.remove("hidden");
}



function openExtendModal(id){
  rentMode = "extend";
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


if(data.error === "already_have_booth")
return alert("⚠️ Bạn chỉ được thuê 1 gian hàng");


const me = JSON.parse(localStorage.getItem("user_profile"));
if(!me || !me.uid){
  alert("🔐 Vui lòng đăng nhập");
  return;
}


const uid = me.uid;


try{
  const api = rentMode === "extend"
    ? "/api/market/extend"
    : "/api/market/rent";

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
    if(data.error==="not_enough_coin")
      return alert("❌ Không đủ kim cương");
    if(data.error==="not_owner")
      return alert("❌ Bạn không phải chủ gian hàng");
    return alert("❌ Thao tác thất bại");
  }

  document.getElementById("rentBackdrop").classList.add("hidden");
  loadMarketFromServer();

  alert(
    rentMode === "extend"
      ? "⏳ Gia hạn gian hàng thành công!"
      : "🎉 Thuê gian thành công!"
  );

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
loadMarketFromServer();



