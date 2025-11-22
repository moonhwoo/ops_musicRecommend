import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { login, saveSession } from '../services/auth'

type NavState = { from?: string } | null

export default function Login() {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const nav = useNavigate()
  const loc = useLocation()
  const surveyDone = localStorage.getItem('survey_done') === '1'
  const defaultTarget = surveyDone ? '/main' : '/survey'
  const from = (loc.state as NavState)?.from ?? defaultTarget


  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    if (!id || !pw) {
      setErr('아이디와 비밀번호를 입력하세요.')
      return
    }
    try {
      setLoading(true)
      const r = await login(id, pw)
      saveSession(r)
      // 로그인 성공 → 설문 안 했으면 /survey, 했으면 /main
      nav(from, { replace: true })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '로그인 실패'
      setErr(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '60px auto' }}>
      <h1>로그인</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
        <label>
          아이디
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="demo" autoComplete="username" />
        </label>
        <label>
          비밀번호
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="pass1234" autoComplete="current-password" />
        </label>
        {err && <div style={{ color: 'crimson' }}>{err}</div>}
        <button disabled={loading} type="submit">{loading ? '확인 중…' : '로그인'}</button>
      </form>
      <p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
        데모: <b>demo / pass1234</b>
      </p>
    </div>
  )
}
