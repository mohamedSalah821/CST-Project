window.addEventListener('load', function () {


    const ctx = document.getElementById('revenueChart');

    new Chart(ctx, {
        type: 'bar', // ممكن نخليه line لو حابة
        data: {
           labels: [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
],

            datasets: [{
                label: 'Total Revenue ($)',
                data: [500, 700, 400, 900, 600, 800],
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderRadius: 8,
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(54, 163, 235, 0.39)',
                borderColor: 'rgba(54, 162, 235, 1)',

            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

// //////////////////////////////////


fetch("sidebar.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("sidebar-container").innerHTML = data;
  });
})