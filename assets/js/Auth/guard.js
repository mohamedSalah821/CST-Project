function requireAuth(allowedRoles = []) {
  const user = JSON.parse(localStorage.getItem("currentUser"));

  // مفيش لوجين لسه
  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  //  نعمل اتشيك علي الرول
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    window.location.href = "/index.html";
  }
}
