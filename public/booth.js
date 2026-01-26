/* ===== GET BOOTH ID ===== */
const params = new URLSearchParams(location.search);
const boothId = params.get("booth");

/* ===== ELEMENTS ===== */
const boothNameEl = document.getElementById("boothName");
const boothLogoEl = document.getElementById("boothLogo");
const btnBack = document.getElementById("btnBack");
const btnAddProduct = document.getElementById("btnAddProduct");
const btnExtend = document.getElementById("btnExtendBooth"); // nút gia hạn

/* ===== LOAD BOOTH INFO FROM SERVER ===== */
async function loadBooth(){
  try{
    const res = await fetch("/api/market");
    const data = await res.json();
    if(!data.ok) return;

    const booth = data.market[boothId];
    if(!booth) return;

    // hiển thị info gian
    boothNameEl.textContent = booth.name;
    boothLogoEl.src = booth.logo;

    // nếu là chủ gian → hiện nút gia hạn
    const me = JSON.parse(localStorage.getItem("user_profile"));
    if(me && me.uid === booth.ownerUid){
      btnExtend?.classList.remove("hidden");
      btnAddProduct?.classList.remove("hidden");
    }

  }catch(e){
    console.error("loadBooth error", e);
  }
}

loadBooth();

/* ===== ACTIONS ===== */
btnBack.onclick = ()=>{
  history.back();
};

btnAddProduct.onclick = ()=>{
  alert("➕ Mở giao diện đăng sản phẩm (làm tiếp)");
};

/* ===== GIA HẠN GIAN HÀNG ===== */
btnExtend?.addEventListener("click", ()=>{
  openExtendModalInBooth();
});

/* ===== MODAL GIA HẠN (DÙNG LẠI LOGIC) ===== */
let selectedPlan = { days: 7, price: 1000 };

function openExtendModalInBooth(){
  const days = prompt("Gia hạn gian hàng (ngày): 7 / 30 / 90", "30");
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
      body: JSON.stringify({
        boothId,
        days,
        price
      })
    });

    const data = await res.json();
    if(!data.ok){
      if(data.error==="not_enough_coin")
        return alert("❌ Không đủ kim cương");
      return alert("❌ Gia hạn thất bại");
    }

    alert("⏳ Gia hạn gian hàng thành công!");
    loadBooth();

  }catch(e){
    alert("⚠️ Lỗi kết nối server");
  }
}
