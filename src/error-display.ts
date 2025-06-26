// Error display system for capturing and displaying console errors and warnings

function addErrorMessage(message: string, type: 'error' | 'warn') {
  const errorPanel = document.getElementById('error-panel');
  const errorMessages = document.getElementById('error-messages');
  
  if (!errorPanel || !errorMessages) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `error-message ${type}`;
  
  const timestamp = new Date().toLocaleTimeString();
  messageDiv.innerHTML = `<span class="error-timestamp">${timestamp}</span>${message}`;
  
  errorMessages.appendChild(messageDiv);
  errorPanel.classList.add('has-errors');
  
  // Auto-scroll to bottom
  errorPanel.scrollTop = errorPanel.scrollHeight;
}

export function initErrorDisplay() {
  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Override console.error
  console.error = function(...args: any[]) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    addErrorMessage(message, 'error');
    originalError.apply(console, args);
  };
  
  // Override console.warn
  console.warn = function(...args: any[]) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    addErrorMessage(message, 'warn');
    originalWarn.apply(console, args);
  };
  
  // Add clear function to global scope for the HTML button
  (window as any).clearErrors = function() {
    const errorPanel = document.getElementById('error-panel');
    const errorMessages = document.getElementById('error-messages');
    
    if (errorMessages) {
      errorMessages.innerHTML = '';
    }
    if (errorPanel) {
      errorPanel.classList.remove('has-errors');
    }
  };
}