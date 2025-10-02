// Generated test file for loaders.yaml
import { describe, test, expect } from "bun:test";
import {
  checkTestCaseAllTransforms,
  parseTestCase,
  type DragTestCase,
} from "../test_case";

describe("loaders", () => {

  test("can_enter_loader", () => {
    const yamlContent = "name: Can enter loader\nbefore: _ >I\nafter: '> >I'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_enter_loader_reverse", () => {
    const yamlContent = "name: Can enter loader\nbefore: _ >I\nafter: '> >I'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_enter_loader_wiggle", () => {
    const yamlContent = "name: Can enter loader\nbefore: _ >I\nafter: '> >I'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_enter_loader_wiggle_reverse", () => {
    const yamlContent = "name: Can enter loader\nbefore: _ >I\nafter: '> >I'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_underground_over_wrong_direction_loaders", () => {
    const yamlContent = "name: Can underground over wrong direction loaders\nbefore: _ <O _ _ ^I _ _ <I\nafter: '>i <O >o >i ^I >o >i <I >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_underground_over_wrong_direction_loaders_reverse", () => {
    const yamlContent = "name: Can underground over wrong direction loaders\nbefore: _ <O _ _ ^I _ _ <I\nafter: '>i <O >o >i ^I >o >i <I >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_underground_over_wrong_direction_loaders_wiggle", () => {
    const yamlContent = "name: Can underground over wrong direction loaders\nbefore: _ <O _ _ ^I _ _ <I\nafter: '>i <O >o >i ^I >o >i <I >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_underground_over_wrong_direction_loaders_wiggle_reverse", () => {
    const yamlContent = "name: Can underground over wrong direction loaders\nbefore: _ <O _ _ ^I _ _ <I\nafter: '>i <O >o >i ^I >o >i <I >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_traverse_past_loader", () => {
    const yamlContent = "name: Cannot traverse past loader\nbefore: _ >I\nafter: '> >I *>'\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_traverse_past_loader_reverse", () => {
    const yamlContent = "name: Cannot traverse past loader\nbefore: _ >I\nafter: '> >I *>'\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_traverse_past_loader_wiggle", () => {
    const yamlContent = "name: Cannot traverse past loader\nbefore: _ >I\nafter: '> >I *>'\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_traverse_past_loader_wiggle_reverse", () => {
    const yamlContent = "name: Cannot traverse past loader\nbefore: _ >I\nafter: '> >I *>'\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("belt_segments_after_loader_are_obstacles_1", () => {
    const yamlContent = "name: Belt segments after loader are obstacles 1\nbefore: _ >O > _\nafter: '>i >O > >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("belt_segments_after_loader_are_obstacles_1_reverse", () => {
    const yamlContent = "name: Belt segments after loader are obstacles 1\nbefore: _ >O > _\nafter: '>i >O > >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("belt_segments_after_loader_are_obstacles_1_wiggle", () => {
    const yamlContent = "name: Belt segments after loader are obstacles 1\nbefore: _ >O > _\nafter: '>i >O > >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("belt_segments_after_loader_are_obstacles_1_wiggle_reverse", () => {
    const yamlContent = "name: Belt segments after loader are obstacles 1\nbefore: _ >O > _\nafter: '>i >O > >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("belt_segments_after_loader_are_obstacles_2", () => {
    const yamlContent = "name: Belt segments after loader are obstacles 2\nbefore: _ <I < _\nafter: '>i <I < >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("belt_segments_after_loader_are_obstacles_2_reverse", () => {
    const yamlContent = "name: Belt segments after loader are obstacles 2\nbefore: _ <I < _\nafter: '>i <I < >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("belt_segments_after_loader_are_obstacles_2_wiggle", () => {
    const yamlContent = "name: Belt segments after loader are obstacles 2\nbefore: _ <I < _\nafter: '>i <I < >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("belt_segments_after_loader_are_obstacles_2_wiggle_reverse", () => {
    const yamlContent = "name: Belt segments after loader are obstacles 2\nbefore: _ <I < _\nafter: '>i <I < >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });
});
