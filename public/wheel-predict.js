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
