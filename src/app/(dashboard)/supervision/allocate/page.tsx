import { MilestonePlaceholder } from "@/components/shared/milestone-placeholder";

export default function SupervisionPlaceholder() {
  return (
    <MilestonePlaceholder
      title="Fair Supervisor Allocation"
      milestone="Milestone 4: Supervisors & Pre-Exam Pack"
      description="Allocate junior supervisors, relievers, and senior supervisors fairly while avoiding own-subject and back-to-back M/A duties."
      features={[
        "1 junior supervisor per block + relievers + senior supervisors",
        "Full-session duty chart, individual letters, and swap requests",
      ]}
    />
  );
}
