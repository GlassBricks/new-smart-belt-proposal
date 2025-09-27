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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RelativeDirection {
    Forward,
    Right,
    Left,
    Backward,
}

impl Direction {
    pub fn to_vector(self) -> TileVec {
        match self {
            Direction::North => vec2(0, -1),
            Direction::East => vec2(1, 0),
            Direction::South => vec2(0, 1),
            Direction::West => vec2(-1, 0),
        }
    }

    pub fn opposite(self) -> Direction {
        match self {
            Direction::North => Direction::South,
            Direction::East => Direction::West,
            Direction::South => Direction::North,
            Direction::West => Direction::East,
        }
    }

    pub fn rotate_cw(self) -> Direction {
        match self {
            Direction::North => Direction::East,
            Direction::East => Direction::South,
            Direction::South => Direction::West,
            Direction::West => Direction::North,
        }
    }

    pub fn rotate_ccw(self) -> Direction {
        match self {
            Direction::North => Direction::West,
            Direction::East => Direction::North,
            Direction::South => Direction::East,
            Direction::West => Direction::South,
        }
    }

    pub fn axis(self) -> Axis {
        match self {
            Direction::North | Direction::South => Axis::Y,
            Direction::East | Direction::West => Axis::X,
        }
    }

    pub fn from_ordinal(ordinal: u8) -> Option<Direction> {
        match ordinal {
            0 => Some(Direction::North),
            1 => Some(Direction::East),
            2 => Some(Direction::South),
            3 => Some(Direction::West),
            _ => None,
        }
    }

    /// from current to other
    pub fn direction_to(self, other: Direction) -> RelativeDirection {
        let diff = (other as u8 + 4 - self as u8) % 4;
        RelativeDirection::from_ordinal(diff).unwrap()
    }
}

impl RelativeDirection {
    pub fn to_ordinal(self) -> u8 {
        match self {
            RelativeDirection::Forward => 0,
            RelativeDirection::Right => 1,
            RelativeDirection::Backward => 2,
            RelativeDirection::Left => 3,
        }
    }

    fn from_ordinal(ordinal: u8) -> Option<RelativeDirection> {
        match ordinal {
            0 => Some(RelativeDirection::Forward),
            1 => Some(RelativeDirection::Right),
            2 => Some(RelativeDirection::Backward),
            3 => Some(RelativeDirection::Left),
            _ => None,
        }
    }
}

impl Direction {
    pub fn rotate(self, direction: RelativeDirection) -> Direction {
        let new_ordinal = (self as u8 + direction.to_ordinal()) % 4;
        Direction::from_ordinal(new_ordinal).unwrap()
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Ray {
    pub start_position: TilePosition,
    pub direction: Direction,
}

impl Ray {
    pub fn new(position: TilePosition, direction: Direction) -> Self {
        Self {
            start_position: position,
            direction,
        }
    }

    pub fn relative_directon(&self, direction: Direction) -> RelativeDirection {
        self.direction.direction_to(direction)
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
}

pub fn bounds_new(top_left: TilePosition, bottom_right: TilePosition) -> BoundingBox {
    BoundingBox::new(top_left, bottom_right)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Flip {
    None,
    Horizontal,
    Vertical,
    Both,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Transform {
    pub flip: Flip,
    pub rotation: RelativeDirection,
    pub translation: TileVec,
}

impl Default for Transform {
    fn default() -> Self {
        Self {
            flip: Flip::None,
            rotation: RelativeDirection::Forward,
            translation: vec2(0, 0),
        }
    }
}

impl Transform {
    pub fn new(flip: Flip, rotation: RelativeDirection, translation: TileVec) -> Self {
        Self {
            flip,
            rotation,
            translation,
        }
    }

    pub fn identity() -> Self {
        Default::default()
    }

    pub fn flip(flip: Flip) -> Self {
        Self {
            flip,
            ..Default::default()
        }
    }

    pub fn rotation(rotation: RelativeDirection) -> Self {
        Self {
            rotation,
            ..Default::default()
        }
    }

    pub fn transform_position(&self, position: TilePosition) -> TilePosition {
        let mut result = position;

        result = match self.flip {
            Flip::None => result,
            Flip::Horizontal => pos(-result.x, result.y),
            Flip::Vertical => pos(result.x, -result.y),
            Flip::Both => pos(-result.x, -result.y),
        };

        result = match self.rotation {
            RelativeDirection::Forward => result,
            RelativeDirection::Right => pos(-result.y, result.x),
            RelativeDirection::Backward => pos(-result.x, -result.y),
            RelativeDirection::Left => pos(result.y, -result.x),
        };

        result + self.translation
    }

    pub fn transform_direction(&self, dir: Direction) -> Direction {
        let mut ordinal = dir as u8;

        match self.flip {
            Flip::None => {}
            Flip::Horizontal => {
                ordinal = match ordinal {
                    1 => 3,
                    3 => 1,
                    _ => ordinal,
                };
            }
            Flip::Vertical => {
                ordinal = match ordinal {
                    0 => 2,
                    2 => 0,
                    _ => ordinal,
                };
            }
            Flip::Both => {
                ordinal = (ordinal + 2) % 4;
            }
        }

        ordinal = (ordinal + self.rotation.to_ordinal()) % 4;
        Direction::from_ordinal(ordinal).unwrap()
    }

    pub fn all_unique_transforms() -> Vec<Transform> {
        [
            Transform::new(Flip::None, RelativeDirection::Forward, vec2(0, 0)),
            Transform::new(Flip::None, RelativeDirection::Right, vec2(0, 0)),
            Transform::new(Flip::None, RelativeDirection::Backward, vec2(0, 0)),
            Transform::new(Flip::None, RelativeDirection::Left, vec2(0, 0)),
            Transform::new(Flip::Horizontal, RelativeDirection::Forward, vec2(0, 0)),
            Transform::new(Flip::Horizontal, RelativeDirection::Right, vec2(0, 0)),
            Transform::new(Flip::Vertical, RelativeDirection::Forward, vec2(0, 0)),
            Transform::new(Flip::Vertical, RelativeDirection::Right, vec2(0, 0)),
        ]
        .to_vec()
    }

    pub fn with_translation(mut self, translation: TileVec) -> Self {
        self.translation = translation;
        self
    }
}

pub trait PositionIteratorExt: Iterator<Item = TilePosition> + Sized {
    fn bounds(mut self) -> Option<BoundingBox> {
        let first = self.next()?;
        let (min, max) = self.fold((first, first), |(min, max), next_pos| {
            (
                pos(min.x.min(next_pos.x), min.y.min(next_pos.y)),
                pos(max.x.max(next_pos.x), max.y.max(next_pos.y)),
            )
        });
        Some(BoundingBox::new(min, max))
    }
}

impl<T: Iterator<Item = TilePosition>> PositionIteratorExt for T {}

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
    fn test_relative_direction() {
        assert_eq!(
            Direction::North.direction_to(Direction::East),
            RelativeDirection::Right
        );
        assert_eq!(
            Direction::East.direction_to(Direction::North),
            RelativeDirection::Left
        );
        assert_eq!(
            Direction::East.direction_to(Direction::East),
            RelativeDirection::Forward
        );
        assert_eq!(
            Direction::North.direction_to(Direction::South),
            RelativeDirection::Backward
        );
        assert_eq!(
            Direction::East.direction_to(Direction::West),
            RelativeDirection::Backward
        );
        assert_eq!(
            Direction::South.direction_to(Direction::West),
            RelativeDirection::Right
        );
    }

    #[test]
    fn test_relative_direction_ordinal() {
        assert_eq!(RelativeDirection::Forward.to_ordinal(), 0);
        assert_eq!(RelativeDirection::Right.to_ordinal(), 1);
        assert_eq!(RelativeDirection::Backward.to_ordinal(), 2);
        assert_eq!(RelativeDirection::Left.to_ordinal(), 3);

        assert_eq!(
            RelativeDirection::from_ordinal(0),
            Some(RelativeDirection::Forward)
        );
        assert_eq!(
            RelativeDirection::from_ordinal(1),
            Some(RelativeDirection::Right)
        );
        assert_eq!(
            RelativeDirection::from_ordinal(2),
            Some(RelativeDirection::Backward)
        );
        assert_eq!(
            RelativeDirection::from_ordinal(3),
            Some(RelativeDirection::Left)
        );
        assert_eq!(RelativeDirection::from_ordinal(4), None);
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
            Transform::flip(Flip::Horizontal).transform_position(pos1),
            pos(-2, 3)
        );
        assert_eq!(
            Transform::flip(Flip::Vertical).transform_position(pos1),
            pos(2, -3)
        );
        assert_eq!(
            Transform::flip(Flip::Both).transform_position(pos1),
            pos(-2, -3)
        );

        assert_eq!(
            Transform::rotation(RelativeDirection::Right).transform_position(pos1),
            pos(-3, 2)
        );
        assert_eq!(
            Transform::rotation(RelativeDirection::Backward).transform_position(pos1),
            pos(-2, -3)
        );
        assert_eq!(
            Transform::rotation(RelativeDirection::Left).transform_position(pos1),
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
            Transform::flip(Flip::Horizontal).transform_direction(Direction::East),
            Direction::West
        );
        assert_eq!(
            Transform::flip(Flip::Horizontal).transform_direction(Direction::West),
            Direction::East
        );
        assert_eq!(
            Transform::flip(Flip::Horizontal).transform_direction(Direction::North),
            Direction::North
        );

        assert_eq!(
            Transform::flip(Flip::Vertical).transform_direction(Direction::North),
            Direction::South
        );
        assert_eq!(
            Transform::flip(Flip::Vertical).transform_direction(Direction::South),
            Direction::North
        );
        assert_eq!(
            Transform::flip(Flip::Vertical).transform_direction(Direction::East),
            Direction::East
        );

        assert_eq!(
            Transform::rotation(RelativeDirection::Right).transform_direction(Direction::North),
            Direction::East
        );
        assert_eq!(
            Transform::rotation(RelativeDirection::Right).transform_direction(Direction::East),
            Direction::South
        );
        assert_eq!(
            Transform::rotation(RelativeDirection::Backward).transform_direction(Direction::North),
            Direction::South
        );
        assert_eq!(
            Transform::rotation(RelativeDirection::Left).transform_direction(Direction::North),
            Direction::West
        );
    }

    #[test]
    fn test_transform_entity() {
        use crate::{Belt, YELLOW_BELT};

        let belt = Belt::new(Direction::North, YELLOW_BELT);
        let transform = Transform::rotation(RelativeDirection::Right);

        let transformed = transform.transform_entity(belt.as_ref());
        let transformed_belt = transformed.as_belt().unwrap();

        assert_eq!(transformed_belt.direction, Direction::East);
        assert_eq!(transformed_belt.tier, YELLOW_BELT);
    }

    #[test]
    fn test_transform_world() {
        use crate::{Belt, World, YELLOW_BELT};

        let mut world = World::new();
        world
            .entities
            .insert(pos(1, 0), Belt::new(Direction::North, YELLOW_BELT));
        world
            .entities
            .insert(pos(2, 0), Belt::new(Direction::East, YELLOW_BELT));

        let transform =
            Transform::rotation(RelativeDirection::Right).with_translation(euclid::vec2(10, 20));
        let transformed_world = world.transform_world(&transform);

        assert_eq!(transformed_world.entities.len(), 2);

        let belt1 = transformed_world
            .get(pos(10, 21))
            .unwrap()
            .as_belt()
            .unwrap();
        assert_eq!(belt1.direction, Direction::East);

        let belt2 = transformed_world
            .get(pos(10, 22))
            .unwrap()
            .as_belt()
            .unwrap();
        assert_eq!(belt2.direction, Direction::South);
    }

    #[test]
    fn test_combined_flip_rotation() {
        let pos_test = pos(3, 4);
        let transform = Transform::new(
            crate::geometry::Flip::Horizontal,
            RelativeDirection::Right,
            euclid::vec2(0, 0),
        );
        let result = transform.transform_position(pos_test);

        assert_eq!(result, pos(-4, -3));

        let dir_test = Direction::North;
        let dir_result = transform.transform_direction(dir_test);
        assert_eq!(dir_result, Direction::East);
    }
}
