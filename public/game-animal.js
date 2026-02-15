const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

const socket = io({
  auth:{ uid: me.uid }
});

let animals = [];

function render(){
  const grid = document.getElementById("farmGrid");
  grid.innerHTML="";

  animals.forEach((a,i)=>{

    let icon="🥚";
    if(a.stage===1) icon="🐥";
    if(a.stage===2) icon="🐔";

    grid.innerHTML+=`
      <div class="animal-card">
        <div class="animal-stage">${icon}</div>
        <div>Level: ${a.stage}</div>
        ${a.stage===2
          ? `<button class="sell-btn" onclick="sell(${i})">Bán +${a.value} 💎</button>`
          : `<div>Đang lớn...</div>`
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
