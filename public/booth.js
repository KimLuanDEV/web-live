const socket = typeof io !== "undefined" ? io() : null;


// 🔐 bind socket với user (bắt buộc)
const __me = JSON.parse(localStorage.getItem("user_profile"));
if (socket && __me?.uid) {
  socket.emit("socket-login", { uid: __me.uid });
}



/* ===== GET BOOTH ID ===== */
const params = new URLSearchParams(location.search);
const boothId = params.get("booth");

/* ===== ELEMENTS ===== */
const boothNameEl = document.getElementById("boothName");
const boothLogoEl = document.getElementById("boothLogo");
const btnBack = document.getElementById("btnBack");
const btnAddProduct = document.getElementById("btnAddProduct");
const btnExtend = document.getElementById("btnExtendBooth");
const expireBox = document.getElementById("boothExpireBox");
let currentBoothOwnerUid = null;

const pName  = document.getElementById("pName");
const pPrice = document.getElementById("pPrice");
const pDesc  = document.getElementById("pDesc");
const pStock = document.getElementById("pStock");

const pImageFile = document.getElementById("pImageFile");
const pImagePreview = document.getElementById("pImagePreview");

let editingProductId = null;


if (pImageFile) {
  pImageFile.onchange = () => {
    const file = pImageFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      pImagePreview.src = e.target.result;
      pImagePreview.style.display = "block";
    };
    reader.readAsDataURL(file);
  };
}




/* ===== HELPERS ===== */
function formatDate(ts){
  const d = new Date(ts);
  return d.toLocaleDateString("vi-VN");
}

function diffDays(ts){
  return Math.ceil((ts - Date.now()) / (24*60*60*1000));
}


function renderProducts(products){
  const list = document.getElementById("productList");
  const empty = document.getElementById("emptyText");

  const me = JSON.parse(localStorage.getItem("user_profile"));
  const isOwner = me?.uid === currentBoothOwnerUid;
  

  if(!products.length){
    empty.classList.remove("hidden");
    list.innerHTML = "";
    return;
  }

  empty.classList.add("hidden");
  list.innerHTML = "";

  products.forEach(p=>{

    const out = p.stock <= 0;
    const div = document.createElement("div");
    div.className = "product-card";

div.innerHTML = `
  <img src="${p.image}">
  <div class="product-name">${p.name}</div>
  <div class="product-price">💎 ${p.price.toLocaleString()}</div>
  <div style="opacity:.7;font-size:13px;margin-top:4px">
    ${p.desc || ""}
  </div>

  ${isOwner ? `
    <div style="display:flex;gap:8px;margin-top:8px">
      <button onclick="openEditProduct('${p.id}')" style="flex:1">✏️ Sửa</button>
      <button onclick="deleteProduct('${p.id}')" style="flex:1;color:#ff5f6d">🗑 Xoá</button>
    </div>
  ` : `

 
<button
  style="margin-top:8px;width:100%"
  ${out ? "disabled style='opacity:.5'" : ""}
  onclick="buyProduct('${p.id}')">
  ${out ? "Hết hàng" : "🛒 Mua"}
</button>

  `}
`;

    list.appendChild(div);
  });
}




/* ===== LOAD BOOTH INFO FROM SERVER ===== */
async function loadBooth(){
  try{
    const res = await fetch("/api/market");
    const data = await res.json();
    if(!data.ok) return;

    const booth = data.market[boothId];
    if(!booth) return;

    window.__lastBooth = booth;
    currentBoothOwnerUid = booth.ownerUid;

    // info
    boothNameEl.textContent = booth.name;
    boothLogoEl.src = booth.logo;


    renderProducts(booth.products || []);

    const me = JSON.parse(localStorage.getItem("user_profile"));
    const isOwner = me && me.uid === booth.ownerUid;

    // chỉ chủ gian mới thấy gia hạn + expiry
    if(isOwner){
      btnExtend?.classList.remove("hidden");
      btnAddProduct?.classList.remove("hidden");

      if(booth.expireAt){
        const daysLeft = diffDays(booth.expireAt);
        expireBox.classList.remove("hidden");

        if(daysLeft <= 1){
          expireBox.className = "booth-expire danger";
          expireBox.innerHTML = `🔴 Gian hàng hết hạn <b>hôm nay</b>!<br>
            📅 ${formatDate(booth.expireAt)}`;
        }
        else if(daysLeft <= 3){
          expireBox.className = "booth-expire warn";
          expireBox.innerHTML = `⏳ Gian hàng sắp hết hạn<br>
            📅 ${formatDate(booth.expireAt)} (còn ${daysLeft} ngày)`;
        }
        else{
          expireBox.className = "booth-expire";
          expireBox.innerHTML = `📅 Hết hạn: ${formatDate(booth.expireAt)}
            (còn ${daysLeft} ngày)`;
        }
      }
    }

  }catch(e){
    console.error("loadBooth error", e);
  }
}

loadBooth();
syncMyCoin();


/* ===== ACTIONS ===== */
btnBack.onclick = ()=> history.back();

btnAddProduct.onclick = ()=>{
  const me = JSON.parse(localStorage.getItem("user_profile"));
  if(!me?.uid){
    alert("🔐 Vui lòng đăng nhập");
    return;
  }
  if(me.uid !== currentBoothOwnerUid){
    alert("⛔ Bạn không phải chủ gian hàng");
    return;
  }
  document.getElementById("addProductModal").classList.remove("hidden");
};




/* ===== GIA HẠN ===== */
btnExtend?.addEventListener("click", ()=>{
  openExtendModalInBooth();
});

function openExtendModalInBooth(){
  const days = prompt("Gia hạn gian hàng (7 / 30 / 90 ngày):", "30");
  if(!days) return;

  const priceMap = { 7:1000, 30:3500, 90:9000 };
  const price = priceMap[days];
  if(!price) return alert("Gói không hợp lệ");

  confirmExtendBooth(+days, price);
}

async function confirmExtendBooth(days, price){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  if(!me || !me.uid){
    alert("🔐 Vui lòng đăng nhập");
    return;
  }

  try{
    const res = await fetch("/api/market/extend",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "x-uid": me.uid
      },
      body: JSON.stringify({ boothId, days, price })
    });

    const data = await res.json();
    if(!data.ok){
      if(data.error==="not_enough_coin")
        return alert("❌ Không đủ kim cương");
      return alert("❌ Gia hạn thất bại");
    }

    alert("⏳ Gia hạn gian hàng thành công!");
    syncMyCoin();
    loadBooth();

  }catch(e){
    alert("⚠️ Lỗi kết nối server");
  }
}


async function submitProduct(){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  if(!me?.uid){
    alert("🔐 Vui lòng đăng nhập");
    return;
  }

  const file = pImageFile.files[0];
  if(!file){
    alert("🖼️ Vui lòng chọn ảnh sản phẩm");
    return;
  }

  // 1️⃣ UPLOAD ẢNH
  const form = new FormData();
  form.append("image", file);

  const up = await fetch("/api/upload-product-image", {
    method: "POST",
    headers: { "x-uid": me.uid },
    body: form
  });

  const upData = await up.json();
  if(!upData.url){
    alert("❌ Upload ảnh thất bại");
    return;
  }

  // 2️⃣ TẠO PRODUCT
  const product = {
    name: pName.value.trim(),
    price: +pPrice.value,
    image: upData.url,      // ✅ URL từ server
    desc: pDesc.value.trim(),
    stock: +pStock.value
  };

  const res = await fetch("/api/market/product/add",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-uid": me.uid
    },
    body: JSON.stringify({ boothId, product })
  });

  const data = await res.json();
  if(!data.ok){
    alert("❌ Không thể đăng sản phẩm");
    return;
  }

  editingProductId = null;
  closeAddProduct();
  loadBooth();
}



function closeAddProduct(){
  document.getElementById("addProductModal").classList.add("hidden");

  pName.value = "";
  pPrice.value = "";
  pDesc.value = "";
  pStock.value = "";
  pImageFile.value = "";
  pImagePreview.style.display = "none";
}



async function guardBoothAccess() {
  const params = new URLSearchParams(location.search);
  const boothId = params.get("booth");
  if (!boothId) return;

  const me = JSON.parse(localStorage.getItem("user_profile"));
  const uid = me?.uid;

  const res = await fetch(`/api/market/booth/${boothId}`, {
    headers: uid ? { "x-uid": uid } : {}
  });

  const data = await res.json();

  if (!data.ok) {
    document.body.innerHTML = `
      <div style="
        height:100vh;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        background:#000;
        color:#fff;
        text-align:center;
      ">
        <h2>🚫 Gian hàng đang bị khoá</h2>
        <p>${data.message || "Vui lòng liên hệ Admin"}</p>
        <button onclick="location.href='/market.html'"
          style="
            margin-top:16px;
            padding:10px 18px;
            border-radius:999px;
            border:none;
            background:#25F09A;
            font-weight:900;
            cursor:pointer;
          ">
          ⬅ Quay lại Market
        </button>
      </div>
    `;
    return;
  }

  // ✅ OK → tiếp tục load booth bình thường
}

guardBoothAccess();


if (socket) {
  socket.on("booth-force-locked", ({ boothId }) => {
    const cur = new URLSearchParams(location.search).get("booth");
    if (String(cur) === String(boothId)) {
      alert("🚫 Gian hàng đã bị Admin khoá");
      location.href = "/market.html";
    }
  });
}



// 🔁 realtime update khi market thay đổi (debounce tránh reload dồn)
let reloadTimer;
if (socket) {
  socket.on("market-update", ({ boothId: bId }) => {
    if (String(bId) === String(boothId)) {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(loadBooth, 300);
    }
  });
}




function openEditProduct(productId){
  
  const booth = window.__lastBooth; // ta sẽ set ở loadBooth

  if (!window.__lastBooth || window.__lastBooth.locked) {
  alert("🚫 Gian hàng đang bị khoá");
  return;
}

  const p = booth.products.find(x => x.id === productId);
  if(!p) return;



  editingProductId = productId;

  productModalTitle.textContent = "✏️ Sửa sản phẩm";
  btnSubmitProduct.textContent = "Lưu thay đổi";

  pName.value = p.name;
  pPrice.value = p.price;
  pDesc.value = p.desc;
  pStock.value = p.stock;
  pImagePreview.src = p.image;
  pImagePreview.style.display = "block";

  document.getElementById("addProductModal").classList.remove("hidden");
}


const btnSubmitProduct = document.getElementById("btnSubmitProduct");
const productModalTitle = document.getElementById("productModalTitle");

if (btnSubmitProduct) {
  btnSubmitProduct.onclick = () => {
    if (editingProductId) submitEditProduct();
    else submitProduct();
  };
}



async function submitEditProduct(){
  const me = JSON.parse(localStorage.getItem("user_profile"));

  const product = {
    name: pName.value.trim(),
    price: +pPrice.value,
    desc: pDesc.value.trim(),
    stock: +pStock.value
  };

  const res = await fetch("/api/market/product/update",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-uid": me.uid
    },
    body: JSON.stringify({
      boothId,
      productId: editingProductId,
      product
    })
  });

  const data = await res.json();
  if(!data.ok){
    alert("❌ Không thể sửa sản phẩm");
    return;
  }

  editingProductId = null;
  closeAddProduct();
  loadBooth();
}



async function deleteProduct(productId){
  if(!confirm("🗑️ Xoá sản phẩm này?")) return;

  const me = JSON.parse(localStorage.getItem("user_profile"));

  const res = await fetch("/api/market/product/delete",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-uid": me.uid
    },
    body: JSON.stringify({ boothId, productId })
  });

  const data = await res.json();
  if(!data.ok){
    alert("❌ Không thể xoá");
    return;
  }

  loadBooth();
}


async function buyProduct(productId){

  const booth = window.__lastBooth;
const p = booth?.products?.find(x => x.id === productId);
if (p && p.stock <= 0) {
  alert("📦 Sản phẩm đã hết hàng");
  return;
}


  const me = JSON.parse(localStorage.getItem("user_profile"));
  if(!me?.uid){
    alert("🔐 Vui lòng đăng nhập để mua");
    return;
  }

  if(!confirm("🛒 Xác nhận mua sản phẩm này?")) return;

  const res = await fetch("/api/market/product/buy",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-uid": me.uid
    },
    body: JSON.stringify({
      boothId,
      productId
    })
  });

  const data = await res.json();

  if(!data.ok){
    if(data.error==="not_enough_coin")
      return alert("❌ Không đủ kim cương");
    if(data.error==="out_of_stock")
      return alert("📦 Sản phẩm đã hết hàng");
    return alert("❌ Mua thất bại");
  }

  alert("✅ Mua thành công!");
  syncMyCoin();
  loadBooth();
}



async function syncMyCoin(){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  if(!me?.uid) return;

  const res = await fetch("/api/me/coin", {
    headers: { "x-uid": me.uid }
  });
  const data = await res.json();
  if(!data.ok) return;

  me.coins = data.coins;
  localStorage.setItem("user_profile", JSON.stringify(me));
}
