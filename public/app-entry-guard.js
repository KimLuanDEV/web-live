
/* ==========================================
   LIVESTREAM PRO
   APP ENTRY GUARD - STABLE VERSION

   - Index is the app launch page
   - No redirect to Index during navigation
   - Keep authenticated pages accessible
========================================== */

(function () {
  "use strict";

  const LOGIN = "/login.html";

  const path = window.location.pathname.toLowerCase();

  /* ======================================
     PUBLIC PAGES
  ====================================== */

  const PUBLIC_PAGES = new Set([
    "/",
    "/index.html",
    "/login.html",
    "/register.html"
  ]);

  // Public pages are always accessible.
  if (PUBLIC_PAGES.has(path)) {
    return;
  }

  /* ======================================
     AUTHENTICATION STATE
  ====================================== */

  let profile = null;

  try {
    profile = JSON.parse(
      localStorage.getItem("user_profile") || "null"
    );
  } catch (error) {
    profile = null;
  }

  const uid = String(profile?.uid || "").trim();

  const hasLocalProfile =
    uid.length > 0 &&
    !uid.toLowerCase().startsWith("guest");

  /* ======================================
     NOT LOGGED IN
  ====================================== */

  if (!hasLocalProfile) {

    // Prevent redirect loops on Login.
    if (path !== LOGIN) {
      window.location.replace(LOGIN);
    }

    return;
  }

  /* ======================================
     ALREADY LOGGED IN
  ====================================== */

  // Keep the current page.
  // Do not redirect to Index or Social.

})();
