const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

const socket = io({
  auth:{ uid: me.uid }
});

let animals = [];

function render(){
  const grid = document.getElementById("farmGrid");
  grid.innerHTML="";

  const now = Date.now();

  animals.forEach((a,i)=>{

    let icon="🥚";
    let progress=0;

    const age = now - a.createdAt;

    if(a.stage===1) icon="🐥";
    if(a.stage===2) icon="🐔";

    if(a.stage===0){
      progress = Math.min(100, age/30000*100);
    }
    if(a.stage===1){
      progress = Math.min(100, (age-30000)/30000*100);
    }
    if(a.stage===2){
      progress = 100;
    }

    grid.innerHTML+=`
      <div class="animal-card">
        <div class="animal-stage">${icon}</div>
        <div>Stage: ${a.stage}</div>

        <div class="grow-bar">
          <div class="grow-fill" style="width:${progress}%"></div>
        </div>

        ${
          a.stage===2
          ? `<button class="sell-btn" onclick="sell(${i})">Sell +${a.value} 💎</button>`
          : `<div style="opacity:.6;margin-top:6px">Growing...</div>`
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
