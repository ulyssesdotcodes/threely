// Simple test for frame function
import { frame } from './src/dsl.js';

console.log('Testing frame function...');
try {
  const frameNode = frame();
  console.log('Frame node created:', frameNode);
  console.log('Frame node ID:', frameNode.id);
  console.log('Frame node compute function:', frameNode.compute);
  console.log('Frame node dependencies:', frameNode.dependencies);
} catch (error) {
  console.error('Error testing frame function:', error);
}