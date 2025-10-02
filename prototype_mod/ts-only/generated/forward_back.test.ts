// Generated test file for forward_back.yaml
import { describe, test, expect } from "bun:test";
import {
  checkTestCaseAllTransforms,
  parseTestCase,
  type DragTestCase,
} from "../test_case";

describe("forward_back", () => {

  test("empty_world", () => {
    const yamlContent = "name: Empty world\nbefore: _ _ _ _\nafter: '> > > >'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("empty_world_reverse", () => {
    const yamlContent = "name: Empty world\nbefore: _ _ _ _\nafter: '> > > >'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("back_over_obstacle", () => {
    const yamlContent = "name: Back over obstacle\nbefore: _ X *_ _\nafter: '>i X >o >'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("back_over_obstacle_reverse", () => {
    const yamlContent = "name: Back over obstacle\nbefore: _ X *_ _\nafter: '>i X >o >'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("back_over_obstacle_later", () => {
    const yamlContent = "name: Back over obstacle later\nbefore: _ X _ *_ _\nafter: '>i X >o > >'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("back_over_obstacle_later_reverse", () => {
    const yamlContent = "name: Back over obstacle later\nbefore: _ X _ *_ _\nafter: '>i X >o > >'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("back_from_obstactle", () => {
    const yamlContent = "name: Back from obstactle\nbefore: _ _ *_ X _\nafter: '> > >i X >o >'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("back_from_obstactle_reverse", () => {
    const yamlContent = "name: Back from obstactle\nbefore: _ _ *_ X _\nafter: '> > >i X >o >'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("back_from_untraversed_obstactle", () => {
    const yamlContent = "name: Back from untraversed obstactle\nbefore: _ *_ X X X\nafter: '> > X X X'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("back_from_untraversed_obstactle_reverse", () => {
    const yamlContent = "name: Back from untraversed obstactle\nbefore: _ *_ X X X\nafter: '> > X X X'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("back_from_obstactle_later", () => {
    const yamlContent = "name: Back from obstactle later\nbefore: _ *_ _ X _\nafter: '> > >i X >o >'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("back_from_obstactle_later_reverse", () => {
    const yamlContent = "name: Back from obstactle later\nbefore: _ *_ _ X _\nafter: '> > >i X >o >'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("back_over_splitter", () => {
    const yamlContent = "name: Back over splitter\nbefore: _ >s *_ _ _\nafter: '> >s > > >'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("back_over_splitter_reverse", () => {
    const yamlContent = "name: Back over splitter\nbefore: _ >s *_ _ _\nafter: '> >s > > >'\nforward_back: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });
});
