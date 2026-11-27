import { MilestonePlaceholder } from "@/components/shared/milestone-placeholder";

export default function SubjectsPlaceholder() {
  return (
    <MilestonePlaceholder
      title="Subjects & Schemes (K / I)"
      milestone="Milestone 2: Masters & Imports"
      description="Manage K-scheme (6-digit) and I-scheme (5-digit) subjects, abbreviations, and the Section I/II two-answer-book flag."
      features={[
        "Multi-scheme support (K, I, and future schemes)",
        "Per-subject Section I & II flag (2 main answer books & separate attendance reports)",
      ]}
    />
  );
}
