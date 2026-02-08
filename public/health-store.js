// ================================
// 🧠 HEALTH STORE – BACKEND VERSION
// ================================

// 🔐 ENSURE UID (LOGIN OR GUEST)
function ensureUID(){
  let uid = localStorage.getItem("uid");

  // 🧪 Guest mode (chưa login)
  if (!uid) {
    uid = "guest_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("uid", uid);
    console.info("👤 Guest UID created:", uid);
  }

  return uid;
}

// 👉 UID luôn tồn tại
const UID = ensureUID();

// ================================
// 📥 LOAD HEALTH DATA
// ================================
async function loadHealthData(){
  try {
    const res = await fetch(`/api/health/${UID}`);
    const json = await res.json();

    if (!json || json.ok === false) {
      return {};
    }

    return json.healthData || {};
  } catch (e) {
    console.error("❌ loadHealthData failed:", e);
    return {};
  }
}

// ================================
// 📤 SAVE HEALTH DATA
// ================================
async function saveHealthData(data){
  try {
    await fetch(`/api/health/${UID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error("❌ saveHealthData failed:", e);
  }
}
