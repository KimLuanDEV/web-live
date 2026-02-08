// ================================
// 🧠 HEALTH STORE – BACKEND VERSION
// ================================

// 👉 UID phải tồn tại (login system của bạn)
const UID = localStorage.getItem("uid");

// ================================
// 📥 LOAD HEALTH DATA
// ================================
async function loadHealthData(){
  if (!UID) {
    console.warn("⚠️ No UID, cannot load health data");
    return {};
  }

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
  if (!UID) {
    console.warn("⚠️ No UID, cannot save health data");
    return;
  }

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
