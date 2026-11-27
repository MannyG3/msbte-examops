import { MilestonePlaceholder } from "@/components/shared/milestone-placeholder";

export default function ReportsPlaceholder() {
  return (
    <MilestonePlaceholder
      title="Official MSBTE Report Pack"
      milestone="Milestone 4 & 5: Pre-Exam & Post-Exam Reports"
      description="Template-driven A4 HTML/CSS-to-PDF and Excel exports for all 14+ MSBTE exam centre reports."
      features={[
        "Bench Arrangement, Gate Chart, Attendance (Section I/II), Supervisor Report",
        "Annexure F/G/H, Format-03, Packing Slips, Format 7/8, QP Record",
        "Merged bulk PDF per session & Excel export",
      ]}
    />
  );
}
