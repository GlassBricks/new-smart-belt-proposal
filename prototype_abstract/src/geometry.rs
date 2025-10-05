use euclid::{
    vec2, {Box2D, Point2D, Vector2D},
};

pub struct TileSpace;
pub type TilePosition = Point2D<i32, TileSpace>;
pub type TileVec = Vector2D<i32, TileSpace>;
pub type BoundingBox = Box2D<i32, TileSpace>;

pub fn pos(x: i32, y: i32) -> TilePosition {
    TilePosition::new(x, y)
}

/// South is +y
/// East is +x
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum Direction {
    North = 0,
    East = 1,
    South = 2,
    West = 3,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Axis {
    X,
    Y,
}

impl Direction {
    pub const fn to_vector(self) -> TileVec {
        match self {
            Direction::North => vec2(0, -1),
            Direction::East => vec2(1, 0),
            Direction::South => vec2(0, 1),
            Direction::West => vec2(-1, 0),
        }
    }

    pub const fn opposite(self) -> Direction {
        match self {
            Direction::North => Direction::South,
            Direction::East => Direction::West,
            Direction::South => Direction::North,
            Direction::West => Direction::East,
        }
    }

    pub const fn rotate_cw(self) -> Direction {
        match self {
            Direction::North => Direction::East,
            Direction::East => Direction::South,
            Direction::South => Direction::West,
            Direction::West => Direction::North,
        }
    }

    pub const fn rotate_ccw(self) -> Direction {
        match self {
            Direction::North => Direction::West,
            Direction::East => Direction::North,
            Direction::South => Direction::East,
            Direction::West => Direction::South,
        }
    }

    pub const fn axis(self) -> Axis {
        match self {
            Direction::North | Direction::South => Axis::Y,
            Direction::East | Direction::West => Axis::X,
        }
    }

    pub const fn from_ordinal(ordinal: u8) -> Option<Direction> {
        match ordinal {
            0 => Some(Direction::North),
            1 => Some(Direction::East),
            2 => Some(Direction::South),
            3 => Some(Direction::West),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Ray {
    pub start_position: TilePosition,
    pub direction: Direction,
}

impl Ray {
    pub const fn new(position: TilePosition, direction: Direction) -> Self {
        Self {
            start_position: position,
            direction,
        }
    }

    pub fn ray_position(&self, position: TilePosition) -> i32 {
        let offset = position - self.start_position;
        let dir_vec = self.direction.to_vector();
        offset.dot(dir_vec)
    }
    /// Get position at index along ray using euclid vector arithmetic
    pub fn get_position(&self, index: i32) -> TilePosition {
        self.start_position + self.direction.to_vector() * index
    }
    pub fn snap(&self, position: TilePosition) -> TilePosition {
        self.get_position(self.ray_position(position))
    }

    pub fn relative_direction(&self, position: TilePosition) -> Option<Direction> {
        let offset = position - self.start_position;
        match self.direction {
            Direction::North | Direction::South => {
                if offset.x == 0 {
                    None
                } else if offset.x > 0 {
                    Some(Direction::East)
                } else {
                    Some(Direction::West)
                }
            }
            Direction::East | Direction::West => {
                if offset.y == 0 {
                    None
                } else if offset.y > 0 {
                    Some(Direction::South)
                } else {
                    Some(Direction::North)
                }
            }
        }
    }
}

pub fn bounds_new(top_left: TilePosition, bottom_right: TilePosition) -> BoundingBox {
    BoundingBox::new(top_left, bottom_right)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Transform {
    pub flip_x: bool,
    pub flip_y: bool,
    pub swap_x_y: bool,
}

impl Transform {
    pub fn new(flip_x: bool, flip_y: bool, swap_x_y: bool) -> Self {
        Self {
            flip_x,
            flip_y,
            swap_x_y,
        }
    }

    pub fn identity() -> Self {
        Default::default()
    }

    pub fn transform_position(&self, position: TilePosition) -> TilePosition {
        let mut result = position;

        if self.swap_x_y {
            result = pos(result.y, result.x);
        }

        if self.flip_x {
            result = pos(-result.x, result.y);
        }

        if self.flip_y {
            result = pos(result.x, -result.y);
        }

        result
    }

    pub fn transform_direction(&self, dir: Direction) -> Direction {
        let mut ordinal = dir as u8;

        if self.swap_x_y {
            // Swapping x and y for direction vectors:
            // North(0,-1) → (-1,0)=West, East(1,0) → (0,1)=South,
            // South(0,1) → (1,0)=East, West(-1,0) → (0,-1)=North
            ordinal = match ordinal {
                0 => 3,
                1 => 2,
                2 => 1,
                3 => 0,
                _ => ordinal,
            };
        }

        if self.flip_x {
            ordinal = match ordinal {
                1 => 3,
                3 => 1,
                _ => ordinal,
            };
        }

        if self.flip_y {
            ordinal = match ordinal {
                0 => 2,
                2 => 0,
                _ => ordinal,
            };
        }

        Direction::from_ordinal(ordinal).unwrap()
    }

    pub fn all_unique_transforms() -> Vec<Transform> {
        [
            Transform::new(false, false, false), // identity
            Transform::new(true, false, true),   // 90° CW
            Transform::new(true, true, false),   // 180°
            Transform::new(false, true, true),   // 90° CCW
            Transform::new(true, false, false),  // flip X
            Transform::new(true, true, true),    // flip X then 90° CW
            Transform::new(false, true, false),  // flip Y
            Transform::new(false, false, true),  // flip Y then 90° CW (swap only)
        ]
        .to_vec()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_direction_opposite() {
        assert_eq!(Direction::North.opposite(), Direction::South);
        assert_eq!(Direction::East.opposite(), Direction::West);
        assert_eq!(Direction::South.opposite(), Direction::North);
        assert_eq!(Direction::West.opposite(), Direction::East);
    }

    #[test]
    fn test_direction_ordinal() {
        assert_eq!(Direction::from_ordinal(0), Some(Direction::North));
        assert_eq!(Direction::from_ordinal(1), Some(Direction::East));
        assert_eq!(Direction::from_ordinal(2), Some(Direction::South));
        assert_eq!(Direction::from_ordinal(3), Some(Direction::West));
        assert_eq!(Direction::from_ordinal(4), None);
    }

    #[test]
    fn test_ray_distance() {
        let ray_north = Ray::new(pos(0, 0), Direction::North);
        assert_eq!(ray_north.ray_position(pos(0, -5)), 5);
        assert_eq!(ray_north.ray_position(pos(0, 5)), -5);

        let ray_east = Ray::new(pos(0, 0), Direction::East);
        assert_eq!(ray_east.ray_position(pos(5, 0)), 5);
        assert_eq!(ray_east.ray_position(pos(-5, 0)), -5);

        let ray_south = Ray::new(pos(0, 0), Direction::South);
        assert_eq!(ray_south.ray_position(pos(0, 5)), 5);
        assert_eq!(ray_south.ray_position(pos(0, -5)), -5);

        let ray_west = Ray::new(pos(0, 0), Direction::West);
        assert_eq!(ray_west.ray_position(pos(5, 0)), -5);
        assert_eq!(ray_west.ray_position(pos(-5, 0)), 5);
    }

    #[test]
    fn test_position_at() {
        let ray_north = Ray::new(pos(1, 1), Direction::North);
        assert_eq!(ray_north.get_position(5), pos(1, -4));

        let ray_east = Ray::new(pos(1, 1), Direction::East);
        assert_eq!(ray_east.get_position(5), pos(6, 1));

        let ray_south = Ray::new(pos(1, 1), Direction::South);
        assert_eq!(ray_south.get_position(5), pos(1, 6));

        let ray_west = Ray::new(pos(1, 1), Direction::West);
        assert_eq!(ray_west.get_position(5), pos(-4, 1));
    }

    #[test]
    fn test_snap() {
        let ray_north = Ray::new(pos(1, 1), Direction::North);
        assert_eq!(ray_north.snap(pos(5, -4)), pos(1, -4));

        let ray_east = Ray::new(pos(1, 1), Direction::East);
        assert_eq!(ray_east.snap(pos(6, 5)), pos(6, 1));

        let ray_south = Ray::new(pos(1, 1), Direction::South);
        assert_eq!(ray_south.snap(pos(5, 6)), pos(1, 6));

        let ray_west = Ray::new(pos(1, 1), Direction::West);
        assert_eq!(ray_west.snap(pos(-4, 5)), pos(-4, 1));
    }

    #[test]
    fn test_transform_position() {
        let pos1 = pos(2, 3);

        assert_eq!(Transform::identity().transform_position(pos1), pos(2, 3));

        assert_eq!(
            Transform::new(true, false, false).transform_position(pos1),
            pos(-2, 3)
        );
        assert_eq!(
            Transform::new(false, true, false).transform_position(pos1),
            pos(2, -3)
        );
        assert_eq!(
            Transform::new(true, true, false).transform_position(pos1),
            pos(-2, -3)
        );

        assert_eq!(
            Transform::new(true, false, true).transform_position(pos1),
            pos(-3, 2)
        );
        assert_eq!(
            Transform::new(true, true, false).transform_position(pos1),
            pos(-2, -3)
        );
        assert_eq!(
            Transform::new(false, true, true).transform_position(pos1),
            pos(3, -2)
        );
    }

    #[test]
    fn test_transform_direction() {
        assert_eq!(
            Transform::identity().transform_direction(Direction::North),
            Direction::North
        );
        assert_eq!(
            Transform::identity().transform_direction(Direction::East),
            Direction::East
        );

        assert_eq!(
            Transform::new(true, false, false).transform_direction(Direction::East),
            Direction::West
        );
        assert_eq!(
            Transform::new(true, false, false).transform_direction(Direction::West),
            Direction::East
        );
        assert_eq!(
            Transform::new(true, false, false).transform_direction(Direction::North),
            Direction::North
        );

        assert_eq!(
            Transform::new(false, true, false).transform_direction(Direction::North),
            Direction::South
        );
        assert_eq!(
            Transform::new(false, true, false).transform_direction(Direction::South),
            Direction::North
        );
        assert_eq!(
            Transform::new(false, true, false).transform_direction(Direction::East),
            Direction::East
        );

        assert_eq!(
            Transform::new(true, false, true).transform_direction(Direction::North),
            Direction::East
        );
        assert_eq!(
            Transform::new(true, false, true).transform_direction(Direction::East),
            Direction::South
        );
        assert_eq!(
            Transform::new(true, true, false).transform_direction(Direction::North),
            Direction::South
        );
        assert_eq!(
            Transform::new(false, true, true).transform_direction(Direction::North),
            Direction::West
        );
    }

    #[test]
    fn test_transform_entity() {
        use crate::{Belt, YELLOW_BELT};

        let belt = Belt::new(Direction::North, YELLOW_BELT);
        let transform = Transform::new(true, false, true);

        let transformed = transform.transform_entity(belt.as_ref());
        let transformed_belt = transformed.as_belt().unwrap();

        assert_eq!(transformed_belt.direction, Direction::East);
        assert_eq!(transformed_belt.tier, YELLOW_BELT);
    }

    #[test]
    fn test_combined_flip_rotation() {
        let pos_test = pos(3, 4);
        // Horizontal flip then Right rotation: (x,y) → (-x,y) → (-y,-x)
        let transform = Transform::new(true, true, true);
        let result = transform.transform_position(pos_test);

        assert_eq!(result, pos(-4, -3));

        let dir_test = Direction::North;
        let dir_result = transform.transform_direction(dir_test);
        assert_eq!(dir_result, Direction::East);
    }
}
