function showPopup(message) {
  const msgDiv = document.getElementById('msg');
  if (msgDiv) {
    msgDiv.textContent = message;
    msgDiv.style.display = 'block';
  } else {
    alert(message);
  }
}

// make it global
window.showPopup = showPopup;