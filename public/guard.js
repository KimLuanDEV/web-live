const p = localStorage.getItem("user_profile");
if(!p){
  location.href="/login.html";
}
