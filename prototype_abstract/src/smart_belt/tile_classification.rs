use crate::Direction;
use crate::RelativeDirection::*;
use crate::belts::{Belt, BeltConnectableEnum, BeltTier, LoaderLike, Splitter, UndergroundBelt};

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
    IntegratedUnderground { output_pos: i32 },
    /// An entity that ends the current drag: a curved belt or a loader. We can't underground over this.
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
    fn drag_direction(&self) -> Direction {
        self.world_view.drag_direction()
    }
    fn belt_direction(&self) -> Direction {
        self.world_view.belt_direction()
    }
    fn is_perpendicular(&self, direction: Direction) -> bool {
        direction.axis() != self.drag_direction().axis()
    }

    pub(super) fn classify_next_tile(&self) -> TileType {
        if let Some(entity) = self.world_view.get_entity(self.next_position()) {
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
        if self.is_perpendicular(belt.direction)
            || self.is_connected_to_previous_belt_obstacle()
            || (belt.direction != self.belt_direction() && self.should_ug_over_backwards_segment())
        {
            TileType::Obstacle
        } else {
            TileType::Usable
        }
    }

    fn classify_curved_belt(&self) -> TileType {
        // If we are trying to integrate a curved belt...
        if self.last_state.is_outputting_belt()
            && self
                .world_view
                .is_belt_connected_to_previous_tile(self.next_position())
        {
            // it's impassable, since we're not allowed to rotate existing belt.
            TileType::ImpassableObstacle
        } else {
            // Any other curved belt is a normal obstacle
            TileType::Obstacle
        }
    }

    fn classify_underground(&self, ug: &UndergroundBelt) -> TileType {
        if self.is_perpendicular(ug.direction) || self.is_connected_to_previous_belt_obstacle() {
            TileType::Obstacle
        } else if let Some(output_pos) = self.world_view.get_ug_pair_pos(self.next_position(), ug) {
            if self.last_state.is_traversing_obstacle() // if the belt before is an obstacle, we can't enter this
                || !self.ug_is_enterable(ug)
            {
                TileType::Obstacle
            } else {
                // The correct orientation to use this underground belt.
                TileType::IntegratedUnderground { output_pos }
            }
        } else {
            self.handle_unpaired_underground_belt(ug)
        }
    }

    fn handle_unpaired_underground_belt(&self, ug: &UndergroundBelt) -> TileType {
        if self.ug_is_enterable(ug) {
            // if the unpaired underground is enterable, it is always usable (may be fast-replaced with belt).
            TileType::Usable
        } else if self.should_ug_over_unpaired_underground_segment(ug) {
            // Otherwise, check the belt segment.
            TileType::Obstacle
        } else {
            // if we can use it, replace it with a belt.
            TileType::Usable
        }
    }

    fn ug_is_enterable(&self, ug: &UndergroundBelt) -> bool {
        self.drag_direction() == ug.shape_direction().opposite()
    }

    fn classify_splitter(&self, splitter: &Splitter) -> TileType {
        if self
            .world_view
            .belt_direction()
            .direction_to(splitter.direction)
            == Forward
            && !self.should_ug_over_splitter_segment()
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
        loader.shape_direction() == self.drag_direction().opposite()
            && loader.is_input == self.is_forward()
    }

    /// Check the belt segment.
    /// We ug over a backwards belt segment if:
    /// it consists only of straight backwards belt segments and underground belts, at least
    /// as far as the current underground might reach.
    fn should_ug_over_backwards_segment(&self) -> bool {
        // If we already integrated the last tile that was part of this belt segment, continue to integrate.
        if self.last_state.is_outputting_belt()
            && self
                .world_view
                .is_belt_connected_to_previous_tile(self.next_position())
        {
            return false;
        }

        self.scan_belt_segment(self.next_position(), false)
    }

    fn should_ug_over_unpaired_underground_segment(&self, ug: &UndergroundBelt) -> bool {
        if ug.tier == self.tier {
            // we can't upgrade this.
            return false;
        }
        let segment_direction_matches = ug.direction == self.belt_direction();
        self.scan_belt_segment(self.next_position(), segment_direction_matches)
    }

    fn is_connected_to_previous_belt_obstacle(&self) -> bool {
        self.last_state.is_traversing_obstacle()
            && self
                .world_view
                .is_belt_connected_to_previous_tile(self.next_position())
    }

    /// We currently only ug over a splitter if we see:
    /// splitter* (straight_belt*) curved_belt
    fn should_ug_over_splitter_segment(&self) -> bool {
        if matches!(self.last_state, NormalState::ErrorRecovery) {
            // Exception: you can always enter splitter from "error" state.
            // This allows e.g. starting a belt upgrade
            false
        } else if !self.last_state.is_outputting_belt() {
            // If we can't enter the splitter at all, treat it as an obstacle
            true
        } else if self.had_belt_entering_splitter() {
            // if we over-dragged a belt directly entering this splitter, always integrate.
            false
        } else {
            self.is_splitter_special_case()
        }
    }

    fn had_belt_entering_splitter(&self) -> bool {
        self.world_view
            .get_belt_dyn(self.last_position)
            .is_some_and(|b| {
                if self.world_view.is_forward {
                    b.has_output_going(self.belt_direction())
                } else {
                    b.has_input_going(self.belt_direction())
                }
            })
    }

    fn is_splitter_special_case(&self) -> bool {
        // Special case: splitter with no input, and the belt segment after it ends in a curved belt
        let max_underground_position = self
            .max_underground_position()
            .expect("Should be is_outputting_belt state");
        let rev_multiplier = self.world_view.direction_multiplier();

        let mut scan_pos = self.next_position();
        // Skip consecutive splitters
        while scan_pos * rev_multiplier < max_underground_position * rev_multiplier
            && let Some(belt_connectable) = self.world_view.get_belt(scan_pos)
            && let BeltConnectableEnum::Splitter(Splitter { direction, .. }) = belt_connectable
            && *direction == self.belt_direction()
        {
            scan_pos += rev_multiplier;
        }
        // Back up one tile, gives position of the furthest splitter (not belt in front)
        self.scan_belt_segment(scan_pos - rev_multiplier, true)
    }

    /// Scans a belt segment starting at [start_pos], to see if we should try to underground over it.
    fn scan_belt_segment(&self, start_pos: i32, segment_belt_direction_matches: bool) -> bool {
        let Some(max_underground_position) = self.max_underground_position() else {
            // If we can't create an underground, don't attempt to.
            return false;
        };

        let rev_multiplier = self.world_view.direction_multiplier();
        let mut scan_pos = start_pos + rev_multiplier;

        // scan the belt segment.
        while scan_pos * rev_multiplier < max_underground_position * rev_multiplier
            && let Some(belt_connectable) = self.world_view.get_belt(scan_pos)
            && self.world_view.is_belt_connected_to_previous_tile(scan_pos)
        {
            match belt_connectable {
                BeltConnectableEnum::Belt(belt) => {
                    if self.world_view.belt_was_curved(scan_pos, belt) {
                        // Curved belt case!
                        return true;
                    }
                    // else, belt segment continues.
                }
                BeltConnectableEnum::UndergroundBelt(ug) => {
                    if ug.tier == self.tier {
                        // We can't underground over this.
                        break;
                    }
                    let Some(pair_pos) = self.world_view.get_ug_pair_pos(scan_pos, ug) else {
                        // Unpaired underground we can enter is treated as normal belt. Ends belt segment
                        break;
                    };
                    // Jump scan to after the underground pair
                    scan_pos = pair_pos;
                }
                BeltConnectableEnum::Splitter(_) | BeltConnectableEnum::LoaderLike(_) => {
                    // We should use same direction splitters or loaders, but not backwards ones.
                    return !segment_belt_direction_matches;
                }
            }
            scan_pos += rev_multiplier;
        }
        false
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
