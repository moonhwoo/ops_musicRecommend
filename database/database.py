# database/database.py

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# .env 파일 읽기
load_dotenv()

DB_URL = os.getenv("DB_URL")

if not DB_URL:
    raise ValueError("❌ DB_URL이 설정 안 됐어요. .env 파일을 확인하세요.")

# SQLAlchemy 엔진 & 세션팩토리 생성
engine = create_engine(DB_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 나중에 FastAPI 같은 데서 쓸 함수 (지금은 그냥 준비만)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 단독 실행 테스트용
if __name__ == "__main__":
    print("✅ DB 연결 테스트 시작")

    # 1) 엔진으로 직접 연결 테스트
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM genres"))
        count = result.scalar()
        print(f"🎵 genres 테이블에 레코드 개수: {count}")

    # 2) 세션으로도 한 번 테스트
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT * FROM genres"))
        rows = result.fetchall()
        print("🎧 genres 내용:")
        for row in rows:
            print(row)
    finally:
        db.close()

    print("✅ DB 테스트 완료")