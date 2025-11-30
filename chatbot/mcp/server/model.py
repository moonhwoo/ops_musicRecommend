# chatbot/mcp/server/model.py
# -*- coding: utf-8 -*-
import json
import os
from typing import Any, Dict, List, Tuple,Optional

import difflib
from dotenv import load_dotenv
from openai import OpenAI
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from transformers import pipeline
from keybert import KeyBERT
import requests
# 파일 맨 위 import 쪽에 추가



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
session = requests.Session()
session.headers.update({
    "Accept-Language": "ko-KR,ko;q=0.9",
})

sp = spotipy.Spotify(
    auth_manager=sp_auth,
    requests_session=session,
    )

# =========================
# 감정 라벨 / 매핑
# =========================
EMOTION_LABELS_KO = ["기쁨", "슬픔", "차분", "에너지", "분노", "설렘", "집중"]
EMOTION_MAP_EN: Dict[str, str] = {
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

def classify_situation(text: str) -> str:
    """
    사용자의 원문 텍스트를 보고 대략적인 상황을 분류한다.
    healing / breakup / focus / workout / general 중 하나를 반환.
    """
    t = (text or "").lower()

    # 1) 위로/힐링 모드
    heal_keywords = ["힘들", "지쳤", "우울", "힘빠지", "버겁", "수고했", "힘 빠져", "지치"]
    if any(k in t for k in heal_keywords):
        return "healing"   # 위로/힐링

    # 2) 이별/연애 모드
    breakup_keywords = ["이별", "헤어졌", "차였", "실연", "전여친", "전 남친", "전남친", "전여자친구", "전남자친구","새벽"]
    if any(k in t for k in breakup_keywords):
        return "breakup"

    # 3) 공부/집중 모드
    focus_keywords = ["공부", "집중", "코딩", "과제", "숙제", "시험", "레포트", "프로젝트", "논문"]
    if any(k in t for k in focus_keywords):
        return "focus"

    # 4) 운동/에너지 모드
    workout_keywords = ["운동", "러닝", "헬스", "뛰", "달리기", "조깅"]
    if any(k in t for k in workout_keywords):
        return "workout"

    return "general"



# =========================
# 1) 감정/키워드 분석 로직
# =========================
def analyze_text_logic(
    text: str,
) -> Tuple[Dict[str, float], List[Tuple[str, str]], str, str, str]:
    """
    입력 텍스트를 받아:
    - mood_dict: {감정라벨: 점수}
    - kw_spans: [(키워드, "KEYWORD"), ...]
    - analysis_json: 추천 단계에서 사용할 JSON 문자열
    - keywords_csv: 키워드 쉼표 연결 문자열
    - raw_text: 정제된 원문 텍스트
    를 반환한다.
    """
    text = (text or "").strip()
    if not text:
        return {"unknown": 1.0}, [], "", "", ""

    situation = classify_situation(text)
    
    # 제로샷 감정 분류
    res = zsc(
        text,
        candidate_labels=EMOTION_LABELS_KO,
        multi_label=True,
        hypothesis_template="이 문장의 감정은 {}이다.",
    )

    labels: List[str] = res["labels"]
    scores: List[float] = res["scores"]
    ranked = sorted(zip(labels, scores), key=lambda x: x[1], reverse=True)

    top1 = ranked[0]
    top2 = ranked[1] if len(ranked) > 1 else None

    mood_dict: Dict[str, float] = {top1[0]: float(top1[1])}
    if top2 and top2[1] > 0.2:
        mood_dict[top2[0]] = float(top2[1])

    # 키워드 추출
    keywords: List[str] = [
        k
        for k, _ in kw.extract_keywords(
            text,
            keyphrase_ngram_range=(1, 2),
            top_n=6,
        )
    ]
    kw_spans: List[Tuple[str, str]] = [(k, "KEYWORD") for k in keywords]

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
            "situation": situation,
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

입력으로 한 사용자의 감정 분석 결과 JSON과
그 사용자의 음악 취향 정보(user_profile)가 함께 주어진다.

emotion 구조는 대략 다음과 같다:

{
  "mood_top1_ko": string,
  "mood_top1_en": string,
  "mood_top1_score": float,
  "mood_top2_ko": string,
  "mood_top2_en": string,
  "mood_top2_score": float,
  "keywords": [string, ...],
  "raw_text": string,
  "weights": [[string, float], ...]
  "situation": string  // "healing", "breakup", "focus", "workout", "general" 중 하나
}

추가 규칙 (situation 필드 사용):

- emotion 안에는 "situation" 필드가 있을 수 있다. 가능한 값 예시는 아래와 같다:
  - "healing": 너무 힘들고 지친 사용자를 위로해 주는 상황
  - "breakup": 실제로 이별/실연을 겪는 상황
  - "focus": 공부, 코딩, 일에 집중하고 싶은 상황
  - "workout": 운동하면서 에너지를 내고 싶은 상황
  - "general": 위에 딱 맞지는 않는 일반적인 상황

- situation == "healing" 인 경우:
  - 이별이나 죽음, 극단적인 상실을 직접적으로 묘사하는 곡보다
    사용자를 다독이고 위로하고, 희망을 주는 가사를 가진 곡을 우선 추천해라.
  - 듣고 나면 마음이 더 무거워지는 곡은 피하려고 노력해라.
  - "위로", "힐링", "응원", "편안함" 같은 분위기의 곡을 우선 추천해라.

- situation == "breakup" 인 경우:
  - 실제 이별 감정에 공감해주는 발라드, 실연 노래를 많이 사용해도 된다.
  - 다만 너무 극단적인 표현(죽고 싶다, 삶을 포기한다 등)은 피하라.

- situation == "focus" 인 경우:
  - 가사가 과하게 강렬해서 집중을 방해하는 곡보다
    루프감이 있고, 집중이 잘 되는 곡을 우선 추천해라.

- situation == "workout" 인 경우:
  - BPM이 빠르고, 에너지가 느껴지는 곡 위주로 추천해라.

- 곡을 선택할 때는 다음 우선순위를 지켜라:
  1순위: situation 과 잘 맞는지 여부
  2순위: emotion.mood_top1_en 과 mood_top2_en 에 맞는 분위기인지
  3순위: user_profile 의 favorite_genres, favorite_artists, preferred_year_category

  같은 아티스트의 대표곡이라도 situation 이 맞지 않으면 추천하지 마라.
  예를 들어 situation 이 "focus" 인데, 이별 발라드 곡은 추천하지 않는다.    

user_profile의 구조는 대략 다음과 같다:
{
  "user_id": string,
  "novelty_score": int | null,          // 0~10, 새 아티스트/곡 선호도
  "preferred_year_category": string | null, // "1990s", "2000s", "2010s", "ALL" 등
  "favorite_genres": [string, ...],     // 사용자가 좋아하는 장르명
  "favorite_artists": [                 // 1~3위 선호 아티스트
    {"rank": 1, "name": "...", "spotify_id": "..."},
    ...
  ]
}

너의 역할:
- 감정(emotion) 정보와 키워드, 그리고 user_profile을 함께 보고
  사용자의 현재 분위기와 평소 취향을 동시에 고려해서 곡을 추천한다.
- 한국 사용자에게 어울리는 곡 20개를 추천한다.

취향(user_profile) 반영 규칙:
1. novelty_score가 높을수록 (7 이상) 새로운 아티스트/곡 비중을 늘려라.
   novelty_score가 낮을수록 (3 이하) 대중적이고 많이 알려진 곡 위주로 선택하라.

2. favorite_genres에 포함된 장르를 우선 고려하되,
   한 장르만 반복하지 말고 전체 20곡 중 최소 2~3개 장르를 섞어라.

3. favorite_artists에 있는 가수들의 곡은
   - 각 아티스트당 최대 4곡까지만 넣어라.
   - 전체 20곡 중 favorite_artists 관련 곡은 최대 12곡까지만 넣어라.
   - 같은 곡 제목은 절대 두 번 이상 추천하지 마라.

4. preferred_year_category가 특정 시대("1990s", "2000s" 등)라면,
   가능한 한 그 시대 곡을 중심으로 추천하고 ALL일 경우는 시대에 상관없이 하되,
   분위기에 맞는 다른 시대 곡도 일부 섞어서 다양성을 유지하라.

5. 감정(emotion)의 weights, keywords와 user_profile을 최우선으로 반영하라
   

규칙:
1. 곡은 실제로 존재하는 20곡만 추천한다.
2. 각 곡은 아래 필드를 반드시 포함해야 한다.
   - "title": 곡 제목 (문자열)
   - "artist": 아티스트 이름 (문자열)
   - "reason": 이 곡을 추천한 이유 (한국어 1~2문장) **절대 artist(가수)의 이름은 포함하지 말고** raw text의 키워드/감정과 연결지어 설명할 것
   - "mood_tags": 감정/분위기와 관련된 태그 리스트
   - "match_score": 0.0~1.0 사이의 수치
3. 감정과 user_profile 에 따라 추천 곡을 구성하고,
   장르·아티스트·분위기를 다양하게 구성하라.
4. 곡들은 user_profile을 보고 아티스트/분위기를 적당히 다양하게 구성한다.
5. 응답은 반드시 JSON 형식의 객체 하나만 포함해야 한다.
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


def recommend_songs_via_openai_logic(
    analysis_json: str,
    user_profile: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
    """
    감정 분석 결과(analysis_json)를 기반으로 곡 추천 리스트를 반환.
    반환값: [{"title": ..., "artist": ..., "reason": ..., ...}, ...]
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
    if mood1:
        weights.append([mood1, round(0.6 * s1, 2)])
    if mood2 and s2 > 0.2:
        weights.append([mood2, round(0.4 * s2, 2)])

    info["weights"] = weights

    payload = {
        "emotion": info,
        "user_profile": user_profile or {},
        }

    user_prompt_ko = f"""
다음은 한 사용자의 감정 분석 정보와 평소 음악 취향 정보야.
이 정보를 기반으로 위에서 설명한 규칙과 출력 형식을 지켜서 곡을 추천해라.

[사용자 원문]
{text}

[emotion + user_profile JSON]
{json.dumps(payload, ensure_ascii=False)}
""".strip()

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
        obj = json.loads(content)
        tracks = obj.get("tracks", [])
        if not isinstance(tracks, list):
            print("[recommend] tracks 필드가 리스트가 아닙니다:", tracks)
            return []
        return tracks
    except json.JSONDecodeError:
        print("[recommend] JSON 파싱 실패:", content)
        return []


# =========================
# 3) Spotify 메타데이터 붙이기
# =========================
def attach_spotify_links_logic(
    songs: List[Dict[str, Any]],
    min_valid: int = 6,
) -> List[Dict[str, Any]]:
    """
    OpenAI 추천 결과에 Spotify 링크 + 미리듣기 추가.
    - Spotify에서 실제로 찾은 곡만 반환
    - 제목 유사도가 너무 낮으면 스킵
    - 최소 min_valid개 이상 찾으려고 시도
    """
    enriched: List[Dict[str, Any]] = []

    def _normalize(s: str) -> str:
        return "".join(ch for ch in s.lower() if not ch.isspace())

    for s in songs:
        title = s.get("title", "").strip()
        artist = s.get("artist", "").strip()
        reason = s.get("reason", "")

        if not title:
            continue

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

            # 1차 실패 시, 제목만으로 재시도
            if not items and artist:
                res = sp.search(q=title, type="track", limit=1)
                items = res.get("tracks", {}).get("items", [])

            if not items:
                print(f"[Spotify] '{title}' ({artist}) 검색 실패, 스킵.")
                continue

            track = items[0]

            spotify_title = track.get("name", "")
            spotify_artists = track.get("artists", [])
            spotify_main_artist = spotify_artists[0]["name"] if spotify_artists else artist

            input_title_norm = _normalize(title)
            spotify_title_norm = _normalize(spotify_title)

            title_ratio = difflib.SequenceMatcher(
                None, input_title_norm, spotify_title_norm
            ).ratio()

            if title_ratio < 0.7:
                print(
                    f"[Spotify] 제목 유사도 낮음 → '{title}' vs '{spotify_title}' "
                    f"(ratio={title_ratio:.2f}) → 스킵"
                )
                continue
            
            print(
                f"[Spotify] 매칭 성공 ✅ 입력='{title}' / Spotify='{spotify_title}' "
                f"(ratio={title_ratio:.2f})"
            )

            link = track.get("external_urls", {}).get("spotify", "")
            preview_url = track.get("preview_url") or ""
            track_id = track.get("id") or ""
            uri = track.get("uri") or ""

            if not track_id and not link:
                print(f"[Spotify] '{title}' ({artist})는 링크 정보가 없음, 스킵.")
                continue

            if track_id:
                embed_url = f"https://open.spotify.com/embed/track/{track_id}"

            enriched.append(
                {
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

            if len(enriched) >= min_valid:
                break

        except Exception as e:
            print("Spotify 검색 에러:", e)
            continue

    return enriched