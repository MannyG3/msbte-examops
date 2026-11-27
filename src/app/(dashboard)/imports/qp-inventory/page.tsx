import { MsbteImporter } from "@/components/imports/msbte-importer";

export default function QpInventoryImportPage() {
  return (
    <MsbteImporter
      sourceType="QP_INVENTORY"
      title="2. Question Paper Inventory Importer"
      description="Import QP Inventory from Institute Login → Upload Seating Arrangement (retains DC and EC codes)."
      fields={[
        { key: "dcCode", label: "DC Code", required: false, aliases: ["dc", "dccode", "distribution"] },
        { key: "ecCode", label: "EC Code", required: false, aliases: ["ec", "eccode", "examcentre"] },
        { key: "subjectCode", label: "Subject Code", required: true, aliases: ["subjectcode", "subcode", "code"] },
        { key: "csm", label: "C-S-M", required: false, aliases: ["csm", "course", "scheme"] },
        { key: "qpCount", label: "QP Inventory Count", required: true, aliases: ["qpcount", "count", "qty", "candidates"] },
      ]}
      sampleCsv={`DC_Code,EC_Code,Subject_Code,C-S-M,QP_Count
DC-12,9999,313303,CO-3-K,60
DC-12,9999,315319,CO-5-K,55`}
    />
  );
}
