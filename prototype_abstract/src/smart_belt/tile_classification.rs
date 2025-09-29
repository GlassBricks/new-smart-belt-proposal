use crate::Direction;
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
        if self.is_perpendicular(belt.direction) || self.is_connected_to_previous_belt_obstacle() {
            // - Perpendicular belts are obstacles
            // - Belts connected to obstacles are obstacles
            TileType::Obstacle
        } else if belt.direction != self.belt_direction()
            && !self.should_integrate_backwards_belt_segment()
        {
            // Always integrate forwards belt.
            // If it's a backwards belt, we check the entire belt segment.
            TileType::Obstacle
        } else {
            // All other cases are usable.
            TileType::Usable
        }
    }

    fn classify_curved_belt(&self) -> TileType {
        if self.last_state.is_outputting_belt()
            && self
                .world_view
                .is_belt_connected_to_previous_tile(self.next_position())
        {
            // If we are trying to integrate a curved belt, it's impassable,
            // since we're not allowed to rotate existing belt.
            TileType::ImpassableObstacle
        } else {
            // Any other curved belt is a normal obstacle
            TileType::Obstacle
        }
    }

    fn classify_underground(&self, ug: &UndergroundBelt) -> TileType {
        if self.is_perpendicular(ug.direction) || self.is_connected_to_previous_belt_obstacle() {
            // Perpendicular undergrounds are obstacles.
            // Belts connected to obstacles are obstacles.
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
        } else if !self.should_integrate_unpaired_underground_segment(ug) {
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
        // The only usable splitters are those that match the belt direction.
        if self.belt_direction() == splitter.direction && self.should_integrate_splitter_segment() {
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

    fn is_connected_to_previous_belt_obstacle(&self) -> bool {
        self.last_state.is_traversing_obstacle()
            && self
                .world_view
                .is_belt_connected_to_previous_tile(self.next_position())
    }

    fn should_integrate_backwards_belt_segment(&self) -> bool {
        // If the last belt is part of the same segment, and we've integrated it, then integrate this too.
        if self.last_state.is_outputting_belt()
            && self
                .world_view
                .is_belt_connected_to_previous_tile(self.next_position())
        {
            return true;
        }

        self.should_integrate_belt_segment(self.next_position(), false)
    }

    fn should_integrate_unpaired_underground_segment(&self, ug: &UndergroundBelt) -> bool {
        if ug.tier == self.tier {
            // We can't underground over this. Default to integrating it
            return true;
        }
        let segment_direction_matches = ug.direction == self.belt_direction();
        self.should_integrate_belt_segment(self.next_position(), segment_direction_matches)
    }

    fn should_integrate_splitter_segment(&self) -> bool {
        if matches!(self.last_state, NormalState::ErrorRecovery) {
            // Exception: you can always enter splitter from "error" state.
            // This allows e.g. starting a belt upgrade
            true
        } else if !self.last_state.is_outputting_belt() {
            // If we can't enter the splitter, it's an obstacle
            false
        } else if self.had_belt_entering_splitter() {
            // if we integrated a belt directly entering this splitter, integrate this splitter.
            true
        } else {
            !self.is_splitter_special_case()
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
        !self.should_integrate_belt_segment(scan_pos - rev_multiplier, true)
    }

    /// Scans a belt segment starting at [start_pos], to determine if we should integrate it.
    /// Returns true if we should integrate the belt segment (i.e., NOT underground over it).
    fn should_integrate_belt_segment(
        &self,
        start_pos: i32,
        segment_belt_direction_matches: bool,
    ) -> bool {
        let Some(max_underground_position) = self.max_underground_position() else {
            // If we can't create an underground, integrate it.
            return true;
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
                        return false;
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
                    return segment_belt_direction_matches;
                }
            }
            scan_pos += rev_multiplier;
        }
        true
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
