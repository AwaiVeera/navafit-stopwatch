import { useEffect, useRef, useState } from 'react'

import { askAY } from '../services/perplexity'
import type { AYMessage } from '../services/perplexity'

export function AYScreen() {
  const [messages, setMessages] = useState<AYMessage[]>([])
  const [input, setInput] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const threadRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages, isBusy])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isBusy) return

    const userMessage: AYMessage = { role: 'user', content: trimmed }
    const nextMessages: AYMessage[] = [...messages, userMessage]

    setMessages(nextMessages)
    setInput('')
    setError('')
    setIsBusy(true)

    try {
      const reply = await askAY(nextMessages)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not reach AY. Check your connection.'
      setError(message)
    } finally {
      setIsBusy(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  return (
    <section className="screen-shell ay-screen">
      <div className="top-chrome">
        <div className="ay-header-badge">
          <span className="ay-badge-label">AY</span>
        </div>
        <div>
          <p className="section-kicker">Kalari · Gadah · Breathwork</p>
        </div>
      </div>

      {messages.length === 0 && (
        <div className="ay-empty-state content-stack">
          <div className="glass-sheet text-center space-y-3">
            <div className="ay-empty-icon">⟡</div>
            <p className="title-font text-[1.3rem] font-medium text-[var(--text-primary)]">Ask AY anything</p>
            <p className="support-copy text-[var(--text-secondary)]">
              AY answers questions on <strong>Kalaripayattu</strong>, <strong>Gadah</strong> training, and <strong>Breathwork</strong>.
              Every answer is research-grounded with cited sources.
            </p>
            <div className="space-y-2 text-left mt-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="ay-example-chip w-full text-left"
                  onClick={() => setInput(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div ref={threadRef} className="ay-thread content-stack">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`ay-bubble ${msg.role === 'user' ? 'ay-bubble-user' : 'ay-bubble-assistant'}`}
            >
              {msg.role === 'assistant' && (
                <p className="ay-bubble-role-label">AY</p>
              )}
              <p className="ay-bubble-text">{msg.content}</p>
            </div>
          ))}

          {isBusy && (
            <div className="ay-bubble ay-bubble-assistant">
              <p className="ay-bubble-role-label">AY</p>
              <div className="ay-thinking-dots">
                <span /><span /><span />
              </div>
            </div>
          )}

          {error && (
            <div className="glass-card text-sm text-[var(--danger-soft)] p-3">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="ay-input-bar">
        <textarea
          className="ay-input"
          placeholder="Ask about Kalari, Gadah, or Breathwork…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isBusy}
        />
        <button
          type="button"
          className="ay-send-btn"
          onClick={() => void handleSend()}
          disabled={isBusy || !input.trim()}
          aria-label="Send"
        >
          <SendIcon />
        </button>
      </div>
    </section>
  )
}

const EXAMPLE_QUESTIONS = [
  'What is the science behind Kalaripayattu flexibility training?',
  'How does Gadah training improve rotational power?',
  'What does research say about box breathing for performance?',
]

function SendIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <path d="M3 10h14M10 3l7 7-7 7" />
    </svg>
  )
}
