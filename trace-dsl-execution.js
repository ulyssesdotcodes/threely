// Simple Node.js script to trace DSL execution
const { parseDSL, executeDSL, dslContext } = require('./dist/index.js');

console.log('=== Tracing DSL Execution ===');
console.log('DSL Expression: mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")');
console.log();

// Override console.log to capture detailed logging
const originalLog = console.log;
const logs = [];
console.log = (...args) => {
  const message = args.join(' ');
  logs.push(message);
  originalLog(...args);
};

try {
  // Parse and execute the DSL
  const result = parseDSL('mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")', dslContext);
  
  console.log('\n=== Parsed Result ===');
  console.log('Result type:', typeof result);
  console.log('Result id:', result?.id);
  console.log('Result value type:', typeof result?.value);
  console.log('Dependencies count:', result?.dependencies?.length || 0);
  
  if (result?.dependencies) {
    console.log('\n=== Dependencies Structure ===');
    result.dependencies.forEach((dep, i) => {
      console.log(`Dependency ${i}:`, {
        id: dep.id,
        valueType: typeof dep.value,
        dependenciesCount: dep.dependencies?.length || 0
      });
    });
  }
  
  console.log('\n=== All captured logs ===');
  logs.forEach(log => console.log('LOG:', log));
  
} catch (error) {
  console.error('Error:', error);
}