use crate::entity::{Belt, Entity, Splitter, UndergroundBelt};
use crate::geometry::Direction::*;
use crate::{BeltTier, DragWorldView, LoaderLike};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Action {
    PlaceBelt,
    PlaceNewUnderground { input_position: i32 },
    ReplaceUnderground { last_output_position: i32 },
    IntegrateEntity,
    None,
    // errors
    EntityInTheWay,
    ImpassableObstacle,
    TooLongToReach,
    CannotUpgradeUnderground,
}

// todo: split out tile type with saved type
// todo: add last_tile_type, next_tile_type, etc. to the state
#[derive(Debug, Clone, PartialEq)]
pub enum TileType {
    Usable,
    IntegratedOutput,
    Obstacle,
    PassThrough(BeltTier),
    Impassable,
    UnusableUnderground,
}

impl TileType {
    fn is_output(&self) -> bool {
        matches!(self, TileType::Usable | TileType::IntegratedOutput)
    }
}
#[derive(Debug, Clone)]
pub struct LineDragState {
    // last position
    pub last_position: i32,
    // todo: combine the next 3 into one big enum
    // tile type
    pub last_tile_type: TileType,
    // the last location where an underground is possible.
    pub last_possible_entrance: Option<i32>,
    pub last_output_position: Option<i32>,
}

pub struct StepResult {
    pub action: Action,
    pub next_tile_type: TileType,
}

impl LineDragState {
    // todo: abstract this
    pub fn initial(placed_successfully: bool) -> Self {
        Self {
            last_position: 0,
            last_tile_type: TileType::Usable,
            last_possible_entrance: placed_successfully.then_some(0),
            last_output_position: None,
        }
    }

    pub fn next_position(&self) -> i32 {
        self.last_position + 1
    }
}

// todo: backwards
#[derive(Debug)]
pub struct LineDragHandler<'a> {
    pub world_view: DragWorldView<'a>,
    pub belt_tier: BeltTier,
}

impl<'a> LineDragHandler<'a> {
    pub fn new(world_view: DragWorldView<'a>, belt_tier: BeltTier) -> Self {
        Self {
            world_view,
            belt_tier,
        }
    }

    pub fn process_next_tile(self, prev_state: &LineDragState) -> StepResult {
        match &prev_state.last_tile_type {
            TileType::PassThrough(tier) => {
                self.process_pass_through(prev_state.last_position + 1, tier)
            }
            TileType::Impassable => StepResult {
                action: Action::ImpassableObstacle,
                next_tile_type: TileType::Usable,
            },
            _ => self.process_normal_tile(prev_state),
        }
    }

    fn process_pass_through(&self, position: i32, tier: &BeltTier) -> StepResult {
        let entity = self.world_view.get_entity_at_position(position);
        let next_tile_type = match entity {
            Some(Entity::UndergroundBelt(ug))
                if ug.tier == *tier && ug.shape_direction() == self.world_view.drag_direction() =>
            {
                TileType::IntegratedOutput
            }
            _ => TileType::PassThrough(tier.clone()),
        };
        StepResult {
            action: Action::None,
            next_tile_type,
        }
    }

    fn process_normal_tile(self, prev_state: &LineDragState) -> StepResult {
        let next_tile_type = self.get_next_tile_type(prev_state);
        let action = match next_tile_type {
            TileType::Usable => {
                if prev_state.last_tile_type.is_output() {
                    Action::PlaceBelt
                } else {
                    self.place_or_extend_underground(prev_state)
                }
            }
            TileType::IntegratedOutput => Action::IntegrateEntity,
            TileType::PassThrough(_) => Action::IntegrateEntity, // beginning pass_through means seeing input ug
            TileType::Obstacle => {
                if matches!(prev_state.last_tile_type, TileType::IntegratedOutput) {
                    Action::EntityInTheWay
                // } else if self.underground_would_be_too_long(prev_state, position + 1) {
                //     Action::TooLongToReach
                // alternative: report too long to reach the moment it becomes too long, not after passing all obstacles
                } else {
                    Action::None
                }
            }
            TileType::Impassable => Action::None,
            TileType::UnusableUnderground => Action::CannotUpgradeUnderground,
        };
        StepResult {
            action,
            next_tile_type,
        }
    }

    fn get_next_tile_type(&self, state: &LineDragState) -> TileType {
        let entity = self
            .world_view
            .get_entity_at_position(state.next_position());
        match entity {
            Some(Entity::Belt(belt)) => self.classify_belt(&belt, state),
            Some(Entity::UndergroundBelt(ug)) => self.classify_underground(&ug),
            Some(Entity::Splitter(splitter)) => self.classify_splitter(&splitter, state),
            Some(Entity::LoaderLike(loader)) => self.classify_loader(&loader),
            Some(Entity::OtherColliding) => TileType::Obstacle,
            None => self.classify_empty_tile(state.next_position()),
        }
    }

    fn classify_belt(&self, belt: &Belt, state: &LineDragState) -> TileType {
        match self.world_view.relative_direction(belt.direction) {
            East | West => {
                if self.belt_was_connected_forward(state.last_position) {
                    TileType::Impassable
                } else {
                    TileType::Obstacle
                }
            }
            North => {
                // todo: handle had_output
                if self.world_view.belt_was_curved(belt) {
                    TileType::Obstacle
                } else if state.last_tile_type.is_output() {
                    TileType::Usable
                } else {
                    self.try_enter_belt_segment(state, belt)
                }
            }
            South => self.try_enter_belt_segment(state, belt),
        }
    }

    fn belt_was_connected_forward(&self, _position: i32) -> bool {
        // todo: handle cases when a belt only used to be curved
        true
    }

    fn try_enter_belt_segment(&self, state: &LineDragState, _belt: &Belt) -> TileType {
        if self.should_ug_over_belt_segment_backwards_belt(state) {
            TileType::Obstacle
        } else {
            TileType::Usable
        }
    }

    fn classify_underground(&self, ug: &UndergroundBelt) -> TileType {
        let relative_dir = self
            .world_view
            .relative_direction(ug.shape_direction().opposite());

        match relative_dir {
            East | West => TileType::Obstacle,
            North | South if !self.world_view.is_ug_paired(ug) => TileType::Usable,
            North => self.try_integrate_underground(ug),
            South => self.try_skip_underground(ug),
        }
    }

    fn try_integrate_underground(&self, ug: &UndergroundBelt) -> TileType {
        if self.belt_tier != ug.tier && self.world_view.can_upgrade_underground(ug, &self.belt_tier)
        {
            TileType::UnusableUnderground
        } else {
            TileType::PassThrough(self.belt_tier.clone())
        }
    }

    fn try_skip_underground(&self, ug: &UndergroundBelt) -> TileType {
        if self.belt_tier == ug.tier {
            TileType::Impassable
        } else {
            TileType::Obstacle
        }
    }

    fn classify_splitter(&self, splitter: &Splitter, state: &LineDragState) -> TileType {
        if matches!(
            self.world_view.relative_direction(splitter.direction),
            North
        ) && state.last_tile_type.is_output()
            && self.should_ug_over_belt_segment_after_splitter(state)
        {
            TileType::Obstacle
        } else {
            TileType::IntegratedOutput
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
        // todo: handle backwards dragging
        loader.is_input && loader.direction == self.world_view.drag_direction()
    }

    fn classify_empty_tile(&self, position: i32) -> TileType {
        if self.world_view.can_place_belt_on_tile(position) {
            TileType::Usable
        } else if self.world_view.is_undergroundable_tile(position) {
            TileType::Obstacle
        } else {
            TileType::Impassable
        }
    }

    fn place_or_extend_underground(&self, state: &LineDragState) -> Action {
        if let Some(input_position) = state.last_possible_entrance {
            if state.next_position() - input_position > self.belt_tier.underground_distance as i32 {
                Action::TooLongToReach
            } else if let Some(last_output_position) = state.last_output_position {
                Action::ReplaceUnderground {
                    last_output_position,
                }
            } else {
                Action::PlaceNewUnderground { input_position }
            }
        } else {
            // no entrance position; either recovering from an error or starting with an error.
            Action::PlaceBelt
        }
    }

    /// After a _forwards_ splitter:
    ///
    /// splitter* forwards_belt* curved_belt
    ///
    /// Future extension 1: also consider belt weaving
    /// splitter* (forwards_belt | diff_tier_paired_ug)* curved_belt
    ///
    /// Extension 2: also consider blocked undergrounds
    /// splitter* (forwards_belt | diff_tier_paired_ug)* obstacle
    fn should_ug_over_belt_segment_after_splitter(&self, state: &LineDragState) -> bool {
        // assumes: first_belt_entity is straight

        // todo: refactor to remove need for this assertion
        assert!(state.last_tile_type.is_output());

        let belt_direction = self.world_view.belt_direction();

        // ug over a belt segment, if there's something in it that would break the belt line if we try to enter it.
        let last_input_position = state
            .last_possible_entrance
            .expect("todo: refactor to remove need for this assertion");
        let furthest_output_position =
            last_input_position + self.belt_tier.underground_distance as i32;

        let entity_iter = (state.next_position()..furthest_output_position)
            .into_iter()
            .map_while(|position| {
                self.world_view
                    .get_entity_at_position(position)
                    .and_then(|e| e.as_belt_like())
                    .map(|e| (position, e))
            });
        let splitter_skip = entity_iter.skip_while(|(_, e)| {
            e.as_splitter()
                .is_some_and(|s| s.direction == belt_direction)
        });

        let last_entity = splitter_skip
            .skip_while(|(_, e)| {
                e.as_belt().is_some_and(|belt| {
                    belt.direction == belt_direction && !self.world_view.belt_is_curved(belt)
                })
            })
            .next();
        last_entity.is_some_and(|(position, belt)| {
            belt.as_belt().is_some_and(|belt| {
                belt.direction == belt_direction && self.world_view.belt_is_curved(belt)
            }) && self.world_view.belt_directly_connects_into_next(position)
        })
    }

    fn should_ug_over_belt_segment_backwards_belt(&self, _state: &LineDragState) -> bool {
        todo!()
    }
}
