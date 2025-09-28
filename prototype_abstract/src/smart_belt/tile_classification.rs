use crate::RelativeDirection::*;
use crate::belts::BeltTier;
use crate::belts::LoaderLike;
use crate::belts::Splitter;
use crate::belts::UndergroundBelt;
use crate::belts::{Belt, BeltConnectableEnum};

use super::DragWorldView;
use super::NormalState;

#[derive(Debug, Clone, PartialEq)]
pub(super) enum TileType {
    /// A tile we can place or fast-replace belt on.
    Usable,
    /// An obstacle we want to underground over.
    Obstacle,
    /// A splitter that we will use
    IntegratedSplitter,
    /// An existing paired underground belt we will pass-through.
    PassThroughUnderground {
        /// failure if we wanted to upgrade this underground but we can't.
        upgrade_failure: bool,
        output_pos: i32,
    },
    /// An entity that ends the belt segment: a curved belt, or a loader. We can't underground over this.
    ImpassableObstacle,
}

pub(super) struct TileClassifier<'a> {
    world_view: DragWorldView<'a>,
    tier: BeltTier,
    last_state: &'a NormalState,
    last_position: i32,
}

impl<'a> TileClassifier<'a> {
    pub(super) fn new(
        world_view: DragWorldView<'a>,
        tier: BeltTier,
        last_state: &'a NormalState,
        last_position: i32,
    ) -> Self {
        Self {
            world_view,
            tier,
            last_state,
            last_position,
        }
    }

    fn next_position(&self) -> i32 {
        self.last_position + self.world_view.direction_multiplier()
    }

    fn is_forward(&self) -> bool {
        self.world_view.is_forward
    }

    /// most things are simple to classify. The tricky cases are in existing belt-like-entities.
    pub(super) fn classify_next_tile(&self) -> TileType {
        // note: we're faking impassable tiles with entities
        if let Some(entity) = self.world_view.get_entity_at_position(self.next_position()) {
            match entity.as_belt_connectable() {
                Some(BeltConnectableEnum::Belt(belt)) => self.classify_belt(belt),
                Some(BeltConnectableEnum::UndergroundBelt(ug)) => self.classify_underground(ug),
                Some(BeltConnectableEnum::Splitter(splitter)) => self.classify_splitter(splitter),
                Some(BeltConnectableEnum::LoaderLike(loader)) => self.classify_loader(loader),
                None => TileType::Obstacle,
            }
        } else {
            TileType::Usable
        }
    }

    fn classify_belt(&self, belt: &Belt) -> TileType {
        if self.world_view.belt_was_curved(self.next_position(), belt) {
            self.classify_curved_belt()
        } else {
            self.classify_straight_belt(belt)
        }
    }

    fn classify_straight_belt(&self, belt: &Belt) -> TileType {
        match self.world_view.belt_relative_direction(belt.direction) {
            // perpendicular belt
            Left | Right => TileType::Obstacle,
            // if the previous tile is an obstacle and directly connects to this belt, it's an obstacle.
            Forward | Backward if self.aligned_belt_is_obstacle() => TileType::Obstacle,
            // Forwards straight belt is always usable!
            Forward => TileType::Usable,
            Backward => {
                if self.should_ug_over_backwards_segment() {
                    TileType::Obstacle
                } else {
                    TileType::Usable
                }
            }
        }
    }

    fn classify_curved_belt(&self) -> TileType {
        // If we are trying to integrate a curved belt...
        if self.last_state.is_outputting_belt()
            && self
                .world_view
                .belt_directly_connects_to_next(self.last_position)
        {
            // it's impassable (smart belt is not allowed to rotate belt)
            TileType::ImpassableObstacle
        } else {
            // Any other curved belt is a normal obstacle
            TileType::Obstacle
        }
    }

    fn aligned_belt_is_obstacle(&self) -> bool {
        // If we don't connect to this belt (obstacle or error)...
        !self.last_state.is_outputting_belt()
        // and this belt directly connects to the previous obstacle...
            && self
                .world_view
                .belt_directly_connects_to_next(self.last_position)
        // then this belt is also an obstacle.
    }

    fn classify_underground(&self, ug: &UndergroundBelt) -> TileType {
        let relative_dir = self
            .world_view
            .drag_relative_direction(ug.shape_direction().opposite());

        match relative_dir {
            Left | Right => TileType::Obstacle,
            Forward | Backward => {
                let Some((pair_pos, _)) = self.world_view.get_ug_pair(self.next_position(), ug)
                else {
                    // unpaired undergrounds are always usable
                    return TileType::Usable;
                };
                if self.last_state.is_traversing_obstacle() {
                    // we can't use an input underground if we're already traversing an obstacle!
                    TileType::Obstacle
                } else if relative_dir == Forward {
                    // running into underground, use it!
                    self.try_integrate_underground(ug, pair_pos)
                } else {
                    TileType::Obstacle
                }
            }
        }
    }

    fn try_integrate_underground(&self, ug: &UndergroundBelt, pair_pos: i32) -> TileType {
        let upgrade_failure =
            self.tier != ug.tier && !self.can_upgrade_underground(self.next_position(), pair_pos);
        TileType::PassThroughUnderground {
            output_pos: pair_pos,
            upgrade_failure,
        }
    }

    fn classify_splitter(&self, splitter: &Splitter) -> TileType {
        if self.world_view.belt_relative_direction(splitter.direction) == Forward // same direction...
            && !self.should_ug_over_splitter_segment()
        // not special splitter case
        {
            TileType::IntegratedSplitter
        } else {
            TileType::Obstacle
        }
    }

    fn classify_loader(&self, loader: &LoaderLike) -> TileType {
        if self.belt_connects_into_loader(loader) {
            TileType::ImpassableObstacle
        } else {
            TileType::Obstacle
        }
    }

    fn belt_connects_into_loader(&self, loader: &LoaderLike) -> bool {
        loader.shape_direction() == self.world_view.drag_direction().opposite()
            && loader.is_input == self.is_forward()
    }

    /// Check the belt segment.
    /// We ug over a backwards belt segment if:
    /// it consists only of straight backwards belt segments and underground belts, at least
    /// as far as the current underground might reach.
    fn should_ug_over_backwards_segment(&self) -> bool {
        // if we made the decision in the last tile, return that
        if self.last_state.is_outputting_belt()
            && self
                .world_view
                .belt_directly_connects_to_next(self.last_position)
        {
            return false;
        }

        let Some(max_underground_position) = self.max_underground_position() else {
            // if we can't underground over it, default to including, it even if we may error.
            return false;
        };
        let belt_backwards = self.world_view.belt_direction().opposite();
        let drag_backwards = self.world_view.drag_direction().opposite();
        let rev_multiplier = self.world_view.direction_multiplier();

        // iterate over belt segment, check for bad entities.
        // Only check up to _before_ the max underground position, to avoid long-distance
        // dependencies. If there is a bad entity _past_ the max underground position, we
        // can't underground over this anyways; so we just pick one error.
        let mut position = self.next_position();
        while position * rev_multiplier < max_underground_position * rev_multiplier {
            let Some(belt_connectable) = self.world_view.get_belt_at_position(position) else {
                break;
            };
            match belt_connectable {
                BeltConnectableEnum::Belt(belt) => {
                    if self.world_view.directional_output_position(position, belt) != belt_backwards
                    {
                        break;
                    }
                    if self.world_view.belt_was_curved(position, belt) {
                        return true;
                    }
                }
                BeltConnectableEnum::UndergroundBelt(ug) => {
                    if ug.shape_direction() != drag_backwards || ug.is_input == self.is_forward() {
                        // not part of belt segment
                        break;
                    }
                    let Some((pair_pos, _)) = self.world_view.get_ug_pair(position, ug) else {
                        // no pair, treated as normal belt. Ends belt segment
                        break;
                    };
                    if ug.tier == self.tier {
                        // Can't underground over belt of same tier
                        break;
                    }
                    // scan after pair's output
                    position = pair_pos;
                }
                BeltConnectableEnum::Splitter(splitter) => {
                    // if the splitter is backwards, it connects to this belt segment, and makes
                    // the whole thing an obstacle
                    return splitter.direction == belt_backwards;
                }
                BeltConnectableEnum::LoaderLike(loader) => {
                    if loader.shape_direction() != drag_backwards
                        || loader.is_input == self.is_forward()
                    {
                        // not part of belt segment
                        break;
                    } else {
                        // this _backwards_ belt segment ends in a loader. Try to ug over it
                        return true;
                    }
                }
            }
            position += rev_multiplier;
        }
        // default: integrate this belt segment
        false
    }

    fn last_output_already_exists(&self) -> bool {
        self.last_state.is_outputting_belt()
            && self
                .world_view
                .get_belt_dyn_at_position(self.last_position)
                .is_some_and(|b| {
                    if self.world_view.is_forward {
                        b.has_output_going(self.world_view.belt_direction())
                    } else {
                        b.has_input_going(self.world_view.belt_direction())
                    }
                })
    }

    /// We currently only ug over a splitter if we see:
    /// splitter* (straight_belt*) curved_belt
    fn should_ug_over_splitter_segment(&self) -> bool {
        // If we can't enter the splitter, treat it as an obstacle
        if !self.last_state.is_outputting_belt() {
            return true;
        }
        // if the last tile directly connects to this splitter, don't try
        if self.last_output_already_exists() {
            return false;
        }

        // if we can't underground over this at all, don't try.
        let max_underground_position = self.max_underground_position().unwrap(); // ok due to is_outputting_belt check
        let rev_multiplier = self.world_view.direction_multiplier();
        let belt_direction = self.world_view.belt_direction();

        let mut pos = self.next_position();
        let get_entity = |pos| {
            if pos * rev_multiplier >= max_underground_position * rev_multiplier {
                return None;
            }
            self.world_view.get_belt_at_position(pos)
        };

        // Skip splitter*
        while let Some(entity) = get_entity(pos)
            && matches!(
                entity,
                BeltConnectableEnum::Splitter(Splitter { direction, .. })
                if *direction == belt_direction,
            )
        {
            pos += rev_multiplier;
        }

        // Process remaining belt segment
        while let Some(entity) = get_entity(pos) {
            match entity {
                BeltConnectableEnum::Belt(belt) => {
                    if self.world_view.belt_was_curved(pos, belt) {
                        // curved belt: this segment is an obstacle if it's connected to this curved belt
                        return self
                            .world_view
                            .belt_directly_connects_to_next(pos - rev_multiplier);
                    } else {
                        // straight belt
                        if belt.direction != self.world_view.belt_direction() {
                            // if not part of belt segment, break
                            break;
                        }
                        // else, continue scanning belt segment
                    }
                }
                BeltConnectableEnum::UndergroundBelt(ug) => {
                    if ug.shape_direction() != self.world_view.drag_direction().opposite()
                        || ug.is_input != self.is_forward()
                    {
                        // not part of belt segment, break
                        break;
                    }
                    let Some((pair_pos, _)) = self.world_view.get_ug_pair(pos, ug) else {
                        // no pair, treated as normal belt -- ends belt segment
                        break;
                    };
                    if ug.tier == self.tier {
                        // we can't underground over this
                        break;
                    }
                    // scan after pair's output
                    pos = pair_pos;
                }
                BeltConnectableEnum::Splitter(_) => {
                    break; // if we see another splitter, defer decision to until we reach it
                }
                BeltConnectableEnum::LoaderLike(_) => {
                    break;
                }
            }
            pos += self.world_view.direction_multiplier();
        }
        false
    }

    fn can_upgrade_underground(&self, ug_pos: i32, pair_pos: i32) -> bool {
        // Can't upgrade if if upgrading would make the pair too short
        if pair_pos.abs_diff(ug_pos) > self.tier.underground_distance as u32 {
            return false;
        }

        let between_range = if self.is_forward() {
            ug_pos + 1..=pair_pos - 1
        } else {
            pair_pos + 1..=ug_pos - 1
        };

        !between_range.into_iter().any(|pos| {
            self.world_view
                .get_entity_at_position(pos)
                .and_then(|e| e.as_underground_belt())
                .is_some_and(|e| {
                    e.tier == self.tier
                        && e.direction.axis() == self.world_view.drag_direction().axis()
                })
        })
    }

    fn max_underground_position(&self) -> Option<i32> {
        let input_pos = match self.last_state {
            NormalState::BeltPlaced => Some(self.last_position),
            NormalState::Traversing { input_pos, .. }
            | NormalState::OutputUgPlaced { input_pos, .. }
            | NormalState::TraversingAfterOutput { input_pos, .. } => Some(*input_pos),
            _ => None,
        };
        let diff = (self.tier.underground_distance as i32) * self.world_view.direction_multiplier();
        input_pos.map(|f| f + diff)
    }
}
