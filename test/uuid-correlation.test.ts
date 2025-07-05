// Test UUID correlation between CodeMirror, Lezer, and Nodysseus
import {
  generateUUIDTags,
  getUUIDFromRangeSet,
  uuidRangeSetField,
  setUUIDRangeSet,
} from "../src/uuid-tagging";
import { convertLezerToNodysseus } from "../src/dsl/lezer-to-nodysseus-converter";
import { dslContext } from "../src/dsl";
import { EditorState } from "@codemirror/state";

describe("UUID Correlation System", () => {
  test("should generate UUIDs for function calls in RangeSet", () => {
    const code = 'sphere().render("test")';
    const { rangeSet, functionCalls } = generateUUIDTags(code);

    console.log(
      "Function calls found:",
      functionCalls.map((fc) => ({
        name: fc.functionName,
        from: fc.from,
        to: fc.to,
      })),
    );

    expect(functionCalls.length).toBeGreaterThan(0);
    expect(functionCalls[0].uuid).toBeDefined();
    expect(functionCalls[0].functionName).toBeDefined();
    expect(rangeSet.size).toBeGreaterThan(0);

    // All function calls should have UUIDs
    functionCalls.forEach((fc) => {
      expect(fc.uuid).toBeDefined();
      expect(fc.functionName).toBeDefined();
      expect(fc.from).toBeGreaterThanOrEqual(0);
      expect(fc.to).toBeGreaterThan(fc.from);
    });
  });

  test("should correlate UUIDs from RangeSet to Lezer nodes", () => {
    const code = 'sphere().render("test")';

    // Generate UUIDs first (simulating CodeMirror RangeSet)
    const { rangeSet, functionCalls } = generateUUIDTags(code);
    console.log(
      "Generated function calls:",
      functionCalls.map((fc) => ({
        name: fc.functionName,
        uuid: fc.uuid,
        from: fc.from,
        to: fc.to,
      })),
    );

    // Convert with Lezer (should find and use the UUIDs)
    const result = convertLezerToNodysseus(code, dslContext);

    console.log(
      "Conversion log entries:",
      result.conversionLog.map((entry) => ({
        type: entry.astNodeType,
        function: entry.functionResolved,
        uuid: entry.uuid,
        position: entry.position,
      })),
    );

    // Check that at least one conversion log entry has UUID correlation
    const entriesWithUuid = result.conversionLog.filter((entry) => entry.uuid);
    expect(entriesWithUuid.length).toBeGreaterThan(0);

    // Check that UUIDs from RangeSet are found in conversion log
    const uuidsFromRangeSet = functionCalls.map((fc) => fc.uuid);
    const uuidsFromConversion = entriesWithUuid.map((entry) => entry.uuid);

    // At least some UUIDs should match
    const matchingUuids = uuidsFromRangeSet.filter((uuid) =>
      uuidsFromConversion.includes(uuid),
    );
    expect(matchingUuids.length).toBeGreaterThan(0);
  });

  test("should handle complex chains with proper UUID assignment", () => {
    const code =
      'mesh(sphere(), material()).translateX(1).rotateY(45).render("mySphere")';

    const { rangeSet, functionCalls } = generateUUIDTags(code);

    console.log(
      "Complex chain function calls:",
      functionCalls.map((fc) => ({
        name: fc.functionName,
        from: fc.from,
        to: fc.to,
      })),
    );

    expect(functionCalls.length).toBeGreaterThan(0);
    expect(rangeSet.size).toBeGreaterThan(0);

    // All UUIDs should be unique
    const uuids = functionCalls.map((fc) => fc.uuid);
    const uniqueUuids = new Set(uuids);
    expect(uniqueUuids.size).toBe(uuids.length);

    // Should have UUIDs for function calls
    functionCalls.forEach((fc) => {
      expect(fc.uuid).toBeDefined();
      expect(fc.functionName).toBeDefined();
      expect(fc.from).toBeGreaterThanOrEqual(0);
      expect(fc.to).toBeGreaterThan(fc.from);
    });
  });

  test("should map RangeSet through document changes", () => {
    const initialCode = "sphere()";
    const { rangeSet: initialRangeSet, functionCalls: initialCalls } =
      generateUUIDTags(initialCode);

    // Create editor state with UUID field
    const state = EditorState.create({
      doc: initialCode,
      extensions: [uuidRangeSetField],
    });

    // Apply the UUID RangeSet
    const stateWithUuids = state.update({
      effects: setUUIDRangeSet.of(initialRangeSet),
    }).state;

    // Check that we can find the UUID at the correct position
    const uuidFromState = getUUIDFromRangeSet(
      stateWithUuids.field(uuidRangeSetField),
      0,
    );
    expect(uuidFromState).toBeDefined();
    expect(uuidFromState).toBe(initialCalls[0].uuid);

    // Simulate document change - insert text at the beginning
    const changedState = stateWithUuids.update({
      changes: { from: 0, insert: "let x = " },
    }).state;

    // The UUID should now be found at position 8 (after "let x = ")
    const mappedUuid = getUUIDFromRangeSet(
      changedState.field(uuidRangeSetField),
      8,
    );
    expect(mappedUuid).toBe(initialCalls[0].uuid);

    // The original position (0) should no longer have a UUID
    const unmappedUuid = getUUIDFromRangeSet(
      changedState.field(uuidRangeSetField),
      0,
    );
    expect(unmappedUuid).toBeNull();
  });
});
