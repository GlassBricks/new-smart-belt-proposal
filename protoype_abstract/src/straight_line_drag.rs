use crate::entity::{Belt, Entity, Splitter, UndergroundBelt};
use crate::geometry::Direction::*;
use crate::geometry::Ray;
use crate::{BeltTier, DragWorldView, LoaderLike};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Action {
    PlaceBelt,
    PlaceOrExtendUnderground,
    IntegrateEntity,
    None,
    // errors
    EntityInTheWay,
    ImpassableObstacle,
    TooLongToReach,
    CannotUpgradeUnderground,
}

// todo: split out tile type with saved type
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TileType {
    Usable,
    IntegratedOutput,
    Obstacle,
    PassThrough,
    Impassable,
    UnusableUnderground,
}

impl TileType {
    fn is_output(&self) -> bool {
        matches!(self, TileType::Usable | TileType::IntegratedOutput)
    }
}

pub struct StepResult {
    pub action: Action,
    pub next_tile_type: TileType,
}

#[derive(Debug, Clone, Copy)]
pub struct LineDragState {
    pub position: i32,
    pub tile_type: TileType,
    pub last_underground_position: Option<i32>,
}

impl LineDragState {
    pub fn initial(placed_successfully: bool) -> Self {
        Self {
            position: 0,
            tile_type: TileType::Usable,
            last_underground_position: if placed_successfully { Some(0) } else { None },
        }
    }
}

// todo: backwards
#[derive(Debug)]
pub struct LineDragHandler {
    pub world_view: DragWorldView,
    pub belt_tier: BeltTier,
}

impl LineDragHandler {
    pub fn new(ray: Ray, belt_tier: BeltTier) -> Self {
        Self {
            world_view: DragWorldView::new(ray),
            belt_tier,
        }
    }

    pub fn process_next_tile(self, prev_state: &LineDragState) -> StepResult {
        let next_position = prev_state.position + 1;
        let prev_tile_type = prev_state.tile_type;
        let cur_tile_type = self.classify_tile(prev_tile_type, next_position);
        let action = self.get_tile_action(prev_state, cur_tile_type);
        return StepResult {
            action,
            next_tile_type: cur_tile_type,
        };
    }

    fn classify_tile(&self, last_tile_type: TileType, position: i32) -> TileType {
        let entity = self.world_view.get_entity_at_position(position);

        if matches!(last_tile_type, TileType::PassThrough) {
            return self.handle_pass_through(&entity);
        }

        match entity {
            Some(Entity::Belt(belt)) => self.classify_belt(&belt, last_tile_type, position),
            Some(Entity::UndergroundBelt(ug)) => self.classify_underground(&ug, last_tile_type),
            Some(Entity::Splitter(splitter)) => {
                self.classify_splitter(&splitter, last_tile_type, position)
            }
            Some(Entity::LoaderLike(loader)) => self.classify_loader(&loader),
            None => self.classify_empty_tile(position),
        }
    }

    fn handle_pass_through(&self, entity: &Option<Entity>) -> TileType {
        if let Some(Entity::UndergroundBelt(ug)) = entity {
            if ug.get_shape_direction() == self.world_view.drag_direction() {
                return TileType::IntegratedOutput;
            }
        }
        return TileType::PassThrough;
    }

    fn classify_belt(&self, belt: &Belt, last_tile_type: TileType, position: i32) -> TileType {
        match self.world_view.relative_direction(belt.direction) {
            East | West => {
                if self.world_view.belt_drag_connects_to(position) {
                    TileType::Impassable
                } else {
                    TileType::Obstacle
                }
            }
            North => {
                if self.world_view.belt_was_curved(position) {
                    TileType::Obstacle
                } else if last_tile_type.is_output() {
                    TileType::Usable
                } else {
                    self.try_enter_belt_segment(position)
                }
            }
            South => self.try_enter_belt_segment(position),
        }
    }

    fn classify_underground(&self, ug: &UndergroundBelt, last_tile_type: TileType) -> TileType {
        let relative_dir = self.world_view.relative_direction(ug.direction);

        if !self.world_view.is_ug_paired(ug) {
            match relative_dir {
                East | West => TileType::Obstacle,
                North | South => TileType::Usable,
            }
        } else {
            match relative_dir {
                East | West => TileType::Obstacle,
                North | South => {
                    if ug.is_input {
                        if last_tile_type.is_output() {
                            self.try_integrate_underground(ug)
                        } else {
                            self.try_skip_underground(ug)
                        }
                    } else {
                        self.try_skip_underground(ug)
                    }
                }
            }
        }
    }

    fn classify_splitter(
        &self,
        splitter: &Splitter,
        last_tile_type: TileType,
        position: i32,
    ) -> TileType {
        match self.world_view.relative_direction(splitter.direction) {
            North => {
                if last_tile_type.is_output() {
                    self.try_enter_belt_segment_splitter(position)
                } else {
                    TileType::Obstacle
                }
            }
            East | West | South => TileType::Obstacle,
        }
    }

    fn classify_loader(&self, loader: &LoaderLike) -> TileType {
        if self.belt_connects_into_loader(loader) {
            TileType::Impassable
        } else {
            TileType::Obstacle
        }
    }

    pub fn belt_connects_into_loader(&self, loader: &LoaderLike) -> bool {
        loader.is_input && loader.direction == self.world_view.drag_direction()
    }

    fn classify_empty_tile(&self, position: i32) -> TileType {
        if self.world_view.can_place_belt(position) {
            TileType::Usable
        } else if self.world_view.is_undergroundable_tile(position) {
            TileType::Obstacle
        } else {
            TileType::Impassable
        }
    }

    fn try_enter_belt_segment(&self, position: i32) -> TileType {
        if self.world_view.check_belt_segment_enter(position) {
            TileType::Usable
        } else {
            TileType::Obstacle
        }
    }

    fn try_enter_belt_segment_splitter(&self, position: i32) -> TileType {
        if self.world_view.check_belt_segment_enter(position) {
            TileType::IntegratedOutput
        } else {
            TileType::Obstacle
        }
    }

    fn try_integrate_underground(&self, ug: &UndergroundBelt) -> TileType {
        if self.belt_tier == ug.belt_tier {
            TileType::PassThrough
        } else {
            if self.world_view.upgrading_would_make_too_short(ug) {
                TileType::UnusableUnderground
            } else if self.world_view.has_conflicting_undergrounds_between(ug) {
                TileType::UnusableUnderground
            } else {
                TileType::PassThrough
            }
        }
    }

    fn try_skip_underground(&self, ug: &UndergroundBelt) -> TileType {
        if self.belt_tier == ug.belt_tier {
            TileType::Impassable
        } else {
            TileType::Obstacle
        }
    }

    fn get_tile_action(&self, last_state: &LineDragState, cur_tile_type: TileType) -> Action {
        let last_tile_type = last_state.tile_type;
        match last_tile_type {
            TileType::PassThrough => match cur_tile_type {
                TileType::PassThrough => Action::None,
                TileType::IntegratedOutput => Action::None,
                _ => panic!("Invalid state transition from PassThrough"),
            },
            TileType::Impassable => Action::ImpassableObstacle,
            _ => match cur_tile_type {
                TileType::Usable => {
                    if last_tile_type.is_output() {
                        Action::PlaceBelt
                    } else {
                        Action::PlaceOrExtendUnderground
                    }
                }
                TileType::IntegratedOutput => Action::IntegrateEntity,
                TileType::PassThrough => Action::IntegrateEntity, // beginning pass_through means seeing input ug
                TileType::Obstacle => {
                    if matches!(last_tile_type, TileType::IntegratedOutput) {
                        Action::EntityInTheWay
                    } else if self.can_add_underground(last_state) {
                        Action::TooLongToReach
                    } else {
                        Action::None
                    }
                }
                TileType::Impassable => Action::None,
                TileType::UnusableUnderground => Action::CannotUpgradeUnderground,
            },
        }
    }

    fn can_add_underground(&self, last_state: &LineDragState) -> bool {
        if let Some(last_ug_position) = last_state.last_underground_position {
            (last_state.position + 1) - last_ug_position <= self.belt_tier.underground_length as i32
        } else {
            false
        }
    }
}
