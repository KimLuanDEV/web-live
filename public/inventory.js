(async function(){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  if (!me?.uid) {
    location.href = "/login.html";
    return;
  }

  const res = await fetch("/api/market/inventory", {
    headers: { "x-uid": me.uid }
  });

  const data = await res.json();
  if (!data.ok) return;

  const listEl = document.getElementById("inventoryList");
  const emptyEl = document.getElementById("inventoryEmpty");

  if (!data.items || data.items.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  listEl.innerHTML = "";

  data.items.forEach(item => {
    const div = document.createElement("div");
    div.className = "product-card";

    div.innerHTML = `
      <img src="${item.image}">
      <div class="product-name">${item.name}</div>
      <div style="opacity:.7;font-size:12px;margin-top:4px">
        ${item.desc || ""}
      </div>
      <div style="margin-top:6px;font-size:12px">
        🎁 Số lượng: <b>${item.qty}</b>
      </div>
      <button style="margin-top:8px;width:100%">
        Sử dụng
      </button>
    `;

    listEl.appendChild(div);
  });

})();
