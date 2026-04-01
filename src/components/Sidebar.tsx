import { useState, useRef, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  FileText, Folder, FolderOpen, Plus, Trash2, Search,
  ChevronRight, ChevronDown, Sun, Moon, Monitor,
  MoreHorizontal, Edit3, Star, Hash
} from 'lucide-react'
import { useNoteStore } from '../store/noteStore'
import type { Note, Folder as FolderType, Theme } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

/* ── helpers ── */
function timeAgo(ts: number) {
  return formatDistanceToNow(ts, { addSuffix: true, locale: zhCN })
}

/* ── Folder context menu ── */
function FolderMenu({
  folder, onClose, dark
}: { folder: FolderType; onClose: () => void; dark: boolean }) {
  const renameFolder = useNoteStore(s => s.renameFolder)
  const deleteFolder = useNoteStore(s => s.deleteFolder)
  const setActiveFolder = useNoteStore(s => s.setActiveFolder)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(folder.name)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (renaming) inputRef.current?.focus() }, [renaming])

  const base = dark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'

  if (renaming) return (
    <div className={`absolute z-50 top-6 left-0 shadow-xl border rounded-lg p-2 w-44 ${base}`}>
      <input
        ref={inputRef}
        className={`w-full text-sm px-2 py-1 rounded outline-none border ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { renameFolder(folder.id, name); onClose() }
          if (e.key === 'Escape') onClose()
        }}
      />
    </div>
  )
  return (
    <div className={`absolute z-50 top-6 left-0 shadow-xl border rounded-lg py-1 w-36 ${base}`}>
      <button className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-violet-50 dark:hover:bg-violet-900/30" onClick={() => setRenaming(true)}>
        <Edit3 size={13} /> 重命名
      </button>
      <button className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { deleteFolder(folder.id); setActiveFolder(null); onClose() }}>
        <Trash2 size={13} /> 删除
      </button>
    </div>
  )
}

/* ── Single folder row ── */
function FolderRow({ folder, depth, dark }: { folder: FolderType; depth: number; dark: boolean }) {
  const { folders, notes, activeFolderId, setActiveFolder, createNote } = useNoteStore(useShallow(s => ({
    folders: s.folders, notes: s.notes, activeFolderId: s.activeFolderId,
    setActiveFolder: s.setActiveFolder, createNote: s.createNote,
  })))
  const [open, setOpen] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const children = folders.filter(f => f.parentId === folder.id)
  const noteCount = notes.filter(n => n.folderId === folder.id).length
  const isActive = activeFolderId === folder.id

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer select-none relative
          ${isActive
            ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
          }`}
        style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
        onClick={() => { setActiveFolder(folder.id); setOpen(true) }}
      >
        <button
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {open
          ? <FolderOpen size={14} style={{ color: folder.color }} />
          : <Folder size={14} style={{ color: folder.color }} />
        }
        <span className="flex-1 text-sm truncate">{folder.name}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">{noteCount}</span>

        <div className="relative">
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }}
          >
            <MoreHorizontal size={13} />
          </button>
          {showMenu && <FolderMenu folder={folder} onClose={() => setShowMenu(false)} dark={dark} />}
        </div>

        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          onClick={e => { e.stopPropagation(); createNote(folder.id) }}
          title="在此文件夹新建笔记"
        >
          <Plus size={13} />
        </button>
      </div>

      {open && children.map(child => (
        <FolderRow key={child.id} folder={child} depth={depth + 1} dark={dark} />
      ))}
    </div>
  )
}

/* ── Note list item ── */
function NoteItem({ note }: { note: Note; dark: boolean }) {
  const { activeNoteId, setActiveNote, deleteNote } = useNoteStore(useShallow(s => ({
    activeNoteId: s.activeNoteId, setActiveNote: s.setActiveNote, deleteNote: s.deleteNote,
  })))
  const isActive = activeNoteId === note.id

  // Extract plain-text preview from TipTap JSON
  function getPreview(content: string): string {
    try {
      const doc = JSON.parse(content)
      const texts: string[] = []
      function walk(node: Record<string, unknown>) {
        if (node.type === 'text') texts.push(node.text as string)
        if (Array.isArray(node.content)) (node.content as Record<string, unknown>[]).forEach(walk)
      }
      walk(doc)
      return texts.join(' ').slice(0, 80)
    } catch { return '' }
  }

  return (
    <div
      className={`group px-3 py-2.5 rounded-lg cursor-pointer select-none relative
        ${isActive
          ? 'bg-violet-100 dark:bg-violet-900/40'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
        }`}
      onClick={() => setActiveNote(note.id)}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-sm">{note.emoji}</span>
        <span className={`text-sm font-medium truncate flex-1 ${isActive ? 'text-violet-700 dark:text-violet-300' : 'text-gray-800 dark:text-gray-200'}`}>
          {note.title || '无标题笔记'}
        </span>
        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
        >
          <Trash2 size={12} />
        </button>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{getPreview(note.content)}</p>
      <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">{timeAgo(note.updatedAt)}</p>
    </div>
  )
}

/* ── Theme picker ── */
function ThemePicker({ theme, setTheme, dark }: { theme: Theme; setTheme: (t: Theme) => void; dark: boolean }) {
  const items: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun size={14} />, label: '浅色' },
    { value: 'dark', icon: <Moon size={14} />, label: '深色' },
    { value: 'system', icon: <Monitor size={14} />, label: '跟随系统' },
  ]
  return (
    <div className={`flex items-center gap-1 rounded-lg p-1 ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
      {items.map(item => (
        <button
          key={item.value}
          onClick={() => setTheme(item.value)}
          title={item.label}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all
            ${theme === item.value
              ? 'bg-white dark:bg-gray-600 shadow text-violet-600 dark:text-violet-300 font-medium'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
        >
          {item.icon}
        </button>
      ))}
    </div>
  )
}

/* ── Main Sidebar ── */
export default function Sidebar({ dark }: { dark: boolean }) {
  const {
    notes, folders, activeFolderId,
    theme, searchQuery,
    createNote, createFolder, setActiveFolder,
    setTheme, setSearchQuery,
  } = useNoteStore(useShallow(s => ({
    notes: s.notes, folders: s.folders,
    activeFolderId: s.activeFolderId,
    theme: s.theme, searchQuery: s.searchQuery,
    createNote: s.createNote, createFolder: s.createFolder,
    setActiveFolder: s.setActiveFolder,
    setTheme: s.setTheme, setSearchQuery: s.setSearchQuery,
  })))

  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const folderInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (newFolderMode) folderInputRef.current?.focus() }, [newFolderMode])

  // Filter notes to display
  const visibleNotes = notes.filter(note => {
    const inFolder = activeFolderId === null || note.folderId === activeFolderId
    if (!searchQuery) return inFolder
    const q = searchQuery.toLowerCase()
    return inFolder && (note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q))
  })

  const rootFolders = folders.filter(f => f.parentId === null)

  const base = dark
    ? 'bg-gray-900 border-gray-700/50 text-gray-300'
    : 'bg-gray-50 border-gray-200 text-gray-700'

  return (
    <div className={`flex flex-col h-full border-r ${base}`} style={{ minWidth: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <FileText size={14} className="text-white" />
          </div>
          <span className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>NoteFlow</span>
        </div>
        <ThemePicker theme={theme} setTheme={setTheme} dark={dark} />
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${dark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
          <Search size={13} className="text-gray-400 shrink-0" />
          <input
            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
            placeholder="搜索笔记..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* All Notes */}
      <button
        onClick={() => setActiveFolder(null)}
        className={`mx-3 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm mb-1
          ${activeFolderId === null && !searchQuery
            ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-medium'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
          }`}
      >
        <Star size={14} />
        <span className="flex-1 text-left">全部笔记</span>
        <span className="text-xs text-gray-400">{notes.length}</span>
      </button>

      {/* Folders section */}
      <div className="px-3 mb-1">
        <div className="flex items-center justify-between py-1">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">文件夹</span>
          <button
            onClick={() => setNewFolderMode(true)}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400"
            title="新建文件夹"
          >
            <Plus size={13} />
          </button>
        </div>

        {newFolderMode && (
          <input
            ref={folderInputRef}
            className={`w-full text-sm px-2 py-1 rounded-lg border mb-1 outline-none
              ${dark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            placeholder="文件夹名称"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newFolderName.trim()) {
                createFolder(newFolderName.trim())
                setNewFolderName('')
                setNewFolderMode(false)
              }
              if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName('') }
            }}
            onBlur={() => { setNewFolderMode(false); setNewFolderName('') }}
          />
        )}

        {rootFolders.map(f => (
          <FolderRow key={f.id} folder={f} depth={0} dark={dark} />
        ))}
      </div>

      {/* Notes section */}
      <div className="flex items-center justify-between px-4 py-1 mt-1">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide flex items-center gap-1">
          <Hash size={11} />
          笔记
        </span>
        <button
          onClick={() => createNote()}
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400"
          title="新建笔记 (Ctrl+N)"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {visibleNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-600">
            <FileText size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">{searchQuery ? '没有找到匹配笔记' : '还没有笔记'}</p>
            {!searchQuery && (
              <button
                onClick={() => createNote()}
                className="mt-2 text-xs text-violet-500 hover:text-violet-600"
              >
                创建第一篇笔记
              </button>
            )}
          </div>
        ) : (
          visibleNotes.map(n => <NoteItem key={n.id} note={n} dark={dark} />)
        )}
      </div>

      {/* Footer */}
      <div className={`px-4 py-3 border-t text-xs text-gray-400 dark:text-gray-600 flex items-center justify-between ${dark ? 'border-gray-700/50' : 'border-gray-200'}`}>
        <span>{notes.length} 篇笔记</span>
        <button
          onClick={() => createNote()}
          className="flex items-center gap-1 text-violet-500 hover:text-violet-600 font-medium"
        >
          <Plus size={12} /> 新建笔记
        </button>
      </div>
    </div>
  )
}
