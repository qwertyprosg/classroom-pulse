import { useEffect, useRef, useCallback } from 'react'
import socket from '../lib/socket.js'

const CHUNK_INTERVAL = 10000 // 10 seconds

export default function useSpeechRecognition({ isRecording, onChunk }) {
  const recognitionRef = useRef(null)
  const bufferRef = useRef('')
  const intervalRef = useRef(null)

  const flush = useCallback(() => {
    const text = bufferRef.current.trim()
    if (text) {
      const chunk = { text, timestamp: Date.now() }
      onChunk(chunk)
      socket.emit('caption-chunk', chunk)
      bufferRef.current = ''
    }
  }, [onChunk])

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    if (isRecording) {
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'

      rec.onresult = e => {
        let final = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        }
        if (final) bufferRef.current += final
      }

      rec.onerror = err => { if (err.error !== 'no-speech') console.warn('SR error:', err.error) }
      rec.onend = () => { if (isRecording) rec.start() } // auto-restart

      try { rec.start() } catch (_) {}
      recognitionRef.current = rec
      intervalRef.current = setInterval(flush, CHUNK_INTERVAL)
    } else {
      recognitionRef.current?.stop()
      recognitionRef.current = null
      clearInterval(intervalRef.current)
      flush() // flush remainder
    }

    return () => {
      recognitionRef.current?.stop()
      clearInterval(intervalRef.current)
    }
  }, [isRecording, flush])
}
