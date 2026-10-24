// Keep the designed field borders instead of the browser's extra inner ring.
if (typeof document !== 'undefined' && !document.getElementById('driver-app-focus-styles')) {
  const stylesheet = document.createElement('style');
  stylesheet.id = 'driver-app-focus-styles';
  stylesheet.textContent = `
    input:focus, textarea:focus, select:focus {
      outline: none !important;
    }
    button:focus:not(:focus-visible), [role="button"]:focus:not(:focus-visible) {
      outline: none !important;
    }
  `;
  document.head.appendChild(stylesheet);
}
