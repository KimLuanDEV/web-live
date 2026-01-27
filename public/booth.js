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

const buyName = document.getElementById("buyName");
const buyPhone = document.getElementById("buyPhone");
const buyAddress = document.getElementById("buyAddress");
const buyQty = document.getElementById("buyQty");
const buyNote = document.getElementById("buyNote");


let editingProductId = null;
let buyingProductId = null;

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

  <div
  class="product-stock"
  style="
    margin-top:4px;
    font-size:13px;
    font-weight:700;
    color:${p.stock <= 0 ? '#ff5f6d' : '#25F09A'};
  "
>
  ${p.stock <= 0 ? "📦 Hết hàng" : `📦 Còn ${p.stock} sản phẩm`}
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

    // render products
    renderProducts(booth.products || []);

    const me = JSON.parse(localStorage.getItem("user_profile"));
    const isOwner = me && me.uid === booth.ownerUid;

    /* =========================
       CHỦ GIAN
    ========================= */
    if(isOwner){
      // hiện nút
      btnExtend?.classList.remove("hidden");
      btnAddProduct?.classList.remove("hidden");

      // 👉 HIỆN TAB ĐƠN HÀNG
      document.getElementById("tabOrders")?.classList.remove("hidden");

      // 👉 RENDER ĐƠN HÀNG
      renderOrders(booth.orders || []);

      // expire info
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

    /* =========================
       KHÁCH / NGƯỜI MUA
    ========================= */
    else{
      // ẩn tab đơn hàng nếu không phải chủ
      document.getElementById("tabOrders")?.classList.add("hidden");
    }

  }catch(e){
    console.error("loadBooth error", e);
  }


  document.querySelector('[data-tab="products"]')?.click();

}


loadBooth();
syncMyCoin();


/* ===== ACTIONS ===== */
btnBack.onclick = ()=> history.back();

btnAddProduct.onclick = ()=>{
  const me = JSON.parse(localStorage.getItem("user_profile"));
  if(!me?.uid){
    showModal({
  title: "🔐 Yêu cầu đăng nhập",
  message: "Vui lòng đăng nhập để tiếp tục."
});

    return;
  }
  if(me.uid !== currentBoothOwnerUid){
    showModal({
  title: "⛔ Truy cập bị từ chối",
  message: "Bạn không phải chủ của gian hàng này."
});

    return;
  }
  document.getElementById("addProductModal").classList.remove("hidden");
};




/* ===== GIA HẠN ===== */
btnExtend?.addEventListener("click", ()=>{
  openExtendModalInBooth();
});

function openExtendModalInBooth(){
  showModal({
    title: "⏳ Gia hạn gian hàng",
    message: `
      <div style="display:flex;flex-direction:column;gap:10px">
        <button onclick="confirmExtendBooth(7,1000)">7 ngày – 1,000 💎</button>
        <button onclick="confirmExtendBooth(30,3500)">30 ngày – 3,500 💎</button>
        <button onclick="confirmExtendBooth(90,9000)">90 ngày – 9,000 💎</button>
      </div>
    `
  });
}


async function confirmExtendBooth(days, price){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  if(!me || !me.uid){
    showModal({
  title: "🔐 Yêu cầu đăng nhập",
  message: "Vui lòng đăng nhập để tiếp tục."
});

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
      
     if(data.error==="not_enough_coin"){
  showModal({
    title:"❌ Không đủ kim cương",
    message:"Số dư kim cương của bạn không đủ."
  });
  return;
}

      showModal({
  title:"❌ Gia hạn thất bại",
  message:"Không thể gia hạn gian hàng, vui lòng thử lại."
});

    }

   showModal({
  title:"✅ Thành công",
  message:"Gia hạn gian hàng thành công!"
});

    syncMyCoin();
    loadBooth();

  }catch(e){
    showModal({
  title:"⚠️ Lỗi kết nối",
  message:"Không thể kết nối máy chủ, vui lòng thử lại."
});

  }
}


async function submitProduct(){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  if(!me?.uid){
    showModal({
  title: "🔐 Yêu cầu đăng nhập",
  message: "Vui lòng đăng nhập để tiếp tục."
});

    return;
  }

  const file = pImageFile.files[0];
  if(!file){
    showModal({
  title:"🖼️ Thiếu ảnh",
  message:"Vui lòng chọn ảnh cho sản phẩm."
});

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
   showModal({
  title:"❌ Upload thất bại",
  message:"Không thể tải ảnh lên, vui lòng thử lại."
});

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
    showModal({
  title:"❌ Thất bại",
  message:"Không thể đăng sản phẩm."
});

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
      showModal({
  title: "🚫 Gian hàng bị khoá",
  message: "Gian hàng này đã bị Admin khoá.",
  onOk: () => location.href = "/market.html"
});

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
  showModal({
  title:"🚫 Gian hàng bị khoá",
  message:"Gian hàng hiện đang bị khoá, không thể chỉnh sửa sản phẩm."
});

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
 showModal({
  title:"❌ Thất bại",
  message:"Không thể sửa sản phẩm."
});

    return;
  }

  editingProductId = null;
  closeAddProduct();
  loadBooth();
}


async function deleteProductConfirmed(productId) {
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
    showModal({
      title:"❌ Thất bại",
      message:"Không thể xoá sản phẩm"
    });
    return;
  }
  loadBooth();
}


async function deleteProduct(productId){
  showModal({
  title: "🗑️ Xoá sản phẩm",
  message: "Bạn có chắc chắn muốn xoá sản phẩm này?",
  confirm: true,
  onOk: () => deleteProductConfirmed(productId)
});
return;
}



function buyProduct(productId){

  if(!window.__lastBooth) return;

    if (window.__lastBooth?.locked) {
  showModal({
    title:"🚫 Gian hàng bị khoá",
    message:"Không thể mua lúc này."
  });
  return;
}

  const booth = window.__lastBooth;
  const p = booth?.products?.find(x => x.id === productId);

  if (!p || p.stock <= 0) {
    showModal({
      title:"📦 Hết hàng",
      message:"Sản phẩm đã hết hàng."
    });
    return;
  }

  const me = JSON.parse(localStorage.getItem("user_profile"));
  if(!me?.uid){
    showModal({
      title:"🔐 Chưa đăng nhập",
      message:"Vui lòng đăng nhập để mua."
    });
    return;
  }

  buyingProductId = productId;
  document.getElementById("buyFormModal").classList.remove("hidden");

  if (me?.name) buyName.value = me.name;
if (me?.phone) buyPhone.value = me.phone;

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



function showModal({
  title = "Thông báo",
  message = "",
  confirm = false,
  onOk = null,
  onCancel = null
}) {
  const modal = document.getElementById("globalModal");
  const titleEl = document.getElementById("globalModalTitle");
  const contentEl = document.getElementById("globalModalContent");
  const okBtn = document.getElementById("globalOkBtn");
  const cancelBtn = document.getElementById("globalCancelBtn");

  titleEl.textContent = title;
  contentEl.innerHTML = message;

  cancelBtn.style.display = confirm ? "block" : "none";

  okBtn.onclick = () => {
    closeGlobalModal();
    onOk && onOk();
  };

  cancelBtn.onclick = () => {
    closeGlobalModal();
    onCancel && onCancel();
  };

  modal.classList.remove("hidden");
}

function closeGlobalModal() {
  document.getElementById("globalModal").classList.add("hidden");
}



function closeBuyForm(){
  document.getElementById("buyFormModal").classList.add("hidden");
}

async function submitBuyForm(){
  const me = JSON.parse(localStorage.getItem("user_profile"));

  const info = {
    name: buyName.value.trim(),
    phone: buyPhone.value.trim(),
    address: buyAddress.value.trim(),
    qty: Math.max(1, Number(buyQty.value) || 1),

    note: buyNote.value.trim()
  };

  if(!info.name || !info.phone || !info.address || info.qty <= 0){
    showModal({
      title:"⚠️ Thiếu thông tin",
      message:"Vui lòng điền đầy đủ thông tin mua hàng."
    });
    return;
  }

  const res = await fetch("/api/market/product/buy",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-uid": me.uid
    },
    body: JSON.stringify({
      boothId,
      productId: buyingProductId,
      buyerInfo: info
    })
  });

  const data = await res.json();
  if(!data.ok){
    showModal({
      title:"❌ Thất bại",
      message:"Không thể mua sản phẩm."
    });
    return;
  }

  closeBuyForm();

buyName.value = "";
buyPhone.value = "";
buyAddress.value = "";
buyQty.value = 1;
buyNote.value = "";


  showModal({
    title:"✅ Đặt hàng thành công",
    message:"Shop sẽ liên hệ với bạn sớm nhất."
  });

  syncMyCoin();
  loadBooth();
}



document.querySelectorAll(".booth-tabs .tab").forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll(".booth-tabs .tab")
      .forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;

    document.getElementById("productList").style.display =
      tab === "products" ? "block" : "none";

    document.getElementById("orderSection").classList.toggle(
      "hidden", tab !== "orders"
    );

    // 👉 FIX: ẩn emptyText khi xem đơn hàng
    document.getElementById("emptyText").style.display =
      tab === "products" ? "block" : "none";
  };
});



function renderOrders(orders){
  const list = document.getElementById("orderList");
  const empty = document.getElementById("orderEmpty");

  if(!orders || orders.length === 0){
    empty.classList.remove("hidden");
    list.innerHTML = "";
    return;
  }

  empty.classList.add("hidden");
  list.innerHTML = "";

  orders.forEach(o=>{
    const div = document.createElement("div");
    div.className = "order-card";

    div.innerHTML = `
      <div class="order-title">
        🛒 ${o.productName} × ${o.qty}
      </div>

      <div class="order-meta">
        💎 ${o.totalPrice.toLocaleString()} ·
        🕒 ${new Date(o.createdAt).toLocaleString("vi-VN")}
      </div>

      <div class="order-buyer">
        👤 <b>${o.buyerInfo.name}</b><br>
        📞 ${o.buyerInfo.phone}<br>
        📍 ${o.buyerInfo.address || "—"}<br>
        📝 ${o.buyerInfo.note || "—"}
      </div>

      <div class="order-actions">
      <button onclick="markOrder('${o.id}','contacted')"> 
          📞 Đã liên hệ
        </button>
        <button onclick="markOrder('${o.id}','done')" style="color:#25F09A">
          ✅ Hoàn tất
        </button>
      </div>
    `;

    list.appendChild(div);
  });
}




function markOrder(orderId, status){
  showModal({
    title: "ℹ️ Thông báo",
    message: "Chức năng cập nhật trạng thái đơn sẽ được mở sau."
  });
}
