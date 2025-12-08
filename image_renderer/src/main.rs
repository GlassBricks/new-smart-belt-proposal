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
use image_renderer::{ImageRenderer, get_tail_pos};

use prototype_abstract::{
    BeltCollidable, ReadonlyWorld as _, Splitter, World, WorldImpl, bounds_new, pos,
};

#[derive(Clone)]
struct FacImg {
    world: WorldImpl,
    width: usize,
    height: usize,
}

impl FromStr for FacImg {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self> {
        let (world, _) = prototype_abstract::test_case::parse_world(s)?;

        // Calculate dimensions from the input text to preserve the original grid size
        let lines: Vec<&str> = s.lines().collect();
        let height = lines.len();
        let width = lines
            .iter()
            .map(|line| line.split_whitespace().count())
            .max()
            .unwrap_or(0);

        Ok(FacImg {
            world,
            width,
            height,
        })
    }
}

fn apply_splitter_completion(world: &mut WorldImpl) -> Result<()> {
    let bounds = world.bounds();
    if bounds.is_empty() {
        return Ok(());
    }

    let mut entities_to_add = Vec::new();

    // Iterate through all positions in the world
    for y in bounds.min.y..bounds.max.y {
        for x in bounds.min.x..bounds.max.x {
            let position = pos(x, y);
            if let Some(BeltCollidable::Splitter(splitter)) = world.get(position)
                && let Some(tail_pos) = get_tail_pos(splitter, position, bounds)
                && world.get(tail_pos).is_none()
            {
                entities_to_add.push((tail_pos, Splitter::new(splitter.direction, splitter.tier)));
            }
        }
    }

    for (pos, entity) in entities_to_add {
        world.build(pos, entity.into());
    }

    Ok(())
}
fn render(mut grid: FacImg, img_out_path: &Path, renderer: &ImageRenderer) -> Result<()> {
    apply_splitter_completion(&mut grid.world)?;
    let bounds = bounds_new(pos(0, 0), pos(grid.width as i32, grid.height as i32));
    renderer.save_png(&grid.world, bounds, img_out_path)?;

    Ok(())
}

fn process_markdown(
    input: &str,
    image_out_dir: &Path,
    file_out_path: &Path,
    prefix: &str,
) -> Result<()> {
    let arena = Arena::new();
    let root = parse_document(&arena, input, &Default::default());

    let renderer = ImageRenderer::new()?;
    let imgs = root
        .descendants()
        .filter_map(|node| {
            if let NodeValue::CodeBlock(cb) = &node.data.borrow().value
                && cb.info == "fac-img"
            {
                Some((node, cb.literal.clone()))
            } else {
                None
            }
        })
        .enumerate()
        .map(|(id, (node, literal))| {
            let img_out_path = image_out_dir.join(format!("{}_{}.png", prefix, id));
            let file_out_path = file_out_path.to_path_buf();
            (
                id,
                node,
                try_make_img(&file_out_path, &img_out_path, &literal, &renderer),
            )
        })
        .collect::<Vec<_>>();

    for (id, node, result) in imgs {
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

fn try_make_img(
    file_out_path: &Path,
    img_out_path: &Path,
    literal: &str,
    renderer: &ImageRenderer,
) -> Result<NodeLink, anyhow::Error> {
    let img = FacImg::from_str(literal)?;
    render(img, img_out_path, renderer)?;
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
            && name.ends_with(".png")
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
    process_markdown(&input, &args.img_dir, &output_md, &prefix)
}
