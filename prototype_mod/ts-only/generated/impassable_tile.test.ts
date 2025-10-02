// Generated test file for impassable_tile.yaml
import { describe, test, expect } from "bun:test";
import {
  checkTestCaseAllTransforms,
  parseTestCase,
  type DragTestCase,
} from "../test_case";

describe("impassable_tile", () => {

  test("can_t_traverse_past_impasable_tile", () => {
    const yamlContent = "name: Can't traverse past impasable tile\nbefore: '_ # _'\nafter: '> # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_t_traverse_past_impasable_tile_reverse", () => {
    const yamlContent = "name: Can't traverse past impasable tile\nbefore: '_ # _'\nafter: '> # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_t_traverse_past_impasable_tile_wiggle", () => {
    const yamlContent = "name: Can't traverse past impasable tile\nbefore: '_ # _'\nafter: '> # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_t_traverse_past_impasable_tile_wiggle_reverse", () => {
    const yamlContent = "name: Can't traverse past impasable tile\nbefore: '_ # _'\nafter: '> # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_t_traverse_past_impasable_tile_2", () => {
    const yamlContent = "name: Can't traverse past impasable tile 2\nbefore: '_ X # _'\nafter: '> X # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_t_traverse_past_impasable_tile_2_reverse", () => {
    const yamlContent = "name: Can't traverse past impasable tile 2\nbefore: '_ X # _'\nafter: '> X # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_t_traverse_past_impasable_tile_2_wiggle", () => {
    const yamlContent = "name: Can't traverse past impasable tile 2\nbefore: '_ X # _'\nafter: '> X # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_t_traverse_past_impasable_tile_2_wiggle_reverse", () => {
    const yamlContent = "name: Can't traverse past impasable tile 2\nbefore: '_ X # _'\nafter: '> X # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_t_traverse_past_impasable_tile_3", () => {
    const yamlContent = "name: Can't traverse past impasable tile 3\nbefore: '_ # X # _'\nafter: '> # X # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_t_traverse_past_impasable_tile_3_reverse", () => {
    const yamlContent = "name: Can't traverse past impasable tile 3\nbefore: '_ # X # _'\nafter: '> # X # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_t_traverse_past_impasable_tile_3_wiggle", () => {
    const yamlContent = "name: Can't traverse past impasable tile 3\nbefore: '_ # X # _'\nafter: '> # X # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_t_traverse_past_impasable_tile_3_wiggle_reverse", () => {
    const yamlContent = "name: Can't traverse past impasable tile 3\nbefore: '_ # X # _'\nafter: '> # X # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("multiple_impassable_tiles", () => {
    const yamlContent = "name: Multiple impassable tiles\nbefore: '_ # # #'\nafter: '> # # # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("multiple_impassable_tiles_reverse", () => {
    const yamlContent = "name: Multiple impassable tiles\nbefore: '_ # # #'\nafter: '> # # # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("multiple_impassable_tiles_wiggle", () => {
    const yamlContent = "name: Multiple impassable tiles\nbefore: '_ # # #'\nafter: '> # # # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("multiple_impassable_tiles_wiggle_reverse", () => {
    const yamlContent = "name: Multiple impassable tiles\nbefore: '_ # # #'\nafter: '> # # # *>'\nexpected_errors:\n  - cannot_traverse_past_tile\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("impassable_after_error", () => {
    const yamlContent = "name: Impassable after error\nbefore: |\n  *X # # > >\nafter: |\n  *X # # > >\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("impassable_after_error_reverse", () => {
    const yamlContent = "name: Impassable after error\nbefore: |\n  *X # # > >\nafter: |\n  *X # # > >\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("impassable_after_error_wiggle", () => {
    const yamlContent = "name: Impassable after error\nbefore: |\n  *X # # > >\nafter: |\n  *X # # > >\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("impassable_after_error_wiggle_reverse", () => {
    const yamlContent = "name: Impassable after error\nbefore: |\n  *X # # > >\nafter: |\n  *X # # > >\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });
});
