// Generated test file for belt_segments.yaml
import { describe, test, expect } from "bun:test";
import {
  checkTestCaseAllTransforms,
  parseTestCase,
  type DragTestCase,
} from "../test_case";

describe("belt_segments", () => {

  test("output_underground_curved_belt_segment", () => {
    const yamlContent = "name: output underground -> curved belt segment\nbefore: |\n  _ _  _  ^\n  _ 2>o > ^\nafter: |\n  _  _   _ ^\n  >i 2>o > ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_curved_belt_segment_reverse", () => {
    const yamlContent = "name: output underground -> curved belt segment\nbefore: |\n  _ _  _  ^\n  _ 2>o > ^\nafter: |\n  _  _   _ ^\n  >i 2>o > ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_curved_belt_segment_wiggle", () => {
    const yamlContent = "name: output underground -> curved belt segment\nbefore: |\n  _ _  _  ^\n  _ 2>o > ^\nafter: |\n  _  _   _ ^\n  >i 2>o > ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_curved_belt_segment_wiggle_reverse", () => {
    const yamlContent = "name: output underground -> curved belt segment\nbefore: |\n  _ _  _  ^\n  _ 2>o > ^\nafter: |\n  _  _   _ ^\n  >i 2>o > ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_curved_belt_segment_2", () => {
    const yamlContent = "name: output underground -> curved belt segment, 2\nbefore: |\n  _ _  _  v\n  _ 2<i < <\nafter: |\n  _  _   _ v\n  >i 2<i < < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_curved_belt_segment_2_reverse", () => {
    const yamlContent = "name: output underground -> curved belt segment, 2\nbefore: |\n  _ _  _  v\n  _ 2<i < <\nafter: |\n  _  _   _ v\n  >i 2<i < < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_curved_belt_segment_2_wiggle", () => {
    const yamlContent = "name: output underground -> curved belt segment, 2\nbefore: |\n  _ _  _  v\n  _ 2<i < <\nafter: |\n  _  _   _ v\n  >i 2<i < < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_curved_belt_segment_2_wiggle_reverse", () => {
    const yamlContent = "name: output underground -> curved belt segment, 2\nbefore: |\n  _ _  _  v\n  _ 2<i < <\nafter: |\n  _  _   _ v\n  >i 2<i < < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_segment_with_underground_curved_belt_segment_1", () => {
    const yamlContent = "name: output underground -> segment with underground -> curved belt segment, 1\nbefore: |\n  _ _   _   _   v\n  _ 2<i 2<o 2<i <\nafter: |\n  _  _   _   _   v\n  >i 2<i 2<o 2<i < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_segment_with_underground_curved_belt_segment_1_reverse", () => {
    const yamlContent = "name: output underground -> segment with underground -> curved belt segment, 1\nbefore: |\n  _ _   _   _   v\n  _ 2<i 2<o 2<i <\nafter: |\n  _  _   _   _   v\n  >i 2<i 2<o 2<i < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_segment_with_underground_curved_belt_segment_1_wiggle", () => {
    const yamlContent = "name: output underground -> segment with underground -> curved belt segment, 1\nbefore: |\n  _ _   _   _   v\n  _ 2<i 2<o 2<i <\nafter: |\n  _  _   _   _   v\n  >i 2<i 2<o 2<i < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_segment_with_underground_curved_belt_segment_1_wiggle_reverse", () => {
    const yamlContent = "name: output underground -> segment with underground -> curved belt segment, 1\nbefore: |\n  _ _   _   _   v\n  _ 2<i 2<o 2<i <\nafter: |\n  _  _   _   _   v\n  >i 2<i 2<o 2<i < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_segment_with_underground_curved_belt_segment_2", () => {
    const yamlContent = "name: output underground -> segment with underground -> curved belt segment, 2\nbefore: |\n  _ _   _   _   ^\n  _ 2>o 2>i 2>o ^\nafter: |\n  _  _   _   _   ^\n  >i 2>o 2>i 2>o ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_segment_with_underground_curved_belt_segment_2_reverse", () => {
    const yamlContent = "name: output underground -> segment with underground -> curved belt segment, 2\nbefore: |\n  _ _   _   _   ^\n  _ 2>o 2>i 2>o ^\nafter: |\n  _  _   _   _   ^\n  >i 2>o 2>i 2>o ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_segment_with_underground_curved_belt_segment_2_wiggle", () => {
    const yamlContent = "name: output underground -> segment with underground -> curved belt segment, 2\nbefore: |\n  _ _   _   _   ^\n  _ 2>o 2>i 2>o ^\nafter: |\n  _  _   _   _   ^\n  >i 2>o 2>i 2>o ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_segment_with_underground_curved_belt_segment_2_wiggle_reverse", () => {
    const yamlContent = "name: output underground -> segment with underground -> curved belt segment, 2\nbefore: |\n  _ _   _   _   ^\n  _ 2>o 2>i 2>o ^\nafter: |\n  _  _   _   _   ^\n  >i 2>o 2>i 2>o ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_backwards_splitter", () => {
    const yamlContent = "name: output underground -> backwards splitter\nbefore: |\n  _ 2<i < <s\nafter: |\n  >i 2<i < <s >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_backwards_splitter_reverse", () => {
    const yamlContent = "name: output underground -> backwards splitter\nbefore: |\n  _ 2<i < <s\nafter: |\n  >i 2<i < <s >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_backwards_splitter_wiggle", () => {
    const yamlContent = "name: output underground -> backwards splitter\nbefore: |\n  _ 2<i < <s\nafter: |\n  >i 2<i < <s >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_backwards_splitter_wiggle_reverse", () => {
    const yamlContent = "name: output underground -> backwards splitter\nbefore: |\n  _ 2<i < <s\nafter: |\n  >i 2<i < <s >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_backwards_loader", () => {
    const yamlContent = "name: output underground -> backwards loader\nbefore: |\n  _ 2<i < <O\nafter: |\n  >i 2<i < <O >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_backwards_loader_reverse", () => {
    const yamlContent = "name: output underground -> backwards loader\nbefore: |\n  _ 2<i < <O\nafter: |\n  >i 2<i < <O >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_backwards_loader_wiggle", () => {
    const yamlContent = "name: output underground -> backwards loader\nbefore: |\n  _ 2<i < <O\nafter: |\n  >i 2<i < <O >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("output_underground_backwards_loader_wiggle_reverse", () => {
    const yamlContent = "name: output underground -> backwards loader\nbefore: |\n  _ 2<i < <O\nafter: |\n  >i 2<i < <O >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });
});
