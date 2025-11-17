import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'   

type Msg = { role: 'user' | 'assistant'; content: string }

const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL as string | undefined

export default function TextChat() {
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [sending, setSending] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  const nav = useNavigate()                     

  // 스크롤 항상 마지막 메시지로
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  async function onSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')

    const nextMsgs: Msg[] = [...msgs, { role: 'user' as const, content: text }]
    setMsgs(nextMsgs)
    setSending(true)

    try {
      const reply = await getReply(text, nextMsgs)
      setMsgs((m) => [...m, { role: 'assistant' as const, content: reply }])
    } catch (err) {
      console.error(err)
      setMsgs((m) => [...m, { role: 'assistant' as const, content: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }])
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  function goHome() {                        
    nav('/main')
  }

  return (
    <div
      style={{
        height: '100svh',
        display: 'grid',
        gridTemplateRows: 'auto minmax(0,1fr) auto',
      }}
    >
      {/* 상단바 */}
      <header style={{ borderBottom: '1px solid #eee', padding: '12px 16px', background: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={goHome}
          aria-label="메인으로"
          title="메인으로"
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7', cursor: 'pointer' }}
        >
          ← 메인으로
        </button>
        <b>텍스트 챗봇</b>
        <span style={{ color: '#666', marginLeft: 8 }}>/ 대화는 현재 세션에만 저장됩니다</span>
      </header>

      {/* 대화 로그 */}
      <main
        // NOTE: main은 고정된 영역이며, 내부 logViewport만 스크롤 가능
        style={{
          flex: 1,
          background: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 16px',
          minHeight: 0,
        }}
      >
        {/* 실제 스크롤/레이아웃 컨테이너 */}
        <div
          id="logViewport"
          ref={viewportRef}        // 자동 스크롤 대상
          style={{
            flexGrow: 1,          
            overflowY: 'auto',
            overflowX: 'hidden',   
            display: 'flex',       
            flexDirection: 'column',
            gap: 8,
            padding: '16px 0',      
          }}
        >
          {msgs.length === 0 ? (
            <div style={{ color: '#888' }}>대화를 시작해보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {msgs.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    width: 'fit-content',
                    background: m.role === 'user' ? '#e6f0ff' : '#fff',
                    border: '1px solid #e5e5e5',
                    borderRadius: 10,
                    padding: '10px 12px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.5,
                  }}
                >
                  {m.content}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 입력 영역: 입력창 + (우측) 보내기 버튼 */}
      <footer style={{ borderTop: '1px solid #eee', padding: 12, background: '#fff', position: 'sticky', bottom: 0, zIndex: 10, }}>
        <div style={{ display: 'flex', gap: 8, maxWidth: 960, margin: '0 auto' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="메시지를 입력하세요. (Enter 전송, Shift+Enter 줄바꿈)"
            style={{
              flex: 1,
              resize: 'none',
              padding: 8,
              height: 40,
              borderRadius: 8,
              border: '1px solid #ddd',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={onSend}
            disabled={sending || !input.trim()}
            style={{
              alignSelf: 'stretch',
              minWidth: 96,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid #2c68ff',
              background: sending || !input.trim() ? '#cdd9ff' : '#2f6bff',
              color: '#fff',
              cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            }}
            title="보내기"
          >
            {sending ? '전송 중…' : '보내기'}
          </button>
        </div>
      </footer>
    </div>
  )
}

/** LLM 호출부: VITE_CHAT_API_URL이 있으면 호출, 없으면 규칙기반 더미 응답 */
async function getReply(userText: string, history: Msg[]): Promise<string> {
  if (!CHAT_API_URL) {
    // 더미: 간단한 규칙 기반
    if (/비|rain/i.test(userText)) return '비 오는 날엔 lofi나 재즈가 잘 어울려요 ☔'
    if (/(신나|업비트|에너지|rock|edm)/i.test(userText)) return '업비트한 EDM/락 플레이리스트를 추천해요 🔊'
    return `좋아요! "${userText}" 주제로 들을만한 곡을 찾아볼게요.`
  }

  // LLM 백엔드 예시
  const payload = {
    messages: [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userText },
    ],
  }
  const r = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error(`Chat API error: ${r.status}`)
  const j = (await r.json()) as { reply?: string }
  return j.reply ?? '응답을 이해하지 못했어요.'
}
