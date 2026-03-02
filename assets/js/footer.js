/**
 * دالة لتحميل الفوتر في أي صفحة
 * @param {string} rootPath - مسار الوصول للروت
 */
function loadFooter(rootPath = "") {
  const footerContainer = document.getElementById("footer-placeholder");

  if (!footerContainer) return;

  fetch(`${rootPath}components/footer.html`)
    .then((response) => {
      if (!response.ok) throw new Error("Footer file not found!");
      return response.text();
    })
    .then((htmlData) => {
      // استبدال المتغيرات بالمسار الصحيح
      const finalHtml = htmlData.replace(/{{root}}/g, rootPath);
      footerContainer.innerHTML = finalHtml;
    })
    .catch((error) => console.error("Error loading the footer:", error));
}
