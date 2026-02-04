fetch("/data/cooking/index.json")
  .then(r => r.json())
  .then(data => {
    const grid = document.getElementById("cookingGrid");
    grid.innerHTML = "";

    data.categories.forEach(cat => {
      cat.items.forEach(item => {
        const card = document.createElement("div");
        card.className = "lib-card active";
        card.onclick = () => {
          location.href = `/cooking-detail.html?id=${item.id}`;
        };

        card.innerHTML = `
          <div class="lib-icon">🍽️</div>
          <div class="lib-title">${item.title}</div>
          <div class="lib-desc">${item.time} · ${item.level}</div>
        `;

        grid.appendChild(card);
      });
    });
  });
