/* ===== GET BOOTH ID ===== */
const params = new URLSearchParams(location.search);
const boothId = params.get("booth");

/* ===== ELEMENTS ===== */
const boothNameEl = document.getElementById("boothName");
const boothLogoEl = document.getElementById("boothLogo");
const btnBack = document.getElementById("btnBack");
const btnAddProduct = document.getElementById("btnAddProduct");

/* ===== LOAD BOOTH INFO ===== */
// TẠM THỜI fake – sau này lấy từ server
function loadBooth(){
  boothNameEl.textContent = "Shop của tôi #" + boothId;
  boothLogoEl.src = "https://i.pravatar.cc/100?u=" + boothId;
}

loadBooth();

/* ===== ACTIONS ===== */
btnBack.onclick = ()=>{
  history.back();
};

btnAddProduct.onclick = ()=>{
  alert("➕ Mở giao diện đăng sản phẩm (làm tiếp)");
};
