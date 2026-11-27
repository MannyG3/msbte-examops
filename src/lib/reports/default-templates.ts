export const DEFAULT_REPORT_TEMPLATES: Record<string, { title: string; html: string; css: string }> = {
  ANNEXURE_F: {
    title: "Annexure F — Centre Readiness & Undertaking",
    css: ".msbte-box { border: 1px solid #000; padding: 14px; font-size: 12px; line-height: 1.5; }",
    html: `<div class="msbte-box">
  <h2 style="text-align:center;font-weight:bold;text-transform:uppercase;">MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI</h2>
  <h3 style="text-align:center;font-weight:bold;margin-top:4px;">ANNEXURE - F : EXAMINATION CENTRE READINESS CERTIFICATE</h3>
  <p style="margin-top:12px;"><strong>Exam Centre Code:</strong> {{centreCode}} &nbsp;&nbsp; <strong>Institute:</strong> {{instituteName}}</p>
  <p><strong>Examination Session:</strong> {{sessionName}} &nbsp;&nbsp; <strong>Date:</strong> {{date}}</p>
  <p style="margin-top:14px;">This is to certify that all examination blocks, seating arrangements, CCTV surveillance, strong-room facilities, and invigilation staff duties have been verified and are ready as per MSBTE norms for the {{sessionName}} examination.</p>
  <div style="display:flex;justify-content:space-between;margin-top:56px;">
    <div>_________________________<br/><strong>Officer In-Charge (Exam)</strong></div>
    <div>_________________________<br/><strong>Principal / Head of Institute</strong></div>
  </div>
</div>`,
  },
  ANNEXURE_G: {
    title: "Annexure G — Strong Room & Question Paper Custody Log",
    css: ".msbte-table { width:100%; border-collapse:collapse; font-size:11px; margin-top:12px; } .msbte-table th, .msbte-table td { border:1px solid #000; padding:6px; }",
    html: `<div>
  <h2 style="text-align:center;font-weight:bold;">MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI</h2>
  <h3 style="text-align:center;font-weight:bold;">ANNEXURE - G : QUESTION PAPER PACKET OPENING & CUSTODY RECORD</h3>
  <p style="margin-top:10px;font-size:12px;"><strong>Centre:</strong> {{centreCode}} - {{instituteName}} | <strong>Session:</strong> {{sessionName}} | <strong>Date:</strong> {{date}}</p>
  <table class="msbte-table">
    <thead><tr><th>Sr.</th><th>Subject Code & Name</th><th>Packet Sealed?</th><th>Time Opened</th><th>Sign of OIC</th><th>Sign of Witness/Supervisor</th></tr></thead>
    <tbody>
      <tr><td style="height:28px;">1</td><td></td><td>Yes / No</td><td></td><td></td><td></td></tr>
      <tr><td style="height:28px;">2</td><td></td><td>Yes / No</td><td></td><td></td><td></td></tr>
      <tr><td style="height:28px;">3</td><td></td><td>Yes / No</td><td></td><td></td><td></td></tr>
      <tr><td style="height:28px;">4</td><td></td><td>Yes / No</td><td></td><td></td><td></td></tr>
    </tbody>
  </table>
</div>`,
  },
  ANNEXURE_H: {
    title: "Annexure H — Confidential Dispatch & Answer Book Summary",
    css: ".msbte-table { width:100%; border-collapse:collapse; font-size:11px; margin-top:12px; } .msbte-table th, .msbte-table td { border:1px solid #000; padding:6px; }",
    html: `<div>
  <h2 style="text-align:center;font-weight:bold;">MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI</h2>
  <h3 style="text-align:center;font-weight:bold;">ANNEXURE - H : SEALED PARCEL DISPATCH SUMMARY</h3>
  <p style="margin-top:10px;font-size:12px;"><strong>Centre:</strong> {{centreCode}} - {{instituteName}} | <strong>Session:</strong> {{sessionName}} | <strong>Date:</strong> {{date}}</p>
  <table class="msbte-table">
    <thead><tr><th>Sr.</th><th>Course / Subject</th><th>Total Present</th><th>No. of Parcels</th><th>RAC / RBTE Destination</th><th>Remark</th></tr></thead>
    <tbody>
      <tr><td style="height:28px;">1</td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td style="height:28px;">2</td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td style="height:28px;">3</td><td></td><td></td><td></td><td></td><td></td></tr>
    </tbody>
  </table>
  <div style="display:flex;justify-content:space-between;margin-top:48px;font-size:12px;">
    <div>_________________________<br/><strong>Controller / Clerk</strong></div>
    <div>_________________________<br/><strong>Officer In-Charge</strong></div>
  </div>
</div>`,
  },
  FORMAT_03: {
    title: "Format-03 — Candidate Undertaking (Without Hall Ticket / ID)",
    css: ".msbte-box { border: 1px solid #000; padding: 16px; font-size: 12px; line-height: 1.7; }",
    html: `<div class="msbte-box">
  <h2 style="text-align:center;font-weight:bold;">MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI</h2>
  <h3 style="text-align:center;font-weight:bold;">FORMAT - 03 : UNDERTAKING BY CANDIDATE APPEARING WITHOUT HALL TICKET / IDENTITY CARD</h3>
  <p style="margin-top:12px;"><strong>Exam Centre:</strong> {{centreCode}} - {{instituteName}} &nbsp;&nbsp; <strong>Session:</strong> {{sessionName}} &nbsp;&nbsp; <strong>Date:</strong> {{date}}</p>
  <p style="margin-top:12px;">I, Shri/Kum. ______________________________________________________, Seat No.: ________________, Enrollment No.: ____________________, Course/Sem: ______________, hereby state that I have forgotten / lost my Hall Ticket / College Identity Card today.</p>
  <p>I request permission to appear for today's paper (Subject Code: __________). I undertake to produce the valid Hall Ticket / ID Card before the Officer In-Charge by the next examination day, failing which my examination performance may be withheld/cancelled as per MSBTE rules.</p>
  <div style="display:flex;justify-content:space-between;margin-top:48px;">
    <div>_________________________<br/><strong>Signature of Candidate</strong><br/>Mobile: ___________________</div>
    <div>_________________________<br/><strong>Verified by Supervisor</strong></div>
    <div>_________________________<br/><strong>Officer In-Charge</strong></div>
  </div>
</div>`,
  },
};
