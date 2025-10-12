// DSL Parser and execution engine
import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { parser } from "@lezer/javascript";
import { v7 as uuid } from "uuid";
import { Graph, Node } from "../graph";
import { convertGraphToNodysseus } from "../graph-to-nodysseus-converter";
import { NodysseusRuntime } from "../nodysseus/runtime-core";
import {
  MockObject3D,
  applyMockToObject3D,
  createGeometryFromMock,
  mockUtils,
  mockPresets,
} from "../three/MockObject3D";
import {
  getObjectRegistry,
  chainObj3d,
  setRendererForChain,
} from "./object3d-chain";
import * as obj3dChain from "./object3d-chain";
import * as mathChain from "./math-chain";
import { createNode, apply } from "../graph";
import { signal, computed, effect } from "@preact/signals";

// Global map to store function call positions and UUIDs
const functionCallUUIDs = new Map<string, string>();

// Global storage for declared variables across executeDSL calls
const declaredVariables = new Map<string, any>();

// Global tracking of all variable declarations in the document
const allVariableDeclarations = new Map<string, VariableDeclaration>();

// Log to the error panel at the bottom of the page
function logToPanel(
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

      messageDiv.appendChild(timestampSpan);
      messageDiv.appendChild(document.createTextNode(` ${message}`));

      errorMessages.appendChild(messageDiv);
      errorPanel.classList.add("has-errors");

      // Auto-scroll to bottom
      errorMessages.scrollTop = errorMessages.scrollHeight;
    }
  }

  // Also log to console for debugging
  console.log(`[DSL] ${message}`);
}

// Simple hash function for browser compatibility
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Utility: Check if value is a signal
function isSignal(value: any): boolean {
  return (
    value && typeof value === "object" && "value" in value && "peek" in value
  );
}

// Generate deterministic UUID based on position and function name
function generateFunctionUUID(
  functionName: string,
  position: number,
  code: string,
): string {
  const key = `${functionName}:${position}:${code.length}`;
  if (!functionCallUUIDs.has(key)) {
    const hash = simpleHash(key);
    const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12) || "0000"}-${hash.slice(12, 16) || "0000"}-${hash.slice(16, 20) || "0000"}-${hash.slice(20, 32) || "000000000000"}`;
    functionCallUUIDs.set(key, uuid);
    logToPanel(
      `Generated new UUID for ${functionName} at position ${position}: ${uuid}`,
    );
  } else {
    logToPanel(
      `Reusing existing UUID for ${functionName} at position ${position}: ${functionCallUUIDs.get(key)!}`,
    );
  }
  return functionCallUUIDs.get(key)!;
}

// Extract variable declarations from AST
type VariableDeclaration = {
  name: string;
  assignmentExpression: string;
  rhsExpression: string;
  from: number;
  to: number;
};

function extractVariableDeclarations(
  tree: any,
  code: string,
  dslContext: any,
): { declarations: VariableDeclaration[]; rewrittenCode: string } {
  const declarations: VariableDeclaration[] = [];
  let rewrittenCode = code;

  tree.cursor().iterate((node) => {
    if (node.name === "VariableDeclaration") {
      console.log(node, node.node.getChildren("Comment"));
      const declarationText = code.slice(node.from, node.to);
      logToPanel(`🔍 Found variable declaration: ${declarationText}`);

      // Parse the declaration to extract variable name and assignment
      let definition = node.node.getChild("VariableDefinition");
      let variableName = code.slice(definition.from, definition.to);

      // Extract RHS expression using Lezer navigation
      let rhsExpression = "";
      // Navigate through the VariableDefinition to find the assignment
      let child = definition.firstChild;
      while (child) {
        if (child.name === "Equals") {
          // Get the next sibling after the equals sign
          let rhsNode = child.nextSibling;
          if (rhsNode) {
            rhsExpression = code.slice(rhsNode.from, rhsNode.to);
            break;
          }
        }
        child = child.nextSibling;
      }

      declarations.push({
        name: variableName,
        assignmentExpression: declarationText,
        rhsExpression: rhsExpression,
        from: node.from,
        to: node.to,
      });
      logToPanel(`📝 Extracted: ${declarationText} (RHS: ${rhsExpression})`);
    }
  });

  // Collect all variable nodes that need rewriting
  const variableNodes: Array<{
    from: number;
    to: number;
    name: string;
    insertValue?: boolean;
  }> = [];

  tree.cursor().iterate((node) => {
    if (node.name === "VariableName") {
      const varName = code.slice(node.from, node.to);
      // Check if this variable is a signal in the context
      if (
        dslContext[varName] &&
        typeof dslContext[varName] === "object" &&
        "value" in dslContext[varName] &&
        "peek" in dslContext[varName] &&
        !varName.endsWith("_fn") &&
        !varName.startsWith("__codeBlock_")
      ) {
        // Check if it's not already followed by .value
        const afterVar = code.slice(node.to, node.to + 6);
        if (!afterVar.startsWith(".value")) {
          // Check if this is the base of a member expression
          // If followed by a dot (but not .value), we need to insert .value before the property access
          const isBaseMember =
            afterVar.startsWith(".") && !afterVar.startsWith(".value");

          if (isBaseMember) {
            // For member expressions like `something.data`, insert .value before the property
            // so it becomes `something.value.data`
            const dotPosition = node.to;
            variableNodes.push({
              from: node.from,
              to: dotPosition,
              name: varName,
              insertValue: true,
            });
          } else {
            // For standalone variables, add .value at the end
            variableNodes.push({ from: node.from, to: node.to, name: varName });
          }
        }
      }
    }
  });

  // Process replacements in reverse order to maintain correct positions
  variableNodes
    .sort((a, b) => b.from - a.from)
    .forEach((node) => {
      const before = rewrittenCode.slice(0, node.from);
      const after = rewrittenCode.slice(node.to);

      if (node.insertValue) {
        // For member expressions: `something.data` -> `something.value.data`
        rewrittenCode = before + node.name + ".value" + after;
      } else {
        // For standalone variables: `something` -> `something.value`
        rewrittenCode = before + node.name + ".value" + after;
      }
    });

  return { declarations, rewrittenCode };
}

function extractRHSFromAssignment(assignmentExpr: string): string {
  try {
    const tree = parser.parse(assignmentExpr);
    let rhsExpression = "";

    tree.cursor().iterate((node) => {
      if (node.name === "VariableDeclaration") {
        let definition = node.node.getChild("VariableDefinition");
        if (definition) {
          let child = definition.nextSibling;
          while (child) {
            if (child.name === "Equals") {
              let rhsNode = child.nextSibling;
              if (rhsNode) {
                rhsExpression = assignmentExpr.slice(rhsNode.from, rhsNode.to);
                return false; // Break out of iteration
              }
            }
            child = child.nextSibling;
          }
        }
      }
    });

    return rhsExpression || assignmentExpr; // Fallback to full expression
  } catch (error) {
    logToPanel(`❌ Error extracting RHS: ${error}`, "error");
    return assignmentExpr; // Fallback to full expression
  }
}

// Execute variable assignment expression and store result as a signal
function executeVariableAssignment(
  name: string,
  assignmentExpr: string,
  dslContext: any,
  newDepVars,
): any {
  try {
    logToPanel(`🔧 Executing assignment: ${assignmentExpr}`);

    // Check if variable already exists as a signal in the context
    const existingSignal = dslContext[name];

    // Create a value computation function
    const computeValue = () => {
      // Create an updated context that includes the current dsl context
      const fullContext = { ...dslContext };

      logToPanel(
        `🔧 Assignment context has ${Object.keys(fullContext).length} items`,
      );

      // For re-execution, only evaluate the RHS to avoid "already declared" errors
      const rhsExpression = extractRHSFromAssignment(assignmentExpr);

      // Create a function to execute just the RHS expression
      const func = new Function(
        ...Object.keys(fullContext),
        `return ${rhsExpression}`,
      );

      const result = func(...Object.values(fullContext));
      logToPanel(`✅ Assignment result: ${typeof result}`);
      return result;
    };

    // If the variable already exists as a signal, update its value
    if (isSignal(existingSignal)) {
      logToPanel(`🔄 Updating existing signal for variable '${name}'`);
      if (newDepVars.length > 0) {
        // For variables with dependencies, update the function signal
        const functionSignalKey = `${name}_fn`;
        const rhsExpression = extractRHSFromAssignment(assignmentExpr);

        // Transform RHS expression to work with parameters instead of .value access
        let transformedRHS = rhsExpression;
        for (const dep of newDepVars) {
          // Replace dep.value with just dep (parameter name)
          transformedRHS = transformedRHS.replace(
            new RegExp(`\\b${dep}\\.value\\b`, "g"),
            dep,
          );
        }

        // Create higher-order function with access to DSL context
        const functionBody = `return (${newDepVars.join(", ")}) => ${transformedRHS}`;
        const computeFunction = new Function(
          ...Object.keys(dslContext),
          functionBody,
        )(...Object.values(dslContext));

        // Check if function signal exists, update or create it
        const existingFunctionSignal = dslContext[functionSignalKey];
        if (isSignal(existingFunctionSignal)) {
          // Update existing function signal
          existingFunctionSignal.value = computeFunction;
          logToPanel(`🔄 Updated function signal: ${functionSignalKey}`);
        } else {
          // Create new function signal
          dslContext[functionSignalKey] = signal(computeFunction);
          logToPanel(`🆕 Created new function signal: ${functionSignalKey}`);
        }

        // The computed signal should still exist and will auto-update
        return existingSignal;
      } else {
        // For simple signals, just update the value
        existingSignal.value = computeValue();
        return existingSignal;
      }
    }

    // Create new signal
    logToPanel(`🆕 Creating new signal for variable '${name}'`);
    let newSignal;
    if (newDepVars.length > 0) {
      // For variables with dependencies, create function signal + computed signal
      const functionSignalKey = `${name}_fn`;
      const rhsExpression = extractRHSFromAssignment(assignmentExpr);

      // Transform RHS expression to work with parameters instead of .value access
      let transformedRHS = rhsExpression;
      for (const dep of newDepVars) {
        // Replace dep.value with just dep (parameter name)
        transformedRHS = transformedRHS.replace(
          new RegExp(`\\b${dep}\\.value\\b`, "g"),
          dep,
        );
      }

      // Create higher-order function with access to DSL context
      const functionBody = `return (${newDepVars.join(", ")}) => ${transformedRHS}`;
      const computeFunction = new Function(
        ...Object.keys(dslContext),
        functionBody,
      )(...Object.values(dslContext));

      // Create the function signal
      const functionSignal = signal(computeFunction);
      dslContext[functionSignalKey] = functionSignal;

      // Create the computed signal that uses the function signal
      const computedValue = () => {
        const deps = newDepVars.map((dep) => dslContext[dep].value);
        return dslContext[functionSignalKey].value(...deps);
      };

      newSignal = computed(computedValue);
      logToPanel(
        `🔧 Created function signal: ${functionSignalKey} and computed: ${name}`,
      );
    } else {
      newSignal = signal(computeValue());
    }

    // Store the signal directly in the DSL context
    dslContext[name] = newSignal;

    // Also maintain backward compatibility with global map
    declaredVariables.set(name, newSignal);

    return newSignal;
  } catch (error) {
    logToPanel(`❌ Assignment execution error: ${error}`, "error");
    if (error instanceof Error && error.stack) {
      logToPanel(`Stack trace: ${error.stack}`, "error");
    }
    return null;
  }
}

// Update DSL context with declared variables (now signals)
function updateDslContext(context: any): any {
  const updatedContext = { ...context };

  // Add declared variable signals from global map for backward compatibility
  // (These may not be in the context yet if they were created via the old path)
  for (const [name, signal] of declaredVariables.entries()) {
    if (!updatedContext[name]) {
      updatedContext[name] = signal;
      logToPanel(`📦 Added variable signal to context: ${name}`);
    }
  }

  // Count signals already in context (both variables and code blocks)
  const signalCount = Object.keys(updatedContext).filter((key) => {
    return isSignal(updatedContext[key]);
  }).length;

  logToPanel(
    `🔧 Context now has ${Object.keys(updatedContext).length} items (${signalCount} signals)`,
  );

  return updatedContext;
}

// Clear all declared variables (useful for testing)
function clearDslVariables(): void {
  declaredVariables.clear();
  allVariableDeclarations.clear();
  logToPanel("🗑️ Cleared all declared variables");
}

// Scan entire document for all variable declarations
function scanAllVariableDeclarations(
  code: string,
): Map<string, VariableDeclaration> {
  try {
    const tree = parser.parse(code);
    const declarations = new Map<string, VariableDeclaration>();

    // Use empty context for scanning - we don't rewrite during scanning
    const { declarations: extractedDeclarations } = extractVariableDeclarations(
      tree,
      code,
      {},
    );
    for (const declaration of extractedDeclarations) {
      declarations.set(declaration.name, declaration);
      logToPanel(`📋 Tracked variable declaration: ${declaration.name}`);
    }

    logToPanel(`📋 Total tracked declarations: ${declarations.size}`);
    return declarations;
  } catch (error) {
    logToPanel(`❌ Error scanning variable declarations: ${error}`, "error");
    return new Map();
  }
}

// Find variable references in code that aren't in the current context
function findMissingVariables(
  code: string,
  dslContext: any,
  declarations: Map<string, VariableDeclaration>,
): string[] {
  try {
    const tree = parser.parse(code);
    const missingVariables: string[] = [];
    const contextKeys = new Set([
      ...Object.keys(dslContext),
      ...declaredVariables.keys(),
      // Add common globals that should be ignored
      "Math",
      "console",
      "THREE",
      "undefined",
      "null",
      "true",
      "false",
    ]);

    tree.cursor().iterate((node) => {
      if (node.name === "VariableName") {
        const variableName = code.slice(node.from, node.to);
        console.log("found variable", variableName);

        // Check if this variable is missing from context but exists in declarations
        if (
          !contextKeys.has(variableName) &&
          declarations.has(variableName) &&
          !missingVariables.includes(variableName)
        ) {
          missingVariables.push(variableName);
          logToPanel(`🔍 Found missing variable: ${variableName}`);
        }
      }
    });

    return missingVariables;
  } catch (error) {
    logToPanel(`❌ Error finding missing variables: ${error}`, "error");
    return [];
  }
}

// Find variable dependencies in code that ARE available in the current context
function findVariableDependencies(code: string, dslContext: any): string[] {
  try {
    const tree = parser.parse(code);
    const dependencies: string[] = [];
    const contextKeys = new Set([
      ...Object.keys(dslContext),
      ...declaredVariables.keys(),
    ]);

    // Common globals that should be ignored as dependencies
    const globalIgnoreList = new Set([
      "Math",
      "console",
      "THREE",
      "undefined",
      "null",
      "true",
      "false",
    ]);

    tree.cursor().iterate((node) => {
      if (node.name === "VariableName") {
        const variableName = code.slice(node.from, node.to);

        // Check if this variable exists in context and is not a global we should ignore
        if (
          contextKeys.has(variableName) &&
          !globalIgnoreList.has(variableName) &&
          !dependencies.includes(variableName)
        ) {
          dependencies.push(variableName);
          logToPanel(`🔗 Found dependency: ${variableName}`);
        }
      }
    });

    return dependencies;
  } catch (error) {
    logToPanel(`❌ Error finding variable dependencies: ${error}`, "error");
    return [];
  }
}

// Execute variable declarations for missing dependencies using recursive executeDSL
function executeMissingDependencies(
  missingVariables: string[],
  dslContext: any,
  declarations: Map<string, VariableDeclaration>,
  fullDocumentCode: string,
): void {
  for (const varName of missingVariables) {
    const declaration = declarations.get(varName);
    if (declaration && !declaredVariables.has(varName)) {
      logToPanel(`🔧 Auto-executing dependency: ${varName}`);

      // Use executeDSL recursively to handle dependencies of dependencies
      try {
        // Don't execute the full declaration, just check its dependencies
        const assignmentExpression = declaration.assignmentExpression;

        // Find dependencies of this variable declaration
        const depMissingVars = findMissingVariables(
          assignmentExpression,
          dslContext,
          declarations,
        );
        const newDepVars = depMissingVars.filter(
          (dep) => !declaredVariables.has(dep) && dep !== varName,
        );

        if (newDepVars.length > 0) {
          logToPanel(
            `🔧 Variable '${varName}' has ${newDepVars.length} dependencies, resolving them first`,
          );
          executeMissingDependencies(
            newDepVars,
            dslContext,
            declarations,
            fullDocumentCode,
          );
        }

        // Now execute the variable assignment with all dependencies resolved
        const assignmentResult = executeVariableAssignment(
          varName,
          declaration.assignmentExpression,
          dslContext,
          newDepVars,
        );

        if (assignmentResult !== null) {
          declaredVariables.set(varName, assignmentResult);
          logToPanel(
            `✅ Auto-executed variable '${varName}' with dependencies`,
          );
        }
      } catch (error) {
        logToPanel(`❌ Failed to auto-execute '${varName}': ${error}`, "error");
      }
    }
  }
}

// Simple DSL parser that evaluates code with functional context
export function parseDSL(code: string, dslContext: any): any {
  try {
    // Clear previous logs for this parse session
    logToPanel("🔄 Starting DSL parsing...");

    // Clean up the code by trimming whitespace and handling multiline expressions
    let cleanCode = code.trim();
    logToPanel(`📝 Input code: ${cleanCode}`);

    // Parse with @lezer/javascript to get AST
    logToPanel("🌳 Parsing with Lezer JavaScript parser...");
    const tree = parser.parse(cleanCode);

    // Log detailed AST structure
    logToPanel("=== Lezer Parser Output ===");
    logToPanel(
      `AST Root: ${tree.topNode.name} (${tree.topNode.from}-${tree.topNode.to})`,
    );

    // Walk the entire tree to show structure
    const astNodes: Array<{
      name: string;
      from: number;
      to: number;
      depth: number;
      text: string;
    }> = [];
    const walkTree = (node: any, depth: number = 0) => {
      const nodeText = cleanCode.slice(node.from, node.to);
      astNodes.push({
        name: node.name,
        from: node.from,
        to: node.to,
        depth: depth,
        text: nodeText.length > 50 ? nodeText.slice(0, 50) + "..." : nodeText,
      });

      if (node.firstChild) {
        let child = node.firstChild;
        do {
          walkTree(child, depth + 1);
          child = child.nextSibling;
        } while (child);
      }
    };

    walkTree(tree.topNode);

    // Check for parse errors by looking for error nodes
    const hasError = astNodes.some((node) => node.name === "⚠");
    if (hasError) {
      logToPanel("⚠️  Parse tree contains errors!", "warn");
    } else {
      logToPanel("✅ Parse successful!");
    }

    // Log AST structure
    logToPanel("🏗️  AST Structure:");
    astNodes.forEach((node) => {
      const indent = "  ".repeat(node.depth);
      logToPanel(
        `${indent}${node.name} (${node.from}-${node.to}): "${node.text}"`,
      );
    });

    // Check for variable declarations and process them, getting rewritten code
    const { declarations: variableDeclarations, rewrittenCode } =
      extractVariableDeclarations(tree, cleanCode, dslContext);

    // Use the rewritten code for further processing
    cleanCode = rewrittenCode;

    if (variableDeclarations.length > 0) {
      logToPanel(
        `🔧 Processing ${variableDeclarations.length} variable declaration(s)...`,
      );

      for (const declaration of variableDeclarations) {
        // Find dependencies in the RHS expression using our new dependency finder
        const dependencies = findVariableDependencies(
          declaration.rhsExpression,
          dslContext,
        );

        // Execute the assignment expression with current DSL context
        const assignmentResult = executeVariableAssignment(
          declaration.name,
          declaration.assignmentExpression,
          dslContext,
          dependencies,
        );

        if (assignmentResult !== null) {
          // Signal is already stored in dslContext by executeVariableAssignment
          logToPanel(`✅ Variable '${declaration.name}' declared and stored`);
        } else {
          logToPanel(
            `❌ Failed to execute assignment for '${declaration.name}'`,
            "error",
          );
        }
      }

      // If we processed variable declarations, return the last assignment result
      // This matches the behavior of executing "const x = value" which should return the value
      if (variableDeclarations.length === 1) {
        return dslContext[variableDeclarations[0].name];
      }
      // For multiple declarations, return null (similar to how JavaScript handles it)
      return null;
    }

    // Walk the tree to find function calls and generate UUIDs for frame() calls
    const functionCalls: Array<{
      name: string;
      from: number;
      to: number;
      uuid?: string;
    }> = [];
    let modifiedCode = cleanCode;
    let offset = 0;

    tree.cursor().iterate((node) => {
      if (node.name === "CallExpression") {
        const callText = cleanCode.slice(node.from, node.to);
        // Extract function name from the call expression
        const funcNameMatch = callText.match(/^(\w+)/);
        if (funcNameMatch) {
          const functionName = funcNameMatch[1];
          const callInfo: {
            name: string;
            from: number;
            to: number;
            uuid?: string;
          } = {
            name: functionName,
            from: node.from,
            to: node.to,
          };

          // Generate stable UUID for frame() calls
          if (functionName === "frame") {
            const genuuid = uuid();
            callInfo.uuid = genuuid;

            // Replace frame() with frame("uuid") in the code
            if (callText === "frame()") {
              const replacement = `frame("${genuuid}")`;
              const adjustedFrom = node.from + offset;
              const adjustedTo = node.to + offset;
              modifiedCode =
                modifiedCode.slice(0, adjustedFrom) +
                replacement +
                modifiedCode.slice(adjustedTo);
              offset += replacement.length - callText.length;
            }
          }

          functionCalls.push(callInfo);
        }
      }
    });

    logToPanel("🔍 Function calls found:");
    functionCalls.forEach((call) => {
      const callText = cleanCode.slice(call.from, call.to);
      logToPanel(
        `  📞 ${call.name} at ${call.from}-${call.to}: "${callText}"${call.uuid ? ` -> UUID: ${call.uuid}` : ""}`,
      );
    });

    if (modifiedCode !== cleanCode) {
      logToPanel(`🔄 Modified code: ${modifiedCode}`);
    }

    logToPanel("⚡ Executing modified code...");
    console.log("Function calls found:", functionCalls);

    // Check if this code has dependencies (uses variables not in context)
    const missingVariables = findMissingVariables(
      modifiedCode,
      dslContext,
      new Map(), // Empty declarations map since we're checking standalone code
    );

    // Check if this is an assignment expression
    const isAssignmentExpression = /^[\w\s]*=|return\s/.test(
      modifiedCode.trim(),
    );

    // Generate a hash key for this code block
    const codeHash = simpleHash(modifiedCode);
    const codeBlockKey = `__codeBlock_${codeHash}__`;

    let result: any = null;

    if (missingVariables.length === 0) {
      // No dependencies
      if (isAssignmentExpression) {
        // Assignment expression without dependencies - create or update a signal
        logToPanel(
          `📡 Assignment has no dependencies, creating/updating signal: ${codeBlockKey}`,
        );

        const existingSignal = dslContext[codeBlockKey];

        const computeValue = () => {
          // Create a function that has access to the DSL context
          const func = new Function(
            ...Object.keys(dslContext),
            `return ${modifiedCode}`,
          );

          return func(...Object.values(dslContext));
        };

        if (isSignal(existingSignal)) {
          // Update existing signal
          logToPanel(`🔄 Updating existing code block signal`);
          existingSignal.value = computeValue();
          result = existingSignal.value;
        } else {
          // Create new signal
          logToPanel(`🆕 Creating new code block signal`);
          const newSignal = signal(computeValue());
          dslContext[codeBlockKey] = newSignal;
          result = newSignal.value;
        }
      } else {
        // Non-assignment expression without dependencies - use effect
        logToPanel(`⚡ Non-assignment has no dependencies, using effect()`);
        effect(() => {
          const func = new Function(
            ...Object.keys(dslContext),
            `return ${modifiedCode}`,
          );
          result = func(...Object.values(dslContext));
        });
      }
    } else {
      // Has dependencies
      if (isAssignmentExpression) {
        // Assignment expression with dependencies - use computed
        logToPanel(
          `🔗 Assignment with dependencies: ${missingVariables.join(", ")}, using computed()`,
        );

        const computeValue = () => {
          // Create a function that has access to the DSL context
          const func = new Function(
            ...Object.keys(dslContext),
            `return ${modifiedCode}`,
          );

          return func(...Object.values(dslContext));
        };

        const computedSignal = computed(computeValue);
        dslContext[codeBlockKey] = computedSignal;
        result = computedSignal.value;
      } else {
        // Non-assignment expression with dependencies - use effect
        logToPanel(
          `🔗 Non-assignment with dependencies: ${missingVariables.join(", ")}, using effect()`,
        );
        effect(() => {
          // Create a function that has access to the DSL context
          const func = new Function(
            ...Object.keys(dslContext),
            `return ${modifiedCode}`,
          );

          // Execute the function and store the result (which could be a Node<T>)
          result = func(...Object.values(dslContext));
        });
      }
    }

    logToPanel("✅ DSL parsing completed successfully!");
    return result;
  } catch (error) {
    logToPanel(`❌ DSL parsing error: ${error}`, "error");
    console.error("DSL parsing error:", error);
    return null;
  }
}

// Important that this isn't created every time executeDSL is called!
const runtime = new NodysseusRuntime();

// Compute init function based on compute-example/compute-init.js
function computeInit(
  count: number,
  buffers,
  instanced: boolean,
  particleNum?: number,
) {
  const particleSize = 2;
  const bufferTypeSizes = {
    vec2: 2,
    vec3: 3,
    float: 1,
  };

  const createBuffer = (bufferType: string) => {
    console.log("is instanced", instanced);
    const buffer = instanced
      ? new THREE.StorageInstancedBufferAttribute(
          count,
          bufferTypeSizes[bufferType],
        )
      : new THREE.StorageBufferAttribute(count, bufferTypeSizes[bufferType]);
    const node = THREE.TSL.storage(buffer, bufferType, count);

    return node;
  };

  const createdBuffers = Object.fromEntries(
    Object.entries(buffers).map(([name, type]) => [
      name,
      createBuffer(type as string),
    ]),
  );
  const nodes = Object.fromEntries(
    Object.entries(buffers).map(([name, type]) => [
      name,
      createdBuffers[name].element(THREE.TSL.instanceIndex),
    ]),
  );

  const computeInitFn = THREE.TSL.Fn(() => {
    const { float, vec2, instanceIndex, timerGlobal, rand, vec3, div, time } =
      THREE.TSL;
    const particleIndex = float(instanceIndex);

    // Initialize with random position in a larger area
    const randomX = rand(particleIndex.mul(0.1547)); // -4 to 4
    const randomY = rand(particleIndex.mul(0.7834)); // -4 to 4
    const randomZ = rand(particleIndex.mul(0.9123)); // -2 to 2

    // // Initialize with very small random velocity
    const velMul = 0.02; // Much smaller initial velocity
    const randomAngle = rand(particleIndex.mul(0.4567)).mul(Math.PI * 2);
    const randomSpeed = rand(particleIndex.mul(0.2341)).mul(velMul);

    const velX = randomAngle.sin().mul(randomSpeed);
    const velY = randomAngle.cos().mul(randomSpeed);
    const velZ = rand(particleIndex.mul(0.6789))
      .mul(velMul * 0.5)
      .sub(velMul * 0.25);

    // Set initial position to random location
    console.log("assigning pos");
    nodes.position.assign(vec3(randomX, randomY, randomZ));

    // // Set initial velocity to small random values
    nodes.velocity.assign(vec3(velX, velY, velZ));

    nodes.color.assign(vec3(1));

    nodes.birthTime.assign(time);
    nodes.lifespan.assign(rand(particleIndex).mul(10).add(5)); // 5-15 seconds lifespan
  })().compute(count);

  // Create frame update compute function
  const computeUpdateFn = THREE.TSL.Fn(() => {
    const {
      uniform,
      vec2,
      vec3,
      vec4,
      instanceIndex,
      float,
      timerGlobal,
      add,
      mul,
      sub,
      rand,
      abs,
      int,
      trunc,
      fract,
      mix,
      clamp,
      time,
    } = THREE.TSL;

    const particle = nodes.position;
    const velocity = nodes.velocity;
    const particleIndex = float(instanceIndex);

    const limit = uniform(vec3(4, 4, 2));
    const position = particle.add(velocity).toVar();

    const forceMul = rand(particleIndex).mul(0.08).add(0.9).mul(0);
    velocity.assign(mul(velocity, float(1).sub(forceMul).mul(0.04).add(0.95)));

    if (nodes.force) {
      velocity.assign(add(velocity, nodes.force));
    }

    const age = sub(time, nodes.birthTime);
    const isDead = age.greaterThanEqual(nodes.lifespan);

    createdBuffers.color.element(instanceIndex).assign(nodes.color);

    const randomAngle = rand(particleIndex.div(4)).mul(Math.PI * 2);
    const velMul = 0.04;
    const randomSpeed = rand(particleIndex)
      .mul(velMul)
      .add(velMul * 0.2);
    const velX = randomAngle.sin().mul(randomSpeed);
    const velY = randomAngle.cos().mul(randomSpeed);

    position.assign(
      isDead.select(
        (nodes.spawnPosition ?? vec3(0)).add(
          vec3(
            rand(particleIndex.mul(0.254)),
            rand(particleIndex.mul(0.928824)),
            rand(particleIndex.mul(10.254)),
          ).mul(0.1),
        ),
        position,
      ),
    );

    velocity.assign(isDead.select(vec3(velX, velY, 0), velocity));

    nodes.birthTime.assign(isDead.select(time, nodes.birthTime));

    createdBuffers.position.element(instanceIndex).assign(position);
    createdBuffers.velocity.element(instanceIndex).assign(velocity);
    createdBuffers.color.element(instanceIndex).assign(nodes.color);
  })().compute(count);

  defaultRenderer?.compute(computeInitFn);

  console.log("creating compute", {
    createdBuffers,
    nodes,
    particleNum,
    count,
  });

  // Log the created buffers in detail
  console.log("Created buffers:", createdBuffers);
  Object.entries(createdBuffers).forEach(([name, buffer]) => {
    console.log(`Buffer ${name}:`, buffer);
  });

  return {
    buffers: createdBuffers,
    nodes,
    count,
    computeUpdate: computeUpdateFn,
  };
}

// Points from nodes function based on compute-example/pointsMaterialFromNodes.js
function pointsFromNodes(buffers: any, nodes: any, count) {
  const pointsMaterial = new THREE.SpriteNodeMaterial();

  // Handle existing material properties if provided
  // for compute particles
  pointsMaterial.userData.count = count;

  console.log("running mat update");

  // Update position buffer reference if changed
  if (pointsMaterial.userData.positionBuffer !== buffers.position) {
    pointsMaterial.userData.positionBuffer = buffers.position;
    pointsMaterial.vertexColors = true;
    pointsMaterial.sizeAttenuation = true;
  }

  // Set material nodes
  console.log(nodes, buffers);
  pointsMaterial.positionNode = TSL.instancedBufferAttribute(
    buffers.position.value,
  );
  pointsMaterial.colorNode = TSL.vec3(1);
  pointsMaterial.scaleNode = nodes.size ?? THREE.TSL.vec3(0.1);

  pointsMaterial.userData.count = buffers.position.value.count;

  pointsMaterial.opacityNode = TSL.float(1);
  // pointsMaterial.blending = THREE.AdditiveBlending;

  pointsMaterial.needsUpdate = true;

  // Create sprite with the points material
  const pts = new THREE.Sprite(pointsMaterial);
  if (pointsMaterial.userData.count) {
    // for compute particles
    pts.count = pointsMaterial.userData.count;
  }

  // Set up animation loop for compute updates
  let animationId: number | null = null;

  const setupAnimation = (renderer: any) => {
    if (!renderer || animationId) return;

    const recompute = () => {
      if (nodes.computeUpdate) {
        renderer.compute(nodes.computeUpdate);
      }
      animationId = requestAnimationFrame(recompute);
    };

    // Start the animation loop

    renderer.compute(nodes.computeUpdate);
    animationId = requestAnimationFrame(recompute);
  };

  const stopAnimation = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  };

  // Return a Node<MockObject3D> using apply() to match mesh() exactly
  return apply(
    () => {
      // Create a MockObject3D that contains the sprite information
      const mockObject: MockObject3D = {
        geometry: undefined, // Points don't use traditional geometry
        userData: {
          material: pointsMaterial,
          sprite: pts, // Store the sprite in userData so render can access it
          isParticleSystem: true,
          setupAnimation,
          stopAnimation,
          nodes, // Include nodes for access to computeUpdate
        },
      };
      return mockObject;
    },
    [], // No dependencies since we're creating the sprite directly
    chainObj3d,
  );
}

// Execute DSL code and run the graph if the result is a Node
// Create a DSL context with all the functional versions
function createDslContext(renderer?: any): any {
  return {
    // Object3D functions
    sphere: obj3dChain.sphere,
    box: obj3dChain.box,
    cylinder: obj3dChain.cylinder,
    material: obj3dChain.material,
    mesh: obj3dChain.mesh,
    translateX: obj3dChain.translateX,
    translateY: obj3dChain.translateY,
    translateZ: obj3dChain.translateZ,
    rotateX: obj3dChain.rotateX,
    rotateY: obj3dChain.rotateY,
    rotateZ: obj3dChain.rotateZ,
    applyMock: obj3dChain.applyMock,
    render: obj3dChain.render,

    // Math functions
    frame: mathChain.frame,
    mult: mathChain.mult,
    add: mathChain.add,
    sub: mathChain.sub,
    div: mathChain.div,
    mathAbs: mathChain.mathAbs,
    mathAcos: mathChain.mathAcos,
    mathAcosh: mathChain.mathAcosh,
    mathAsin: mathChain.mathAsin,
    mathAsinh: mathChain.mathAsinh,
    mathAtan: mathChain.mathAtan,
    mathAtan2: mathChain.mathAtan2,
    mathAtanh: mathChain.mathAtanh,
    mathCbrt: mathChain.mathCbrt,
    mathCeil: mathChain.mathCeil,
    mathClz32: mathChain.mathClz32,
    mathCos: mathChain.mathCos,
    mathCosh: mathChain.mathCosh,
    mathExp: mathChain.mathExp,
    mathExpm1: mathChain.mathExpm1,
    mathFloor: mathChain.mathFloor,
    mathFround: mathChain.mathFround,
    mathHypot: mathChain.mathHypot,
    mathImul: mathChain.mathImul,
    mathLog: mathChain.mathLog,
    mathLog10: mathChain.mathLog10,
    mathLog1p: mathChain.mathLog1p,
    mathLog2: mathChain.mathLog2,
    mathMax: mathChain.mathMax,
    mathMin: mathChain.mathMin,
    mathPow: mathChain.mathPow,
    mathRandom: mathChain.mathRandom,
    mathRound: mathChain.mathRound,
    mathSign: mathChain.mathSign,
    mathSin: mathChain.mathSin,
    mathSinh: mathChain.mathSinh,
    mathSqrt: mathChain.mathSqrt,
    mathTan: mathChain.mathTan,
    mathTanh: mathChain.mathTanh,
    mathTrunc: mathChain.mathTrunc,

    // Utilities
    mockUtils,
    mockPresets,
    clearAll: obj3dChain.clearAll,
    Graph,
    Math,
    console,
    THREE,

    // Compute functions
    computeInit,
    pointsFromNodes,

    // Renderer (if provided)
    ...(renderer && { renderer }),
  };
}

// Default renderer for backward compatibility
let defaultRenderer: any = null;

// Create default context for backward compatibility - this is no longer mutated directly
const defaultDslContext = createDslContext();
console.log(defaultDslContext);

// Internal function that handles recursive dependency resolution
function executeDSLInternal(
  code: string,
  dslContextParam: any,
  declarations: Map<string, VariableDeclaration>,
  fullDocumentCode: string,
  currentlyResolving: Set<string> = new Set(),
): THREE.Object3D | null {
  try {
    // Start with provided context
    const baseContext = dslContextParam;

    // Update context to include any previously declared variables
    const contextToUse = updateDslContext(baseContext);

    // Find missing dependencies and execute them first
    const missingVariables = findMissingVariables(
      code,
      contextToUse,
      declarations,
    );

    // Filter out variables we're currently resolving to prevent infinite loops
    const newMissingVariables = missingVariables.filter(
      (varName) => !currentlyResolving.has(varName),
    );

    if (newMissingVariables.length > 0) {
      logToPanel(
        `🔧 Found ${newMissingVariables.length} missing dependencies, executing them first`,
      );

      // Add current variables to the resolving set
      const newResolvingSet = new Set([
        ...currentlyResolving,
        ...newMissingVariables,
      ]);

      executeMissingDependencies(
        newMissingVariables,
        contextToUse,
        declarations,
        fullDocumentCode,
      );

      // Update context again after executing dependencies
      const updatedContext = updateDslContext(baseContext);
      const result = parseDSL(code, updatedContext);
      return processResult(result);
    }

    const result = parseDSL(code, contextToUse);
    return processResult(result);
  } catch (error) {
    console.error("DSL execution error:", error);
    return null;
  }
}

export function executeDSL(
  code: string,
  dslContextParam?: any,
  fullDocumentCode?: string,
): THREE.Object3D | null {
  try {
    // Start with provided context or create a default context with current renderer
    const baseContext = dslContextParam || createDslContext(defaultRenderer);

    // If we have the full document, scan it for all variable declarations
    let declarations = new Map<string, VariableDeclaration>();
    if (fullDocumentCode) {
      declarations = scanAllVariableDeclarations(fullDocumentCode);
      // Update the global map for backward compatibility
      allVariableDeclarations.clear();
      for (const [key, value] of declarations) {
        allVariableDeclarations.set(key, value);
      }
    }

    return executeDSLInternal(
      code,
      baseContext,
      declarations,
      fullDocumentCode || "",
      new Set(),
    );
  } catch (error) {
    console.error("DSL execution error:", error);
    return null;
  }
}

// Helper function to process the result (extracted from original executeDSL)
function processResult(result: any): THREE.Object3D | null {
  try {
    const objectRegistry = getObjectRegistry();

    // If the result is a Node, try direct Graph.run execution first
    if (
      result &&
      typeof result === "object" &&
      "value" in result &&
      "dependencies" in result
    ) {
      // Convert the graph to Nodysseus format
      const nodysseusGraph = convertGraphToNodysseus(result);
      // Grab the name and use it as the graph id so that it caches.
      if (
        result.dependencies &&
        result.dependencies.length > 1 &&
        result.dependencies[1] &&
        result.dependencies[1].value
      ) {
        nodysseusGraph.id = result.dependencies[1].value;
      } else {
        // Fallback to generating a unique ID if dependencies[1].value is not available
        nodysseusGraph.id = nodysseusGraph.id || `graph-${Date.now()}`;
      }

      // Re-execute with the named graph
      const finalComputed = runtime.runGraphNode(
        nodysseusGraph,
        nodysseusGraph.out!,
      );

      // Set up watch for frame updates only if graph contains frame nodes AND results in a rendered object
      const graphContainsFrame =
        JSON.stringify(result).includes("extern.frame");
      if (graphContainsFrame && finalComputed instanceof THREE.Object3D) {
        const objectName = nodysseusGraph.id;
        const renderNodeId = nodysseusGraph.out!;
        const renderInputEdges = nodysseusGraph.edges_in?.[renderNodeId];

        if (renderInputEdges) {
          // Find the edge that represents the first argument (the MockObject3D)
          let mockObjectNodeId: string | null = null;
          for (const [fromNodeId, edge] of Object.entries(renderInputEdges)) {
            if (edge.as === "arg0") {
              mockObjectNodeId = fromNodeId;
              break;
            }
          }

          if (mockObjectNodeId) {
            const scopeKey = nodysseusGraph.id + "/" + mockObjectNodeId;
            const nodeToWatch = runtime.scope.get(scopeKey);

            if (nodeToWatch && objectRegistry.has(objectName)) {
              runtime.stopWatch(nodeToWatch);
              const watch = runtime.createWatch<MockObject3D>(nodeToWatch);

              // Start watching for frame updates
              (async () => {
                try {
                  for await (const updatedValue of watch) {
                    const existingObject = objectRegistry.get(objectName);
                    if (existingObject) {
                      applyMockToObject3D(existingObject, updatedValue);
                    } else {
                      // Break the watch loop if object is no longer in registry
                      break;
                    }
                  }
                } catch (error) {
                  console.warn("Watch loop error:", error);
                }
              })();
            }
          }
        }
      }

      return finalComputed;
    }

    // Otherwise return the result if it's already an Object3D or MockObject3D
    if (result instanceof THREE.Object3D) {
      return result;
    }

    // If it's a MockObject3D, convert it to a real Object3D
    if (result && typeof result === "object" && "geometry" in result) {
      let realObject: THREE.Object3D;
      if (result.geometry && result.userData?.material) {
        const geometry = createGeometryFromMock(result.geometry);
        const material = result.userData.material;
        realObject = new THREE.Mesh(geometry, material);
      } else {
        realObject = new THREE.Object3D();
      }
      applyMockToObject3D(realObject, result);
      return realObject;
    }

    return null;
  } catch (error) {
    console.error("DSL execution error:", error);
    return null;
  }
}

// Export logToPanel for use in other modules
export { logToPanel };

// Set renderer for DSL context
export function setRenderer(renderer: any): void {
  defaultRenderer = renderer;
  setRendererForChain(renderer);
}

// Export dslContext for external use
export { defaultDslContext as dslContext };

// Export variable declaration utility functions for external use
export { clearDslVariables, declaredVariables };
