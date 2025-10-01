use prototype_abstract::test_case::{DragTestCase, check_test_case_with_options};

/// Run a single test case from YAML content
pub fn run_test_case(content: &str) {
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_with_options(&test_case, false, false).unwrap();
}

pub fn run_test_case_reverse(content: &str) {
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_with_options(&test_case, true, false).unwrap();
}

pub fn run_test_case_wiggle(content: &str) {
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_with_options(&test_case, false, true).unwrap();
}

pub fn run_test_case_wiggle_reverse(content: &str) {
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_with_options(&test_case, true, true).unwrap();
}

// Include the generated test macro calls
include!(concat!(env!("OUT_DIR"), "/generated_tests.rs"));
