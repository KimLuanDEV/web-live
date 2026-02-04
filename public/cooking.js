fetch("/data/cooking/index.json")
.then(r=>r.json())
.then(data=>{
  const grid = document.getElementById("cookingGrid");
  grid.innerHTML = "";

  data.categories.forEach(c=>{
    c.items.forEach(i=>{
      const d = document.createElement("div");
      d.className = "cook-card";
      d.onclick = ()=>location.href=`/cooking-detail.html?id=${i.id}`;

      d.innerHTML = `
        <img src="${i.cover}">
        <div class="info">
          <div class="title">${i.title}</div>
          <div class="meta">${i.time} · ${i.level}</div>
        </div>
      `;
      grid.appendChild(d);
    });
  });
});
