# Threely

A functional Three.js DSL library for creating 3D graphics with a clean, composable API.

## Installation

```bash
npm install threely
```

## Usage

```javascript
import { parseDSL, executeDSL, setScene } from "threely";
import * as THREE from "three";

// Set up your Three.js scene
const scene = new THREE.Scene();
setScene(scene);

// Parse and execute DSL code
const dslCode = `mesh(sphere(), material({color: 0x00ff00})).translateX(2).render("mySphere")`;
const result = executeDSL(dslCode);

// Or parse without executing
const parsed = parseDSL(dslCode);
```

## API

### Main Functions

- `parseDSL(code: string)` - Parse DSL code and return the functional graph
- `executeDSL(code: string)` - Parse and execute DSL code, returning a Three.js Object3D
- `setScene(scene: THREE.Scene)` - Set the Three.js scene for rendering
- `clearAll()` - Remove all objects from the scene and registry

### DSL Functions Available in Code

#### Geometry & Materials

- `sphere(radius?, widthSegments?, heightSegments?)` - Create sphere geometry
- `box(width?, height?, depth?)` - Create box geometry
- `cylinder(radiusTop?, radiusBottom?, height?)` - Create cylinder geometry
- `material(options?)` - Create material with options
- `mesh(geometry, material)` - Create mesh from geometry and material

#### 3D Transformations (Chainable)

- `translateX/Y/Z(distance)` - Translation functions
- `rotateX/Y/Z(angle)` - Rotation functions
- `render(name)` - Add object to scene with given name

#### Mathematical Operations (Chainable)

- `frame()` - Get current animation frame counter
- `multiply(a, b)` / `.multiply(b)` - Multiplication
- `add(a, b)` / `.add(b)` - Addition
- `subtract(a, b)` / `.subtract(b)` - Subtraction
- `divide(a, b)` / `.divide(b)` - Division
- Math functions: `.sin()`, `.cos()`, `.tan()`, `.abs()`, `.sqrt()`, `.log()`, `.round()`, etc.

#### Animation Example

```javascript
// Animated sphere using frame() and math chaining
executeDSL(`
  mesh(sphere(), material({color: 0x00ff00}))
    .translateX(frame().multiply(0.1).sin())
    .rotateY(frame().multiply(0.05))
    .render("animatedSphere")
`);
```

## Example

```javascript
import { executeDSL, setScene, clearAll } from "threely";
import * as THREE from "three";

const scene = new THREE.Scene();
setScene(scene);

// Create a green sphere
executeDSL(
  `mesh(sphere(), material({color: 0x00ff00})).translateX(2).render("sphere1")`,
);

// Create a red wireframe box
executeDSL(
  `mesh(box(2,1,1), material({color: 0xff0000, wireframe: true})).translateX(-2).render("box1")`,
);

// Clear all objects
clearAll();
```

## Live Coding Environment

Threely also includes a live coding environment with:

- **CodeMirror editor** with syntax highlighting and Vim support
- **Run button** for executing code blocks (or use Ctrl+Enter)
- **Real-time 3D preview** with automatic scene updates
- **Mathematical chaining** for complex animations and expressions

## Documentation

For comprehensive documentation, see the [docs/](docs/) directory:

- **[Getting Started Guide](docs/README.md)** - Complete overview and quick start
- **[Math Chain Implementation](docs/math-chain-implementation.md)** - Technical details on mathematical chaining
- **[UI Components](docs/ui-components.md)** - Live coding environment documentation

## License

MIT
