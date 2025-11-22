from typing import Any, Dict, List

from sqlalchemy import text
from database.database import SessionLocal

def load_user_profile(user_id: int) -> Dict[str, Any]:
    """
    MySQL에서 설문/선호 정보를 읽어와서
    LLM 프롬프트에 넣기 좋은 dict로 변환.
    """
    db = SessionLocal()
    try:
        # 1) 기본 선호 (novelty_score, preferred_year_category)
        pref_row = db.execute(
            text("""
                SELECT novelty_score, preferred_year_category
                FROM user_preferences
                WHERE user_id = :uid
            """),
            {"uid": user_id},
        ).fetchone()

        if pref_row is None:
            # 설문을 안 한 유저일 수도 있으니 기본값 리턴
            return {
                "user_id": user_id,
                "novelty_score": None,
                "preferred_year_category": None,
                "favorite_genres": [],
                "favorite_artists": [],
            }

        novelty_score = pref_row.novelty_score
        preferred_year_category = pref_row.preferred_year_category

        # 2) 선호 장르 이름 리스트
        genre_rows = db.execute(
            text("""
                SELECT g.genre_name
                FROM user_favorite_genres ufg
                JOIN genres g ON ufg.genre_id = g.genre_id
                WHERE ufg.user_id = :uid
                ORDER BY g.genre_id
            """),
            {"uid": user_id},
        ).fetchall()
        favorite_genres: List[str] = [r.genre_name for r in genre_rows]

        # 3) 선호 아티스트 (1~3위)
        artist_rows = db.execute(
            text("""
                SELECT artist_name, artist_spotify_id, artist_rank
                FROM user_favorite_artists
                WHERE user_id = :uid
                ORDER BY artist_rank ASC
            """),
            {"uid": user_id},
        ).fetchall()

        favorite_artists: List[Dict[str, Any]] = [
            {
                "rank": r.artist_rank,
                "name": r.artist_name,
                "spotify_id": r.artist_spotify_id,
            }
            for r in artist_rows
        ]

        return {
            "user_id": user_id,
            "novelty_score": novelty_score,
            "preferred_year_category": preferred_year_category,
            "favorite_genres": favorite_genres,
            "favorite_artists": favorite_artists,
        }
    finally:
        db.close()