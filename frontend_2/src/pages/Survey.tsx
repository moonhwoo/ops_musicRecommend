import { useEffect, useState } from 'react'

const GENRES = [
  'Pop',
  '힙합',
  '록',
  '어쿠스틱/발라드',
  '클래식/재즈',
  'J-Pop',
  '기타',
]

const YEAR_CATEGORY = ['1990s', '2000s', '2010s', '2020s', 'ALL']

export default function Survey() {
  const [userId, setUserId] = useState<string | null>(null)

  const [novelty, setNovelty] = useState<number>(5)
  const [yearCategory, setYearCategory] = useState<string>('ALL')
  const [genres, setGenres] = useState<string[]>([])
  const [artists, setArtists] = useState<string>('')

  useEffect(() => {
    const uid =
      localStorage.getItem('spotify_user_id') ||
      localStorage.getItem('user_id')
    if (uid) {
      setUserId(uid)
      localStorage.setItem('spotify_user_id', uid)
    }
  }, [])

  const toggleGenre = (g: string) => {
    setGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    )
  }

  const submitSurvey = async () => {
    if (!userId) {
      alert('유저 정보가 없습니다. 다시 로그인해주세요.')
      return
    }

    const res = await fetch('http://localhost:4000/api/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        novelty,
        yearCategory,
        genres,
        favorite_artists: artists,
      }),
    })

    const data = await res.json()
    if (data.ok) {
      window.location.href = '/main'
    } else {
      alert('설문 저장 실패')
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#121212] text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 pb-16 pt-20 md:px-8">
        <header className="text-center">
          <h1 className="text-2xl font-semibold">음악 취향 설문</h1>
          <p className="mt-2 text-sm text-gray-400">
            설문 결과는 날씨 기반 추천 + 텍스트 챗봇 추천에 함께 반영됩니다.
          </p>
        </header>

        <div className="space-y-8">
          {/* Q1 */}
          <section className="rounded-2xl bg-[#181818] p-6 md:p-8">
            <h2 className="mb-4 text-2xl font-semibold">
              Q1. 새로운 음악을 얼마나 좋아하시나요?
            </h2>
            <p className="mb-4 text-sm text-gray-400">
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
            <div className="mt-2 text-right text-sm text-emerald-300">
              {novelty} / 10
            </div>
          </section>

          {/* Q2 */}
          <section className="rounded-2xl bg-[#181818] p-6 md:p-8">
            <h2 className="mb-4 text-2xl font-semibold">
              Q2. 주로 어떤 시대 음악을 즐겨 들으시나요?
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              가장 자주 듣는 시대를 선택해주세요.
            </p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {YEAR_CATEGORY.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYearCategory(y)}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    yearCategory === y
                      ? 'border-emerald-500 bg-[#052e16] text-emerald-100'
                      : 'border-[#27272f] bg-[#111827] text-gray-200'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </section>

          {/* Q3 */}
          <section className="rounded-2xl bg-[#181818] p-6 md:p-8">
            <h2 className="mb-4 text-2xl font-semibold">
              Q3. 자주 듣는 장르를 골라주세요.
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              여러 개 선택 가능해요.
            </p>

            <div className="flex flex-wrap gap-3">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    genres.includes(g)
                      ? 'border-emerald-500 bg-[#052e16] text-emerald-100'
                      : 'border-[#27272f] bg-[#111827] text-gray-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </section>

          {/* Q4 */}
          <section className="rounded-2xl bg-[#181818] p-6 md:p-8">
            <h2 className="mb-4 text-2xl font-semibold">
              Q4. 자주 듣는 아티스트가 있다면 적어주세요.
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              예: Ado, YOASOBI, NewJeans ...
            </p>
            <textarea
              className="min-h-[80px] w-full rounded-xl border border-[#27272f] bg-[#111827] p-3 text-sm text-gray-100"
              value={artists}
              onChange={(e) => setArtists(e.target.value)}
              placeholder="자주 듣는 아티스트를 자유롭게 적어주세요."
            />
          </section>
        </div>

        <button
          className="mt-4 w-full rounded-lg bg-[#15803d] py-4 text-lg font-semibold text-emerald-50 hover:brightness-110"
          onClick={submitSurvey}
        >
          제출하기
        </button>
      </div>
    </div>
  )
}
