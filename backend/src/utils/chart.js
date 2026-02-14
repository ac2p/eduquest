const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

async function createBarChart(labels, data, title) {
  const width = 800; // px
  const height = 600; // px
  const chartCallback = (ChartJS) => {};
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

  const configuration = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: title,
        data: data,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: false,
      plugins: { legend: { display: true }, title: { display: true, text: title } },
      scales: { y: { beginAtZero: true } }
    }
  };

  return await chartJSNodeCanvas.renderToDataURL(configuration); // returns 'data:image/png;base64,...'
}
module.exports = { createBarChart };