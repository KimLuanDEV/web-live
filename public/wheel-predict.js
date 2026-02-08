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



let roundEndAt = null;
let roundTimer = null;

function startRoundCountdownViewer(){
  if (!roundEndAt) return;

  if (roundTimer) clearInterval(roundTimer);

  roundTimer = setInterval(() => {
    const remain = Math.max(
      0,
      Math.ceil((roundEndAt - Date.now()) / 1000)
    );

    const timeEl = document.getElementById("roundTime");
    const statusEl = document.getElementById("roundStatus");
    const box = document.getElementById("roundCountdown");

    if (!timeEl) return;

    timeEl.textContent = remain + "s";

    if (remain > 5){
      statusEl.textContent = "Đang nhận cược";
      box.classList.remove("warning");
    } else if (remain > 0){
      statusEl.textContent = "Sắp quay…";
      box.classList.add("warning");
    } else {
      statusEl.textContent = "Đang quay";
      box.classList.add("warning");
      clearInterval(roundTimer);
    }
  }, 1000);
}
