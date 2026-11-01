/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * SECURITY ANALYST v4 — MITRE ATT&CK (Enterprise) tactics, a catalogue of the
 * techniques analysts meet most, and behaviour rules that map evidence (command
 * lines, event IDs, log messages, cloud API calls) to techniques. Pure: runs in
 * the browser on the member's evidence, before and without any AI call.
 * ============================================================================ */

export interface Tactic { id: string; name: string; short: string }
export const TACTICS: Tactic[] = [
  { id: "TA0043", name: "Reconnaissance", short: "recon" },
  { id: "TA0042", name: "Resource Development", short: "resource" },
  { id: "TA0001", name: "Initial Access", short: "initial" },
  { id: "TA0002", name: "Execution", short: "exec" },
  { id: "TA0003", name: "Persistence", short: "persist" },
  { id: "TA0004", name: "Privilege Escalation", short: "privesc" },
  { id: "TA0005", name: "Defense Evasion", short: "evasion" },
  { id: "TA0006", name: "Credential Access", short: "creds" },
  { id: "TA0007", name: "Discovery", short: "discovery" },
  { id: "TA0008", name: "Lateral Movement", short: "lateral" },
  { id: "TA0009", name: "Collection", short: "collection" },
  { id: "TA0011", name: "Command and Control", short: "c2" },
  { id: "TA0010", name: "Exfiltration", short: "exfil" },
  { id: "TA0040", name: "Impact", short: "impact" },
];

export interface Technique { id: string; name: string; tactics: string[] }
const T = (id: string, name: string, ...tactics: string[]): Technique => ({ id, name, tactics });
export const TECHNIQUES: Technique[] = [
  T("T1595", "Active Scanning", "TA0043"), T("T1592", "Gather Victim Host Information", "TA0043"), T("T1589", "Gather Victim Identity Information", "TA0043"), T("T1598", "Phishing for Information", "TA0043"),
  T("T1583", "Acquire Infrastructure", "TA0042"), T("T1584", "Compromise Infrastructure", "TA0042"), T("T1587", "Develop Capabilities", "TA0042"), T("T1588", "Obtain Capabilities", "TA0042"), T("T1608", "Stage Capabilities", "TA0042"),
  T("T1566", "Phishing", "TA0001"), T("T1566.001", "Spearphishing Attachment", "TA0001"), T("T1566.002", "Spearphishing Link", "TA0001"), T("T1190", "Exploit Public-Facing Application", "TA0001"),
  T("T1133", "External Remote Services", "TA0001", "TA0003"), T("T1078", "Valid Accounts", "TA0001", "TA0003", "TA0004", "TA0005"), T("T1078.004", "Cloud Accounts", "TA0001", "TA0003", "TA0004", "TA0005"),
  T("T1189", "Drive-by Compromise", "TA0001"), T("T1195", "Supply Chain Compromise", "TA0001"), T("T1091", "Replication Through Removable Media", "TA0001", "TA0008"),
  T("T1059", "Command and Scripting Interpreter", "TA0002"), T("T1059.001", "PowerShell", "TA0002"), T("T1059.003", "Windows Command Shell", "TA0002"), T("T1059.004", "Unix Shell", "TA0002"),
  T("T1059.005", "Visual Basic", "TA0002"), T("T1059.006", "Python", "TA0002"), T("T1059.007", "JavaScript", "TA0002"), T("T1047", "Windows Management Instrumentation", "TA0002"),
  T("T1053", "Scheduled Task/Job", "TA0002", "TA0003", "TA0004"), T("T1053.003", "Cron", "TA0002", "TA0003", "TA0004"), T("T1053.005", "Scheduled Task", "TA0002", "TA0003", "TA0004"),
  T("T1204", "User Execution", "TA0002"), T("T1204.002", "Malicious File", "TA0002"), T("T1569.002", "Service Execution", "TA0002"), T("T1203", "Exploitation for Client Execution", "TA0002"),
  T("T1547.001", "Registry Run Keys / Startup Folder", "TA0003", "TA0004"), T("T1543.003", "Windows Service", "TA0003", "TA0004"), T("T1136", "Create Account", "TA0003"), T("T1136.001", "Local Account", "TA0003"),
  T("T1098", "Account Manipulation", "TA0003", "TA0004"), T("T1098.001", "Additional Cloud Credentials", "TA0003", "TA0004"), T("T1505.003", "Web Shell", "TA0003"), T("T1546.003", "WMI Event Subscription", "TA0003", "TA0004"),
  T("T1137", "Office Application Startup", "TA0003"), T("T1574.002", "DLL Side-Loading", "TA0003", "TA0004", "TA0005"),
  T("T1548", "Abuse Elevation Control Mechanism", "TA0004", "TA0005"), T("T1548.002", "Bypass User Account Control", "TA0004", "TA0005"), T("T1548.003", "Sudo and Sudo Caching", "TA0004", "TA0005"),
  T("T1068", "Exploitation for Privilege Escalation", "TA0004"), T("T1134", "Access Token Manipulation", "TA0004", "TA0005"), T("T1055", "Process Injection", "TA0004", "TA0005"),
  T("T1027", "Obfuscated Files or Information", "TA0005"), T("T1140", "Deobfuscate/Decode Files or Information", "TA0005"), T("T1070", "Indicator Removal", "TA0005"), T("T1070.001", "Clear Windows Event Logs", "TA0005"),
  T("T1070.004", "File Deletion", "TA0005"), T("T1562", "Impair Defenses", "TA0005"), T("T1562.001", "Disable or Modify Tools", "TA0005"), T("T1562.008", "Disable or Modify Cloud Logs", "TA0005"),
  T("T1218", "System Binary Proxy Execution", "TA0005"), T("T1218.005", "Mshta", "TA0005"), T("T1218.010", "Regsvr32", "TA0005"), T("T1218.011", "Rundll32", "TA0005"),
  T("T1036", "Masquerading", "TA0005"), T("T1112", "Modify Registry", "TA0005"), T("T1197", "BITS Jobs", "TA0003", "TA0005"), T("T1564", "Hide Artifacts", "TA0005"), T("T1497", "Virtualization/Sandbox Evasion", "TA0005", "TA0007"),
  T("T1003", "OS Credential Dumping", "TA0006"), T("T1003.001", "LSASS Memory", "TA0006"), T("T1003.002", "Security Account Manager", "TA0006"), T("T1003.003", "NTDS", "TA0006"),
  T("T1003.008", "/etc/passwd and /etc/shadow", "TA0006"), T("T1110", "Brute Force", "TA0006"), T("T1110.001", "Password Guessing", "TA0006"), T("T1110.003", "Password Spraying", "TA0006"),
  T("T1555", "Credentials from Password Stores", "TA0006"), T("T1552", "Unsecured Credentials", "TA0006"), T("T1558.003", "Kerberoasting", "TA0006"), T("T1056.001", "Keylogging", "TA0006", "TA0009"),
  T("T1621", "Multi-Factor Authentication Request Generation", "TA0006"),
  T("T1033", "System Owner/User Discovery", "TA0007"), T("T1082", "System Information Discovery", "TA0007"), T("T1083", "File and Directory Discovery", "TA0007"), T("T1087", "Account Discovery", "TA0007"),
  T("T1016", "System Network Configuration Discovery", "TA0007"), T("T1049", "System Network Connections Discovery", "TA0007"), T("T1057", "Process Discovery", "TA0007"), T("T1018", "Remote System Discovery", "TA0007"),
  T("T1482", "Domain Trust Discovery", "TA0007"), T("T1069", "Permission Groups Discovery", "TA0007"), T("T1046", "Network Service Discovery", "TA0007"), T("T1135", "Network Share Discovery", "TA0007"),
  T("T1518.001", "Security Software Discovery", "TA0007"),
  T("T1021", "Remote Services", "TA0008"), T("T1021.001", "Remote Desktop Protocol", "TA0008"), T("T1021.002", "SMB/Windows Admin Shares", "TA0008"), T("T1021.004", "SSH", "TA0008"),
  T("T1021.006", "Windows Remote Management", "TA0008"), T("T1570", "Lateral Tool Transfer", "TA0008"), T("T1550.002", "Pass the Hash", "TA0005", "TA0008"),
  T("T1560", "Archive Collected Data", "TA0009"), T("T1005", "Data from Local System", "TA0009"), T("T1114", "Email Collection", "TA0009"), T("T1113", "Screen Capture", "TA0009"),
  T("T1115", "Clipboard Data", "TA0009"), T("T1530", "Data from Cloud Storage", "TA0009"), T("T1119", "Automated Collection", "TA0009"),
  T("T1071", "Application Layer Protocol", "TA0011"), T("T1071.001", "Web Protocols", "TA0011"), T("T1071.004", "DNS", "TA0011"), T("T1105", "Ingress Tool Transfer", "TA0011"),
  T("T1090", "Proxy", "TA0011"), T("T1572", "Protocol Tunneling", "TA0011"), T("T1573", "Encrypted Channel", "TA0011"), T("T1219", "Remote Access Software", "TA0011"),
  T("T1568.002", "Domain Generation Algorithms", "TA0011"), T("T1102", "Web Service", "TA0011"), T("T1132", "Data Encoding", "TA0011"),
  T("T1041", "Exfiltration Over C2 Channel", "TA0010"), T("T1048", "Exfiltration Over Alternative Protocol", "TA0010"), T("T1567", "Exfiltration Over Web Service", "TA0010"),
  T("T1567.002", "Exfiltration to Cloud Storage", "TA0010"), T("T1020", "Automated Exfiltration", "TA0010"), T("T1029", "Scheduled Transfer", "TA0010"),
  T("T1486", "Data Encrypted for Impact", "TA0040"), T("T1490", "Inhibit System Recovery", "TA0040"), T("T1489", "Service Stop", "TA0040"), T("T1485", "Data Destruction", "TA0040"),
  T("T1491", "Defacement", "TA0040"), T("T1498", "Network Denial of Service", "TA0040"), T("T1496", "Resource Hijacking", "TA0040"), T("T1531", "Account Access Removal", "TA0040"),
];
const byId = new Map(TECHNIQUES.map((t) => [t.id, t]));
export const technique = (id: string) => byId.get(id) || byId.get(id.split(".")[0]);
export const attackUrl = (id: string) => `https://attack.mitre.org/techniques/${id.replace(".", "/")}/`;
/** The tactic a (sub-)technique is shown under first. */
export const primaryTactic = (id: string) => technique(id)?.tactics[0] || "";

export type Severity = "info" | "low" | "medium" | "high" | "critical";
export const SEVERITIES: Severity[] = ["info", "low", "medium", "high", "critical"];
export const sevRank = (s: Severity) => SEVERITIES.indexOf(s);

export interface Rule { id: string; title: string; techniques: string[]; severity: Severity; re: RegExp }
/** Behaviour rules over one event's text (message + command line + fields). */
export const RULES: Rule[] = [
  { id: "ps-encoded", title: "Encoded PowerShell command", techniques: ["T1059.001", "T1027"], severity: "high", re: /powershell(?:\.exe)?\b[^\n]{0,200}\s[-/](?:e|ec|en|enc|enco|encod|encode|encodedcommand)\s+[A-Za-z0-9+/=]{16,}/i },
  { id: "ps-download", title: "PowerShell download cradle", techniques: ["T1059.001", "T1105"], severity: "high", re: /(?:powershell|pwsh)[^\n]{0,300}(?:downloadstring|downloadfile|net\.webclient|invoke-webrequest|\biwr\b|start-bitstransfer)|\biex\s*\(\s*(?:new-object|\(new-object)/i },
  { id: "ps-bypass", title: "PowerShell execution-policy bypass / hidden window", techniques: ["T1059.001"], severity: "medium", re: /powershell[^\n]{0,200}(?:-exec(?:utionpolicy)?\s+bypass|-w(?:indowstyle)?\s+hid(?:den)?|-nop\b)/i },
  { id: "certutil", title: "certutil used to download or decode", techniques: ["T1105", "T1140"], severity: "high", re: /certutil(?:\.exe)?\b[^\n]{0,200}(?:-urlcache|-decode|-encode|-verifyctl)/i },
  { id: "bitsadmin", title: "BITS job transfer", techniques: ["T1197", "T1105"], severity: "medium", re: /bitsadmin(?:\.exe)?\b[^\n]{0,100}\/(?:transfer|addfile)/i },
  { id: "shadow-delete", title: "Shadow copies / recovery disabled", techniques: ["T1490"], severity: "critical", re: /vssadmin(?:\.exe)?\b[^\n]{0,60}delete\s+shadows|wmic(?:\.exe)?\b[^\n]{0,60}shadowcopy\s+delete|bcdedit(?:\.exe)?\b[^\n]{0,80}recoveryenabled\s+no|wbadmin(?:\.exe)?\b[^\n]{0,60}delete\s+(?:catalog|systemstatebackup)/i },
  { id: "lsass", title: "LSASS credential dumping", techniques: ["T1003.001"], severity: "critical", re: /mimikatz|sekurlsa::|procdump(?:64)?(?:\.exe)?\b[^\n]{0,80}lsass|comsvcs(?:\.dll)?[^\n]{0,60}minidump|lsass(?:\.exe)?[^\n]{0,40}\.dmp/i },
  { id: "sam-dump", title: "SAM / SYSTEM hive saved", techniques: ["T1003.002"], severity: "high", re: /reg(?:\.exe)?\s+save\s+hklm\\(?:sam|system|security)\b/i },
  { id: "ntds", title: "NTDS.dit access", techniques: ["T1003.003"], severity: "critical", re: /ntdsutil|ntds\.dit|vssadmin[^\n]{0,40}create\s+shadow/i },
  { id: "shadow-file", title: "Linux shadow file access", techniques: ["T1003.008"], severity: "high", re: /\/etc\/shadow\b|\bunshadow\b/i },
  { id: "kerberoast", title: "Kerberoasting tooling", techniques: ["T1558.003"], severity: "high", re: /invoke-kerberoast|rubeus(?:\.exe)?\b[^\n]{0,40}kerberoast|GetUserSPNs/i },
  { id: "schtasks", title: "Scheduled task created", techniques: ["T1053.005"], severity: "medium", re: /schtasks(?:\.exe)?\b[^\n]{0,40}\/create|Register-ScheduledTask|event\s*id[:= ]*4698\b/i },
  { id: "cron", title: "Cron job modified", techniques: ["T1053.003"], severity: "medium", re: /crontab\s+-[el]?[^\n]{0,10}|\/etc\/cron\.(?:d|daily|hourly)\//i },
  { id: "run-key", title: "Registry Run key persistence", techniques: ["T1547.001", "T1112"], severity: "high", re: /reg(?:\.exe)?\s+add\b[^\n]{0,200}\\currentversion\\run(?:once)?\b|New-ItemProperty[^\n]{0,120}\\CurrentVersion\\Run/i },
  { id: "service-create", title: "Service created", techniques: ["T1543.003", "T1569.002"], severity: "medium", re: /sc(?:\.exe)?\s+create\s+\S+|New-Service\b|event\s*id[:= ]*(?:7045|4697)\b/i },
  { id: "user-add", title: "Local account created", techniques: ["T1136.001"], severity: "high", re: /net1?(?:\.exe)?\s+user\s+\S+\s+\S+\s+\/add|\buseradd\s+\S|\badduser\s+\S|event\s*id[:= ]*4720\b/i },
  { id: "admin-add", title: "Account added to administrators", techniques: ["T1098"], severity: "high", re: /net1?(?:\.exe)?\s+localgroup\s+administrators\s+\S+\s+\/add|usermod\s+-aG\s+(?:sudo|wheel)|event\s*id[:= ]*(?:4732|4728|4756)\b/i },
  { id: "wmi-exec", title: "WMI process creation", techniques: ["T1047"], severity: "medium", re: /wmic(?:\.exe)?\b[^\n]{0,80}process\s+call\s+create|Invoke-WmiMethod[^\n]{0,80}Win32_Process/i },
  { id: "mshta", title: "mshta proxy execution", techniques: ["T1218.005"], severity: "high", re: /mshta(?:\.exe)?\s+(?:https?:|javascript:|vbscript:|\S+\.hta)/i },
  { id: "regsvr32", title: "regsvr32 scriptlet (Squiblydoo)", techniques: ["T1218.010"], severity: "high", re: /regsvr32(?:\.exe)?\b[^\n]{0,80}(?:\/i:\s*https?:|scrobj\.dll)/i },
  { id: "rundll32", title: "rundll32 with unusual arguments", techniques: ["T1218.011"], severity: "medium", re: /rundll32(?:\.exe)?\s+[^\n]{0,80}(?:javascript:|https?:|\\\\|\.(?:tmp|dat|txt|jpg|png)\b|,#\d+)/i },
  { id: "psexec", title: "PsExec / remote service execution", techniques: ["T1569.002", "T1021.002"], severity: "high", re: /\b(?:psexec|paexec)(?:64)?(?:\.exe)?\b|\\\\[^\s\\]+\\admin\$/i },
  { id: "winrm", title: "WinRM / PowerShell remoting", techniques: ["T1021.006"], severity: "medium", re: /Enter-PSSession|Invoke-Command\s+-ComputerName|winrs(?:\.exe)?\s+-r:/i },
  { id: "clear-logs", title: "Event logs cleared", techniques: ["T1070.001"], severity: "critical", re: /wevtutil(?:\.exe)?\s+(?:cl|clear-log)\b|Clear-EventLog|\baudit log (?:was )?cleared\b|\bEventID=1102\b|event\s*id[:= ]*104\b[^\n]{0,80}clear/i },
  { id: "defender-off", title: "Security tooling disabled", techniques: ["T1562.001"], severity: "high", re: /Set-MpPreference[^\n]{0,80}-Disable\w*\s+(?:\$true|1)|DisableRealtimeMonitoring|sc(?:\.exe)?\s+(?:stop|config|delete)\s+(?:windefend|sense|wdboot|wdfilter)|systemctl\s+(?:stop|disable)\s+(?:auditd|falcon|wazuh|osquery)|setenforce\s+0/i },
  { id: "cloudtrail-off", title: "Cloud audit logging disabled", techniques: ["T1562.008"], severity: "critical", re: /\b(?:StopLogging|DeleteTrail|UpdateTrail|PutEventSelectors|DeleteFlowLogs|DeleteDetector)\b/ },
  { id: "cloud-keys", title: "New cloud credentials created", techniques: ["T1098.001"], severity: "high", re: /\b(?:CreateAccessKey|CreateLoginProfile|UpdateLoginProfile|AttachUserPolicy|PutUserPolicy|AddUserToGroup)\b/ },
  { id: "discovery-win", title: "Host / domain discovery commands", techniques: ["T1033", "T1082", "T1016"], severity: "low", re: /\b(?:whoami(?:\.exe)?(?:\s+\/all)?|systeminfo(?:\.exe)?|ipconfig(?:\.exe)?\s+\/all|hostname(?:\.exe)?)\b/i },
  { id: "domain-trust", title: "Domain trust / DC discovery", techniques: ["T1482"], severity: "medium", re: /nltest(?:\.exe)?\b[^\n]{0,40}(?:\/domain_trusts|\/dclist)|Get-ADTrust|AdFind(?:\.exe)?/i },
  { id: "group-discovery", title: "Privileged group discovery", techniques: ["T1069", "T1087"], severity: "low", re: /net1?(?:\.exe)?\s+group\s+"?(?:domain|enterprise)\s+admins|net1?(?:\.exe)?\s+(?:user|group)\s+\/domain/i },
  { id: "net-scan", title: "Network scanning", techniques: ["T1046", "T1595"], severity: "medium", re: /\b(?:nmap|masscan|zmap|rustscan|angry ?ip ?scanner)\b/i },
  { id: "curl-sh", title: "Download piped to a shell", techniques: ["T1059.004", "T1105"], severity: "high", re: /\b(?:curl|wget)\b[^\n|;]{0,200}\|\s*(?:sudo\s+)?(?:ba|z|k)?sh\b/i },
  { id: "decode", title: "Base64 decoding of a payload", techniques: ["T1140"], severity: "medium", re: /base64\s+(?:-d|--decode)\b|FromBase64String|atob\s*\(/i },
  { id: "web-attack", title: "Web attack pattern in a request", techniques: ["T1190"], severity: "high", re: /(?:\.\.\/){2,}|%2e%2e%2f|\bunion(?:\s|\+|%20)+(?:all(?:\s|\+|%20)+)?select\b|<script\b|%3Cscript|\bor(?:\s|\+|%20)+1=1\b|\/etc\/passwd|\$\{jndi:|;(?:\s|%20)*(?:wget|curl)(?:\s|%20)/i },
  { id: "webshell", title: "Web shell request", techniques: ["T1505.003"], severity: "critical", re: /\.(?:php|jsp|jspx|aspx?|cfm)\?(?:cmd|exec|command|c|shell)=|\b(?:c99|r57|wso|b374k|china ?chopper)\b/i },
  { id: "ransom", title: "Ransomware behaviour", techniques: ["T1486"], severity: "critical", re: /your files (?:have been|are) encrypted|\.(?:locked|lockbit|encrypted|crypt)\b|(?:readme|restore|how_to_decrypt)[^\s]{0,20}\.(?:txt|hta|html)|ransom(?:ware)?\s+note/i },
  { id: "rat", title: "Remote access / tunnelling tool", techniques: ["T1219", "T1572"], severity: "medium", re: /\b(?:anydesk|teamviewer|screenconnect|connectwise|atera|splashtop|ngrok|cloudflared\s+tunnel|chisel|plink(?:\.exe)?\s+-R)\b/i },
  { id: "archive", title: "Data staged into an archive", techniques: ["T1560"], severity: "medium", re: /\b(?:7z|7za|rar|winrar)(?:\.exe)?\s+a\b|Compress-Archive\b|\bzip\s+-r\b|\btar\s+-c[zj]?f\b/i },
  { id: "exfil-cloud", title: "Exfiltration tool to cloud storage", techniques: ["T1567.002"], severity: "high", re: /\b(?:rclone(?:\.exe)?\s+(?:copy|sync)|megacmd|mega-put|transfer\.sh|file\.io|anonfiles|gofile\.io)\b/i },
  { id: "rdp-logon", title: "Remote interactive logon (RDP)", techniques: ["T1021.001"], severity: "low", re: /logon\s*type[:= ]*10\b|LogonType["=: ]+10\b/i },
  { id: "uac-bypass", title: "UAC bypass technique", techniques: ["T1548.002"], severity: "high", re: /fodhelper(?:\.exe)?|eventvwr(?:\.exe)?[^\n]{0,40}mscfile|computerdefaults(?:\.exe)?|sdclt(?:\.exe)?\s+\/kickoffelev/i },
  { id: "sudo", title: "Privilege escalation via sudo", techniques: ["T1548.003"], severity: "low", re: /\bsudo\s+(?:-l\b|su\b|-i\b|bash\b)|sudoers/i },
  { id: "keylog", title: "Keylogging API / tool", techniques: ["T1056.001"], severity: "high", re: /GetAsyncKeyState|SetWindowsHookEx(?:A|W)?[^\n]{0,20}(?:13|WH_KEYBOARD)|keylogger/i },
  { id: "injection", title: "Process injection API", techniques: ["T1055"], severity: "high", re: /\b(?:VirtualAllocEx|WriteProcessMemory|CreateRemoteThread|NtMapViewOfSection|QueueUserAPC)\b/ },
  { id: "pth", title: "Pass-the-hash indicators", techniques: ["T1550.002"], severity: "high", re: /sekurlsa::pth|LogonProcessName["=: ]+seclogo[^\n]{0,80}LogonType["=: ]+9|Invoke-SMBExec|Invoke-WMIExec/i },
  { id: "mfa-fatigue", title: "Repeated MFA push denied", techniques: ["T1621"], severity: "medium", re: /mfa[^\n]{0,40}(?:denied|rejected|fraud)|push notification[^\n]{0,40}(?:denied|rejected)/i },
];

export interface Detection { rule: string; title: string; techniques: string[]; severity: Severity; events: number[] }

/** Run every rule over events (index + text). Returns one Detection per rule that fired. */
export function detect(events: { i: number; text: string }[]): Detection[] {
  const out = new Map<string, Detection>();
  for (const e of events) {
    for (const r of RULES) {
      if (!r.re.test(e.text)) continue;
      const d = out.get(r.id) || { rule: r.id, title: r.title, techniques: r.techniques, severity: r.severity, events: [] };
      if (d.events.length < 500) d.events.push(e.i);
      out.set(r.id, d);
    }
  }
  return Array.from(out.values()).sort((a, b) => sevRank(b.severity) - sevRank(a.severity) || b.events.length - a.events.length);
}

/** Technique IDs mentioned in free text (e.g. an AI answer): T1059.001, T1003 … — only known ones. */
export function techniquesIn(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(/\bT1\d{3}(?:\.\d{3})?\b/g)).map((m) => m[0]))).filter((id) => byId.has(id));
}
