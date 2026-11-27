import { MilestonePlaceholder } from "@/components/shared/milestone-placeholder";

export default function ComparisonPlaceholder() {
  return (
    <MilestonePlaceholder
      title="Student Count Comparison (QP Inventory vs Seating)"
      milestone="Milestone 2: Masters & Imports"
      description="Compare portal QP inventory counts against seating candidate counts per paper to flag potential question paper shortages."
      features={[
        "Flags any paper where QP inventory < seating candidate count",
        "Highlights late exam form confirmations before exam day",
      ]}
    />
  );
}
