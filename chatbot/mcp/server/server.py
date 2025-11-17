# chatbot/mcp/server/server.py
# -*- coding: utf-8 -*-
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .model import (
    analyze_text_logic,
    recommend_songs_via_openai_logic,
    attach_spotify_links_logic,
)
from .database import save_chat_log, get_recent_chat_logs

# =========================
# Pydantic 스키마 정의
# =========================
class AnalyzeRequest(BaseModel):
    text: str


class KeywordSpan(BaseModel):
    text: str
    label: str


class AnalyzeResponse(BaseModel):
    mood: Dict[str, float]
    keywords: List[KeywordSpan]
    analysis_json: str
    keywords_csv: str
    raw_text: str


class RecommendRequest(BaseModel):
    analysis_json: str


class Song(BaseModel):
    title: str
    artist: str
    reason: str
    link: str = ""
    preview_url: Optional[str] = None
    track_id: Optional[str] = None
    uri: Optional[str] = None
    embed_url: Optional[str] = None


class RecommendResponse(BaseModel):
    songs: List[Song]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    songs: List[Song] = []


class ChatLog(BaseModel):
    id: int
    user_id: Optional[str]
    user_text: str
    reply: str
    meta: Dict[str, Any]
    created_at: str


# =========================
# FastAPI 앱 정의
# =========================
app = FastAPI(title="OPS Music Recommend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 필요하면 도메인 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_endpoint(req: AnalyzeRequest) -> AnalyzeResponse:
    mood_dict, kw_spans, analysis_json, keywords_csv, raw_text = analyze_text_logic(
        req.text
    )
    keywords = [KeywordSpan(text=k, label=label) for (k, label) in kw_spans]
    return AnalyzeResponse(
        mood=mood_dict,
        keywords=keywords,
        analysis_json=analysis_json,
        keywords_csv=keywords_csv,
        raw_text=raw_text,
    )


@app.post("/recommend", response_model=RecommendResponse)
def recommend_endpoint(req: RecommendRequest) -> RecommendResponse:
    songs = recommend_songs_via_openai_logic(req.analysis_json)
    songs_with_links = attach_spotify_links_logic(songs, min_valid=4)
    return RecommendResponse(
        songs=[
            Song(
                title=s.get("title", ""),
                artist=s.get("artist", ""),
                reason=s.get("reason", ""),
                link=s.get("link", ""),
                preview_url=s.get("preview_url", ""),
                track_id=s.get("track_id", ""),
                uri=s.get("uri", ""),
                embed_url=s.get("embed_url", ""),
            )
            for s in songs_with_links
        ]
    )


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest) -> ChatResponse:
    """
    React TextChat에서 사용하기 좋은 통합 채팅 엔드포인트.
    - messages: [{role, content}] 리스트
    - 마지막 user 메시지를 기준으로 분석 + 추천을 수행,
      요약된 한국어 답변 문자열만 반환한다.
    """
    user_text = ""
    for m in reversed(req.messages):
        if m.role == "user":
            user_text = m.content
            break

    user_text = (user_text or "").strip()
    if not user_text:
        return ChatResponse(
            reply="메시지가 비어 있어요. 지금 기분이나 상황을 한 번 적어줄래요?"
        )

    # 1) 감정/키워드 분석
    mood_dict, kw_spans, analysis_json, keywords_csv, raw_text = analyze_text_logic(
        user_text
    )

    # 2) 추천 + Spotify 링크
    songs = recommend_songs_via_openai_logic(analysis_json)
    songs_with_links = attach_spotify_links_logic(songs, min_valid=4)

    if not songs_with_links:
        reply_text = (
            "지금은 잘 맞는 곡을 찾지 못했어요. "
            "조금만 더 자세히 마음이나 상황을 써주면 더 잘 찾아볼게요."
        )
        save_chat_log(
            user_text=user_text,
            reply=reply_text,
            user_id=req.user_id,
            meta={"mood": mood_dict, "keywords_csv": keywords_csv},
        )
        return ChatResponse(reply=reply_text)

    moods_str = ", ".join(f"{k}({v:.2f})" for k, v in mood_dict.items())
    lines: List[str] = []
    lines.append(f"지금 글에서는 {moods_str} 같은 감정이 느껴져요.")
    lines.append("이 분위기에 어울리는 곡들을 몇 곡 골라봤어요:\n")

    for s in songs_with_links[:5]:
        title = s.get("title", "")
        artist = s.get("artist", "")
        reason = s.get("reason", "")
        lines.append(f"- {title} - {artist}: {reason}")

    reply_text = "\n".join(lines)

    # DB에 로그 저장
    songs_models = [
        Song(
            title=s.get("title", ""),
            artist=s.get("artist", ""),
            reason=s.get("reason", ""),
            link=s.get("link", ""),
            preview_url=s.get("preview_url", ""),
            track_id=s.get("track_id", ""),
            uri=s.get("uri", ""),
            embed_url=s.get("embed_url", ""),
        )
        for s in songs_with_links
    ]

    save_chat_log(
        user_text=user_text,
        reply=reply_text,
        user_id=req.user_id,
        meta={
            "mood": mood_dict,
            "keywords_csv": keywords_csv,
            "songs": songs_with_links,
        },
    )

    return ChatResponse(reply=reply_text, songs=songs_models)


@app.get("/logs", response_model=List[ChatLog])
def recent_logs(limit: int = 20) -> List[ChatLog]:
    """
    최근 채팅 로그 반환 (간단한 모니터링/디버깅용)
    """
    rows = get_recent_chat_logs(limit=limit)
    return [ChatLog(**r) for r in rows]


if __name__ == "__main__":
    # python -m chatbot.mcp.server.server 로 실행 가능
    import uvicorn

    uvicorn.run("chatbot.mcp.server.server:app", host="0.0.0.0", port=8000, reload=True)
