pub mod belts;
pub mod entity;
pub mod geometry;
pub mod smart_belt;
pub mod test;
pub mod world;

pub use belts::*;
pub use entity::*;
pub use geometry::*;
pub use world::*;

macro_rules! note {
    ($($arg:tt)*) => {
        eprintln!("Note: {}", format_args!($($arg)*));
    };
}
pub(crate) use note;
