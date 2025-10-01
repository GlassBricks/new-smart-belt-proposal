use std::env;
use std::fs;

use std::path::PathBuf;

fn main() {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let test_suite_dir = PathBuf::from(&manifest_dir).join("../test_suite");
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = PathBuf::from(&out_dir).join("generated_tests.rs");

    // Tell cargo to rerun if test_suite directory changes
    println!("cargo:rerun-if-changed=../test_suite");
    if test_suite_dir.exists() {
        for entry in fs::read_dir(&test_suite_dir).unwrap() {
            let entry = entry.unwrap();
            println!("cargo:rerun-if-changed={}", entry.path().display());
        }
    }

    let mut generated_code = String::new();

    if !test_suite_dir.exists() {
        // Generate empty file if test suite doesn't exist
        fs::write(&dest_path, "// No test suite directory found\n").unwrap();
        return;
    }
    for entry in fs::read_dir(&test_suite_dir).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) != Some("yaml") {
            continue;
        }

        let content = fs::read_to_string(&path).unwrap();
        let file_stem = path.file_stem().unwrap().to_str().unwrap();

        generated_code.push_str(&format!("mod {} {{\n", file_stem));

        // Parse YAML to get test cases and generate macro calls
        let test_cases = serde_yaml::from_str::<Vec<serde_yaml::Value>>(&content).unwrap();
        for (i, test_case) in test_cases.iter().enumerate() {
            let test_name = if let Some(name) = test_case.get("name").and_then(|v| v.as_str()) {
                let sanitized_name =
                    name.to_lowercase()
                        .chars()
                        .fold(String::new(), |mut acc, c| {
                            if c.is_alphanumeric() {
                                acc.push(c);
                            } else if !acc.ends_with('_') {
                                acc.push('_');
                            }
                            acc
                        });
                sanitized_name.trim_end_matches('_').to_string()
            } else {
                format!("{:03}", i + 1)
            };

            let yaml_content = serde_yaml::to_string(&test_case).unwrap();

            let test_fns = &[
                ("run_test_case", ""),
                ("run_test_case_reverse", "_reverse"),
                ("run_test_case_wiggle", "_wiggle"),
                ("run_test_case_wiggle_reverse", "_wiggle_reverse"),
            ];

            for (fn_name, suffix) in test_fns {
                generated_code.push_str(&format!(
                    r##"
    #[test]
    fn test_{test_name}{suffix}() {{
        crate::{fn_name}(r#"{0}"#);
    }}
"##,
                    yaml_content.trim()
                ));
            }
        }

        generated_code.push_str("}\n");
    }

    fs::write(&dest_path, generated_code).unwrap();
}
