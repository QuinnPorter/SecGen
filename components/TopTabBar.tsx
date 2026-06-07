'use client'

import type { LucideIcon } from 'lucide-react'
import { Coins, Map, AlertTriangle, Newspaper } from 'lucide-react'

interface Props {
  budgetOpen:     boolean
  expansionOpen:  boolean
  attentionOpen:  boolean
  newsOpen:       boolean
  onOpenBudget:    () => void
  onOpenExpansion: () => void
  onOpenAttention: () => void
  onOpenNews:      () => void
}

interface Tab {
  key:    'budget' | 'expansion' | 'attention' | 'news'
  label:  string
  Icon:   LucideIcon
  shortcut?: string
}

const TABS: Tab[] = [
  { key: 'budget',    label: 'Budget',    Icon: Coins,          shortcut: 'B' },
  { key: 'expansion', label: 'Expansion', Icon: Map,            shortcut: 'E' },
  { key: 'attention', label: 'Attention', Icon: AlertTriangle,  shortcut: 'A' },
  { key: 'news',      label: 'News',      Icon: Newspaper },
]

export default function TopTabBar({
  budgetOpen,
  expansionOpen,
  attentionOpen,
  newsOpen,
  onOpenBudget,
  onOpenExpansion,
  onOpenAttention,
  onOpenNews,
}: Props) {
  const openMap = {
    budget:    budgetOpen,
    expansion: expansionOpen,
    attention: attentionOpen,
    news:      newsOpen,
  } as const

  const handlerMap = {
    budget:    onOpenBudget,
    expansion: onOpenExpansion,
    attention: onOpenAttention,
    news:      onOpenNews,
  } as const

  return (
    <div
      className="flex items-center gap-1 px-6 flex-shrink-0"
      style={{
        height: 40,
        background: '#f5f3ef',
        borderBottom: '1px solid #e7e5e0',
      }}
    >
      {TABS.map(({ key, label, Icon, shortcut }) => {
        const active = openMap[key]
        return (
          <button
            key={key}
            onClick={handlerMap[key]}
            title={shortcut ? `${label} (${shortcut})` : label}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              background: active ? '#e0eaf5' : 'transparent',
              color:      active ? '#004990' : '#57534e',
              border:     '1px solid transparent',
              borderColor: active ? '#004990' : 'transparent',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              if (active) return
              ;(e.currentTarget as HTMLButtonElement).style.background = '#fafaf9'
              ;(e.currentTarget as HTMLButtonElement).style.color      = '#1c1917'
            }}
            onMouseLeave={(e) => {
              if (active) return
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color      = '#57534e'
            }}
          >
            <Icon size={13} strokeWidth={2} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
