use euclid::default::{Box2D, Point2D, Vector2D};

pub type Position = Point2D<i32>;
pub type Vec2 = Vector2D<i32>;

pub fn pos(x: i32, y: i32) -> Position {
    Position::new(x, y)
}

pub fn vec2(x: i32, y: i32) -> Vec2 {
    Vector2D::new(x, y)
}
/// South is +y
/// East is +x
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Direction {
    North,
    East,
    South,
    West,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RelativeDirection {
    Forward,
    Right,
    Left,
    Backward,
}

impl Direction {
    pub fn to_vector(self) -> Vec2 {
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

    fn to_ordinal(self) -> u8 {
        match self {
            Direction::North => 0,
            Direction::East => 1,
            Direction::South => 2,
            Direction::West => 3,
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
    pub fn direction_to(&self, other: Direction) -> RelativeDirection {
        let diff = (other.to_ordinal() + 4 - self.to_ordinal()) % 4;
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
        let ordinal = self.to_ordinal();
        let new_ordinal = (ordinal + direction.to_ordinal()) % 4;
        Direction::from_ordinal(new_ordinal).unwrap()
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Ray {
    pub start_position: Position,
    pub direction: Direction,
}

impl Ray {
    pub fn new(position: Position, direction: Direction) -> Self {
        Self {
            start_position: position,
            direction,
        }
    }

    pub fn relative_directon(&self, direction: Direction) -> RelativeDirection {
        self.direction.direction_to(direction)
    }

    pub fn ray_position(&self, position: Position) -> i32 {
        let offset = position - self.start_position;
        let dir_vec = self.direction.to_vector();
        offset.dot(dir_vec)
    }
    /// Get position at index along ray using euclid vector arithmetic
    pub fn get_position(&self, index: i32) -> Position {
        self.start_position + self.direction.to_vector() * index
    }
    pub fn snap(&self, position: Position) -> Position {
        self.get_position(self.ray_position(position))
    }
}

pub type BoundingBox = Box2D<i32>;

pub fn bounds_new(top_left: Position, bottom_right: Position) -> BoundingBox {
    BoundingBox::new(top_left, bottom_right)
}

pub trait PositionIteratorExt: Iterator<Item = Position> + Sized {
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

impl<T: Iterator<Item = Position>> PositionIteratorExt for T {}

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
        assert_eq!(Direction::North.to_ordinal(), 0);
        assert_eq!(Direction::East.to_ordinal(), 1);
        assert_eq!(Direction::South.to_ordinal(), 2);
        assert_eq!(Direction::West.to_ordinal(), 3);

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
}
