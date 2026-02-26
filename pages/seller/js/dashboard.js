window.addEventListener('load', async function () {

  // ✅ Chart
  const ctx = document.getElementById('revenueChart');
  if (ctx) {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        datasets: [{
          label: 'Total Revenue ($)',
          data: [500, 700, 400, 900, 600, 800, 650, 720, 500, 880, 770, 910],
          borderRadius: 8,
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(54, 163, 235, 0.39)',
          borderColor: 'rgba(54, 162, 235, 1)'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // ✅ Sidebar fetch
  try {
    const res = await fetch("sidebar.html");
    const data = await res.text();
    document.getElementById("sidebar-container").innerHTML = data;

    // ✅ لازم الملف اللي فيه الكود يبقى Module (هشرح تحت)
    const mod = await import("./../../../assets/js/sidebar-account.js");
      await mod.initSidebarAccount();

  } catch (e) {
    console.error("Sidebar load error:", e);
  }

});