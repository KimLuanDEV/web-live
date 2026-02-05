let recipe = null;
let step = 0;
let wakeLock = null;
let timerInterval = null;
let remainingTime = 0;

const id = new URLSearchParams(location.search).get("id");


function calcTotalTime(steps){
  if (!Array.isArray(steps)) return 0;
  return steps.reduce((sum, s) => {
    if (typeof s === "object" && s.time) {
      return sum + s.time;
    }
    return sum;
  }, 0);
}

function formatMinutes(sec){
  const min = Math.round(sec / 60);
  return min > 0 ? `${min} phút` : "--";
}



// ======================
// 🔥 LOAD CÔNG THỨC
// ======================
fetch(`/data/cooking/recipes/${id}.json`)
  .then(r => {
    if (!r.ok) throw new Error("Không load được JSON");
    return r.json();
  })
  .then(d => {
    recipe = d;

    // 🔒 GUARD: kiểm tra container
    const container = document.getElementById("recipeContent");
    if (!container) {
      console.error("❌ Không tìm thấy #recipeContent");
      return;
    }

// 🔥 TÍNH THỜI GIAN TỔNG (ĐÚNG NGUỒN)
const totalSec = calcTotalTime(d.steps);

container.innerHTML = `
  <div class="recipe-hero">
    <img src="${d.cover || ''}" alt="${d.title}">
  </div>

  <h2>${d.title || "Không có tiêu đề"}</h2>

  <div class="recipe-meta">
    ⏱️ ${formatMinutes(totalSec)} · ⭐ ${d.level || "--"}
  </div>

  <div class="recipe-section">
    <h3>🧂 Nguyên liệu</h3>
    <ul>
      ${(d.ingredients || []).map(i => `<li>${i}</li>`).join("")}
    </ul>
  </div>

  <div class="recipe-section">
    <h3>🔥 Các bước</h3>
    <ol>
      ${(d.steps || []).map(s => {
        const text = typeof s === "string" ? s : s.text;
        const detail = typeof s === "object" && s.detail ? s.detail : "";
        const tip = typeof s === "object" && s.tip ? s.tip : "";

        return `
          <li style="margin-bottom:12px">
            <div><b>${text}</b></div>
            ${detail ? `<div style="opacity:.85">${detail}</div>` : ""}
            ${tip ? `<small style="opacity:.6">💡 ${tip}</small>` : ""}
          </li>
        `;
      }).join("")}
    </ol>
  </div>
`;


    // 🔥 READY
    setCookReady();
  })
  .catch(err => {
    console.error("❌ Lỗi load công thức:", err);
    const container = document.getElementById("recipeContent");
    if (container) {
      container.innerHTML = "❌ Không tải được công thức";
    }
  });


// ======================
// 🍳 COOK MODE
// ======================
async function enterCookMode() {
  if (!recipe || !recipe.steps || recipe.steps.length === 0) {
    alert("⚠️ Công thức chưa sẵn sàng");
    return;
  }

  step = 0;
  showStep();

  // 🔥 HIỆN COOK MODE
  const cm = document.getElementById("cookMode");
  if (cm) cm.classList.remove("hidden");

  // 🔥 ẨN BOTTOM BAR
  if (cookDock) cookDock.style.display = "none";

  // 🔥 giữ màn hình sáng
  if ("wakeLock" in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch (e) {
      console.warn("⚠️ Không giữ được màn hình sáng");
    }
  }
}

function exitCookMode() {
  const cm = document.getElementById("cookMode");
  if (cm) cm.classList.add("hidden");

  // 🔥 HIỆN LẠI BOTTOM BAR
  if (cookDock) cookDock.style.display = "";

  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }

stopTimer();
updateTimerUI(null);

}


function stopTimer(){
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimer(seconds){
  stopTimer();
  if (!seconds || seconds <= 0) {
    updateTimerUI(null);
    return;
  }

  remainingTime = seconds;
  updateTimerUI(remainingTime);

  timerInterval = setInterval(() => {
    remainingTime--;
    updateTimerUI(remainingTime);

    if (remainingTime <= 0) {
      stopTimer();
      // 🔔 báo hết giờ (nhẹ)
      navigator.vibrate && navigator.vibrate([200,100,200]);
    }
  }, 1000);
}

function updateTimerUI(sec){
  const el = document.getElementById("stepTimer");
  if (!el) return;

  if (!sec || sec <= 0) {
    el.textContent = "";
    return;
  }

  const m = Math.floor(sec / 60);
  const s = sec % 60;
  el.textContent = `${m}:${s.toString().padStart(2,"0")}`;
}




function showStep() {
  const idx = document.getElementById("stepIndex");
  const txt = document.getElementById("stepText");

  if (!idx || !txt || !recipe) return;

  idx.textContent = `Bước ${step + 1}/${recipe.steps.length}`;

  const s = recipe.steps[step];
  txt.textContent =
    typeof s === "string" ? s : s.text;

  // ⏱️ TIMER
  if (typeof s === "object" && s.time) {
    startTimer(s.time);
  } else {
    stopTimer();
    updateTimerUI(null);
  }
}


function nextStep() {
  if (!recipe) return;
  if (step < recipe.steps.length - 1) {
    step++;
    showStep();
  }
}

function prevStep() {
  if (step > 0) {
    step--;
    showStep();
  }
}


// ======================
// 🔘 BOTTOM BAR
// ======================
const cookDock = document.getElementById("cookDock");
const cookText = document.getElementById("cookText");

function setCookReady() {
  if (cookText) cookText.textContent = "Bắt đầu nấu";
}
