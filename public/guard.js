import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🚨 Guard toàn bộ trang cần đăng nhập
onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.log("⛔ Chưa login → chuyển về /login.html");
    location.href = "/login.html";
  } else {
    console.log("✅ Đã login:", user.uid);
    window.currentUser = user; // để các file khác dùng
  }
});
