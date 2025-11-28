import { Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'
import Main from './pages/Main'
import ProtectedRoute from './routes/ProtectedRoute'
import Survey from './pages/Survey'
import TextChat from './pages/TextChat'
import Nearby from './pages/Nearby'

export default function App() {
  return (
<<<<<<< Updated upstream
    <div style={{ maxWidth: 680, margin: '20px auto', padding: 16 }}>
      <nav style={{ marginBottom: 16 }}>
        <Link to="/login">로그인</Link> | <Link to="/survey">설문</Link> | <Link to="/main">메인</Link> | <Link to="/chat">텍스트 챗봇</Link> | <Link to="/nearby">위치 기반 음악 추천</Link>
      </nav>


      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/survey"
          element={
            <ProtectedRoute>
              <Survey />
            </ProtectedRoute>
          }
        />
=======
    <div className="min-h-screen w-full bg-[#121212] text-white">
      <div className="mx-auto max-w-6xl px-4 py-5">
        {/* 상단 네비게이션 */}
        <nav className="mb-6 flex flex-col items-center gap-3 md:flex-row md:justify-center md:gap-6">
          <div className="text-lg font-semibold tracking-tight">
            풍경음
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-300">
            <Link className="hover:text-white" to="/login">
              로그인
            </Link>
            <span className="text-gray-600">|</span>
            <Link className="hover:text-white" to="/survey">
              설문
            </Link>
            <span className="text-gray-600">|</span>
            <Link className="hover:text-white" to="/main">
              메인
            </Link>
            <span className="text-gray-600">|</span>
            <Link className="hover:text-white" to="/chat">
              텍스트 챗봇
            </Link>
            <span className="text-gray-600">|</span>
            <Link className="hover:text-white" to="/nearby">
              위치 기반 음악 추천
            </Link>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />

          <Route path="/survey" element={<Survey />} />
>>>>>>> Stashed changes

          <Route
            path="/main"
            element={
              <ProtectedRoute>
                <Main />
              </ProtectedRoute>
            }
          />

<<<<<<< Updated upstream
       <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <TextChat />
            </ProtectedRoute>
          }
        />
=======
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <TextChat />
              </ProtectedRoute>
            }
          />
>>>>>>> Stashed changes

          <Route
            path="/nearby"
            element={
              <ProtectedRoute>
                <Nearby />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </div>
  )
}
