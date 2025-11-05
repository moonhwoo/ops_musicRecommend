# chatbot/mcp/client/client.py
# -*- coding: utf-8 -*-
import requests
import gradio as gr

BASE_URL = "http://127.0.0.1:8000"  # FastAPI 서버 주소


def call_analyze(text: str):
    """
    백엔드 /analyze 호출해서
    (mood, kw_spans, analysis_json, keywords_csv, raw_text)를 반환
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
    Gradio DataFrame에 맞는 2D 리스트로 변환
    """
    if not analysis_json:
        return []

    res = requests.post(
        f"{BASE_URL}/recommend",
        json={"analysis_json": analysis_json},
    )
    res.raise_for_status()
    data = res.json()

    rows = []
    for s in data["songs"]:
        rows.append(
            [s["title"], s["artist"], s["reason"], s.get("link", "")]
        )
    return rows


def create_demo():
    """
    Gradio Blocks 앱을 생성만 하고 반환.
    실행(launch)은 app.py에서 담당.
    """
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
            label="추천 결과",
            datatype=["str", "str", "str", "str"],
            wrap=True,
        )

        # 1) 분석 버튼
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

        # 2) 추천 버튼
        recommend_btn.click(
            call_recommend,
            inputs=hidden_analysis_json,
            outputs=rec_out,
        )

    return demo


if __name__ == "__main__":
    demo = create_demo()
    demo.launch()
