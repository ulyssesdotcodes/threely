import { TypeScriptLanguageServerProxy } from "./server.js";

console.log("tslsp", TypeScriptLanguageServerProxy);

// LSP initialize request following the Language Server Protocol
const initializeRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    processId: null,
    clientInfo: { name: "@codemirror/lsp-client" },
    rootUri: null,
    capabilities: {
      general: { markdown: { parser: "marked" } },
      textDocument: {
        completion: {
          completionItem: {
            snippetSupport: true,
            documentationFormat: ["plaintext", "markdown"],
            insertReplaceSupport: false,
          },
          completionList: {
            itemDefaults: ["commitCharacters", "editRange", "insertTextFormat"],
          },
          completionItemKind: { valueSet: [] },
          contextSupport: true,
        },
        hover: { contentFormat: ["markdown", "plaintext"] },
        formatting: {},
        rename: {},
        signatureHelp: {
          contextSupport: true,
          signatureInformation: {
            documentationFormat: ["markdown", "plaintext"],
            parameterInformation: { labelOffsetSupport: true },
            activeParameterSupport: true,
          },
        },
        definition: {},
        declaration: {},
        implementation: {},
        typeDefinition: {},
        references: {},
        diagnostic: {},
        publishDiagnostics: { versionSupport: true },
      },
      window: { showMessage: {} },
    },
  },
};

// Run the test
console.log("TypeScript Language Server WebSocket Proxy Test");
console.log("================================================\n");

// Track messages received
let messagesReceived = 0;
let initializeResponseReceived = false;

const callback = (message) => {
  messagesReceived++;
  console.log(`\n=== Message received (count: ${messagesReceived}) ===`);
  console.log("Message:", message);

  // Check if this is the initialize response
  if (message.id === 1 && message.result) {
    initializeResponseReceived = true;
    console.log(
      "\n=== Initialize response received, sending initialized notification ===",
    );
    proxy.sendMessage({ jsonrpc: "2.0", method: "initialized", params: {} });
  }
};

const proxy = new TypeScriptLanguageServerProxy(callback);

// Send initialize request
proxy.sendMessage(initializeRequest);

// After 5 seconds, verify we got responses
setTimeout(() => {
  console.log(`\n=== Test completed ===`);
  console.log(`Total messages received: ${messagesReceived}`);
  if (!initializeResponseReceived) {
    console.error(
      "❌ TEST FAILED: No initialize response received from language server",
    );
    process.exit(1);
  } else {
    console.log("✓ TEST PASSED: Initialize response received successfully");
    proxy.shutdown();
    process.exit(0);
  }
}, 5000);
