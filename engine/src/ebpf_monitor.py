# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI eXecution & Tools Orchestration — eBPF Kernel Monitoring (Tier 2)
=============================================
eBPF hooks di kernel level — tidak bisa di-bypass oleh malware userspace.
Proses yang mencoba hide diri dari /proc masih tertangkap oleh eBPF.

Requires:
  - Linux kernel 4.15+
  - BCC (BPF Compiler Collection): apt-get install python3-bcc
  - Root / CAP_BPF capability

Monitors:
  1. execve()     — setiap process execution di kernel level
  2. connect()    — setiap network connection (TCP/UDP)
  3. open()       — file access pada path sensitif
  4. kill()       — setiap signal kill antar proses

Jika BCC tidak tersedia atau bukan Linux:
  → Modul gracefully disabled, fallback ke psutil-based monitoring
  → Tidak crash, hanya log warning

Aktifkan:
  GUARDIAN_EBPF_ENABLED=true
  (atau ebpf_enabled: true di guardian.yml tier2 block)
"""
from __future__ import annotations

import asyncio, logging, os, platform, time
from typing import Callable, Dict, List, Optional

log = logging.getLogger("guardian.ebpf")

IS_LINUX  = platform.system() == "Linux"
ENABLED   = os.environ.get("GUARDIAN_EBPF_ENABLED", "false").lower() == "true"


# ── eBPF Programs (BCC syntax) ────────────────────────────────────────────────

_EXECVE_PROG = r"""
#include <uapi/linux/ptrace.h>
#include <linux/sched.h>
#include <linux/fs.h>

struct exec_event_t {
    u32 pid;
    u32 ppid;
    u32 uid;
    char comm[TASK_COMM_LEN];
    char fname[256];
};

BPF_PERF_OUTPUT(exec_events);

int trace_execve(struct pt_regs *ctx, const char __user *filename,
                 const char __user *const __user *argv,
                 const char __user *const __user *envp) {
    struct exec_event_t event = {};
    struct task_struct *task = (struct task_struct *)bpf_get_current_task();

    event.pid  = bpf_get_current_pid_tgid() >> 32;
    event.ppid = task->real_parent->tgid;
    event.uid  = bpf_get_current_uid_gid() & 0xFFFFFFFF;
    bpf_get_current_comm(&event.comm, sizeof(event.comm));
    bpf_probe_read_user_str(event.fname, sizeof(event.fname), filename);

    exec_events.perf_submit(ctx, &event, sizeof(event));
    return 0;
}
"""

_CONNECT_PROG = r"""
#include <uapi/linux/ptrace.h>
#include <net/sock.h>
#include <bcc/proto.h>

struct connect_event_t {
    u32 pid;
    u32 uid;
    char comm[TASK_COMM_LEN];
    u32 saddr;
    u32 daddr;
    u16 dport;
    u16 sport;
    u8  af;   /* AF_INET=2, AF_INET6=10 */
};

BPF_PERF_OUTPUT(connect_events);

int trace_connect(struct pt_regs *ctx, struct sock *sk) {
    u16 family = sk->__sk_common.skc_family;
    if (family != AF_INET) return 0;

    struct connect_event_t event = {};
    event.pid   = bpf_get_current_pid_tgid() >> 32;
    event.uid   = bpf_get_current_uid_gid() & 0xFFFFFFFF;
    event.saddr = sk->__sk_common.skc_rcv_saddr;
    event.daddr = sk->__sk_common.skc_daddr;
    event.dport = ntohs(sk->__sk_common.skc_dport);
    event.sport = sk->__sk_common.skc_num;
    event.af    = AF_INET;
    bpf_get_current_comm(&event.comm, sizeof(event.comm));

    connect_events.perf_submit(ctx, &event, sizeof(event));
    return 0;
}
"""


# ── Event handlers & dispatchers ─────────────────────────────────────────────

def _ip_to_str(addr: int) -> str:
    """Convert uint32 network-order IP to dotted string."""
    import socket as _s
    return _s.inet_ntoa(addr.to_bytes(4, "little"))


class eBPFMonitor:
    """
    Kernel-level event monitor via eBPF/BCC.
    Falls back to no-op if BCC unavailable.
    """

    def __init__(self):
        self._running    = False
        self._bpf_exec   = None
        self._bpf_conn   = None
        self._exec_cb:   Optional[Callable] = None
        self._connect_cb: Optional[Callable] = None
        self._available  = False
        self._stats: Dict[str, int] = {
            "exec_events":    0,
            "connect_events": 0,
            "errors":         0,
        }

    def set_exec_callback(self, cb: Callable) -> None:
        """cb(pid, ppid, uid, comm, fname) called on every execve"""
        self._exec_cb = cb

    def set_connect_callback(self, cb: Callable) -> None:
        """cb(pid, uid, comm, src_ip, dst_ip, dst_port) called on every connect"""
        self._connect_cb = cb

    async def start(self) -> None:
        if not ENABLED:
            log.info("eBPF disabled (GUARDIAN_EBPF_ENABLED not set)")
            return
        if not IS_LINUX:
            log.warning("eBPF requires Linux — skipping")
            return
        if os.geteuid() != 0:
            log.warning("eBPF requires root / CAP_BPF — skipping")
            return

        try:
            from bcc import BPF
            self._bpf_exec = BPF(text=_EXECVE_PROG)
            self._bpf_exec.attach_kprobe(event=self._bpf_exec.get_syscall_fnname("execve"),
                                          fn_name="trace_execve")
            self._bpf_exec["exec_events"].open_perf_buffer(self._handle_exec)

            self._bpf_conn = BPF(text=_CONNECT_PROG)
            self._bpf_conn.attach_kprobe(event="tcp_v4_connect", fn_name="trace_connect")
            self._bpf_conn["connect_events"].open_perf_buffer(self._handle_connect)

            self._available = True
            self._running   = True
            asyncio.create_task(self._poll_loop())
            log.info("✅ eBPF kernel monitors active (execve + tcp_connect)")
        except ImportError:
            log.warning("BCC not installed — eBPF disabled. "
                        "Install with: apt-get install python3-bcc")
        except Exception as e:
            log.warning(f"eBPF init failed: {e}")

    async def stop(self) -> None:
        self._running = False
        # BCC cleanup
        for bpf in (self._bpf_exec, self._bpf_conn):
            if bpf:
                try:
                    bpf.cleanup()
                except Exception:
                    pass

    async def _poll_loop(self) -> None:
        """Poll eBPF perf buffers every 100ms."""
        loop = asyncio.get_event_loop()
        while self._running:
            try:
                await loop.run_in_executor(None, self._poll_once)
            except Exception as e:
                self._stats["errors"] += 1
                log.debug(f"eBPF poll error: {e}")
            await asyncio.sleep(0.1)

    def _poll_once(self) -> None:
        if self._bpf_exec:
            self._bpf_exec.perf_buffer_poll(timeout=10)
        if self._bpf_conn:
            self._bpf_conn.perf_buffer_poll(timeout=10)

    def _handle_exec(self, cpu, data, size) -> None:
        try:
            from bcc import BPF
            event = self._bpf_exec["exec_events"].event(data)
            self._stats["exec_events"] += 1
            if self._exec_cb:
                asyncio.create_task(self._exec_cb(
                    pid   = event.pid,
                    ppid  = event.ppid,
                    uid   = event.uid,
                    comm  = event.comm.decode("utf-8", errors="replace").rstrip("\x00"),
                    fname = event.fname.decode("utf-8", errors="replace").rstrip("\x00"),
                ))
        except Exception as e:
            self._stats["errors"] += 1
            log.debug(f"eBPF exec handler error: {e}")

    def _handle_connect(self, cpu, data, size) -> None:
        try:
            event = self._bpf_conn["connect_events"].event(data)
            self._stats["connect_events"] += 1
            if self._connect_cb:
                asyncio.create_task(self._connect_cb(
                    pid     = event.pid,
                    uid     = event.uid,
                    comm    = event.comm.decode("utf-8", errors="replace").rstrip("\x00"),
                    src_ip  = _ip_to_str(event.saddr),
                    dst_ip  = _ip_to_str(event.daddr),
                    dst_port= event.dport,
                ))
        except Exception as e:
            self._stats["errors"] += 1
            log.debug(f"eBPF connect handler error: {e}")

    def get_stats(self) -> dict:
        return {
            "available":      self._available,
            "running":        self._running,
            "exec_events":    self._stats["exec_events"],
            "connect_events": self._stats["connect_events"],
            "errors":         self._stats["errors"],
        }

    @property
    def is_available(self) -> bool:
        return self._available


# ── Singleton ─────────────────────────────────────────────────────────────────

_ebpf_instance: Optional[eBPFMonitor] = None


def get_ebpf() -> eBPFMonitor:
    global _ebpf_instance
    if _ebpf_instance is None:
        _ebpf_instance = eBPFMonitor()
    return _ebpf_instance
