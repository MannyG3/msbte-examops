import { MilestonePlaceholder } from "@/components/shared/milestone-placeholder";

export default function StaffPlaceholder() {
  return (
    <MilestonePlaceholder
      title="Staff & Invigilator Master"
      milestone="Milestone 2: Masters & Imports"
      description="Manage teaching faculty, lab assistants, and peons with subjects taught, max duties per session, and unavailable dates."
      features={[
        "Teaching, Lab Assistant, and Peon categories",
        "Subjects taught mapping for self-subject conflict avoidance",
        "Max duties and unavailable dates per session",
      ]}
    />
  );
}
