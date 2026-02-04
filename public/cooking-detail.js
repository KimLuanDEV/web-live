const params = new URLSearchParams(location.search);
const id = params.get("id");

fetch(`/data/cooking/recipes/${id}.json`)
  .then(r => r.json())
  .then(d => {
    document.getElementById("recipeTitle").textContent = d.title;

    document.getElementById("recipeContent").innerHTML = `
      <h3>🧂 Nguyên liệu</h3>
      <ul>${d.ingredients.map(i => `<li>${i}</li>`).join("")}</ul>

      <h3>🔥 Các bước</h3>
      <ol>${d.steps.map(s => `<li>${s}</li>`).join("")}</ol>
    `;
  });
