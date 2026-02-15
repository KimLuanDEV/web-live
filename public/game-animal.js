const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

const socket = io({
  auth:{ uid: me.uid }
});

let animals = [];
let pendingEgg = null;
let barnLevel = 1;
let barnConfig = {};
let confirmMode = null;
let pendingBarnUpgrade = null;
let currentCoin = 0;

function render(){

  const grid = document.getElementById("farmGrid");
  if(!grid) return;

  grid.innerHTML = "";

  const now = Date.now();

  animals.forEach((a,i)=>{

    if(!a) return;

    const growTime = Number(a.growTime) || 60000;
    const created = Number(a.createdAt) || now;
    const age = now - created;

    let progress = Math.min(100, (age / growTime) * 100);
    progress = Math.max(0, progress);

    const secondsLeft = Math.max(
      0,
      Math.ceil((growTime - age) / 1000)
    );

    let rarityClass = "common";
    let img = "/assets/eggs/egg1.png";

    if(a.type === "gold"){
      rarityClass = "rare";
      img = "/assets/eggs/egg2.png";
    }

    if(a.type === "diamond"){
      rarityClass = "epic";
      img = "/assets/eggs/egg3.png";
    }

    if(a.type === "dragon"){
      rarityClass = "legendary";
      img = "/assets/eggs/egg4.png";
    }

    // ===== Stage Animation =====
    let stageClass = "";
    let stageHTML = "";

if(progress >= 100){

  stageHTML = `
    <div class="animal-stage hatched-animal">
      <div class="hatch-glow"></div>

      ${
  a.type === "dragon"
    ? `<img src="/assets/animals/dragon.png" class="animal-img">`
    : `<img src="/assets/animals/chicken.png" class="animal-img">`
}


      <div class="ready-badge">READY</div>
    </div>
  `;


    }else{

      // Đang ấp → hiện trứng
      stageHTML = `
        <img src="${img}"
             style="width:70px;height:70px;object-fit:contain;">
      `;

      // 90–99% → rung + crack
if(progress >= 90){
  stageClass = "almost-hatch";

  let crackImg = "/assets/effects/crack-common.png";

  if(a.type === "gold")
    crackImg = "/assets/effects/crack-rare.png";

  if(a.type === "diamond")
    crackImg = "/assets/effects/crack-epic.png";

  if(a.type === "dragon")
    crackImg = "/assets/effects/crack-legendary.png";

  stageHTML += `
    <div class="crack-overlay"
         style="background:url('${crackImg}') center/contain no-repeat;">
    </div>
  `;
}


    }

    grid.innerHTML += `
      <div class="animal-card ${rarityClass} ${progress>=100?'hatched':''}" id="animal-${i}">


        <div class="animal-stage ${stageClass}">
          ${stageHTML}
        </div>

        <div class="grow-bar">
          <div class="grow-fill"
            style="width:${progress}%">
          </div>
        </div>

        <div class="progress-text">
          ${progress.toFixed(0)}%
        </div>

        ${
          progress >= 100
          ? `<button class="sell-btn"
               onclick="sellAnimal(${i})">
               Sell +${a.value} 💎
             </button>`
          : `<div class="countdown">
               ⏳ ${secondsLeft}s
             </div>`
        }

      </div>
    `;
  });

  // ===== LEGENDARY HEADER GLOW =====
const hasLegend = animals.some(a => {
  const growTime = Number(a.growTime) || 60000;
  const created = Number(a.createdAt) || 0;
  return a.type === "dragon" &&
         (now - created) >= growTime;
});


  const header = document.querySelector(".farm-header");
  if(header){
    header.classList.toggle("legendary-glow", hasLegend);
  }

}






function buyEgg(){
  socket.emit("animal-buy-egg");
}



function sellAnimal(index){

  const card = document.getElementById("animal-"+index);
  if(!card) return;

  const rect = card.getBoundingClientRect();
  const coinBox = document.querySelector(".coin-box");
  const coinRect = coinBox.getBoundingClientRect();

  const fly = document.createElement("div");
  fly.className = "flying-coin";
  fly.textContent = "+💎";

  fly.style.left = rect.left + rect.width/2 + "px";
  fly.style.top  = rect.top + rect.height/2 + "px";

  const dx = coinRect.left - rect.left;
  const dy = coinRect.top - rect.top;

  fly.style.setProperty("--dx", dx+"px");
  fly.style.setProperty("--dy", dy+"px");

  document.body.appendChild(fly);

  setTimeout(()=> fly.remove(),800);

  card.classList.add("selling");

  setTimeout(()=>{
    socket.emit("animal-sell", index);
  },300);
}




// ================== SHOP DATA ==================

const eggTypes = [
  {
    id:"normal",
    name:"Verdant Egg",
    price:100,
    rare:"Common",
    grow:60000
  },
  {
    id:"gold",
    name:"Solar Egg",
    price:300,
    rare:"Rare",
    grow:50000
  },
  {
    id:"diamond",
    name:"Frost Diamond Egg",
    price:800,
    rare:"Epic",
    grow:40000
  },
  {
    id:"dragon",
    name:"Inferno Dragon Egg",
    price:2000,
    rare:"Legendary",
    grow:35000
  }
];



function openShop(){

  const overlay = document.getElementById("shopOverlay");
  overlay.classList.remove("hidden");

  setTimeout(()=>{
    overlay.classList.add("show");
  },10);

  renderShop();
}



function closeShop(){

  const overlay = document.getElementById("shopOverlay");

  overlay.classList.remove("show");

  setTimeout(()=>{
    overlay.classList.add("hidden");
  },300);
}




function renderShop(){

  const box = document.getElementById("shopGrid");
  box.innerHTML = "";

  eggTypes.forEach(e=>{

    let img = "/assets/eggs/egg1.png";

    if(e.id === "gold") img = "/assets/eggs/egg2.png";
    if(e.id === "diamond") img = "/assets/eggs/egg3.png";
    if(e.id === "dragon") img = "/assets/eggs/egg4.png";

    box.innerHTML += `
      <div class="shop-item"
           onclick="buyEggType('${e.id}')">

        <img src="${img}" class="shop-img">

        <div class="shop-name">
          ${e.name}
        </div>

        <div class="shop-price">
          💎 ${e.price}
        </div>

      </div>
    `;
  });
}



function buyEggType(id){

  const egg = eggTypes.find(e=>e.id===id);
  if(!egg) return;

  pendingEgg = egg;

  document.getElementById("confirmContent").innerHTML =
    `Buy <b>${egg.name}</b><br>
     Price: 💎 ${egg.price}<br>
     Rarity: ${egg.rare}`;

  document.getElementById("confirmOverlay")
    .classList.remove("hidden");
}



function closeConfirm(){
  document.getElementById("confirmOverlay")
    .classList.add("hidden");

  confirmMode = null;
  pendingEgg = null;
  pendingBarnUpgrade = null;
}


function confirmBuy(){

  if(confirmMode === "barn"){
    socket.emit("barn-upgrade");
    confirmMode = null;
    pendingBarnUpgrade = null;
    closeConfirm();
    return;
  }

  if(pendingEgg){
    socket.emit("animal-buy-egg", pendingEgg.id);
  }

  confirmMode = null;
  pendingEgg = null;

  closeConfirm();
  closeShop();
}


function upgradeBarn(){

  const next = barnLevel + 1;
  const cfg = barnConfig[next];

  if(!cfg){
    alert("Max Level");
    return;
  }

  confirmMode = "barn";

  document.getElementById("confirmContent").innerHTML =
    `Upgrade Barn to Lv ${next}?<br>
     Max Animals: ${cfg.max}<br>
     Cost: 💎 ${cfg.price}`;

  document.getElementById("confirmOverlay")
    .classList.remove("hidden");
}



function updateSlotDisplay(){

  const countEl = document.getElementById("slotCount");
  const maxEl = document.getElementById("slotMax");
  const box = document.querySelector(".slot-box");

  if(!countEl || !maxEl || !box) return;

  const count = animals.length;
  const max = Number(maxEl.textContent);

  countEl.textContent = count;

  box.classList.remove("full","warning");

const oldTip = box.querySelector(".slot-tooltip");
if(oldTip) oldTip.remove();

if(count >= max){
  box.classList.add("full");

  const tip = document.createElement("div");
  tip.className = "slot-tooltip";
  tip.textContent = "Upgrade barn";
  box.appendChild(tip);

} else if(count >= max - 1){
  box.classList.add("warning");
}

}


document.getElementById("shopOverlay")
.addEventListener("click", e=>{
  if(e.target.id === "shopOverlay"){
    closeShop();
  }
});




socket.on("animal-update", data=>{
  animals = data;
  render();
  updateSlotDisplay();
});




socket.on("coin-update", data=>{

  const el = document.getElementById("coinValue");
  if(!el) return;

  const newCoin = data.coins ?? 0;

  const diff = newCoin - currentCoin;
  const steps = 20;
  let step = 0;

  const interval = setInterval(()=>{
    step++;
    const value = currentCoin + (diff * (step/steps));
    el.textContent = Math.floor(value);

    if(step>=steps){
      clearInterval(interval);
      el.textContent = newCoin;
      currentCoin = newCoin;
    }
  },15);
});




socket.on("barn-update", data => {

  barnLevel = data.level;
  barnConfig = data.config;

  const levelEl = document.getElementById("barnLevel");

  if (levelEl) {
    levelEl.textContent = barnLevel;

    const box = document.querySelector(".barn-info");
    if (box) {
      box.classList.add("flash");

      setTimeout(() => {
        box.classList.remove("flash");
      }, 600);
    }
  }

  // ===== UPDATE SLOT MAX =====
  const max = barnConfig[barnLevel]?.max || 4;

  const slotMaxEl = document.getElementById("slotMax");
  if (slotMaxEl) {
    slotMaxEl.textContent = max;
  }

  updateSlotDisplay();

  // ===== UPDATE HEADER LEVEL COLOR =====
  const header = document.querySelector(".farm-header");
  if (header) {
    header.classList.remove("level-1","level-2","level-3","level-4");
    header.classList.add("level-" + barnLevel);
  }

});




setInterval(()=>{
  render();
},1000);
