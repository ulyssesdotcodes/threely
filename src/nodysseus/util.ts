import {
  Args,
  Edge,
  Graph,
  GraphNode,
  NodysseusNode,
  isNodeGraph,
  isNodeValue,
  isEnv,
  Lib,
  Env,
  SavedGraph,
  isEdgesInGraph,
  FullyTypedArg,
} from "./types";

export const WRAPPED_KIND = "wrapped";
type WrappedKind = "wrapped";

export const ispromise = <T>(a: any): a is Promise<T> =>
  a && typeof a.then === "function" && !isWrappedPromise(a);
export const isWrappedPromise = <T>(a: any): a is WrappedPromise<T> =>
  a && a.__kind === WRAPPED_KIND;
export const isgraph = (g: any): boolean =>
  g && g.out !== undefined && g.nodes !== undefined && g.edges !== undefined;

export type WrappedPromise<T> = {
  __kind: WrappedKind;
  then: <S>(
    fn: (t: FlattenPromise<T>) => S | WrappedPromise<S>,
  ) => WrappedPromise<S>;
  value: T;
};

type FlattenWrappedPromise<T> = T extends WrappedPromise<infer Item> ? Item : T;

const tryCatch = (fn: (t: any) => any, t: any, c?: (e: Error) => any) => {
  try {
    return fn(t);
  } catch (e) {
    if (c) {
      return wrapPromise(c(e as Error));
    }

    throw e;
  }
};

export const wrapPromise = <T, S>(
  t: T | PromiseLike<T>,
  c?: (e: Error) => S,
): WrappedPromise<FlattenWrappedPromise<T>> =>
  (isWrappedPromise(t)
    ? t
    : {
      __kind: WRAPPED_KIND,
      then: <S>(
        fn: (tt: FlattenPromise<typeof t>) => S | WrappedPromise<S>,
      ) =>
        wrapPromise(
          ispromise(t)
            ? c
              ? t
                .then(
                  fn as (
                    value: unknown,
                  ) => S | PromiseLike<S> | WrappedPromise<S>,
                )
                .then((v) => (isWrappedPromise(v) ? v.value : v))
                .catch(c)
              : t
                .then(
                  fn as (
                    value: unknown,
                  ) => S | PromiseLike<S> | WrappedPromise<S>,
                )
                .then((v) => (isWrappedPromise(v) ? v.value : v))
            : tryCatch(fn, t, c),
          c,
        ),
      value: t,
    }) as WrappedPromise<FlattenWrappedPromise<T>>;

export const wrapPromiseAll = <T>(
  wrappedPromises: Array<WrappedPromise<T> | T>,
  c?: (e: Error) => T,
): WrappedPromise<Array<any> | Promise<Array<any>>> => {
  const hasPromise = wrappedPromises.reduce(
    (acc, wrappedPromise) =>
      acc ||
      ispromise(
        isWrappedPromise(wrappedPromise)
          ? wrappedPromise.value
          : wrappedPromise,
      ),
    false,
  );
  return wrapPromise(
    hasPromise
      ? Promise.all(
        wrappedPromises.map((wp) =>
          Promise.resolve(isWrappedPromise(wp) ? wp.value : wp),
        ),
      )
      : wrappedPromises.map((wp) => (isWrappedPromise(wp) ? wp.value : wp)),
    c,
  );
};

export const wrapPromiseReduce = (
  previousValue: any,
  arr: any[],
  fn: (args: { previousValue: any; currentValue: any; index: number }) => any,
  index: number,
): any =>
  wrapPromise(fn({ previousValue, currentValue: arr[index], index })).then(
    (acc: any) =>
      index < arr.length - 1 ? wrapPromiseReduce(acc, arr, fn, index + 1) : acc,
  );

// type MaybePromiseFn<T, S> = T extends Promise<infer Item> ? ((i: Item) => S) : ((i: T) => S);
// export function mapMaybePromise<T, S>(a: Promise<T>, fn: (t: T) => S): Promise<S>;
// export function mapMaybePromise<T, S>(a: T, fn: (t: T) => S): S;
// declare function mapMaybePromise<T, S>(a: T | Promise<T>, fn: (t: T) => S): S | Promise<S>;
// export function mapMaybePromise<T, S>(a: Promise<T> | T, fn: (t: T) => S) { return ispromise(a) ? a.then(fn) : fn(a) }
export type IfPromise<T, S> = T extends Promise<infer _> ? S : Promise<S>;
export type FlattenPromise<T> = T extends Promise<infer Item> ? Item : T;

export class NodysseusError extends Error {
  cause: { node_id: string };
  constructor(node_id: string, ...params: any[]) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NodysseusError);
    }

    this.cause = { node_id };
  }
}

export const base_node = (node: any): any =>
  node.ref || node.extern
    ? { id: node.id, value: node.value, name: node.name, ref: node.ref }
    : base_graph(node);
export const base_graph = (graph: any): any => ({
  id: graph.id,
  value: graph.value,
  name: graph.name,
  nodes: graph.nodes,
  edges: graph.edges,
  edges_in: graph.edges_in,
  out: graph.out,
  description: graph.description,
});

export const create_randid = (graph: Graph) => {
  const randstr = Math.random().toString(36);
  const i = 2;
  let randid;
  do {
    randid = randstr.substring(i, i + 7);
  } while (graph.nodes[randid]);

  return randid;
};

type FlattenedGraph = {
  flat_nodes: Record<string, NodysseusNode>;
  flat_edges: Record<string, Edge>;
};
const isFlattenedGraph = (
  g: NodysseusNode | FlattenedGraph,
): g is FlattenedGraph => !!(g as FlattenedGraph).flat_nodes;
export const flattenNode = (
  graph: NodysseusNode,
  levels = -1,
): FlattenedGraph | NodysseusNode =>
  !isNodeGraph(graph) || !graph.nodes || levels <= 0
    ? graph
    : Object.values(graph.nodes)
      .map((g) => flattenNode(g as GraphNode, levels - 1))
      .reduce(
        (
          acc: {
            flat_nodes: Record<string, NodysseusNode>;
            flat_edges: Record<string, Edge>;
          },
          n,
        ) =>
          isFlattenedGraph(n)
            ? Object.assign({}, acc, {
              flat_nodes: Object.assign(
                acc.flat_nodes,
                Object.fromEntries(
                  Object.values(n.flat_nodes).map((fn) => {
                    // adjust for easy graph renaming
                    if (fn.id === (graph.out || "out") && graph.name) {
                      fn.name = graph.name;
                    }
                    return [fn.id, fn];
                  }),
                ),
              ),
              flat_edges: Object.assign(acc.flat_edges, n.flat_edges),
            })
            : acc,
        {
          flat_nodes: graph.nodes,
          flat_edges: graph.edges,
        },
      );

export const expand_node = (data: {
  nolib: Record<string, any>;
  node_id: string;
  editingGraph: Graph;
}): { editingGraph: Graph; selected: Array<string> } => {
  const nolib = data.nolib;
  const node_id = data.node_id;
  const node: NodysseusNode = data.editingGraph.nodes[node_id];

  if (!isNodeGraph(node)) {
    return { editingGraph: data.editingGraph, selected: [data.node_id] };
  }

  const args_node = Object.values(node.edges).find(
    (e) => e.to === node.out && e.as === "args",
  )?.from;
  const in_edges = nolib.no.runtime.get_edges_in(data.editingGraph, node_id);

  const flattened = flattenNode(node, 1);

  const new_id_map = isFlattenedGraph(flattened)
    ? Object.values(flattened.flat_nodes).reduce(
      (acc, n) =>
        nolib.no.runtime.get_node(data.editingGraph, n.id)
          ? ((acc[n.id] = create_randid(data.editingGraph)), acc)
          : n,
      {} as Record<string, any>,
    )
    : flattened;

  isFlattenedGraph(flattened) &&
    nolib.no.runtime.add_nodes_edges(
      data.editingGraph.id,
      Object.values(flattened.flat_nodes).map((n: any) => ({
        ...n,
        id: (new_id_map as any)[n.id] ?? n.id,
      })),
      Object.values(flattened.flat_edges)
        .concat(
          in_edges.map((e: Edge) => ({
            ...e,
            to: (new_id_map as any)[args_node ?? ""] ?? args_node,
          })),
        )
        .concat([
          { ...data.editingGraph.edges[node_id], from: node.out ?? "out" },
        ])
        .map((e: Edge) => ({
          ...e,
          from: (new_id_map as any)[e.from] ?? e.from,
          to: (new_id_map as any)[e.to] ?? e.to,
        })),
      in_edges.concat([data.editingGraph.edges[node_id]]),
      [node_id],
      nolib,
    );

  return {
    editingGraph: data.editingGraph,
    selected: [(new_id_map as any)[node.out ?? "out"] ?? node.out ?? "out"],
  };
};

export const contract_node = (data: {
  editingGraph: Graph;
  node_id: string;
  nolib: any;
}) => {
  const nolib = data.nolib;
  const node = data.editingGraph.nodes[data.node_id];
  const node_id = data.node_id;
  if (!isNodeGraph(node)) {
    const inside_nodes: Array<NodysseusNode> = [Object.assign({}, node)];
    const inside_node_map = new Map();
    inside_node_map.set(inside_nodes[0].id, inside_nodes[0]);
    const inside_edges = new Set<Edge>();

    const q = nolib.no.runtime.get_edges_in(
      data.editingGraph,
      inside_nodes[0].id,
    );

    let in_edge: Array<Edge> = [];
    let args_edge;

    while (q.length > 0) {
      const e = q.shift();

      if (e.to === node.id && e.as === "args") {
        args_edge = e;
      }

      in_edge
        .filter((ie) => ie.from === e.from)
        .forEach((ie) => {
          inside_edges.add(ie);
        });
      in_edge = in_edge.filter((ie) => ie.from !== e.from);

      const old_node = inside_nodes.find((i) => e.from === i.id);
      const inside_node =
        old_node || Object.assign({}, data.editingGraph.nodes[e.from]);

      inside_node_map.set(inside_node.id, inside_node);
      inside_edges.add(e);
      if (!old_node) {
        inside_nodes.push(inside_node);
      }

      if (!args_edge || e.from !== args_edge.from) {
        nolib.no.runtime
          .get_edges_in(data.editingGraph, e.from)
          .forEach((de: Edge) => q.push(de));
      }
    }

    const args_node_id = args_edge ? args_edge.from : undefined;

    // just return the original graph if it's a single node
    if (
      in_edge.find((ie) => ie.to !== args_node_id) ||
      inside_nodes.length < 2
    ) {
      return { editingGraph: data.editingGraph, selected: [data.node_id] };
    }

    const out_node_id = data.node_id;

    const node_id_count = data.editingGraph.nodes[node_id] ? 1 : 0;
    const final_node_id =
      node_id_count === 1 ? node_id : `${node_id}_${node_id_count}`;

    const edges: Record<string, Edge> = {};
    for (const e of Array.from(inside_edges)) {
      const from = e.from.startsWith(node_id + "/")
        ? e.from.substring(node_id.length + 1)
        : e.from;
      edges[from] = {
        ...e,
        from,
        to: e.to.startsWith(node_id + "/")
          ? e.to.substring(node_id.length + 1)
          : e.to,
      };
    }

    const edgesToRemove: Array<Edge> = [];
    const edgesToAdd: Array<Edge> = [
      {
        ...nolib.no.runtime.get_edge_out(data.editingGraph, data.node_id),
        from: final_node_id,
      },
      ...nolib.no.runtime
        .get_edges_in(data.editingGraph, args_node_id)
        .map((e: Edge) => ({ ...e, to: final_node_id })),
    ];

    // Iterate inside nodes to find edges
    for (const newn of Array.from(inside_node_map.keys())) {
      nolib.no.runtime
        .get_edges_in(data.editingGraph, newn)
        .filter((e: Edge) => inside_node_map.has(e.from))
        .forEach((e: Edge) => edgesToRemove.push(e));
    }

    nolib.no.runtime.add_nodes_edges(
      data.editingGraph.id,
      [
        {
          id: final_node_id,
          name: node.name ?? (isNodeValue(node) ? node.value : undefined),
          out: out_node_id.startsWith(node_id + "/")
            ? out_node_id.substring(node_id.length + 1)
            : out_node_id,
          nodes: Object.fromEntries(
            inside_nodes.map((n) => [
              n.id.startsWith(node_id + "/")
                ? n.id.substring(node_id.length + 1)
                : n.id,
              {
                ...n,
                id: n.id.startsWith(node_id + "/")
                  ? n.id.substring(node_id.length + 1)
                  : n.id,
              },
            ]),
          ),
          edges,
        },
      ],
      edgesToAdd,
      edgesToRemove,
      Array.from(inside_node_map.values()),
    );

    return { selected: [final_node_id] };
  }
};

export const parseArg = (arg: string): FullyTypedArg & { name: string } => {
  let nodevalue, valuetype;
  const colonIdx = arg.indexOf(":");
  if (colonIdx >= 0) {
    nodevalue = arg.substring(0, colonIdx);
    valuetype = arg.substring(colonIdx + 2);
  } else {
    nodevalue = arg;
  }
  return {
    type: (valuetype !== "default" ? valuetype : "any") as any,
    name: nodevalue,
    default: valuetype === "default",
  };
};

export const ancestor_graph = (
  node_id: string,
  from_graph: Graph | SavedGraph,
  _nolib?: Record<string, any>,
): Graph => {
  let edges_in: Edge[] = [];
  const fromGraphEdges = Object.values(from_graph.edges);
  const queue = [node_id];
  const graph: Graph = { ...from_graph, nodes: {}, edges: {}, edges_in: {} };
  while (queue.length > 0) {
    const node_id = queue.pop();
    if (!node_id) continue;
    graph.nodes[node_id] = { ...from_graph.nodes[node_id] };
    edges_in = (
      isEdgesInGraph(from_graph) && from_graph.edges_in?.[node_id]
        ? Object.values(from_graph.edges_in[node_id])
        : fromGraphEdges.filter((e) => e.to === node_id)
    ).filter((e: any) => from_graph.nodes[e.from] && !graph.nodes[e.from]);
    graph.edges = Object.assign(
      graph.edges,
      Object.fromEntries(edges_in.map((e: any) => [e.from, e])),
    );
    if (graph.edges_in) {
      graph.edges_in[node_id] = Object.fromEntries(
        edges_in.map((e: any) => [e.from, e]),
      );
    }
    edges_in.forEach((e: any) => queue.push(e.from));
  }
  return graph;
};

export const descendantGraph = <T>(
  nodeId: string,
  graph: Graph,
  traverse: (nodeId: string, edgeIn: Edge) => T,
): Record<string, T> =>
  graph.edges[nodeId]
    ? {
      [graph.edges[nodeId].to]: traverse(
        graph.edges[nodeId].to,
        graph.edges[nodeId],
      ),
      ...descendantGraph(graph.edges[nodeId].to, graph, traverse),
    }
    : {};

/*
 * Type utils
 */

export const newEnv = (data: Args, _output?: any, env?: Env): Env => ({
  __kind: "env",
  data:
    data?.size > 0
      ? env?.data?.size
        ? new Map([...Array.from(env.data), ...Array.from(data)])
        : data
      : new Map(),
  _output,
  env: env?.env,
});
export const combineEnv = (
  data: Args,
  env: Env,
  node_id?: string,
  _output?: string,
): Env => {
  if (isEnv(data)) {
    throw new Error("Can't create an env with env data");
  }
  if (!data?.has("__graphid")) {
    data.set("__graphid", env.data.get("__graphid"));
  }
  return { __kind: "env", data, env, node_id, _output };
};

export const newLib = (data: any): Lib => ({ __kind: "lib", data });
export const mergeLib = (a: Record<string, any> | Lib, b: Lib): Lib =>
  a
    ? {
      __kind: "lib",
      // data: a.data && b.data && a.data !== b.data ? mergeDeep(a.data, b.data) : a.data ?? b.data
      data:
        a.data && b.data && a.data !== b.data
          ? {
            ...b.data,
            ...a.data,
            extern: { ...a.data.extern, ...b.data.extern },
          }
          : (a.data ?? b.data),
    }
    : b;

// const MERGE_KEYS = ["extern"];

// const mergeDeep = (a: Record<string, unknown>, b: Record<string, unknown>) => {
//   const aKeys = Object.keys(a);
//   const bKeys = Object.keys(b);

//   return aKeys.concat(bKeys).reduce(
//     (acc, key) =>
//       acc[key]
//         ? acc
//         : a[key] === b[key]
//         ? ((acc[key] = a[key]), acc)
//         : {
//             ...acc,
//             [key]:
//               MERGE_KEYS.includes(key) &&
//               typeof a[key] === "object" &&
//               typeof b[key] === "object"
//                 ? mergeDeep(
//                     a[key] as Record<string, unknown>,
//                     b[key] as Record<string, unknown>
//                   )
//                 : a[key] ?? b[key],
//           },
//     {}
//   );
// };

const emptySet = new Set<string>();
export function compareObjects(
  value1: any,
  value2: any,
  isUpdate = false,
  excludedFields: Set<string> = emptySet,
) {
  if (value1 === value2) return true;
  if (typeof value1 !== "object" || typeof value2 !== "object") return false;
  const keys1 = Object.keys(value1);
  const keys2 = !isUpdate ? Object.keys(value2) : [];

  if (!isUpdate && keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (excludedFields.has(key)) continue;
    if (compareObjects(value1[key], value2[key])) {
      continue;
    }

    return false;
  }

  return true;
}

export function set_mutable(obj: any, propsArg: any, value: any): boolean {
  let props;
  if (Array.isArray(propsArg)) {
    props = propsArg.slice(0);
  }
  if (typeof propsArg == "string") {
    props = propsArg.split(".");
  }
  if (typeof propsArg == "symbol") {
    props = [propsArg];
  }
  if (!Array.isArray(props)) {
    throw new Error("props arg must be an array, a string or a symbol");
  }
  const lastProp = props.pop();
  if (!lastProp) {
    return false;
  }
  let thisProp;
  while ((thisProp = props.shift())) {
    if (typeof obj[thisProp] == "undefined") {
      obj[thisProp] = {};
    }
    obj = obj[thisProp];
    if (!obj || typeof obj != "object") {
      return false;
    }
  }
  obj[lastProp] = value;
  return true;
}

export const bfs = (graph: Graph, fn: (id: string, level: number) => void) => {
  const visited = new Set<string>();
  const iter = (id: string, level: number) => {
    if (visited.has(id)) {
      return;
    }

    fn(id, level);

    visited.add(id);

    for (const e of Object.values(graph.edges)) {
      if (e.to === id) {
        iter(e.from, level + 1);
      }
    }
  };

  return iter;
};

// Fallback for AggregateError if not available
const AggregateError =
  (globalThis as any).AggregateError ||
  class AggregateError extends Error {
    errors: Error[];
    constructor(errors: Error[], message?: string) {
      super(message);
      this.errors = errors;
      this.name = "AggregateError";
    }
  };

export const handleError = (
  e: any,
  lib: any,
  graph: any,
  node: any,
  graphid: string,
): any => {
  console.error("error in node");
  if (e instanceof AggregateError) {
    e.errors.map(console.error);
  } else {
    console.error(e);
  }
  if (e instanceof NodysseusError) {
    lib.data.no.runtime.publish("grapherror", e);
    return e;
  }
  const parentest = lib.data.no.runtime.get_parentest(graph);
  const error_node = parentest ? graph : node;
  lib.data.no.runtime.publish(
    "grapherror",
    new NodysseusError(
      graphid + "/" + error_node.id,
      e instanceof AggregateError ? "Error in node chain" : e,
    ),
  );

  return e;
};

export const appendGraphId = (graphId: string, nodeId: string) =>
  `${graphId}/${nodeId}`;

// Get edges in for a node from a regular graph or a embedded graph with no edges_in
// note that with no edges_in, this is resource intensive
export const nodeEdgesIn = (graph: Graph, nodeId: string): Edge[] =>
  graph.edges_in?.[nodeId]
    ? Object.values(graph.edges_in[nodeId])
    : Object.values(graph.edges).filter((e) => e.to === nodeId);
