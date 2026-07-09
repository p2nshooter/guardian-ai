# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Edge — OpenAI-compatible AI Gateway API"""
from __future__ import annotations
import asyncio,logging,os,time,yaml,json
from contextlib import asynccontextmanager
from typing import Dict,List,Optional,Any
from fastapi import FastAPI,HTTPException,Depends,Header,Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel,Field
import httpx
from .engine import EdgeEngine, RoutingMode

log = logging.getLogger("edge.api")
CONFIG_PATH = os.environ.get("EDGE_CONFIG","/edge/config/edge.yml")
_config:Dict={}; _engine:Optional[EdgeEngine]=None
_license_valid=False; _grace_start=0.0

def _load():
    try: return yaml.safe_load(open(CONFIG_PATH)) or {}
    except: return {}

async def _validate(cfg):
    key=cfg.get("edge",{}).get("license_key","")
    url=cfg.get("edge",{}).get("license_validate_url","https://axto.io/api/license-validate")
    if not key or "XXXX" in key: return False
    try:
        import hashlib,socket
        mid=open("/etc/machine-id").read().strip() if os.path.exists("/etc/machine-id") else hashlib.sha256(socket.gethostname().encode()).hexdigest()[:32]
        async with httpx.AsyncClient(timeout=15) as c:
            r=await c.post(url,json={"license_key":key,"machine_id":mid,"product":"edge"})
            return r.json().get("valid",False)
    except: return False

@asynccontextmanager
async def lifespan(app):
    global _config,_engine,_license_valid,_grace_start
    _config=_load()
    _license_valid=await _validate(_config)
    if not _license_valid: _grace_start=time.time()
    ecfg=_config.get("edge",{})
    _engine=EdgeEngine({**ecfg,"customers":_config.get("customers",[])},
                       db_path=ecfg.get("db_path","/edge/data/edge.db"))
    await _engine.start()
    log.info("AXTO Edge API ready ✓")
    yield
    if _engine: await _engine.stop()

app = FastAPI(title="AXTO Edge — AI Gateway",version="1.0.0",lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_methods=["*"],allow_headers=["*"])

def _lic():
    if not _license_valid and _grace_start and time.time()-_grace_start>14400:
        raise HTTPException(503,"License expired")

def _get_api_key(authorization:Optional[str]=Header(None),x_api_key:Optional[str]=Header(None,alias="X-API-Key")):
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    if x_api_key: return x_api_key
    return ""

class ChatMsg(BaseModel):
    role: str; content: Any

class ChatReq(BaseModel):
    model: Optional[str]=None
    messages: List[ChatMsg]
    max_tokens: int=1024; temperature: float=0.7
    stream: bool=False
    response_format: Optional[Dict]=None

class CustomerReq(BaseModel):
    api_key:str; customer_id:str; rpm:int=60; tpm:int=100000
    tpd:int=2000000; budget_daily_usd:float=0.0

@app.get("/health")
async def health():
    return {"status":"ok","product":"axto-edge","version":"1.0.0",
            "license_valid":_license_valid,"timestamp":time.time()}

@app.post("/v1/chat/completions")
async def chat(req:ChatReq, api_key:str=Depends(_get_api_key)):
    _lic()
    if not _engine: raise HTTPException(503,"Engine initializing")
    result=await _engine.process(
        messages=[m.dict() for m in req.messages],
        model=req.model, api_key=api_key,
        max_tokens=req.max_tokens, temperature=req.temperature,
        stream=req.stream,
    )
    if "error" in result:
        status=result.get("status_code",500)
        raise HTTPException(status,detail=result["error"])
    return result

@app.get("/v1/models")
async def list_models(_:str=Depends(_get_api_key)):
    _lic()
    if not _engine: raise HTTPException(503)
    return {"object":"list","data":_engine.list_models()}

@app.get("/v1/stats")
async def stats(api_key:Optional[str]=None, _:str=Depends(_get_api_key)):
    _lic()
    if not _engine: raise HTTPException(503)
    return await _engine.get_stats(api_key)

@app.get("/v1/billing/{customer_id}/{month}")
async def billing(customer_id:str, month:str, _:str=Depends(_get_api_key)):
    _lic()
    if not _engine: raise HTTPException(503)
    return await _engine.get_customer_bill(customer_id, month)

@app.get("/v1/cache/stats")
async def cache_stats(_:str=Depends(_get_api_key)):
    _lic()
    if not _engine: raise HTTPException(503)
    return _engine._cache.stats
