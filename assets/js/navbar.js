/**
 * دالة لتحميل الناف بار في أي صفحة
 * @param {string} rootPath - مسار الوصول للروت
 */
function loadNavbar(rootPath = "") {
  const navbarContainer = document.getElementById("navbar-placeholder");

  if (!navbarContainer) return;

  fetch(`${rootPath}components/navbar.html`)
    .then((response) => {
      if (!response.ok) throw new Error("Navbar file not found!");
      return response.text();
    })
    .then((htmlData) => {
      // 1. استبدال المتغيرات بالمسار الصحيح
      const finalHtml = htmlData.replace(/{{root}}/g, rootPath);
      navbarContainer.innerHTML = finalHtml;

      // 2. تفعيل وظائف تسجيل الدخول والتعرف على المستخدم
      setupAuthentication(rootPath);

      // 3. تفعيل لون الصفحة الحالية (Active Link)
      highlightActiveLink();
      setupWishlistNavGuard(rootPath);
    })
    .catch((error) => console.error("Error loading the navbar:", error));
}

/*
  function to setup the navbar based on user authentication status
*/
function setupAuthentication(rootPath) {
  const guestMenu = document.getElementById("guest-menu");
  const userMenu = document.getElementById("user-menu");
  const usernameDisplay = document.getElementById("display-username");
  const profileLink = document.getElementById("profile-link");
  const logoutBtn = document.getElementById("logout-btn");

  const loggedInUser = JSON.parse(localStorage.getItem("currentUser"));

  if (loggedInUser) {
    //hide login btns and show profile
    guestMenu.classList.add("d-none");
    guestMenu.classList.remove("d-flex");

    userMenu.classList.remove("d-none");
    userMenu.classList.add("d-flex");

    // show username
    if (usernameDisplay) {
      usernameDisplay.textContent = loggedInUser.name || "User";
    }

    // set profile link based on role
    if (profileLink) {
        if (loggedInUser.role === "admin") {
          profileLink.href = `${rootPath}pages/admin/admin-profile.html`;
        } else if (loggedInUser.role === "seller") {
          profileLink.href = `${rootPath}pages/seller/profile.html`;
        } else {
          profileLink.href = `${rootPath}pages/customer/customer-profile.html`;
        }
    }

    // logout btn
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (e) {
          e.preventDefault(); 
          
         localStorage.removeItem("currentUser");          
          window.location.href = `${rootPath}login.html`; 
        });
    }
  }
}

/**
 * دالة ذكية لمعرفة الصفحة الحالية وإضاءة اللينك الخاص بها
 */
function highlightActiveLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".nav-item-link");

  navLinks.forEach((link) => {
    const linkPath = new URL(link.href).pathname;

    if (
      currentPath.includes(linkPath) ||
      (currentPath === "/" && linkPath.includes("index.html"))
    ) {
      link.classList.add("active", "text-primary");
    } else {
      link.classList.remove("active", "text-primary");
    }
  });
}