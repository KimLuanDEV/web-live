fetch("/data/cooking/index.json")
.then(r => r.json())
.then(data => {
  const grid = document.getElementById("cookingGrid");
  grid.innerHTML = "";

  data.categories.forEach(c => {
    c.items.forEach(i => {
      const card = document.createElement("div");
      card.className = "cook-card";
      card.onclick = () => location.href = `/cooking-detail.html?id=${i.id}`;

      // ⏱️ load recipe để tính thời gian chuẩn
      fetch(`/data/cooking/recipes/${i.id}.json`)
        .then(r => r.json())
        .then(recipe => {
          const totalSec = calcTotalTime(recipe.steps);
          const timeText = formatMinutes(totalSec);

          card.innerHTML = `
            <img src="${i.cover}" alt="${i.title}">
            <div class="info">
              <div class="title">${i.title}</div>
              <div class="meta">
                <div class="cook-chip">⏱ ${timeText}</div>
                <div class="cook-chip">⭐ ${i.level}</div>
              </div>
            </div>
          `;
        })
        .catch(() => {
          // fallback nếu lỗi
          card.innerHTML = `
            <img src="${i.cover}" alt="${i.title}">
            <div class="info">
              <div class="title">${i.title}</div>
              <div class="meta">
                <div class="cook-chip">⏱ --</div>
                <div class="cook-chip">⭐ ${i.level}</div>
              </div>
            </div>
          `;
        });

      grid.appendChild(card);
    });
  });
});


// ======================
// ⏱️ TIME UTILS (CHUẨN)
// ======================
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
