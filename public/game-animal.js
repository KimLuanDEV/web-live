const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

const socket = io({
  auth:{ uid: me.uid }
});

let animals = [];
let pendingEgg = null;

function render(){

  const grid = document.getElementById("farmGrid");
  grid.innerHTML = "";

  const now = Date.now();

  animals.forEach((a,i)=>{

    const age = now - a.createdAt;
    const growTime = a.growTime || 60000;

    let progress = Math.min(100, (age/growTime)*100);
    progress = Math.max(0, progress);

    let secondsLeft = Math.max(
      0,
      Math.ceil((growTime - age)/1000)
    );

    let icon = "🥚";
    let rarityClass = "common";

    if(a.type==="gold"){
      icon="🥚";
      rarityClass="rare";
    }
    if(a.type==="diamond"){
      icon="🥚";
      rarityClass="epic";
    }
    if(a.type==="dragon"){
      icon="🥚";
      rarityClass="legendary";
    }

    if(progress>=100){
      icon = a.type==="dragon" ? "🐲" : "🐔";
    }

    grid.innerHTML += `
      <div class="animal-card ${rarityClass}" id="animal-${i}">

        <div class="animal-stage ${progress>=100?'hatching':''}">
          ${icon}
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
          progress>=100
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
}




function buyEgg(){
  socket.emit("animal-buy-egg");
}

function sellAnimal(index){

  const card = document.getElementById("animal-"+index);
  if(card){
    card.classList.add("selling");
  }

  setTimeout(()=>{
    socket.emit("animal-sell", index);
  },300);
}



// ================== SHOP DATA ==================

const eggTypes = [
  {
    id:"normal",
    name:"🥚 Egg 1",
    price:100,
    rare:"Common",
    grow:60000
  },
  {
    id:"gold",
    name:"🥚 Egg 2",
    price:300,
    rare:"Rare",
    grow:50000
  },
  {
    id:"diamond",
    name:"🥚 Egg 3",
    price:800,
    rare:"Epic",
    grow:40000
  },
  {
    id:"dragon",
    name:"🥚 Egg 4",
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
  pendingEgg = null;
}

function confirmBuy(){

  if(!pendingEgg) return;

  socket.emit("animal-buy-egg", pendingEgg.id);

  closeConfirm();
  closeShop();
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
