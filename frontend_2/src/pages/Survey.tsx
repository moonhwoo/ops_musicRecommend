import { useEffect, useState } from "react";

const GENRES = [
  "Pop",
  "힙합",
  "록",
  "어쿠스틱/발라드",
  "클래식/재즈",
  "J-Pop",
  "기타",
];

const YEAR_CATEGORY = ["1990s", "2000s", "2010s", "2020s", "ALL"];

export default function Survey() {
  const [userId, setUserId] = useState<string | null>(null);

  const [novelty, setNovelty] = useState(5);
  const [yearCategory, setYearCategory] = useState("ALL");
  const [genres, setGenres] = useState<string[]>([]);
  const [artists, setArtists] = useState(["", "", ""]);

  useEffect(() => {
    // 1. 우선 localStorage에 저장된 값이 있으면 그걸 사용
    const stored = localStorage.getItem("spotify_user_id");
    if (stored) {
      setUserId(stored);
      return;
    }
  
    // 2. 혹시 URL에 남아있는 경우가 있으면 한 번 더 보조용으로 읽기
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("user_id");
    if (uid) {
      setUserId(uid);
      localStorage.setItem("spotify_user_id", uid);
    }
  }, []);

  const toggleGenre = (g: string) => {
    setGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const submitSurvey = async () => {
    if (!userId) {
      alert("유저 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }

    const answers = {
      novelty,
      yearCategory,
      genres,
      favorite_artists: artists,
    };

    console.log("📌 최종 제출 데이터:", answers);

    const res = await fetch("http://localhost:4000/api/survey", {
   method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: userId,
    novelty,
    yearCategory,
    genres,
    favorite_artists: artists,
  }),
});

    const data = await res.json();
    if (data.ok) {
      window.location.href = "/main";
    } else {
      alert("설문 저장 실패");
    }
  };

  return (
    <div
      className="min-h-screen w-full flex justify-center py-16 px-5"
      style={{ backgroundColor: "#121212", color: "white" }}
    >
      <div className="w-full">
        <h1 className="text-4xl font-bold mb-14 text-center text-green-400">
          음악 취향 설문조사
        </h1>

        {/* Q1 */}
        <section
          className="mb-12 p-8 rounded-xl"
          style={{ background: "#181818" }}
        >
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
        <section
          className="mb-12 p-8 rounded-xl"
          style={{ background: "#181818" }}
        >
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
        <section
          className="mb-12 p-8 rounded-xl"
          style={{ background: "#181818" }}
        >
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
        <section
          className="mb-12 p-8 rounded-xl"
          style={{ background: "#181818" }}
        >
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

        <button
          className="w-full py-4 text-xl rounded-lg font-semibold"
          style={{
            backgroundColor: "#1DB954",
            color: "white",
          }}
          onClick={submitSurvey}
        >
          제출하기
        </button>
      </div>
    </div>
  );
}
