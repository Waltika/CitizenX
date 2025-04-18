// CSS to ensure UI visibility
export const style = document.createElement('style');
style.textContent = `
  #annotation-app {
    position: fixed !important;
    bottom: 16px !important;
    right: 16px !important;
    background: white !important;
    padding: 16px !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
    max-width: 384px !important;
    min-width: 300px !important;
    min-height: 200px !important;
    z-index: 999999 !important;
    font-family: Arial, sans-serif !important;
    display: block !important;
  }
  #annotation-app textarea {
    width: 100% !important;
    padding: 8px !important;
    border: 1px solid #ccc !important;
    border-radius: 4px !important;
    margin-bottom: 8px !important;
    min-height: 60px !important;
    box-sizing: border-box !important;
  }
  #annotation-app button {
    width: 100% !important;
    background: #3b82f6 !important;
    color: white !important;
    padding: 8px !important;
    border: none !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    font-size: 14px !important;
  }
  #annotation-app button:hover {
    background: #2563eb !important;
  }
  #annotation-app ul {
    max-height: 160px !important;
    overflow-y: auto !important;
    margin-bottom: 16px !important;
    padding: 0 !important;
    list-style: none !important;
  }
  #annotation-app .error {
    color: red !important;
    font-size: 12px !important;
    margin-bottom: 8px !important;
  }
  #annotation-app h2 {
    font-size: 18px !important;
    font-weight: bold !important;
    margin-bottom: 8px !important;
  }
  #annotation-app p {
    font-size: 14px !important;
    margin-bottom: 8px !important;
  }
  #annotation-app li {
    margin-bottom: 8px !important;
  }
`;