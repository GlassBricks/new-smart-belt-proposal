// Generated test file for error_recovery.yaml
import { describe, test, expect } from "bun:test";
import {
  checkTestCaseAllTransforms,
  parseTestCase,
  type DragTestCase,
} from "../test_case";

describe("error_recovery", () => {

  test("to_empty_tile", () => {
    const yamlContent = "name: To empty tile\nbefore: X _\nafter: '*X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("to_empty_tile_reverse", () => {
    const yamlContent = "name: To empty tile\nbefore: X _\nafter: '*X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("to_empty_tile_wiggle", () => {
    const yamlContent = "name: To empty tile\nbefore: X _\nafter: '*X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("to_empty_tile_wiggle_reverse", () => {
    const yamlContent = "name: To empty tile\nbefore: X _\nafter: '*X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("to_underground", () => {
    const yamlContent = "name: To underground\nbefore: X 2>i 2>o\nafter: '*X >i >o '\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("to_underground_reverse", () => {
    const yamlContent = "name: To underground\nbefore: X 2>i 2>o\nafter: '*X >i >o '\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("to_underground_wiggle", () => {
    const yamlContent = "name: To underground\nbefore: X 2>i 2>o\nafter: '*X >i >o '\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("to_underground_wiggle_reverse", () => {
    const yamlContent = "name: To underground\nbefore: X 2>i 2>o\nafter: '*X >i >o '\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("to_splitter", () => {
    const yamlContent = "name: To splitter\nbefore: X 2>s >\nafter: '*X >s >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("to_splitter_reverse", () => {
    const yamlContent = "name: To splitter\nbefore: X 2>s >\nafter: '*X >s >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("to_splitter_wiggle", () => {
    const yamlContent = "name: To splitter\nbefore: X 2>s >\nafter: '*X >s >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("to_splitter_wiggle_reverse", () => {
    const yamlContent = "name: To splitter\nbefore: X 2>s >\nafter: '*X >s >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });
});
