// Final validation test for complex DSL expression
import { executeDSL, dslContext } from '../src/dsl';

describe('Lezer Converter Final Validation', () => {
  const complexExpression = 'mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")';

  it('should execute the complex DSL expression without errors', () => {
    // The Lezer converter is enabled by default now (USE_LEZER_CONVERTER = true)
    const result = executeDSL(complexExpression);
    
    // Should execute without throwing errors
    expect(result).toBeDefined();
    
    // Log success
    console.log('✅ Complex DSL expression executed successfully with Lezer converter');
  });

  it('should handle simple math chaining', () => {
    const result = executeDSL('mult(2, 3)');
    expect(result).toBeDefined();
  });

  it('should handle frame-based expressions', () => {
    const result = executeDSL('frame().mult(0.1)');
    expect(result).toBeDefined();
  });

  it('should handle sphere creation', () => {
    const result = executeDSL('sphere()');
    expect(result).toBeDefined();
  });

  it('should handle material creation', () => {
    const result = executeDSL('material()');
    expect(result).toBeDefined();
  });

  it('should handle mesh creation with nested functions', () => {
    const result = executeDSL('mesh(sphere(), material())');
    expect(result).toBeDefined();
  });
});