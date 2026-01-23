const admin = JSON.parse(localStorage.getItem("user_profile") || "{}");

if (!admin.uid) {
  alert("❌ Chưa đăng nhập");
  location.href = "/login.html";
}

// ===== TOAST (GIỐNG SOCIAL) =====
function showToast(text){
  const el = document.getElementById("adminToast");
  if(!el) return;
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.classList.remove("show"), 2000);
}


async function topup(){
  const uid = document.getElementById("uid").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const note = document.getElementById("note").value;

  const res = await fetch("/api/admin/topup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminUid: admin.uid,
      targetUid: uid,
      amount,
      note
    })
  });

  const data = await res.json();
  document.getElementById("log").textContent =
    JSON.stringify(data, null, 2);

if (data?.ok) {
  showToast("✅ Nạp coin thành công");
  loadUsers();
} else {
  showToast("❌ Nạp coin thất bại");
}


}


let USERS = [];

async function loadUsers(){
  const res = await fetch("/api/admin/users", {
    headers: {
      "x-uid": admin.uid
    }
  });
  const data = await res.json();
  if (!data.ok) return;

  USERS = data.users;
  renderUsers(USERS);
}

function renderUsers(list){
  const tbody = document.querySelector("#userTable tbody");
  tbody.innerHTML = "";

  list.forEach(u => {
    const tr = document.createElement("tr");
if (u.blocked) {
  tr.style.opacity = "0.45";
  tr.style.filter = "grayscale(1)";
}

    tr.innerHTML = `
      <td>${u.uid}</td>
      <td class="admin-name-link" onclick="openProfile('${u.uid}')">${u.name}</td>
      <td>${u.coins}</td>
      <td>${u.level}</td>
      <td>${u.exp}</td>
      <td>${u.coinSent}</td>
      <td>${u.coinReceived}</td>

      <td class="${u.role === "admin" ? "role-admin" : ""}">
  ${u.role}
</td>

      <td>
  <button onclick="quickTopup('${u.uid}')">➕ Nạp</button>

  <button onclick="toggleLock('${u.uid}', ${u.blocked})">
  ${u.blocked ? "🔓 Mở khoá" : "🚫 Khoá"}
</button>

</td>

    `;
    tbody.appendChild(tr);
  });
}


function openProfile(uid){
  // nếu profile bạn dùng query uid
  location.href = `/profile.html?uid=${encodeURIComponent(uid)}`;
}


// 🔍 SEARCH
document.getElementById("searchUser").addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  const filtered = USERS.filter(u =>
    u.uid.toLowerCase().includes(q) ||
    u.name.toLowerCase().includes(q)
  );
  renderUsers(filtered);
});

// ➕ NẠP NHANH
async function quickTopup(uid){
  const amount = prompt("Nạp bao nhiêu coin?");
  if (!amount) return;

  await fetch("/api/admin/topup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      adminUid: admin.uid,
      targetUid: uid,
      amount: Number(amount)
    })
  });
  showToast("✅ Đã nạp coin");
  loadUsers(); // refresh list
}




// 🚫 KHOÁ / MỞ KHOÁ USER
async function toggleLock(uid, isBlocked){
  const reason = prompt(
    isBlocked
      ? "🔓 Lý do mở khoá (tuỳ chọn):"
      : "🚫 Lý do khoá tài khoản:"
  );

  // khi khoá → bắt buộc có lý do
  if (!isBlocked && (!reason || !reason.trim())) {
    alert("⚠️ Vui lòng nhập lý do khoá");
    return;
  }

  const ok = confirm(
    isBlocked
      ? "Xác nhận MỞ KHOÁ tài khoản này?"
      : "Xác nhận KHOÁ tài khoản này?"
  );
  if (!ok) return;


await fetch("/api/admin/lock-user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    adminUid: admin.uid,
    targetUid: uid,
    lock: !isBlocked,
    reason: reason || ""
  })
});
  showToast(isBlocked ? "✅ Đã mở khoá" : "🚫 Đã khoá tài khoản");
  loadUsers();
}



loadUsers();
