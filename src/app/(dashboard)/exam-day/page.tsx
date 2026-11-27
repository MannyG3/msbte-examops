import { MilestonePlaceholder } from "@/components/shared/milestone-placeholder";

export default function ExamDayPlaceholder() {
  return (
    <MilestonePlaceholder
      title="Exam Day Console"
      milestone="Milestone 5: Exam Day & Post-Exam Pack"
      description="Tap-to-mark absentees block-wise on phone or laptop, log copy cases, early leaving, supplements, and lock the session."
      features={[
        "Live block submission grid for Officer In-Charge",
        "Tap-to-mark Absent, Copy Case (UFM), and Early Leaving",
        "Unlocks post-absentee reports once all blocks submit",
      ]}
    />
  );
}
