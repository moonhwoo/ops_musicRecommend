# Database Schema

음악 추천 서비스 데이터베이스 스키마


### 회원 관련
- `users` - 사용자 기본 정보 (Spotify OAuth)

### 설문조사 관련
- `user_preferences` - novelty_score (0~10) (새로운 곡에 대한 선호도를 숫자값으로 저장)
- `genres` - 장르 목록 
- `user_favorite_genres` - 사용자가 선택한 장르 (최대 3개)
- `user_favorite_artists` - 좋아하는 아티스트 (3명)

### 재생 관련
- `user_locations` - 사용자 위치 정보 (추후 업데이트 예정)
- `play_history` - 재생 기록 (추후 업데이트 예정)

---

##  실행 방법

### 1. 테이블 생성 (순서대로)
```bash
mysql -u root -p your_database < migrations/create_users.sql
mysql -u root -p your_database < migrations/create_survey_tables.sql
mysql -u root -p your_database < migrations/create_genres.sql
mysql -u root -p your_database < migrations/004_create_playback_tables.sql
```

### 2. 초기 데이터 삽입
```bash
mysql -u root -p your_database < seeds/genres_seeds.sql
```

### 3. 한 번에 실행
```bash
cat migrations/*.sql seeds/*.sql | mysql -u root -p your_database
```

---

## ERD
```
users (1) ─┬─ (1) user_preferences
           │
           ├─ (N) user_favorite_genres (N) ─── (1) genres
           │
           ├─ (N) user_favorite_artists
           │
           ├─ (1) user_locations
           │
           └─ (N) play_history
```

---

## 🔧 추후 확장 예정

### user_locations
- 날씨 API 연동 후 추가 예정:
  - `city VARCHAR(100)`
  - `country VARCHAR(100)`

### play_history
- 위치/날씨 정보 컬럼 추가 예정:
  - `latitude DECIMAL(10, 8)`
  - `longitude DECIMAL(11, 8)`
  - `weather_condition VARCHAR(50)`
  - `temperature DECIMAL(5, 2)`

---

## 💡 참고사항

- **Spotify OAuth**: 이메일/비밀번호 로그인 대신 Spotify 계정으로 로그인
- **설문조사**: 회원가입 시 한 번만 진행
- **재생 기록**: 노래 재생할 때마다 자동 저장
```

---
