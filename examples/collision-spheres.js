import * as THREE from "three/webgpu";
import {TSL as t} from "three/webgpu";
import {paletteNode, hsvToRgb} from "./compute/oscillare"
import { beatramp } from "./particles"


declare const nodes : Record<string, t.ShaderNodeObject<THREE.Node>>

/** begin-eval */

const time = beatramp;
nodes.size = t.float(0.01)

const palette = paletteNode("darkestred");
const age = t.sub(time, nodes.birthTime);
let paletteIndex = t.rand(t.instanceIndex);
paletteIndex = paletteIndex.mul(0.3).add(nodes.position.y.sub(-2).div(4).mul(0.7));
let hsv = palette.element(t.int(paletteIndex.clamp(0, 2).mul(palette.value.count)));
hsv = t.vec3(hsv.x, hsv.y.add(hsv.y.oneMinus().mul(beatramp.mod(1))), hsv.z);
nodes.color = hsvToRgb(hsv);
// nodes.force = nodes.force.add(t.vec3(0.0001, 0, 0).mul(t.sin(time.mul(0.5)).add(t.float(0.15))));

nodes.force= nodes.force.add(nodes.position.mul(-0.0001)).mul(t.vec3(1, 1, 2));


nodes.lifespan = t.float(99999999)



const sphere = {
  position: (time) => t.vec3(0),
  radius: (time) => t.vec3(t.sin(time.mul(2)).abs().mul(1.5).add(0.25)),
  color: t.vec3(0, 0, 1)
}

const sphere2 = {
  position: (time) => t.vec3(t.sin(time.mul(2)).mul(2), 0, 0),
  radius: (time) => t.float(0.75),
  color: t.vec3(1, 0, 0)
}

const sphere3 = {
  position: (time) => t.vec3(0, t.sin(time), 0),
  radius: (time) => t.float(1),
  color: t.vec3(0, 1, 0)
}

const applySphere = (sphere) => {
    const prevFrame = time.sub(0.0166);
    const r = sphere.radius(time);
    const p = sphere.position(time);
    const pprev = sphere.position(prevFrame);
    const rprev = sphere.radius(prevFrame);
  
    const posNode = nodes.position.sub(p);
    const surface = posNode.normalize().mul(r);
    const diff = surface.sub(posNode);
    const diffSq = diff.lengthSq()
    const isInside = posNode
        .length()
        .lessThan(r);

    const v = p.sub(pprev).add(posNode.normalize().mul(r.sub(rprev)));

    const v1 = nodes.velocity.sub(v);
    const N = posNode.normalize();

    const v2 = v1.sub(t.vec3(2).mul(v1.dot(N)).mul(N));
  
    // nodes.force = diffSq.lessThan(
    //     t.float(16)
    //   ).select(
    //     isInside.select(
    //         nodes.force.add(v1.dot(N)),
    //         nodes.force
    //         // t.float(0.0002).div(diffSq.add(1)).mul(diff.normalize()).add(nodes.force),
    //     ),
    //     nodes.force
    // );

    nodes.velocity = 
        isInside.select(
            v2.mul(0.95),
            nodes.velocity
        );

    nodes.position =
        isInside.select(
            surface.add(p),
            nodes.position
        )

    nodes.color = t.mix(nodes.color, sphere.color, diffSq.mul(8).oneMinus().max(0));
}


// applySphere(sphere);
applySphere(sphere2);
applySphere(sphere3);

nodes.color = nodes.color.mul(beatramp.mul(0.25).mod(1).oneMinus().add(0.2));

