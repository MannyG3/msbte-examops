import { MilestonePlaceholder } from "@/components/shared/milestone-placeholder";

export default function RoomsBlocksPlaceholder() {
  return (
    <MilestonePlaceholder
      title="Rooms & Blocks Master"
      milestone="Milestone 2: Masters & Imports"
      description="Configure physical rooms (e.g. F-11) and numbered seating blocks (Block NO: 8) with columns × column break and serpentine/straight numbering."
      features={[
        "Separate Block NO and physical Room No fields",
        "Configurable columns × column break (e.g. 4 × 9 = 36 strength)",
        "Serpentine bench numbering (default) or Straight numbering",
      ]}
    />
  );
}
