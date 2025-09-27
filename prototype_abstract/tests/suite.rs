use prototype_abstract::test_case::{
    DragTestCase, check_test_case_normal, check_test_case_reverse,
};

/// Run a single test case from YAML content
pub fn run_test_case(content: &str) {
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_normal(&test_case).unwrap();
}

pub fn run_test_case_reverse(content: &str) {
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_reverse(&test_case).unwrap();
}

// Include the generated test macro calls
include!(concat!(env!("OUT_DIR"), "/generated_tests.rs"));
