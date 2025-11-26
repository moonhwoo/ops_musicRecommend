# chatbot/mcp/client/client.py
# -*- coding: utf-8 -*-
from __future__ import annotations

from typing import Any, Dict, List, Optional

import requests

BASE_URL = "http://127.0.0.1:8000"  # FastAPI 서버 주소


def analyze(text: str) -> Dict[str, Any]:
    """
    /analyze 엔드포인트 호출.
    반환: {
      "mood": {...},
      "keywords": [{"text": ..., "label": ...}, ...],
      "analysis_json": "...",
      "keywords_csv": "...",
      "raw_text": "..."
    }
    """
    resp = requests.post(f"{BASE_URL}/analyze", json={"text": text})
    resp.raise_for_status()
    return resp.json()


def recommend(analysis_json: str) -> List[Dict[str, Any]]:
    """
    /recommend 엔드포인트 호출.
    반환: 곡 리스트 (각 곡은 title/artist/reason/link/embed_url 등 포함)
    """
    if not analysis_json:
        return []
    resp = requests.post(f"{BASE_URL}/recommend", json={"analysis_json": analysis_json})
    resp.raise_for_status()
    data = resp.json()
    return data.get("songs", [])


def chat(
    messages: List[Dict[str, str]],
    user_id: Optional[str] = None,
) -> str:
    """
    /chat 엔드포인트 호출.
    messages: [{"role": "user"|"assistant", "content": "..."} ...]
    반환: reply 문자열
    """
    payload = {"messages": messages, "user_id": user_id}
    resp = requests.post(f"{BASE_URL}/chat", json=payload)
    resp.raise_for_status()
    data = resp.json()
    return data.get("reply", "")