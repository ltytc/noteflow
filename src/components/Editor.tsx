import { useEffect, useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight, common } from 'lowlight'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, Link2, Highlighter, List, ListOrdered, ListChecks,
  Heading1, Heading2, Heading3, Quote, Minus, Code2,
  Trash2, Clock, Tag
} from 'lucide-react'
import { useNoteStore } from '../store/noteStore'
import { useShallow } from 'zustand/react/shallow'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const lowlight = createLowlight(common)

/* ── Toolbar button ── */
function ToolBtn({
  onClick, active, title, children
}: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={`p-1.5 rounded transition-all
        ${active
          ? 'bg-violet-600 text-white'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />
}

/* ── Emoji picker ── */
const EMOJIS = ['📝','💡','📌','🎯','📖','🔖','✨','🧠','🗒️','📋','🚀','💎','🌟','🔥','💻','🎨','📊','🔍','💬','🎵']

function EmojiPicker({ onSelect, dark }: { onSelect: (e: string) => void; dark: boolean }) {
  return (
    <div className={`absolute z-50 top-12 left-0 shadow-xl border rounded-xl p-2 grid grid-cols-5 gap-1
      ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      {EMOJIS.map(e => (
        <button key={e} onClick={() => onSelect(e)} className="text-xl p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          {e}
        </button>
      ))}
    </div>
  )
}

/* ── Tag input ── */
function TagInput({ dark, onAdd }: { dark: boolean; onAdd: (tag: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  if (!editing) return (
    <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-violet-500">
      + 添加标签
    </button>
  )
  return (
    <input
      autoFocus
      className={`text-xs px-2 py-0.5 rounded-full border outline-none w-20
        ${dark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
      placeholder="标签名"
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); setEditing(false) }
        if (e.key === 'Escape') { setEditing(false); setVal('') }
      }}
      onBlur={() => { setEditing(false); setVal('') }}
    />
  )
}

/* ── Word count helper ── */
function countWords(content: string): number {
  try {
    const doc = JSON.parse(content)
    const texts: string[] = []
    function walk(n: Record<string, unknown>) {
      if (n.type === 'text') texts.push(n.text as string)
      if (Array.isArray(n.content)) (n.content as Record<string, unknown>[]).forEach(walk)
    }
    walk(doc)
    return texts.join('').replace(/\s/g, '').length
  } catch { return 0 }
}

/* ── Main Editor ── */
export default function Editor({ dark }: { dark: boolean }) {
  const { activeNoteId, notes, updateNote, deleteNote } = useNoteStore(useShallow(s => ({
    activeNoteId: s.activeNoteId,
    notes: s.notes,
    updateNote: s.updateNote,
    deleteNote: s.deleteNote,
  })))
  const note = notes.find(n => n.id === activeNoteId)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false, underline: false } as Parameters<typeof StarterKit.configure>[0]),
      Placeholder.configure({ placeholder: '开始写作... 支持 Markdown 快捷语法' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Highlight,
      Underline,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: note ? JSON.parse(note.content) : { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor }) => {
      if (!activeNoteId) return
      const json = JSON.stringify(editor.getJSON())
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        updateNote(activeNoteId, { content: json })
      }, 400)
    },
  }, [activeNoteId])

  // Sync content when switching notes
  useEffect(() => {
    if (!editor || !note) return
    try {
      editor.commands.setContent(JSON.parse(note.content))
    } catch { /* ignore */ }
  }, [activeNoteId]) // eslint-disable-line

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('输入链接地址：', prev ?? '')
    if (url === null) return
    if (!url) { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  /* ── Empty state ── */
  if (!note) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center gap-4 ${dark ? 'bg-gray-900 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${dark ? 'bg-gray-800' : 'bg-white shadow'}`}>
          <span className="text-4xl">📝</span>
        </div>
        <div className="text-center">
          <p className={`text-lg font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>选择或创建一篇笔记</p>
          <p className="text-sm mt-1">从左侧选择笔记开始写作</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${dark ? 'bg-gray-900' : 'bg-white'}`}>
      {/* ── Note header ── */}
      <div className={`flex items-center gap-3 px-8 pt-6 pb-3 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className="relative shrink-0">
          <button
            onClick={() => setShowEmoji(v => !v)}
            className="text-3xl p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            title="更换图标"
          >
            {note.emoji}
          </button>
          {showEmoji && (
            <EmojiPicker
              dark={dark}
              onSelect={e => { updateNote(note.id, { emoji: e }); setShowEmoji(false) }}
            />
          )}
        </div>

        <input
          key={note.id}
          className={`flex-1 text-2xl font-bold bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-700 min-w-0
            ${dark ? 'text-white' : 'text-gray-900'}`}
          placeholder="无标题笔记"
          defaultValue={note.title}
          onChange={e => updateNote(note.id, { title: e.target.value })}
        />

        <div className={`flex items-center gap-1.5 text-xs shrink-0 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
          <Clock size={11} />
          <span>{formatDistanceToNow(note.updatedAt, { addSuffix: true, locale: zhCN })}</span>
          <span>·</span>
          <span>{countWords(note.content)} 字</span>
        </div>

        <button
          onClick={() => deleteNote(note.id)}
          className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="删除笔记"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* ── Tags ── */}
      <div className={`flex items-center gap-2 px-8 py-2 border-b flex-wrap ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
        <Tag size={12} className="text-gray-400 shrink-0" />
        {note.tags.map(tag => (
          <span
            key={tag}
            className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1
              ${dark ? 'bg-gray-800 text-gray-300' : 'bg-violet-50 text-violet-600'}`}
          >
            {tag}
            <button
              onClick={() => updateNote(note.id, { tags: note.tags.filter(t => t !== tag) })}
              className="opacity-60 hover:opacity-100 leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <TagInput dark={dark} onAdd={tag => updateNote(note.id, { tags: [...new Set([...note.tags, tag])] })} />
      </div>

      {/* ── Toolbar ── */}
      {editor && (
        <div className={`flex items-center gap-0.5 px-4 py-2 border-b overflow-x-auto
          ${dark ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'}`}
        >
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="标题 1"><Heading1 size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="标题 2"><Heading2 size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="标题 3"><Heading3 size={15} /></ToolBtn>
          <Divider />
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="粗体 (Ctrl+B)"><Bold size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜体 (Ctrl+I)"><Italic size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="下划线 (Ctrl+U)"><UnderlineIcon size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="删除线"><Strikethrough size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="高亮文字"><Highlighter size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="行内代码"><Code size={15} /></ToolBtn>
          <ToolBtn onClick={setLink} active={editor.isActive('link')} title="插入链接"><Link2 size={15} /></ToolBtn>
          <Divider />
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="无序列表"><List size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="有序列表"><ListOrdered size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="任务清单"><ListChecks size={15} /></ToolBtn>
          <Divider />
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="引用块"><Quote size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="代码块"><Code2 size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分割线"><Minus size={15} /></ToolBtn>
        </div>
      )}

      {/* ── Editor content ── */}
      <div
        className="flex-1 overflow-y-auto px-8 py-6 cursor-text"
        onClick={() => editor?.commands.focus()}
      >
        <div className={`max-w-3xl mx-auto ${dark ? 'text-gray-100' : 'text-gray-800'}`}>
          {editor && <EditorContent editor={editor} />}
        </div>
      </div>
    </div>
  )
}
