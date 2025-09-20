#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}
impl Position {
    pub fn new(x: i32, y: i32) -> Position {
        Position { x, y }
    }
}

pub fn pos(x: i32, y: i32) -> Position {
    Position { x, y }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Direction {
    North,
    East,
    South,
    West,
}

impl Direction {
    pub fn opposite(&self) -> Direction {
        match self {
            Direction::North => Direction::South,
            Direction::East => Direction::West,
            Direction::South => Direction::North,
            Direction::West => Direction::East,
        }
    }

    pub fn rotate_cw(&self) -> Direction {
        match self {
            Direction::North => Direction::East,
            Direction::East => Direction::South,
            Direction::South => Direction::West,
            Direction::West => Direction::North,
        }
    }

    pub fn rotate_ccw(&self) -> Direction {
        match self {
            Direction::North => Direction::West,
            Direction::East => Direction::North,
            Direction::South => Direction::East,
            Direction::West => Direction::South,
        }
    }

    pub fn to_ordinal(&self) -> u8 {
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
    pub fn direction_to(&self, other: Direction) -> Direction {
        let diff = (other.to_ordinal() + 4 - self.to_ordinal()) % 4;
        Direction::from_ordinal(diff).unwrap()
    }

    pub fn opposite_if(self, cond: bool) -> Direction {
        if cond { self.opposite() } else { self }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Ray {
    position: Position,
    direction: Direction,
}

impl Ray {
    pub fn new(position: Position, direction: Direction) -> Self {
        Self {
            position,
            direction,
        }
    }

    pub fn start_position(&self) -> Position {
        self.position
    }
    pub fn direction(&self) -> Direction {
        self.direction
    }
    pub fn relative_direction(&self, direction: Direction) -> Direction {
        self.direction.direction_to(direction)
    }
    pub fn ray_distance(&self, position: Position) -> i32 {
        // north is +y, east is +x
        match self.direction {
            Direction::North => position.y - self.position.y,
            Direction::East => position.x - self.position.x,
            Direction::South => self.position.y - position.y,
            Direction::West => self.position.x - position.x,
        }
    }
    pub fn position_at(&self, index: i32) -> Position {
        let Position { x, y } = self.position;
        match self.direction {
            Direction::North => Position { x, y: y + index },
            Direction::East => Position { x: x + index, y },
            Direction::South => Position { x, y: y - index },
            Direction::West => Position { x: x - index, y },
        }
    }
    pub fn snap(&self, position: Position) -> Position {
        self.position_at(self.ray_distance(position))
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
    fn test_direction_rotate() {
        assert_eq!(Direction::North.rotate_cw(), Direction::East);
        assert_eq!(Direction::East.rotate_cw(), Direction::South);
        assert_eq!(Direction::South.rotate_cw(), Direction::West);
        assert_eq!(Direction::West.rotate_cw(), Direction::North);

        assert_eq!(Direction::North.rotate_ccw(), Direction::West);
        assert_eq!(Direction::East.rotate_ccw(), Direction::North);
        assert_eq!(Direction::South.rotate_ccw(), Direction::East);
        assert_eq!(Direction::West.rotate_ccw(), Direction::South);
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
            Direction::East
        );
        assert_eq!(
            Direction::East.direction_to(Direction::North),
            Direction::West
        );
        assert_eq!(
            Direction::East.direction_to(Direction::East),
            Direction::North
        );
        assert_eq!(
            Direction::North.direction_to(Direction::South),
            Direction::South
        );
        assert_eq!(
            Direction::East.direction_to(Direction::West),
            Direction::South
        );
        assert_eq!(
            Direction::South.direction_to(Direction::West),
            Direction::East
        );
    }

    #[test]
    fn test_ray_distance() {
        let ray_north = Ray::new(pos(0, 0), Direction::North);
        assert_eq!(ray_north.ray_distance(pos(0, 5)), 5);
        assert_eq!(ray_north.ray_distance(pos(0, -5)), -5);

        let ray_east = Ray::new(pos(0, 0), Direction::East);
        assert_eq!(ray_east.ray_distance(pos(5, 0)), 5);
        assert_eq!(ray_east.ray_distance(pos(-5, 0)), -5);

        let ray_south = Ray::new(pos(0, 0), Direction::South);
        assert_eq!(ray_south.ray_distance(pos(0, 5)), -5);
        assert_eq!(ray_south.ray_distance(pos(0, -5)), 5);

        let ray_west = Ray::new(pos(0, 0), Direction::West);
        assert_eq!(ray_west.ray_distance(pos(5, 0)), -5);
        assert_eq!(ray_west.ray_distance(pos(-5, 0)), 5);
    }

    #[test]
    fn test_position_at() {
        let ray_north = Ray::new(pos(1, 1), Direction::North);
        assert_eq!(ray_north.position_at(5), pos(1, 6));

        let ray_east = Ray::new(pos(1, 1), Direction::East);
        assert_eq!(ray_east.position_at(5), pos(6, 1));

        let ray_south = Ray::new(pos(1, 1), Direction::South);
        assert_eq!(ray_south.position_at(5), pos(1, -4));

        let ray_west = Ray::new(pos(1, 1), Direction::West);
        assert_eq!(ray_west.position_at(5), pos(-4, 1));
    }

    #[test]
    fn test_snap() {
        let ray_north = Ray::new(pos(1, 1), Direction::North);
        assert_eq!(ray_north.snap(pos(5, 6)), pos(1, 6));

        let ray_east = Ray::new(pos(1, 1), Direction::East);
        assert_eq!(ray_east.snap(pos(6, 5)), pos(6, 1));

        let ray_south = Ray::new(pos(1, 1), Direction::South);
        assert_eq!(ray_south.snap(pos(5, -4)), pos(1, -4));

        let ray_west = Ray::new(pos(1, 1), Direction::West);
        assert_eq!(ray_west.snap(pos(-4, 5)), pos(-4, 1));
    }
}
