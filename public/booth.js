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
function formatDate(ts) {
  const d = new Date(ts);

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
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
            alt="${escapeBoothHtml(p.name || "Product")}"
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
          ${escapeBoothHtml(p.name || "Product")}
        </div>

        <div class="product-price">
          ${price.toLocaleString("en-US")}
          <small>diamonds</small>
        </div>

        <p class="product-description">
          ${escapeBoothHtml(p.desc || "No description available.")}
        </p>

<div class="product-stock ${out ? "out" : "in"}">
  ${out
    ? "Out of Stock"
    : `${stock.toLocaleString("en-US")} in stock`
  }
</div>

        ${isOwner ? `
          <div class="product-controls">

            <button type="button"
                    class="product-edit">
              Edit
            </button>

            <button type="button"
                    class="product-delete">
              Delete
            </button>

          </div>
        ` : `
          <button type="button"
                  class="product-buy"
                  ${out ? "disabled" : ""}>
            ${out ? "Out of Stock" : "Buy Now"}
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
  Your booth <b>expires today</b>.
  <div>
    Expiration Date: ${formatDate(booth.expireAt)}
  </div>
`;

} else if (daysLeft <= 3) {

  expireBox.className = "booth-expire warn";

expireBox.innerHTML = `
  Your booth is expiring soon.
  <div>
    Expiration Date: ${formatDate(booth.expireAt)}
    — ${daysLeft} days remaining
  </div>
`;

} else {

  expireBox.className = "booth-expire";

expireBox.innerHTML = `
  Expiration Date: ${formatDate(booth.expireAt)}
  — ${daysLeft} days remaining
`;

}

      }
    }

    /* =========================
       NGƯỜI MUA
    ========================= */

else {

  // Không hiển thị tab quản lý của chủ gian
  document.getElementById("tabOrders")
    ?.classList.add("hidden");

  const myOrdersTab =
    document.getElementById("tabMyOrders");

  if (me?.uid) {

    myOrdersTab?.classList.remove("hidden");

    renderMyOrders(booth.orders || []);

  } else {

    // Khách chưa đăng nhập không thấy tab đơn hàng
    myOrdersTab?.classList.add("hidden");

  }

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
      title: "Sign In Required",
      message: "Please sign in to continue."
    });
    return;
  }
  if(me.uid !== currentBoothOwnerUid){
    showModal({
      title: 	"Access Denied",
      message: "You are not the owner of this booth."
    });
    return;
  }

  // ✅ RESET MODE
  editingProductId = null;
  editingImages = [];
  pGalleryPreview.innerHTML = "";

  productModalTitle.textContent = "Add Product";
  btnSubmitProduct.textContent = 	"Publish Product";

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


/* ==========================================
   BOOTH RENTAL EXTENSION
   ENGLISH INTERFACE
========================================== */

function openExtendModalInBooth() {

  showModal({

    title: "Extend Booth Rental",

    message: `

      <div class="bt-extend-intro">
        Choose a rental extension plan
        that best suits your needs.
      </div>

      <div class="bt-extend-options">

        <!-- 7 DAYS -->
        <button
          type="button"
          class="bt-extend-plan"
          onclick="confirmExtendBooth(7,1000)"
        >
          <span>7 Days</span>
          <strong>1,000</strong>
          <small>diamonds</small>
        </button>

        <!-- 30 DAYS -->
        <button
          type="button"
          class="bt-extend-plan"
          onclick="confirmExtendBooth(30,3500)"
        >
          <span>30 Days</span>
          <strong>3,500</strong>
          <small>diamonds</small>
        </button>

        <!-- 90 DAYS -->
        <button
          type="button"
          class="bt-extend-plan"
          onclick="confirmExtendBooth(90,9000)"
        >
          <span>90 Days</span>
          <strong>9,000</strong>
          <small>diamonds</small>
        </button>

      </div>
    `

  });

}

async function confirmExtendBooth(days, price){
  const me = JSON.parse(localStorage.getItem("user_profile"));
  if(!me || !me.uid){
    showModal({
  title: "Sign In Required",
  message: "Please sign in to continue."
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

if (!data.ok) {

  if (data.error === "not_enough_coin") {
    showModal({
      title: "Insufficient Diamonds",
      message: "Your diamond balance is insufficient."
    });
    return;
  }

  showModal({
    title: "Extension Failed",
    message: "Unable to extend the booth rental. Please try again."
  });

  return;
}

// Chỉ báo thành công khi server trả về ok
showModal({
  title: "Extension Successful",
  message: "Your booth rental has been extended successfully."
});


    syncMyCoin();
    loadBooth();

  }catch(e){
    showModal({
  title:"Connection Error",
  message:"Unable to connect to the server. Please try again."
});

  }
}


async function submitProduct(){
  if(isSubmittingProduct) return;
  setProductSubmitting(true);

  const me = JSON.parse(localStorage.getItem("user_profile"));

  if(!me?.uid){
    showModal({
      title:"Sign In Required",
      message:"Please sign in to continue."
    });
    setProductSubmitting(false);
    return;
  }

  const files = Array.from(pImageFile.files);
  if(files.length === 0){
    showModal({
      title:"Images Required",
      message:"Please select at least one product image."
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
    if(text) text.textContent = `Uploading image 1/${files.length}... 0%`;
  }

  const imageUrls = [];

  try{
    for(let i = 0; i < files.length; i++){
      const form = new FormData();
      form.append("image", files[i]);

      if(text) text.textContent = `Uploading image ${i+1}/${files.length}... 0%`;
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
              `Uploading image ${i+1}/${files.length}... ${percent}%`;
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
      title:"Upload Failed",
      message:"Unable to upload images. Please try again."
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
      title:"Operation Failed",
      message:"Unable to publish the product."
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
  productModalTitle.textContent = "Add Product";
  btnSubmitProduct.textContent = 	"Publish Product";

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
        <h2>This Booth Is Locked</h2>
        <p>${data.message || "Please contact an administrator."}</p>
        <button onclick="location.href='/market.html'"
          style="
            margin-top:16px;
            padding:10px 18px;
            border-radius:999px;
            border:none;
            background:#d7b57a;
            color:#21180e;
            font-weight:900;
            cursor:pointer;
          ">
          Back to Marketplace
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
  title: "Booth Locked",
  message: "This booth has been locked by an administrator.",
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
      title:"Booth Locked",
      message:"This booth is locked. Product editing is unavailable."
    });
    return;
  }

  const p = booth.products.find(x => x.id === productId);
  if(!p) return;

  editingProductId = productId;

  productModalTitle.textContent = "Edit Product";
  btnSubmitProduct.textContent = "Save Changes";

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

del.type = "button";
del.textContent = "Remove";

del.style.position = "absolute";
del.style.top = "6px";
del.style.right = "6px";

del.style.width = "auto";
del.style.minWidth = "40px";
del.style.height = "28px";
del.style.padding = "0 8px";

del.style.borderRadius = "8px";
del.style.border = "1px solid rgba(220,185,123,.45)";
del.style.background = "rgba(28,25,22,.95)";

del.style.color = "#f1d6a6";
del.style.fontSize = "11px";
del.style.fontWeight = "700";
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
      title:"Operation Failed",
      message:"Unable to update the product."
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
      title:"Operation Failed",
      message:"Unable to delete the product."
    });
    return;
  }
  loadBooth();
}


async function deleteProduct(productId){
  showModal({
  title: "Delete Product",
  message: 	"Are you sure you want to delete this product?",
  confirm: true,
  onOk: () => deleteProductConfirmed(productId)
});
return;
}



function buyProduct(productId){

  if(!window.__lastBooth) return;

    if (window.__lastBooth?.locked) {
  showModal({
    title:"Booth Locked",
    message:"Purchases are currently unavailable."
  });
  return;
}

  const booth = window.__lastBooth;
  const p = booth?.products?.find(x => x.id === productId);

  if (!p || p.stock <= 0) {
    showModal({
      title:"Out of Stock",
      message:"This product is currently out of stock."
    });
    return;
  }

  const me = JSON.parse(localStorage.getItem("user_profile"));
  if(!me?.uid){
    showModal({
      title:"Sign In Required",
      message:"Please sign in to purchase this product."
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



/* ==========================================
   MINIMAL UI - REMOVE DECORATIVE EMOJI
========================================== */

function cleanBoothModalTitle(value) {
  return String(value ?? "")
    .replace(
      /[\p{Extended_Pictographic}\uFE0E\uFE0F\u200D]/gu,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}




function showModal({
  title = "Notification",
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

  titleEl.textContent = cleanBoothModalTitle(title);
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
      title:"Missing Information",
      message:"Please complete all required purchase details."
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
      title:"Operation Failed",
      message:"Unable to place your order."
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
    title:"Order Placed Successfully",
    message:	"The seller will contact you as soon as possible."
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

 /* ==========================================
   ORDER STATUS - ENGLISH
========================================== */

const statusLabels = {

  pending: "Pending",

  contacted: "Contacted",

  buyer_received: "Buyer Received",

  dispute: "Under Dispute",

  done: "Completed",

  refunded: "Refunded",

  cancelled: "Cancelled"

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
        ${escapeBoothHtml(o.productName || "Product")}
        <span class="qty">
          × ${quantity}
        </span>
      </div>

      <div class="${isSeller ? "order-price" : "my-order-price"}">
        ${amount.toLocaleString("en-US")}
        <small>diamonds</small>
      </div>

    </div>

    <div class="${isSeller ? "order-meta" : "my-order-meta"}">
      ${new Date(o.createdAt).toLocaleString("en-US")}
    </div>

    ${isSeller ? `
      <div class="order-buyer">

        <div>
          <b>Buyer:</b>
          ${escapeBoothHtml(buyer.name || "—")}
        </div>

        <div>
          <b>Phone:</b>
          ${escapeBoothHtml(buyer.phone || "—")}
        </div>

        <div>
          <b>Address:</b>
          ${escapeBoothHtml(buyer.address || "—")}
        </div>

        ${buyer.note ? `
          <div>
            <b>Notes:</b>
            ${escapeBoothHtml(buyer.note)}
          </div>
        ` : ""}

      </div>
    ` : ""}

    <div class="${isSeller ? "order-status" : "my-order-status"} ${statusClass}">
      ${statusLabels[status] || "Processing"}
    </div>

    ${status === "done" && o.adminApproved ? `
      <div class="order-admin-note">
        This order has been completed by an administrator.
      </div>
    ` : ""}

    ${status === "refunded" ? `
      <div class="order-admin-note">
        A refund has been processed for this order.
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

// SELLER ACTIONS
if (isSeller) {

  if (status === "pending") {

    addButton(
      "Mark Contacted",
      () => contactOrder(o.id)
    );

  }

  if (status === "buyer_received") {

    addButton(
      "Complete Order",
      () => completeOrder(o.id)
    );

  }

  if (status === "contacted") {

    addNote("Awaiting Buyer Confirmation");

  }

  if (
    status === "cancelled" ||
    status === "refunded" ||
    (status === "done" && o.adminApproved)
  ) {

    addButton(
      "Remove History",
      () => hideOrder(o.id, "seller")
    );

  } else {

    addNote("History removal requires Admin review");

  }

}

// BUYER ACTIONS
else {

  if (status === "pending") {

    addButton(
      "Cancel Order",
      () => cancelMyOrder(o.id)
    );

  }

  if (status === "contacted") {

    addButton(
      "Confirm Receipt",
      () => markOrderReceived(o.id)
    );

  }

  if (["contacted", "buyer_received"].includes(status)) {

    addButton(
      "Dispute / Refund",
      () => openDispute(o.id)
    );

  }

  if (["done", "cancelled", "refunded"].includes(status)) {

    addButton(
      "Remove History",
      () => hideOrder(o.id, "buyer")
    );

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
    empty.textContent = "Please sign in to view your orders.";
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
title: "Order Status",
message: "Order status updates will be available soon."
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
    btnSubmitProduct.textContent = "Processing...";
    btnSubmitProduct.style.opacity = ".6";
  }else{
    btnSubmitProduct.disabled = false;
    btnSubmitProduct.textContent =
      btnSubmitProduct.dataset._text || 	"Publish Product";
    btnSubmitProduct.style.opacity = "1";
  }
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
    title: "Cancel Order",
    message: "Are you sure you want to cancel this order?<br><small style='opacity:.7'>Your payment will be refunded.</small>",
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
            title:"Cancellation Failed",
            message: data.message || "Unable to cancel this order."
          });
          return;
        }

        showModal({
          title:"Order Cancelled",
          message:"Your order has been cancelled and refunded."
        });

        // ❌ KHÔNG cần loadBooth
        // socket order-updated sẽ tự update UI

      }catch(err){
        showModal({
          title:"Error",
          message:"Something went wrong. Please try again."
        });
      }
    }
  });
}




async function contactOrder(orderId){
  showModal({
    title: "Confirm Customer Contact",
    message: "Have you contacted the customer about this order?",
    confirm: true,          // ✅ BẮT BUỘC
    onOk: async ()=>{       // ✅ ĐÚNG TÊN CALLBACK
      const me = JSON.parse(localStorage.getItem("user_profile"));
      if(!me?.uid){
        showModal({
          title:"Sign In Required",
          message:"Please sign in to continue."
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
            title:"Confirmation Failed",
            message: data.message || "Unable to complete this action."
          });
          return;
        }

        showModal({
          title:"Success",
          message:"Order status updated to Contacted."
        });

        
      }catch(err){
        showModal({
          title:"Connection Error",
          message:	"Unable to connect to the server."
        });
      }
    }
  });
}




async function completeOrder(orderId){
  showModal({
    title: "Complete Order",
    message: "Confirm that this order has been completed?",
    confirm: true,
    onOk: async ()=>{
      const me = JSON.parse(localStorage.getItem("user_profile"));
      if(!me?.uid){
        showModal({
          title:"Sign In Required",
          message:"Please sign in to continue."
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
            title:	"Unable to Complete Order",
            message: data.message || "Unable to complete this action."
          });
          return;
        }

        showModal({
          title:"Success",
          message:"This order has been marked as completed."
        });

        
      }catch(e){
        showModal({
          title:"Connection Error",
          message:	"Unable to connect to the server."
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
    title: 	"History Removal Unavailable",
    message: "Order history can only be removed after the order is completed or cancelled."
  });
  return;
}



  showModal({
    title: "Remove Order History",
    message: "Are you sure you want to remove this order from your history?",
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
          title:"Unable to Remove History",
          message: data.message || "Unable to remove this order from your history."
        });
        return;
      }

      showModal({
        title:"History Removed",
        message:"The order has been removed from your history."
      });

      // ❌ không cần loadBooth
      // realtime order-updated sẽ tự render
    }
  });
}



async function markOrderReceived(orderId){
  showModal({
    title:"Confirm Delivery",
    message:"Have you received your order?",
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
        showModal({ title:"Error", message:data.message || "Unable to confirm receipt." });
      }
    }
  });
}



function openDispute(orderId){
  showModal({
    title:"Order Dispute",

  message: `
  <textarea id="disputeReason"
    placeholder="Describe the issue..."
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
        showModal({
  title: "Reason Required",
  message: "Please describe the issue before submitting."
});
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
        showModal({ title:"Error", message:data.message });
        return;
      }

showModal({
  title: "Dispute Submitted",
  message: "Your dispute has been submitted and is awaiting administrator review."
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
        <div class="fl-kicker">LIVESTREAM PRO · SECURITY</div>
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
