// Graph Demo: Manual Currying Example

// Create some simple functions
const add5 = (x: number) => x + 5;
const multiplyBy2 = (x: number) => x * 2;
const subtract3 = (x: number) => x - 3;

console.log("=== Manual Currying Demonstration ===");

// Manually curry the functions
const curriedAdd5 = ((x?: number) => {
  if (x === undefined) return curriedAdd5;
  return add5(x);
}) as ((x: number) => number) & ((() => typeof curriedAdd5) | any);

const curriedMultiplyBy2 = ((x?: number) => {
  if (x === undefined) return curriedMultiplyBy2;
  return multiplyBy2(x);
}) as ((x: number) => number) & ((() => typeof curriedMultiplyBy2) | any);

const curriedSubtract3 = ((x?: number) => {
  if (x === undefined) return curriedSubtract3;
  return subtract3(x);
}) as ((x: number) => number) & ((() => typeof curriedSubtract3) | any);

// Run the chain with manual currying
const intermediate1 = curriedAdd5(10); // add5(10)
const intermediate2 = curriedMultiplyBy2(intermediate1); // multiplyBy2(add5(10))
const result1 = curriedSubtract3(intermediate2); // subtract3(multiplyBy2(add5(10)))
console.log(`Manual currying result: ${result1}`); // Should be (10+5)*2-3 = 27

// Demonstrate the chain notation x.y(2).z(w())
console.log("\n=== Chain Notation with Manual Currying ===");

// Create a function that takes two parameters
const addParam = (x: number, param: number) => x + param;

// Manually create a curried version of this function
const curriedAddParam = ((x?: number, param?: number) => {
  if (x === undefined) return curriedAddParam;
  if (param === undefined) return (p: number) => curriedAddParam(x, p);
  return addParam(x, param);
}) as ((x: number) => (p: number) => number) &
  ((() => typeof curriedAddParam) | any);

// Create a constant value
const twoValue = 2;

// Run the chain with an initial value of 10 and apply the parameter (2)
// This demonstrates x.y(2) notation where y is curried with parameter 2
const intermediate3 = curriedAddParam(10); // curriedAddParam(10)
const result2 = intermediate3(twoValue); // curriedAddParam(10)(2)
console.log(`Chain notation result: ${result2}`); // Should be 10 + 2 = 12

// Demonstrate a more complex chain with multiple parameters
console.log("\n=== Complex Chain Notation ===");

const xFunc = () => 3;
const yFunc = (input: number, param: number) => input * param;
const zFunc = (input: number, wResult: number) => input + wResult;
const wFunc = () => 5;

// Manually curry these functions
const curriedX = ((x?: number) => {
  if (x === undefined) return xFunc();
  return xFunc();
}) as () => number;

const curriedY = ((input?: number, param?: number) => {
  if (input === undefined) return curriedY;
  if (param === undefined) return (p: number) => yFunc(input, p);
  return yFunc(input, param);
}) as ((input: number) => (param: number) => number) &
  ((() => typeof curriedY) | any);

const curriedZ = ((input?: Function, wResultFunc?: Function) => {
  if (input === undefined) return curriedZ;
  if (wResultFunc === undefined) return (w: Function) => zFunc(input(w), w());
  return zFunc(input(), wResultFunc());
}) as ((input: Function) => (wResultFunc: Function) => number) &
  ((() => typeof curriedZ) | any);

const curriedW = ((x?: number) => {
  if (x === undefined) return wFunc();
  return wFunc();
}) as () => number;

// Run the chain: x.y(2).z(w())
const intermediateX = curriedX(); // x()
const intermediateY = curriedY(intermediateX)(2); // y(x(), 2)
// Fix the TypeScript error by adding proper type annotations
const result3 = curriedZ((w: number) => intermediateY)(curriedW);
console.log(`Complex chain result: ${result3}`); // Should be z(y(x(), 2), w()) = z(6, 5) = 11
