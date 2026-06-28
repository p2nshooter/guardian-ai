# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — AI eXecution & Tools Orchestration | Semantic Router
Routes each job to the RIGHT model based on CONTENT and COST, not just round-robin.

Components:
  TaskClassifier        — Detects what the prompt is ABOUT → category → best model
  PromptInjectionDetector — Blocks prompt injection / jailbreak attempts
  QualityScorer         — Scores response quality; triggers retry with better model if low
  CostOptimizer         — Picks cheapest model that meets quality bar
  SemanticCacheKeyGen   — Generates deterministic cache keys for dedup

Categories → Best Model Priority:
  code       → claude-sonnet / gpt-4o / deepseek-chat
  reasoning  → o1-mini / claude-sonnet / deepseek-reasoner
  creative   → claude-sonnet / gpt-4o
  translation→ groq llama (cheap, fast)
  summarize  → groq llama / gemini-flash-lite
  qa         → groq / gemini-flash-lite
  security   → claude-sonnet / gpt-4o  (high accuracy needed)
  long_doc   → gemini-1.5-pro (2M context) / claude-sonnet
  image      → dall-e-3 / sdxl (GPU worker)
  default    → cheapest available
"""
from __future__ import annotations

import hashlib, logging, re
from typing import Dict, List, Optional, Tuple

log = logging.getLogger("orchestra.semantic_router")


# ── Category keyword definitions ──────────────────────────────────────────────

CATEGORIES: Dict[str, List[str]] = {
    "code": [
        "code", "function", "class", "debug", "programming", "python", "javascript",
        "typescript", "sql", "bash", "git", "api", "implement", "refactor", "bug",
        "error", "compile", "syntax", "algorithm", "data structure", "script",
        "library", "framework", "react", "nodejs", "golang", "rust", "c++", "java",
        "dockerfile", "kubernetes", "terraform", "ansible",
    ],
    "reasoning": [
        "why", "explain", "analyze", "reason", "think", "step by step", "math",
        "calculate", "proof", "logic", "deduce", "solve", "equation", "theorem",
        "derive", "compare", "evaluate", "assess", "determine", "infer",
    ],
    "creative": [
        "write", "story", "poem", "essay", "creative", "imagine", "fiction",
        "narrative", "screenplay", "blog", "article", "describe", "compose",
        "lyric", "novel", "character", "plot", "dialogue", "tone",
    ],
    "translation": [
        "translate", "in spanish", "en français", "auf deutsch", "bahasa",
        "portuguese", "chinese", "japanese", "arabic", "language", "korean",
        "italian", "russian", "hindi", "terjemahkan", "traduction",
    ],
    "summarize": [
        "summarize", "summary", "tldr", "brief", "overview", "key points",
        "main idea", "shorten", "condense", "extract", "bullet points",
        "highlight", "recap",
    ],
    "qa": [
        "what is", "who is", "when", "where", "how many", "what year",
        "define", "tell me about", "explain what", "what does", "who was",
    ],
    "security": [
        "malware", "vulnerability", "exploit", "attack", "threat", "security",
        "cybersecurity", "pentest", "hack", "injection", "xss", "csrf", "siem",
        "forensic", "incident", "ioc", "ttps", "mitre", "cve", "patch",
    ],
    "long_doc": [],   # Detected by length, not keywords
    "image":    [],   # Detected by task_type field
    "audio":    [],   # Detected by task_type field
}

# Best provider/model priority per category
CATEGORY_ROUTING: Dict[str, List[Tuple[str, str]]] = {
    "code": [
        ("anthropic", "claude-sonnet-4-6"),
        ("openai",    "gpt-4o"),
        ("deepseek",  "deepseek-chat"),
        ("groq",      "llama-3.3-70b-versatile"),
    ],
    "reasoning": [
        ("openai",    "o1-mini"),
        ("anthropic", "claude-sonnet-4-6"),
        ("deepseek",  "deepseek-reasoner"),
        ("groq",      "llama-3.3-70b-versatile"),
    ],
    "creative": [
        ("anthropic", "claude-sonnet-4-6"),
        ("openai",    "gpt-4o"),
        ("openai",    "gpt-4o-mini"),
    ],
    "translation": [
        ("groq",   "llama-3.3-70b-versatile"),
        ("openai", "gpt-4o-mini"),
        ("gemini", "gemini-2.0-flash"),
    ],
    "summarize": [
        ("groq",      "llama-3.1-8b-instant"),
        ("gemini",    "gemini-2.0-flash-lite"),
        ("openai",    "gpt-4o-mini"),
        ("anthropic", "claude-haiku-4-5-20251001"),
    ],
    "qa": [
        ("groq",   "llama-3.1-8b-instant"),
        ("gemini", "gemini-2.0-flash-lite"),
        ("deepseek","deepseek-chat"),
    ],
    "security": [
        ("anthropic", "claude-sonnet-4-6"),
        ("openai",    "gpt-4o"),
        ("anthropic", "claude-haiku-4-5-20251001"),
    ],
    "long_doc": [
        ("gemini",    "gemini-1.5-pro"),
        ("anthropic", "claude-sonnet-4-6"),
        ("openai",    "gpt-4o"),
    ],
    "image": [
        ("openai", "dall-e-3"),
        ("ollama", "stable-diffusion"),
    ],
    "audio": [
        ("openai", "whisper-1"),
    ],
    "default": [
        ("groq",   "llama-3.1-8b-instant"),
        ("gemini", "gemini-2.0-flash"),
        ("openai", "gpt-4o-mini"),
        ("deepseek","deepseek-chat"),
    ],
}

# Cheapest acceptable model per category (cost-first mode)
CATEGORY_CHEAP: Dict[str, Tuple[str, str]] = {
    "code":        ("deepseek",  "deepseek-chat"),
    "reasoning":   ("deepseek",  "deepseek-reasoner"),
    "creative":    ("openai",    "gpt-4o-mini"),
    "translation": ("groq",      "llama-3.1-8b-instant"),
    "summarize":   ("groq",      "llama-3.1-8b-instant"),
    "qa":          ("groq",      "llama-3.1-8b-instant"),
    "security":    ("anthropic", "claude-haiku-4-5-20251001"),
    "long_doc":    ("gemini",    "gemini-1.5-flash"),
    "default":     ("groq",      "llama-3.1-8b-instant"),
}


# ─────────────────────────────────────────────────────────────────────────────
# TaskClassifier
# ─────────────────────────────────────────────────────────────────────────────

class TaskClassifier:
    """
    Classify prompt intent → category → best model selection.
    Uses weighted keyword matching + length heuristics + task_type override.
    """

    def classify(self, messages: list, task_type: str = "chat") -> Tuple[str, float]:
        """Returns (category, confidence) tuple."""
        # task_type override (from job submission)
        if task_type in ("image", "transcribe", "audio"):
            return ("image" if task_type == "image" else "audio"), 1.0

        text = self._extract_text(messages).lower()

        # Long document threshold (>4000 chars = use large context model)
        if len(text) > 4000:
            return "long_doc", 0.85

        # Weighted keyword scoring
        scores: Dict[str, float] = {}
        for cat, keywords in CATEGORIES.items():
            if not keywords:
                continue
            hits  = sum(1 for kw in keywords if kw in text)
            # Weight by keyword specificity: longer = more specific
            wscore = sum(len(kw) * (1 if kw in text else 0) for kw in keywords)
            scores[cat] = (hits / max(len(keywords), 10)) + wscore * 0.001

        if not scores:
            return "default", 0.5

        best_cat   = max(scores, key=lambda c: scores[c])
        best_score = scores[best_cat]

        if best_score < 0.03:
            return "default", 0.5

        return best_cat, min(best_score * 5, 0.95)

    def get_preferred_provider_model(
        self, category: str, available_providers: set,
        cost_first: bool = False
    ) -> Optional[Tuple[str, str]]:
        """Return best provider/model for category that is available."""
        if cost_first and category in CATEGORY_CHEAP:
            provider, model = CATEGORY_CHEAP[category]
            if not available_providers or provider in available_providers:
                return provider, model

        routing = CATEGORY_ROUTING.get(category, CATEGORY_ROUTING["default"])
        for provider, model in routing:
            if not available_providers or provider in available_providers:
                return provider, model
        return None

    @staticmethod
    def _extract_text(messages: list) -> str:
        parts = []
        for m in messages:
            content = m.get("content", "")
            if isinstance(content, str):
                parts.append(content)
            elif isinstance(content, list):
                for block in content:
                    if isinstance(block, dict):
                        parts.append(block.get("text", ""))
        return " ".join(parts)


# ─────────────────────────────────────────────────────────────────────────────
# PromptInjectionDetector
# ─────────────────────────────────────────────────────────────────────────────

class PromptInjectionDetector:
    """
    Detect and block prompt injection / jailbreak attempts.
    Protects downstream AI models from being manipulated.
    All patterns are compiled once at class load time.
    """

    PATTERNS: List[Tuple[re.Pattern, str, float]] = [
        # Classic context reset
        (re.compile(r"(?i)ignore\s+(previous|above|all)\s+(instructions?|prompts?|context)", re.M),
         "ignore_instructions", 0.95),
        # DAN / jailbreak persona
        (re.compile(r"(?i)you\s+are\s+now\s+(DAN|jailbreak|dev\s+mode|unrestricted|evil)", re.M),
         "jailbreak_persona", 0.92),
        # Context wipe
        (re.compile(r"(?i)forget\s+everything\s+(?:you|i|we)\s+(know|said|told)", re.M),
         "context_reset", 0.85),
        # System prompt extraction
        (re.compile(r"(?i)(print|show|reveal|display)\s+your\s+(system\s+)?prompt|reveal\s+your\s+instructions", re.M),
         "prompt_extraction", 0.90),
        # Evil persona
        (re.compile(r"(?i)act\s+as\s+(?:if\s+you\s+(?:are|were)\s+)?(?:a\s+)?(?:evil|malicious|unrestricted|jailbreak)", re.M),
         "evil_persona", 0.88),
        # Safety bypass
        (re.compile(r"(?i)(confidential|secret).*?bypass|override\s+safety|disable\s+filter", re.M),
         "safety_bypass", 0.82),
        # LLM token injection
        (re.compile(r"<\|(?:im_start|endoftext|system|user|assistant)\|>", re.M),
         "token_injection", 0.90),
        (re.compile(r"\[INST\]|\[/INST\]|<<SYS>>|<</SYS>>", re.M),
         "llm_token_injection", 0.88),
        # Role switching
        (re.compile(r"(?i)your\s+(?:new\s+)?(?:role|persona|identity|name)\s+is", re.M),
         "role_injection", 0.78),
        # Indirect injection
        (re.compile(r"(?i)when\s+(?:you\s+)?(?:see|encounter|read)\s+.*\s+(?:then|you\s+should|always)", re.M),
         "indirect_injection", 0.72),
        # Base64 encoded instructions
        (re.compile(r"(?i)base64.*?decode.*?instruction|decode\s+this\s+command", re.M),
         "encoded_injection", 0.80),
        # Multilingual injection attempt
        (re.compile(r"(?i)ignorar\s+instrucciones|ignorer\s+les\s+instructions|ignoriere\s+anweisungen", re.M),
         "multilingual_injection", 0.75),
    ]

    def check(self, messages: list) -> Optional[Dict]:
        """Check messages for injection. Returns finding dict or None."""
        text = " ".join(
            m.get("content", "") if isinstance(m.get("content"), str) else ""
            for m in messages
        )
        for pattern, inj_type, confidence in self.PATTERNS:
            if pattern.search(text):
                log.warning(f"🚨 Prompt injection detected: {inj_type} (conf={confidence:.0%})")
                return {
                    "detected":   True,
                    "type":       inj_type,
                    "confidence": confidence,
                    "blocked":    True,
                }
        return None


# ─────────────────────────────────────────────────────────────────────────────
# QualityScorer
# ─────────────────────────────────────────────────────────────────────────────

class QualityScorer:
    """
    Score AI response quality 0.0–1.0.
    Used by job_router to decide if a retry with a better model is warranted.

    Heuristics:
      - Too short for complex tasks = bad
      - Refusal/apology language = bad
      - Response echoes the prompt = bad
      - Truncated/incomplete ending = bad
      - Code block in code task = good
      - Structured output = good
    """

    REFUSAL_PATTERN = re.compile(
        r"(?i)(i(?:'m|\s+am)\s+(?:sorry|unable|not\s+able)|i\s+cannot|i\s+can't|"
        r"as\s+an\s+ai|i\s+don'?t\s+have|i\s+(?:must\s+)?(?:decline|refuse)|"
        r"i\s+apologize|i\s+won'?t|unfortunately\s+i|i'm\s+not\s+able)",
        re.M,
    )

    INCOMPLETE_ENDINGS = ("...", "—", " and", " or", " but", " however",
                          " therefore", " thus", " since")

    def score(self, prompt: str, response: str, category: str = "default") -> float:
        """Return quality score 0.0–1.0."""
        if not response:
            return 0.0

        prompt_len = len(prompt)
        resp_len   = len(response)
        score      = 0.50

        # Length heuristics by category
        if category in ("code", "reasoning"):
            if resp_len < 80:
                score -= 0.35
            elif resp_len > 400:
                score += 0.20
        elif category == "summarize":
            ratio = resp_len / max(prompt_len, 1)
            if 0.05 <= ratio <= 0.45:
                score += 0.20
        elif category == "translation":
            # Translation should be roughly same length as original
            ratio = resp_len / max(prompt_len, 1)
            if 0.5 <= ratio <= 2.0:
                score += 0.15

        # Refusal detection
        if self.REFUSAL_PATTERN.search(response):
            score -= 0.40

        # Prompt echo detection (bad — model just repeated the question)
        if prompt_len > 50:
            prompt_words = set(prompt.lower().split()[:20])
            resp_words   = set(response.lower().split()[:20])
            overlap = len(prompt_words & resp_words) / max(len(prompt_words), 1)
            if overlap > 0.70:
                score -= 0.30

        # Incomplete/truncated response
        if any(response.rstrip().endswith(e) for e in self.INCOMPLETE_ENDINGS):
            score -= 0.20

        # Positive signals
        if category == "code":
            if "```" in response or "def " in response or "function " in response:
                score += 0.25
            if "import " in response or "class " in response:
                score += 0.10

        if category == "reasoning":
            if any(marker in response.lower() for marker in
                   ["step 1", "first,", "therefore", "because", "thus"]):
                score += 0.15

        # Structured output signal (JSON, markdown headers, lists)
        if response.count("\n") > 3:
            score += 0.05
        if "```" in response or response.count("##") > 0:
            score += 0.05

        return max(0.0, min(1.0, score))

    def needs_retry(self, score: float, threshold: float = 0.30) -> bool:
        return score < threshold

    def upgrade_category(self, category: str) -> Optional[Tuple[str, str]]:
        """
        Suggest a better model for retry when quality is low.
        Always steps up to the highest quality option.
        """
        upgrades = {
            "code":     ("anthropic", "claude-sonnet-4-6"),
            "reasoning":("openai",    "o1-mini"),
            "creative": ("anthropic", "claude-sonnet-4-6"),
            "security": ("anthropic", "claude-sonnet-4-6"),
            "default":  ("openai",    "gpt-4o"),
        }
        return upgrades.get(category, upgrades["default"])


# ─────────────────────────────────────────────────────────────────────────────
# SemanticCacheKeyGen
# ─────────────────────────────────────────────────────────────────────────────

class SemanticCacheKeyGen:
    """
    Generate deterministic cache keys for semantic deduplication.
    Same prompt + same model = same key → avoid redundant API calls.
    """

    @staticmethod
    def make_key(messages: list, model: str = "", max_tokens: int = 0,
                 temperature: float = 0.7) -> str:
        """
        Generate SHA-256 based cache key.
        Temperature > 0.3 disables caching (non-deterministic responses).
        """
        if temperature > 0.30:
            return ""   # Non-deterministic — don't cache

        text = "|".join(
            (m.get("role", "") + ":" + (
                m.get("content", "") if isinstance(m.get("content"), str)
                else str(m.get("content", ""))
            ))
            for m in messages
        )
        raw = f"{model}|{max_tokens}|{text}"
        return hashlib.sha256(raw.encode()).hexdigest()[:40]


# ── Singletons ────────────────────────────────────────────────────────────────

_classifier   = TaskClassifier()
_inj_detector = PromptInjectionDetector()
_quality      = QualityScorer()
_cache_key    = SemanticCacheKeyGen()


def get_classifier()    -> TaskClassifier:           return _classifier
def get_inj_detector()  -> PromptInjectionDetector:  return _inj_detector
def get_quality_scorer()-> QualityScorer:            return _quality
def get_cache_keygen()  -> SemanticCacheKeyGen:      return _cache_key
