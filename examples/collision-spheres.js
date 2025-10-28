nodes.force = t.vec3(0.00, 0, 0);
nodes.size = t.float(0.01)

nodes.force = curl({
    posa: nodes.position,
    elscale: t.float(100),
    force: nodes.force,
    time: t.time.mul(0.01),
    speed: t.float(0.001),
    index: t.float(t.instanceIndex)
});

const whiteVal = t.float(0.01).sub(nodes.velocity.length()).mul(100);
nodes.color = t.vec3(1, 1, 1);
nodes.force = nodes.force.add(t.vec3(0.0004, 0, 0).mul(t.sin(t.time.mul(0.5)).add(t.float(0.15))))

nodes.lifespan = t.float(99999999)

const applySphere = (centre, r) => {
    const posNode = nodes.position.sub(centre);
    const surface = posNode.normalize().mul(r);
    const diff = surface.sub(posNode);
    const diffSq = diff.lengthSq()
    const isInside = posNode
        .length()
        .lessThan(r);

    nodes.force = diffSq.lessThan(
        t.float(16)
    ).select(
        isInside.select(
            nodes.force,
            t.float(0.0001).div(diffSq.add(1)).mul(diff.normalize()).add(nodes.force),
        ),


        nodes.force
    );

    // nodes.color = posNode.length().lessThan(r)
    // .select(
    //   t.vec3(1, 0, 0),
    //   nodes.color
    // )

    nodes.position =
        isInside.select(
            surface.add(centre),
            nodes.position
        )
}


const centre = t.vec3(0, t.sin(t.time).floor().mul(2), 0);

applySphere(t.vec3(2, 0, 0), 1.5);
applySphere(t.vec3(-1, 0, 0), 1.25);

