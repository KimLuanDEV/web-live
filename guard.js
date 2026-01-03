(function guardPoster(){
  const ok = localStorage.getItem("__ENTERED_FROM_POSTER__");
  if(ok !== "1"){
    location.replace("/poster.html");
  }
})();


(function () {
  const auth = localStorage.getItem("auth");
  if (!auth) {
    location.href = "/login.html";
  }
})();
