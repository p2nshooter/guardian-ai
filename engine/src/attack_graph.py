# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI eXecution & Tools Orchestration — Attack Graph + Vector Semantic Search (Tier 2)
=============================================================

1. Attack Graph (Graph-based attack path visualization)
   - Setiap incident dimodelkan sebagai node dalam directed graph
   - Edge = relasi antar node (spawned, connected_to, accessed, escalated)
   - Visualisasi: JSON format untuk D3.js / Cytoscape.js di dashboard
   - Accessible via: GET /attack-graph/{incident_id}

2. Vector Semantic Search (threat hunting dengan natural language)
   - IOC, process name, threat description di-embed ke vector space
   - Query dalam bahasa natural → cosine similarity search
   - Pure Python + numpy (tidak butuh external vector DB)
   - Accessible via: POST /hunt/semantic

Tier 2 only: fallback gracefully kalau PostgreSQL tidak ada
"""
from __future__ import annotations

import json, logging, math, os, time
from typing import Any, Dict, List, Optional, Tuple

log = logging.getLogger("guardian.attack_graph")


# ═══════════════════════════════════════════════════════════════════════════════
# PART 1: Attack Graph
# ═══════════════════════════════════════════════════════════════════════════════

class AttackGraphBuilder:
    """
    Builds attack path graph from incident events.
    Menggunakan distributed DB (PostgreSQL) jika tersedia,
    fallback ke in-memory graph jika tidak.
    """

    def __init__(self):
        self._memory_nodes: List[dict] = []   # fallback for SQLite mode
        self._memory_edges: List[dict] = []
        self._node_counter = 0

    def _next_id(self) -> int:
        self._node_counter += 1
        return self._node_counter

    async def add_event_to_graph(self, incident_id: str, node_id: str,
                                  entity: str, entity_type: str,
                                  technique: str = "", tactic: str = "",
                                  severity: str = "medium",
                                  parent_entity: str = "") -> int:
        """
        Add an event as a node in the attack graph.
        If parent_entity provided, auto-create an edge from parent → this node.
        Returns node DB id.
        """
        try:
            from src.database_distributed import get_distributed_db
            pg = await get_distributed_db()
            if pg:
                node_db_id = await pg.add_attack_node(
                    node_id=node_id, entity=entity, entity_type=entity_type,
                    technique=technique, tactic=tactic,
                    severity=severity, incident_id=incident_id,
                )
                # Find parent and create edge
                if parent_entity and node_db_id:
                    parent_nodes = [
                        n for n in (await pg.get_attack_graph(incident_id)).get("nodes", [])
                        if n.get("entity") == parent_entity
                    ]
                    if parent_nodes:
                        await pg.add_attack_edge(
                            src_id=parent_nodes[-1]["id"],
                            dst_id=node_db_id,
                            relation="triggered",
                            confidence=0.85,
                        )
                return node_db_id
        except Exception as e:
            log.debug(f"Attack graph PG error: {e}")

        # Fallback: in-memory
        nid = self._next_id()
        node = {
            "id": nid, "ts": time.time(), "incident_id": incident_id,
            "node_id": node_id, "entity": entity, "entity_type": entity_type,
            "technique": technique, "tactic": tactic, "severity": severity,
        }
        self._memory_nodes.append(node)
        if parent_entity:
            parents = [n for n in self._memory_nodes if n["entity"] == parent_entity]
            if parents:
                self._memory_edges.append({
                    "src_node_id": parents[-1]["id"],
                    "dst_node_id": nid,
                    "relation": "triggered",
                    "confidence": 0.85,
                })
        return nid

    async def get_graph(self, incident_id: str = "") -> dict:
        """Return graph as {nodes, edges} — suitable for D3/Cytoscape rendering."""
        try:
            from src.database_distributed import get_distributed_db
            pg = await get_distributed_db()
            if pg:
                raw = await pg.get_attack_graph(incident_id)
                return _format_graph(raw["nodes"], raw["edges"])
        except Exception:
            pass

        # Fallback: memory
        nodes = [n for n in self._memory_nodes
                 if not incident_id or n.get("incident_id") == incident_id]
        node_ids = {n["id"] for n in nodes}
        edges = [e for e in self._memory_edges
                 if e["src_node_id"] in node_ids or e["dst_node_id"] in node_ids]
        return _format_graph(nodes, edges)

    async def build_from_incident(self, incident: dict) -> dict:
        """
        Auto-build attack graph from an existing incident dict.
        Creates nodes for each event in the incident timeline.
        """
        incident_id = incident.get("id", "")
        prev_entity = ""
        for evt in incident.get("events", []):
            entity      = evt.get("description", evt.get("action", "unknown"))[:80]
            entity_type = "process" if "process" in evt.get("action","").lower() else "event"
            technique   = ""
            # Try to extract technique from indicators
            for ind in evt.get("indicators", []):
                if isinstance(ind, str) and ind.startswith("T"):
                    technique = ind
                    break
            await self.add_event_to_graph(
                incident_id  = incident_id,
                node_id      = incident.get("node_id", ""),
                entity       = entity,
                entity_type  = entity_type,
                technique    = technique,
                tactic       = incident.get("threat_type", ""),
                severity     = incident.get("severity", "medium"),
                parent_entity= prev_entity,
            )
            prev_entity = entity
        return await self.get_graph(incident_id)


def _format_graph(nodes: List[dict], edges: List[dict]) -> dict:
    """Format graph for frontend visualization (D3.js / Cytoscape.js compatible)."""
    severity_colors = {
        "critical": "#ef4444", "high": "#f97316",
        "medium":   "#eab308", "low":  "#3b82f6",
        "info":     "#6b7280",
    }
    formatted_nodes = []
    for n in nodes:
        sev = n.get("severity", "medium")
        formatted_nodes.append({
            "id":          str(n.get("id","")),
            "label":       n.get("entity", ""),
            "type":        n.get("entity_type", "event"),
            "technique":   n.get("technique", ""),
            "tactic":      n.get("tactic", ""),
            "severity":    sev,
            "color":       severity_colors.get(sev, "#6b7280"),
            "ts":          n.get("ts", 0),
            "node_id":     n.get("node_id", ""),
            "incident_id": n.get("incident_id", ""),
        })
    formatted_edges = []
    for e in edges:
        formatted_edges.append({
            "source":     str(e.get("src_node_id","")),
            "target":     str(e.get("dst_node_id","")),
            "relation":   e.get("relation", "triggered"),
            "confidence": e.get("confidence", 0.8),
        })
    return {
        "nodes": formatted_nodes,
        "edges": formatted_edges,
        "node_count": len(formatted_nodes),
        "edge_count": len(formatted_edges),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PART 2: Vector Semantic Search
# ═══════════════════════════════════════════════════════════════════════════════

class VectorIndex:
    """
    Lightweight in-memory vector index using numpy cosine similarity.
    Digunakan untuk semantic search atas IOC, threat descriptions, process names.

    Tidak butuh external vector DB — murni numpy.
    Untuk dataset besar (>100k items) pertimbangkan upgrade ke Faiss/Qdrant.
    """

    def __init__(self):
        self._vectors:  List[List[float]] = []
        self._metadata: List[dict]        = []
        self._dim: int = 0

    def add(self, text: str, metadata: dict) -> None:
        """Encode text to vector and store with metadata."""
        vec = self._encode(text)
        if self._dim == 0:
            self._dim = len(vec)
        elif len(vec) != self._dim:
            return
        self._vectors.append(vec)
        self._metadata.append({**metadata, "_text": text})

    def search(self, query: str, top_k: int = 10,
               min_score: float = 0.3) -> List[dict]:
        """
        Search for most similar items to query.
        Returns list of {score, text, ...metadata} sorted by score desc.
        """
        if not self._vectors:
            return []
        query_vec = self._encode(query)
        scores = [self._cosine(query_vec, v) for v in self._vectors]
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        results = []
        for idx, score in ranked[:top_k]:
            if score < min_score:
                break
            results.append({
                "score":   round(score, 4),
                **self._metadata[idx],
            })
        return results

    def size(self) -> int:
        return len(self._vectors)

    # ── Encoding (TF-IDF-like character n-gram hashing) ──────────────────────
    # Pure Python, no ML models needed.
    # Good enough for security term similarity (IOC, CVE, technique names).

    def _encode(self, text: str, dim: int = 128) -> List[float]:
        """Encode text to fixed-dim float vector using character n-gram hashing."""
        text = text.lower().strip()
        vec  = [0.0] * dim
        # Unigrams + bigrams + trigrams
        for n in (1, 2, 3):
            for i in range(len(text) - n + 1):
                gram = text[i:i+n]
                h    = hash(gram) % dim
                vec[h] += 1.0 / n   # weight shorter grams less
        # L2 normalize
        norm = math.sqrt(sum(v*v for v in vec)) or 1.0
        return [v / norm for v in vec]

    @staticmethod
    def _cosine(a: List[float], b: List[float]) -> float:
        dot  = sum(x*y for x, y in zip(a, b))
        na   = math.sqrt(sum(x*x for x in a)) or 1.0
        nb   = math.sqrt(sum(x*x for x in b)) or 1.0
        return dot / (na * nb)


class SemanticThreatSearch:
    """
    Semantic search over all Guardian's threat knowledge:
      - IOC (hashes, IPs, domains)
      - MITRE ATT&CK techniques
      - Incident descriptions
      - Learned patterns
      - CVE descriptions

    Query in natural language → ranked results.
    """

    def __init__(self):
        self._ioc_index      = VectorIndex()
        self._technique_index= VectorIndex()
        self._incident_index = VectorIndex()
        self._initialized    = False

    async def initialize(self) -> None:
        """Load MITRE techniques and recent data into index."""
        if self._initialized:
            return
        # Load MITRE ATT&CK technique names
        for tid, tname in _MITRE_TECHNIQUES.items():
            self._technique_index.add(
                f"{tid} {tname}",
                {"type": "technique", "technique_id": tid, "technique": tname}
            )
        # Load recent incidents from DB
        try:
            from src.database import get_db
            db = await get_db()
            patterns = await db.get_learned_patterns(limit=500)
            for p in patterns:
                self._ioc_index.add(
                    p.get("pattern_value", ""),
                    {"type": "ioc", "pattern_type": p.get("pattern_type",""),
                     "threat_type": p.get("threat_type",""),
                     "confidence": p.get("confidence", 0)}
                )
        except Exception as e:
            log.debug(f"Semantic index load error: {e}")
        self._initialized = True
        log.info(f"Semantic index ready: "
                 f"{self._technique_index.size()} techniques, "
                 f"{self._ioc_index.size()} IOCs")

    async def search(self, query: str, top_k: int = 10) -> dict:
        """
        Semantic search across all indexes.
        Returns combined ranked results.
        """
        if not self._initialized:
            await self.initialize()

        techniques = self._technique_index.search(query, top_k=top_k//2 or 5)
        iocs       = self._ioc_index.search(query, top_k=top_k//2 or 5)

        # Also search recent DB events
        db_results = await self._search_db(query, limit=top_k)

        return {
            "query":      query,
            "techniques": techniques,
            "iocs":       iocs,
            "events":     db_results,
            "total":      len(techniques) + len(iocs) + len(db_results),
        }

    async def index_incident(self, incident: dict) -> None:
        """Add new incident to search index."""
        text = (f"{incident.get('title','')} "
                f"{incident.get('threat_type','')} "
                f"{incident.get('target','')}")
        self._incident_index.add(text, {
            "type":        "incident",
            "incident_id": incident.get("id",""),
            "severity":    incident.get("severity",""),
            "status":      incident.get("status",""),
        })

    async def _search_db(self, query: str, limit: int = 5) -> List[dict]:
        """Search scan_events in DB via keyword matching (fallback)."""
        try:
            from src.database import get_db
            db  = await get_db()
            # Use existing get_scan_history with verdict filter
            suspicious = await db.get_scan_history(limit=50, verdict="suspicious")
            malicious  = await db.get_scan_history(limit=50, verdict="malicious")
            all_events = suspicious + malicious
            query_lower = query.lower()
            matched = []
            for e in all_events:
                target = str(e.get("target","")).lower()
                threat = str(e.get("threat_type","")).lower()
                if query_lower in target or query_lower in threat:
                    matched.append({
                        "type":       "scan_event",
                        "target":     e.get("target",""),
                        "verdict":    e.get("verdict",""),
                        "threat_type":e.get("threat_type",""),
                        "confidence": e.get("confidence",0),
                        "ts":         e.get("ts",0),
                        "score":      0.7,
                    })
            return matched[:limit]
        except Exception:
            return []


# ── MITRE ATT&CK technique dictionary (subset, key ones) ─────────────────────
_MITRE_TECHNIQUES = {
    "T1059":    "Command and Scripting Interpreter",
    "T1059.001":"PowerShell",
    "T1059.003":"Windows Command Shell",
    "T1059.004":"Unix Shell",
    "T1059.006":"Python",
    "T1078":    "Valid Accounts",
    "T1078.003":"Local Accounts",
    "T1055":    "Process Injection",
    "T1055.001":"Dynamic-link Library Injection",
    "T1055.012":"Process Hollowing",
    "T1003":    "OS Credential Dumping",
    "T1003.001":"LSASS Memory",
    "T1021":    "Remote Services",
    "T1021.001":"Remote Desktop Protocol",
    "T1021.002":"SMB/Windows Admin Shares",
    "T1021.022":"SSH",
    "T1190":    "Exploit Public-Facing Application",
    "T1133":    "External Remote Services",
    "T1486":    "Data Encrypted for Impact (Ransomware)",
    "T1490":    "Inhibit System Recovery",
    "T1489":    "Service Stop",
    "T1070":    "Indicator Removal",
    "T1070.001":"Clear Windows Event Logs",
    "T1070.004":"File Deletion",
    "T1562":    "Impair Defenses",
    "T1562.001":"Disable or Modify Tools",
    "T1112":    "Modify Registry",
    "T1053":    "Scheduled Task/Job",
    "T1053.005":"Scheduled Task",
    "T1047":    "Windows Management Instrumentation",
    "T1548":    "Abuse Elevation Control Mechanism",
    "T1548.002":"Bypass User Account Control",
    "T1134":    "Access Token Manipulation",
    "T1218":    "System Binary Proxy Execution",
    "T1218.011":"Rundll32",
    "T1027":    "Obfuscated Files or Information",
    "T1041":    "Exfiltration Over C2 Channel",
    "T1048":    "Exfiltration Over Alternative Protocol",
    "T1071":    "Application Layer Protocol",
    "T1071.001":"Web Protocols",
    "T1071.004":"DNS",
    "T1572":    "Protocol Tunneling",
    "T1090":    "Proxy",
    "T1090.003":"Multi-hop Proxy",
    "T1110":    "Brute Force",
    "T1110.001":"Password Guessing",
    "T1110.003":"Password Spraying",
    "T1190":    "Exploit Public-Facing Application",
    "T1566":    "Phishing",
    "T1566.001":"Spearphishing Attachment",
    "T1204":    "User Execution",
    "T1204.002":"Malicious File",
    "T1068":    "Exploitation for Privilege Escalation",
    "T1210":    "Exploitation of Remote Services",
    "T1082":    "System Information Discovery",
    "T1083":    "File and Directory Discovery",
    "T1057":    "Process Discovery",
    "T1049":    "System Network Connections Discovery",
    "T1018":    "Remote System Discovery",
    "T1046":    "Network Service Discovery",
    "T1016":    "System Network Configuration Discovery",
    "T1033":    "System Owner/User Discovery",
    "T1087":    "Account Discovery",
    "T1069":    "Permission Groups Discovery",
    "T1105":    "Ingress Tool Transfer",
    "T1567":    "Exfiltration Over Web Service",
    "T1020":    "Automated Exfiltration",
    "T1560":    "Archive Collected Data",
    "T1074":    "Data Staged",
    "T1025":    "Data from Removable Media",
    "T1119":    "Automated Collection",
    "T1113":    "Screen Capture",
    "T1123":    "Audio Capture",
    "T1125":    "Video Capture",
    "T1056":    "Input Capture (Keylogger)",
    "T1176":    "Browser Extensions",
    "T1553":    "Subvert Trust Controls",
    "T1539":    "Steal Web Session Cookie",
    "T1528":    "Steal Application Access Token",
    "T1558":    "Steal or Forge Kerberos Tickets",
    "T1558.003":"Kerberoasting",
    "T1550":    "Use Alternate Authentication Material",
    "T1601":    "Modify System Image",
    "T1542":    "Pre-OS Boot",
    "T1542.003":"Bootkit",
    "T1014":    "Rootkit",
    "T1098":    "Account Manipulation",
    "T1136":    "Create Account",
    "T1136.001":"Local Account",
    "T1543":    "Create or Modify System Process",
    "T1543.003":"Windows Service",
    "T1546":    "Event Triggered Execution",
    "T1547":    "Boot or Logon Autostart Execution",
    "T1547.001":"Registry Run Keys / Startup Folder",
}


# ── Singletons ────────────────────────────────────────────────────────────────

_graph_builder: Optional[AttackGraphBuilder]   = None
_semantic_search: Optional[SemanticThreatSearch] = None


def get_attack_graph() -> AttackGraphBuilder:
    global _graph_builder
    if _graph_builder is None:
        _graph_builder = AttackGraphBuilder()
    return _graph_builder


def get_semantic_search() -> SemanticThreatSearch:
    global _semantic_search
    if _semantic_search is None:
        _semantic_search = SemanticThreatSearch()
    return _semantic_search
