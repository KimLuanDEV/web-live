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
const pGalleryPreview = document.getElementById("pGalleryPreview");

const buyName = document.getElementById("buyName");
const buyPhone = document.getElementById("buyPhone");
const buyAddress = document.getElementById("buyAddress");
const buyQty = document.getElementById("buyQty");
const buyNote = document.getElementById("buyNote");

let editingImages = [];
let isSubmittingProduct = false;
let editingProductId = null;
let buyingProductId = null;
let currentProductPage = 1;
const PRODUCTS_PER_PAGE = 4;


if (pImageFile) {

pImageFile.onchange = () => {
  const files = Array.from(pImageFile.files);
  if (!files.length) return;

  // 👉 ADD MODE
  if (!editingProductId) {
    pGalleryPreview.innerHTML = "";
    pImagePreview.style.display = "none";

    files.forEach(file=>{
      const reader = new FileReader();
      reader.onload = e=>{
        const img = document.createElement("img");
        img.src = e.target.result;
        img.style.width = "100%";
        img.style.aspectRatio = "1/1";
        img.style.objectFit = "cover";
        img.style.borderRadius = "6px";
        pGalleryPreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });

    return;
  }

  // 👉 EDIT MODE: CHỈ PREVIEW ẢNH MỚI, KHÔNG XOÁ ẢNH CŨ
  files.forEach(file=>{
    const reader = new FileReader();
    reader.onload = e=>{
      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.width = "100%";
      img.style.aspectRatio = "1/1";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";
      img.style.opacity = ".6"; // phân biệt ảnh mới
      pGalleryPreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
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


function escapeBoothHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]
  );
}




/* ==========================================
   LUXURY PRODUCT CARD RENDER
========================================== */

function renderProducts(products) {

  const list = document.getElementById("productList");
  const empty = document.getElementById("emptyText");
  const pager = document.getElementById("productPagination");

  if (!list || !empty || !pager) return;

  const me = JSON.parse(
    localStorage.getItem("user_profile") || "{}"
  );

  const isOwner = me.uid === currentBoothOwnerUid;

  // Không có sản phẩm
  if (!Array.isArray(products) || products.length === 0) {
    empty.classList.remove("hidden");
    list.innerHTML = "";
    pager.innerHTML = "";
    pager.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");

  // Giữ 4 sản phẩm mỗi trang
  const totalPages = Math.ceil(
    products.length / PRODUCTS_PER_PAGE
  );

  if (currentProductPage > totalPages) {
    currentProductPage = 1;
  }

  const start = (currentProductPage - 1) * PRODUCTS_PER_PAGE;
  const pageItems = products.slice(
    start,
    start + PRODUCTS_PER_PAGE
  );

  list.innerHTML = "";

  pageItems.forEach(p => {

    const images = (
      Array.isArray(p.images) && p.images.length
        ? p.images
        : [p.image]
    ).filter(Boolean);

    const stock = Number(p.stock) || 0;
    const price = Number(p.price) || 0;
    const out = stock <= 0;

    const div = document.createElement("article");
    div.className = "product-card";

    div.innerHTML = `
      <!-- IMAGE -->
      <div class="product-photo-frame">

        ${images.length ? `
          <img
            class="product-photo"
            alt="${escapeBoothHtml(p.name || "Sản phẩm")}"
            loading="lazy"
          >
        ` : `
          <span class="product-photo-placeholder">
            LIVESTREAM PRO
          </span>
        `}

      </div>

      <!-- INFORMATION -->
      <div class="product-content">

        <div class="product-name">
          ${escapeBoothHtml(p.name || "Sản phẩm")}
        </div>

        <div class="product-price">
          ${price.toLocaleString("vi-VN")}
          <small>kim cương</small>
        </div>

        <p class="product-description">
          ${escapeBoothHtml(p.desc || "Chưa có mô tả.")}
        </p>

        <div class="product-stock ${out ? "out" : "in"}">
          ${out
            ? "Hết hàng"
            : `Còn ${stock.toLocaleString("vi-VN")} sản phẩm`
          }
        </div>

        ${isOwner ? `
          <div class="product-controls">

            <button type="button"
                    class="product-edit">
              Chỉnh sửa
            </button>

            <button type="button"
                    class="product-delete">
              Xóa
            </button>

          </div>
        ` : `
          <button type="button"
                  class="product-buy"
                  ${out ? "disabled" : ""}>
            ${out ? "Hết hàng" : "Mua ngay"}
          </button>
        `}

      </div>
    `;

    // Thư viện ảnh
    const photo = div.querySelector(".product-photo");

    if (photo && images.length) {
      photo.src = images[0];
      photo.addEventListener("click", () => {
        openGallery(images, 0);
      });
    }

    // Chức năng chủ gian hàng
    if (isOwner) {
      div.querySelector(".product-edit")
        ?.addEventListener("click", () => {
          openEditProduct(p.id);
        });

      div.querySelector(".product-delete")
        ?.addEventListener("click", () => {
          deleteProduct(p.id);
        });
    }

    // Chức năng mua hàng
    else {
      div.querySelector(".product-buy")
        ?.addEventListener("click", () => {
          if (!out) buyProduct(p.id);
        });
    }

    list.appendChild(div);
  });

  // PHÂN TRANG
  pager.innerHTML = "";

  if (totalPages <= 1) {
    pager.classList.add("hidden");
    return;
  }

  pager.classList.remove("hidden");

  for (let i = 1; i <= totalPages; i++) {

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = i;

    if (i === currentProductPage) {
      btn.classList.add("active");
    }

    btn.onclick = () => {
      currentProductPage = i;
      renderProducts(products);

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    };

    pager.appendChild(btn);
  }

}



async function loadBooth(){
  try{
    const me = JSON.parse(localStorage.getItem("user_profile"));
    const headers = me?.uid ? { "x-uid": me.uid } : {};

    // ✅ LOAD ĐÚNG API + CHỐNG CACHE
    const res = await fetch(
      `/api/market/booth/${boothId}?t=${Date.now()}`,
      { headers }
    );
    const data = await res.json();
    if(!data.ok) return;

    const booth = data.booth;
    if(!booth) return;

    // =========================
    // CACHE MỚI
    // =========================
    window.__lastBooth = booth;
    currentBoothOwnerUid = booth.ownerUid;

    // =========================
    // INFO
    // =========================
    boothNameEl.textContent = booth.name;
    boothLogoEl.src = booth.logo;

    // =========================
    // PRODUCTS
    // =========================
    renderProducts(booth.products || []);

    const isOwner = me && me.uid === booth.ownerUid;

    // 🔐 Chưa đăng nhập → ẩn tab "Đơn của tôi"
    if(!me?.uid){
      document.getElementById("tabMyOrders")?.classList.add("hidden");
    }

    /* =========================
       CHỦ GIAN
    ========================= */
    if(isOwner){
      btnExtend?.classList.remove("hidden");
      btnAddProduct?.classList.remove("hidden");

      // 👉 TAB ĐƠN HÀNG (CHỦ SHOP)
      document.getElementById("tabOrders")?.classList.remove("hidden");

      // 👉 RENDER ĐƠN HÀNG
      renderOrders(booth.orders || []);

      // expire info
      if(booth.expireAt){
        const daysLeft = diffDays(booth.expireAt);
        expireBox.classList.remove("hidden");


if (daysLeft <= 1) {

  expireBox.className = "booth-expire danger";

  expireBox.innerHTML = `
    Gian hàng hết hạn <b>hôm nay</b>.
    <div>Ngày hết hạn: ${formatDate(booth.expireAt)}</div>
  `;

} else if (daysLeft <= 3) {

  expireBox.className = "booth-expire warn";

  expireBox.innerHTML = `
    Gian hàng sắp hết hạn.
    <div>
      Ngày hết hạn: ${formatDate(booth.expireAt)}
      — còn ${daysLeft} ngày
    </div>
  `;

} else {

  expireBox.className = "booth-expire";

  expireBox.innerHTML = `
    Ngày hết hạn: ${formatDate(booth.expireAt)}
    — còn ${daysLeft} ngày
  `;

}

      }
    }

    /* =========================
       NGƯỜI MUA
    ========================= */
    else{
      document.getElementById("tabOrders")?.classList.add("hidden");

      // 👉 TAB ĐƠN CỦA TÔI
      document.getElementById("tabMyOrders")?.classList.remove("hidden");
      renderMyOrders(booth.orders || []);
    }

    // mặc định mở tab sản phẩm
    document.querySelector('[data-tab="products"]')?.click();

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

  // ✅ RESET MODE
  editingProductId = null;
  editingImages = [];
  pGalleryPreview.innerHTML = "";

  productModalTitle.textContent = "Thêm sản phẩm";
  btnSubmitProduct.textContent = "Đăng bán";

  // reset form
  pName.value = "";
  pPrice.value = "";
  pDesc.value = "";
  pStock.value = "";
  pImageFile.value = "";
  pImagePreview.style.display = "none";

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
  if(isSubmittingProduct) return;
  setProductSubmitting(true);

  const me = JSON.parse(localStorage.getItem("user_profile"));

  if(!me?.uid){
    showModal({
      title:"🔐 Yêu cầu đăng nhập",
      message:"Vui lòng đăng nhập để tiếp tục."
    });
    setProductSubmitting(false);
    return;
  }

  const files = Array.from(pImageFile.files);
  if(files.length === 0){
    showModal({
      title:"🖼️ Thiếu ảnh",
      message:"Vui lòng chọn ít nhất 1 ảnh cho sản phẩm."
    });
    setProductSubmitting(false);
    return;
  }

  const wrap = document.getElementById("uploadProgressWrap");
  const bar  = document.getElementById("uploadProgressBar");
  const text = document.getElementById("uploadProgressText");

  if(wrap){
    wrap.classList.remove("hidden");
    if(bar) bar.style.width = "0%";
    if(text) text.textContent = `⏳ Đang tải ảnh 1/${files.length}... 0%`;
  }

  const imageUrls = [];

  try{
    for(let i = 0; i < files.length; i++){
      const form = new FormData();
      form.append("image", files[i]);

      if(text) text.textContent = `⏳ Đang tải ảnh ${i+1}/${files.length}... 0%`;
      if(bar) bar.style.width = "0%";

      const upData = await new Promise((resolve, reject)=>{
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload-product-image");
        xhr.setRequestHeader("x-uid", me.uid);

        xhr.upload.onprogress = e=>{
          if(e.lengthComputable){
            const percent = Math.round((e.loaded / e.total) * 100);
            if(bar) bar.style.width = percent + "%";
            if(text) text.textContent =
              `⏳ Đang tải ảnh ${i+1}/${files.length}... ${percent}%`;
          }
        };

        xhr.onload = ()=>{
          try{
            resolve(JSON.parse(xhr.responseText));
          }catch(e){
            reject(e);
          }
        };

        xhr.onerror = reject;
        xhr.send(form);
      });

      if(!upData?.url) throw new Error("upload_failed");
      imageUrls.push(upData.url);
    }
  }catch(err){
    showModal({
      title:"❌ Upload thất bại",
      message:"Không thể tải ảnh lên, vui lòng thử lại."
    });
    setProductSubmitting(false);
    resetUploadProgress();
    return;
  }

  const product = {
    name: pName.value.trim(),
    price: +pPrice.value,
    images: imageUrls,
    image: imageUrls[0],
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

  if(!res.ok){
    showModal({
      title:"❌ Thất bại",
      message:"Không thể đăng sản phẩm."
    });
    setProductSubmitting(false);
    resetUploadProgress();
    return;
  }

  editingProductId = null;
  setProductSubmitting(false);
  resetUploadProgress();
  closeAddProduct();
  loadBooth();
}






function closeAddProduct(){
  setProductSubmitting(false); // 🔥 reset an toàn
  resetUploadProgress();
  document.getElementById("addProductModal").classList.add("hidden");

  // ✅ RESET STATE
  editingProductId = null;
  productModalTitle.textContent = "Thêm sản phẩm";
  btnSubmitProduct.textContent = "Đăng bán";

  // reset form
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



// =========================
// 🔄 REALTIME ORDER (KHÔNG RELOAD)
// =========================
if (socket) {
  socket.on("order-updated", ({ boothId: bId, order }) => {
    if (String(bId) !== String(boothId)) return;

    const booth = window.__lastBooth;
    if (!booth) return;

    if (!Array.isArray(booth.orders)) booth.orders = [];

    const idx = booth.orders.findIndex(o => o.id === order.id);

    if (idx !== -1) {
      // 🔁 update order tại chỗ
      booth.orders[idx] = order;
    } else {
      // ➕ order mới
      booth.orders.unshift(order);
    }

    // 🔥 render lại UI – KHÔNG loadBooth
    renderOrders(booth.orders);
    renderMyOrders(booth.orders);
  });
}



function openEditProduct(productId){
  const booth = window.__lastBooth;

  if (!booth || booth.locked) {
    showModal({
      title:"🚫 Gian hàng bị khoá",
      message:"Gian hàng hiện đang bị khoá, không thể chỉnh sửa sản phẩm."
    });
    return;
  }

  const p = booth.products.find(x => x.id === productId);
  if(!p) return;

  editingProductId = productId;

  productModalTitle.textContent = "Chỉnh sửa sản phẩm";
  btnSubmitProduct.textContent = "Lưu thay đổi";

  pName.value  = p.name;
  pPrice.value = p.price;
  pDesc.value  = p.desc;
  pStock.value = p.stock;

  // 🔥 SET ẢNH EDIT
  editingImages = [...(p.images || [p.image])];

  // reset input file
  pImageFile.value = "";
  pImagePreview.style.display = "none";
  pGalleryPreview.innerHTML = "";

  renderEditGallery();

  document.getElementById("addProductModal").classList.remove("hidden");
}


function renderEditGallery(){
  pGalleryPreview.innerHTML = "";

  editingImages.forEach((url, index)=>{
    const wrap = document.createElement("div");
    wrap.style.position = "relative";

    const img = document.createElement("img");
    img.src = url;
    img.style.width = "100%";
    img.style.aspectRatio = "1/1";
    img.style.objectFit = "cover";
    img.style.borderRadius = "6px";

    const del = document.createElement("button");
    del.textContent = "✕";
    del.style.position = "absolute";
    del.style.top = "6px";
    del.style.right = "6px";
    del.style.width = "22px";
    del.style.height = "22px";
    del.style.borderRadius = "50%";
    del.style.border = "none";
    del.style.background = "rgba(0,0,0,.6)";
    del.style.color = "#fff";
    del.style.cursor = "pointer";

    del.onclick = ()=>{
      editingImages.splice(index, 1);
      renderEditGallery();
    };

    wrap.appendChild(img);
    wrap.appendChild(del);
    pGalleryPreview.appendChild(wrap);
  });
}



const btnSubmitProduct = document.getElementById("btnSubmitProduct");
const productModalTitle = document.getElementById("productModalTitle");

if (btnSubmitProduct) {

btnSubmitProduct.onclick = () => {
  if(isSubmittingProduct) return; // 🚫 chặn double click

  if (editingProductId) submitEditProduct();
  else submitProduct();
};


}



async function submitEditProduct(){
  if(isSubmittingProduct) return;
  setProductSubmitting(true);

  const me = JSON.parse(localStorage.getItem("user_profile"));
  const booth = window.__lastBooth;
  const oldProduct = booth.products.find(p => p.id === editingProductId);

  let images = [...editingImages]; // 🔥 lấy từ state đã xoá


  // 👉 upload ảnh mới nếu có
  const files = Array.from(pImageFile.files || []);
  for(const file of files){
    const form = new FormData();
    form.append("image", file);

    const upData = await new Promise((resolve, reject)=>{
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload-product-image");
      xhr.setRequestHeader("x-uid", me.uid);
      xhr.onload = ()=> resolve(JSON.parse(xhr.responseText));
      xhr.onerror = reject;
      xhr.send(form);
    });

    if(upData?.url) images.push(upData.url);
  }

  const product = {
    name: pName.value.trim(),
    price: +pPrice.value,
    desc: pDesc.value.trim(),
    stock: +pStock.value,
    images,          // 🔥 gửi full gallery
    image: images[0]
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
    setProductSubmitting(false);
    return;
  }

  editingProductId = null;
  setProductSubmitting(false);
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




document.querySelectorAll(".booth-tabs .tab")
  .forEach(btn => {

    btn.onclick = () => {

      document.querySelectorAll(".booth-tabs .tab")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");

      const tab = btn.dataset.tab;
      const isProducts = tab === "products";

      document.getElementById("productList").style.display =
        isProducts ? "grid" : "none";

      // Chỉ hiển thị phân trang ở tab sản phẩm
      document.getElementById("productPagination").style.display =
        isProducts ? "" : "none";

      document.getElementById("orderSection")
        .classList.toggle("hidden", tab !== "orders");

      document.getElementById("myOrderSection")
        .classList.toggle("hidden", tab !== "myOrders");

      const empty = document.getElementById("emptyText");
      empty.style.display = isProducts ? "" : "none";

    };

  });




/* ==========================================
   LUXURY ORDER HISTORY
========================================== */

function createLuxuryOrderCard(o, isSeller) {

  const statusLabels = {
    pending: "Đang chờ xử lý",
    contacted: "Đã liên hệ",
    buyer_received: "Người mua đã nhận hàng",
    dispute: "Đang khiếu nại",
    done: "Hoàn tất",
    refunded: "Đã hoàn tiền",
    cancelled: "Đã hủy"
  };

  const status = String(o.status || "");
  const statusClass = status.replace(/[^a-z_-]/g, "");
  const amount = Number(o.totalPrice) || 0;
  const quantity = Number(o.qty) || 0;
  const buyer = o.buyerInfo || {};

  const card = document.createElement("article");

  card.className = isSeller
    ? "order-card"
    : "my-order-card";

  card.innerHTML = `
    <div class="${isSeller ? "order-top" : "my-order-top"}">

      <div>
        ${escapeBoothHtml(o.productName || "Sản phẩm")}
        <span class="qty">
          × ${quantity}
        </span>
      </div>

      <div class="${isSeller ? "order-price" : "my-order-price"}">
        ${amount.toLocaleString("vi-VN")}
        <small>kim cương</small>
      </div>

    </div>

    <div class="${isSeller ? "order-meta" : "my-order-meta"}">
      ${new Date(o.createdAt).toLocaleString("vi-VN")}
    </div>

    ${isSeller ? `
      <div class="order-buyer">

        <div>
          <b>Người mua:</b>
          ${escapeBoothHtml(buyer.name || "—")}
        </div>

        <div>
          <b>Điện thoại:</b>
          ${escapeBoothHtml(buyer.phone || "—")}
        </div>

        <div>
          <b>Địa chỉ:</b>
          ${escapeBoothHtml(buyer.address || "—")}
        </div>

        ${buyer.note ? `
          <div>
            <b>Ghi chú:</b>
            ${escapeBoothHtml(buyer.note)}
          </div>
        ` : ""}

      </div>
    ` : ""}

    <div class="${isSeller ? "order-status" : "my-order-status"} ${statusClass}">
      ${statusLabels[status] || "Đang xử lý"}
    </div>

    ${status === "done" && o.adminApproved ? `
      <div class="order-admin-note">
        Đơn hàng đã được Admin xử lý hoàn tất.
      </div>
    ` : ""}

    ${status === "refunded" ? `
      <div class="order-admin-note">
        Đơn hàng đã được xử lý hoàn tiền.
      </div>
    ` : ""}

    <div class="order-actions"></div>
  `;

  const actions = card.querySelector(".order-actions");

  function addButton(label, callback) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", callback);
    actions.appendChild(button);
  }

  function addNote(message) {
    const note = document.createElement("span");
    note.className = "order-action-note";
    note.textContent = message;
    actions.appendChild(note);
  }

  // NGƯỜI BÁN
  if (isSeller) {

    if (status === "pending") {
      addButton("Đã liên hệ", () => contactOrder(o.id));
    }

    if (status === "buyer_received") {
      addButton("Xác nhận hoàn tất", () => completeOrder(o.id));
    }

    if (status === "contacted") {
      addNote("Chờ người mua xác nhận");
    }

    if (
      status === "cancelled" ||
      status === "refunded" ||
      (status === "done" && o.adminApproved)
    ) {
      addButton("Xóa lịch sử", () => hideOrder(o.id, "seller"));
    } else {
      addNote("Chỉ xóa sau khi Admin xử lý");
    }

  }

  // NGƯỜI MUA
  else {

    if (status === "pending") {
      addButton("Hủy đơn", () => cancelMyOrder(o.id));
    }

    if (status === "contacted") {
      addButton("Đã nhận hàng", () => markOrderReceived(o.id));
    }

    if (["contacted", "buyer_received"].includes(status)) {
      addButton("Khiếu nại / Hoàn tiền", () => openDispute(o.id));
    }

    if (["done", "cancelled", "refunded"].includes(status)) {
      addButton("Xóa lịch sử", () => hideOrder(o.id, "buyer"));
    }

  }

  if (!actions.children.length) {
    actions.remove();
  }

  return card;
}


/* ==========================================
   ĐƠN HÀNG NGƯỜI MUA
========================================== */

function renderMyOrders(orders) {

  const list = document.getElementById("myOrderList");
  const empty = document.getElementById("myOrderEmpty");

  if (!list || !empty) return;

  const me = JSON.parse(
    localStorage.getItem("user_profile") || "{}"
  );

  if (!me.uid) {
    empty.classList.remove("hidden");
    empty.textContent = "Vui lòng đăng nhập để xem đơn hàng.";
    list.innerHTML = "";
    return;
  }

  const myOrders = (orders || []).filter(o =>
    o.buyerUid === me.uid && !o.hiddenByBuyer
  );

  if (!myOrders.length) {
    empty.classList.remove("hidden");
    list.innerHTML = "";
    return;
  }

  empty.classList.add("hidden");
  list.className = "my-order-list";
  list.innerHTML = "";

  myOrders.forEach(o => {
    list.appendChild(createLuxuryOrderCard(o, false));
  });
}


/* ==========================================
   ĐƠN HÀNG NGƯỜI BÁN
========================================== */

function renderOrders(orders) {

  const list = document.getElementById("orderList");
  const empty = document.getElementById("orderEmpty");

  if (!list || !empty) return;

  const sellerOrders = (orders || []).filter(
    o => !o.hiddenBySeller
  );

  if (!sellerOrders.length) {
    empty.classList.remove("hidden");
    list.innerHTML = "";
    return;
  }

  empty.classList.add("hidden");
  list.innerHTML = "";

  sellerOrders.forEach(o => {
    list.appendChild(createLuxuryOrderCard(o, true));
  });
}




function markOrder(orderId, status){
  showModal({
    title: "ℹ️ Thông báo",
    message: "Chức năng cập nhật trạng thái đơn sẽ được mở sau."
  });
}



// 👉 click nền để đóng bottom-sheet thêm sản phẩm
const addModal = document.getElementById("addProductModal");
if(addModal){
  addModal.addEventListener("click", e=>{
    if(e.target === addModal){
      closeAddProduct();
    }
  });
}



function setProductSubmitting(loading){
  isSubmittingProduct = loading;

  if(!btnSubmitProduct) return;

  if(loading){
    btnSubmitProduct.disabled = true;
    btnSubmitProduct.dataset._text =
      btnSubmitProduct.textContent;
    btnSubmitProduct.textContent = "Đang xử lý...";
    btnSubmitProduct.style.opacity = ".6";
  }else{
    btnSubmitProduct.disabled = false;
    btnSubmitProduct.textContent =
      btnSubmitProduct.dataset._text || "Đăng bán";
    btnSubmitProduct.style.opacity = "1";
  }
}


function resetUploadProgress(){
  const wrap = document.getElementById("uploadProgressWrap");
  const bar = document.getElementById("uploadProgressBar");
  const text = document.getElementById("uploadProgressText");

  if(!wrap) return;

  wrap.classList.add("hidden");
  bar.style.width = "0%";
  text.textContent = "⏳ Đang tải ảnh... 0%";
}



let galleryImages = [];
let galleryPos = 0;

function openGallery(images, startIndex = 0){
  if(!images || images.length === 0) return;

  galleryImages = [...images];

  galleryPos = Math.max(0, Math.min(startIndex, images.length - 1));


  document.getElementById("galleryModal").classList.remove("hidden");
  renderGallery();
}

function closeGallery(){
  document.getElementById("galleryModal").classList.add("hidden");
}

function renderGallery(){
  const img = document.getElementById("galleryImage");
  const idx = document.getElementById("galleryIndex");
  const thumbs = document.getElementById("galleryThumbs");

  img.src = galleryImages[galleryPos];
  idx.textContent = `${galleryPos + 1} / ${galleryImages.length}`;

  // render thumbnails
  if(thumbs){
    thumbs.innerHTML = "";

    galleryImages.forEach((url, i)=>{
      const t = document.createElement("img");
      t.src = url;
      if(i === galleryPos) t.classList.add("active");

      t.onclick = ()=>{
        galleryPos = i;
        renderGallery();
      };

      thumbs.appendChild(t);
    });
  }
}


function nextGallery(){
  galleryPos = (galleryPos + 1) % galleryImages.length;
  renderGallery();
}

function prevGallery(){
  galleryPos =
    (galleryPos - 1 + galleryImages.length) % galleryImages.length;
  renderGallery();
}


const galleryImg = document.getElementById("galleryImage");
if(galleryImg){
  galleryImg.onclick = () => nextGallery();
}


let touchStartX = 0;
let touchEndX = 0;

function handleGallerySwipe(){
  const delta = touchEndX - touchStartX;

  // swipe tối thiểu 50px mới tính
  if(Math.abs(delta) < 50) return;

  if(delta < 0){
    // vuốt trái → ảnh tiếp
    nextGallery();
  }else{
    // vuốt phải → ảnh trước
    prevGallery();
  }
}

if(galleryImg){
  galleryImg.addEventListener("touchstart", e=>{
    touchStartX = e.changedTouches[0].screenX;
  }, { passive:true });

  galleryImg.addEventListener("touchend", e=>{
    touchEndX = e.changedTouches[0].screenX;
    handleGallerySwipe();
  });
}


function resetUploadProgress(){
  const wrap = document.getElementById("uploadProgressWrap");
  const bar  = document.getElementById("uploadProgressBar");
  const text = document.getElementById("uploadProgressText");

  if(wrap) wrap.classList.add("hidden");
  if(bar) bar.style.width = "0%";
  if(text) text.textContent = "";
}



if (socket) {
  socket.on("system-notify", data => {
    if (data.type === "market-order") {
      showModal({
        title: "🛒 Đơn hàng mới",
        message: data.text
      });

      // 🔔 reload booth để thấy đơn hàng mới
      loadBooth();
    }
  });
}




async function cancelMyOrder(orderId){
  showModal({
    title: "❌ Huỷ đơn hàng",
    message: "Bạn có chắc chắn muốn huỷ đơn hàng này không?<br><small style='opacity:.7'>Tiền sẽ được hoàn lại cho bạn.</small>",
    confirm: true,
    onOk: async ()=>{
      const me = JSON.parse(localStorage.getItem("user_profile"));
      if(!me?.uid) return;

      try{
        const res = await fetch("/api/market/order/cancel",{
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "x-uid": me.uid
          },
          body: JSON.stringify({ orderId })
        });

        const data = await res.json();

        if(!data.ok){
          showModal({
            title:"❌ Không thể huỷ",
            message: data.message || "Không thể huỷ đơn hàng."
          });
          return;
        }

        showModal({
          title:"✅ Đã huỷ đơn",
          message:"Đơn hàng đã được huỷ và hoàn tiền."
        });

        // ❌ KHÔNG cần loadBooth
        // socket order-updated sẽ tự update UI

      }catch(err){
        showModal({
          title:"❌ Lỗi",
          message:"Có lỗi xảy ra, vui lòng thử lại."
        });
      }
    }
  });
}




async function contactOrder(orderId){
  showModal({
    title: "📞 Xác nhận đơn hàng",
    message: "Bạn đã liên hệ với khách hàng cho đơn này?",
    confirm: true,          // ✅ BẮT BUỘC
    onOk: async ()=>{       // ✅ ĐÚNG TÊN CALLBACK
      const me = JSON.parse(localStorage.getItem("user_profile"));
      if(!me?.uid){
        showModal({
          title:"🔐 Yêu cầu đăng nhập",
          message:"Vui lòng đăng nhập để tiếp tục."
        });
        return;
      }

      try{
        const res = await fetch("/api/market/order/contact",{
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-uid": me.uid
          },
          body: JSON.stringify({ orderId })
        });

        const data = await res.json();

        if(!data.ok){
          showModal({
            title:"❌ Không thể xác nhận",
            message: data.message || "Thao tác thất bại."
          });
          return;
        }

        showModal({
          title:"✅ Thành công",
          message:"Đơn hàng đã chuyển sang trạng thái đã liên hệ."
        });

        
      }catch(err){
        showModal({
          title:"⚠️ Lỗi kết nối",
          message:"Không thể kết nối máy chủ."
        });
      }
    }
  });
}




async function completeOrder(orderId){
  showModal({
    title: "✅ Hoàn tất đơn hàng",
    message: "Xác nhận đơn hàng này đã giao dịch xong?",
    confirm: true,
    onOk: async ()=>{
      const me = JSON.parse(localStorage.getItem("user_profile"));
      if(!me?.uid){
        showModal({
          title:"🔐 Yêu cầu đăng nhập",
          message:"Vui lòng đăng nhập để tiếp tục."
        });
        return;
      }

      try{
        const res = await fetch("/api/market/order/done",{
          method: "POST",
          headers:{
            "Content-Type":"application/json",
            "x-uid": me.uid
          },
          body: JSON.stringify({ orderId })
        });

        const data = await res.json();
        if(!data.ok){
          showModal({
            title:"❌ Không thể hoàn tất",
            message: data.message || "Thao tác thất bại."
          });
          return;
        }

        showModal({
          title:"🎉 Thành công",
          message:"Đơn hàng đã được đánh dấu hoàn tất."
        });

        
      }catch(e){
        showModal({
          title:"⚠️ Lỗi kết nối",
          message:"Không thể kết nối máy chủ."
        });
      }
    }
  });
}


async function hideOrder(orderId, role){

  // 🔒 CHẶN TỪ FRONTEND:
  // chỉ cho xoá khi done hoặc cancelled
  const booth = window.__lastBooth;
  const o = booth?.orders?.find(x => x.id === orderId);

  if (!o) return;

// 🔒 chỉ cho xoá khi đơn đã kết thúc
// done = hoàn tất (kể cả admin phê duyệt)
// cancelled / refunded = đã kết thúc
if (
  o.status === "done" ||
  o.status === "cancelled" ||
  o.status === "refunded"
) {
  // ✅ cho phép xoá
} else {
  showModal({
    title: "🔒 Không thể xoá",
    message: "Chỉ có thể xoá lịch sử khi đơn hàng đã hoàn tất hoặc đã huỷ."
  });
  return;
}



  showModal({
    title: "🗑 Xoá lịch sử đơn hàng",
    message: "Bạn có chắc chắn muốn xoá đơn hàng này khỏi lịch sử không?",
    confirm: true,
    onOk: async ()=>{

      const me = JSON.parse(localStorage.getItem("user_profile"));
      if(!me?.uid) return;

      const res = await fetch("/api/market/order/hide",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-uid": me.uid
        },
        body: JSON.stringify({ orderId, role })
      });

      const data = await res.json();

      if(!data.ok){
        showModal({
          title:"❌ Không thể xoá",
          message: data.message || "Không thể xoá lịch sử đơn hàng."
        });
        return;
      }

      showModal({
        title:"✅ Đã xoá",
        message:"Đơn hàng đã được xoá khỏi lịch sử."
      });

      // ❌ không cần loadBooth
      // realtime order-updated sẽ tự render
    }
  });
}



async function markOrderReceived(orderId){
  showModal({
    title:"📦 Xác nhận nhận hàng",
    message:"Bạn chắc chắn đã nhận được hàng?",
    confirm:true,
    onOk: async ()=>{
      const me = JSON.parse(localStorage.getItem("user_profile"));
      const res = await fetch("/api/market/order/received",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-uid": me.uid
        },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      if(!data.ok){
        showModal({ title:"❌ Lỗi", message:data.message || "Không thể xác nhận." });
      }
    }
  });
}



function openDispute(orderId){
  showModal({
    title:"⚠️ Khiếu nại đơn hàng",

  message: `
  <textarea id="disputeReason"
    placeholder="Mô tả vấn đề..."
    style="width:100%;height:80px;margin-bottom:8px"></textarea>

  <input type="file"
    id="disputeFiles"
    accept="image/*,video/*"
    multiple
  >

  <div id="disputePreview"
    style="
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:6px;
      margin-top:8px
    ">
  </div>
`,


    confirm:true,
    onOk: async ()=>{
      const reason =
        document.getElementById("disputeReason").value.trim();

      if(!reason){
        showModal({ title:"❌ Lỗi", message:"Vui lòng nhập lý do." });
        return;
      }

      const me = JSON.parse(localStorage.getItem("user_profile"));

const files =
  document.getElementById("disputeFiles")?.files || [];

const evidences = [];

// 📎 upload ảnh / video bằng chứng
for(const f of files){
  const form = new FormData();
  form.append("file", f);

  const upRes = await fetch("/api/upload-dispute-media",{
    method:"POST",
    headers:{ "x-uid": me.uid },
    body: form
  });

  const upData = await upRes.json();
  if(upData.ok){
    evidences.push({
      url: upData.url,
      type: upData.type
    });
  }
}

// 📤 gửi khiếu nại kèm bằng chứng
const res = await fetch("/api/market/order/dispute",{
  method:"POST",
  headers:{
    "Content-Type":"application/json",
    "x-uid": me.uid
  },
  body: JSON.stringify({
    orderId,
    reason,
    evidences
  })
});



      const data = await res.json();
      if(!data.ok){
        showModal({ title:"❌ Lỗi", message:data.message });
        return;
      }

      showModal({
        title:"📨 Đã gửi",
        message:"Khiếu nại đã được gửi, chờ admin xử lý."
      });
    }
  });

setTimeout(()=>{
  const input = document.getElementById("disputeFiles");
  const preview = document.getElementById("disputePreview");
  if(!input || !preview) return;

  input.onchange = ()=>{
    preview.innerHTML = "";
    Array.from(input.files).forEach(f=>{
      const el = document.createElement(
        f.type.startsWith("video") ? "video" : "img"
      );
      el.src = URL.createObjectURL(f);
      el.style.width = "100%";
      el.style.borderRadius = "6px";
      if(f.type.startsWith("video")) el.controls = true;
      preview.appendChild(el);
    });
  };
}, 50);


}


function showForceLogoutModal(message){
  let modal = document.getElementById("forceLogoutModal");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "forceLogoutModal";
    modal.innerHTML = `
      <div class="fl-backdrop"></div>
      <div class="fl-box">
        <div class="fl-icon">🚫</div>
        <div class="fl-title">Phiên đăng nhập kết thúc</div>
        <div class="fl-msg"></div>
        <div class="fl-sub">Bạn sẽ được chuyển về trang đăng nhập…</div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.querySelector(".fl-msg").textContent = message;
  modal.classList.add("show");
}


socket.on("force-logout", (data) => {
  const msg = data?.message || "Tài khoản của bạn đã bị đăng xuất";

  showForceLogoutModal(msg);

  // clear auth
  localStorage.removeItem("user_profile");
  localStorage.removeItem("login_uid");
  localStorage.removeItem("isGuest");

  // redirect sau 2s
  setTimeout(()=>{
    location.href = "/login.html";
  }, 3000);
});
