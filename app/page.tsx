'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { FiCalendar, FiUsers, FiSettings, FiChevronLeft, FiChevronRight, FiSend, FiSearch, FiMessageSquare, FiMenu, FiSun, FiMoon, FiClock, FiUpload, FiFile, FiCheck, FiX, FiDownload } from 'react-icons/fi'
import { HiOutlineOfficeBuilding } from 'react-icons/hi'
import { BsPersonWorkspace } from 'react-icons/bs'
import { addWeeks, startOfWeek, addDays, format, addMonths, startOfMonth, differenceInWeeks, getDaysInMonth, getDay } from 'date-fns'

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────

const AGENT_ID = '69a06de2065e1e60f38a3442'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

const DEPARTMENTS = ['All Teams', 'Engineering', 'Design', 'Marketing', 'Sales', 'HR'] as const

const DEPT_COLORS: Record<string, string> = {
  Engineering: 'hsl(160, 85%, 35%)',
  Design: 'hsl(45, 95%, 50%)',
  Marketing: 'hsl(280, 65%, 55%)',
  Sales: 'hsl(200, 70%, 50%)',
  HR: 'hsl(340, 75%, 55%)',
}

const DEPT_BG_CLASSES: Record<string, string> = {
  Engineering: 'bg-emerald-100 text-emerald-800',
  Design: 'bg-amber-100 text-amber-800',
  Marketing: 'bg-purple-100 text-purple-800',
  Sales: 'bg-blue-100 text-blue-800',
  HR: 'bg-rose-100 text-rose-800',
}

type ShiftType = 'Morning' | 'Afternoon' | 'Full Day' | 'Night'

const SHIFT_TYPES: ShiftType[] = ['Morning', 'Afternoon', 'Full Day', 'Night']

const SHIFT_COLORS: Record<string, string> = {
  'Morning': 'bg-amber-100 text-amber-700',
  'Afternoon': 'bg-blue-100 text-blue-700',
  'Full Day': 'bg-emerald-100 text-emerald-700',
  'Night': 'bg-indigo-100 text-indigo-700',
}

const SHIFT_LABELS_SHORT: Record<string, string> = {
  'Morning': 'AM',
  'Afternoon': 'PM',
  'Full Day': 'All',
  'Night': 'Eve',
}

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface ShiftEntry {
  shift: ShiftType
}

interface TeamMember {
  id: string
  name: string
  department: string
  email?: string
  scheduledDays: { day: string; shift: string }[]
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: string
}

type ActiveView = 'schedule' | 'team' | 'settings'

// ────────────────────────────────────────────
// Mock Data (updated with shift info)
// ────────────────────────────────────────────

const MOCK_TEAM_DATA: TeamMember[] = [
  { id: '1', name: 'Sarah Chen', department: 'Engineering', scheduledDays: [{ day: 'Monday', shift: 'Full Day' }, { day: 'Tuesday', shift: 'Morning' }, { day: 'Thursday', shift: 'Afternoon' }] },
  { id: '2', name: 'James Wilson', department: 'Engineering', scheduledDays: [{ day: 'Monday', shift: 'Morning' }, { day: 'Wednesday', shift: 'Full Day' }, { day: 'Friday', shift: 'Morning' }] },
  { id: '3', name: 'Maria Garcia', department: 'Engineering', scheduledDays: [{ day: 'Tuesday', shift: 'Full Day' }, { day: 'Wednesday', shift: 'Afternoon' }, { day: 'Thursday', shift: 'Full Day' }] },
  { id: '4', name: 'Alex Kim', department: 'Design', scheduledDays: [{ day: 'Monday', shift: 'Full Day' }, { day: 'Tuesday', shift: 'Afternoon' }, { day: 'Friday', shift: 'Full Day' }] },
  { id: '5', name: 'Emily Brown', department: 'Design', scheduledDays: [{ day: 'Wednesday', shift: 'Morning' }, { day: 'Thursday', shift: 'Full Day' }] },
  { id: '6', name: 'David Lee', department: 'Marketing', scheduledDays: [{ day: 'Monday', shift: 'Afternoon' }, { day: 'Thursday', shift: 'Morning' }, { day: 'Friday', shift: 'Full Day' }] },
  { id: '7', name: 'Lisa Wang', department: 'Marketing', scheduledDays: [{ day: 'Tuesday', shift: 'Full Day' }, { day: 'Wednesday', shift: 'Night' }] },
  { id: '8', name: 'Michael Park', department: 'Sales', scheduledDays: [{ day: 'Monday', shift: 'Full Day' }, { day: 'Wednesday', shift: 'Morning' }, { day: 'Thursday', shift: 'Afternoon' }] },
  { id: '9', name: 'Sophie Taylor', department: 'Sales', scheduledDays: [{ day: 'Tuesday', shift: 'Morning' }, { day: 'Friday', shift: 'Afternoon' }] },
  { id: '10', name: 'Ryan Johnson', department: 'HR', scheduledDays: [{ day: 'Monday', shift: 'Full Day' }, { day: 'Tuesday', shift: 'Full Day' }, { day: 'Wednesday', shift: 'Morning' }] },
  { id: '11', name: 'Anna Martinez', department: 'Engineering', scheduledDays: [{ day: 'Monday', shift: 'Afternoon' }, { day: 'Wednesday', shift: 'Full Day' }, { day: 'Friday', shift: 'Night' }] },
  { id: '12', name: 'Tom Zhang', department: 'Design', scheduledDays: [{ day: 'Tuesday', shift: 'Full Day' }, { day: 'Thursday', shift: 'Morning' }, { day: 'Friday', shift: 'Full Day' }] },
  { id: '13', name: 'Rachel Adams', department: 'Marketing', scheduledDays: [{ day: 'Monday', shift: 'Morning' }, { day: 'Tuesday', shift: 'Afternoon' }, { day: 'Thursday', shift: 'Full Day' }] },
  { id: '14', name: 'Kevin Patel', department: 'Sales', scheduledDays: [{ day: 'Wednesday', shift: 'Full Day' }, { day: 'Thursday', shift: 'Night' }, { day: 'Friday', shift: 'Morning' }] },
  { id: '15', name: 'Jessica Liu', department: 'HR', scheduledDays: [{ day: 'Tuesday', shift: 'Morning' }, { day: 'Thursday', shift: 'Afternoon' }] },
]

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function parseAgentResponse(result: AIAgentResponse) {
  if (!result.success) {
    return { message: result.error || 'Something went wrong. Please try again.', action: '', days: [] as string[], summary: '' }
  }

  const raw = result.response?.result
  let parsed = raw
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw) } catch { parsed = { message: raw } }
  }

  return {
    message: parsed?.message || result.response?.message || '',
    action: parsed?.action || 'general_response',
    days: Array.isArray(parsed?.days) ? (parsed.days as string[]) : [],
    summary: parsed?.summary || '',
  }
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-2 mb-0.5">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-2 mb-0.5">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm leading-relaxed">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function getWeekDates(weekOffset: number) {
  const now = new Date()
  const targetWeek = addWeeks(now, weekOffset)
  const monday = startOfWeek(targetWeek, { weekStartsOn: 1 })
  return WEEKDAYS.map((_, idx) => addDays(monday, idx))
}

function getWeekLabel(weekOffset: number) {
  const dates = getWeekDates(weekOffset)
  const start = dates[0]
  const end = dates[4]
  if (!start || !end) return ''
  return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`
}

function getWeekKey(weekOffset: number) {
  const dates = getWeekDates(weekOffset)
  const monday = dates[0]
  if (!monday) return ''
  return format(monday, 'yyyy-MM-dd')
}

function getScheduleKey(weekOffset: number, day: string) {
  return `${getWeekKey(weekOffset)}-${day}`
}

function getInitials(name: string) {
  return name.split(' ').map(n => n?.[0] ?? '').join('').toUpperCase()
}

function getWeekOffsetLabel(weekOffset: number): string {
  if (weekOffset === 0) return 'This Week'
  if (weekOffset === 1) return 'Next Week'
  return `+${weekOffset} Weeks`
}

function parseCSV(text: string): { name: string; department: string; email?: string }[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const nameIdx = headers.findIndex(h => h.includes('name'))
  const deptIdx = headers.findIndex(h => h.includes('department') || h.includes('dept') || h.includes('team'))
  const emailIdx = headers.findIndex(h => h.includes('email'))

  if (nameIdx < 0) return []

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(',').map(c => c.trim())
    return {
      name: cols[nameIdx] || '',
      department: deptIdx >= 0 ? (cols[deptIdx] || 'Unassigned') : 'Unassigned',
      email: emailIdx >= 0 ? cols[emailIdx] : undefined,
    }
  }).filter(r => r.name)
}

function getMonthButtons(): { label: string; weekOffset: number }[] {
  const now = new Date()
  const buttons: { label: string; weekOffset: number }[] = []
  for (let i = 0; i < 6; i++) {
    const target = addMonths(now, i)
    const label = format(target, 'MMM yyyy')
    const monthStart = startOfMonth(target)
    const nowMonday = startOfWeek(now, { weekStartsOn: 1 })
    const targetMonday = startOfWeek(monthStart, { weekStartsOn: 1 })
    const diffW = differenceInWeeks(targetMonday, nowMonday)
    buttons.push({ label, weekOffset: Math.max(0, diffW) })
  }
  return buttons
}

function getMonthlyDayCount(userSchedule: Record<string, ShiftEntry>, weekOffset: number): { count: number; monthLabel: string; totalWorkdays: number } {
  const dates = getWeekDates(weekOffset)
  const viewedDate = dates[0]
  if (!viewedDate) return { count: 0, monthLabel: '', totalWorkdays: 0 }
  const monthLabel = format(viewedDate, 'MMMM yyyy')
  const monthNum = viewedDate.getMonth()
  const yearNum = viewedDate.getFullYear()

  let count = 0
  Object.keys(userSchedule).forEach(key => {
    const datePart = key.substring(0, 10)
    const keyDate = new Date(datePart + 'T12:00:00')
    if (keyDate.getMonth() === monthNum && keyDate.getFullYear() === yearNum) {
      count++
    }
  })

  // Calculate total workdays in month
  const daysInMonth = getDaysInMonth(viewedDate)
  let totalWorkdays = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = getDay(new Date(yearNum, monthNum, d))
    if (dayOfWeek >= 1 && dayOfWeek <= 5) totalWorkdays++
  }

  return { count, monthLabel, totalWorkdays }
}

function exportToCSV(members: TeamMember[], userSchedule: Record<string, ShiftEntry>, weekOffset: number, currentUserName: string, currentUserDepartment: string) {
  const weekKey = getWeekKey(weekOffset)
  const header = 'Name,Department,Monday,Tuesday,Wednesday,Thursday,Friday\n'
  const userRow = `${currentUserName},${currentUserDepartment},${WEEKDAYS.map(d => {
    const key = `${weekKey}-${d}`
    return userSchedule[key]?.shift || 'Remote'
  }).join(',')}\n`
  const teamRows = members.map(m => {
    return `${m.name},${m.department},${WEEKDAYS.map(d => {
      const entry = m.scheduledDays.find(sd => sd.day === d)
      return entry ? entry.shift : 'Remote'
    }).join(',')}`
  }).join('\n')

  const csv = header + userRow + teamRows
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `office-schedule-${weekKey}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function ShiftIcon({ shift, className }: { shift: string; className?: string }) {
  switch (shift) {
    case 'Morning': return <FiSun className={className || 'w-3 h-3'} />
    case 'Afternoon': return <FiSun className={className || 'w-3 h-3'} />
    case 'Full Day': return <FiClock className={className || 'w-3 h-3'} />
    case 'Night': return <FiMoon className={className || 'w-3 h-3'} />
    default: return <FiClock className={className || 'w-3 h-3'} />
  }
}

// ────────────────────────────────────────────
// Error Boundary
// ────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ────────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────────

function AppSidebar({ activeView, onViewChange, collapsed, onToggleCollapse }: {
  activeView: ActiveView
  onViewChange: (v: ActiveView) => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const menuItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: 'schedule', label: 'My Schedule', icon: <FiCalendar className="w-5 h-5" /> },
    { id: 'team', label: 'Team View', icon: <FiUsers className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <FiSettings className="w-5 h-5" /> },
  ]

  return (
    <aside className={cn("fixed top-0 left-0 h-screen z-40 glass-panel transition-all duration-300 flex flex-col", collapsed ? "w-16" : "w-56")}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <HiOutlineOfficeBuilding className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-foreground tracking-tight text-sm whitespace-nowrap">Office Presence</span>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              activeView === item.id
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-border">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
        >
          {collapsed ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}

function MonthJumpBar({ weekOffset, onJump }: {
  weekOffset: number
  onJump: (offset: number) => void
}) {
  const buttons = getMonthButtons()
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {buttons.map((btn, idx) => {
        const isActive = (() => {
          const dates = getWeekDates(weekOffset)
          const viewedDate = dates[0]
          if (!viewedDate) return false
          const viewedLabel = format(viewedDate, 'MMM yyyy')
          return viewedLabel === btn.label
        })()
        return (
          <button
            key={idx}
            onClick={() => onJump(btn.weekOffset)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {btn.label}
          </button>
        )
      })}
    </div>
  )
}

function MonthlyCounter({ userSchedule, weekOffset }: {
  userSchedule: Record<string, ShiftEntry>
  weekOffset: number
}) {
  const { count, monthLabel, totalWorkdays } = getMonthlyDayCount(userSchedule, weekOffset)
  const progressPercent = totalWorkdays > 0 ? Math.round((count / totalWorkdays) * 100) : 0

  return (
    <Card className="glass-panel border-border bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 flex-shrink-0">
            <FiCalendar className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">{monthLabel || 'Current Month'}</p>
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <span className="text-2xl font-bold text-foreground">{count}</span>
              <span className="text-sm text-muted-foreground">/ {totalWorkdays} days planned</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-lg font-bold text-primary">{progressPercent}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function WeekNavigation({ weekOffset, onPrev, onNext, onReset, onJump }: {
  weekOffset: number
  onPrev: () => void
  onNext: () => void
  onReset: () => void
  onJump: (offset: number) => void
}) {
  const atMin = weekOffset <= 0
  const atMax = weekOffset >= 26

  return (
    <div className="space-y-3">
      <MonthJumpBar weekOffset={weekOffset} onJump={onJump} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onPrev} disabled={atMin} className="rounded-xl h-9 w-9">
            <FiChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center min-w-[180px]">
            <h2 className="text-base font-semibold tracking-tight text-foreground">{getWeekLabel(weekOffset)}</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">{getWeekOffsetLabel(weekOffset)}</p>
          </div>
          <Button variant="outline" size="icon" onClick={onNext} disabled={atMax} className="rounded-xl h-9 w-9">
            <FiChevronRight className="w-4 h-4" />
          </Button>
        </div>
        {weekOffset !== 0 && (
          <Button variant="secondary" size="sm" onClick={onReset} className="rounded-xl text-xs font-medium">
            This Week
          </Button>
        )}
      </div>
    </div>
  )
}

function ShiftSelector({ onSelect, onCancel }: {
  onSelect: (shift: ShiftType) => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-1 mt-1 w-full">
      <p className="text-[10px] text-muted-foreground font-medium text-center mb-0.5">Select shift:</p>
      <div className="grid grid-cols-2 gap-1">
        {SHIFT_TYPES.map(shift => (
          <button
            key={shift}
            onClick={(e) => { e.stopPropagation(); onSelect(shift) }}
            className={cn("flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-medium transition-all hover:scale-105", SHIFT_COLORS[shift])}
          >
            <ShiftIcon shift={shift} className="w-2.5 h-2.5" />
            {SHIFT_LABELS_SHORT[shift]}
          </button>
        ))}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onCancel() }}
        className="text-[10px] text-muted-foreground hover:text-foreground mt-0.5 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

function DayCell({ day, date, isActive, shiftEntry, onToggle, onShiftSelect, selectingShift, onStartSelect, onCancelSelect }: {
  day: string
  date: Date
  isActive: boolean
  shiftEntry: ShiftEntry | undefined
  onToggle: () => void
  onShiftSelect: (shift: ShiftType) => void
  selectingShift: boolean
  onStartSelect: () => void
  onCancelSelect: () => void
}) {
  const handleClick = () => {
    if (isActive) {
      onToggle()
    } else {
      onStartSelect()
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 cursor-pointer min-h-[130px]",
        isActive
          ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]"
          : "bg-card border-border hover:border-primary/40 hover:bg-secondary/50 hover:shadow-md"
      )}
    >
      <span className={cn("text-sm font-semibold mb-1 tracking-tight", isActive ? "text-primary-foreground" : "text-foreground")}>{day}</span>
      <span className={cn("text-xs mb-2", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>{format(date, 'MMM d')}</span>

      {isActive && shiftEntry ? (
        <div className="flex flex-col items-center gap-1">
          <Badge className="bg-white/20 text-primary-foreground border-0 text-xs font-medium">In Office</Badge>
          <Badge className={cn("text-[10px] border-0 flex items-center gap-0.5", SHIFT_COLORS[shiftEntry.shift])}>
            <ShiftIcon shift={shiftEntry.shift} className="w-2.5 h-2.5" />
            {shiftEntry.shift}
          </Badge>
        </div>
      ) : selectingShift ? (
        <ShiftSelector onSelect={onShiftSelect} onCancel={onCancelSelect} />
      ) : (
        <span className="text-xs text-muted-foreground font-medium">Not Planned</span>
      )}

      {isActive && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/60" />
      )}
    </div>
  )
}

function TeamPresencePanel({ teamMembers, userSchedule, weekOffset, departmentFilter, onDeptChange, showAllTeams, onShowAllTeamsChange, currentUserDepartment }: {
  teamMembers: TeamMember[]
  userSchedule: Record<string, ShiftEntry>
  weekOffset: number
  departmentFilter: string
  onDeptChange: (dept: string) => void
  showAllTeams: boolean
  onShowAllTeamsChange: (v: boolean) => void
  currentUserDepartment: string
}) {
  const effectiveFilter = showAllTeams ? departmentFilter : (departmentFilter === 'All Teams' ? currentUserDepartment : departmentFilter)
  const filteredMembers = effectiveFilter === 'All Teams'
    ? teamMembers
    : teamMembers.filter(m => m.department === effectiveFilter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Team Presence</h3>
        <Select value={showAllTeams ? departmentFilter : effectiveFilter} onValueChange={onDeptChange}>
          <SelectTrigger className="w-[140px] h-8 text-xs rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map(d => (
              <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="show-all-teams-presence" checked={showAllTeams} onCheckedChange={onShowAllTeamsChange} />
        <Label htmlFor="show-all-teams-presence" className="text-xs text-muted-foreground cursor-pointer">Show All Teams</Label>
      </div>

      <ScrollArea className="h-[240px]">
        <Accordion type="multiple" className="space-y-1">
          {WEEKDAYS.map(day => {
            const membersOnDay = filteredMembers.filter(m => m.scheduledDays.some(sd => sd.day === day))
            const weekKey = getWeekKey(weekOffset)
            const schedKey = `${weekKey}-${day}`
            const userIsIn = schedKey in userSchedule
            const userShift = userSchedule[schedKey]?.shift
            const totalCount = membersOnDay.length + (userIsIn ? 1 : 0)
            const grouped: Record<string, TeamMember[]> = {}
            membersOnDay.forEach(m => {
              if (!grouped[m.department]) grouped[m.department] = []
              grouped[m.department].push(m)
            })

            return (
              <AccordionItem key={day} value={day} className="border rounded-xl px-3 border-border">
                <AccordionTrigger className="py-2.5 hover:no-underline">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{day}</span>
                    <Badge variant="secondary" className="text-xs h-5 px-2 rounded-lg">
                      {totalCount} {totalCount === 1 ? 'person' : 'people'}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  {totalCount === 0 ? (
                    <p className="text-xs text-muted-foreground">No one planned yet</p>
                  ) : (
                    <div className="space-y-2">
                      {userIsIn && (
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span className="text-xs font-medium text-primary">You</span>
                          {userShift && (
                            <Badge className={cn("text-[9px] h-4 px-1 border-0", SHIFT_COLORS[userShift])}>
                              {userShift}
                            </Badge>
                          )}
                        </div>
                      )}
                      {Object.entries(grouped).map(([dept, members]) => (
                        <div key={dept}>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">{dept}</p>
                          <div className="flex flex-wrap gap-1">
                            {members.map(m => {
                              const memberShift = m.scheduledDays.find(sd => sd.day === day)?.shift
                              return (
                                <span
                                  key={m.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: DEPT_COLORS[m.department] || 'gray' }}
                                  />
                                  {m.name.split(' ')[0]}
                                  {memberShift && (
                                    <Badge className={cn("text-[8px] h-3.5 px-1 border-0 ml-0.5", SHIFT_COLORS[memberShift])}>
                                      {SHIFT_LABELS_SHORT[memberShift] || memberShift}
                                    </Badge>
                                  )}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </ScrollArea>
    </div>
  )
}

function ChatDrawer({ isOpen, onToggle, messages, onSend, loading }: {
  isOpen: boolean
  onToggle: () => void
  messages: ChatMessage[]
  onSend: (msg: string) => void
  loading: boolean
}) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div className={cn("border-t border-border transition-all duration-300", isOpen ? "flex-1 flex flex-col min-h-0" : "")}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FiMessageSquare className="w-4 h-4" />
          <span>Chat Assistant</span>
        </div>
        <FiChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isOpen ? "rotate-90" : "")} />
      </button>

      {isOpen && (
        <div className="flex-1 flex flex-col min-h-0 px-3 pb-3">
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-0 max-h-[240px]">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <BsPersonWorkspace className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">Ask me about your schedule or team presence</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] px-3 py-2 rounded-xl text-sm",
                  msg.role === 'user'
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border text-card-foreground rounded-bl-sm"
                )}>
                  {msg.role === 'assistant' ? renderMarkdown(msg.text) : <p>{msg.text}</p>}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border px-3 py-2 rounded-xl rounded-bl-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. I'll be in Mon and Wed"
              disabled={loading}
              className="flex-1 h-9 text-sm rounded-xl"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || loading} className="rounded-xl h-9 w-9 flex-shrink-0">
              <FiSend className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

function TeamViewScreen({ teamMembers, userSchedule, weekOffset, searchTerm, onSearchChange, departmentFilter, onDeptChange, showAllTeams, onShowAllTeamsChange, currentUserDepartment, onExport }: {
  teamMembers: TeamMember[]
  userSchedule: Record<string, ShiftEntry>
  weekOffset: number
  searchTerm: string
  onSearchChange: (s: string) => void
  departmentFilter: string
  onDeptChange: (d: string) => void
  showAllTeams: boolean
  onShowAllTeamsChange: (v: boolean) => void
  currentUserDepartment: string
  onExport: () => void
}) {
  const effectiveFilter = showAllTeams ? departmentFilter : (departmentFilter === 'All Teams' ? currentUserDepartment : departmentFilter)
  const filtered = teamMembers.filter(m => {
    const matchesDept = effectiveFilter === 'All Teams' || m.department === effectiveFilter
    const matchesSearch = !searchTerm || m.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesDept && matchesSearch
  })

  const weekKey = getWeekKey(weekOffset)

  const dayCounts: Record<string, number> = {}
  WEEKDAYS.forEach(day => {
    const teamCount = teamMembers.filter(m => m.scheduledDays.some(sd => sd.day === day)).length
    const schedKey = `${weekKey}-${day}`
    const userIn = schedKey in userSchedule ? 1 : 0
    dayCounts[day] = teamCount + userIn
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Team View</h1>
          <p className="text-sm text-muted-foreground">See who is in the office each day this week</p>
        </div>
        <Button variant="outline" size="sm" onClick={onExport} className="rounded-xl text-xs font-medium flex items-center gap-1.5">
          <FiDownload className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-5 gap-3">
        {WEEKDAYS.map(day => (
          <Card key={day} className="glass-panel border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">{day.slice(0, 3)}</p>
              <p className="text-xl font-bold text-foreground">{dayCounts[day] ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">people</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name..."
            className="pl-9 h-9 text-sm rounded-xl"
          />
        </div>
        <Select value={showAllTeams ? departmentFilter : effectiveFilter} onValueChange={onDeptChange}>
          <SelectTrigger className="w-[160px] h-9 text-sm rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map(d => (
              <SelectItem key={d} value={d} className="text-sm">{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="show-all-teams-tv" checked={showAllTeams} onCheckedChange={onShowAllTeamsChange} />
          <Label htmlFor="show-all-teams-tv" className="text-xs text-muted-foreground cursor-pointer">Show All Teams</Label>
        </div>
      </div>

      {/* Table */}
      <Card className="glass-panel border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[220px]">Team Member</th>
                {WEEKDAYS.map(day => (
                  <th key={day} className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{day.slice(0, 3)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Current User Row */}
              <tr className="border-b border-border bg-primary/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold flex-shrink-0">You</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">You</p>
                      <Badge className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-0">Current User</Badge>
                    </div>
                  </div>
                </td>
                {WEEKDAYS.map(day => {
                  const schedKey = `${weekKey}-${day}`
                  const entry = userSchedule[schedKey]
                  return (
                    <td key={day} className="text-center px-3 py-3">
                      {entry ? (
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary shadow-md shadow-primary/20">
                            <HiOutlineOfficeBuilding className="w-3.5 h-3.5 text-primary-foreground" />
                          </div>
                          <Badge className={cn("text-[8px] h-3.5 px-1 border-0", SHIFT_COLORS[entry.shift])}>
                            {SHIFT_LABELS_SHORT[entry.shift]}
                          </Badge>
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted-foreground">
                          <span className="text-xs">--</span>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>

              {filtered.map(member => (
                <tr key={member.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-2.5 group text-left">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                            style={{ backgroundColor: DEPT_COLORS[member.department] || '#6b7280' }}
                          >
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{member.name}</p>
                            <Badge
                              variant="secondary"
                              className={cn("text-[10px] h-4 px-1.5 border-0", DEPT_BG_CLASSES[member.department] || 'bg-secondary text-secondary-foreground')}
                            >
                              {member.department}
                            </Badge>
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-4 rounded-xl" side="right">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                              style={{ backgroundColor: DEPT_COLORS[member.department] || '#6b7280' }}
                            >
                              {getInitials(member.name)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.department}</p>
                              {member.email && <p className="text-xs text-muted-foreground">{member.email}</p>}
                            </div>
                          </div>
                          <Separator />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">This week in office:</p>
                            <div className="flex flex-wrap gap-1">
                              {member.scheduledDays.length > 0
                                ? member.scheduledDays.map(sd => (
                                  <Badge key={sd.day} className={cn("text-xs flex items-center gap-0.5", SHIFT_COLORS[sd.shift] || '')}>
                                    {sd.day} <span className="text-[9px]">({sd.shift})</span>
                                  </Badge>
                                ))
                                : <span className="text-xs text-muted-foreground">No days planned</span>
                              }
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </td>
                  {WEEKDAYS.map(day => {
                    const dayEntry = member.scheduledDays.find(sd => sd.day === day)
                    return (
                      <td key={day} className="text-center px-3 py-3">
                        {dayEntry ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <div
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                              style={{ backgroundColor: DEPT_COLORS[member.department] || '#6b7280' }}
                            >
                              <HiOutlineOfficeBuilding className="w-3.5 h-3.5 text-white" />
                            </div>
                            <Badge className={cn("text-[8px] h-3.5 px-1 border-0", SHIFT_COLORS[dayEntry.shift])}>
                              {SHIFT_LABELS_SHORT[dayEntry.shift] || dayEntry.shift}
                            </Badge>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted-foreground">
                            <span className="text-xs">--</span>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No team members match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function SettingsScreen({ currentUserDepartment, onDepartmentChange, teamMembers, onImportMembers }: {
  currentUserDepartment: string
  onDepartmentChange: (dept: string) => void
  teamMembers: TeamMember[]
  onImportMembers: (members: { name: string; department: string; email?: string }[]) => void
}) {
  const [dragActive, setDragActive] = useState(false)
  const [csvPreview, setCsvPreview] = useState<{ name: string; department: string; email?: string }[] | null>(null)
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setImportStatus(null)
    if (!file.name.endsWith('.csv')) {
      setImportStatus({ type: 'error', message: 'Only CSV files are supported. Please upload a .csv file.' })
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text !== 'string') {
        setImportStatus({ type: 'error', message: 'Failed to read file.' })
        return
      }
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setImportStatus({ type: 'error', message: 'No valid rows found. Ensure CSV has a "Name" column header.' })
        return
      }
      setCsvPreview(parsed)
    }
    reader.onerror = () => {
      setImportStatus({ type: 'error', message: 'Failed to read the file.' })
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (e.target) e.target.value = ''
  }

  const confirmImport = () => {
    if (!csvPreview) return
    onImportMembers(csvPreview)
    setImportStatus({ type: 'success', message: `Successfully imported ${csvPreview.length} team member${csvPreview.length !== 1 ? 's' : ''}.` })
    setCsvPreview(null)
  }

  const cancelImport = () => {
    setCsvPreview(null)
    setImportStatus(null)
  }

  const selectableDepts = DEPARTMENTS.filter(d => d !== 'All Teams')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, team, and notification preferences</p>
      </div>

      <Card className="glass-panel border-border">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">You</div>
            <div>
              <p className="font-semibold text-foreground">Current User</p>
              <p className="text-sm text-muted-foreground">Hybrid Worker</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Display Name</Label>
              <Input defaultValue="Current User" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm font-medium">Department</Label>
              <Select value={currentUserDepartment} onValueChange={onDepartmentChange}>
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectableDepts.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">This determines which team you see by default in Team Presence and Team View.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Team CSV */}
      <Card className="glass-panel border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FiUpload className="w-4 h-4" />
            Import Team
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Upload a CSV file with columns: Name, Department, Email (optional)</p>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-secondary/30"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
            <FiFile className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Drop a CSV file here or click to browse</p>
            <p className="text-xs text-muted-foreground">Accepts .csv files</p>
          </div>

          {/* Import Status */}
          {importStatus && (
            <div className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300",
              importStatus.type === 'success'
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            )}>
              {importStatus.type === 'success' ? <FiCheck className="w-4 h-4 flex-shrink-0" /> : <FiX className="w-4 h-4 flex-shrink-0" />}
              <p className="text-sm font-medium">{importStatus.message}</p>
            </div>
          )}

          {/* CSV Preview Table */}
          {csvPreview && csvPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Preview ({csvPreview.length} rows)</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={cancelImport} className="rounded-xl text-xs">
                    <FiX className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={confirmImport} className="rounded-xl text-xs">
                    <FiCheck className="w-3 h-3 mr-1" />
                    Confirm Import
                  </Button>
                </div>
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/30 border-b border-border">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Department</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-foreground">{row.name}</td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary" className={cn("text-[10px]", DEPT_BG_CLASSES[row.department] || 'bg-secondary text-secondary-foreground')}>
                            {row.department}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.email || '--'}</td>
                      </tr>
                    ))}
                    {csvPreview.length > 10 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-xs text-muted-foreground text-center">
                          ...and {csvPreview.length - 10} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Separator />
          <p className="text-xs text-muted-foreground">Current team: {teamMembers.length} members loaded</p>
        </CardContent>
      </Card>

      <Card className="glass-panel border-border">
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Schedule Reminders</p>
              <p className="text-xs text-muted-foreground">Get reminded to mark your weekly days</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Team Updates</p>
              <p className="text-xs text-muted-foreground">Be notified when teammates update their schedule</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AgentStatusCard({ activeAgentId }: { activeAgentId: string | null }) {
  return (
    <Card className="glass-panel border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", activeAgentId ? "bg-amber-400 animate-pulse" : "bg-emerald-400")} />
            <div>
              <p className="text-xs font-semibold text-foreground">Schedule Assistant Agent</p>
              <p className="text-[10px] text-muted-foreground font-mono">ID: {AGENT_ID.slice(0, 12)}...</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] h-5">
            {activeAgentId ? 'Processing' : 'Ready'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// ────────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────────

export default function Page() {
  const [activeView, setActiveView] = useState<ActiveView>('schedule')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [userSchedule, setUserSchedule] = useState<Record<string, ShiftEntry>>({})
  const [departmentFilter, setDepartmentFilter] = useState('All Teams')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [showSampleData, setShowSampleData] = useState(false)
  const [teamSearchTerm, setTeamSearchTerm] = useState('')
  const [teamDeptFilter, setTeamDeptFilter] = useState('All Teams')
  const [selectingShiftDay, setSelectingShiftDay] = useState<string | null>(null)
  const [currentUserDepartment, setCurrentUserDepartment] = useState('Engineering')
  const [showAllTeamsPresence, setShowAllTeamsPresence] = useState(false)
  const [showAllTeamsTV, setShowAllTeamsTV] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(MOCK_TEAM_DATA)

  // Derive userDays from userSchedule for the current weekOffset (for backward compat in summary, etc.)
  const weekKey = getWeekKey(weekOffset)
  const currentWeekUserDays: string[] = WEEKDAYS.filter(d => `${weekKey}-${d}` in userSchedule)

  // Sample data toggle
  useEffect(() => {
    if (showSampleData) {
      const sampleWeekKey = getWeekKey(0)
      setUserSchedule({
        [`${sampleWeekKey}-Monday`]: { shift: 'Morning' },
        [`${sampleWeekKey}-Wednesday`]: { shift: 'Full Day' },
        [`${sampleWeekKey}-Thursday`]: { shift: 'Afternoon' },
      })
      setChatMessages([
        { id: 's1', role: 'user', text: "I'll be in Monday, Wednesday and Thursday this week", timestamp: new Date().toISOString() },
        { id: 's2', role: 'assistant', text: "Got it! I've marked **Monday** (Morning), **Wednesday** (Full Day), and **Thursday** (Afternoon) as your in-office days. You'll overlap with 6 teammates on Monday and 5 on Wednesday.", timestamp: new Date().toISOString() },
        { id: 's3', role: 'user', text: 'Who else is in on Thursday?', timestamp: new Date().toISOString() },
        { id: 's4', role: 'assistant', text: "On **Thursday**, the following teammates are also in the office:\n\n- **Engineering:** Sarah Chen (Afternoon), Maria Garcia (Full Day)\n- **Design:** Emily Brown (Full Day), Tom Zhang (Morning)\n- **Marketing:** David Lee (Morning), Rachel Adams (Full Day)\n- **Sales:** Michael Park (Afternoon), Kevin Patel (Night)\n- **HR:** Jessica Liu (Afternoon)\n\nThat's 9 people plus you - great day for collaboration!", timestamp: new Date().toISOString() },
      ])
      setChatOpen(true)
    } else {
      setUserSchedule({})
      setChatMessages([])
    }
  }, [showSampleData])

  // Status message auto-dismiss
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [statusMessage])

  const handleShiftSelect = useCallback((day: string, shift: ShiftType) => {
    const key = getScheduleKey(weekOffset, day)
    setUserSchedule(prev => ({ ...prev, [key]: { shift } }))
    setSelectingShiftDay(null)
    setStatusMessage(`Added ${day} (${shift}) to your schedule`)
  }, [weekOffset])

  const toggleDay = useCallback((day: string) => {
    const key = getScheduleKey(weekOffset, day)
    const isCurrentlyIn = key in userSchedule
    if (isCurrentlyIn) {
      setUserSchedule(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      setStatusMessage(`Removed ${day} from your schedule`)
    }
    // If not active, the DayCell component will start shift selection
  }, [weekOffset, userSchedule])

  const handleImportMembers = useCallback((imported: { name: string; department: string; email?: string }[]) => {
    const newMembers: TeamMember[] = imported.map((m, idx) => ({
      id: `imported-${Date.now()}-${idx}`,
      name: m.name,
      department: m.department,
      email: m.email,
      scheduledDays: [],
    }))
    setTeamMembers(prev => [...prev, ...newMembers])
  }, [])

  const handleExport = useCallback(() => {
    exportToCSV(teamMembers, userSchedule, weekOffset, 'Current User', currentUserDepartment)
  }, [teamMembers, userSchedule, weekOffset, currentUserDepartment])

  const buildContext = useCallback(() => {
    const weekLabel = getWeekLabel(weekOffset)
    const wk = getWeekKey(weekOffset)
    const userDayInfo = WEEKDAYS.map(day => {
      const key = `${wk}-${day}`
      const entry = userSchedule[key]
      if (entry) return `${day} (${entry.shift})`
      return null
    }).filter(Boolean)

    const dayBreakdown = WEEKDAYS.map(day => {
      const names = teamMembers.filter(m => m.scheduledDays.some(sd => sd.day === day)).map(m => {
        const sd = m.scheduledDays.find(s => s.day === day)
        return `${m.name}${sd ? ` (${sd.shift})` : ''}`
      })
      const key = `${wk}-${day}`
      if (userSchedule[key]) names.unshift(`You (${userSchedule[key].shift})`)
      return `  ${day}: ${names.length > 0 ? names.join(', ') : 'No one'}`
    }).join('\n')

    return `Context:\n- Current user's scheduled days: ${userDayInfo.length > 0 ? userDayInfo.join(', ') : 'None'}\n- Current week: ${weekLabel}\n- Team members in office this week breakdown:\n${dayBreakdown}`
  }, [weekOffset, userSchedule, teamMembers])

  const sendMessage = useCallback(async (userMessage: string) => {
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userMessage,
      timestamp: new Date().toISOString(),
    }
    setChatMessages(prev => [...prev, newUserMsg])
    setChatLoading(true)
    setActiveAgentId(AGENT_ID)

    try {
      const context = buildContext()
      const fullMessage = `User message: "${userMessage}"\n\n${context}`
      const result = await callAIAgent(fullMessage, AGENT_ID)
      const parsed = parseAgentResponse(result)

      if (parsed.action === 'mark_days' && parsed.days.length > 0) {
        const wk = getWeekKey(weekOffset)
        setUserSchedule(prev => {
          const next = { ...prev }
          parsed.days.forEach(day => {
            const key = `${wk}-${day}`
            if (!(key in next)) {
              next[key] = { shift: 'Full Day' }
            }
          })
          return next
        })
        setStatusMessage(`Marked ${parsed.days.join(', ')} as in-office (Full Day)`)
      } else if (parsed.action === 'remove_days' && parsed.days.length > 0) {
        const wk = getWeekKey(weekOffset)
        setUserSchedule(prev => {
          const next = { ...prev }
          parsed.days.forEach(day => {
            const key = `${wk}-${day}`
            delete next[key]
          })
          return next
        })
        setStatusMessage(`Removed ${parsed.days.join(', ')} from your schedule`)
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: parsed.message || parsed.summary || 'Done!',
        timestamp: new Date().toISOString(),
      }
      setChatMessages(prev => [...prev, assistantMsg])
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setChatMessages(prev => [...prev, errorMsg])
    } finally {
      setChatLoading(false)
      setActiveAgentId(null)
    }
  }, [buildContext, weekOffset])

  const weekDates = getWeekDates(weekOffset)

  return (
    <ErrorBoundary>
      <div className="min-h-screen gradient-bg text-foreground font-sans">
        {/* Sidebar */}
        <AppSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        />

        {/* Main Content */}
        <main className={cn("transition-all duration-300 min-h-screen", sidebarCollapsed ? "ml-16" : "ml-56")}>
          {/* Top Bar */}
          <header className="sticky top-0 z-30 glass-panel border-b border-border">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarCollapsed(prev => !prev)}
                  className="lg:hidden p-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  <FiMenu className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold tracking-tight text-foreground">
                  {activeView === 'schedule' ? 'Weekly Schedule' : activeView === 'team' ? 'Team View' : 'Settings'}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {activeView === 'schedule' && (
                  <Button variant="outline" size="sm" onClick={handleExport} className="rounded-xl text-xs font-medium flex items-center gap-1.5">
                    <FiDownload className="w-3.5 h-3.5" />
                    Export
                  </Button>
                )}
                <Label htmlFor="sample-toggle" className="text-xs font-medium text-muted-foreground cursor-pointer">Sample Data</Label>
                <Switch id="sample-toggle" checked={showSampleData} onCheckedChange={setShowSampleData} />
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="p-6">
            {activeView === 'schedule' && (
              <div className="flex gap-6 flex-col lg:flex-row">
                {/* Left: Calendar */}
                <div className="flex-1 lg:w-[65%] space-y-5">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">My Schedule</h1>
                    <p className="text-sm text-muted-foreground">Click days to mark when you will be in the office. Choose your shift type for each day.</p>
                  </div>

                  {/* Monthly Counter */}
                  <MonthlyCounter userSchedule={userSchedule} weekOffset={weekOffset} />

                  <WeekNavigation
                    weekOffset={weekOffset}
                    onPrev={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                    onNext={() => setWeekOffset(prev => Math.min(26, prev + 1))}
                    onReset={() => setWeekOffset(0)}
                    onJump={(offset) => setWeekOffset(Math.max(0, Math.min(26, offset)))}
                  />

                  {/* Day Grid */}
                  <div className="grid grid-cols-5 gap-3">
                    {WEEKDAYS.map((day, idx) => {
                      const date = weekDates[idx]
                      if (!date) return null
                      const key = getScheduleKey(weekOffset, day)
                      const isActive = key in userSchedule
                      const shiftEntry = userSchedule[key]
                      return (
                        <DayCell
                          key={`${weekKey}-${day}`}
                          day={day}
                          date={date}
                          isActive={isActive}
                          shiftEntry={shiftEntry}
                          onToggle={() => toggleDay(day)}
                          onShiftSelect={(shift) => handleShiftSelect(day, shift)}
                          selectingShift={selectingShiftDay === day}
                          onStartSelect={() => setSelectingShiftDay(day)}
                          onCancelSelect={() => setSelectingShiftDay(null)}
                        />
                      )
                    })}
                  </div>

                  {/* Status Message */}
                  {statusMessage && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 transition-all duration-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <p className="text-sm text-primary font-medium">{statusMessage}</p>
                    </div>
                  )}

                  {/* Empty State */}
                  {currentWeekUserDays.length === 0 && !showSampleData && (
                    <Card className="glass-panel border-border">
                      <CardContent className="py-8 text-center">
                        <BsPersonWorkspace className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground font-medium">No days marked yet this week -- be the first!</p>
                        <p className="text-xs text-muted-foreground mt-1">Click on a day above and choose a shift, or use the chat assistant</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Week Summary */}
                  {currentWeekUserDays.length > 0 && (
                    <Card className="glass-panel border-border">
                      <CardContent className="p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your Week Summary</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-foreground font-medium">
                            {currentWeekUserDays.length} day{currentWeekUserDays.length !== 1 ? 's' : ''} in office:
                          </span>
                          {currentWeekUserDays.map(d => {
                            const key = `${weekKey}-${d}`
                            const entry = userSchedule[key]
                            return (
                              <Badge key={d} className={cn("text-xs flex items-center gap-1", entry ? SHIFT_COLORS[entry.shift] : '')}>
                                <ShiftIcon shift={entry?.shift || 'Full Day'} className="w-3 h-3" />
                                {d} ({entry?.shift || 'Full Day'})
                              </Badge>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Agent Status */}
                  <AgentStatusCard activeAgentId={activeAgentId} />
                </div>

                {/* Right: Team Presence + Chat */}
                <div className="lg:w-[35%] lg:min-w-[320px]">
                  <Card className="glass-panel border-border flex flex-col lg:sticky lg:top-20 lg:max-h-[calc(100vh-120px)]">
                    <CardContent className="p-4 flex-shrink-0">
                      <TeamPresencePanel
                        teamMembers={teamMembers}
                        userSchedule={userSchedule}
                        weekOffset={weekOffset}
                        departmentFilter={departmentFilter}
                        onDeptChange={setDepartmentFilter}
                        showAllTeams={showAllTeamsPresence}
                        onShowAllTeamsChange={setShowAllTeamsPresence}
                        currentUserDepartment={currentUserDepartment}
                      />
                    </CardContent>
                    <ChatDrawer
                      isOpen={chatOpen}
                      onToggle={() => setChatOpen(prev => !prev)}
                      messages={chatMessages}
                      onSend={sendMessage}
                      loading={chatLoading}
                    />
                  </Card>
                </div>
              </div>
            )}

            {activeView === 'team' && (
              <TeamViewScreen
                teamMembers={teamMembers}
                userSchedule={userSchedule}
                weekOffset={weekOffset}
                searchTerm={teamSearchTerm}
                onSearchChange={setTeamSearchTerm}
                departmentFilter={teamDeptFilter}
                onDeptChange={setTeamDeptFilter}
                showAllTeams={showAllTeamsTV}
                onShowAllTeamsChange={setShowAllTeamsTV}
                currentUserDepartment={currentUserDepartment}
                onExport={handleExport}
              />
            )}

            {activeView === 'settings' && (
              <SettingsScreen
                currentUserDepartment={currentUserDepartment}
                onDepartmentChange={setCurrentUserDepartment}
                teamMembers={teamMembers}
                onImportMembers={handleImportMembers}
              />
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
