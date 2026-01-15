const p = localStorage.getItem("user_profile");
if(!p){
  location.href="/login.html";
}

window.addEventListener("load", ()=>{
  const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");

  if(auth?.uid && window.socket){
    socket.emit("auth-ping", { uid: auth.uid });

    setInterval(()=>{
      socket.emit("auth-ping", { uid: auth.uid });
    }, 15000);
  }
});
