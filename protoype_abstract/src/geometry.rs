#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Position {
    pub x: i32,
    pub y: i32,
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

    pub fn relative_direction(&self, other: Direction) -> Direction {
        let diff = (other.to_ordinal() - self.to_ordinal() + 4) % 4;
        Direction::from_ordinal(diff).unwrap()
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Ray {
    pub position: Position,
    pub direction: Direction,
}

impl Ray {
    pub fn new(position: Position, direction: Direction) -> Self {
        Self {
            position,
            direction,
        }
    }

    pub fn direction(&self) -> Direction {
        self.direction
    }

    pub fn relative_direction(&self, direction: Direction) -> Direction {
        self.direction.relative_direction(direction)
    }

    pub fn index_of(&self, position: Position) -> i32 {
        match self.direction {
            Direction::North => self.position.y - position.y,
            Direction::East => position.x - self.position.x,
            Direction::South => position.y - self.position.y,
            Direction::West => self.position.x - position.x,
        }
    }

    pub fn position_at(&self, index: i32) -> Position {
        match self.direction {
            Direction::North => Position {
                x: self.position.x,
                y: self.position.y - index,
            },
            Direction::East => Position {
                x: self.position.x + index,
                y: self.position.y,
            },
            Direction::South => Position {
                x: self.position.x,
                y: self.position.y + index,
            },
            Direction::West => Position {
                x: self.position.x - index,
                y: self.position.y,
            },
        }
    }

    pub fn snap(&self, position: Position) -> Position {
        self.position_at(self.index_of(position))
    }
}
