use anyhow::Result;
use euclid::{Point2D, Rect, Size2D, Vector2D};
use prototype_abstract::{
    BeltCollidable, BeltConnectable, BoundingBox, Direction, ReadonlyWorld as _, Splitter,
    TilePosition, WorldImpl as World,
};
use std::path::Path;
use tiny_skia::{Pixmap, PremultipliedColorU8};

pub mod tilemaps;
use tilemaps::Tilemaps;

pub struct PixelSpace;
pub type PixelPoint = Point2D<i32, PixelSpace>;
pub type PixelSize = Size2D<u32, PixelSpace>;
pub type PixelBox = Rect<i32, PixelSpace>;

pub const ANIMATION_FRAME: u8 = 0;
pub const TILE_SIZE: u32 = 64;

fn fractional_to_pixel_offset(frac: f32) -> i32 {
    (frac * TILE_SIZE as f32) as i32
}

fn fractional_to_pixel_vector(frac_x: f32, frac_y: f32) -> Vector2D<i32, PixelSpace> {
    Vector2D::new(
        fractional_to_pixel_offset(frac_x),
        fractional_to_pixel_offset(frac_y),
    )
}

fn direction_to_python_index(direction: Direction) -> usize {
    match direction {
        Direction::East => 0,
        Direction::North => 1,
        Direction::West => 2,
        Direction::South => 3,
    }
}

fn checkerboard_light() -> PremultipliedColorU8 {
    PremultipliedColorU8::from_rgba(80, 80, 80, 255).unwrap()
}

fn checkerboard_dark() -> PremultipliedColorU8 {
    PremultipliedColorU8::from_rgba(60, 60, 60, 255).unwrap()
}

fn blocker_color() -> PremultipliedColorU8 {
    PremultipliedColorU8::from_rgba(250, 200, 200, 255).unwrap()
}

#[derive(Debug, Clone, Copy)]
enum RenderLayer {
    Bottom,
    Top,
}

pub struct ImageRenderer {
    tilemaps: Tilemaps,
}

impl ImageRenderer {
    pub fn new() -> Result<Self> {
        let assets_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("assets");
        let tilemaps = Tilemaps::load_from_assets(&assets_path)?;
        Ok(ImageRenderer { tilemaps })
    }

    pub fn render_world(&self, world: &World, bounds: BoundingBox) -> Pixmap {
        if bounds.is_empty() {
            return Pixmap::new(1, 1).unwrap();
        }

        let canvas_size = self.calculate_canvas_size(bounds);
        let mut pixmap = Pixmap::new(canvas_size.width, canvas_size.height).unwrap();

        self.draw_checkerboard_background(&mut pixmap, bounds);

        for layer in &[RenderLayer::Bottom, RenderLayer::Top] {
            self.render_all_entities(&mut pixmap, bounds, world, *layer);
        }

        pixmap
    }

    fn calculate_canvas_size(&self, bounds: BoundingBox) -> PixelSize {
        (bounds.size() * TILE_SIZE as i32).cast().cast_unit()
    }

    fn draw_checkerboard_background(&self, pixmap: &mut Pixmap, bounds: BoundingBox) {
        let pixels = pixmap.pixels_mut();
        let width = self.calculate_canvas_size(bounds).width;

        for y in 0..self.calculate_canvas_size(bounds).height {
            let row_start = y * width;
            let tile_y = y / TILE_SIZE;

            for x in 0..width {
                let tile_x = x / TILE_SIZE;
                let color = if (tile_x + tile_y).is_multiple_of(2) {
                    checkerboard_light()
                } else {
                    checkerboard_dark()
                };
                pixels[(row_start + x) as usize] = color;
            }
        }
    }

    fn render_all_entities(
        &self,
        pixmap: &mut Pixmap,
        bounds: BoundingBox,
        world: &World,
        layer: RenderLayer,
    ) {
        for y in bounds.min.y..bounds.max.y {
            for x in bounds.min.x..bounds.max.x {
                let pos = prototype_abstract::pos(x, y);
                if let Some(entity) = world.get(pos) {
                    self.render_entity(pixmap, entity, bounds, pos, world, layer);
                }
            }
        }
    }

    fn render_entity(
        &self,
        canvas: &mut Pixmap,
        entity: &BeltCollidable,
        bounds: BoundingBox,
        pos: TilePosition,
        world: &World,
        layer: RenderLayer,
    ) {
        let pixel_pos = ((pos - bounds.min.cast_unit()) * (TILE_SIZE as i32))
            .to_point()
            .cast_unit();

        match (BeltConnectable::try_from(entity).ok(), layer) {
            (Some(BeltConnectable::Belt(belt)), RenderLayer::Bottom) => {
                let tier_idx = belt.tier.tier_index();
                self.render_belt(
                    canvas,
                    belt.direction,
                    world.input_direction_at(pos),
                    pixel_pos,
                    tier_idx,
                );
            }
            (Some(BeltConnectable::UndergroundBelt(underground)), RenderLayer::Bottom) => {
                let tier_idx = underground.tier.tier_index();
                self.render_underground_belt_base(
                    canvas,
                    underground.direction,
                    underground.is_input,
                    pixel_pos,
                    tier_idx,
                );
            }
            (Some(BeltConnectable::UndergroundBelt(underground)), RenderLayer::Top) => {
                let tier_idx = underground.tier.tier_index();
                self.render_underground_belt_structure(
                    canvas,
                    underground.direction,
                    underground.is_input,
                    pixel_pos,
                    tier_idx,
                );
            }
            (Some(BeltConnectable::Splitter(splitter)), RenderLayer::Bottom) => {
                let tier_idx = splitter.tier.tier_index();
                self.render_belt(canvas, splitter.direction, None, pixel_pos, tier_idx);
            }
            (Some(BeltConnectable::Splitter(splitter)), RenderLayer::Top) => {
                let tier_idx = splitter.tier.tier_index();
                let is_head = if let Some(tail_pos) = get_tail_pos(&splitter, pos, bounds)
                  && matches!(world.get(tail_pos), Some(BeltCollidable::Splitter(_)))
                {
                    false
                } else {
                    true
                };
                self.render_splitter_structure(
                    canvas,
                    splitter.direction,
                    is_head,
                    pixel_pos,
                    tier_idx,
                );
            }
            (_, RenderLayer::Bottom) => {
                self.render_blocker(canvas, pixel_pos);
            }
            _ => {}
        }
    }

    fn render_belt(
        &self,
        canvas: &mut Pixmap,
        output_direction: Direction,
        input_direction: Option<Direction>,
        pixel_pos: PixelPoint,
        tier_index: usize,
    ) {
        const CURVED_INDICES: [[u8; 4]; 3] = [[11, 8, 4, 7], [0, 2, 1, 3], [6, 10, 9, 5]];

        let input_py = direction_to_python_index(input_direction.unwrap_or(output_direction));
        let output_py = direction_to_python_index(output_direction);
        let direction_diff = (output_py + 4 - input_py + 1) % 4;
        let tile_index = CURVED_INDICES[direction_diff][input_py];
        self.tilemaps.belt[tier_index].draw(
            canvas,
            pixel_pos - Vector2D::splat(TILE_SIZE as i32 / 2),
            (ANIMATION_FRAME, tile_index),
            None,
            None,
        );
    }

    fn render_underground_belt_base(
        &self,
        canvas: &mut Pixmap,
        direction: Direction,
        is_input: bool,
        pixel_pos: PixelPoint,
        tier_index: usize,
    ) {
        let indices = if !is_input {
            [14, 12, 18, 16]
        } else {
            [19, 17, 15, 13]
        };
        let tile_index = indices[direction_to_python_index(direction)];

        self.tilemaps.belt[tier_index].draw(
            canvas,
            pixel_pos - Vector2D::splat(TILE_SIZE as i32 / 2),
            (ANIMATION_FRAME, tile_index),
            None,
            None,
        );
    }

    fn render_underground_belt_structure(
        &self,
        canvas: &mut Pixmap,
        direction: Direction,
        is_input: bool,
        pixel_pos: PixelPoint,
        tier_index: usize,
    ) {
        let indices = if !is_input {
            [3, 2, 1, 0]
        } else {
            [1, 0, 3, 2]
        };
        let tile_index = indices[direction_to_python_index(direction)];

        self.tilemaps.underground[tier_index].draw(
            canvas,
            pixel_pos - Vector2D::splat(TILE_SIZE as i32),
            (tile_index, is_input as u8),
            None,
            None,
        );
    }

    fn render_splitter_structure(
        &self,
        canvas: &mut Pixmap,
        direction: Direction,
        is_head: bool,
        pixel_pos: PixelPoint,
        tier_index: usize,
    ) {
        match direction {
            Direction::East => {
                let adjusted_pos = pixel_pos
                    - Vector2D::new(
                        0,
                        if !is_head {
                            TILE_SIZE / 2
                        } else {
                            (5 * TILE_SIZE) / 16
                        } as i32,
                    );
                self.tilemaps.splitter_east[tier_index][if !is_head { 1 } else { 0 }].draw(
                    canvas,
                    adjusted_pos,
                    ((ANIMATION_FRAME % 8), (ANIMATION_FRAME / 8) % 4),
                    None,
                    None,
                );
            }
            Direction::West => {
                self.tilemaps.splitter_west[tier_index][if !is_head { 0 } else { 1 }].draw(
                    canvas,
                    pixel_pos - Vector2D::new(0, (5 * TILE_SIZE as i32) / 16),
                    ((ANIMATION_FRAME % 8), (ANIMATION_FRAME / 8) % 4),
                    None,
                    None,
                );
            }
            Direction::North => {
                let (src_offset, src_size) = if !is_head {
                    (
                        fractional_to_pixel_vector(0.0, 0.0),
                        fractional_to_pixel_vector(13.0 / 32.0, 1.0),
                    )
                } else {
                    (
                        fractional_to_pixel_vector(13.0 / 32.0, 0.0),
                        fractional_to_pixel_vector(1.0 - 13.0 / 32.0, 1.0),
                    )
                };
                self.tilemaps.splitter_north[tier_index].draw(
                    canvas,
                    pixel_pos,
                    ((ANIMATION_FRAME % 8), (ANIMATION_FRAME / 8) % 4),
                    Some(src_offset),
                    Some(src_size),
                );
            }
            Direction::South => {
                let base_x_offset = -(4 * TILE_SIZE as i32) / 32;
                let (adjusted_pos, src_offset, src_size) = if !is_head {
                    (
                        pixel_pos + Vector2D::new(base_x_offset, 0),
                        fractional_to_pixel_vector(0.0, 0.0),
                        fractional_to_pixel_vector(14.0 / 32.0, 1.0),
                    )
                } else {
                    (
                        pixel_pos + Vector2D::new(base_x_offset - TILE_SIZE as i32 / 32, 0),
                        fractional_to_pixel_vector(14.0 / 32.0, 0.0),
                        fractional_to_pixel_vector(1.0 - 14.0 / 32.0, 1.0),
                    )
                };
                self.tilemaps.splitter_south[tier_index].draw(
                    canvas,
                    adjusted_pos,
                    (ANIMATION_FRAME % 8, (ANIMATION_FRAME / 8) % 4),
                    Some(src_offset),
                    Some(src_size),
                );
            }
        }
    }

    fn render_blocker(&self, canvas: &mut Pixmap, pixel_pos: PixelPoint) {
        let canvas_size = (canvas.width(), canvas.height());
        let pixels = canvas.pixels_mut();
        let tile_bounds = (
            (pixel_pos.x as u32).min(canvas_size.0),
            (pixel_pos.y as u32).min(canvas_size.1),
            ((pixel_pos.x as u32) + TILE_SIZE).min(canvas_size.0),
            ((pixel_pos.y as u32) + TILE_SIZE).min(canvas_size.1),
        );

        for y in tile_bounds.1..tile_bounds.3 {
            let row_start = (y * canvas_size.0) as usize;
            for x in tile_bounds.0..tile_bounds.2 {
                pixels[row_start + x as usize] = blocker_color();
            }
        }
    }

    pub fn save_png<P: AsRef<Path>>(
        &self,
        world: &World,
        bounds: BoundingBox,
        path: P,
    ) -> Result<()> {
        let pixmap = self.render_world(world, bounds);
        pixmap.save_png(path)?;
        Ok(())
    }
}

pub fn get_tail_pos(
    splitter: &Splitter,
    position: TilePosition,
    bounds: BoundingBox,
) -> Option<TilePosition> {
    let tail_pos = position + splitter.direction.rotate_ccw().to_vector();
    if bounds.contains(tail_pos) {
        Some(tail_pos)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use prototype_abstract::{
        Belt, Splitter, UndergroundBelt, World as _, WorldImpl as World, belts::YELLOW_BELT, pos,
    };

    #[test]
    fn test_render_empty_world() {
        let renderer = ImageRenderer::new().expect("Failed to create renderer");
        let world = World::new();
        let bounds = prototype_abstract::bounds_new(pos(0, 0), pos(1, 1));

        let pixmap = renderer.render_world(&world, bounds);
        assert_eq!(pixmap.width(), TILE_SIZE);
        assert_eq!(pixmap.height(), TILE_SIZE);
    }

    #[test]
    fn test_render_single_belt() {
        let renderer = ImageRenderer::new().expect("Failed to create renderer");
        let mut world = World::new();

        let belt = Belt::new(Direction::East, YELLOW_BELT);
        world.build(pos(0, 0), belt.into());

        let bounds = prototype_abstract::bounds_new(pos(0, 0), pos(1, 1));
        let pixmap = renderer.render_world(&world, bounds);

        assert_eq!(pixmap.width(), TILE_SIZE);
        assert_eq!(pixmap.height(), TILE_SIZE);
    }

    #[test]
    fn test_render_complex_world() {
        let renderer = ImageRenderer::new().expect("Failed to create renderer");
        let mut world = World::new();

        let belt = Belt::new(Direction::East, YELLOW_BELT);
        world.build(pos(0, 0), belt.into());

        let underground_input = UndergroundBelt::new(Direction::East, true, YELLOW_BELT);
        world.build(pos(1, 0), underground_input.into());

        let underground_output = UndergroundBelt::new(Direction::East, false, YELLOW_BELT);
        world.build(pos(3, 0), underground_output.into());

        let splitter = Splitter::new(Direction::East, YELLOW_BELT);
        world.build(pos(0, 1), splitter.into());

        let bounds = prototype_abstract::bounds_new(pos(0, 0), pos(4, 2));
        let pixmap = renderer.render_world(&world, bounds);

        assert_eq!(pixmap.width(), 4 * TILE_SIZE);
        assert_eq!(pixmap.height(), 2 * TILE_SIZE);

        let _ = pixmap.save_png("test.png");
    }
}
