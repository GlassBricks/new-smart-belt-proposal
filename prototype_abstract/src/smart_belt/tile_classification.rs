use crate::Direction;
use crate::belts::{Belt, BeltConnectableEnum, BeltTier, LoaderLike, Splitter, UndergroundBelt};
use std::fmt::Debug;

use super::{DragWorldView, drag::DragDirection};

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
    can_enter_next_tile: bool,
    underground_input_pos: Option<i32>,
    last_position: i32,
}

impl<'a> TileClassifier<'a> {
    pub(super) fn new(
        world_view: DragWorldView<'a>,
        tier: BeltTier,
        can_enter_next_tile: bool,
        underground_input_pos: Option<i32>,
        last_position: i32,
    ) -> Self {
        Self {
            world_view,
            tier,
            can_enter_next_tile,
            underground_input_pos,
            last_position,
        }
    }

    fn drag_direction(&self) -> DragDirection {
        self.world_view.direction
    }
    pub fn direction_multiplier(&self) -> i32 {
        self.drag_direction().direction_multiplier()
    }
    fn next_position(&self) -> i32 {
        self.last_position + self.direction_multiplier()
    }
    fn ray_direction(&self) -> Direction {
        self.world_view.ray_direction()
    }
    fn belt_direction(&self) -> Direction {
        self.world_view.belt_direction()
    }
    fn is_perpendicular(&self, direction: Direction) -> bool {
        direction.axis() != self.ray_direction().axis()
    }

    /// A few principles this follows:
    /// - If we integrate, the belt segment must be able to continue. If we cannot continue the belt segment, we must fail.
    /// - If the last tile was a belt we integrated, and it connects to this entity, we must (try) to integrate this, or fail.
    /// - If the last tile was a obstacle, and it connects to this entity, we treat this as an obstacle.
    ///    - Note: underground belt creation checking (for too-long, bad entities) is handled elsewhere
    /// - In cases we have a choice if we integrate or not; scan the belt segment ahead (if appropriate)
    ///   - Entering a splitter that wasn't previously entered is currently treated as a decision point.
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

    fn classify_curved_belt(&self) -> TileType {
        if self.is_connected_to_previous_integrated_belt() {
            // If we are connected to the previous belt, we must try to
            // integrate it. However, we aren't allowed to rotate existing belt;
            // so this is impassable (ends the belt segment)
            TileType::ImpassableObstacle
        } else {
            // Other curved belts are normal obstacles.
            TileType::Obstacle
        }
    }

    fn classify_straight_belt(&self, belt: &Belt) -> TileType {
        if self.is_perpendicular(belt.direction) || self.is_connected_to_previous_belt_as_obstacle()
        {
            // - Perpendicular belts are obstacles
            // - Belts connected to obstacles are obstacles
            TileType::Obstacle
        } else if belt.direction == self.belt_direction()
            || self.is_connected_to_previous_integrated_belt()
            || self.should_integrate_belt_segment(false, false)
        {
            // - A forwards belt means we're running "directly" into a new belt
            //   segment. _always_ use this, even if it leads to a dead end later.
            // - If we've integrated the last (backwards) belt, then integrate
            //   this too. (even if this leads to a dead end later)
            // - Otherwise, check the belt segment. We might want to underground over it.
            TileType::Usable
        } else {
            TileType::Obstacle
        }
    }

    fn classify_underground(&self, ug: &UndergroundBelt) -> TileType {
        if self.is_perpendicular(ug.direction) || self.is_connected_to_previous_belt_as_obstacle() {
            // - Perpendicular undergrounds are obstacles.
            // - Undergrounds connected to obstacles are obstacles.
            TileType::Obstacle
        } else if let Some(output_pos) = self.world_view.get_ug_pair_pos(self.next_position(), ug) {
            self.classify_paired_underground_belt(ug, output_pos)
        } else {
            self.classify_unpaired_underground_belt(ug)
        }
    }

    fn classify_paired_underground_belt(&self, ug: &UndergroundBelt, output_pos: i32) -> TileType {
        if self.ug_is_enterable(ug) && self.can_enter_next_tile {
            // Enter, it it has the correct shape, and we can enter it (not traversing an obstacle)
            // Note, underground upgrade checking is handled elsewhere
            TileType::IntegratedUnderground { output_pos }
        } else {
            TileType::Obstacle
        }
    }

    fn classify_unpaired_underground_belt(&self, ug: &UndergroundBelt) -> TileType {
        if self.ug_is_enterable(ug) {
            // If the unpaired underground is enterable, it is always usable (fast-replaced with belt).
            // We don't need to check if last_state.can_enter_next_tile, since this tile might be replaced with an output underground.
            // Note: this also covers the "is_connected_to_previous_integrated_belt" case
            TileType::Usable
        } else {
            // We're running into the back of an unpaired underground.
            // Check the belt segment, we might want to underground over it.
            // Additional check: we can't ug over another ug of the same tier, so always integrate that.
            if ug.tier == self.tier || {
                let this = &self;
                this.should_integrate_belt_segment(ug.direction == this.belt_direction(), false)
            } {
                TileType::Usable
            } else {
                TileType::Obstacle
            }
        }
    }

    fn ug_is_enterable(&self, ug: &UndergroundBelt) -> bool {
        self.ray_direction() == ug.shape_direction().opposite()
    }

    fn classify_splitter(&self, splitter: &Splitter) -> TileType {
        // Only splitters in the correct direction are usable
        let splitter_direction_matches = self.belt_direction() == splitter.direction;
        if self.is_connected_to_previous_integrated_belt() {
            // If we are connected to the previous belt, we must try to integrate this splitter.
            if splitter_direction_matches {
                TileType::IntegratedSplitter
            } else {
                // Wrong direction -- we're about to break the belt segment
                TileType::ImpassableObstacle
            }
        } else if !(splitter_direction_matches && self.can_enter_next_tile) {
            // - Unenterable splitters are obstacles
            TileType::Obstacle
        } else {
            // We are entering a splitter that previously didn't have an input.
            // Check the belt segment, we might want to underground over it.
            if self.should_integrate_belt_segment(true, true) {
                TileType::IntegratedSplitter
            } else {
                TileType::Obstacle
            }
        }
    }

    fn classify_loader(&self, loader: &LoaderLike) -> TileType {
        // If we directly run into the loader, it ends the belt segment (so is impassable)
        // Otherwise, it's an obstacle
        if self.belt_connects_into_loader(loader) {
            TileType::ImpassableObstacle
        } else {
            TileType::Obstacle
        }
    }

    fn belt_connects_into_loader(&self, loader: &LoaderLike) -> bool {
        loader.shape_direction() == self.ray_direction().opposite()
            && loader.is_input == (self.drag_direction() == DragDirection::Forward)
    }

    fn is_connected_to_previous_belt_as_obstacle(&self) -> bool {
        !self.can_enter_next_tile
            && self
                .world_view
                .is_belt_connected_to_previous_tile(self.next_position())
    }

    fn is_connected_to_previous_integrated_belt(&self) -> bool {
        self.can_enter_next_tile
            && self
                .world_view
                .is_belt_connected_to_previous_tile(self.next_position())
    }

    /// Scans a belt segment to determine if we should integrate it.
    /// We DO NOT integrate if:
    /// - There's something that would fail the integration, and
    /// - We can successfully underground over the entire segment
    ///   (not checking for tiles _after_ the belt segment)
    ///
    /// Note: we only need to scan up to the maximum underground-able distance; if the belt segment goes
    ///       beyond that, we can't underground over it; so default to integrating it.
    ///
    /// skip_initial_splitters only used for splitter checks; so multiple splitters in a row are treated as one.
    fn should_integrate_belt_segment(
        &self,
        segment_belt_direction_matches: bool,
        skip_initial_splitters: bool,
    ) -> bool {
        let Some(max_underground_position) = self.max_underground_position() else {
            // If we can't create an underground, integrate it.
            return true;
        };

        let direction_multiplier = self.direction_multiplier();
        let start_pos = self.next_position();
        // Start at the tile in front of the next one.
        let mut scan_pos = start_pos + direction_multiplier;

        if skip_initial_splitters {
            while scan_pos * direction_multiplier < max_underground_position * direction_multiplier
                && let Some(belt_connectable) = self.world_view.get_belt_entity(scan_pos)
                && let BeltConnectableEnum::Splitter(Splitter { direction, .. }) = belt_connectable
                && *direction == self.belt_direction()
            {
                scan_pos += direction_multiplier;
            }
        }

        // Scan the belt segment.
        while scan_pos * direction_multiplier < max_underground_position * direction_multiplier
            && let Some(belt_connectable) = self.world_view.get_belt_entity(scan_pos)
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
                    // - We should always integrate same direction splitters or loaders
                    // - Backwards splitters or loaders would break the belt segment, so we underground over it if we can
                    return segment_belt_direction_matches;
                }
            }
            scan_pos += direction_multiplier;
        }
        // if we found nothing problematic, we can integrate it!
        true
    }

    fn max_underground_position(&self) -> Option<i32> {
        self.underground_input_pos
            .map(|pos| pos + (self.tier.underground_distance as i32) * self.direction_multiplier())
    }
}
