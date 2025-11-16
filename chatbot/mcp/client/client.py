# chatbot/mcp/client/client.py
# -*- coding: utf-8 -*-
import requests
import gradio as gr

BASE_URL = "http://127.0.0.1:8000"  # FastAPI 서버 주소


def call_analyze(text: str):
    """
    백엔드 /analyze 호출해서
    (mood, kw_spans, analysis_json, keywords_csv, raw_text)를 반환
    # mood: {라벨:점수} 딕셔너리
    # kw_spans: (키워드, "KEYWORD") 튜플 리스트
    # analysis_json: MCP 추천용 JSON 문자열 
    # keywords_csv: 키워드 쉼표 연결 문자열
    # raw_text: 원문 텍스트
    """
    res = requests.post(f"{BASE_URL}/analyze", json={"text": text})
    res.raise_for_status()
    data = res.json()

    mood = data["mood"]
    kw_spans = [(k["text"], k["label"]) for k in data["keywords"]]
    analysis_json = data["analysis_json"]
    keywords_csv = data["keywords_csv"]
    raw_text = data["raw_text"]

    return mood, kw_spans, analysis_json, keywords_csv, raw_text


def call_recommend(analysis_json: str):
    """
    백엔드 /recommend 호출해서
    노래 목록(rows) + 각 행별 embed_url 리스트를 반환
    """
    if not analysis_json:
        return [], []

    res = requests.post(
        f"{BASE_URL}/recommend",
        json={"analysis_json": analysis_json},
    )
    res.raise_for_status()
    data = res.json()

    rows = []
    embeds = []  # embed_url 모아두기
    for s in data["songs"]:
        rows.append(
            [s["title"], s["artist"], s["reason"], s.get("link", "")]
        )
        # embed_url이 없으면 그냥 일반 링크라도 넣어두기
        embeds.append(s.get("embed_url") or s.get("link"))

    return rows, embeds


def play_preview(evt: gr.SelectData, embeds: list | None):
    """
    Dataframe에서 선택된 행의 embed_url을 받아
    Spotify embed iframe HTML을 리턴.
    """
    if not embeds:
        return "<p>재생할 곡 정보가 없습니다.</p>"

    row_idx = evt.index[0]  # (row, col) → 행 인덱스
    if not (0 <= row_idx < len(embeds)):
        return "<p>잘못된 선택입니다.</p>"

    url = embeds[row_idx]
    if not url:
        return "<p>이 곡은 Spotify에서 재생 정보를 제공하지 않습니다.</p>"

    # 혹시 일반 트랙 URL이면 embed 형태로 변환
    if "open.spotify.com/track/" in url and "embed" not in url:
        # .../track/{id}?...
        parts = url.split("/")
        try:
            track_part = [p for p in parts if "track" in p][-1]  # "track" 뒤가 id일 수도 있어서 안전하게
        except IndexError:
            track_part = parts[-1]
        track_id = track_part.split("?")[0]
        url = f"https://open.spotify.com/embed/track/{track_id}"

    iframe_html = f"""
    <iframe src="{url}" width="100%" height="80" frameborder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture">
    </iframe>
    """

    return iframe_html



def create_demo():
    with gr.Blocks(theme=gr.themes.Soft(primary_hue="indigo")) as demo:
        gr.Markdown("## 🎵 한국어 감정/키워드 분석 + 노래 추천 (API 연동)")

        text = gr.Textbox(
            label="문장 입력",
            placeholder="예) 비가 와서 마음이 조금 가라앉았어.",
            lines=3,
        )

        analyze_btn = gr.Button("1) 감정/키워드 분석", variant="primary")
        recommend_btn = gr.Button("2) 노래 추천")

        mood_out = gr.Label(label="감정(확률)")
        kw_out = gr.HighlightedText(label="키워드", combine_adjacent=True)

        hidden_analysis_json = gr.Textbox(visible=False)
        hidden_keywords_csv = gr.Textbox(visible=False)
        hidden_raw_text = gr.Textbox(visible=False)

        rec_out = gr.Dataframe(
            headers=["title", "artist", "reason", "link"],
            label="추천 결과 (행 클릭하면 spotify player 표시)",
            datatype=["str", "str", "str", "str"],
            wrap=True,
        )

        embed_state = gr.State([])

        player_html = gr.HTML(
            value="<p>곡을 선택하면 여기 아래에 Spotify 플레이어가 뜹니다.</p>"
        )

        # 1) 분석
        analyze_btn.click(
            call_analyze,
            inputs=text,
            outputs=[
                mood_out,
                kw_out,
                hidden_analysis_json,
                hidden_keywords_csv,
                hidden_raw_text,
            ],
        )

        # 2) 추천
        recommend_btn.click(
            call_recommend,
            inputs=hidden_analysis_json,
            outputs=[rec_out, embed_state],
        )

        # 3) 행 선택 → Spotify embed 플레이어
        rec_out.select(
            play_preview,
            inputs=embed_state,
            outputs=player_html,
        )

    return demo


if __name__ == "__main__":
    demo = create_demo()
    demo.launch()
