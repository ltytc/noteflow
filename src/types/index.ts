export interface Note {
  id: string
  title: string
  content: string      // TipTap JSON string
  folderId: string | null
  tags: string[]
  createdAt: number
  updatedAt: number
  emoji: string
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  color: string
  createdAt: number
}

export type Theme = 'light' | 'dark' | 'system'
