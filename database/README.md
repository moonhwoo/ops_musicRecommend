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

# 🎵 OPS Music Recommend – 로컬 DB 세팅 가이드

팀원들이 **로컬 MySQL 환경을 동일하게 맞추고** 백엔드 개발을 진행할 수 있도록 

아래 순서를 그대로 따르면 **DB 생성 → 테이블 생성 → Seed 데이터 입력 → .env 설정**까지 완료됩니다.

---

## ✅ 1. MySQL 설치

### macOS (Homebrew)

```bash
brew install mysql
brew services start mysql
```

### Windows

1. MySQL Installer 다운로드
2. MySQL Server + MySQL Workbench 설치
3. 설치 과정에서 root 비밀번호 설정

---

##  2. MySQL 접속 확인

아래 명령을 터미널(또는 CMD/Powershell)에서 실행:

```bash
mysql -u root -p
```

비밀번호 입력 후 MySQL 콘솔이 열리면 정상입니다.(비밀번호를 꼭 기억해야 합니다)

---

##  3. 데이터베이스 생성

MySQL 콘솔 안에서 아래 실행:

```sql
CREATE DATABASE ops_music_recommend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

생성 확인:

```sql
SHOW DATABASES;
```

---

##  4. 테이블 생성 + Seed 데이터 삽입

프로젝트 루트 위치에서 아래 명령을 *하나씩* 실행하세요.

> database폴더안에 migrations 폴더에 들어가서 실행합니다.

```bash
mysql -u root -p ops_music_recommend < migrations/create_users.sql
mysql -u root -p ops_music_recommend < migrations/create_genres.sql
mysql -u root -p ops_music_recommend < migrations/create_survey.sql
mysql -u root -p ops_music_recommend < migrations/create_playback.sql
mysql -u root -p ops_music_recommend < seeds/seeds.sql
```

오류 없이 실행되면 테이블 및 기본 데이터 입력이 완료된 것입니다.

---

## ✅ 5. 테이블 생성 확인

MySQL 접속:

```bash
mysql -u root -p
```

DB 선택:

```sql
USE ops_music_recommend;
```

테이블 목록 확인:

```sql
SHOW TABLES;
```

예상되는 테이블:

* users
* genres
* survey
* play_history
* user_preferences
* user_favorite_genres
* user_favorite_artists
* user_locations

간단한 데이터 확인:

```sql
SELECT * FROM genres;
```

---

##  6. .env 파일 설정

프로젝트 루트에 `.env` 파일을 생성하고 아래 내용 추가:

```
DB_URL=mysql+pymysql://root:본인비밀번호@localhost:3306/ops_music_recommend
```

예시:

```
DB_URL=mysql+pymysql://root:1234@localhost:3306/ops_music_recommend
```

>  비밀번호만 본인 MySQL root 비밀번호로 변경하면 됩니다.

---

## ⚙️ 7. DB 연결 테스트 (선택)

### 필요한 패키지 설치

```bash
pip install sqlalchemy pymysql python-dotenv
```

### 테스트 실행

```bash
python database/database.py
```

정상 출력 예시:

* SQL 실행 로그
* genres 테이블 레코드 목록

---

##  완료!



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
