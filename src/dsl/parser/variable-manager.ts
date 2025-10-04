// Variable declaration and management - extracted from parser.ts
import { signal, computed } from "@preact/signals";
import { parser } from "@lezer/javascript";
import { logToPanel } from "../../ui/logger";

// Global storage for declared variables across executeDSL calls
const declaredVariables = new Map<string, any>();

// Global tracking of all variable declarations in the document
const allVariableDeclarations = new Map<string, VariableDeclaration>();

export type VariableDeclaration = {
  name: string;
  assignmentExpression: string;
  from: number;
  to: number;
};

// Extract variable declarations from AST
export function extractVariableDeclarations(
  tree: any,
  code: string,
): VariableDeclaration[] {
  const declarations: VariableDeclaration[] = [];

  tree.cursor().iterate((node) => {
    if (node.name === "VariableDeclaration") {
      console.log(node, node.node.getChildren("Comment"));
      const declarationText = code.slice(node.from, node.to);
      logToPanel(`🔍 Found variable declaration: ${declarationText}`);

      // Parse the declaration to extract variable name and assignment
      let definition = node.node.getChild("VariableDefinition");
      let variableName = code.slice(definition.from, definition.to);
      declarations.push({
        name: variableName,
        assignmentExpression: declarationText,
        from: node.from,
        to: node.to,
      });
      logToPanel(`📝 Extracted: ${declarationText}`);
    }
  });

  return declarations;
}

// Execute variable assignment expression and store result as a signal
export function executeVariableAssignment(
  name: string,
  assignmentExpr: string,
  dslContext: any,
  newDepVars: string[],
): any {
  try {
    logToPanel(`🔧 Executing assignment: ${assignmentExpr}`);

    // Create a computed signal that will reactively execute the assignment
    const valueThunk = () => {
      // Create an updated context that includes both the base DSL context
      // and any previously declared variables
      const fullContext = { ...dslContext };
      for (const [varName, varSignal] of declaredVariables.entries()) {
        fullContext[varName] = varSignal;
      }

      logToPanel(
        `🔧 Assignment context has ${Object.keys(fullContext).length} items`,
      );

      // Create a function to execute the assignment expression
      const func = new Function(
        ...Object.keys(fullContext),
        `${assignmentExpr}; return ${name}`,
      );

      const result = func(...Object.values(fullContext));
      logToPanel(`✅ Assignment result: ${typeof result}`);
      return result;
    };

    if (newDepVars.length > 0) {
      return computed(valueThunk);
    } else {
      return signal(valueThunk());
    }
  } catch (error) {
    logToPanel(`❌ Assignment execution error: ${error}`, "error");
    if (error instanceof Error && error.stack) {
      logToPanel(`Stack trace: ${error.stack}`, "error");
    }
    return null;
  }
}

// Update DSL context with declared variables (now signals)
export function updateDslContext(context: any): any {
  const updatedContext = { ...context };

  // Add all declared variable signals to the context
  for (const [name, signal] of declaredVariables.entries()) {
    updatedContext[name] = signal;
    logToPanel(`📦 Added variable signal to context: ${name}`);
  }

  logToPanel(
    `🔧 Context now has ${Object.keys(updatedContext).length} items (${declaredVariables.size} declared variable signals)`,
  );

  return updatedContext;
}

// Scan the entire document for all variable declarations
export function scanAllVariableDeclarations(
  fullDocumentCode: string,
): Map<string, VariableDeclaration> {
  const declarations = new Map<string, VariableDeclaration>();

  try {
    const tree = parser.parse(fullDocumentCode);
    const extracted = extractVariableDeclarations(tree, fullDocumentCode);

    for (const declaration of extracted) {
      declarations.set(declaration.name, declaration);
      logToPanel(
        `📋 Document scan found variable: ${declaration.name} = ${declaration.assignmentExpression}`,
      );
    }

    logToPanel(
      `📊 Document scan complete: ${declarations.size} variables found`,
    );
  } catch (error) {
    logToPanel(`❌ Error scanning document for variables: ${error}`, "error");
  }

  return declarations;
}

// Clear DSL variables (for cleanup)
export function clearDslVariables(): void {
  const count = declaredVariables.size;
  declaredVariables.clear();
  allVariableDeclarations.clear();
  logToPanel(`🧹 Cleared ${count} DSL variables`);
}

// Export variables and declarations for external access
export { declaredVariables, allVariableDeclarations };
