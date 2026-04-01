import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Note, Folder, Theme } from '../types'

const DEFAULT_EMOJIS = ['📝', '💡', '📌', '🎯', '📖', '🔖', '✨', '🧠', '🗒️', '📋']
const FOLDER_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2']

function randomEmoji() {
  return DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)]
}
function randomColor() {
  return FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)]
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

interface NoteStore {
  notes: Note[]
  folders: Folder[]
  activeNoteId: string | null
  activeFolderId: string | null   // null = All Notes
  theme: Theme
  sidebarWidth: number
  searchQuery: string

  // Actions – Notes
  createNote: (folderId?: string | null) => string
  updateNote: (id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'tags' | 'emoji'>>) => void
  deleteNote: (id: string) => void
  setActiveNote: (id: string | null) => void

  // Actions – Folders
  createFolder: (name: string, parentId?: string | null) => string
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  setActiveFolder: (id: string | null) => void

  // UI
  setTheme: (theme: Theme) => void
  setSidebarWidth: (w: number) => void
  setSearchQuery: (q: string) => void
}

const WELCOME_NOTE: Note = {
  id: 'welcome',
  title: '欢迎使用 NoteFlow 👋',
  content: JSON.stringify({
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '欢迎使用 NoteFlow 👋' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'NoteFlow 是一款专注于写作体验的智能笔记应用。以下是一些快速入门技巧：' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '✏️ 编辑器功能' }] },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '支持 ' }, { type: 'text', marks: [{ type: 'bold' }], text: '粗体' }, { type: 'text', text: '、' }, { type: 'text', marks: [{ type: 'italic' }], text: '斜体' }, { type: 'text', text: '、' }, { type: 'text', marks: [{ type: 'underline' }], text: '下划线' }, { type: 'text', text: ' 等富文本格式' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '多级标题（H1 - H3）' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '有序 / 无序列表' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '代码块（支持语法高亮）' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '引用块、任务清单' }] }] },
        ]
      },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '✅ 任务清单示例' }] },
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: true },  content: [{ type: 'paragraph', content: [{ type: 'text', text: '创建第一篇笔记' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '创建一个文件夹整理笔记' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '探索 AI 辅助功能（即将上线）' }] }] },
        ]
      },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '💻 代码块示例' }] },
      { type: 'codeBlock', attrs: { language: 'javascript' }, content: [{ type: 'text', text: 'function greet(name) {\n  return `Hello, ${name}! Welcome to NoteFlow.`\n}\n\nconsole.log(greet("World"))' }] },
      { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: '开始写作，记录你的想法与灵感。' }] }] },
    ]
  }),
  folderId: null,
  tags: ['入门', '示例'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  emoji: '👋',
}

export const useNoteStore = create<NoteStore>()(
  persist(
    (set, get) => ({
      notes: [WELCOME_NOTE],
      folders: [],
      activeNoteId: 'welcome',
      activeFolderId: null,
      theme: 'system',
      sidebarWidth: 260,
      searchQuery: '',

      createNote: (folderId = null) => {
        const id = uid()
        const note: Note = {
          id,
          title: '无标题笔记',
          content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
          folderId: folderId ?? get().activeFolderId,
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          emoji: randomEmoji(),
        }
        set(s => ({ notes: [note, ...s.notes], activeNoteId: id }))
        return id
      },

      updateNote: (id, patch) => {
        set(s => ({
          notes: s.notes.map(n =>
            n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
          )
        }))
      },

      deleteNote: (id) => {
        set(s => {
          const remaining = s.notes.filter(n => n.id !== id)
          const nextActive = s.activeNoteId === id
            ? (remaining[0]?.id ?? null)
            : s.activeNoteId
          return { notes: remaining, activeNoteId: nextActive }
        })
      },

      setActiveNote: (id) => set({ activeNoteId: id }),

      createFolder: (name, parentId = null) => {
        const id = uid()
        set(s => ({
          folders: [...s.folders, {
            id, name,
            parentId: parentId ?? null,
            color: randomColor(),
            createdAt: Date.now(),
          }]
        }))
        return id
      },

      renameFolder: (id, name) => {
        set(s => ({ folders: s.folders.map(f => f.id === id ? { ...f, name } : f) }))
      },

      deleteFolder: (id) => {
        // Move notes out to root, delete sub-folders recursively
        const getAllSubIds = (fid: string): string[] => {
          const subs = get().folders.filter(f => f.parentId === fid).map(f => f.id)
          return [fid, ...subs.flatMap(getAllSubIds)]
        }
        const toDelete = new Set(getAllSubIds(id))
        set(s => ({
          folders: s.folders.filter(f => !toDelete.has(f.id)),
          notes: s.notes.map(n => toDelete.has(n.folderId!) ? { ...n, folderId: null } : n),
          activeFolderId: toDelete.has(s.activeFolderId!) ? null : s.activeFolderId,
        }))
      },

      setActiveFolder: (id) => set({ activeFolderId: id }),
      setTheme: (theme) => set({ theme }),
      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setSearchQuery: (q) => set({ searchQuery: q }),
    }),
    { name: 'noteflow-storage' }
  )
)
