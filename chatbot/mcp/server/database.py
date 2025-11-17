# chatbot/mcp/server/database.py
# -*- coding: utf-8 -*-
import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

DB_PATH = Path(__file__).resolve().parent / "chat.db"


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """
    chat_logs 테이블 생성:
    - id: PK
    - user_id: nullable (익명이면 None)
    - user_text: 사용자가 입력한 문장
    - reply: 모델이 반환한 답변
    - meta_json: 분석 결과, 감정, 키워드 등 JSON 직렬화
    - created_at: ISO 문자열
    """
    conn = _get_conn()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                user_text TEXT NOT NULL,
                reply TEXT NOT NULL,
                meta_json TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def save_chat_log(
    user_text: str,
    reply: str,
    user_id: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    conn = _get_conn()
    try:
        conn.execute(
            """
            INSERT INTO chat_logs (user_id, user_text, reply, meta_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user_id,
                user_text,
                reply,
                json.dumps(meta or {}, ensure_ascii=False),
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def get_recent_chat_logs(limit: int = 20) -> List[Dict[str, Any]]:
    conn = _get_conn()
    try:
        cur = conn.execute(
            """
            SELECT id, user_id, user_text, reply, meta_json, created_at
            FROM chat_logs
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cur.fetchall()
        result: List[Dict[str, Any]] = []
        for r in rows:
            meta = {}
            if r["meta_json"]:
                try:
                    meta = json.loads(r["meta_json"])
                except json.JSONDecodeError:
                    meta = {}
            result.append(
                {
                    "id": r["id"],
                    "user_id": r["user_id"],
                    "user_text": r["user_text"],
                    "reply": r["reply"],
                    "meta": meta,
                    "created_at": r["created_at"],
                }
            )
        return result
    finally:
        conn.close()


# 모듈 import 시 자동 초기화
init_db()
