// UI logging functionality - extracted from parser.ts
// Handles logging to the error panel at the bottom of the page

export function logToPanel(
  message: string,
  type: "info" | "warn" | "error" = "info",
): void {
  if (typeof window !== "undefined" && window.document) {
    const errorPanel = document.getElementById("error-panel");
    const errorMessages = document.getElementById("error-messages");

    if (errorPanel && errorMessages) {
      const messageDiv = document.createElement("div");
      messageDiv.className = `error-message ${type}`;

      const timestamp = new Date().toLocaleTimeString();
      const timestampSpan = document.createElement("span");
      timestampSpan.className = "error-timestamp";
      timestampSpan.textContent = `[${timestamp}]`;

      const messageSpan = document.createElement("span");
      messageSpan.className = "error-text";
      messageSpan.textContent = message;

      messageDiv.appendChild(timestampSpan);
      messageDiv.appendChild(messageSpan);

      errorMessages.appendChild(messageDiv);

      // Show the error panel if it's hidden
      errorPanel.style.display = "block";

      // Auto-scroll to the bottom to show the latest message
      errorMessages.scrollTop = errorMessages.scrollHeight;

      // Also log to console for development
      if (type === "error") {
        console.error(message);
      } else if (type === "warn") {
        console.warn(message);
      } else {
        console.log(message);
      }
    }
  }
}
