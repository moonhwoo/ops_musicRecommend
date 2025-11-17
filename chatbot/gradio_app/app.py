# chatbot/gradio_app/app.py
# -*- coding: utf-8 -*-

from ..mcp.client.client import create_demo

demo = create_demo()

if __name__ == "__main__":
    demo.launch()
