use anyhow::Result;
use euclid::Size2D;
use euclid::Vector2D;
use std::path::Path;
use tiny_skia::{Pixmap, Transform};

use crate::{PixelBox, PixelPoint, PixelSize, PixelSpace};

#[derive(Debug, Clone)]
pub struct Tilemap {
    pub pixmap: Pixmap,
    pub entry_size: PixelSize,
    pub texture_size: PixelSize,
    pub tiles_per_row: u16,
    pub tiles_per_col: u16,
}

pub struct TilemapSpace;

impl Tilemap {
    pub fn new(pixmap: Pixmap, entry_size: PixelSize) -> Self {
        let texture_size = PixelSize::new(pixmap.width(), pixmap.height());

        assert_eq!(
            texture_size.width % entry_size.width,
            0,
            "Texture width must be divisible by entry width"
        );
        assert_eq!(
            texture_size.height % entry_size.height,
            0,
            "Texture height must be divisible by entry height"
        );

        Self {
            pixmap,
            entry_size,
            texture_size,
            tiles_per_row: (texture_size.width / entry_size.width) as u16,
            tiles_per_col: (texture_size.height / entry_size.height) as u16,
        }
    }

    pub fn load<P: AsRef<Path>>(path: P, entry_size: PixelSize) -> Result<Self> {
        let pixmap = Pixmap::load_png(path)?;
        Ok(Self::new(pixmap, entry_size))
    }

    fn get_tile_source_rect(&self, tile_pos: (u8, u8)) -> PixelBox {
        let src_x = tile_pos.0 as i32 * self.entry_size.width as i32;
        let src_y = tile_pos.1 as i32 * self.entry_size.height as i32;

        PixelBox::new(PixelPoint::new(src_x, src_y), self.entry_size.cast())
    }

    /// Crop a region from the tilemap and scale it to the specified size
    fn crop(&self, src_rect: PixelBox, dst_size: PixelSize) -> Pixmap {
        let mut tile_pixmap = Pixmap::new(dst_size.width, dst_size.height).unwrap();

        let src_size = src_rect.size.cast::<u32>();
        let tilemap_size = (self.pixmap.width(), self.pixmap.height());
        let src_pixels = self.pixmap.pixels();
        let dst_pixels = tile_pixmap.pixels_mut();

        for y in 0..dst_size.height {
            for x in 0..dst_size.width {
                let src_x = src_rect.origin.x + (x * src_size.width / dst_size.width) as i32;
                let src_y = src_rect.origin.y + (y * src_size.height / dst_size.height) as i32;

                if src_x >= 0
                    && src_y >= 0
                    && (src_x as u32) < tilemap_size.0
                    && (src_y as u32) < tilemap_size.1
                {
                    let src_index = (src_y as u32 * tilemap_size.0 + src_x as u32) as usize;
                    let dst_index = (y * dst_size.width + x) as usize;
                    dst_pixels[dst_index] = src_pixels[src_index];
                }
            }
        }

        tile_pixmap
    }

    /// Crop a specific tile from the tilemap with optional bounds
    pub fn crop_tile(
        &self,
        tile_pos: (u8, u8),
        src_offset: Option<Vector2D<i32, PixelSpace>>,
        src_size: Option<Vector2D<i32, PixelSpace>>,
    ) -> Pixmap {
        let base_rect = self.get_tile_source_rect(tile_pos);

        let src_rect = if let (Some(offset), Some(size)) = (src_offset, src_size) {
            PixelBox::new(
                base_rect.origin + offset,
                Size2D::new(size.x.max(0), size.y.max(0)),
            )
        } else {
            base_rect
        };

        self.crop(src_rect, self.entry_size)
    }

    /// Draw a tile from the tilemap to the destination pixmap
    pub fn draw(
        &self,
        pixmap: &mut Pixmap,
        dst_pos: PixelPoint,
        tile_pos: (u8, u8),
        src_offset: Option<Vector2D<i32, PixelSpace>>,
        src_size: Option<Vector2D<i32, PixelSpace>>,
    ) {
        let tile_pixmap = self.crop_tile(tile_pos, src_offset, src_size);

        pixmap.draw_pixmap(
            dst_pos.x,
            dst_pos.y,
            tile_pixmap.as_ref(),
            &tiny_skia::PixmapPaint::default(),
            Transform::identity(),
            None,
        );
    }
}

pub struct Tilemaps {
    pub belt: Tilemap,
    pub underground: Tilemap,
    pub splitter_east: [Tilemap; 2],
    pub splitter_west: [Tilemap; 2],
    pub splitter_north: Tilemap,
    pub splitter_south: Tilemap,
}

impl Tilemaps {
    pub fn load_from_assets<P: AsRef<Path>>(assets_path: P) -> Result<Self> {
        let assets_path = assets_path.as_ref();

        let load = |path: &str, width: u32, height: u32| {
            Tilemap::load(assets_path.join(path), PixelSize::new(width, height))
        };

        let belt = load("transport-belt.png", 128, 128)?;
        let underground = load("underground-belt-structure.png", 192, 192)?;
        let splitter_east = [
            load("splitter-east.png", 90, 84)?,
            load("splitter-east-top_patch.png", 90, 104)?,
        ];
        let splitter_west = [
            load("splitter-west.png", 90, 86)?,
            load("splitter-west-top_patch.png", 90, 96)?,
        ];
        let splitter_south = load("splitter-south.png", 164, 64)?;
        let splitter_north = load("splitter-north.png", 160, 70)?;

        Ok(Self {
            belt,
            underground,
            splitter_east,
            splitter_west,
            splitter_north,
            splitter_south,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::TILE_SIZE;

    #[test]
    fn test_crop_tile() {
        // Create a simple 2x2 tilemap with known pixel values
        let mut pixmap = Pixmap::new(TILE_SIZE * 2, TILE_SIZE * 2).unwrap();
        let pixels = pixmap.pixels_mut();

        // Fill with different colors for each tile
        for i in 0..pixels.len() {
            pixels[i] = if i < pixels.len() / 2 {
                tiny_skia::PremultipliedColorU8::from_rgba(255, 0, 0, 255).unwrap() // Red
            } else {
                tiny_skia::PremultipliedColorU8::from_rgba(0, 255, 0, 255).unwrap() // Green
            };
        }

        let tilemap = Tilemap::new(pixmap, PixelSize::new(TILE_SIZE, TILE_SIZE));

        // Crop the first tile (0, 0)
        let cropped = tilemap.crop_tile((0, 0), None, None);

        assert_eq!(cropped.width(), TILE_SIZE);
        assert_eq!(cropped.height(), TILE_SIZE);

        // Verify the cropped tile has the expected color (red)
        let first_pixel = cropped.pixels()[0];
        assert_eq!(first_pixel.red(), 255);
        assert_eq!(first_pixel.green(), 0);
        assert_eq!(first_pixel.blue(), 0);
    }
}
