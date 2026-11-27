import { MilestonePlaceholder } from "@/components/shared/milestone-placeholder";

export default function ImportsPlaceholder() {
  return (
    <MilestonePlaceholder
      title="MSBTE Portal Importers (4 Sources)"
      milestone="Milestone 2: Masters & Imports"
      description="Upload or paste tables from MSBTE portals with reusable column-mapping templates and zero silent row drops."
      features={[
        "1. Exam Center-wise Time Table",
        "2. Question Paper Inventory (DC & EC codes)",
        "3. Seating Arrangement / Candidate list",
        "4. Theory Marksheets inventory",
      ]}
    />
  );
}
