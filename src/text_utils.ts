
// Helper functions to find block boundaries

/**
 * Finds the start of a text block based on double newlines.
 *
 * @param text - The full text content
 * @param pos - The cursor position
 * @returns The starting position of the block
 */
export const findBlockStart = (text: string, pos: number): number => {
  let start = pos;
  while (start > 0 && !(text[start - 1] === '\n' && text[start] === '\n')) {
    start--;
  }
  if (start === 0) {
    return 0; // If we're at the beginning of the document, start from the beginning
  } else {
    return start + 1; // Skip the empty line
  }
};

/**
 * Finds the end of a text block based on double newlines.
 *
 * @param text - The full text content
 * @param pos - The cursor position
 * @returns The ending position of the block
 */
export const findBlockEnd = (text: string, pos: number): number => {
  let end = pos;
  while (end < text.length && !(text[end] === '\n' && text[end + 1] === '\n')) {
    end++;
  }
  if (end === text.length) { // If we're at the end of the document
    return text.length; // Return the end of the document
  } else {
    return end + 2; // Skip the empty line
  }
};

/**
 * Gets the text block at a specific position in the document.
 *
 * @param text - The full text content of the document
 * @param pos - The cursor position where we want to get the block
 * @returns The text block at the specified position
 */
export const getTextBlockAtPosition = (text: string, pos: number): {block: string, start: number, end: number} => {
  const start = findBlockStart(text, pos);
  const end = findBlockEnd(text, pos);

  return {
    block: text.substring(start, end).trim(),
    start,
    end
  }
};