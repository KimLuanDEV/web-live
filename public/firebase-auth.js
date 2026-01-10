import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 CONFIG firebase của bạn
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

const email = document.getElementById("email");
const pass = document.getElementById("password");
const err = document.getElementById("loginError");

async function ensureUser(uid, email){
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if(!snap.exists()){
    await setDoc(ref,{
      name: email.split("@")[0],
      avatar: "/default-avatar.png",
      coins: 0,
      level: 1,
      exp: 0,
      coinSent: 0,
      coinReceived: 0,
      createdAt: Date.now()
    });
  }
}

btnLogin.onclick = async ()=>{
  try{
    const u = await signInWithEmailAndPassword(auth, email.value, pass.value);
    await ensureUser(u.user.uid, u.user.email);
    location.href="/lobby.html";
  }catch(e){
    err.textContent = e.message;
  }
};

btnRegister.onclick = async ()=>{
  try{
    const u = await createUserWithEmailAndPassword(auth, email.value, pass.value);
    await ensureUser(u.user.uid, u.user.email);
    location.href="/profile.html";
  }catch(e){
    err.textContent = e.message;
  }
};

btnGoogle.onclick = async ()=>{
  try{
    const provider = new GoogleAuthProvider();
    const u = await signInWithPopup(auth, provider);
    await ensureUser(u.user.uid, u.user.email);
    location.href="/lobby.html";
  }catch(e){
    err.textContent = e.message;
  }
};
