/**
 * Function call parser for DSL code
 * 
 * This module provides parsing functionality to identify function calls and their positions
 * in DSL code. It supports common DSL patterns including:
 * - Basic function calls: frame(), sphere(1), material()
 * - Nested function calls: mesh(sphere(), material())
 * - Method chaining: mesh().translateX().rotateY()
 * 
 * The parser uses a regex-based approach for performance and simplicity,
 * with proper handling of nested parentheses and method chaining.
 */


import { FunctionCall } from './function-call-tag';

/**
 * Parser state for tracking nested parentheses and method calls
 */
interface ParseState {
  /** Current position in the code string */
  position: number;
  /** Stack of open parentheses with their positions */
  parenStack: number[];
  /** Current depth of nested parentheses */
  depth: number;
  /** Whether we're currently inside a string literal */
  inString: boolean;
  /** Current string delimiter (', ", or `) */
  stringDelimiter: string | null;
  /** Whether the previous character was an escape */
  escaped: boolean;
}

/**
 * Regex patterns for identifying different parts of function calls
 */
const PATTERNS = {
  /** Matches valid JavaScript identifier names */
  IDENTIFIER: /^[a-zA-Z_$][a-zA-Z0-9_$]*/,
  /** Matches whitespace characters */
  WHITESPACE: /^\s+/,
  /** Matches numeric literals (integers and floats) */
  NUMBER: /^-?\d+(\.\d+)?/,
  /** Matches string delimiters */
  STRING_DELIM: /^['"`]/,
  /** Matches method call dot notation */
  DOT: /^\./,
  /** Matches opening parenthesis */
  OPEN_PAREN: /^\(/,
  /** Matches closing parenthesis */
  CLOSE_PAREN: /^\)/,
  /** Matches comma separator */
  COMMA: /^,/
};

/**
 * Finds all function calls in the given code string
 * 
 * @param code - The DSL code to parse
 * @returns Array of FunctionCall objects with position information
 * 
 * @example
 * ```typescript
 * const calls = findFunctionCalls('mesh(sphere(), material()).translateX(1)');
 * // Returns:
 * // [
 * //   { name: 'sphere', start: 5, end: 13, args: [] },
 * //   { name: 'material', start: 15, end: 25, args: [] },
 * //   { name: 'mesh', start: 0, end: 26, args: [sphere_call, material_call] },
 * //   { name: 'translateX', start: 27, end: 40, args: [] }
 * // ]
 * ```
 */
export function findFunctionCalls(code: string): FunctionCall[] {
  const result: FunctionCall[] = [];
  const state: ParseState = {
    position: 0,
    parenStack: [],
    depth: 0,
    inString: false,
    stringDelimiter: null,
    escaped: false
  };

  while (state.position < code.length) {
    if (state.inString) {
      handleStringState(code, state);
    } else {
      const functionCall = tryParseFunctionCall(code, state);
      if (functionCall) {
        result.push(functionCall);
      } else {
        // Move to next character if no function call found
        state.position++;
      }
    }
  }

  return result;
}

/**
 * Handles parsing when inside a string literal
 */
function handleStringState(code: string, state: ParseState): void {
  const char = code[state.position];
  
  if (state.escaped) {
    state.escaped = false;
  } else if (char === '\\') {
    state.escaped = true;
  } else if (char === state.stringDelimiter) {
    state.inString = false;
    state.stringDelimiter = null;
  }
  
  state.position++;
}

/**
 * Attempts to parse a function call at the current position
 */
function tryParseFunctionCall(code: string, state: ParseState): FunctionCall | null {
  // Save starting position for potential backtracking
  const startPosition = state.position;
  let remaining = code.slice(state.position);
  
  // Check for string literals first
  const stringMatch = remaining.match(PATTERNS.STRING_DELIM);
  if (stringMatch) {
    state.inString = true;
    state.stringDelimiter = stringMatch[0];
    state.position++;
    return null;
  }

  // Skip whitespace
  const whitespaceMatch = remaining.match(PATTERNS.WHITESPACE);
  if (whitespaceMatch) {
    state.position += whitespaceMatch[0].length;
    remaining = code.slice(state.position);
  }

  // Look for identifier followed by opening parenthesis
  const identifierMatch = remaining.match(PATTERNS.IDENTIFIER);
  if (!identifierMatch) {
    if (state.position > startPosition) {
      // We consumed whitespace but found no identifier, move one position only
      state.position = startPosition + 1;
    }
    return null;
  }

  const functionName = identifierMatch[0];
  const afterIdentifier = remaining.slice(functionName.length);
  
  // Skip whitespace after identifier
  const afterIdWhitespace = afterIdentifier.match(PATTERNS.WHITESPACE);
  const afterIdOffset = afterIdWhitespace ? afterIdWhitespace[0].length : 0;
  const afterWhitespace = afterIdentifier.slice(afterIdOffset);

  // Check for opening parenthesis
  if (!afterWhitespace.startsWith('(')) {
    // No parenthesis, not a function call, try next position
    state.position = startPosition + 1;
    return null;
  }

  // We found a function call - now parse its full extent
  const callStart = state.position;
  const argsStart = callStart + functionName.length + afterIdOffset + 1; // +1 for '('
  
  // Find the matching closing parenthesis and parse arguments
  const { endPosition, args } = parseFunctionArguments(code, argsStart);
  
  if (endPosition === -1) {
    // Unmatched parentheses - treat as invalid
    state.position = startPosition + 1;
    return null;
  }

  const functionCall: FunctionCall = {
    name: functionName,
    start: callStart,
    end: endPosition + 1, // +1 to include the closing parenthesis
    args
  };

  // Update state to continue parsing after this function call
  state.position = endPosition + 1;

  return functionCall;
}

/**
 * Parses function arguments and returns nested function calls
 */
function parseFunctionArguments(code: string, start: number): { endPosition: number; args: FunctionCall[] } {
  const args: FunctionCall[] = [];
  let position = start;
  let depth = 1; // We start inside the parentheses
  let inString = false;
  let stringDelimiter: string | null = null;
  let escaped = false;

  while (position < code.length && depth > 0) {
    const char = code[position];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === stringDelimiter) {
        inString = false;
        stringDelimiter = null;
      }
    } else {
      // Handle string start
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringDelimiter = char;
      }
      // Handle parentheses
      else if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
        if (depth === 0) {
          // Found the end of this function's arguments
          break;
        }
      }
      // Look for nested function calls within the arguments
      else if (depth === 1) {
        // Only look for function calls at the top level of arguments
        const remaining = code.slice(position);
        const identifierMatch = remaining.match(PATTERNS.IDENTIFIER);
        
        if (identifierMatch) {
          const functionName = identifierMatch[0];
          const afterIdentifier = remaining.slice(functionName.length);
          
          // Skip whitespace
          const whitespaceMatch = afterIdentifier.match(PATTERNS.WHITESPACE);
          const whitespaceLength = whitespaceMatch ? whitespaceMatch[0].length : 0;
          const afterWhitespace = afterIdentifier.slice(whitespaceLength);
          
          if (afterWhitespace.startsWith('(')) {
            // Found a nested function call
            const nestedStart = position;
            const nestedArgsStart = position + functionName.length + whitespaceLength + 1;
            
            const { endPosition: nestedEnd, args: nestedArgs } = parseFunctionArguments(code, nestedArgsStart);
            
            if (nestedEnd !== -1) {
              const nestedCall: FunctionCall = {
                name: functionName,
                start: nestedStart,
                end: nestedEnd + 1,
                args: nestedArgs
              };
              
              args.push(nestedCall);
              position = nestedEnd + 1;
              continue;
            }
          }
        }
      }
    }

    position++;
  }

  return {
    endPosition: depth === 0 ? position : -1,
    args
  };
}

/**
 * Finds function calls within a specific range of the code
 * 
 * @param code - The DSL code to parse
 * @param start - Start position (inclusive)
 * @param end - End position (exclusive)
 * @returns Array of FunctionCall objects within the specified range
 */
export function findFunctionCallsInRange(code: string, start: number, end: number): FunctionCall[] {
  const allCalls = findAllFunctionCalls(code);
  
  return allCalls.filter(call => {
    // Include calls that overlap with the specified range
    return call.start < end && call.end > start;
  });
}

/**
 * Finds the function call that contains or is at the specified position
 * 
 * @param code - The DSL code to parse
 * @param position - Character position to search at
 * @returns The function call at the position, or null if none found
 */
export function getFunctionCallAt(code: string, position: number): FunctionCall | null {
  const allCalls = findAllFunctionCalls(code);
  
  // Find all calls that contain the position
  const containingCalls: FunctionCall[] = [];
  
  const checkCall = (call: FunctionCall) => {
    if (position >= call.start && position < call.end) {
      containingCalls.push(call);
    }
    
    // Check nested calls in args
    for (const arg of call.args) {
      checkCall(arg);
    }
  };
  
  for (const call of allCalls) {
    checkCall(call);
  }
  
  if (containingCalls.length === 0) {
    return null;
  }
  
  // Return the most specific (smallest) call that contains the position
  return containingCalls.reduce((best, current) => {
    const bestSize = best.end - best.start;
    const currentSize = current.end - current.start;
    return currentSize < bestSize ? current : best;
  });
}

/**
 * Finds method chaining calls following a function call
 * Method chains are sequences like .translateX().rotateY()
 * 
 * @param code - The DSL code to parse
 * @param startPosition - Position to start looking for method chains
 * @returns Array of FunctionCall objects representing method calls
 */
export function findMethodChainCalls(code: string, startPosition: number): FunctionCall[] {
  const result: FunctionCall[] = [];
  let position = startPosition;

  while (position < code.length) {
    // Skip whitespace
    const remaining = code.slice(position);
    const whitespaceMatch = remaining.match(PATTERNS.WHITESPACE);
    if (whitespaceMatch) {
      position += whitespaceMatch[0].length;
      continue;
    }

    // Look for dot notation
    if (!code[position] || code[position] !== '.') {
      break;
    }

    position++; // Skip the dot

    // Skip whitespace after dot
    const afterDot = code.slice(position);
    const afterDotWhitespace = afterDot.match(PATTERNS.WHITESPACE);
    if (afterDotWhitespace) {
      position += afterDotWhitespace[0].length;
    }

    // Look for method name
    const methodRemaining = code.slice(position);
    const methodMatch = methodRemaining.match(PATTERNS.IDENTIFIER);
    if (!methodMatch) {
      break;
    }

    const methodName = methodMatch[0];
    const methodStart = position;
    position += methodName.length;

    // Skip whitespace after method name
    const afterMethod = code.slice(position);
    const afterMethodWhitespace = afterMethod.match(PATTERNS.WHITESPACE);
    if (afterMethodWhitespace) {
      position += afterMethodWhitespace[0].length;
    }

    // Check for opening parenthesis
    if (position >= code.length || code[position] !== '(') {
      break;
    }

    position++; // Skip opening parenthesis

    // Parse method arguments
    const { endPosition, args } = parseFunctionArguments(code, position);
    if (endPosition === -1) {
      break;
    }

    const methodCall: FunctionCall = {
      name: methodName,
      start: methodStart,
      end: endPosition + 1,
      args
    };

    result.push(methodCall);
    position = endPosition + 1;
  }

  return result;
}

/**
 * Comprehensive function call parser that handles both regular calls and method chains
 * 
 * @param code - The DSL code to parse
 * @returns Array of all function calls including method chains
 */
export function findAllFunctionCalls(code: string): FunctionCall[] {
  const result: FunctionCall[] = [];
  const processed = new Set<string>();
  
  // First, get all regular function calls (these are top-level calls with nested args)
  const allRegularCalls = findFunctionCalls(code);
  
  // Add top-level function calls and their method chains
  for (const call of allRegularCalls) {
    const key = `${call.name}-${call.start}-${call.end}`;
    if (!processed.has(key)) {
      processed.add(key);
      result.push(call);
      
      // Look for method chains after this call
      const methodCalls = findMethodChainCalls(code, call.end);
      for (const methodCall of methodCalls) {
        const methodKey = `${methodCall.name}-${methodCall.start}-${methodCall.end}`;
        if (!processed.has(methodKey)) {
          processed.add(methodKey);
          result.push(methodCall);
        }
      }
    }
  }
  
  return result;
}

/**
 * Flattens all function calls including nested ones from args
 * This is useful for cases where you need to see every single function call
 * 
 * @param code - The DSL code to parse
 * @returns Array of all function calls in flat structure
 */
export function findAllFunctionCallsFlat(code: string): FunctionCall[] {
  const result: FunctionCall[] = [];
  const processed = new Set<string>();
  
  const addCall = (call: FunctionCall) => {
    const key = `${call.name}-${call.start}-${call.end}`;
    if (!processed.has(key)) {
      processed.add(key);
      result.push(call);
      
      // Recursively add nested calls
      for (const arg of call.args) {
        addCall(arg);
      }
    }
  };
  
  // Get all top-level function calls
  const topLevelCalls = findAllFunctionCalls(code);
  
  for (const call of topLevelCalls) {
    addCall(call);
  }
  
  return result;
}