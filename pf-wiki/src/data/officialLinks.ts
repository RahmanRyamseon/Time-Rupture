export type OfficialLink = {
  title: string;
  url: string;
  description: string;
};

export const OFFICIAL_LINKS: OfficialLink[] = [
  {
    title: "EPFO Member Unified Portal",
    url: "https://unifiedportal-mem.epfindia.gov.in/",
    description: "Log in with your UAN to view your passbook, file claims, update KYC and nominations, and track claim status.",
  },
  {
    title: "EPFO Employer Portal",
    url: "https://unifiedportal-emp.epfindia.gov.in/",
    description: "Where employers approve KYC, file ECRs, and process Joint Declarations — hand this link to HR when you need their action.",
  },
  {
    title: "EPFO Corporate Website",
    url: "https://www.epfindia.gov.in/",
    description: "Official EPFO circulars, downloadable forms, regional office locator, and scheme rules.",
  },
  {
    title: "EPFiGMS — Grievance Management System",
    url: "https://epfigms.gov.in/",
    description: "File a formal grievance against EPFO or an employer. Free, and the standard escalation path when self-service steps don't work.",
  },
  {
    title: "DPG — Directorate of Public Grievances",
    url: "https://dpg.gov.in/",
    description: "A separate central-government grievance portal, worth trying in parallel with EPFiGMS — several claimants report it moving stuck EPFO cases faster during the 2026 EPFO 3.0 migration backlog.",
  },
  {
    title: "UMANG App",
    url: "https://web.umang.gov.in/",
    description: "Government app with EPFO services, including UAN activation via face authentication when SMS OTP isn't working.",
  },
];
