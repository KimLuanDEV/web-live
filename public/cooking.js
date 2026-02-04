fetch("/data/cooking/index.json")
.then(r=>r.json())
.then(data=>{
  const grid = document.getElementById("cookingGrid");
  grid.innerHTML = "";

  data.categories.forEach(c=>{
    c.items.forEach(i=>{
      const card = document.createElement("div");
      card.className = "cook-card";
      card.onclick = ()=>location.href=`/cooking-detail.html?id=${i.id}`;

      card.innerHTML = `
        <img src="${i.cover}" alt="${i.title}">
        <div class="info">
          <div class="title">${i.title}</div>
          <div class="meta">
            <div class="cook-chip">⏱ ${i.time}</div>
            <div class="cook-chip">⭐ ${i.level}</div>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });
  });
});
