import { useNavigate } from 'react-router-dom'

export default function Survey() {
  const nav = useNavigate()

  function skip() {
    // 설문 완료(혹은 건너뛰기) 플래그 — 다음 로그인 땐 메인으로 직행
    // localStorage.setItem('survey_done', '1')
    nav('/main', { replace: true })
  }

  return (
<<<<<<< Updated upstream
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
=======
    <div className="min-h-screen w-full bg-[#121212] text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 pb-16 pt-20 md:px-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-[#1DB954] md:text-4xl">
            음악 취향 설문조사
          </h1>
        </header>

        <div className="space-y-10">
          {/* Q1 */}
          <section className="rounded-2xl bg-[#181818] p-6 md:p-8">
            <h2 className="text-2xl font-semibold mb-4">
              Q1. 새로운 음악을 얼마나 좋아하시나요?
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              (0 = 싫어함 ~ 10 = 매우 좋아함)
            </p>

            <input
              type="range"
              min={0}
              max={10}
              value={novelty}
              onChange={(e) => setNovelty(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-right text-green-400 mt-2 text-lg">
              {novelty} / 10
            </div>
          </section>

          {/* Q2 */}
          <section className="rounded-2xl bg-[#181818] p-6 md:p-8">
            <h2 className="text-2xl font-semibold mb-6">
              Q2. 주로 듣는 음악 시대는?
            </h2>

            <div className="flex flex-wrap gap-6 text-lg">
              {YEAR_CATEGORY.map((y) => (
                <label
                  key={y}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="year"
                    checked={yearCategory === y}
                    onChange={() => setYearCategory(y)}
                  />
                  <span>{y}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Q3 */}
          <section className="rounded-2xl bg-[#181818] p-6 md:p-8">
            <h2 className="text-2xl font-semibold mb-6">
              Q3. 좋아하는 음악 장르 (복수 선택)
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 text-lg">
              {GENRES.map((g) => (
                <label key={g} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genres.includes(g)}
                    onChange={() => toggleGenre(g)}
                  />
                  <span>{g}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Q4 */}
          <section className="rounded-2xl bg-[#181818] p-6 md:p-8">
            <h2 className="text-2xl font-semibold mb-6">
              Q4. 좋아하는 아티스트 1~3순위
            </h2>

            {artists.map((a, idx) => (
              <div key={idx} className="mb-6">
                <label className="block mb-2 text-gray-300 text-lg">
                  {idx + 1}순위 아티스트
                </label>
                <input
                  className="w-full px-4 py-3 rounded-md text-lg"
                  style={{ background: "#2A2A2A", color: "white" }}
                  placeholder="아티스트 이름 입력"
                  value={a}
                  onChange={(e) => {
                    const arr = [...artists];
                    arr[idx] = e.target.value;
                    setArtists(arr);
                  }}
                />
              </div>
            ))}
          </section>
        </div>

        <button
          className="mt-4 w-full rounded-lg bg-[#1DB954] py-4 text-lg font-semibold text-black hover:brightness-110"
          onClick={submitSurvey}
        >
          제출하기
>>>>>>> Stashed changes
        </button>
      </div>
    </div>
  )
}
