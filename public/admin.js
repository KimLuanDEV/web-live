const admin = JSON.parse(localStorage.getItem("user_profile") || "{}");

if (!admin.uid) {
  alert("❌ Chưa đăng nhập");
  location.href = "/login.html";
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
    tr.innerHTML = `
      <td>${u.uid}</td>
      <td>${u.name}</td>
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
      </td>
    `;
    tbody.appendChild(tr);
  });
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

  loadUsers(); // refresh list
}

loadUsers();
