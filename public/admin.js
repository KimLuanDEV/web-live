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
