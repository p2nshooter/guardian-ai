/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * ==============================================================================
 *
 * Editorial blog — original long-form articles drawn from the platform's own
 * products and engineering practice (Guardian, Orchestra, SOC, Vault,
 * Sentinel, Edge, Compliance, Studio). Static content module: no database
 * round-trip, fully prerenderable, indexed by the sitemap.
 */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  tag: string;
  minutes: number;
  body: string[]; // paragraphs; lines starting with "## " render as h2
}

import { BLOG_POSTS_2 } from "./blog-posts-batch2";

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-self-hosted-ai-security",
    title: "Why Self-Hosted AI Security Beats the Cloud for Sensitive Workloads",
    description:
      "Zero data exposure is not a slogan — it is an architecture. What actually changes when your threat detection runs on your own servers.",
    date: "2026-07-01",
    tag: "Security",
    minutes: 7,
    body: [
      "Every security vendor promises confidentiality. Very few can promise something much simpler: that your data never leaves your building. The difference between those two promises is the difference between a legal document and a network diagram.",
      "When threat detection runs as a SaaS, every log line, process list, and network flow you analyze is exported to someone else's infrastructure first. That creates three structural risks: a bigger attack surface (your telemetry is now a target in transit and at rest on third-party systems), a compliance burden (data residency, DPAs, sub-processor chains), and an availability dependency (if the vendor is down, your detection is down).",
      "## The self-hosted model",
      "Guardian AI takes the opposite approach: the detection engine, the behavioral models, and the alerting pipeline are deployed on infrastructure you control — a VPS, a bare-metal server, or an on-prem box. The AI keys are yours (BYOK), the data path is yours, and the only thing that ever leaves your network is what you explicitly choose to send.",
      "This matters most for exactly the organizations that need security the most: healthcare providers handling patient records, financial services under audit, government contractors with residency requirements, and startups whose entire value is their unreleased code.",
      "## What you trade, honestly",
      "Self-hosting is not free lunch. You own the uptime, the updates, and the disk space. A good self-hosted platform compensates by shipping as containers with one-command deploys, health checks, and automated migrations — which is precisely how the AXTO stack is packaged: docker-compose profiles per product, an example config for every service, and a setup script that provisions Cloudflare-backed control-plane pieces in minutes.",
      "## The bottom line",
      "If a breach of your telemetry would itself be a reportable incident, your telemetry should not be leaving your servers to be analyzed. Self-hosted AI security turns the hardest compliance questions into short answers: Where is the data? Here. Who can read it? Us. What does the vendor see? Nothing.",
    ],
  },
  {
    slug: "behavioral-threat-detection-explained",
    title: "Behavioral Threat Detection, Explained Without the Buzzwords",
    description:
      "Signatures catch yesterday's malware. Behavior catches today's. How baseline-and-deviation detection actually works in practice.",
    date: "2026-07-03",
    tag: "Security",
    minutes: 8,
    body: [
      "Traditional antivirus asks one question: have I seen this exact file before? That works until the attacker recompiles, repacks, or simply lives off the land using tools that are already on your server — bash, curl, cron, ssh.",
      "Behavioral detection asks a better question: is this machine acting like itself?",
      "## Building the baseline",
      "For a server, 'acting like itself' is surprisingly narrow. A web server executes the same handful of binaries, talks to the same databases, and serves the same ports, day after day. Guardian AI records that normal — process ancestry, network destinations, file-access patterns, login rhythms — and compresses it into a behavioral baseline.",
      "## Catching the deviation",
      "An attacker, even a careful one, has to deviate to achieve anything: a shell spawned by a web process, an outbound connection to an address the machine has never contacted, a burst of file reads across home directories, a cron entry that appeared at 3 a.m. Each deviation alone might be innocent. Scored together, weighted by rarity, they form an incident.",
      "The practical advantage is that behavioral detection is malware-agnostic. It does not need to recognize the payload, because it recognizes the symptom. Zero-days, novel ransomware, and hands-on-keyboard intrusions all produce the same class of deviations.",
      "## Keeping the noise down",
      "The hard engineering problem is not detection — it is restraint. A detector that cries wolf gets muted within a week. That is why scoring, cool-downs, and per-host learning windows matter more than raw sensitivity, and why alerts should arrive with the evidence chain attached: what deviated, from which baseline, and what the last known-good state looked like.",
      "Behavioral detection will not replace patching, firewalls, or backups. It replaces the assumption that you will recognize the attack in advance. You will not — and with a baseline in place, you no longer need to.",
    ],
  },
  {
    slug: "byok-bring-your-own-keys",
    title: "BYOK: Why Bringing Your Own AI Keys Is the Sanest Way to Adopt AI",
    description:
      "Vendor-managed AI means vendor-priced AI and vendor-visible data. Bring-your-own-keys flips the power balance back to you.",
    date: "2026-07-05",
    tag: "Platform",
    minutes: 6,
    body: [
      "Most AI products bundle the model access and charge you a multiple for it. That bundling has two hidden costs: you cannot choose the provider, and your prompts — which often contain your logs, your code, your customer data — flow through the vendor's account, under the vendor's terms.",
      "BYOK (Bring Your Own Keys) reverses this. You plug your own OpenAI, Anthropic, Google, or local-model credentials into the platform. The platform orchestrates; the model relationship stays yours.",
      "## What you gain",
      "Cost transparency: you pay the provider's real price, not a resold one, and you can watch every token in your own billing console. Provider choice: swap GPT for Claude for a local Llama without waiting for a vendor roadmap. Data control: your traffic runs under your data-processing agreement, your region, your retention settings. Rate-limit ownership: your quota is not shared with a vendor's thousand other customers.",
      "## What the platform still does",
      "A BYOK platform earns its keep in orchestration: routing each job to the right provider, failing over when one degrades, batching and caching to cut spend, and keeping an audit trail of every call. That is exactly the layer AXTO Orchestra implements across GPU clusters and API providers — the intelligence is in the routing, not in holding your keys hostage.",
      "If an AI product cannot work with your keys, ask why. The honest answers are usually about margin, not architecture.",
    ],
  },
  {
    slug: "soc-for-small-teams",
    title: "A Security Operations Center for Teams of One",
    description:
      "You do not need a 24/7 analyst room to run SOC discipline. You need triage, evidence, and escalation — automated.",
    date: "2026-07-07",
    tag: "Security",
    minutes: 7,
    body: [
      "The classic SOC is a room full of analysts watching dashboards in shifts. Almost nobody outside the Fortune 500 can staff that — and almost everybody now faces the same attacks.",
      "The good news: most of what a SOC does is process, and process automates. Detection produces events; triage separates signal from noise; investigation attaches context; escalation wakes a human only when the evidence clears a bar.",
      "## The automated tier",
      "In the AXTO SOC stack, tier-1 triage is machine work. Every event is enriched — which host, which baseline, which recent changes, which threat-feed matches — and scored. Low scores are archived with their evidence. Mid scores open a case and keep collecting. High scores page you, with the whole chain attached: you wake up to a story, not a beep.",
      "## The human tier",
      "What remains for the human is judgment: is this deviation a deploy or an intrusion? Is this credential use a contractor or a thief? Automation cannot answer those — but it can make sure that when you sit down, everything needed to answer them is already on the table.",
      "## Why it works at small scale",
      "A one-person SOC fails when the person must do the collection, correlation, and paging manually — that is a full-time job before judgment even starts. Automate those three, and SOC discipline compresses into minutes a day: review the cases, decide, close. Security stops being a night shift and becomes a habit.",
    ],
  },
  {
    slug: "gpu-cluster-orchestration-lessons",
    title: "Routing AI Jobs Across GPU Clusters: Five Lessons From Production",
    description:
      "Multi-provider AI routing sounds simple until the first regional outage. What we learned building Orchestra.",
    date: "2026-07-09",
    tag: "Engineering",
    minutes: 8,
    body: [
      "Orchestra exists because one GPU is never enough and one provider is never reliable enough. Routing AI workloads across clusters and APIs looks like a scheduling problem; in production it is a failure-handling problem wearing a scheduler's clothes.",
      "## Lesson 1 — Health is a spectrum, not a boolean",
      "Providers rarely go down; they go slow, then flaky, then down. A router that only knows up/down will send jobs into the flaky window. Track rolling latency and error rates per destination and start shifting traffic at degradation, not at death.",
      "## Lesson 2 — Every job needs a cost ceiling",
      "Retries are the silent budget killer. A job that fails over across three providers with exponential prompts can cost five times its estimate. Attach a spend ceiling to the job, not the provider, and stop when it is reached.",
      "## Lesson 3 — Queues beat immediate failure",
      "When every destination is saturated, the right answer is usually 'wait 90 seconds', not 'error'. A visible queue with priorities turns capacity incidents into latency blips.",
      "## Lesson 4 — Route by capability, not just price",
      "The cheapest model that cannot do function-calling is not cheap — it is a retry loop. Capability tags on destinations (context length, tool use, vision, region) prevent an entire class of doomed dispatches.",
      "## Lesson 5 — Log the routing decision itself",
      "When a customer asks why their job ran where it ran, 'the algorithm chose' is not an answer. Persist the decision inputs — health, price, capability, queue depth at dispatch time. Auditability is a feature, and in regulated shops it is the feature.",
    ],
  },
  {
    slug: "secrets-management-vault-basics",
    title: "Stop Putting Secrets in .env Files: A Practical Vault Primer",
    description:
      "API keys in plain text are one git push away from disaster. The minimum viable secrets discipline for small teams.",
    date: "2026-07-11",
    tag: "Engineering",
    minutes: 6,
    body: [
      "Nearly every breach post-mortem contains the same sentence: 'the attacker found credentials.' In a .env file, in a repo, in a CI log, in a Slack message. Secrets sprawl is not a tooling failure — it is the default outcome of not deciding where secrets live.",
      "## The minimum discipline",
      "One: secrets live in exactly one place — an encrypted store (the AXTO Vault service exists for precisely this), never in code, never in tickets. Two: applications receive secrets at runtime, injected into the environment or fetched over an authenticated channel, so a copy of the codebase is worthless. Three: every secret has an owner and a rotation date; a credential nobody remembers issuing is a credential nobody will remember revoking.",
      "## Encryption at rest is table stakes",
      "A vault that stores secrets encrypted with a key kept next to the ciphertext is a filing cabinet with the key taped to it. Use envelope encryption: data keys encrypt secrets, a master key encrypts data keys, and the master key lives somewhere with real access control.",
      "## Rotation without tears",
      "Rotation fails when it requires coordination. Design for two valid versions of every secret during a rollover window: issue the new one, deploy consumers, revoke the old one. If your systems read secrets at startup only, a rolling restart completes the rotation with zero downtime.",
      "None of this requires an enterprise contract. It requires deciding, once, that plaintext credentials are an incident — and giving them exactly one encrypted home.",
    ],
  },
  {
    slug: "edge-agents-lightweight-monitoring",
    title: "Monitoring the Machines You Forgot: Lightweight Edge Agents",
    description:
      "The forgotten VPS is the attacker's favorite server. How low-footprint agents keep the long tail of your fleet honest.",
    date: "2026-07-13",
    tag: "Platform",
    minutes: 6,
    body: [
      "Every organization has them: the staging box from two projects ago, the client demo VPS, the cron server nobody dares to touch. They are patched irregularly, monitored never, and reachable from the internet — which makes them the softest entry point into everything else.",
      "## Why heavyweight agents fail here",
      "Full monitoring suites assume resources and attention these machines do not get. A 2 GB agent on a 1 GB VPS does not protect it; it finishes it. The requirement for the long tail is different: tiny footprint, no local state worth stealing, and reporting that works over nothing fancier than HTTPS.",
      "## What an edge agent should actually do",
      "Heartbeat (the machine is alive and its clock is sane), integrity signals (auth log anomalies, new listening ports, changed binaries in system paths), and resource sanity (a quiet server suddenly at 100% CPU is either mining cryptocurrency or about to fail). The AXTO edge agent ships these in a single small binary with a YAML config — deployable by the same copy-paste that created the VPS in the first place.",
      "## The payoff",
      "The point is not deep telemetry on unimportant machines; it is that no machine is unmonitored. Attackers pivot from the box you forgot to the data you care about. A heartbeat and three integrity checks on every forgotten server closes the easiest chapter of that story.",
    ],
  },
  {
    slug: "compliance-automation-reality-check",
    title: "Compliance Automation: What Tools Can Do and What They Cannot",
    description:
      "Evidence collection automates beautifully. Judgment does not. Where compliance tooling genuinely saves months.",
    date: "2026-07-15",
    tag: "Compliance",
    minutes: 7,
    body: [
      "Compliance frameworks — SOC 2, ISO 27001, HIPAA, GDPR — are often described as paperwork. They are really evidence work: proving, repeatedly, that controls exist and operate. That distinction decides what automation can honestly do for you.",
      "## What automates well",
      "Evidence collection is mechanical: access reviews exported on schedule, encryption settings snapshotted, backup logs retained, alert histories archived. A compliance service that gathers these continuously — the way the AXTO compliance stack does — turns audit week from an archaeology dig into a filtered query. Control monitoring automates too: if MFA enforcement lapses or a bucket goes public, that is a detectable state change, not an annual discovery.",
      "## What does not automate",
      "Scoping (which systems are in the audit boundary), risk acceptance (which findings the business consciously tolerates), and policy intent (what your organization promises to do) are judgment calls. Tools that claim to 'make you compliant' without a human owning these are selling a certificate-shaped illusion.",
      "## The honest division of labor",
      "Let machines prove the routine, continuously, and let people decide the exceptions, deliberately. Teams that adopt this split report the same outcome: audits shrink from quarters to weeks, and — more valuable — the controls are actually true between audits, not just during them.",
    ],
  },
  {
    slug: "threat-feeds-how-to-use",
    title: "Threat Feeds Are Cheap. Using Them Well Is Not.",
    description:
      "A list of bad IPs is not intelligence. Matching, aging, and context turn feeds into detections that matter.",
    date: "2026-07-17",
    tag: "Security",
    minutes: 6,
    body: [
      "Threat feeds — lists of malicious IPs, domains, and file hashes — are abundant and largely free. Yet most deployments extract almost no value from them, for a predictable reason: a feed is only as useful as the matching you do against it.",
      "## Match where the data is",
      "An IP list is worthless if nothing compares your connection logs against it. The first job is plumbing: every inbound auth attempt, every outbound destination, checked against current indicators — automatically, at ingest time, the way the AXTO threat-feed service wires into Guardian's event stream.",
      "## Age indicators aggressively",
      "Attack infrastructure is disposable; the IP that mattered in March is a rented VPS with a new tenant by May. Stale indicators generate false accusations against innocent addresses. Expire aggressively, and weight recent indicators far above old ones.",
      "## Context beats volume",
      "Ten thousand generic indicators produce noise; fifty indicators tagged 'actively exploiting the framework you actually run' produce action. Prefer feeds (and filters) aligned with your stack, and carry the tag through to the alert so the responder knows why the match matters.",
      "Used this way, feeds become what they were meant to be: someone else's incident, converted into your early warning.",
    ],
  },
  {
    slug: "ai-studio-onprem-workflows",
    title: "Running an AI Studio On-Prem: Workflows Without the Data Leak",
    description:
      "Teams want ChatGPT-style productivity; counsel wants nothing sensitive leaving the network. You can have both.",
    date: "2026-07-18",
    tag: "Platform",
    minutes: 6,
    body: [
      "The fastest way AI enters a company is employees pasting things into public chatbots. The second fastest is the security team banning it. Both outcomes are bad: one leaks data, the other leaks productivity.",
      "## The third option",
      "An on-prem AI studio — a chat and workflow interface running on your infrastructure, connected via BYOK to the providers you approve, or to local models for the truly sensitive paths. Employees get the assistant; the organization gets the controls: which models are reachable, which data classes may be sent where, and a complete audit log of every exchange.",
      "## What makes it stick",
      "Adoption dies if the internal tool is worse than the public one. The bar is: fast responses (routing and caching matter — this is Orchestra's job under the hood), file understanding, reusable prompt templates for the tasks your teams repeat, and shared workspaces so a good workflow spreads. The AXTO Studio family (AI Studio, GPU Studio for heavy local inference, Hybrid Studio for mixed routing) is built around exactly that bar.",
      "## The governance dividend",
      "Once AI use flows through one gateway, governance stops being a policy document and becomes configuration: retention you choose, regions you pin, prompts you can actually review in an incident. The employees who used to paste into public tabs become your best evidence that the controls work — because they stopped needing to.",
    ],
  },
  {
    slug: "ransomware-first-24-hours",
    title: "Ransomware Hit at 3 A.M.: A Calm Guide to the First 24 Hours",
    description:
      "What you do in the first day decides whether ransomware is an incident or a catastrophe. A step-by-step order of operations.",
    date: "2026-07-19",
    tag: "Incident Response",
    minutes: 8,
    body: [
      "Ransomware response fails in two ways: panic actions that destroy evidence and spread the damage, or paralysis while the encryption finishes. The antidote to both is knowing the order of operations before you need it.",
      "## Hour 0-1: Contain, do not clean",
      "Isolate affected machines from the network — pull cables, disable Wi-Fi, suspend VMs. Do NOT power them off (memory holds keys and evidence) and do NOT start deleting or reimaging. Disable the accounts that were active on affected hosts. If you have network segmentation, close the gates between segments now.",
      "## Hour 1-4: Understand the blast radius",
      "Which hosts show encrypted files? Which shares do those hosts mount? When did the earliest file modification happen — that timestamp bounds the intrusion window. Check your monitoring for the entry point: a phishing login, an exposed service, a vulnerable dependency. Behavioral detection earns its keep here: the deviations it logged before the encryption started are your investigation's spine.",
      "## Hour 4-12: Protect the backups, then verify them",
      "Attackers hunt backups before they trigger encryption. Verify your backup infrastructure is untouched BEFORE connecting anything to it, confirm the latest restorable point, and test-restore one file to somewhere isolated. If backups survived, you have already won the negotiation you are not going to have.",
      "## Hour 12-24: Decide, document, notify",
      "With scope known and backups verified, the decisions become concrete: rebuild order, credential rotation plan (assume everything on affected hosts is stolen), and legal notifications — many jurisdictions and cyber-insurance policies have clocks that started at discovery. Write everything down with timestamps; the report you produce later is built from these notes.",
      "## The uncomfortable epilogue",
      "Paying rarely goes as advertised: decryptors are slow and buggy, data was often exfiltrated anyway, and payment marks you as a payer. The organizations that decline are the ones whose backups and segmentation made declining possible — which is to say, the response to ransomware is mostly decided months before it arrives.",
    ],
  },
  {
    slug: "zero-trust-small-fleet",
    title: "Zero Trust for a Ten-Server Fleet: The 20% That Delivers 80%",
    description:
      "Zero trust is not an enterprise shopping list. The handful of practices that give small fleets most of the benefit.",
    date: "2026-07-20",
    tag: "Security",
    minutes: 7,
    body: [
      "Zero trust has become a procurement category, which is a shame, because its core idea costs nothing: stop treating network location as identity. Being inside the VPN should not mean being trusted.",
      "## Practice 1: Authenticate services, not networks",
      "Every service-to-service call should present credentials — an API token, mTLS, a signed request — even between your own machines. The payoff is that one compromised host no longer inherits access to everything that happens to share its subnet.",
      "## Practice 2: Per-service accounts with minimum scope",
      "The web app talks to the database as a user that can read and write its own schema — not as root. The backup job can read volumes — not write them. When credentials leak (assume they will), scope is what turns a breach into an inconvenience.",
      "## Practice 3: Short-lived access over standing access",
      "Human SSH access via short-lived certificates or session-based grants beats permanent authorized_keys entries that outlive employees. If issuing access takes one command, revoking it stops being a project.",
      "## Practice 4: Verify posture continuously",
      "Trust is a state, not a grant. A host that starts behaving strangely — new listeners, odd outbound connections, changed binaries — should lose standing automatically. This is where continuous behavioral monitoring plugs into the zero-trust loop: detection findings become access decisions.",
      "## What you can skip at small scale",
      "Identity-aware proxies for every internal tool, device-management suites, policy engines with their own query language — fine tools, premature at ten servers. The four practices above are configuration and habit, not procurement, and they carry the bulk of the model's value.",
    ],
  },
  {
    slug: "ssh-hardening-checklist",
    title: "SSH Hardening: The Checklist That Blocks 99% of Drive-By Attacks",
    description:
      "Every internet-facing server gets brute-forced within minutes of boot. Fifteen minutes of SSH configuration ends the conversation.",
    date: "2026-07-21",
    tag: "Engineering",
    minutes: 6,
    body: [
      "Expose port 22 to the internet and the login attempts begin within minutes — automated, global, and relentless. None of them succeed against a hardened configuration, and hardening takes a quarter of an hour.",
      "## The non-negotiables",
      "Keys only: PasswordAuthentication no. Password guessing is the entire business model of SSH botnets; removing passwords removes the market. Root stays home: PermitRootLogin no — log in as a user, escalate with sudo, keep the audit trail. Modern keys: ed25519 over aging RSA defaults.",
      "## The strong upgrades",
      "Restrict who: AllowUsers or AllowGroups turns 'any valid account' into a short list. Restrict where, if your admins have stable networks: firewall port 22 to known ranges or behind a VPN/bastion. Rate-limit the rest with fail2ban or nftables connection limits, so even the doorknob-rattling costs the attacker time.",
      "## The often-forgotten",
      "Audit authorized_keys everywhere — old laptops, departed contractors, and forgotten automation live in those files; each entry is a permanent credential someone once issued and nobody reviews. Alert on success, not just failure: the login that matters is the successful one from a country where you have no admins, at an hour when nobody works. That single alert has caught more real intrusions than any signature engine.",
      "None of this requires new software — just decisions. Make them once, template them into your provisioning, and every future server is born hardened.",
    ],
  },
  {
    slug: "prompt-injection-llm-defense",
    title: "Prompt Injection: The Web's New Untrusted-Input Problem",
    description:
      "LLM apps keep repeating the mistakes web apps made twenty years ago. How injection works and the defenses that actually hold.",
    date: "2026-07-22",
    tag: "AI Security",
    minutes: 7,
    body: [
      "Twenty years ago the web learned, painfully, that user input is not code. LLM applications are relearning it: any text your model reads — a user message, a fetched web page, a PDF, an email — can contain instructions, and the model cannot reliably tell content from command.",
      "## The two flavors",
      "Direct injection is the user telling the model to ignore its instructions. Indirect injection is nastier: the attacker plants instructions in content the model will process later — a web page your summarizer visits, a resume your screening bot reads, a calendar invite your assistant parses. The victim never typed anything.",
      "## Why filtering is not enough",
      "Blocklists fail against paraphrase; instruction-detection models are themselves persuadable. Treat 'the model will refuse' as a soft mitigation, never a boundary. The real boundaries live OUTSIDE the model.",
      "## Defenses that hold",
      "Least-privilege tools: the model can only call the actions the current user could take themselves — injection then steals nothing the user did not already have. Human confirmation on irreversible actions: sending money, deleting data, emailing externally. Provenance separation: keep system, user, and fetched content in separate labeled channels and never promote fetched text to instruction status. Egress control: if a tool result must never leave the tenant, enforce that in the gateway, not in the prompt.",
      "## The mental model",
      "Treat the LLM as a brilliant, suggestible intern: enormous capability, zero security judgment. You would not give that intern production credentials and unsupervised email. Give the model exactly what you would give the intern — sandboxed tools, scoped access, and a supervisor for anything dangerous — and injection attacks become disappointments instead of disasters.",
    ],
  },
  {
    slug: "docker-security-essentials",
    title: "Container Security Essentials: Beyond 'It Works on My Machine'",
    description:
      "Containers changed deployment; they did not repeal security. The practical hardening layers for production Docker.",
    date: "2026-07-23",
    tag: "Engineering",
    minutes: 7,
    body: [
      "Containers isolate applications from each other — until they do not. Most container breaches walk through doors the operator left open, not kernel exploits. Closing those doors is checklist work.",
      "## Image hygiene",
      "Pin bases to digests, not floating tags — 'latest' means 'whatever exists at build time', which is not a supply chain, it is a lottery. Build minimal: distroless or slim bases shrink the attack surface and the CVE-scanner noise. Scan in CI and fail the build on critical findings while the fix is a one-line bump — scanning production images without a gate is journaling, not security.",
      "## Runtime restraint",
      "Never --privileged in production; it is root on the host wearing a costume. Drop capabilities by default and add back only what the process needs. Read-only root filesystem with explicit writable volumes turns many exploit chains into error messages. And do not mount the Docker socket into containers — that is handing out host control.",
      "## Secrets and networks",
      "Environment variables leak into logs, inspect output, and crash dumps; prefer mounted secret files or a real secrets store. On the network side, containers on a default bridge can all talk to each other — define per-application networks so the blog engine cannot reach the billing database it has no business knowing exists.",
      "## Watch the runtime, not just the build",
      "A clean scan at build time says nothing about what the container is doing at 2 a.m. The behavioral signals that matter: a container spawning shells it never spawned before, outbound connections to novel destinations, writes into paths that should be immutable. Container isolation makes those baselines tight — a service that does one thing deviates loudly when it starts doing another.",
    ],
  },
  {
    slug: "backup-strategy-that-survives",
    title: "Backups That Survive Attackers, Admins, and Bad Luck",
    description:
      "Most backup strategies are tested by disaster and fail. Designing for the three ways backups actually die.",
    date: "2026-07-24",
    tag: "Engineering",
    minutes: 6,
    body: [
      "Backups die in three ways: the attacker deletes them, the automation silently stopped months ago, or the restore turns out to be impossible at the worst moment. A strategy is only real if it addresses all three.",
      "## Against attackers: immutability and distance",
      "Modern intruders hunt backups first. The defense is a copy the compromised environment cannot reach: object storage with retention locks (write-once), a separate account with separate credentials, or genuinely offline media. The 3-2-1 rule still stands — three copies, two media, one offsite — with a modern amendment: at least one copy immutable.",
      "## Against silent failure: monitor the absence",
      "Backup jobs fail quietly; the cron dies, the disk fills, the credential expires — and nobody notices until restore day. Do not alert on failure alone; alert on missing success. A dead man's switch that pages when no fresh backup has appeared within the window converts silent rot into a Tuesday ticket.",
      "## Against restore fiction: rehearse",
      "An untested backup is a hope, not a plan. Schedule restore drills: pick a random backup, restore to isolated infrastructure, verify the application actually starts and the data is coherent. Time it — the drill also tells you your real recovery time, which is what every continuity promise is secretly built on.",
      "## Scope honestly",
      "Databases need consistent snapshots or dump procedures, not file copies of live data directories. Configuration, secrets (encrypted), and the runbook to rebuild belong in scope too — a perfect data backup of a system nobody remembers how to assemble is a puzzle, not a recovery.",
    ],
  },
  {
    slug: "choosing-gpus-for-inference",
    title: "Choosing GPUs for AI Inference: A Buyer's Reality Check",
    description:
      "VRAM, not FLOPS, decides what you can run. A plain guide to sizing GPU hardware for self-hosted models.",
    date: "2026-07-25",
    tag: "AI Infrastructure",
    minutes: 7,
    body: [
      "GPU marketing sells compute; inference buyers should be reading memory. For running models (as opposed to training them), the first question is always: does the model fit?",
      "## The VRAM arithmetic",
      "A model's weights need roughly two bytes per parameter at 16-bit precision — a 7B model wants ~14 GB before you add context. Quantization changes the deal: at 4-bit, that same 7B fits in ~4-5 GB with modest quality loss, a 70B squeezes into ~40 GB. Then the context window claims its share — long contexts and big batch sizes eat gigabytes of KV-cache. Rule of thumb: buy VRAM for the model you want next year, not the one you demo today.",
      "## Throughput, latency, and what users feel",
      "Users feel two numbers: time to first token and tokens per second. Batch-friendly serving stacks trade a little latency for large throughput gains — which is why one well-utilized card often outperforms two idle ones. Measure with your real prompt mix; synthetic benchmarks flatter every card.",
      "## Cloud, owned, or both",
      "Owned hardware wins when utilization is steady — the payback window against cloud GPU pricing is often months, not years. Cloud wins for bursts, experiments, and models you run rarely. The pragmatic answer for most teams is hybrid: owned baseline capacity for the daily load, cloud overflow for spikes — exactly the routing decision an orchestration layer should be making per job, automatically, based on queue depth and cost ceilings.",
      "## The unglamorous constraints",
      "Power and cooling gate everything: a 700-watt card in a closet becomes a thermal incident. Check PCIe lanes, PSU headroom, and case airflow before checkout. The best GPU is the one that fits your model, your rack, and your electricity bill — in that order.",
    ],
  },
  {
    slug: "security-logs-what-to-keep",
    title: "Security Logging: What to Keep, for How Long, and What to Ignore",
    description:
      "Log everything is a storage bill, not a strategy. The signals investigations actually use, and sane retention for each.",
    date: "2026-07-26",
    tag: "Security",
    minutes: 6,
    body: [
      "Every post-incident review contains one of two sentences: 'the logs showed exactly what happened' or 'we could not determine how the attacker got in.' The difference was decided months earlier, by what someone chose to record.",
      "## The investigation core",
      "When responders reconstruct an intrusion they reach for the same few streams every time: authentication events (successes AND failures, with source addresses), process execution with parent-child lineage, network flow summaries (who talked to whom, when, how much — payloads rarely needed), and change events on the crown jewels: new users, permission grants, cron and service modifications, configuration writes.",
      "## What you can mostly ignore",
      "Debug chatter, load-balancer health checks, and verbose application traces dominate volume while contributing almost nothing forensically. Sample them or drop them at ingest. The goal is not completeness; it is answerable questions.",
      "## Retention that matches reality",
      "Breach discovery commonly lags intrusion by weeks or months. Ninety days of hot, searchable logs is a defensible floor for the core streams; a year of cold, cheap archive covers the long tail and most compliance regimes. Whatever the number, write it down — an accidental retention policy is the kind auditors and courts enjoy least.",
      "## Protect the logs themselves",
      "Attackers edit history where they can. Ship logs off-host promptly, restrict deletion rights, and let the collector append-only. A modest, tamper-resistant log pipeline beats a lavish one the intruder can prune — because the only log that matters is the one that survives the incident it describes.",
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

BLOG_POSTS.push(...BLOG_POSTS_2);
