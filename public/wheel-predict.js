const slots = document.querySelectorAll(".slot");

function clearActive(){
  slots.forEach(s=>s.classList.remove("active"));
}

async function loadPredict(){
  const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

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
    return;
  }

  const { multiplier, index, endAt } = data;

  
// 🔥 SUY RA THỜI ĐIỂM BẮT ĐẦU QUAY
roundStartAt = endAt - ROUND_DURATION;
startRoundCountdownViewer();

  // 🎯 show multiplier
  document.getElementById("multiplier").textContent = "x" + multiplier;

  // ✨ highlight slot
  if (slots[index]) {
    slots[index].classList.add("active");
  }

  // ⏱ countdown
  const remain = Math.max(
    0,
    Math.ceil((endAt - Date.now()) / 1000)
  );

  document.getElementById("countdown").textContent =
    "⏳ Còn " + remain + "s";




  // 🔒 lock warning
  document.getElementById("lockText").textContent =
    remain <= 5
      ? "🔒 Sắp quay – khóa cược"
      : "";
}

// 🔁 auto refresh
loadPredict();
setInterval(loadPredict, 1000);



// ⏱️ VIEWER COUNTDOWN – TRƯỚC KHI QUAY
let roundStartAt = null;
let viewerTimer  = null;

// ⏳ thời gian 1 phiên cược (PHẢI TRÙNG SERVER)
const ROUND_DURATION = 60 * 1000; // 60s

function startRoundCountdownViewer(){
  if (!roundStartAt) return;

  if (viewerTimer) clearInterval(viewerTimer);

  viewerTimer = setInterval(() => {
    const remain = Math.max(
      0,
      Math.ceil((roundStartAt - Date.now()) / 1000)
    );

    const timeEl   = document.getElementById("roundTime");
    const statusEl = document.getElementById("roundStatus");
    const box      = document.getElementById("roundCountdown");

    if (!timeEl) return;

    timeEl.textContent = remain + "s";

    if (remain > 5){
      statusEl.textContent = "Đang nhận cược";
      box.classList.remove("warning");
    }
    else if (remain > 0){
      statusEl.textContent = "Sắp bắt đầu quay";
      box.classList.add("warning");
    }
    else{
      statusEl.textContent = "Đang quay";
      box.classList.add("warning");
      clearInterval(viewerTimer);
    }
  }, 1000);
}
