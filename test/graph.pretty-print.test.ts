import { Graph } from '../src/graph';
import { GraphPrettyPrinter } from '../src/graph-pretty-printer';
import { sphere, box, material, mesh, translateX, translateY, rotateX, rotateY, render } from '../src/dsl';

describe('Graph Pretty Printing', () => {
  it('should pretty print a complex graph with approximately 10 nodes', () => {
    // Create a complex scene with multiple objects
    // This will create approximately 10 nodes total
    
    // First object: sphere with transformations (5 nodes)
    const sphereGeom = sphere(1, 16, 12);           // node 1
    const redMaterial = material({ color: 0xff0000 }); // node 2
    const sphereMesh = mesh(sphereGeom, redMaterial);   // node 3
    const movedSphere = translateX(sphereMesh, 2);      // node 4
    const rotatedSphere = rotateY(movedSphere, Math.PI / 4); // node 5
    
    // Second object: box with different transformations (5 nodes)
    const boxGeom = box(2, 2, 2);                   // node 6
    const blueMaterial = material({ color: 0x0000ff }); // node 7
    const boxMesh = mesh(boxGeom, blueMaterial);        // node 8
    const liftedBox = translateY(boxMesh, 3);           // node 9
    const finalScene = render(liftedBox, "testBox");   // node 10
    
    // Test default pretty print
    const output = Graph.prettyPrint(finalScene);
    
    expect(output).toMatchSnapshot();
  });

  it('should pretty print with custom options', () => {
    // Create a smaller graph for custom options test
    const sphereGeom = sphere(2);
    const mat = material({ color: 0x00ff00 });
    const meshNode = mesh(sphereGeom, mat);
    const transformed = rotateX(meshNode, Math.PI / 2);
    const rendered = render(transformed, "customTest");
    
    const output = Graph.prettyPrint(rendered, {
      showIds: false,
      showDependencyCount: false,
      nodeLabel: (node) => {
        const computeStr = node.compute.toString();
        if (computeStr.includes('SphereGeometry')) return 'SPHERE_GEOMETRY';
        if (computeStr.includes('MeshBasicMaterial')) return 'BASIC_MATERIAL';
        if (computeStr.includes('THREE.Mesh')) return 'MESH_OBJECT';
        if (computeStr.includes('rotateXObj')) return 'ROTATE_X_TRANSFORM';
        if (computeStr.includes('currentScene.add')) return 'SCENE_RENDER';
        return 'UNKNOWN_NODE';
      }
    });
    
    expect(output).toMatchSnapshot();
  });

  it('should create compact representation', () => {
    // Create a multi-branch graph
    const geom1 = sphere(1);
    const geom2 = box(1, 1, 1);
    const mat1 = material({ color: 0xff0000 });
    const mat2 = material({ color: 0x00ff00 });
    
    const mesh1 = mesh(geom1, mat1);
    const mesh2 = mesh(geom2, mat2);
    
    const transformed1 = translateX(mesh1, -2);
    const transformed2 = translateX(mesh2, 2);
    
    const rendered1 = render(transformed1, "left");
    const rendered2 = render(transformed2, "right");
    
    const compact1 = Graph.compact(rendered1);
    const compact2 = Graph.compact(rendered2);
    
    expect(compact1).toMatchSnapshot();
    expect(compact2).toMatchSnapshot();
  });

  it('should handle forest printing with multiple root nodes', () => {
    // Create multiple independent graphs
    const tree1 = render(
      rotateY(
        translateX(
          mesh(sphere(1), material({ color: 0xff0000 })),
          1
        ),
        Math.PI / 6
      ),
      "tree1"
    );
    
    const tree2 = render(
      translateY(
        mesh(box(1, 2, 1), material({ color: 0x00ff00 })),
        -1
      ),
      "tree2"
    );
    
    const tree3 = mesh(sphere(0.5), material({ wireframe: true }));
    
    const printer = new GraphPrettyPrinter();
    const forestOutput = printer.printForest([tree1, tree2, tree3]);
    
    expect(forestOutput).toMatchSnapshot();
  });

  it('should show dependency chain execution', () => {
    // Create a linear dependency chain to show execution order
    const baseGeometry = sphere(1, 8, 6);
    const baseMaterial = material({ color: 0xffffff });
    const baseMesh = mesh(baseGeometry, baseMaterial);
    
    // Chain of transformations
    const step1 = translateX(baseMesh, 1);
    const step2 = translateY(step1, 2);
    const step3 = rotateX(step2, Math.PI / 4);
    const step4 = rotateY(step3, Math.PI / 3);
    const final = render(step4, "chainTest");
    
    const output = Graph.prettyPrint(final, {
      showIds: true,
      showDependencyCount: true
    });
    
    expect(output).toMatchSnapshot();
  });
});