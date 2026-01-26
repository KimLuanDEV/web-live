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

/* ===== HELPERS ===== */
function formatDate(ts){
  const d = new Date(ts);
  return d.toLocaleDateString("vi-VN");
}

function diffDays(ts){
  return Math.ceil((ts - Date.now()) / (24*60*60*1000));
}

/* ===== LOAD BOOTH INFO FROM SERVER ===== */
async function loadBooth(){
  try{
    const res = await fetch("/api/market");
    const data = await res.json();
    if(!data.ok) return;

    const booth = data.market[boothId];
    if(!booth) return;

    // info
    boothNameEl.textContent = booth.name;
    boothLogoEl.src = booth.logo;

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

/* ===== ACTIONS ===== */
btnBack.onclick = ()=> history.back();

btnAddProduct.onclick = ()=>{
  alert("➕ Gian hàng đang nâng cấp!");
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
    loadBooth();

  }catch(e){
    alert("⚠️ Lỗi kết nối server");
  }
}
