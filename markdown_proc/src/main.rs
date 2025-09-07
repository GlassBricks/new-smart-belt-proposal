use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
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
use tempfile;

#[derive(Clone, Copy)]
enum Direction {
    Up,
    Down,
    Left,
    Right,
}

impl Direction {
    fn is_horizontal(self) -> bool {
        match self {
            Direction::Left | Direction::Right => true,
            Direction::Up | Direction::Down => false,
        }
    }
    fn to_factorio_sat_dir(self) -> u8 {
        match self {
            Direction::Right => 0,
            Direction::Up => 1,
            Direction::Left => 2,
            Direction::Down => 3,
        }
    }
}

fn are_perpendicular(dir1: Direction, dir2: Direction) -> bool {
    dir1.is_horizontal() != dir2.is_horizontal()
}

#[derive(Clone)]
enum TileType {
    Belt(Direction),
    CurvedBelt {
        input_direction: Direction,
        output_direction: Direction,
    },
    UGBelt {
        direction: Direction,
        is_input: bool,
    },
    Splitter {
        direction: Direction,
        is_head: bool,
    },
    Blocker,
    Empty,
}

impl FromStr for TileType {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let mut chars = s.chars();
        let direction = match chars.next() {
            Some('_') => return Ok(TileType::Empty),
            Some('X') => return Ok(TileType::Blocker),
            Some('l') => Direction::Left,
            Some('u') => Direction::Up,
            Some('r') => Direction::Right,
            Some('d') => Direction::Down,
            _ => anyhow::bail!("invalid direction"),
        };
        Ok(match chars.next() {
            Some('i') => TileType::UGBelt {
                direction,
                is_input: true,
            },
            Some('o') => TileType::UGBelt {
                direction,
                is_input: false,
            },
            Some('s') => TileType::Splitter {
                direction,
                is_head: true,
            },
            _ => TileType::Belt(direction),
        })
    }
}

#[derive(Clone)]
struct GridImg {
    content: Vec<Vec<TileType>>,
}

impl FromStr for GridImg {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self> {
        let content = s
            .lines()
            .map(|line| line.trim())
            .filter(|l| !l.is_empty())
            .map(|line| {
                line.split_whitespace()
                    .map(|s| s.parse())
                    .collect::<Result<_>>()
            })
            .collect::<Result<_>>()?;

        Ok(GridImg { content })
    }
}

fn render_with_factorio_sat(grid: GridImg, img_out_path: &Path) -> Result<()> {
    let grid = apply_belt_curving(grid)?;
    let grid = apply_splitter_completion(grid)?;

    let height = grid.content.len();
    if height == 0 {
        return Ok(());
    }

    let mut result = Vec::new();
    for row in &grid.content {
        let mut json_row = Vec::new();
        for belt in row {
            let tile_data = belt_type_to_json(belt)?;
            json_row.push(tile_data);
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
        use std::io::Write;
        let mut stdin = stdin;
        stdin.write_all(json_input.as_bytes())?;
        stdin.flush()?;
    }

    let output = child.wait_with_output()?;

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

fn belt_type_to_json(belt: &TileType) -> Result<Value> {
    let tile_data = match belt {
        TileType::Empty => serde_json::json!({
            "type": "empty"
        }),
        TileType::Belt(dir) => serde_json::json!({
            "type": "belt",
            "input_direction": dir.to_factorio_sat_dir(),
            "output_direction": dir.to_factorio_sat_dir()
        }),
        TileType::CurvedBelt {
            input_direction,
            output_direction,
        } => serde_json::json!({
            "type": "belt",
            "input_direction": input_direction.to_factorio_sat_dir(),
            "output_direction": output_direction.to_factorio_sat_dir()
        }),
        TileType::UGBelt {
            direction,
            is_input,
        } => serde_json::json!({
            "type": "underground_belt",
            "direction": direction.to_factorio_sat_dir(),
            "is_input": is_input
        }),
        TileType::Splitter { direction, is_head } => serde_json::json!({
            "type": "splitter",
            "direction": direction.to_factorio_sat_dir(),
            "is_head": is_head
        }),
        TileType::Blocker => {
            serde_json::json!({ "type": "inserter", "direction": 0, "insert_type": 0 })
        }
    };

    Ok(serde_json::json!({ "tile": tile_data }))
}

fn apply_belt_curving(grid: GridImg) -> Result<GridImg> {
    let height = grid.content.len();
    if height == 0 {
        return Ok(grid);
    }
    let width = grid.content[0].len();

    let mut new_grid = grid.content.clone();

    for y in 0..height {
        for x in 0..width {
            if let TileType::Belt(belt_dir) = grid.content[y][x] {
                let (next_x, next_y) = match belt_dir {
                    Direction::Right => (x + 1, y),
                    Direction::Down => (x, y + 1),
                    Direction::Left => (x.saturating_sub(1), y),
                    Direction::Up => (x, y.saturating_sub(1)),
                };
                if next_x < width && next_y < height {
                    if let TileType::Belt(next_belt_dir) = grid.content[next_y][next_x] {
                        if are_perpendicular(belt_dir, next_belt_dir) {
                            // Create a curved belt: input from current belt direction, output to next belt direction
                            new_grid[next_y][next_x] = TileType::CurvedBelt {
                                input_direction: belt_dir,
                                output_direction: next_belt_dir,
                            };
                        }
                    }
                }
            }
        }
    }

    Ok(GridImg { content: new_grid })
}

fn apply_splitter_completion(grid: GridImg) -> Result<GridImg> {
    let height = grid.content.len();
    if height == 0 {
        return Ok(grid);
    }
    let width = grid.content[0].len();

    let mut new_grid = grid.content.clone();

    for y in 0..height {
        for x in 0..width {
            if let TileType::Splitter { direction, is_head } = grid.content[y][x] {
                if is_head {
                    let (tail_x, tail_y) = match direction {
                        Direction::Right => (x, y.saturating_sub(1)),
                        Direction::Left => (x, y + 1),
                        Direction::Up => (x + 1, y),
                        Direction::Down => (x.saturating_sub(1), y),
                    };

                    // Place the tail half if position is valid and empty
                    if tail_x < width && tail_y < height {
                        if let TileType::Empty = grid.content[tail_y][tail_x] {
                            new_grid[tail_y][tail_x] = TileType::Splitter {
                                direction,
                                is_head: false,
                            };
                        }
                    }
                }
            }
        }
    }

    Ok(GridImg { content: new_grid })
}

fn process_markdown(
    input: &str,
    image_out_dir: &Path,
    file_out_path: &Path,
    prefix: &str,
) -> Result<()> {
    let arena = Arena::new();
    let root = parse_document(&arena, input, &Default::default());
    let mut id = 0;

    let mut nodes_to_replace = Vec::new();
    for node in root.descendants() {
        if let NodeValue::CodeBlock(cb) = &node.data.borrow().value {
            if cb.info == "fac-img" {
                nodes_to_replace.push((node, cb.literal.clone()));
            }
        }
    }

    for (node, literal) in nodes_to_replace {
        let img_block = GridImg::from_str(&literal)?;
        let img_out_path = image_out_dir.join(format!("{}_{}.gif", prefix, id));
        id += 1;
        render_with_factorio_sat(img_block, &img_out_path)?;
        let img_link = NodeLink {
            url: pathdiff::diff_paths(&img_out_path, file_out_path.parent().unwrap())
                .with_context(|| "Failed to generate image link")?
                .to_string_lossy()
                .to_string(),
            ..Default::default()
        };
        let paragraph = arena.alloc(NodeValue::Paragraph.into());
        let img_node = arena.alloc(NodeValue::Image(img_link).into());
        paragraph.append(img_node);
        node.insert_after(paragraph);
        node.detach();
    }

    let mut file = fs::File::create(file_out_path)?;
    format_commonmark(root, &Default::default(), &mut file)?;
    Ok(())
}

fn remove_old_images(image_out_dir: &Path, prefix: &str) {
    let Ok(entries) = std::fs::read_dir(image_out_dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with(&format!("{}_", prefix)) && name.ends_with(".gif") {
                std::fs::remove_file(&path).ok();
            }
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
fn main() -> Result<()> {
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
    process_markdown(&input, &args.img_dir, &output_md, &prefix)?;

    Ok(())
}
