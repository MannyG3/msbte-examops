import { MilestonePlaceholder } from "@/components/shared/milestone-placeholder";

export default function BenchArrangementPlaceholder() {
  return (
    <MilestonePlaceholder
      title="Bench Arrangement Generator (Serpentine)"
      milestone="Milestone 3: Bench Arrangement"
      description="Generate MSBTE-exact A4 Bench Arrangement sheets with serpentine column numbering, drag-and-drop tweaks, and block locking."
      features={[
        "Exact MSBTE Section 3 A4 Bench Arrangement layout",
        "Serpentine numbering (Col 1 top-down, Col 2 bottom-up)",
        "Drag-and-drop between blocks, block locking, and bulk session PDF",
      ]}
    />
  );
}
