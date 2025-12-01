# server/user_profile.py

from typing import Any, Dict, List

from chatbot.database import get_db


def load_user_profile(spotify_user_id: str) -> Dict[str, Any]:
    """
    MongoDB의 users, surveyresponses 컬렉션에서
    해당 Spotify 유저의 정보를 읽어와 LLM 프롬프트용 dict로 변환한다.

    spotify_user_id: 예) "31xjzjfhw..." 같은 문자열
    """

    db = get_db()

    users_col = db["users"]
    surveys_col = db["surveyresponses"]

    # 1) User 기본 정보
    user_doc = users_col.find_one({"spotify_user_id": spotify_user_id})

    # display_name, hasSurvey 같은 부가정보 (없으면 None/False)
    display_name = user_doc.get("display_name") if user_doc else None
    has_survey = user_doc.get("hasSurvey") if user_doc else False

    # 2) 설문 정보 (가장 최근 것 하나)
    survey_doc = surveys_col.find_one(
        {"user_id": spotify_user_id},
        sort=[("created_at", -1)],
    )

    if survey_doc is None:
        # 설문 안 했을 때 기본값
        return {
            "user_id": spotify_user_id,
            "display_name": display_name,
            "has_survey": has_survey,
            "novelty_score": None,
            "preferred_year_category": None,
            "favorite_genres": [],
            "favorite_artists": [],
        }

    # Mongo 필드 → LLM용 필드 매핑
    novelty_score = survey_doc.get("novelty")
    preferred_year_category = survey_doc.get("yearCategory")
    favorite_genres: List[str] = survey_doc.get("genres", [])

    # favorite_artists는 문자열 배열 ["아이유","NewJeans", ...] 형태라고 가정
    artist_names: List[str] = survey_doc.get("favorite_artists", [])

    favorite_artists: List[Dict[str, Any]] = []
    for idx, name in enumerate(artist_names, start=1):
        favorite_artists.append(
            {
                "rank": idx,         # 0,1,2 순위
                "name": name,
                "spotify_id": None,  # 지금 Mongo에 없으므로 일단 None
            }
        )

    return {
        "user_id": spotify_user_id,
        "display_name": display_name,
        "has_survey": has_survey,
        "novelty_score": novelty_score,
        "preferred_year_category": preferred_year_category,
        "favorite_genres": favorite_genres,
        "favorite_artists": favorite_artists,
    }

'''
테스트 부분

if __name__ == "__main__":
    test_id = "테스트할_spotify_user_id"
    profile = load_user_profile(test_id)
    print(profile)
'''
