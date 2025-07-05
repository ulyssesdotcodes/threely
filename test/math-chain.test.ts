import { frame, mult } from "../src/dsl";

describe("Math Chain Tests", () => {
  it("should allow chaining math operations on frame()", () => {
    const frameNode = frame();

    // Test that frame returns a node
    expect(frameNode).toBeDefined();
    expect(typeof frameNode).toBe("object");
    expect(frameNode.id).toBeDefined();

    // Test that we can chain multiply - the proxy should handle this
    const multipliedFrame = (frameNode as any).mult(0.1);
    expect(multipliedFrame).toBeDefined();
    expect(typeof multipliedFrame).toBe("object");
    expect(multipliedFrame.id).toBeDefined();

    // Test multiple chaining
    const complexMath = (frameNode as any).mult(0.1).add(5).sin().abs();
    expect(complexMath).toBeDefined();
    expect(typeof complexMath).toBe("object");
    expect(complexMath.id).toBeDefined();
  });

  it("should work with the old multiply function style", () => {
    const frameNode = frame();
    const result = mult(frameNode, 0.1);

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(result.id).toBeDefined();
  });

  it("should chain different math operations", () => {
    const frameNode = frame();

    // Test basic arithmetic chains
    const arithmetic = (frameNode as any).mult(2).add(10).sub(5).div(3);
    expect(arithmetic).toBeDefined();
    expect(arithmetic.id).toBeDefined();

    // Test trigonometric chains
    const trig = (frameNode as any).mult(0.1).sin().abs();
    expect(trig).toBeDefined();
    expect(trig.id).toBeDefined();

    // Test logarithmic and other math functions
    const advanced = (frameNode as any).add(1).log().exp().round();
    expect(advanced).toBeDefined();
    expect(advanced.id).toBeDefined();
  });
});
