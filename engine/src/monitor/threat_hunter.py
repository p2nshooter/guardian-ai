# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI-Powered Threat Hunter
Proactive threat hunting menggunakan AI untuk menganalisis patterns
dari local DB dan mencari signs of compromise yang belum terdeteksi.
"""
from __future__ import annotations
import asyncio, json, logging, os, time
from src.database import get_db

log = logging.getLogger("guardian.hunter")


class ThreatHunter:
    def __init__(self):
        self._node_id = os.environ.get("GUARDIAN_NODE_ID","core")
        self._running = False

    async def start(self) -> None:
        self._running = True
        asyncio.create_task(self._hunt_loop())
        log.info("Threat hunter started (runs every 6h)")

    async def stop(self) -> None:
        self._running = False

    async def _hunt_loop(self) -> None:
        await asyncio.sleep(60)  # Warm-up
        while self._running:
            try:
                await self._run_hunt()
            except Exception as e:
                log.debug(f"Threat hunt error: {e}")
            await asyncio.sleep(6 * 3600)  # Every 6 hours

    async def _run_hunt(self) -> None:
        log.info("🔍 Threat hunt starting...")
        db  = await get_db()
        stats = await db.get_stats(hours=6)

        # Only hunt if there's activity to analyze
        if stats["total_scans"] == 0:
            return

        # Collect recent events for AI analysis
        scans    = await db.get_scan_history(limit=50, verdict="suspicious")
        procs    = await db.get_scan_history(limit=20)
        patterns = await db.get_learned_patterns(min_hits=2)

        context = {
            "stats_6h":        stats,
            "suspicious_scans": scans[:10],
            "top_threats":     stats.get("top_threats",[]),
            "top_mitre":       stats.get("top_techniques",[]),
            "learned_patterns": [p["pattern_value"] for p in patterns[:20]],
        }

        prompt = f"""You are a threat hunter analyzing security events from the last 6 hours.

Security data:
{json.dumps(context, indent=2, default=str)[:4000]}

Based on this data:
1. Are there signs of APT (Advanced Persistent Threat) activity?
2. Is there evidence of lateral movement?
3. Are there patterns suggesting data exfiltration?
4. Any signs of privilege escalation attempts?
5. Recommend 3 specific threat hunting queries to investigate further.

Respond in JSON:
{{
  "apt_indicators": [],
  "lateral_movement": false,
  "exfiltration_risk": "low|medium|high",
  "privilege_esc": false,
  "hunting_queries": [],
  "risk_summary": "",
  "recommended_actions": []
}}"""

        try:
            from src.core import GuardianCore
            ai = GuardianCore.get().ai_pool
            if ai.vendor_count == 0:
                return

            resp = await ai.complete(prompt, strategy="quality_first")
            if resp.error:
                return

            result = json.loads(resp.text)
            log.info(f"🎯 Hunt complete: exfil_risk={result.get('exfiltration_risk','?')} "
                     f"lateral={result.get('lateral_movement','?')}")

            # Log hunting findings to DB
            if any([result.get("apt_indicators"), result.get("lateral_movement"),
                    result.get("exfiltration_risk") in ("medium","high")]):
                await db.log_scan(
                    self._node_id, "threat_hunt", "ai_hunt_finding",
                    verdict="suspicious", confidence=0.6,
                    threat_type="threat_hunt_finding",
                    indicators=result.get("apt_indicators",[]) + result.get("recommended_actions",[]),
                    method="ai_threat_hunt",
                    raw=result
                )
        except json.JSONDecodeError:
            pass
        except Exception as e:
            log.debug(f"Hunt AI error: {e}")
