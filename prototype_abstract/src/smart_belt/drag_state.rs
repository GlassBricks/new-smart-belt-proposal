use crate::Impassable;
use crate::smart_belt::DragStepResult;

use super::{LineDrag, action::Error};

pub trait DragState: Clone + std::fmt::Debug {
    fn initial_state(successful_placement: bool) -> Self;
    fn step(&self, ctx: &LineDrag<Self>, is_forward: bool) -> DragStepResult<Self>;
    fn deferred_error(&self) -> Option<Error>;
}

impl<'a, S: DragState> LineDrag<'a, S> {
    pub(super) fn can_build_underground(
        &self,
        input_pos: i32,
        is_forward: bool,
        is_extension: bool,
    ) -> Result<(), Error> {
        let output_pos = self.next_position(is_forward);
        let distance = output_pos.abs_diff(input_pos);
        if distance > self.tier.underground_distance.into() {
            return Err(Error::TooFarToConnect);
        }
        let start_pos = if !is_extension {
            input_pos
        } else {
            self.last_position
        };
        let check_pos = |pos| {
            let entity = self.world.get(self.ray.get_position(pos));
            if let Some(entity) = entity {
                if entity.as_any().is::<Impassable>() {
                    return Err(Error::CannotTraversePastTile);
                }
                if let Some(ug) = entity.as_underground_belt()
                    && ug.direction.axis() == self.ray.direction.axis()
                    && ug.tier == self.tier
                {
                    return Err(Error::CannotTraversePastEntity);
                }
            }
            Ok(())
        };
        if is_forward {
            for pos in start_pos + 1..=output_pos - 1 {
                check_pos(pos)?;
            }
        } else {
            for pos in (output_pos + 1..=start_pos).rev() {
                check_pos(pos)?;
            }
        }

        Ok(())
    }

    pub(super) fn can_upgrade_underground(&self, is_forward: bool, output_pos: i32) -> bool {
        let input_pos = self.next_position(is_forward);
        if output_pos.abs_diff(input_pos) > self.tier.underground_distance as u32 {
            return false;
        }

        let between_range = if is_forward {
            input_pos + 1..=output_pos - 1
        } else {
            output_pos + 1..=input_pos - 1
        };

        !between_range.into_iter().any(|pos| {
            self.world
                .get(self.ray.get_position(pos))
                .and_then(|e| e.as_underground_belt())
                .is_some_and(|e| {
                    e.tier == self.tier && e.direction.axis() == self.ray.direction.axis()
                })
        })
    }
}
