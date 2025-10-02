// Generated test file for from_spec.yaml
import { describe, test, expect } from "bun:test";
import {
  checkTestCaseAllTransforms,
  parseTestCase,
  type DragTestCase,
} from "../test_case";

describe("from_spec", () => {

  test("0", () => {
    const yamlContent = "name: '0'\nbefore: ' _ _ < _ >'\nafter: '> > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("0_reverse", () => {
    const yamlContent = "name: '0'\nbefore: ' _ _ < _ >'\nafter: '> > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("0_wiggle", () => {
    const yamlContent = "name: '0'\nbefore: ' _ _ < _ >'\nafter: '> > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("0_wiggle_reverse", () => {
    const yamlContent = "name: '0'\nbefore: ' _ _ < _ >'\nafter: '> > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("1", () => {
    const yamlContent = "name: '1'\nbefore: ' _ _ < > > <'\nafter: '> > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("1_reverse", () => {
    const yamlContent = "name: '1'\nbefore: ' _ _ < > > <'\nafter: '> > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("1_wiggle", () => {
    const yamlContent = "name: '1'\nbefore: ' _ _ < > > <'\nafter: '> > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("1_wiggle_reverse", () => {
    const yamlContent = "name: '1'\nbefore: ' _ _ < > > <'\nafter: '> > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("2", () => {
    const yamlContent = "name: '2'\nbefore: |\n  _ < < < < <\nafter: |\n  > > > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("2_reverse", () => {
    const yamlContent = "name: '2'\nbefore: |\n  _ < < < < <\nafter: |\n  > > > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("2_wiggle", () => {
    const yamlContent = "name: '2'\nbefore: |\n  _ < < < < <\nafter: |\n  > > > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("2_wiggle_reverse", () => {
    const yamlContent = "name: '2'\nbefore: |\n  _ < < < < <\nafter: |\n  > > > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("3", () => {
    const yamlContent = "name: '3'\nbefore: _ > > > > >\nafter: '> > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("3_reverse", () => {
    const yamlContent = "name: '3'\nbefore: _ > > > > >\nafter: '> > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("3_wiggle", () => {
    const yamlContent = "name: '3'\nbefore: _ > > > > >\nafter: '> > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("3_wiggle_reverse", () => {
    const yamlContent = "name: '3'\nbefore: _ > > > > >\nafter: '> > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("4", () => {
    const yamlContent = "name: '4'\nbefore: ' _ > >i _ >o >'\nafter: '> > >i _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("4_reverse", () => {
    const yamlContent = "name: '4'\nbefore: ' _ > >i _ >o >'\nafter: '> > >i _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("4_wiggle", () => {
    const yamlContent = "name: '4'\nbefore: ' _ > >i _ >o >'\nafter: '> > >i _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("4_wiggle_reverse", () => {
    const yamlContent = "name: '4'\nbefore: ' _ > >i _ >o >'\nafter: '> > >i _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("5", () => {
    const yamlContent = "name: '5'\nbefore: ' _ < <o _ <i <'\nafter: '> > >i _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("5_reverse", () => {
    const yamlContent = "name: '5'\nbefore: ' _ < <o _ <i <'\nafter: '> > >i _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("5_wiggle", () => {
    const yamlContent = "name: '5'\nbefore: ' _ < <o _ <i <'\nafter: '> > >i _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("5_wiggle_reverse", () => {
    const yamlContent = "name: '5'\nbefore: ' _ < <o _ <i <'\nafter: '> > >i _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("6", () => {
    const yamlContent = "name: '6'\nbefore: ' _ < >i _ >o <'\nafter: '> > >i _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("6_reverse", () => {
    const yamlContent = "name: '6'\nbefore: ' _ < >i _ >o <'\nafter: '> > >i _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("6_wiggle", () => {
    const yamlContent = "name: '6'\nbefore: ' _ < >i _ >o <'\nafter: '> > >i _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("6_wiggle_reverse", () => {
    const yamlContent = "name: '6'\nbefore: ' _ < >i _ >o <'\nafter: '> > >i _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("7", () => {
    const yamlContent = "name: '7'\nbefore: ' _ _ > >s > >'\nafter: '> > > >s > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("7_reverse", () => {
    const yamlContent = "name: '7'\nbefore: ' _ _ > >s > >'\nafter: '> > > >s > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("7_wiggle", () => {
    const yamlContent = "name: '7'\nbefore: ' _ _ > >s > >'\nafter: '> > > >s > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("7_wiggle_reverse", () => {
    const yamlContent = "name: '7'\nbefore: ' _ _ > >s > >'\nafter: '> > > >s > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("8", () => {
    const yamlContent = "name: '8'\nbefore: '>i _ >o >s >i _ >o'\nafter: '> > > >s >i _ >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("8_reverse", () => {
    const yamlContent = "name: '8'\nbefore: '>i _ >o >s >i _ >o'\nafter: '> > > >s >i _ >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("8_wiggle", () => {
    const yamlContent = "name: '8'\nbefore: '>i _ >o >s >i _ >o'\nafter: '> > > >s >i _ >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("8_wiggle_reverse", () => {
    const yamlContent = "name: '8'\nbefore: '>i _ >o >s >i _ >o'\nafter: '> > > >s >i _ >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("9", () => {
    const yamlContent = "name: '9'\nbefore: ' _ _ _ >s >s'\nafter: '> > > >s >s'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("9_reverse", () => {
    const yamlContent = "name: '9'\nbefore: ' _ _ _ >s >s'\nafter: '> > > >s >s'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("9_wiggle", () => {
    const yamlContent = "name: '9'\nbefore: ' _ _ _ >s >s'\nafter: '> > > >s >s'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("9_wiggle_reverse", () => {
    const yamlContent = "name: '9'\nbefore: ' _ _ _ >s >s'\nafter: '> > > >s >s'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("10", () => {
    const yamlContent = "name: '10'\nbefore: ' _ X _ _'\nafter: '>i X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("10_reverse", () => {
    const yamlContent = "name: '10'\nbefore: ' _ X _ _'\nafter: '>i X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("10_wiggle", () => {
    const yamlContent = "name: '10'\nbefore: ' _ X _ _'\nafter: '>i X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("10_wiggle_reverse", () => {
    const yamlContent = "name: '10'\nbefore: ' _ X _ _'\nafter: '>i X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("11", () => {
    const yamlContent = "name: '11'\nbefore: ' _ <'\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("11_reverse", () => {
    const yamlContent = "name: '11'\nbefore: ' _ <'\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("11_wiggle", () => {
    const yamlContent = "name: '11'\nbefore: ' _ <'\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("11_wiggle_reverse", () => {
    const yamlContent = "name: '11'\nbefore: ' _ <'\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("12", () => {
    const yamlContent = "name: '12'\nbefore: ' _ > ^ <'\nafter: '> >i ^ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("12_reverse", () => {
    const yamlContent = "name: '12'\nbefore: ' _ > ^ <'\nafter: '> >i ^ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("12_wiggle", () => {
    const yamlContent = "name: '12'\nbefore: ' _ > ^ <'\nafter: '> >i ^ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("12_wiggle_reverse", () => {
    const yamlContent = "name: '12'\nbefore: ' _ > ^ <'\nafter: '> >i ^ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("13", () => {
    const yamlContent = "name: '13'\nbefore: |\n  _ _ ^\n  _ _ ^ < _ _\nafter: |\n  _ _  ^\n  > >i ^ < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("13_reverse", () => {
    const yamlContent = "name: '13'\nbefore: |\n  _ _ ^\n  _ _ ^ < _ _\nafter: |\n  _ _  ^\n  > >i ^ < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("13_wiggle", () => {
    const yamlContent = "name: '13'\nbefore: |\n  _ _ ^\n  _ _ ^ < _ _\nafter: |\n  _ _  ^\n  > >i ^ < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("13_wiggle_reverse", () => {
    const yamlContent = "name: '13'\nbefore: |\n  _ _ ^\n  _ _ ^ < _ _\nafter: |\n  _ _  ^\n  > >i ^ < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("14", () => {
    const yamlContent = "name: '14'\nbefore: |\n  _ _ ^ _ _ ^\n  _ > ^ _ > ^ _\n  _ ^ _ _ ^\nafter: |\n  > >i ^ >o >i ^ >o\n  _ > ^ _ > ^ _ _\n  _ ^ _ _ ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("14_reverse", () => {
    const yamlContent = "name: '14'\nbefore: |\n  _ _ ^ _ _ ^\n  _ > ^ _ > ^ _\n  _ ^ _ _ ^\nafter: |\n  > >i ^ >o >i ^ >o\n  _ > ^ _ > ^ _ _\n  _ ^ _ _ ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("14_wiggle", () => {
    const yamlContent = "name: '14'\nbefore: |\n  _ _ ^ _ _ ^\n  _ > ^ _ > ^ _\n  _ ^ _ _ ^\nafter: |\n  > >i ^ >o >i ^ >o\n  _ > ^ _ > ^ _ _\n  _ ^ _ _ ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("14_wiggle_reverse", () => {
    const yamlContent = "name: '14'\nbefore: |\n  _ _ ^ _ _ ^\n  _ > ^ _ > ^ _\n  _ ^ _ _ ^\nafter: |\n  > >i ^ >o >i ^ >o\n  _ > ^ _ > ^ _ _\n  _ ^ _ _ ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("15", () => {
    const yamlContent = "name: '15'\nbefore: |\n  _ _ v < < < _\n  _ _ v\nafter: |\n  > >i v < < < >o\n  _ _  v\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("15_reverse", () => {
    const yamlContent = "name: '15'\nbefore: |\n  _ _ v < < < _\n  _ _ v\nafter: |\n  > >i v < < < >o\n  _ _  v\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("15_wiggle", () => {
    const yamlContent = "name: '15'\nbefore: |\n  _ _ v < < < _\n  _ _ v\nafter: |\n  > >i v < < < >o\n  _ _  v\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("15_wiggle_reverse", () => {
    const yamlContent = "name: '15'\nbefore: |\n  _ _ v < < < _\n  _ _ v\nafter: |\n  > >i v < < < >o\n  _ _  v\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("16", () => {
    const yamlContent = "name: '16'\nbefore: |\n  _ v < < < _\n  _ > > > ^ _\nafter: |\n  >i v < < < >o\n  _ > > > ^ _\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("16_reverse", () => {
    const yamlContent = "name: '16'\nbefore: |\n  _ v < < < _\n  _ > > > ^ _\nafter: |\n  >i v < < < >o\n  _ > > > ^ _\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("16_wiggle", () => {
    const yamlContent = "name: '16'\nbefore: |\n  _ v < < < _\n  _ > > > ^ _\nafter: |\n  >i v < < < >o\n  _ > > > ^ _\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("16_wiggle_reverse", () => {
    const yamlContent = "name: '16'\nbefore: |\n  _ v < < < _\n  _ > > > ^ _\nafter: |\n  >i v < < < >o\n  _ > > > ^ _\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("17", () => {
    const yamlContent = "name: '17'\nbefore: _ _ _ <s\nafter: '> > >i <s >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("17_reverse", () => {
    const yamlContent = "name: '17'\nbefore: _ _ _ <s\nafter: '> > >i <s >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("17_wiggle", () => {
    const yamlContent = "name: '17'\nbefore: _ _ _ <s\nafter: '> > >i <s >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("17_wiggle_reverse", () => {
    const yamlContent = "name: '17'\nbefore: _ _ _ <s\nafter: '> > >i <s >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("18", () => {
    const yamlContent = "name: '18'\nbefore: |\n  _ _ > > >s\n  _ _ ^\nafter: |\n  > >i > > >s >o\n  _ _  ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("18_reverse", () => {
    const yamlContent = "name: '18'\nbefore: |\n  _ _ > > >s\n  _ _ ^\nafter: |\n  > >i > > >s >o\n  _ _  ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("18_wiggle", () => {
    const yamlContent = "name: '18'\nbefore: |\n  _ _ > > >s\n  _ _ ^\nafter: |\n  > >i > > >s >o\n  _ _  ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("18_wiggle_reverse", () => {
    const yamlContent = "name: '18'\nbefore: |\n  _ _ > > >s\n  _ _ ^\nafter: |\n  > >i > > >s >o\n  _ _  ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("19", () => {
    const yamlContent = "name: '19'\nbefore: |\n  _ _ >s > > v\n  _ _ _  _ _ v\nafter: |\n  > >i >s > > v >o\n  _  _ _  _ _ v\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("19_reverse", () => {
    const yamlContent = "name: '19'\nbefore: |\n  _ _ >s > > v\n  _ _ _  _ _ v\nafter: |\n  > >i >s > > v >o\n  _  _ _  _ _ v\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("19_wiggle", () => {
    const yamlContent = "name: '19'\nbefore: |\n  _ _ >s > > v\n  _ _ _  _ _ v\nafter: |\n  > >i >s > > v >o\n  _  _ _  _ _ v\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("19_wiggle_reverse", () => {
    const yamlContent = "name: '19'\nbefore: |\n  _ _ >s > > v\n  _ _ _  _ _ v\nafter: |\n  > >i >s > > v >o\n  _  _ _  _ _ v\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("20", () => {
    const yamlContent = "name: '20'\nbefore: _ _ >s X _\nafter: '> > >s *X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("20_reverse", () => {
    const yamlContent = "name: '20'\nbefore: _ _ >s X _\nafter: '> > >s *X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("20_wiggle", () => {
    const yamlContent = "name: '20'\nbefore: _ _ >s X _\nafter: '> > >s *X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("20_wiggle_reverse", () => {
    const yamlContent = "name: '20'\nbefore: _ _ >s X _\nafter: '> > >s *X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("21", () => {
    const yamlContent = "name: '21'\nbefore: |\n  _ _ _ _  _ _ _ _  v _\n  _ v < <o _ _ _ <i <\n  _ v\nafter: |\n  2> 2> 2> 2> 2> 2> 2> 2>i v 2>o\n  _ v < <o _ _ _ <i <\n  _ v\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("21_reverse", () => {
    const yamlContent = "name: '21'\nbefore: |\n  _ _ _ _  _ _ _ _  v _\n  _ v < <o _ _ _ <i <\n  _ v\nafter: |\n  2> 2> 2> 2> 2> 2> 2> 2>i v 2>o\n  _ v < <o _ _ _ <i <\n  _ v\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("21_wiggle", () => {
    const yamlContent = "name: '21'\nbefore: |\n  _ _ _ _  _ _ _ _  v _\n  _ v < <o _ _ _ <i <\n  _ v\nafter: |\n  2> 2> 2> 2> 2> 2> 2> 2>i v 2>o\n  _ v < <o _ _ _ <i <\n  _ v\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("21_wiggle_reverse", () => {
    const yamlContent = "name: '21'\nbefore: |\n  _ _ _ _  _ _ _ _  v _\n  _ v < <o _ _ _ <i <\n  _ v\nafter: |\n  2> 2> 2> 2> 2> 2> 2> 2>i v 2>o\n  _ v < <o _ _ _ <i <\n  _ v\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("22", () => {
    const yamlContent = "name: '22'\nbefore: ' _ < <o _ <i X _'\nafter: '> > >i _ >o *X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("22_reverse", () => {
    const yamlContent = "name: '22'\nbefore: ' _ < <o _ <i X _'\nafter: '> > >i _ >o *X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("22_wiggle", () => {
    const yamlContent = "name: '22'\nbefore: ' _ < <o _ <i X _'\nafter: '> > >i _ >o *X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("22_wiggle_reverse", () => {
    const yamlContent = "name: '22'\nbefore: ' _ < <o _ <i X _'\nafter: '> > >i _ >o *X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("23", () => {
    const yamlContent = "name: '23'\nbefore: |\n  _ _ _  _  v\n  _ v <o <i <\n  _ v\nafter: |\n  _ _ _ _ v _\n  > v <o <i < *>\n  _ v\nafter_for_reverse: |\n  _ _ _ _ v _\n  > < *<o <i < >\n  _ v\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("23_reverse", () => {
    const yamlContent = "name: '23'\nbefore: |\n  _ _ _  _  v\n  _ v <o <i <\n  _ v\nafter: |\n  _ _ _ _ v _\n  > v <o <i < *>\n  _ v\nafter_for_reverse: |\n  _ _ _ _ v _\n  > < *<o <i < >\n  _ v\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("23_wiggle", () => {
    const yamlContent = "name: '23'\nbefore: |\n  _ _ _  _  v\n  _ v <o <i <\n  _ v\nafter: |\n  _ _ _ _ v _\n  > v <o <i < *>\n  _ v\nafter_for_reverse: |\n  _ _ _ _ v _\n  > < *<o <i < >\n  _ v\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("23_wiggle_reverse", () => {
    const yamlContent = "name: '23'\nbefore: |\n  _ _ _  _  v\n  _ v <o <i <\n  _ v\nafter: |\n  _ _ _ _ v _\n  > v <o <i < *>\n  _ v\nafter_for_reverse: |\n  _ _ _ _ v _\n  > < *<o <i < >\n  _ v\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("24", () => {
    const yamlContent = "name: '24'\nbefore: ' _ >i _ >o >s X'\nafter: '> >i _ >o >s *X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("24_reverse", () => {
    const yamlContent = "name: '24'\nbefore: ' _ >i _ >o >s X'\nafter: '> >i _ >o >s *X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("24_wiggle", () => {
    const yamlContent = "name: '24'\nbefore: ' _ >i _ >o >s X'\nafter: '> >i _ >o >s *X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("24_wiggle_reverse", () => {
    const yamlContent = "name: '24'\nbefore: ' _ >i _ >o >s X'\nafter: '> >i _ >o >s *X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("25", () => {
    const yamlContent = "name: '25'\nbefore: ' _ _  ^ > _'\nafter: '> >i ^ >o > >'\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("25_wiggle", () => {
    const yamlContent = "name: '25'\nbefore: ' _ _  ^ > _'\nafter: '> >i ^ >o > >'\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("26", () => {
    const yamlContent = "name: '26'\nbefore: ' _ _ > ^ < _ _'\nafter: '> > >i ^ >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("26_reverse", () => {
    const yamlContent = "name: '26'\nbefore: ' _ _ > ^ < _ _'\nafter: '> > >i ^ >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("26_wiggle", () => {
    const yamlContent = "name: '26'\nbefore: ' _ _ > ^ < _ _'\nafter: '> > >i ^ >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("26_wiggle_reverse", () => {
    const yamlContent = "name: '26'\nbefore: ' _ _ > ^ < _ _'\nafter: '> > >i ^ >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("27", () => {
    const yamlContent = "name: '27'\nbefore: '> > >i ^ >o > > _'\nafter: '> > >i ^ >o > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("27_reverse", () => {
    const yamlContent = "name: '27'\nbefore: '> > >i ^ >o > > _'\nafter: '> > >i ^ >o > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("27_wiggle", () => {
    const yamlContent = "name: '27'\nbefore: '> > >i ^ >o > > _'\nafter: '> > >i ^ >o > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("27_wiggle_reverse", () => {
    const yamlContent = "name: '27'\nbefore: '> > >i ^ >o > > _'\nafter: '> > >i ^ >o > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("28", () => {
    const yamlContent = "name: '28'\nbefore: ' _ _ <o _ <i < _'\nafter: '> > >i _ >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("28_reverse", () => {
    const yamlContent = "name: '28'\nbefore: ' _ _ <o _ <i < _'\nafter: '> > >i _ >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("28_wiggle", () => {
    const yamlContent = "name: '28'\nbefore: ' _ _ <o _ <i < _'\nafter: '> > >i _ >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("28_wiggle_reverse", () => {
    const yamlContent = "name: '28'\nbefore: ' _ _ <o _ <i < _'\nafter: '> > >i _ >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("29", () => {
    const yamlContent = "name: '29'\nbefore: '> > >i _ >o > >'\nafter: '> > >i _ >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("29_reverse", () => {
    const yamlContent = "name: '29'\nbefore: '> > >i _ >o > >'\nafter: '> > >i _ >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("29_wiggle", () => {
    const yamlContent = "name: '29'\nbefore: '> > >i _ >o > >'\nafter: '> > >i _ >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("29_wiggle_reverse", () => {
    const yamlContent = "name: '29'\nbefore: '> > >i _ >o > >'\nafter: '> > >i _ >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("30", () => {
    const yamlContent = "name: '30'\nbefore: |\n  _  _ _ _ ^ _\n  *_ _ > > ^\nafter: |\n  _ _ _ _ ^\n  > > > > ^ *>  >\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("30_reverse", () => {
    const yamlContent = "name: '30'\nbefore: |\n  _  _ _ _ ^ _\n  *_ _ > > ^\nafter: |\n  _ _ _ _ ^\n  > > > > ^ *>  >\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("30_wiggle", () => {
    const yamlContent = "name: '30'\nbefore: |\n  _  _ _ _ ^ _\n  *_ _ > > ^\nafter: |\n  _ _ _ _ ^\n  > > > > ^ *>  >\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("30_wiggle_reverse", () => {
    const yamlContent = "name: '30'\nbefore: |\n  _  _ _ _ ^ _\n  *_ _ > > ^\nafter: |\n  _ _ _ _ ^\n  > > > > ^ *>  >\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("31", () => {
    const yamlContent = "name: '31'\nbefore: |\n  _ _ _ _  _ ^\n  _ _ _ >s > ^ _\nafter: |\n  _ _ _ _  _ ^\n  > > >i >s > ^ >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("31_reverse", () => {
    const yamlContent = "name: '31'\nbefore: |\n  _ _ _ _  _ ^\n  _ _ _ >s > ^ _\nafter: |\n  _ _ _ _  _ ^\n  > > >i >s > ^ >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("31_wiggle", () => {
    const yamlContent = "name: '31'\nbefore: |\n  _ _ _ _  _ ^\n  _ _ _ >s > ^ _\nafter: |\n  _ _ _ _  _ ^\n  > > >i >s > ^ >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("31_wiggle_reverse", () => {
    const yamlContent = "name: '31'\nbefore: |\n  _ _ _ _  _ ^\n  _ _ _ >s > ^ _\nafter: |\n  _ _ _ _  _ ^\n  > > >i >s > ^ >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("32", () => {
    const yamlContent = "name: '32'\nbefore: |\n  _ _ >s > > > _\nafter: |\n  > > >s > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("32_reverse", () => {
    const yamlContent = "name: '32'\nbefore: |\n  _ _ >s > > > _\nafter: |\n  > > >s > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("32_wiggle", () => {
    const yamlContent = "name: '32'\nbefore: |\n  _ _ >s > > > _\nafter: |\n  > > >s > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("32_wiggle_reverse", () => {
    const yamlContent = "name: '32'\nbefore: |\n  _ _ >s > > > _\nafter: |\n  > > >s > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("33", () => {
    const yamlContent = "name: '33'\nbefore: |\n  _ _ >  _ ^ > >\n  *_ _ > >s > ^ _\nafter: |\n  _ _ >  _ ^ > >\n  > > > >s > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("33_reverse", () => {
    const yamlContent = "name: '33'\nbefore: |\n  _ _ >  _ ^ > >\n  *_ _ > >s > ^ _\nafter: |\n  _ _ >  _ ^ > >\n  > > > >s > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("33_wiggle", () => {
    const yamlContent = "name: '33'\nbefore: |\n  _ _ >  _ ^ > >\n  *_ _ > >s > ^ _\nafter: |\n  _ _ >  _ ^ > >\n  > > > >s > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("33_wiggle_reverse", () => {
    const yamlContent = "name: '33'\nbefore: |\n  _ _ >  _ ^ > >\n  *_ _ > >s > ^ _\nafter: |\n  _ _ >  _ ^ > >\n  > > > >s > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("34", () => {
    const yamlContent = "name: '34'\nbefore: ' _ _ < < < _ _'\nafter: '> > > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("34_reverse", () => {
    const yamlContent = "name: '34'\nbefore: ' _ _ < < < _ _'\nafter: '> > > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("34_wiggle", () => {
    const yamlContent = "name: '34'\nbefore: ' _ _ < < < _ _'\nafter: '> > > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("34_wiggle_reverse", () => {
    const yamlContent = "name: '34'\nbefore: ' _ _ < < < _ _'\nafter: '> > > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("35", () => {
    const yamlContent = "name: '35'\nbefore: '> > > > > > >'\nafter: '> > > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("35_reverse", () => {
    const yamlContent = "name: '35'\nbefore: '> > > > > > >'\nafter: '> > > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("35_wiggle", () => {
    const yamlContent = "name: '35'\nbefore: '> > > > > > >'\nafter: '> > > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("35_wiggle_reverse", () => {
    const yamlContent = "name: '35'\nbefore: '> > > > > > >'\nafter: '> > > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("36", () => {
    const yamlContent = "name: '36'\nbefore: |\n  _ _ _ _ v _ _\n  _ _ < < < _ _\nafter: |\n  _ _ _ _ v _ _\n  > >i < < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("36_reverse", () => {
    const yamlContent = "name: '36'\nbefore: |\n  _ _ _ _ v _ _\n  _ _ < < < _ _\nafter: |\n  _ _ _ _ v _ _\n  > >i < < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("36_wiggle", () => {
    const yamlContent = "name: '36'\nbefore: |\n  _ _ _ _ v _ _\n  _ _ < < < _ _\nafter: |\n  _ _ _ _ v _ _\n  > >i < < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("36_wiggle_reverse", () => {
    const yamlContent = "name: '36'\nbefore: |\n  _ _ _ _ v _ _\n  _ _ < < < _ _\nafter: |\n  _ _ _ _ v _ _\n  > >i < < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("37", () => {
    const yamlContent = "name: '37'\nbefore: |\n  _ _ _ _ v _ _\n  > >i < < < >o >\nafter: |\n  _ _ _ _ v _ _\n  > >i < < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("37_reverse", () => {
    const yamlContent = "name: '37'\nbefore: |\n  _ _ _ _ v _ _\n  > >i < < < >o >\nafter: |\n  _ _ _ _ v _ _\n  > >i < < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("37_wiggle", () => {
    const yamlContent = "name: '37'\nbefore: |\n  _ _ _ _ v _ _\n  > >i < < < >o >\nafter: |\n  _ _ _ _ v _ _\n  > >i < < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("37_wiggle_reverse", () => {
    const yamlContent = "name: '37'\nbefore: |\n  _ _ _ _ v _ _\n  > >i < < < >o >\nafter: |\n  _ _ _ _ v _ _\n  > >i < < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("38", () => {
    const yamlContent = "name: '38'\nbefore: |\n  _ _  _ _ _ _ _ _ _ ^\n  _ _ >s > > > > > > ^\nafter: |\n  _ _  _ _ _ _ _ _ _ ^\n  > > >s > > > > > > ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("38_reverse", () => {
    const yamlContent = "name: '38'\nbefore: |\n  _ _  _ _ _ _ _ _ _ ^\n  _ _ >s > > > > > > ^\nafter: |\n  _ _  _ _ _ _ _ _ _ ^\n  > > >s > > > > > > ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("38_wiggle", () => {
    const yamlContent = "name: '38'\nbefore: |\n  _ _  _ _ _ _ _ _ _ ^\n  _ _ >s > > > > > > ^\nafter: |\n  _ _  _ _ _ _ _ _ _ ^\n  > > >s > > > > > > ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("38_wiggle_reverse", () => {
    const yamlContent = "name: '38'\nbefore: |\n  _ _  _ _ _ _ _ _ _ ^\n  _ _ >s > > > > > > ^\nafter: |\n  _ _  _ _ _ _ _ _ _ ^\n  > > >s > > > > > > ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });
});
