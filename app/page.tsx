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
import { FiCalendar, FiUsers, FiSettings, FiChevronLeft, FiChevronRight, FiSend, FiSearch, FiMessageSquare, FiMenu } from 'react-icons/fi'
import { HiOutlineOfficeBuilding } from 'react-icons/hi'
import { BsPersonWorkspace } from 'react-icons/bs'
import { addWeeks, startOfWeek, addDays, format } from 'date-fns'

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

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface TeamMember {
  id: string
  name: string
  department: string
  scheduledDays: string[]
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: string
}

type ActiveView = 'schedule' | 'team' | 'settings'

// ────────────────────────────────────────────
// Mock Data
// ────────────────────────────────────────────

const MOCK_TEAM_DATA: TeamMember[] = [
  { id: '1', name: 'Sarah Chen', department: 'Engineering', scheduledDays: ['Monday', 'Tuesday', 'Thursday'] },
  { id: '2', name: 'James Wilson', department: 'Engineering', scheduledDays: ['Monday', 'Wednesday', 'Friday'] },
  { id: '3', name: 'Maria Garcia', department: 'Engineering', scheduledDays: ['Tuesday', 'Wednesday', 'Thursday'] },
  { id: '4', name: 'Alex Kim', department: 'Design', scheduledDays: ['Monday', 'Tuesday', 'Friday'] },
  { id: '5', name: 'Emily Brown', department: 'Design', scheduledDays: ['Wednesday', 'Thursday'] },
  { id: '6', name: 'David Lee', department: 'Marketing', scheduledDays: ['Monday', 'Thursday', 'Friday'] },
  { id: '7', name: 'Lisa Wang', department: 'Marketing', scheduledDays: ['Tuesday', 'Wednesday'] },
  { id: '8', name: 'Michael Park', department: 'Sales', scheduledDays: ['Monday', 'Wednesday', 'Thursday'] },
  { id: '9', name: 'Sophie Taylor', department: 'Sales', scheduledDays: ['Tuesday', 'Friday'] },
  { id: '10', name: 'Ryan Johnson', department: 'HR', scheduledDays: ['Monday', 'Tuesday', 'Wednesday'] },
  { id: '11', name: 'Anna Martinez', department: 'Engineering', scheduledDays: ['Monday', 'Wednesday', 'Friday'] },
  { id: '12', name: 'Tom Zhang', department: 'Design', scheduledDays: ['Tuesday', 'Thursday', 'Friday'] },
  { id: '13', name: 'Rachel Adams', department: 'Marketing', scheduledDays: ['Monday', 'Tuesday', 'Thursday'] },
  { id: '14', name: 'Kevin Patel', department: 'Sales', scheduledDays: ['Wednesday', 'Thursday', 'Friday'] },
  { id: '15', name: 'Jessica Liu', department: 'HR', scheduledDays: ['Tuesday', 'Thursday'] },
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

function getInitials(name: string) {
  return name.split(' ').map(n => n?.[0] ?? '').join('').toUpperCase()
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

function WeekNavigation({ weekOffset, onPrev, onNext, onReset }: {
  weekOffset: number
  onPrev: () => void
  onNext: () => void
  onReset: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={onPrev} className="rounded-xl h-9 w-9">
          <FiChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center min-w-[180px]">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{getWeekLabel(weekOffset)}</h2>
        </div>
        <Button variant="outline" size="icon" onClick={onNext} className="rounded-xl h-9 w-9">
          <FiChevronRight className="w-4 h-4" />
        </Button>
      </div>
      {weekOffset !== 0 && (
        <Button variant="secondary" size="sm" onClick={onReset} className="rounded-xl text-xs font-medium">
          This Week
        </Button>
      )}
    </div>
  )
}

function DayCell({ day, date, isActive, onClick }: {
  day: string
  date: Date
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer min-h-[120px]",
        isActive
          ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]"
          : "bg-card border-border hover:border-primary/40 hover:bg-secondary/50 hover:shadow-md"
      )}
    >
      <span className={cn("text-sm font-semibold mb-1 tracking-tight", isActive ? "text-primary-foreground" : "text-foreground")}>{day}</span>
      <span className={cn("text-xs mb-3", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>{format(date, 'MMM d')}</span>
      {isActive ? (
        <Badge className="bg-white/20 text-primary-foreground border-0 text-xs font-medium">In Office</Badge>
      ) : (
        <span className="text-xs text-muted-foreground font-medium">Not Planned</span>
      )}
      {isActive && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/60" />
      )}
    </button>
  )
}

function TeamPresencePanel({ teamMembers, userDays, departmentFilter, onDeptChange }: {
  teamMembers: TeamMember[]
  userDays: string[]
  departmentFilter: string
  onDeptChange: (dept: string) => void
}) {
  const filteredMembers = departmentFilter === 'All Teams'
    ? teamMembers
    : teamMembers.filter(m => m.department === departmentFilter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Team Presence</h3>
        <Select value={departmentFilter} onValueChange={onDeptChange}>
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

      <ScrollArea className="h-[280px]">
        <Accordion type="multiple" className="space-y-1">
          {WEEKDAYS.map(day => {
            const membersOnDay = filteredMembers.filter(m => m.scheduledDays.includes(day))
            const userIsIn = userDays.includes(day)
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
                        </div>
                      )}
                      {Object.entries(grouped).map(([dept, members]) => (
                        <div key={dept}>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">{dept}</p>
                          <div className="flex flex-wrap gap-1">
                            {members.map(m => (
                              <span
                                key={m.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: DEPT_COLORS[m.department] || 'gray' }}
                                />
                                {m.name.split(' ')[0]}
                              </span>
                            ))}
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

function TeamViewScreen({ teamMembers, userDays, searchTerm, onSearchChange, departmentFilter, onDeptChange }: {
  teamMembers: TeamMember[]
  userDays: string[]
  searchTerm: string
  onSearchChange: (s: string) => void
  departmentFilter: string
  onDeptChange: (d: string) => void
}) {
  const filtered = teamMembers.filter(m => {
    const matchesDept = departmentFilter === 'All Teams' || m.department === departmentFilter
    const matchesSearch = !searchTerm || m.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesDept && matchesSearch
  })

  const dayCounts: Record<string, number> = {}
  WEEKDAYS.forEach(day => {
    const teamCount = teamMembers.filter(m => m.scheduledDays.includes(day)).length
    const userIn = userDays.includes(day) ? 1 : 0
    dayCounts[day] = teamCount + userIn
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Team View</h1>
        <p className="text-sm text-muted-foreground">See who is in the office each day this week</p>
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
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name..."
            className="pl-9 h-9 text-sm rounded-xl"
          />
        </div>
        <Select value={departmentFilter} onValueChange={onDeptChange}>
          <SelectTrigger className="w-[160px] h-9 text-sm rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map(d => (
              <SelectItem key={d} value={d} className="text-sm">{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                {WEEKDAYS.map(day => (
                  <td key={day} className="text-center px-3 py-3">
                    {userDays.includes(day) ? (
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary shadow-md shadow-primary/20">
                        <HiOutlineOfficeBuilding className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted-foreground">
                        <span className="text-xs">--</span>
                      </div>
                    )}
                  </td>
                ))}
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
                            </div>
                          </div>
                          <Separator />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">This week in office:</p>
                            <div className="flex flex-wrap gap-1">
                              {member.scheduledDays.length > 0
                                ? member.scheduledDays.map(d => <Badge key={d} className="text-xs">{d}</Badge>)
                                : <span className="text-xs text-muted-foreground">No days planned</span>
                              }
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </td>
                  {WEEKDAYS.map(day => (
                    <td key={day} className="text-center px-3 py-3">
                      {member.scheduledDays.includes(day) ? (
                        <div
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                          style={{ backgroundColor: DEPT_COLORS[member.department] || '#6b7280' }}
                        >
                          <HiOutlineOfficeBuilding className="w-3.5 h-3.5 text-white" />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted-foreground">
                          <span className="text-xs">--</span>
                        </div>
                      )}
                    </td>
                  ))}
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

function SettingsScreen() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and notification preferences</p>
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
              <Input defaultValue="Engineering" className="mt-1 rounded-xl" />
            </div>
          </div>
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
  const [userDays, setUserDays] = useState<string[]>([])
  const [departmentFilter, setDepartmentFilter] = useState('All Teams')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [showSampleData, setShowSampleData] = useState(false)
  const [teamSearchTerm, setTeamSearchTerm] = useState('')
  const [teamDeptFilter, setTeamDeptFilter] = useState('All Teams')

  // Sample data toggle
  useEffect(() => {
    if (showSampleData) {
      setUserDays(['Monday', 'Wednesday', 'Thursday'])
      setChatMessages([
        { id: 's1', role: 'user', text: "I'll be in Monday, Wednesday and Thursday this week", timestamp: new Date().toISOString() },
        { id: 's2', role: 'assistant', text: "Got it! I've marked **Monday**, **Wednesday**, and **Thursday** as your in-office days. You'll overlap with 6 teammates on Monday and 5 on Wednesday.", timestamp: new Date().toISOString() },
        { id: 's3', role: 'user', text: 'Who else is in on Thursday?', timestamp: new Date().toISOString() },
        { id: 's4', role: 'assistant', text: "On **Thursday**, the following teammates are also in the office:\n\n- **Engineering:** Sarah Chen, Maria Garcia\n- **Design:** Emily Brown, Tom Zhang\n- **Marketing:** David Lee, Rachel Adams\n- **Sales:** Michael Park, Kevin Patel\n- **HR:** Jessica Liu\n\nThat's 9 people plus you - great day for collaboration!", timestamp: new Date().toISOString() },
      ])
      setChatOpen(true)
    } else {
      setUserDays([])
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

  const toggleDay = useCallback((day: string) => {
    setUserDays(prev => {
      const isCurrentlyIn = prev.includes(day)
      const next = isCurrentlyIn ? prev.filter(d => d !== day) : [...prev, day]
      setStatusMessage(isCurrentlyIn ? `Removed ${day} from your schedule` : `Added ${day} to your schedule`)
      return next
    })
  }, [])

  const buildContext = useCallback(() => {
    const weekLabel = getWeekLabel(weekOffset)
    const dayBreakdown = WEEKDAYS.map(day => {
      const names = MOCK_TEAM_DATA.filter(m => m.scheduledDays.includes(day)).map(m => m.name)
      if (userDays.includes(day)) names.unshift('You')
      return `  ${day}: ${names.length > 0 ? names.join(', ') : 'No one'}`
    }).join('\n')

    return `Context:\n- Current user's scheduled days: ${userDays.length > 0 ? userDays.join(', ') : 'None'}\n- Current week: ${weekLabel}\n- Team members in office this week breakdown:\n${dayBreakdown}`
  }, [weekOffset, userDays])

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
        setUserDays(prev => {
          const newDays = [...new Set([...prev, ...parsed.days])]
          return newDays
        })
        setStatusMessage(`Marked ${parsed.days.join(', ')} as in-office`)
      } else if (parsed.action === 'remove_days' && parsed.days.length > 0) {
        setUserDays(prev => prev.filter(d => !parsed.days.includes(d)))
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
  }, [buildContext])

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
                <div className="flex-1 lg:w-[65%] space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">My Schedule</h1>
                    <p className="text-sm text-muted-foreground">Click days to mark when you will be in the office</p>
                  </div>

                  <WeekNavigation
                    weekOffset={weekOffset}
                    onPrev={() => setWeekOffset(prev => prev - 1)}
                    onNext={() => setWeekOffset(prev => prev + 1)}
                    onReset={() => setWeekOffset(0)}
                  />

                  {/* Day Grid */}
                  <div className="grid grid-cols-5 gap-3">
                    {WEEKDAYS.map((day, idx) => {
                      const date = weekDates[idx]
                      if (!date) return null
                      return (
                        <DayCell
                          key={day}
                          day={day}
                          date={date}
                          isActive={userDays.includes(day)}
                          onClick={() => toggleDay(day)}
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
                  {userDays.length === 0 && !showSampleData && (
                    <Card className="glass-panel border-border">
                      <CardContent className="py-8 text-center">
                        <BsPersonWorkspace className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground font-medium">No days marked yet this week -- be the first!</p>
                        <p className="text-xs text-muted-foreground mt-1">Click on a day above or use the chat assistant</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Week Summary */}
                  {userDays.length > 0 && (
                    <Card className="glass-panel border-border">
                      <CardContent className="p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your Week Summary</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-foreground font-medium">
                            {userDays.length} day{userDays.length !== 1 ? 's' : ''} in office:
                          </span>
                          {userDays.map(d => (
                            <Badge key={d} className="text-xs">{d}</Badge>
                          ))}
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
                        teamMembers={MOCK_TEAM_DATA}
                        userDays={userDays}
                        departmentFilter={departmentFilter}
                        onDeptChange={setDepartmentFilter}
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
                teamMembers={MOCK_TEAM_DATA}
                userDays={userDays}
                searchTerm={teamSearchTerm}
                onSearchChange={setTeamSearchTerm}
                departmentFilter={teamDeptFilter}
                onDeptChange={setTeamDeptFilter}
              />
            )}

            {activeView === 'settings' && <SettingsScreen />}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
