// OmniCode Frontend
document.addEventListener('DOMContentLoaded', () => {
  // Health check
  fetch('http://localhost:3000/health')
    .then(r => r.json())
    .then(d => {
      console.log('✓ Backend faol:', d);
    })
    .catch(e => {
      console.warn('⚠ Backend ulanmadi:', e.message);
    });
});
