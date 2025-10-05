use prototype_abstract::fuzzer::*;
use prototype_abstract::world::ReadonlyWorld;
use rand::SeedableRng;
use rand::rngs::StdRng;
use rayon::prelude::*;
use std::sync::Mutex;
use std::sync::atomic::{AtomicUsize, Ordering};

#[derive(Debug)]
struct FuzzStats {
    total_tests: usize,
    passed: usize,
    failed: usize,
}

#[test]
fn fuzz_test_invariants() {
    let config = FuzzConfig::default();
    let num_tests = 1000;
    let base_seed = 42;

    let stats = Mutex::new(FuzzStats {
        total_tests: 0,
        passed: 0,
        failed: 0,
    });

    let failed_cases = Mutex::new(Vec::new());

    // Run tests in parallel
    let results: Vec<_> = (0..num_tests)
        .into_par_iter()
        .map(|i| {
            let seed = base_seed + i as u64;
            let mut rng = StdRng::seed_from_u64(seed);
            let test_case = generate_test_case(&mut rng, &config);

            // Catch panics from drag system creating invalid underground pairs
            let panic_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                run_fuzz_test(&test_case)
            }));

            let (result, check_result) = match panic_result {
                Ok(result) => {
                    let check_result = check_invariants(&result);
                    (Some(result), check_result)
                }
                Err(panic_info) => {
                    let msg = if let Some(s) = panic_info.downcast_ref::<String>() {
                        s.clone()
                    } else if let Some(s) = panic_info.downcast_ref::<&str>() {
                        s.to_string()
                    } else {
                        "Unknown panic".to_string()
                    };
                    (None, Err(format!("Drag system panicked: {}", msg)))
                }
            };

            (test_case, result, check_result)
        })
        .collect();

    // Process results
    for (test_case, result, check_result) in results {
        let mut stats = stats.lock().unwrap();
        stats.total_tests += 1;

        match check_result {
            Ok(_) => {
                stats.passed += 1;
            }
            Err(e) => {
                stats.failed += 1;
                eprintln!("\n❌ Invariant check failed (seed: {}):", test_case.seed);
                eprintln!("   Error: {}", e);
                eprintln!(
                    "   Start: {:?}, End: {:?}",
                    test_case.start_pos(),
                    test_case.end_pos()
                );
                eprintln!("   Tier: {:?}", test_case.tier);
                if let Some(ref r) = result {
                    eprintln!("   Errors: {:?}", r.errors);
                }

                failed_cases.lock().unwrap().push((test_case, e));
            }
        }
    }

    let stats = stats.lock().unwrap();
    println!("\n📊 Fuzzing Statistics:");
    println!("   Total tests: {}", stats.total_tests);
    println!("   Passed: {}", stats.passed);
    println!("   Failed: {}", stats.failed);

    let failed = failed_cases.lock().unwrap();
    if !failed.is_empty() {
        eprintln!("\n⚠️  {} test(s) failed!", failed.len());
        eprintln!("   First failure seed: {}", failed[0].0.seed);
        panic!("Fuzzing found invariant violations");
    }
}

#[test]
fn fuzz_test_single_reproducible() {
    use prototype_abstract::pos;

    // This test can be used to reproduce a specific failure
    let seed = 42;
    let config = FuzzConfig::default();

    let mut rng = StdRng::seed_from_u64(seed);
    let test_case = generate_test_case(&mut rng, &config);

    let result = run_fuzz_test(&test_case);

    // Debug: print world state
    println!("\n=== After World (row {}) ===", test_case.start_pos().y);
    for x in 0..20 {
        if let Some(entity) = result.world_after.get(pos(x, test_case.start_pos().y)) {
            if entity.as_belt().is_some() {
                print!("B");
            } else if entity.as_underground_belt().is_some() {
                print!("U");
            } else {
                print!("X");
            }
        } else {
            print!(".");
        }
    }
    println!();

    // Debug: check positions around the break
    for x in 8..13 {
        let p = pos(x, test_case.start_pos().y);
        if let Some(entity) = result.world_after.get(p) {
            let output = result.world_after.output_direction_at(p);
            let input = result.world_after.input_direction_at(p);
            if let Some(belt) = entity.as_belt() {
                println!(
                    "Pos {:?}: BELT dir={:?}, output={:?}, input={:?}",
                    p, belt.direction, output, input
                );
            } else if let Some(ug) = entity.as_underground_belt() {
                println!(
                    "Pos {:?}: UG dir={:?}, is_input={}, output={:?}, input={:?}",
                    p, ug.direction, ug.is_input, output, input
                );
            } else {
                println!("Pos {:?}: OTHER, output={:?}, input={:?}", p, output, input);
            }
        }
    }

    let belt_line = scan_belt_line(&result.world_after);
    println!("Belt line positions: {:?}", belt_line);
    println!("Belt line length: {}", belt_line.len());

    match check_invariants(&result) {
        Ok(_) => {
            println!("✅ Test passed with seed {}", seed);
        }
        Err(e) => {
            eprintln!("❌ Test failed: {}", e);
            eprintln!("   Seed: {}", seed);
            eprintln!(
                "   Start: {:?}, End: {:?}",
                test_case.start_pos(),
                test_case.end_pos()
            );
            eprintln!("   Tier: {:?}", test_case.tier);
            panic!("Test failed");
        }
    }
}

#[test]
fn fuzz_test_high_density() {
    // Test with higher entity density
    let config = FuzzConfig {
        world_width: 30,
        entity_density: 0.7,
    };

    let num_tests = 200;
    let base_seed = 2000;

    let failed = AtomicUsize::new(0);

    (0..num_tests).into_par_iter().for_each(|i| {
        let seed = base_seed + i as u64;
        let mut rng = StdRng::seed_from_u64(seed);
        let test_case = generate_test_case(&mut rng, &config);

        let result = run_fuzz_test(&test_case);

        if let Err(e) = check_invariants(&result) {
            eprintln!("\n❌ High density test failed (seed: {}):", test_case.seed);
            eprintln!("   Error: {}", e);
            failed.fetch_add(1, Ordering::Relaxed);
        }
    });

    let failed_count = failed.load(Ordering::Relaxed);
    println!("\n📊 High Density Statistics:");
    println!("   Total tests: {}", num_tests);
    println!("   Failed: {}", failed_count);

    assert_eq!(
        failed_count, 0,
        "High density fuzzing found invariant violations"
    );
}

#[test]
fn fuzz_test_sparse() {
    // Test with sparse entity placement
    let config = FuzzConfig {
        world_width: 50,
        entity_density: 0.1,
    };

    let num_tests = 200;
    let base_seed = 3000;

    let failed = AtomicUsize::new(0);

    (0..num_tests).into_par_iter().for_each(|i| {
        let seed = base_seed + i as u64;
        let mut rng = StdRng::seed_from_u64(seed);
        let test_case = generate_test_case(&mut rng, &config);

        let result = run_fuzz_test(&test_case);

        if let Err(e) = check_invariants(&result) {
            eprintln!("\n❌ Sparse test failed (seed: {}):", test_case.seed);
            eprintln!("   Error: {}", e);
            failed.fetch_add(1, Ordering::Relaxed);
        }
    });

    let failed_count = failed.load(Ordering::Relaxed);
    println!("\n📊 Sparse Statistics:");
    println!("   Total tests: {}", num_tests);
    println!("   Failed: {}", failed_count);

    assert_eq!(failed_count, 0, "Sparse fuzzing found invariant violations");
}
