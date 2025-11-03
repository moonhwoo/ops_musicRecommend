# -*- coding: utf-8 -*-
import os
import json
import gradio as gr
from transformers import pipeline
from keybert import KeyBERT

# =========================
# 1) 한국어 감정 라벨 & 매핑
# =========================
EMOTION_LABELS_KO = ["기쁨", "슬픔", "차분", "에너지", "분노", "설렘", "집중"]
# 필요 시 외부(영문 시스템)와 연동할 때 사용할 영문 매핑
EMOTION_MAP_EN = {
    "기쁨": "happy",
    "슬픔": "sad",
    "차분": "chill",
    "에너지": "energetic",
    "분노": "angry",
    "설렘": "romantic",
    "집중": "focus",
}

# ==========================================
# 2) 모델 로딩 (정확도 중시 한국어 최적화 구성)
#    - 제로샷: mDeBERTa v3 XNLI (다국어, 한국어 성능 우수)
#    - 키워드: 한국어 S-RoBERTa 임베딩
# ==========================================
# 참고: MoritzLaurer/mDeBERTa-v3-base-mnli-xnli (또는 유사 XNLI mDeBERTa 계열)
ZSC_MODEL = "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"
zsc = pipeline(
    "zero-shot-classification",
    model=ZSC_MODEL,
    # GPU 있으면 자동 할당. 없으면 CPU로 동작
    device_map="auto",
    truncation=True
)

# 한국어 임베딩으로 KeyBERT 향상 (jhgan/ko-sroberta-multitask 등)
KW_MODEL = "jhgan/ko-sroberta-multitask"
kw = KeyBERT(KW_MODEL)

# ==========================================
# 3) 감정/키워드 분석 함수
#    - multi_label=True로 상위 2개 감정도 활용 가능
# ==========================================
def analyze_text(text: str):
    text = (text or "").strip()
    if not text:
        # Gradio Label 포맷을 맞추기 위해 dict 형태
        return {"unknown": 1.0}, [], "", "", ""

    # 제로샷 감정 분류 (한국어 가설 템플릿)
    res = zsc(
        text,
        candidate_labels=EMOTION_LABELS_KO,
        multi_label=True,  # 복합 감정 고려
        hypothesis_template="이 문장의 감정은 {}이다."
    )

    # 상위 감정 1~2개 추출
    labels = res["labels"]
    scores = res["scores"]
    # (label, score) 리스트로 묶고 정렬(내림차순)
    ranked = sorted(zip(labels, scores), key=lambda x: x[1], reverse=True)
    top1 = ranked[0]
    top2 = ranked[1] if len(ranked) > 1 else None

    # Gradio Label 출력을 위해 dict 구성 (상위 1개 위주로 표시)
    mood_dict = {top1[0]: float(top1[1])}
    if top2 and top2[1] > 0.2:
        # 0.2 이상이면 참고용으로 함께 보여주고 싶다면 추가
        mood_dict[top2[0]] = float(top2[1])

    # 키워드 추출 (한국어 임베딩 기반, 1~2그램, 상위 6개)
    keywords = [k for k, _ in kw.extract_keywords(
        text,
        keyphrase_ngram_range=(1, 2),
        top_n=6
    )]
    kw_spans = [(k, "KEYWORD") for k in keywords]

    # 프롬프트용 컨텍스트 (한국어)
    context = (
        f"사용자 입력: {text}\n"
        f"상위 감정 후보: {', '.join([f'{l}({s:.2f})' for l, s in ranked[:2]])}\n"
        f"키워드: {', '.join(keywords)}"
    )

    # 외부 시스템 호환용: 상위 감정 1,2 영어 매핑도 준비
    mood1_ko = top1[0]
    mood2_ko = top2[0] if top2 else ""
    mood1_en = EMOTION_MAP_EN.get(mood1_ko, "chill")
    mood2_en = EMOTION_MAP_EN.get(mood2_ko, "") if mood2_ko else ""

    # 숨겨둔 값들: 추천 단계에서 사용
    return mood_dict, kw_spans, json.dumps({
        "mood_top1_ko": mood1_ko,
        "mood_top1_en": mood1_en,
        "mood_top1_score": float(top1[1]),
        "mood_top2_ko": mood2_ko,
        "mood_top2_en": mood2_en,
        "mood_top2_score": float(top2[1]) if top2 else 0.0,
        "keywords": keywords,
        "raw_text": text
    }, ensure_ascii=False), ", ".join(keywords), text

# ==========================================
# 4) MCP를 통한 OpenAI 추천 (의사 코드)
#    - 실제 MCP 클라이언트/툴 이름/스키마에 맞게 수정
#    - 한국어 결과를 요청
# ==========================================
def recommend_songs_via_mcp_korean(analysis_json: str, language: str = "ko"):
    """
    MCP 세션에서 'openai_recommend_songs' 같은 툴을 호출한다고 가정.
    실제에 맞게 mcp_client.call_tool(...)로 교체하십시오.
    """
    info = json.loads(analysis_json)
    mood1 = info.get("mood_top1_ko")
    mood2 = info.get("mood_top2_ko")
    s1 = info.get("mood_top1_score", 1.0)
    s2 = info.get("mood_top2_score", 0.0)
    keywords = info.get("keywords", [])
    text = info.get("raw_text", "")
    # 가중치: 상위1 0.6, 상위2 0.4(있을 때) 예시
    weights = []
    if mood1:
        weights.append((mood1, 0.6))
    if mood2 and s2 > 0.2:
        weights.append((mood2, 0.4))

    # 한국어 지시 프롬프트 (OpenAI가 한국어로 응답)
    user_prompt_ko = (
        "당신은 한국어로 응답하는 음악 추천 엔진입니다.\n"
        "아래 정보를 바탕으로 한국어 JSON 배열(키: title, artist, reason, link)로 5곡을 추천하세요.\n"
        "- 사용자 원문: {text}\n"
        "- 감정(가중치): {weights}\n"
        "- 키워드: {keywords}\n"
        "조건:\n"
        "1) 감정/키워드와의 관련성을 한국어 'reason'에 간결히 설명\n"
        "2) 곡/가수는 너무 생소한 곡만 피하고, 가능하면 한국 사용자 친화적으로\n"
        "3) link는 YouTube 혹은 Spotify 중 하나를 제공\n"
        "4) 정확히 5개 항목만\n"
    ).format(text=text, weights=weights, keywords=", ".join(keywords))

    # === 실제 MCP 호출 자리 ===
    # resp = mcp_client.call_tool("openai_recommend_songs", {
    #     "prompt": user_prompt_ko,
    #     "language": "ko",
    #     "count": 5,
    #     "format": "json"
    # })
    # songs = resp["songs"]

    # 데모용 더미
    songs = [
        {"title": "비 오는 날의 수채화", "artist": "K-Artist A", "reason": "차분/슬픔 분위기에 어울림", "link": "https://example.com/a"},
        {"title": "Sunshine", "artist": "K-Artist B", "reason": "기쁨으로 전환을 돕는 밝은 무드", "link": "https://example.com/b"},
        {"title": "Calm Air", "artist": "Indie C", "reason": "차분 키워드와 잘 맞는 미니멀 사운드", "link": "https://example.com/c"},
        {"title": "Heartbeat", "artist": "Pop D", "reason": "에너지 포인트로 기분 반전 유도", "link": "https://example.com/d"},
        {"title": "Late Night Focus", "artist": "Lo-fi E", "reason": "집중 키워드에 맞춘 저자극 비트", "link": "https://example.com/e"},
    ]
    return songs

# 추천 결과를 Gradio Dataframe 포맷으로 변환
def to_rows(songs):
    rows = []
    for s in songs:
        rows.append([s.get("title",""), s.get("artist",""), s.get("reason",""), s.get("link","")])
    return rows

# ==========================================
# 5) Gradio UI (한국어)
# ==========================================
with gr.Blocks(theme=gr.themes.Soft(primary_hue="indigo")) as demo:
    gr.Markdown("## 🎵 한국어 감정/키워드 분석 + 노래 추천 데모")

    with gr.Row():
        text = gr.Textbox(
            label="문장 입력",
            placeholder="예) 비가 와서 마음이 조금 가라앉았어.",
            lines=3
        )

    with gr.Row():
        analyze_btn = gr.Button("1) 감정/키워드 분석", variant="primary")
        recommend_btn = gr.Button("2) 노래 추천 (MCP)")

    mood_out = gr.Label(label="감정(확률)")
    kw_out = gr.HighlightedText(label="키워드", combine_adjacent=True)

    # 추천 단계에서 사용할 숨은 값들
    hidden_analysis_json = gr.Textbox(visible=False)
    hidden_keywords_csv   = gr.Textbox(visible=False)
    hidden_raw_text       = gr.Textbox(visible=False)

    rec_out = gr.Dataframe(
        headers=["title","artist","reason","link"],
        label="추천 결과 (한국어)",
        datatype=["str","str","str","str"],
        wrap=True
    )

    # 분석 버튼
    analyze_btn.click(
        analyze_text,
        inputs=text,
        outputs=[mood_out, kw_out, hidden_analysis_json, hidden_keywords_csv, hidden_raw_text]
    )

    # 추천 버튼
    def _recommend_router(analysis_json):
        songs = recommend_songs_via_mcp_korean(analysis_json, language="ko")
        return to_rows(songs)

    recommend_btn.click(
        _recommend_router,
        inputs=[hidden_analysis_json],
        outputs=rec_out
    )

demo.launch()
