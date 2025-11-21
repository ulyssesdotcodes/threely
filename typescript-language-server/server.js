import { ChildProcess, spawn } from "child_process";

// Helper to format LSP messages with Content-Length header
export function formatLSPMessage(message) {
  const content = JSON.stringify(message);
  return `Content-Length: ${content.length}\r\n\r\n${content}`;
}

export class TypeScriptLanguageServerProxy {
  constructor(callback) {
    this.tsServer = null;
    this.isRestarting = false;
    this.callback = callback;
    this.buffer = Buffer.alloc(0);
    this.startLanguageServer();
  }

  startLanguageServer() {
    console.log("Starting TypeScript Language Server...");

    this.tsServer = spawn(
      "npx",
      ["typescript-language-server", "--stdio", "--log-level", "4"],
      {
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    this.tsServer.on("error", (error) => {
      console.error("TypeScript Language Server error:", error);
      // this.restartLanguageServer();
    });

    this.tsServer.on("exit", (code, signal) => {
      console.log(
        `TypeScript Language Server exited with code ${code}, signal ${signal}`,
      );
      // Restart if exit was unexpected (non-zero code)
      if (code !== 0 && code !== null && !this.isRestarting) {
        this.restartLanguageServer();
      }
    });

    this.tsServer.stderr.on("data", (data) => {
      const errorMessage = data.toString();
      console.error("TypeScript Language Server stderr:", errorMessage);

      // Check for common error patterns that indicate the server needs restart
      if (this.shouldRestartOnError(errorMessage)) {
        console.error("Error detected in LSP stderr, restarting server...");
        this.restartLanguageServer();
      }
    });

    const dataHandler = (data) => {
      // Append new data to buffer (keep as Buffer for byte-accurate length)
      this.buffer = Buffer.concat([this.buffer, data]);
      console.log(
        "Received data chunk, buffer length (bytes):",
        this.buffer.length,
      );

      // Process all complete messages in the buffer
      while (true) {
        // Convert buffer to string to search for header
        const bufferStr = this.buffer.toString("utf8");
        const headerMatch = bufferStr.match(/^Content-Length: (\d+)\r\n\r\n/);

        if (!headerMatch) {
          console.log(
            "No Content-Length header found at start of buffer, waiting for more data",
          );
          // No Content-Length header yet - wait for more data
          break;
        }

        const contentLength = parseInt(headerMatch[1], 10);
        const headerLength = Buffer.byteLength(headerMatch[0], "utf8");
        console.log(
          "Found Content-Length header:",
          contentLength,
          "bytes, Header length:",
          headerLength,
          "bytes",
        );

        // Check if we have enough data for the complete message
        if (this.buffer.length < headerLength + contentLength) {
          console.log(
            "Incomplete message, waiting for more data. Have:",
            this.buffer.length,
            "Need:",
            headerLength + contentLength,
          );
          // Not enough data yet, wait for more
          break;
        }

        // Extract the complete message content
        const messageBuffer = this.buffer.slice(
          headerLength,
          headerLength + contentLength,
        );
        const messageContent = messageBuffer.toString("utf8");
        console.log(
          "Complete message content length:",
          messageContent.length,
          "chars,",
          messageBuffer.length,
          "bytes",
        );

        // Remove the processed message from buffer
        this.buffer = this.buffer.slice(headerLength + contentLength);
        console.log("Remaining buffer length:", this.buffer.length, "bytes");

        // Parse the message
        try {
          const parsedMessage = JSON.parse(messageContent);
          console.log("Parsed message:", parsedMessage);

          // Call the callback with the parsed message
          if (this.callback) {
            this.callback(parsedMessage);
          }
        } catch (error) {
          console.error("Failed to parse message:", error);
          if (this.callback) {
            this.callback({ error: error.message });
          }
        }
      }
    };

    this.tsServer.stdout.on("data", dataHandler);

    console.log("TypeScript Language Server started");
  }

  shouldRestartOnError(message) {
    // Don't restart if already restarting
    if (this.isRestarting) {
      return false;
    }

    // Common error patterns that indicate server failure
    const errorPatterns = [
      /error/i,
      /exception/i,
      /fatal/i,
      /crash/i,
      /failed/i,
      /cannot/i,
      /ENOENT/i,
      /ECONNREFUSED/i,
    ];

    // Exclude benign patterns (like log messages about errors in user code)
    const benignPatterns = [
      /window\/logMessage/i,
      /textDocument\/publishDiagnostics/i,
    ];

    // Check if message contains benign patterns first
    for (const pattern of benignPatterns) {
      if (pattern.test(message)) {
        return false;
      }
    }

    // Check if message contains error patterns
    for (const pattern of errorPatterns) {
      if (pattern.test(message)) {
        return true;
      }
    }

    return false;
  }

  restartLanguageServer() {
    if (this.isRestarting) {
      return;
    }

    this.isRestarting = true;
    console.log("Restarting TypeScript Language Server...");

    // Kill existing server
    if (this.tsServer && !this.tsServer.killed) {
      this.tsServer.kill();
    }

    // Wait a bit before restarting
    setTimeout(() => {
      this.isRestarting = false;
      this.startLanguageServer();
    }, 1000);
  }

  async sendMessage(message) {
    console.log("Sending", message);
    if (!this.tsServer || this.tsServer.killed) {
      console.error("TypeScript Language Server is not running");
      return;
    }

    // Write message to the language server
    this.tsServer.stdin.write(formatLSPMessage(message));
  }

  shutdown() {
    if (this.tsServer && !this.tsServer.killed) {
      console.log("Shutting down TypeScript Language Server...");
      this.tsServer.kill();
    }
  }
}
