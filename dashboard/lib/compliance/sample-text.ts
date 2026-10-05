/* COMPLIANCE CENTER — the words of the sample programme, so it can be loaded in
 * the member's language (lib/compliance/catalog.ts). Pure data. */

export interface SampleText {
  name: string; orgName: string; industry: string; size: string; country: string; description: string; systems: string; dataTypes: string;
  owners: Record<"ciso" | "eng" | "sre" | "dpo" | "cto", string>; siemNote: string; physicalNa: string;
  risks: { title: string; description: string }[];
  vendors: { name: string; service: string }[];
}

export const SAMPLE_EN: SampleText = {
  name: "Sample: 60-person B2B SaaS", orgName: "Nusantara Cloud (sample)", industry: "B2B SaaS — HR software", size: "60 employees", country: "Indonesia, customers in the EU",
  description: "Multi-tenant HR platform hosted on AWS (ap-southeast-3). Customers are mid-size companies in Indonesia and the EU.",
  systems: "AWS (EKS, RDS PostgreSQL, S3), Google Workspace, GitHub, Okta, Slack, Jira",
  dataTypes: "Employee personal data incl. payroll, national ID numbers, bank accounts; some health data (sick leave)",
  owners: { ciso: "CISO", eng: "Head of Engineering", sre: "SRE lead", dpo: "DPO", cto: "CTO" },
  siemNote: "SIEM rollout slipped.",
  physicalNa: "No own premises or data centre: fully remote company on AWS; physical controls inherited from AWS (see AWS SOC 2 report).",
  risks: [
    { title: "Ransomware encrypts production database", description: "Compromised admin credentials used to encrypt RDS snapshots." },
    { title: "Payroll data exposed through misconfigured S3 bucket", description: "Public bucket or over-broad IAM policy." },
    { title: "Breach not reported within 3 × 24 hours (UU PDP)", description: "No tested breach-notification procedure." },
    { title: "Key engineer leaves; single point of knowledge", description: "" },
  ],
  vendors: [{ name: "Amazon Web Services", service: "Hosting (EKS, RDS, S3)" }, { name: "PayrollConnect (sample)", service: "Payroll file transfer" }],
};
