/* ===== MARKET DATA (DEMO) ===== */
const marketItems = [
  {
    id:1,
    type:"service",
    title:"VIP Livestream Pro – 30 ngày",
    price:5000,
    img:"https://picsum.photos/400?1",
    seller:{
      name:"Livestream Pro",
      avatar:"https://i.pravatar.cc/100?1",
      verified:true
    }
  },
  {
    id:2,
    type:"account",
    title:"Tài khoản VIP Legend",
    price:12000,
    img:"https://picsum.photos/400?2",
    seller:{
      name:"KimDogCat",
      avatar:"https://i.pravatar.cc/100?2",
      verified:false
    }
  }
];

const grid = document.getElementById("marketGrid");

/* ===== RENDER ===== */
function renderMarket(list){
  grid.innerHTML = "";
  list.forEach(item=>{
    const div = document.createElement("div");
    div.className = "market-card";
    div.innerHTML = `
      <img class="market-img" src="${item.img}">
      <div class="market-body">
        <div class="market-title">${item.title}</div>
        <div class="market-price">💎 ${item.price.toLocaleString()}</div>

        <div class="market-seller">
          <img src="${item.seller.avatar}">
          ${item.seller.name}
          ${item.seller.verified ? `<span class="market-verified">✔</span>` : ""}
        </div>

        <button class="market-buy" onclick="buyMarket(${item.id})">
          Mua ngay
        </button>
      </div>
    `;
    grid.appendChild(div);
  });
}

/* ===== FILTER ===== */
document.querySelectorAll(".market-tab").forEach(tab=>{
  tab.onclick = ()=>{
    document.querySelectorAll(".market-tab")
      .forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");

    const type = tab.dataset.type;
    renderMarket(
      type==="all"
        ? marketItems
        : marketItems.filter(i=>i.type===type)
    );
  };
});

/* ===== BUY ===== */
function buyMarket(id){
  const item = marketItems.find(i=>i.id===id);
  alert(`🛒 Mua: ${item.title}\n💎 ${item.price}`);
}

/* ===== ADD SELL ===== */
document.getElementById("btnAddMarket").onclick = ()=>{
  alert("➕ Mở modal đăng bán (sẽ làm tiếp)");
};

/* ===== TAB BAR ===== */
document.querySelectorAll(".lp-tab").forEach(tab=>{
  tab.onclick = ()=>{
    const t = tab.dataset.tab;
    if(t==="social") location.href="/social.html";
    if(t==="lobby") location.href="/lobby.html";
    if(t==="market") location.href="/market.html";
    if(t==="messages") location.href="/messages.html";
    if(t==="profile") location.href="/profile.html";
  };
});

/* INIT */
renderMarket(marketItems);
