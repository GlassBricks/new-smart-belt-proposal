use protoype_abstract::test_case::{DragTestCase, check_test_case_all_variations};

/// Run a single test case from YAML content
pub fn run_test_case(content: &str) {
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_variations(&test_case, false).unwrap();
}

pub fn run_test_case_reverse(content: &str) {
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_variations(&test_case, true).unwrap();
}

// Include the generated test macro calls
include!(concat!(env!("OUT_DIR"), "/generated_tests.rs"));
