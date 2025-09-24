use std::{
    fs,
    path::{Path, PathBuf},
    str::FromStr,
};

use anyhow::{Context, Result};
use clap::Parser;
use comrak::{
    Arena, format_commonmark,
    nodes::{NodeLink, NodeValue},
    parse_document,
};
use serde_json::Value;
use tokio::process::Command;

use protoype_abstract::{Direction, Entity, Position, Splitter, World, WorldReader, pos};

fn direction_to_factorio_sat(dir: Direction) -> u8 {
    match dir {
        Direction::East => 0,
        Direction::North => 1,
        Direction::West => 2,
        Direction::South => 3,
    }
}

#[derive(Clone)]
struct GridImg {
    world: World,
    width: usize,
    height: usize,
}

impl FromStr for GridImg {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self> {
        let (world, _) = protoype_abstract::test_case::parse_world(s)?;

        // Calculate dimensions from the input text to preserve the original grid size
        let lines: Vec<&str> = s.lines().collect();
        let height = lines.len();
        let width = lines
            .iter()
            .map(|line| line.split_whitespace().count())
            .max()
            .unwrap_or(0);

        Ok(GridImg {
            world,
            width,
            height,
        })
    }
}

fn apply_splitter_completion(world: &mut World) -> Result<()> {
    let bounds = world.bounds();
    if bounds.is_empty() {
        return Ok(());
    }

    let mut entities_to_add = Vec::new();

    // Iterate through all positions in the world
    for y in bounds.min.y..bounds.max.y {
        for x in bounds.min.x..bounds.max.x {
            let position = pos(x, y);
            if let Some(entity) = world.get(position)
                && let Some(splitter) = (entity as &dyn std::any::Any).downcast_ref::<Splitter>()
            {
                let tail_pos = pos(x, y) + splitter.direction.rotate_ccw().to_vector();
                if tail_pos.x >= bounds.min.x
                    && tail_pos.x < bounds.max.x
                    && tail_pos.y >= bounds.min.y
                    && tail_pos.y < bounds.max.y
                    && world.get(tail_pos).is_none()
                {
                    entities_to_add
                        .push((tail_pos, Splitter::new(splitter.direction, splitter.tier)));
                }
            }
        }
    }

    // Add the tail entities
    for (pos, entity) in entities_to_add {
        world.set_exactly(pos, entity);
    }

    Ok(())
}

async fn render_with_factorio_sat(mut grid: GridImg, img_out_path: &Path) -> Result<()> {
    // Apply splitter completion first
    apply_splitter_completion(&mut grid.world)?;

    // Use the original grid dimensions to create the proper rectangular output
    let mut result = Vec::new();
    for y in 0..grid.height {
        let mut json_row = Vec::new();
        for x in 0..grid.width {
            let position = pos(x as i32, y as i32);
            let tile_data = if let Some(entity) = grid.world.get(position) {
                entity_to_json(&grid.world, position, entity)?
            } else {
                serde_json::json!({
                    "type": "empty"
                })
            };
            json_row.push(serde_json::json!({ "tile": tile_data }));
        }
        result.push(json_row);
    }

    // Setup and call Factorio-SAT renderer
    let temp_dir = tempfile::tempdir()?;
    let json_input = serde_json::to_string(&result)?;

    let factorio_sat_dir = Path::new("Factorio-SAT");

    let mut child = Command::new("python3")
        .arg("-m")
        .arg("factorio_sat.render")
        .arg("--export-format=gif")
        .arg("--export-all")
        .arg("--cell-size=32")
        .arg("--hide-colour")
        .env("PYTHONPATH", factorio_sat_dir)
        .env("SDL_VIDEODRIVER", "x11")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .current_dir(&temp_dir)
        .spawn()
        .with_context(|| "Failed to start Factorio-SAT renderer")?;

    // Send JSON input to the process
    if let Some(stdin) = child.stdin.take() {
        use tokio::io::AsyncWriteExt;
        let mut stdin = stdin;
        stdin.write_all(json_input.as_bytes()).await?;
        stdin.flush().await?;
    }

    let output = child.wait_with_output().await?;

    let generated_gif = temp_dir.path().join("0.gif");
    if output.status.success() && generated_gif.exists() {
        std::fs::copy(&generated_gif, img_out_path)?;
    } else {
        anyhow::bail!(
            "Factorio-SAT renderer failed. status: {}, Error output: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr)
        );
    }

    Ok(())
}

fn entity_to_json(world: &World, position: Position, entity: &dyn Entity) -> Result<Value> {
    if let Some(belt) = entity.as_belt() {
        // Use the world's belt input direction logic to determine if this is a curved belt
        let effective_input = world.effective_input_direction(position, belt);

        let input_dir = effective_input.unwrap_or(belt.direction);
        let tile_data = serde_json::json!({
            "type": "belt",
            "input_direction": direction_to_factorio_sat(input_dir),
            "output_direction": direction_to_factorio_sat(belt.direction)
        });
        Ok(tile_data)
    } else if let Some(ug_belt) = entity.as_underground_belt() {
        Ok(serde_json::json!({
            "type": "underground_belt",
            "direction": direction_to_factorio_sat(ug_belt.direction),
            "is_input": ug_belt.is_input
        }))
    } else if let Some(splitter) = entity.as_splitter() {
        let tail_pos = position + splitter.direction.rotate_ccw().to_vector();
        let is_head = world.get(tail_pos).and_then(|e| e.as_splitter()).is_none();
        Ok(serde_json::json!({
            "type": "splitter",
            "direction": direction_to_factorio_sat(splitter.direction),
            "is_head": is_head
        }))
    } else if entity.as_colliding().is_some() {
        Ok(serde_json::json!({
            "type": "inserter",
            "direction": 0,
            "insert_type": 0
        }))
    } else {
        Ok(serde_json::json!({
            "type": "empty"
        }))
    }
}

async fn process_markdown(
    input: &str,
    image_out_dir: &Path,
    file_out_path: &Path,
    prefix: &str,
) -> Result<()> {
    let arena = Arena::new();
    let root = parse_document(&arena, input, &Default::default());

    let mut nodes_to_replace = Vec::new();
    let mut image_contents = Vec::new();

    for node in root.descendants() {
        if let NodeValue::CodeBlock(cb) = &node.data.borrow().value
            && cb.info == "fac-img"
        {
            nodes_to_replace.push(node);
            image_contents.push(cb.literal.clone());
        }
    }

    // Process images concurrently with async
    let mut tasks = Vec::new();
    for (id, literal) in image_contents.iter().enumerate() {
        let img_out_path = image_out_dir.join(format!("{}_{}.gif", prefix, id));
        let file_out_path = file_out_path.to_path_buf();
        let literal = literal.clone();

        tasks.push(tokio::spawn(async move {
            let result = try_make_img(&file_out_path, &img_out_path, &literal).await;
            (id, result)
        }));
    }

    let mut image_results = Vec::new();
    for task in tasks {
        image_results.push(task.await?);
    }

    // Apply results sequentially to maintain DOM order
    for (node, (id, result)) in nodes_to_replace.iter().zip(image_results.iter()) {
        let link = match result {
            Ok(link) => link.clone(),
            Err(err) => {
                eprintln!("Failed to process image {}: {}", id, err);
                continue;
            }
        };

        let paragraph = arena.alloc(NodeValue::Paragraph.into());
        let img_node = arena.alloc(NodeValue::Image(link).into());
        paragraph.append(img_node);
        node.insert_after(paragraph);
        node.detach();
    }

    let mut file = fs::File::create(file_out_path)?;
    format_commonmark(root, &Default::default(), &mut file)?;
    Ok(())
}

async fn try_make_img(
    file_out_path: &Path,
    img_out_path: &Path,
    literal: &str,
) -> Result<NodeLink, anyhow::Error> {
    let img_block = GridImg::from_str(literal)?;
    render_with_factorio_sat(img_block, img_out_path).await?;
    Ok(NodeLink {
        url: pathdiff::diff_paths(img_out_path, file_out_path.parent().unwrap())
            .with_context(|| "Failed to generate image link")?
            .to_string_lossy()
            .to_string(),
        ..Default::default()
    })
}

fn remove_old_images(image_out_dir: &Path, prefix: &str) {
    let Ok(entries) = std::fs::read_dir(image_out_dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if let Some(name) = path.file_name().and_then(|n| n.to_str())
            && name.starts_with(&format!("{}_", prefix))
            && name.ends_with(".gif")
        {
            std::fs::remove_file(&path).ok();
        }
    }
}

#[derive(Debug, Parser)]
struct Args {
    #[arg()]
    input_md: PathBuf,
    #[arg(long, short)]
    output_md: Option<PathBuf>,
    #[arg(long, short = 'd', default_value = "images")]
    img_dir: PathBuf,
    #[arg(
        long,
        short = 'r',
        help = "Remove older images matching the naming scheme"
    )]
    remove_old: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    let output_md = match args.output_md {
        Some(path) => path,
        None => {
            let mut path = args.input_md.clone();
            path.set_file_name(format!(
                "{}_out.md",
                args.input_md.file_stem().unwrap().to_string_lossy()
            ));
            path
        }
    };
    let prefix = args.input_md.file_stem().unwrap().to_string_lossy();
    let input = fs::read_to_string(&args.input_md)?;
    if args.remove_old {
        remove_old_images(&args.img_dir, &prefix);
    }
    process_markdown(&input, &args.img_dir, &output_md, &prefix).await?;

    Ok(())
}
