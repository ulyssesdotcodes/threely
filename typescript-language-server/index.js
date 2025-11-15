import WebSocket, { WebSocketServer } from "ws";
import { TypeScriptLanguageServerProxy } from "./server.js";

const PORT = process.env.PORT || 8081;

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

// Track all active proxies for graceful shutdown
const activeProxies = new Set();

wss.on("connection", (ws) => {
  console.log("New WebSocket client connected");

  // Create a new proxy for this connection
  const proxy = new TypeScriptLanguageServerProxy((message) => {
    // Send message only to this specific client
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });

  // Track the proxy
  activeProxies.add(proxy);

  ws.on("message", (message) => {
    message = JSON.parse(message.toString());
    console.log("Received message from WebSocket client", message);

    proxy.sendMessage(message);
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
    // Shutdown the proxy and remove from tracking
    proxy.shutdown();
    activeProxies.delete(proxy);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

console.log(`WebSocket server listening on port ${PORT}`);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  // Shutdown all active proxies
  activeProxies.forEach((proxy) => {
    proxy.shutdown();
  });
  activeProxies.clear();
  wss.close(() => {
    console.log("WebSocket server closed");
  });
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down gracefully...");
  // Shutdown all active proxies
  activeProxies.forEach((proxy) => {
    proxy.shutdown();
  });
  activeProxies.clear();
  wss.close(() => {
    console.log("WebSocket server closed");
  });
  process.exit(0);
});
