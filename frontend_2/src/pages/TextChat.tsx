import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'

type Msg = { role: 'user' | 'assistant'; content: string }

type Song = {
  title: string
  artist: string
  reason: string
  link?: string
  preview_url?: string
  track_id?: string
  uri?: string
  embed_url?: string
}

type ChatApiResponse = {
  reply: string
  songs?: Song[]
}

const CHAT_API_URL = 'http://127.0.0.1:8000/chat'

export default function TextChat() {
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [sending, setSending] = useState(false)
  const [songs, setSongs] = useState<Song[]>([])
  const [selectedSongIdx, setSelectedSongIdx] = useState<number | null>(null)

  const viewportRef = useRef<HTMLDivElement | null>(null)
  const nav = useNavigate()

  // 항상 마지막 메시지로 스크롤
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  async function onSend() {
    const text = input.trim()
    if (!text || sending) return

    setInput('')

    const nextMsgs: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(nextMsgs)
    setSending(true)

    try {
      const { reply, songs: newSongs } = await getReply(text, nextMsgs)

      setMsgs((m) => [...m, { role: 'assistant', content: reply }])
      setSongs(newSongs ?? [])
      setSelectedSongIdx(newSongs && newSongs.length > 0 ? 0 : null)
    } catch (err) {
      console.error(err)
      setMsgs((m) => [
        ...m,
        {
          role: 'assistant',
          content: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        },
      ])
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

  const selectedSong =
    selectedSongIdx !== null && selectedSongIdx < songs.length
      ? songs[selectedSongIdx]
      : null

  return (
    <div
      style={{
        height: '100svh',
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr) auto',
        background: '#f3f4fb',
      }}
    >
      {/* 상단바 */}
      <header
        style={{
          borderBottom: '1px solid #e2e2e2',
          padding: '12px 16px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={goHome}
          aria-label="메인으로"
          title="메인으로"
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #ddd',
            background: '#f7f7f7',
            cursor: 'pointer',
          }}
        >
          ← 메인으로
        </button>
        <b>텍스트 챗봇</b>
        <span style={{ color: '#666', marginLeft: 8 }}>
          / 대화는 현재 세션에만 저장됩니다
        </span>
      </header>

      {/* 채팅 영역 + 추천곡 섹션 */}
      <main
        style={{
          display: 'grid',
          gridTemplateRows: 'minmax(0, 3fr) minmax(0, 2fr)',
          gap: 0,
        }}
      >
        {/* 대화 로그 */}
        <div
          style={{
            background: '#f3f4fb',
            padding: '0 16px',
            minHeight: 0,
          }}
        >
          <div
            id="logViewport"
            ref={viewportRef}
            style={{
              flexGrow: 1,
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '16px 0 24px',
            }}
          >
            {msgs.length === 0 ? (
              <div style={{ color: '#888', marginTop: 8 }}>
                지금 기분이나 상황을 편하게 적어보면,
                <br />
                감정 분석 + 노래 추천을 함께 해줄게요.
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {msgs.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      width: 'fit-content',
                      background: m.role === 'user' ? '#e3edff' : '#ffffff',
                      border: '1px solid #e5e5e5',
                      borderRadius: 14,
                      padding: '10px 12px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: 1.5,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    }}
                  >
                    {m.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 추천 곡 리스트 + Spotify 플레이어 */}
        {songs.length > 0 && (
          <section
            style={{
              borderTop: '1px solid #e2e2e2',
              background: '#fdfdfd',
              padding: '10px 16px 12px',
              display: 'grid',
              gridTemplateRows: 'minmax(0, 1.6fr) auto',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <h3
                style={{
                  fontSize: 13,
                  margin: 0,
                  color: '#555',
                }}
              >
                이번 대화에서 추천된 곡
              </h3>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                maxHeight: 300,
                overflowY: 'auto',
              }}
            >
              {songs.map((s, idx) => (
                <button
                  key={`${s.title}-${idx}`}
                  onClick={() => setSelectedSongIdx(idx)}
                  style={{
                    textAlign: 'left',
                    padding: 8,
                    borderRadius: 10,
                    border:
                      idx === selectedSongIdx
                        ? '1px solid #2f6bff'
                        : '1px solid #e0e0e0',
                    background:
                      idx === selectedSongIdx ? '#eef3ff' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: 2,
                      fontSize: 13,
                    }}
                  >
                    {s.title}{' '}
                    <span style={{ color: '#777' }}>- {s.artist}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#555' }}>{s.reason}</div>
                  {s.link && (
                    <div style={{ marginTop: 2, fontSize: 11 }}>
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: '#2f6bff',
                          textDecoration: 'underline',
                        }}
                      >
                        Spotify에서 열기
                      </a>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {selectedSong && selectedSong.embed_url && (
              <div
                style={{
                  marginTop: 4,
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                }}
              >
                <iframe
                  src={selectedSong.embed_url}
                  width="100%"
                  height="80"
                  frameBorder={0}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            )}
          </section>
        )}
      </main>

      {/* 입력 영역 */}
      <footer
        style={{
          borderTop: '1px solid #e2e2e2',
          padding: 12,
          background: '#fff',
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 8,
            maxWidth: 960,
            margin: '0 auto',
          }}
        >
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
              background:
                sending || !input.trim() ? '#cdd9ff' : '#2f6bff',
              color: '#fff',
              cursor:
                sending || !input.trim() ? 'not-allowed' : 'pointer',
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

async function getReply(
  userText: string,
  history: Msg[],
): Promise<ChatApiResponse> {
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

  if (!r.ok) {
    throw new Error(`Chat API error: ${r.status}`)
  }

  const j = (await r.json()) as ChatApiResponse
  return j
}
