/* ===== BOOTH DATA (DEMO) ===== */
const booths = [
  {
    id:"booth1",
    name:"Livestream Pro Official",
    banner:"https://picsum.photos/600/300?1",
    owner:{
      name:"Livestream Pro",
      avatar:"https://i.pravatar.cc/100?1",
      verified:true
    },
    active:true,
    expire:"2026-03-01"
  },
  {
    id:"booth2",
    name:"KimDogCat Shop",
    banner:"https://picsum.photos/600/300?2",
    owner:{
      name:"KimDogCat",
      avatar:"https://i.pravatar.cc/100?2",
      verified:false
    },
    active:false
  }
];

const grid = document.getElementById("boothGrid");

/* ===== RENDER BOOTH ===== */
function renderBooths(){
  grid.innerHTML = "";
  booths.forEach(b=>{
    const div = document.createElement("div");
    div.className = "booth-card";

    div.innerHTML = `
      <img class="booth-banner" src="${b.banner}">
      <div class="booth-body">
        <div class="booth-name">${b.name}</div>

        <div class="booth-owner">
          <img src="${b.owner.avatar}">
          ${b.owner.name}
          ${b.owner.verified ? `<span class="booth-verified">✔</span>` : ""}
        </div>

        <div class="booth-status ${b.active ? "active" : "expired"}">
          ${b.active ? "🟢 Đang hoạt động" : "🔒 Chưa thuê gian hàng"}
        </div>

        ${
          b.active
          ? `<button class="booth-btn enter" onclick="enterBooth('${b.id}')">Vào gian hàng</button>`
          : `<button class="booth-btn rent" onclick="rentBooth('${b.id}')">Thuê gian hàng</button>`
        }
      </div>
    `;

    grid.appendChild(div);
  });
}

/* ===== ACTIONS ===== */
function enterBooth(id){
  alert("🏪 Vào gian hàng: " + id);
  // location.href = `/booth.html?id=${id}`;
}

function rentBooth(id){
  alert("💎 Thuê gian hàng: " + id);
  // mở modal thuê gian hàng
}

/* ===== ADD BOOTH ===== */
document.getElementById("btnRentBooth").onclick = ()=>{
  alert("➕ Thuê gian hàng mới (modal)");
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
renderBooths();
