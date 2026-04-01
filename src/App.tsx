import { useEffect, useState, useRef, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import { useNoteStore } from './store/noteStore'
import { useShallow } from 'zustand/react/shallow'
import './index.css'

export default function App() {
  const { theme, sidebarWidth, setSidebarWidth, createNote } = useNoteStore(useShallow(s => ({
    theme: s.theme,
    sidebarWidth: s.sidebarWidth,
    setSidebarWidth: s.setSidebarWidth,
    createNote: s.createNote,
  })))

  // Resolve actual dark mode
  const [dark, setDark] = useState(false)
  useEffect(() => {
    function resolve() {
      if (theme === 'dark') return true
      if (theme === 'light') return false
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    setDark(resolve())
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => { if (theme === 'system') setDark(mq.matches) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // Resizable sidebar drag
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(sidebarWidth)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startW.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      const newW = Math.max(200, Math.min(400, startW.current + delta))
      setSidebarWidth(newW)
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [setSidebarWidth])

  // Ctrl+N = new note
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        createNote()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [createNote])

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${dark ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Sidebar */}
      <div style={{ width: sidebarWidth, minWidth: sidebarWidth }} className="h-full overflow-hidden flex flex-col">
        <Sidebar dark={dark} />
      </div>

      {/* Resize handle */}
      <div
        className={`w-1 h-full cursor-col-resize flex-shrink-0 transition-colors
          ${dark ? 'bg-gray-700/50 hover:bg-violet-500' : 'bg-gray-200 hover:bg-violet-400'}`}
        onMouseDown={onMouseDown}
      />

      {/* Editor */}
      <div className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
        <Editor dark={dark} />
      </div>
    </div>
  )
}
