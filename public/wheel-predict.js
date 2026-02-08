let spinning = false;


const values = [0.5, 1.2, 1.5, 2, 5, 10];
const svg = document.getElementById("wheelSvg");

const R = 120;
const sliceAngle = 360 / values.length;

// 🎨 tạo vòng quay SVG
values.forEach((v, i) => {
  const start = i * sliceAngle;
  const end   = start + sliceAngle;

  const p = describeArc(0, 0, R, start, end);

  const path = document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d", p);
  path.setAttribute("class","slice");
  path.dataset.index = i;
  svg.appendChild(path);

  // label
  const angle = start + sliceAngle/2;
  const rad = (angle-90) * Math.PI / 180;
  const x = Math.cos(rad) * 75;
  const y = Math.sin(rad) * 75;

  const text = document.createElementNS("http://www.w3.org/2000/svg","text");
  text.setAttribute("x", x);
  text.setAttribute("y", y);
  text.setAttribute("class","label");
  text.textContent = "x" + v;
  svg.appendChild(text);
});

function clearActive(){
  svg.querySelectorAll(".slice")
    .forEach(s=>s.classList.remove("active"));
}


async function loadPredict(){
  const me = JSON.parse(localStorage.getItem("user_profile")||"{}");

  const res = await fetch("/api/admin/wheel-next",{
    headers:{ "x-uid": me.uid }
  });

  const json = await res.json();
  if(!json.ok){
    document.body.innerHTML = "⛔ NO ACCESS";
    return;
  }

  const data = json.data;
  clearActive();

  if(!data){
    document.getElementById("multiplier").textContent = "--";
    document.getElementById("countdown").textContent = "Chưa có phiên";
    svg.classList.remove("spinning");
    return;
  }

  const { multiplier, index, endAt } = data;

  document.getElementById("multiplier").textContent = "x"+multiplier;

  const remain = Math.max(0, Math.ceil((endAt - Date.now())/1000));
  document.getElementById("countdown").textContent =
    "⏳ Còn " + remain + "s";

  // 🎡 FAKE SPIN KHI CÒN XA
  if (remain > 5){
    if (!spinning){
      svg.classList.add("spinning");
      spinning = true;
    }
    document.getElementById("lockText").textContent = "";
    return;
  }

  // 🔒 STOP SPIN + LOCK Ô TRÚNG
  if (spinning){
    svg.classList.remove("spinning");
    spinning = false;
  }

  const slice = svg.querySelector(`.slice[data-index="${index}"]`);
  if(slice) slice.classList.add("active");

  document.getElementById("lockText").textContent =
    "🔒 Sắp quay – khóa cược";
}


// SVG helpers
function polarToCartesian(cx, cy, r, angle){
  const rad = (angle-90) * Math.PI / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

function describeArc(cx, cy, r, start, end){
  const s = polarToCartesian(cx, cy, r, end);
  const e = polarToCartesian(cx, cy, r, start);
  const large = end-start <= 180 ? 0 : 1;

  return [
    "M", cx, cy,
    "L", e.x, e.y,
    "A", r, r, 0, large, 0, s.x, s.y,
    "Z"
  ].join(" ");
}

// ▶️ start
loadPredict();
setInterval(loadPredict, 1000);
