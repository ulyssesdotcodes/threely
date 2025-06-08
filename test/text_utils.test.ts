import { findBlockStart, findBlockEnd, getTextBlockAtPosition } from '../src/text_utils';

describe('Text Block Utilities', () => {
  it('should find block start at the beginning of text', () => {
    const text = "block1\n\nblock2\n\nblock3";
    expect(findBlockStart(text, 0)).toBe(0);
  });

  it('should find block start in the middle of text', () => {
    const text = "block1\n\nblock2\n\nblock3";
    expect(findBlockStart(text, 15)).toBe(16); // Position before "block3" (after newline)
  });

  it('should find block end at the end of text', () => {
    const text = "block1\n\nblock2\n\nblock3";
    expect(findBlockEnd(text, text.length - 1)).toBe(text.length);
  });

  it('should find block end in the middle of text', () => {
    const text = "block1\n\nblock2\n\nblock3";
    expect(findBlockEnd(text, 7)).toBe(16); // Position after "block1" (after newline)
  });

  it('should get text block at position', () => {
    const text = "block1\n\nblock2\n\nblock3";
    expect(getTextBlockAtPosition(text, 15)).toBe("block3");
  });

  it('should handle empty input', () => {
    expect(getTextBlockAtPosition("", 0)).toBe("");
  });

  it('should handle position at start of text', () => {
    const text = "block1\n\nblock2";
    expect(getTextBlockAtPosition(text, 0)).toBe("block1");
  });

  it('should handle position at end of text', () => {
    const text = "block1\n\nblock2";
    expect(getTextBlockAtPosition(text, text.length - 1)).toBe("block2");
  });

  it('should get text block with three blocks', () => {
    const text = "block1\n\nblock2\n\nblock3";
    expect(getTextBlockAtPosition(text, 0)).toBe("block1");
    expect(getTextBlockAtPosition(text, 7)).toBe("block2");
    expect(getTextBlockAtPosition(text, 16)).toBe("block3");
  });

  it('should handle multi-line blocks', () => {
    const text = "line1\nline2\n\nline3\nline4";
    expect(getTextBlockAtPosition(text, 0)).toBe("line1\nline2");
    expect(getTextBlockAtPosition(text, 15)).toBe("line3\nline4");
  });

  it('should handle single line input', () => {
    const text = "singleline";
    expect(getTextBlockAtPosition(text, 5)).toBe("singleline");
  });
});