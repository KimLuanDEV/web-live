// auth.js
export function saveAuth(data) {
  localStorage.setItem("auth", JSON.stringify(data));
}

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem("auth"));
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("auth");
  location.href = "/login.html";
}
