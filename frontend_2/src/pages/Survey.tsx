import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react';

export default function Survey() {
  const nav = useNavigate()

  //스포티파이로그인-> 토큰과 userId 저장
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    const userId = params.get("user_id");
    const name = params.get("display_name");

    if (token && userId) {
      localStorage.setItem("spotify_access_token", token);
      localStorage.setItem("spotify_user_id", userId);
      localStorage.setItem("spotify_display_name", name || "");
    }
  }, []);

  function skip() {
    // 설문 완료(혹은 건너뛰기) 플래그 — 다음 로그인 땐 메인으로 직행
    // localStorage.setItem('survey_done', '1')
    nav('/main', { replace: true })
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>음악 취향 설문</h1>
      <p style={{ color: '#555' }}>
        지금은 로그인 후에, 간단한 취향 설문을 진행할 페이지
        (백엔드 연동 전까지는 데이터 저장 X)
      </p>

      <div style={{ marginTop: 24, padding: 16, border: '1px dashed #ccc', borderRadius: 12 }}>
        {/* 설문 폼 붙일 자리 */}
        <p>여기에 설문 문항 UI가 들어갈 예정?</p>
        <ul>
          <li>예) 선호 장르(복수 선택)</li>
        </ul>
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={skip} style={{ padding: '8px 14px' }}>
          설문 건너뛰기
        </button>
      </div>
    </div>
  )
}
