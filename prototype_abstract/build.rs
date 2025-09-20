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

        // Parse YAML to get test cases and generate macro calls
        match serde_yaml::from_str::<Vec<serde_yaml::Value>>(&content) {
            Ok(test_cases) => {
                for (i, test_case) in test_cases.iter().enumerate() {
                    let test_name =
                        if let Some(name) = test_case.get("name").and_then(|v| v.as_str()) {
                            format!("{}_{}", file_stem, name.to_lowercase().replace(" ", "_"))
                        } else {
                            format!("{}_test_{}", file_stem, i + 1)
                        };

                    let yaml_content = serde_yaml::to_string(&test_case).unwrap();

                    generated_code.push_str(&format!(
                        "test_drag!({}, r#\"{}\"#);\n",
                        test_name,
                        yaml_content.trim()
                    ));
                }
            }
            Err(_) => {
                // Try parsing as single test case
                match serde_yaml::from_str::<serde_yaml::Value>(&content) {
                    Ok(test_case) => {
                        let test_name =
                            if let Some(name) = test_case.get("name").and_then(|v| v.as_str()) {
                                format!("{}_{}", file_stem, name.to_lowercase().replace(" ", "_"))
                            } else {
                                file_stem.to_string()
                            };

                        generated_code.push_str(&format!(
                            "test_drag!({}, r#\"{}\"#);\n",
                            test_name,
                            content.trim()
                        ));
                    }
                    Err(e) => {
                        eprintln!("Warning: Failed to parse {}: {}", path.display(), e);
                    }
                }
            }
        }
    }

    fs::write(&dest_path, generated_code).unwrap();
}
