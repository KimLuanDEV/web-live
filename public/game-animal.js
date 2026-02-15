const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

const socket = io({
  auth:{ uid: me.uid }
});

let animals = [];

function render(){

  const grid = document.getElementById("farmGrid");
  grid.innerHTML = "";

  const now = Date.now();

  animals.forEach((a,i)=>{

    const age = now - a.createdAt;

    const growTime = a.growTime || 60000;

    let icon = "🥚";
    let progress = 0;

    // ===== ICON THEO TYPE =====
    if(a.type === "gold") icon = "🥚✨";
    if(a.type === "diamond") icon = "💎";
    if(a.type === "dragon") icon = "🐉";

    // ===== STAGE LOGIC =====
    if(age >= growTime){
      progress = 100;
      icon = a.type === "dragon" ? "🐲" : "🐔";
    }else{
      progress = Math.max(
        0,
        Math.min(100, (age / growTime) * 100)
      );
    }

    grid.innerHTML += `
      <div class="animal-card">

        <div class="animal-stage">${icon}</div>

        <div style="font-size:12px;opacity:.6">
          ${a.type?.toUpperCase() || "NORMAL"}
        </div>

        <div class="grow-bar">
          <div class="grow-fill"
            style="width:${progress}%">
          </div>
        </div>

        ${
          progress >= 100
          ? `<button class="sell-btn"
              onclick="sell(${i})">
              Sell +${a.value} 💎
            </button>`
          : `<div style="opacity:.6;margin-top:6px">
              Growing...
            </div>`
        }

      </div>
    `;
  });
}



function buyEgg(){
  socket.emit("animal-buy-egg");
}

function sell(index){
  socket.emit("animal-sell", index);
}


// ================== SHOP DATA ==================

const eggTypes = [
  {
    id:"normal",
    name:"🥚 Normal Egg",
    price:100,
    rare:"Common",
    grow:60000
  },
  {
    id:"gold",
    name:"🥚✨ Golden Egg",
    price:300,
    rare:"Rare",
    grow:50000
  },
  {
    id:"diamond",
    name:"💎 Egg",
    price:800,
    rare:"Epic",
    grow:40000
  },
  {
    id:"dragon",
    name:"🐉 Dragon Egg",
    price:2000,
    rare:"Legendary",
    grow:35000
  }
];

function openShop(){
  document.getElementById("shopOverlay").classList.remove("hidden");
  renderShop();
}

function closeShop(){
  document.getElementById("shopOverlay").classList.add("hidden");
}

function renderShop(){
  const box = document.getElementById("shopGrid");
  box.innerHTML="";

  eggTypes.forEach(e=>{
    box.innerHTML+=`
      <div class="shop-item" onclick="buyEggType('${e.id}')">
        <div class="egg-name">${e.name}</div>
        <div>💎 ${e.price}</div>
        <div class="egg-rare">${e.rare}</div>
      </div>
    `;
  });
}

function buyEggType(id){
  socket.emit("animal-buy-egg", id);
}






socket.on("animal-update", data=>{
  animals = data;
  render();
});

socket.on("coin-update", data=>{
  const el = document.getElementById("coinValue");
  if(el){
    el.textContent = data.coins ?? 0;
  }
});


setInterval(()=>{
  render();
},1000);
