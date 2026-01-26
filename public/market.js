/* ===== DỮ LIỆU MẶT BẰNG ===== */
const booths = [
  { id:1, owner:null },
  { id:2, owner:{ name:"Shop A", logo:"https://i.pravatar.cc/100?1" } },
  { id:3, owner:null },
  { id:4, owner:{ name:"Shop B", logo:"https://i.pravatar.cc/100?2" } },
  { id:5, owner:null },
  { id:6, owner:{ name:"Shop C", logo:"https://i.pravatar.cc/100?3" } }
];

const floor = document.getElementById("marketFloor");

/* RENDER */
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

/* ACTION */
function rentBooth(id){
  alert("💎 Thuê gian hàng #" + id);
  // mở modal thuê gian
}

function openBooth(id){
  alert("🏪 Mở gian hàng #" + id);
  // location.href = `/booth.html?id=${id}`;
}

/* TAB BAR */
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

renderMarket();
