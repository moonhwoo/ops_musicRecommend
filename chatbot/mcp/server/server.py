# chatbot/mcp/server/server.py
# -*- coding: utf-8 -*-
import os
import json
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from openai import OpenAI
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from transformers import pipeline
from keybert import KeyBERT

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import difflib
# =========================
# 환경 변수 / 외부 API 설정
# =========================
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")
client = OpenAI(api_key=OPENAI_API_KEY)

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")

if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
    raise RuntimeError("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET 환경 변수가 필요합니다.")

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
    mood1_ko = top1[0] #상위1의 한국어 감정
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
SYSTEM_PROMPT_MUSIC = """
너는 한국어로 대답하는 음악 추천 큐레이터야.

입력으로 한 사용자의 감정 분석 결과 JSON이 주어진다.
JSON 구조는 대략 다음과 같다:

{
  "mood_top1_ko": string,
  "mood_top1_en": string,
  "mood_top1_score": float,
  "mood_top2_ko": string,
  "mood_top2_en": string,
  "mood_top2_score": float,
  "keywords": [string, ...],
  "raw_text": string,
  "weights": [[string, float], ...]   // (상위 감정, 가중치) 쌍 리스트 (추가 정보)
}

너의 역할:
- 감정 정보와 키워드를 보고 사용자의 현재 분위기와 상황을 이해한다.
- 한국 사용자에게 어울리는 곡 10개를 추천한다.

규칙:
1. 곡은 실제로 존재하는 10곡만 추천한다.
2. 각 곡은 아래 필드를 반드시 포함해야 한다.
   - "title": 곡 제목 (문자열)
   - "artist": 아티스트 이름 (문자열)
   - "reason": 이 곡을 추천한 이유 (한국어 1~2문장)
   - "mood_tags": 감정/분위기와 관련된 태그 리스트 (예: ["슬픔", "집중"])
   - "match_score": 0.0~1.0 사이의 수치로, 이 곡이 얼마나 잘 맞는지에 대한 너의 판단
3. 감정(특히 weights 정보)과 keywords를 적극 반영해 분위기가 잘 맞는 곡을 고른다.
4. 한국 사용자에게 너무 생소하지 않은 곡 위주로 추천한다.
5. 곡들은 아티스트/분위기를 적당히 다양하게 구성한다.
6. 응답은 반드시 JSON 형식의 객체 하나만 포함해야 한다.
   JSON 바깥의 텍스트나 설명은 절대 쓰지 않는다.

출력 형식(JSON):

{
  "tracks": [
    {
      "title": "곡 제목",
      "artist": "아티스트 이름",
      "reason": "이 곡을 추천한 이유",
      "mood_tags": ["..."],
      "match_score": 0.0
    },
    ...
  ]
}
""".strip()


def recommend_songs_via_openai_logic(analysis_json: str) -> List[Dict[str, Any]]:
    """
    감정 분석 결과(analysis_json)를 기반으로 곡 추천 리스트를 반환.
    반환값: [{"title": ..., "artist": ..., "reason": ..., "mood_tags": [...], "match_score": ...}, ...]
    """
    info = json.loads(analysis_json or "{}")
    mood1 = info.get("mood_top1_ko")
    mood2 = info.get("mood_top2_ko")
    s1 = info.get("mood_top1_score", 1.0)
    s2 = info.get("mood_top2_score", 0.0)
    keywords = info.get("keywords", [])
    text = info.get("raw_text", "")

    # 감정 가중치 계산 (LLM 참고용)
    weights: List[List[Any]] = []
    # weight 리스트 = [(감정라벨1, 가중치점수), (감정라벨2, 가중치점수)]
    if mood1:
        weights.append([mood1, round(0.6 * s1, 2)]) #소숫점 두자리에서 반올림
    if mood2 and s2 > 0.2:
        weights.append([mood2, round(0.4 * s2, 2)])

    info["weights"] = weights

    payload = {
        "emotion": info,
    } #유저의 analysis_json 내용 +가중치를 포함한 딕셔너리 생성

    user_prompt_ko = f"""
다음은 한 사용자의 감정 분석 정보야.
이 정보를 기반으로 위에서 설명한 규칙과 출력 형식을 지켜서 곡을 추천해라.

[사용자 원문]
{text}

[감정 및 키워드 JSON]
{json.dumps(payload, ensure_ascii=False)}
""".strip() ## user_prompt_ko 생성

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_MUSIC},
            {"role": "user", "content": user_prompt_ko},
        ],
        temperature=0.8,
    )

    content = resp.choices[0].message.content.strip()

    try:
        obj = json.loads(content) #content json을 딕셔너리로
        tracks = obj.get("tracks", [])
        if not isinstance(tracks, list):
            print("[recommend] tracks 필드가 리스트가 아닙니다:", tracks)
            return []
        return tracks  #{'tracks': [{'title': '밤편지'}]} 이형태 
    except json.JSONDecodeError:
        print("[recommend] JSON 파싱 실패:", content)
        return []
    
def attach_spotify_links_logic(
    songs: List[Dict[str, Any]],
    min_valid: int = 4
) -> List[Dict[str, Any]]:
    """
    OpenAI 추천 결과에 Spotify 링크 + 미리듣기 추가.
    - Spotify에서 실제로 찾은 곡만 반환
    - 제목 유사도가 너무 낮으면(다른 곡으로 판단) 스킵
    - 최소 min_valid개 이상 찾으려고 시도 (부족하면 찾은 만큼만 반환)
    """
    enriched: List[Dict[str, Any]] = []

    # 내부에서만 쓸 제목 정규화 함수
    def _normalize(s: str) -> str:
        # 소문자로 바꾸고 공백 제거 (한글은 lower 영향 거의 없음)
        return "".join(ch for ch in s.lower() if not ch.isspace())

    for s in songs:
        title = s.get("title", "").strip()
        artist = s.get("artist", "").strip()
        reason = s.get("reason", "")

        if not title:
            continue

        # 기본 검색: title + artist
        query = f"track:{title} artist:{artist}" if artist else title

        link = ""
        preview_url = ""
        track_id = ""
        uri = ""
        embed_url = ""

        try:
            # 1차 검색
            res = sp.search(q=query, type="track", limit=1)
            items = res.get("tracks", {}).get("items", [])

            # 1차 검색 실패 시, 제목만으로 다시 시도
            if not items and artist:
                res = sp.search(q=title, type="track", limit=1)
                items = res.get("tracks", {}).get("items", [])

            # 그래도 없다면 이 곡은 건너뜀
            if not items:
                print(f"[Spotify] '{title}' ({artist}) 검색 실패, 스킵.")
                continue

            track = items[0]

            # Spotify 실제 메타데이터
            spotify_title = track.get("name", "")
            spotify_artists = track.get("artists", [])
            spotify_main_artist = spotify_artists[0]["name"] if spotify_artists else artist

            # 🔍 제목 유사도 체크 (눈물 vs 눈물참기 같은 케이스 거르기)
            input_title_norm = _normalize(title)
            spotify_title_norm = _normalize(spotify_title)

            title_ratio = difflib.SequenceMatcher(
                None, input_title_norm, spotify_title_norm
            ).ratio()

            # 예: 눈물(2글자) vs 눈물참기(4글자) → ratio 대략 0.66 정도
            if title_ratio < 0.8:
                print(
                    f"[Spotify] 제목 유사도 낮음 → '{title}' vs '{spotify_title}' "
                    f"(ratio={title_ratio:.2f}) → 스킵"
                )
                continue

            # 여기까지 통과하면 Spotify 메타데이터 사용
            link = track.get("external_urls", {}).get("spotify", "")
            preview_url = track.get("preview_url") or ""
            track_id = track.get("id") or ""
            uri = track.get("uri") or ""

            if not track_id and not link:
                # 링크 정보도 없으면 스킵
                print(f"[Spotify] '{title}' ({artist})는 링크 정보가 없음, 스킵.")
                continue

            if track_id:
                embed_url = f"https://open.spotify.com/embed/track/{track_id}"

            enriched.append(
                {
                    # 가능하면 Spotify 쪽 제목/가수로 덮어쓰기
                    "title": spotify_title or title,
                    "artist": spotify_main_artist,
                    "reason": reason,
                    "link": link,
                    "preview_url": preview_url,
                    "track_id": track_id,
                    "uri": uri,
                    "embed_url": embed_url,
                }
            )

            # ✅ 유효한 곡이 min_valid개 모이면 바로 종료
            if len(enriched) >= min_valid:
                break

        except Exception as e:
            print("Spotify 검색 에러:", e)
            continue

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
    preview_url: Optional[str] = None
    track_id: Optional[str] = None
    uri: Optional[str] = None
    embed_url: Optional[str] = None

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
    songs = recommend_songs_via_openai_logic(req.analysis_json) #songs=track 리스트 {'tracks': [{'title': '밤편지'}]}
    songs_with_links = attach_spotify_links_logic(songs,min_valid=4)  #enriched 정보
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


if __name__ == "__main__":
    # python -m chatbot.mcp.server.server 로 실행 가능
    import uvicorn
    uvicorn.run("chatbot.mcp.server.server:app", host="0.0.0.0", port=8000, reload=True)
