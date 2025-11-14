import { Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'
import Main from './pages/Main'
import ProtectedRoute from './routes/ProtectedRoute'
import Survey from './pages/Survey'
import TextChat from './pages/TextChat'
import Nearby from './pages/Nearby'

export default function App() {
  return (
    <div style={{ maxWidth: 680, margin: '20px auto', padding: 16 }}>
      <nav style={{ marginBottom: 16 }}>
        <Link to="/login">로그인</Link> | <Link to="/survey">설문</Link> | <Link to="/main">메인</Link> | <Link to="/chat">텍스트 챗봇</Link> | <Link to="/Nearby">위치 기반 음악 추천</Link>
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

        <Route
          path="/main"
          element={
            <ProtectedRoute>
              <Main />
            </ProtectedRoute>
          }
        />

       <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <TextChat />
            </ProtectedRoute>
          }
        />

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
  )
}
