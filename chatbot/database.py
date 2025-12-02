from dotenv import load_dotenv
from pymongo import MongoClient
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent  # .../ops_musicRecommend
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

# MONGO_URI 우선, 없으면 DB_URL 사용
MONGO_URI = os.getenv("DB_URL")
if not MONGO_URI:
    raise ValueError("❌ MONGO_URI(DB_URL)가 설정 안 됐어요!")

client = MongoClient(MONGO_URI)
db = client.get_default_database()
if db is None:
    db = client["ops_music"]


def get_db():
    """다른 모듈에서 Mongo DB 객체를 가져올 때 사용하는 헬퍼."""
    return db


"""
if __name__ == "__main__":
    print("✅ MongoDB 연결 테스트 시작")
    print("컬렉션 목록:", db.list_collection_names())

    print("예시 - surveyresponses 첫 문서:")
    print(db["surveyresponses"].find())
    print(list(db["surveyresponses"].find()))

    print("✅ MongoDB 테스트 완료") """
