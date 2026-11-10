import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, getAccountType } from '../api'
import { ThemeToggle } from './ui/ThemeToggle'
import { BackButton } from './ui/BackButton'
import {
  IconDashboard,
  IconCalendar,
  IconBell,
  IconShield,
  IconBuilding,
  IconGraduationCap,
  IconUsers,
  IconUser,
  IconAward,
  IconFileText,
  IconCheckCircle,
  IconSearch,
  IconLogOut,
  IconMenu,
  IconX,
  IconChevronRight,
  IconChevronLeft,
  IconPlus,
  IconUpload,
  IconLock,
  IconCompass,
  IconClock,
  IconBriefcase,
} from './ui/Icons'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const accountType = getAccountType()
  const [me, setMe] = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('ex_sidebar_collapsed') === 'true'
  })

  const handleSignOut = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    api.logout(navigate)
  }

  useEffect(() => {
    localStorage.setItem('ex_sidebar_collapsed', String(collapsed))
  }, [collapsed])

  useEffect(() => {
    if (accountType === 'AUTHORITY') {
      api.get('/authority/auth/me')
        .then(user => setMe(user))
        .catch(() => {})
    } else if (accountType === 'STUDENT' || accountType === 'FACULTY') {
      api.get('/auth/me')
        .then(user => setMe(user))
        .catch(() => {})

      api.get('/notifications')
        .then(notes => {
          if (Array.isArray(notes)) {
            setUnreadCount(notes.filter((n: any) => !n.read).length)
          }
        })
        .catch(() => {})
    }
  }, [location.pathname, accountType])

  const dashPath = accountType === 'AUTHORITY'
    ? '/authority/dashboard'
    : accountType === 'FACULTY'
      ? '/faculty/dashboard'
      : '/student/dashboard'

  // Portal Theme Identity Tokens (Pure Light Mode by default & Futuristic Midnight Dark Mode)
  const portalStylesMap = {
    AUTHORITY: {
      accent: 'border-l-4 border-l-blue-600 dark:border-l-purple-500',
      badge: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      role: 'Authority Administration',
      icon: <IconShield size={16} className="text-blue-600 dark:text-purple-400" />,
      activeLink: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20 dark:from-purple-600 dark:via-purple-700 dark:to-pink-700 dark:text-white dark:shadow-purple-900/40',
      sidebarBg: 'bg-white dark:bg-[#07080B] border-r border-slate-200 dark:border-[#1C202B]',
    },
    FACULTY: {
      accent: 'border-l-4 border-l-teal-600 dark:border-l-purple-500',
      badge: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      role: 'Faculty Portal',
      icon: <IconGraduationCap size={16} className="text-teal-600 dark:text-purple-400" />,
      activeLink: 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-md shadow-teal-600/20 dark:from-purple-600 dark:via-purple-700 dark:to-pink-700 dark:text-white dark:shadow-purple-900/40',
      sidebarBg: 'bg-white dark:bg-[#07080B] border-r border-slate-200 dark:border-[#1C202B]',
    },
    STUDENT: {
      accent: 'border-l-4 border-l-blue-600 dark:border-l-purple-500',
      badge: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      role: 'Student Portal',
      icon: <IconAward size={18} className="text-blue-600 dark:text-purple-400" />,
      activeLink: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20 dark:from-purple-600 dark:via-purple-700 dark:to-pink-700 dark:text-white dark:shadow-purple-900/40',
      sidebarBg: 'bg-white dark:bg-[#07080B] border-r border-slate-200 dark:border-[#1C202B]',
    },
  }

  const currentPortal = accountType === 'AUTHORITY' ? 'AUTHORITY' : accountType === 'FACULTY' ? 'FACULTY' : 'STUDENT'
  const portalStyles = portalStylesMap[currentPortal]

  // Detect whether current location is the root home dashboard of current role
  const isHomeDashboard =
    location.pathname === dashPath ||
    location.pathname === '/student/dashboard' ||
    location.pathname === '/faculty/dashboard' ||
    location.pathname === '/authority/dashboard' ||
    location.pathname === '/student' ||
    location.pathname === '/faculty' ||
    location.pathname === '/authority'

  // Path helper for active links
  const isPathActive = (path: string, exact: boolean = true) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-180">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-[#07080B] text-slate-900 dark:text-white border-b border-slate-200 dark:border-[#1C202B] z-40 sticky top-0">
        <div className="flex items-center gap-2">
          {!isHomeDashboard && (
            <BackButton label="Back" size="xs" variant="subtle" className="mr-0.5" />
          )}
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
            VX
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight block">EventXTracker</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{portalStyles.role}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out of portal"
            className="p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            aria-label="Sign out"
          >
            <IconLogOut size={18} />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none transition-colors"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <IconX size={20} /> : <IconMenu size={20} />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'fixed inset-0 z-50 flex flex-col' : 'hidden'
        } md:flex flex-col ${
          collapsed ? 'md:w-20' : 'md:w-64'
        } ${portalStyles.sidebarBg} text-slate-800 dark:text-slate-200 shrink-0 transition-all duration-200 select-none z-30`}
      >
        {/* Brand header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <Link
            to={dashPath}
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 overflow-hidden"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-base shadow-sm shrink-0">
              VX
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-tight truncate">
                  EventXTracker
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono block">
                  VVCE Mysore
                </span>
              </div>
            )}
          </Link>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* User Card */}
        {me && !collapsed && (
          <div className="px-3.5 py-3 mx-3 my-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {me.profile?.avatar_url ? (
                  <img
                    src={me.profile.avatar_url}
                    alt="Avatar"
                    className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {me.profile?.full_name?.[0] || me.email?.[0] || 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white truncate text-xs">
                    {me.profile?.full_name || me.email}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5 truncate text-[11px] font-mono">
                    {me.account_type === 'STUDENT' && `${me.profile?.usn || ''} · ${me.profile?.department || ''}`}
                    {me.account_type === 'FACULTY' && `${me.profile?.department || ''} · ${me.profile?.designation || 'Faculty'}`}
                    {me.account_type === 'AUTHORITY' && 'Institutional Admin'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out of portal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
              >
                <IconLogOut size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Navigation links container */}
        <nav className="flex-1 p-2.5 space-y-4 overflow-y-auto">
          {/* ================================================================= */}
          {/* FACULTY PORTAL: EXACT 3-MENU ARCHITECTURE                         */}
          {/* ================================================================= */}
          {accountType === 'FACULTY' ? (
            <div className="space-y-3.5">
              {/* MENU 1: NORMAL VIEW */}
              <div className="space-y-1">
                {!collapsed && (
                  <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-teal-700 dark:text-teal-300 uppercase flex items-center justify-between">
                    <span>1. Department</span>
                    <span className="text-[9px] bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800/60 px-1.5 py-0.2 rounded font-mono">
                      {me?.profile?.department || 'DEPT'}
                    </span>
                  </div>
                )}
                <Link
                  to="/faculty/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Department Dashboard"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/faculty/dashboard' || location.pathname === '/faculty'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconBuilding size={16} />
                  {!collapsed && <span className="truncate">Department Dashboard</span>}
                </Link>
              </div>

              {/* MENU 2: SPECIAL MENU (COORDINATOR) */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
                {!collapsed && (
                  <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-sky-700 dark:text-sky-300 uppercase flex items-center justify-between">
                    <span>2. Coordinator</span>
                    <span className="text-[9px] bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800/60 px-1.5 py-0.2 rounded font-mono">
                      EVENTS
                    </span>
                  </div>
                )}
                <Link
                  to="/faculty/events/create"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Create College Event"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/faculty/events/create'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconPlus size={16} />
                  {!collapsed && <span className="truncate">Create College Event</span>}
                </Link>
                <Link
                  to="/faculty/events/active"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Active Coordinated Events"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/faculty/events/active'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconCalendar size={16} />
                  {!collapsed && <span className="truncate">Active Coordinated Events</span>}
                </Link>
                <Link
                  to="/faculty/leadership"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Student Event Leadership"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/faculty/leadership'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconAward size={16} />
                  {!collapsed && <span className="truncate">Student Leadership</span>}
                </Link>
                <Link
                  to="/faculty/events/history"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Events History & Archives"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/faculty/events/history'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconClock size={16} />
                  {!collapsed && <span className="truncate">Events History & Archive</span>}
                </Link>
                <Link
                  to="/events"
                  onClick={() => setMobileMenuOpen(false)}
                  title="All Campus Events"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/events'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconCompass size={16} />
                  {!collapsed && <span className="truncate">All Campus Events</span>}
                </Link>
              </div>

              {/* MENU 3: CLASS TEACHER (ONLY IF ASSIGNED) */}
              {me?.profile?.is_class_teacher && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
                  {!collapsed && (
                    <div className="px-3 py-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-indigo-700 dark:text-indigo-300 uppercase">
                        3. Class Teacher
                      </span>
                      <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 px-2 py-0.5 rounded-full font-mono font-bold shadow-2xs">
                        ASSIGNED
                      </span>
                    </div>
                  )}
                  <Link
                    to="/faculty/class-teacher/students"
                    onClick={() => setMobileMenuOpen(false)}
                    title="Section Students Roster"
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      location.pathname === '/faculty/class-teacher/students' || location.pathname === '/faculty/students'
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <IconUsers size={16} />
                    {!collapsed && <span className="truncate">Section Students Roster</span>}
                  </Link>
                  <Link
                    to="/faculty/class-teacher/reviews"
                    onClick={() => setMobileMenuOpen(false)}
                    title="Academic Verification Queue"
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      location.pathname === '/faculty/class-teacher/reviews' || location.pathname === '/faculty/academic-reviews'
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <IconCheckCircle size={16} />
                    {!collapsed && <span className="truncate">Academic Verification</span>}
                  </Link>
                </div>
              )}

              {/* Notifications */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <Link
                  to="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Notifications"
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/notifications'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconBell size={16} />
                    {!collapsed && <span>Notifications</span>}
                  </div>
                  {unreadCount > 0 && !collapsed && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-2xs">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/faculty/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Security & Profile"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/faculty/profile'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconLock size={16} />
                  {!collapsed && <span className="truncate">Security & Profile</span>}
                </Link>
              </div>
            </div>
          ) : accountType === 'STUDENT' ? (
            /* ================================================================= */
            /* STUDENT PORTAL: EXACT 3-MENU ARCHITECTURE                         */
            /* ================================================================= */
            <div className="space-y-3.5">
              {/* MENU 1: NORMAL VIEW */}
              <div className="space-y-1">
                {!collapsed && (
                  <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-purple-700 dark:text-purple-300 uppercase flex items-center justify-between">
                    <span>1. Activities</span>
                    <span className="text-[9px] bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800/60 px-1.5 py-0.2 rounded font-mono">
                      {me?.profile?.department || 'STUDENT'}
                    </span>
                  </div>
                )}
                <Link
                  to="/student/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  title="My Activities & Roster"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/student/dashboard' || location.pathname === '/student'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconDashboard size={16} />
                  {!collapsed && <span className="truncate">My Activities & Roster</span>}
                </Link>
              </div>

              {/* MENU 2: SPECIAL SECTION (LEADERSHIP) */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
                {!collapsed && (
                  <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-sky-700 dark:text-sky-300 uppercase flex items-center justify-between">
                    <span>2. Leadership</span>
                    <span className="text-[9px] bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800/60 px-1.5 py-0.2 rounded font-mono">
                      LEAD
                    </span>
                  </div>
                )}
                <Link
                  to="/student/coordination"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Event Leadership & Shortlisting"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/student/coordination' || location.pathname === '/student/leadership'
                      ? 'bg-sky-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconAward size={16} />
                  {!collapsed && <span className="truncate">Leadership & Shortlisting</span>}
                </Link>
                <Link
                  to="/student/events"
                  onClick={() => setMobileMenuOpen(false)}
                  title="All Campus Events"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/student/events' || location.pathname === '/events'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconCompass size={16} />
                  {!collapsed && <span className="truncate">All Campus Events</span>}
                </Link>
              </div>

              {/* MENU 3: ACADEMIC REQUESTS */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
                {!collapsed && (
                  <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-indigo-700 dark:text-indigo-300 uppercase flex items-center justify-between">
                    <span>3. Academic Requests</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 px-2 py-0.5 rounded-full font-mono font-bold shadow-2xs">
                      MODEL B
                    </span>
                  </div>
                )}
                <Link
                  to="/student/academics"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Internship & External Approvals"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname.startsWith('/student/academics') || location.pathname.startsWith('/student/internships') || location.pathname.startsWith('/student/external')
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconBriefcase size={16} />
                  {!collapsed && <span className="truncate">Internship & External</span>}
                </Link>
              </div>

              {/* Notifications & Security */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
                <Link
                  to="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Notifications"
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/notifications'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconBell size={16} />
                    {!collapsed && <span>Notifications</span>}
                  </div>
                  {unreadCount > 0 && !collapsed && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-2xs">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/student/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Security & Password"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/student/profile'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconLock size={16} />
                  {!collapsed && <span className="truncate">Security & Password</span>}
                </Link>
              </div>
            </div>
          ) : (
            /* ================================================================= */
            /* AUTHORITY ADMINISTRATION NAVIGATION                               */
            /* ================================================================= */
            <div className="space-y-3.5">
              <div className="space-y-1">
                {!collapsed && (
                  <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-blue-700 dark:text-blue-300 uppercase flex items-center justify-between">
                    <span>1. Administration</span>
                    <span className="text-[9px] bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800/60 px-1.5 py-0.2 rounded font-mono">
                      ADMIN
                    </span>
                  </div>
                )}
                <Link
                  to="/authority/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Command Center Overview"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/authority/dashboard' || location.pathname === '/authority'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconDashboard size={16} />
                  {!collapsed && <span className="truncate">Command Center</span>}
                </Link>
                <Link
                  to="/authority/accounts"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Accounts Directory"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/authority/accounts' || location.pathname === '/authority/students' || location.pathname === '/authority/faculty'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconUsers size={16} />
                  {!collapsed && <span className="truncate">Accounts Directory</span>}
                </Link>
                <Link
                  to="/authority/bulk-import"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Bulk Import (CSV)"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/authority/bulk-import'
                      ? portalStyles.activeLink
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconUpload size={16} />
                  {!collapsed && <span className="truncate">Bulk Import (CSV)</span>}
                </Link>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
                {!collapsed && (
                  <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-purple-700 dark:text-purple-300 uppercase flex items-center justify-between">
                    <span>2. Governance</span>
                    <span className="text-[9px] bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800/60 px-1.5 py-0.2 rounded font-mono">
                      DEPARTMENTS
                    </span>
                  </div>
                )}
                <Link
                  to="/authority/departments"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Departments & Governance"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname.startsWith('/authority/department') || location.pathname.startsWith('/authority/hod') || location.pathname.startsWith('/authority/class-teacher')
                      ? 'bg-purple-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconBuilding size={16} />
                  {!collapsed && <span className="truncate">Departments & HODs</span>}
                </Link>
                <Link
                  to="/authority/academic-settings"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Academic Years & Batch Semester Automation"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname.startsWith('/authority/academic') || location.pathname.startsWith('/authority/settings')
                      ? 'bg-purple-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconGraduationCap size={16} />
                  {!collapsed && <span className="truncate">Academic & Batch Promotion</span>}
                </Link>
                <Link
                  to="/authority/audit-logs"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Institutional Audit Logs"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/authority/audit-logs'
                      ? 'bg-purple-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconFileText size={16} />
                  {!collapsed && <span className="truncate">Audit Logs</span>}
                </Link>
                <Link
                  to="/authority/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  title="Admin Security & Profile"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === '/authority/profile'
                      ? 'bg-purple-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <IconLock size={16} />
                  {!collapsed && <span className="truncate">Admin Profile & Security</span>}
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Footer / Sign Out */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out of portal"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60 transition-colors"
          >
            <IconLogOut size={16} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)]">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 bg-[var(--bg-surface)] border-b border-[var(--border-color)] sticky top-0 z-20 transition-colors duration-180">
          {/* Top Left Navigation: Back / Come Back Button & Context Breadcrumb */}
          <div className="flex items-center gap-3">
            {!isHomeDashboard && (
              <BackButton
                label="Come Back"
                size="sm"
                variant="outline"
                className="shadow-2xs text-xs font-bold"
              />
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">EventXTracker</span>
              <span>/</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${portalStyles.badge}`}>
                {portalStyles.role}
              </span>
              <span>/</span>
              <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                Vidyavardhaka College of Engineering
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Notifications Bell */}
            <Link
              to="/notifications"
              className="relative p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Notifications"
            >
              <IconBell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              )}
            </Link>

            {/* User Profile Chip & Direct Sign Out Button Beside Picture */}
            {me && (
              <div className="flex items-center gap-3 pl-3 border-l border-[var(--border-color)]">
                <div className="flex items-center gap-2.5">
                  {me.profile?.avatar_url ? (
                    <img
                      src={me.profile.avatar_url}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                      {me.profile?.full_name?.[0] || me.email?.[0] || 'U'}
                    </div>
                  )}
                  <div className="text-right">
                    <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                      {me.profile?.full_name || me.email}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono uppercase">
                      {me.account_type}
                    </span>
                  </div>
                </div>

                {/* Direct Sign Out Button right beside profile picture */}
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out of portal"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 transition-all shadow-2xs cursor-pointer"
                >
                  <IconLogOut size={13} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
