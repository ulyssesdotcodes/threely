# Threely

A functional Three.js DSL library for creating 3D graphics with a clean, composable API.

## Installation

```bash
npm install threely
```

## Usage

```javascript
import { parseDSL, executeDSL, setScene } from 'threely';
import * as THREE from 'three';

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

- `sphere(radius?, widthSegments?, heightSegments?)` - Create sphere geometry
- `box(width?, height?, depth?)` - Create box geometry
- `cylinder(radiusTop?, radiusBottom?, height?)` - Create cylinder geometry
- `material(options?)` - Create material with options
- `mesh(geometry, material)` - Create mesh from geometry and material
- `translateX/Y/Z(distance)` - Transform functions
- `rotateX/Y/Z(angle)` - Rotation functions
- `render(name)` - Add object to scene with given name

## Example

```javascript
import { executeDSL, setScene, clearAll } from 'threely';
import * as THREE from 'three';

const scene = new THREE.Scene();
setScene(scene);

// Create a green sphere
executeDSL(`mesh(sphere(), material({color: 0x00ff00})).translateX(2).render("sphere1")`);

// Create a red wireframe box
executeDSL(`mesh(box(2,1,1), material({color: 0xff0000, wireframe: true})).translateX(-2).render("box1")`);

// Clear all objects
clearAll();
```

## License

MIT