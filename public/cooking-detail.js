let recipe, step = 0, wakeLock;

const id = new URLSearchParams(location.search).get("id");

fetch(`/data/cooking/recipes/${id}.json`)
.then(r=>r.json())
.then(d=>{
  recipe = d;
  document.getElementById("recipePage").innerHTML = `
    <div class="recipe-hero"><img src="${d.cover}"></div>
    <h2>${d.title}</h2>
    <p>${d.time} · ${d.level}</p>
  `;
});

async function enterCookMode(){
  step = 0;
  showStep();
  document.getElementById("cookMode").classList.remove("hidden");

  // giữ màn hình sáng
  if ("wakeLock" in navigator){
    wakeLock = await navigator.wakeLock.request("screen");
  }
}

function exitCookMode(){
  document.getElementById("cookMode").classList.add("hidden");
  wakeLock && wakeLock.release();
}

function showStep(){
  document.getElementById("stepIndex").textContent =
    `Bước ${step+1}/${recipe.steps.length}`;
  document.getElementById("stepText").textContent =
    recipe.steps[step];
}

function nextStep(){
  if (step < recipe.steps.length-1){
    step++; showStep();
  }
}

function prevStep(){
  if (step > 0){
    step--; showStep();
  }
}
