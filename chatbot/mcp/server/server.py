# chatbot/mcp/server/server.py
# -*- coding: utf-8 -*-
import os
import json
from typing import List, Dict, Any

from dotenv import load_dotenv
from openai import OpenAI
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from transformers import pipeline
from keybert import KeyBERT

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# =========================
# 환경 변수 / 외부 API 설정
# =========================
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")

sp_auth = SpotifyClientCredentials(
    client_id=SPOTIFY_CLIENT_ID,
    client_secret=SPOTIFY_CLIENT_SECRET,
)
sp = spotipy.Spotify(auth_manager=sp_auth)

# =========================
# 감정 라벨 / 매핑
# =========================
EMOTION_LABELS_KO = ["기쁨", "슬픔", "차분", "에너지", "분노", "설렘", "집중"]
EMOTION_MAP_EN = {
    "기쁨": "happy",
    "슬픔": "sad",
    "차분": "chill",
    "에너지": "energetic",
    "분노": "angry",
    "설렘": "romantic",
    "집중": "focus",
}

# =========================
# 모델 로딩 (제로샷 + 키워드)
# =========================
ZSC_MODEL = "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"
zsc = pipeline(
    "zero-shot-classification",
    model=ZSC_MODEL,
    device_map="auto",
    truncation=True,
)

KW_MODEL = "jhgan/ko-sroberta-multitask"
kw = KeyBERT(KW_MODEL)

# =========================
# 1) 감정/키워드 분석 로직
# =========================
def analyze_text_logic(text: str):
    text = (text or "").strip()
    if not text:
        return {"unknown": 1.0}, [], "", "", ""

    # 제로샷 감정 분류
    res = zsc(
        text,
        candidate_labels=EMOTION_LABELS_KO,
        multi_label=True,
        hypothesis_template="이 문장의 감정은 {}이다.",
    )

    labels = res["labels"]
    scores = res["scores"]
    ranked = sorted(zip(labels, scores), key=lambda x: x[1], reverse=True)

    top1 = ranked[0]
    top2 = ranked[1] if len(ranked) > 1 else None

    mood_dict = {top1[0]: float(top1[1])}
    if top2 and top2[1] > 0.2:
        mood_dict[top2[0]] = float(top2[1])

    # 키워드 추출
    keywords = [
        k
        for k, _ in kw.extract_keywords(
            text,
            keyphrase_ngram_range=(1, 2),
            top_n=6,
        )
    ]
    kw_spans = [(k, "KEYWORD") for k in keywords]

    # 상위 감정 + 키워드 JSON (추천 단계에서 사용)
    mood1_ko = top1[0]
    mood2_ko = top2[0] if top2 else ""
    mood1_en = EMOTION_MAP_EN.get(mood1_ko, "chill")
    mood2_en = EMOTION_MAP_EN.get(mood2_ko, "") if mood2_ko else ""

    analysis_json = json.dumps(
        {
            "mood_top1_ko": mood1_ko,
            "mood_top1_en": mood1_en,
            "mood_top1_score": float(top1[1]),
            "mood_top2_ko": mood2_ko,
            "mood_top2_en": mood2_en,
            "mood_top2_score": float(top2[1]) if top2 else 0.0,
            "keywords": keywords,
            "raw_text": text,
        },
        ensure_ascii=False,
    )

    keywords_csv = ", ".join(keywords)

    return mood_dict, kw_spans, analysis_json, keywords_csv, text


# =========================
# 2) OpenAI 기반 추천 로직
# =========================
def recommend_songs_via_openai_logic(analysis_json: str):
    info = json.loads(analysis_json or "{}")
    mood1 = info.get("mood_top1_ko")
    mood2 = info.get("mood_top2_ko")
    s1 = info.get("mood_top1_score", 1.0)
    s2 = info.get("mood_top2_score", 0.0)
    keywords = info.get("keywords", [])
    text = info.get("raw_text", "")

    weights = []
    if mood1:
        weights.append((mood1, round(0.6 * s1, 2)))
    if mood2 and s2 > 0.2:
        weights.append((mood2, round(0.4 * s2, 2)))

    user_prompt_ko = f"""
당신은 한국어로 응답하는 음악 추천 엔진입니다.

아래 정보를 바탕으로, **JSON 배열**만 출력하세요.
각 요소는 다음 키를 반드시 가져야 합니다:
- "title": 곡 제목 (문자열)
- "artist": 가수/아티스트 (문자열)
- "reason": 이 곡을 추천한 이유 (한국어로 1~2문장)

JSON 이외의 텍스트는 절대 출력하지 마세요.

[입력 정보]
- 사용자 원문: {text}
- 감정(가중치): {weights}
- 키워드: {", ".join(keywords)}

조건:
1) 감정/키워드 분위기에 어울리는 곡 5개만 추천
2) 한국 사용자에게 너무 생소하지 않은 곡 위주
3) reason은 감정/키워드를 언급하며 자연스럽게 설명
"""

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "너는 음악 추천 전문가야. 반드시 JSON 배열만 출력해.",
            },
            {"role": "user", "content": user_prompt_ko},
        ],
        temperature=0.8,
    )

    raw = resp.choices[0].message.content.strip()

    # 혹시 ```json … ``` 코드블럭이면 제거
    if raw.startswith("```"):
        lines = []
        for line in raw.splitlines():
            if line.strip().startswith("```"):
                continue
            lines.append(line)
        raw = "\n".join(lines).strip()

    try:
        songs = json.loads(raw)
        if isinstance(songs, dict):
            songs = [songs]
    except json.JSONDecodeError:
        print("[recommend] JSON 파싱 실패:", raw)
        songs = []

    return songs


def attach_spotify_links_logic(songs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    OpenAI 추천 결과에 Spotify 링크 붙이기
    """
    enriched = []
    for s in songs:
        title = s.get("title", "")
        artist = s.get("artist", "")
        reason = s.get("reason", "")

        if not title:
            continue

        query = f"track:{title} artist:{artist}" if artist else title

        try:
            res = sp.search(q=query, type="track", limit=1)
            items = res.get("tracks", {}).get("items", [])
            if items:
                track = items[0]
                link = track.get("external_urls", {}).get("spotify", "")
            else:
                link = ""
        except Exception as e:
            print("Spotify 검색 에러:", e)
            link = ""

        enriched.append(
            {
                "title": title,
                "artist": artist,
                "reason": reason,
                "link": link,
            }
        )

    return enriched


# =========================
# 3) FastAPI 스키마 정의
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


class RecommendResponse(BaseModel):
    songs: List[Song]


# =========================
# 4) FastAPI 앱 정의
# =========================
app = FastAPI(title="OPS Music Recommend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 필요하면 도메인 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_endpoint(req: AnalyzeRequest):
    mood_dict, kw_spans, analysis_json, keywords_csv, raw_text = analyze_text_logic(req.text)
    keywords = [KeywordSpan(text=k, label=label) for (k, label) in kw_spans]
    return AnalyzeResponse(
        mood=mood_dict,
        keywords=keywords,
        analysis_json=analysis_json,
        keywords_csv=keywords_csv,
        raw_text=raw_text,
    )


@app.post("/recommend", response_model=RecommendResponse)
def recommend_endpoint(req: RecommendRequest):
    songs = recommend_songs_via_openai_logic(req.analysis_json)
    songs_with_links = attach_spotify_links_logic(songs)
    return RecommendResponse(
        songs=[
            Song(
                title=s.get("title", ""),
                artist=s.get("artist", ""),
                reason=s.get("reason", ""),
                link=s.get("link", ""),
            )
            for s in songs_with_links
        ]
    )


if __name__ == "__main__":
    # python -m chatbot.mcp.server.server 로 실행 가능
    import uvicorn
    uvicorn.run("chatbot.mcp.server.server:app", host="0.0.0.0", port=8000, reload=True)
