# 1) 파이썬 베이스 이미지
FROM python:3.11-slim

# 2) 작업 디렉토리
WORKDIR /app

# 3) 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4) 소스 코드 복사
COPY . ./chatbot

# 5) 컨테이너에서 열 포트 (FastAPI 서버 포트)
EXPOSE 8000

# 6) 서버 실행 커맨드
CMD ["python", "-m", "chatbot.mcp.server.server"]
# 혹은 uvicorn 직접 쓴다면:
#CMD ["uvicorn", "chatbot.mcp.server.server:app", "--host", "0.0.0.0", "--port", "8000"]

# 도커 실행 docker run --env-file .env -p 8000:8000 music-chatbot
# 이미지 빌드 docker build -t music-chatbot .
# 컨테이너 docker run -d -p 8000:8000 --name music-chatbot --env-file .env music-chatbot