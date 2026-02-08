(async function(){
  const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

  const res = await fetch("/api/admin/wheel-next",{
    headers:{
      "x-uid": me.uid
    }
  });

  const data = await res.json();
  if (!data.ok){
    document.body.innerHTML = "⛔ NO ACCESS";
    return;
  }

  const r = data.data;

  document.getElementById("multiplier").textContent = "x" + r.multiplier;
  document.getElementById("index").textContent = r.index;
  document.getElementById("roundId").textContent = r.roundId;
})();
