import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  CalendarDays,
  Wallet,
  ArrowRight,
  Sparkles,
  Shield,
  CheckCircle2,
  Star,
  Zap,
  HeartHandshake,
  ChevronDown,
  Activity,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// ── Scroll-reveal hook ──────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, revealed }
}

// ── Counter hook ────────────────────────────────────────────
function useCounter(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime: number | null = null
    const step = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(ease * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return count
}

// ── Parallax hook ───────────────────────────────────────────
function useParallax(speed = 0.4) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const handleScroll = () => {
      setOffset(window.scrollY * speed)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  return offset
}

// ── Data ────────────────────────────────────────────────────
const features = [
  {
    icon: Users,
    title: 'Manajemen Pasien',
    description: 'Rekam medis elektronik yang komprehensif — riwayat kunjungan, dokumen, dan catatan klinis dalam satu dasbor terpusat.',
    tag: 'Patient-first',
    color: 'bg-primary-fixed text-primary',
    accent: 'hsl(var(--primary-fixed))',
  },
  {
    icon: CalendarDays,
    title: 'Penjadwalan Cerdas',
    description: 'Atur janji temu otomatis dengan notifikasi WhatsApp. Kurangi ketidakhadiran, bukan senyuman.',
    tag: 'Auto-schedule',
    color: 'bg-secondary-fixed text-on-secondary-fixed',
    accent: 'hsl(var(--secondary-fixed))',
  },
  {
    icon: Wallet,
    title: 'Manajemen Keuangan',
    description: 'Pantau arus kas, invoicing otomatis, dan laporan laba rugi klinik secara real-time. Sparkling results.',
    tag: 'Real-time',
    color: 'bg-tertiary-fixed text-on-tertiary-fixed',
    accent: 'hsl(var(--tertiary-fixed))',
  },
  {
    icon: Shield,
    title: 'Keamanan Data',
    description: 'Enkripsi end-to-end dan kepatuhan HIPAA. Karena data pasien adalah kepercayaan, bukan komoditas.',
    tag: 'HIPAA-ready',
    color: 'bg-primary-fixed text-primary',
    accent: 'hsl(var(--primary-fixed))',
  },
  {
    icon: Activity,
    title: 'Analytics Klinik',
    description: 'Dasbor analitik yang membuat data berbicara — tren kunjungan, performa staf, dan peluang pertumbuhan.',
    tag: 'Data-driven',
    color: 'bg-secondary-fixed text-on-secondary-fixed',
    accent: 'hsl(var(--secondary-fixed))',
  },
  {
    icon: HeartHandshake,
    title: 'Portal Pasien',
    description: 'Pasien bisa booking, melihat riwayat, dan berkomunikasi langsung. Karena senyum butuh dua pihak.',
    tag: 'Self-service',
    color: 'bg-tertiary-fixed text-on-tertiary-fixed',
    accent: 'hsl(var(--tertiary-fixed))',
  },
]

const stats = [
  { value: 500, suffix: '+', label: 'Klinik Aktif', sub: 'dan bertambah setiap minggu' },
  { value: 250, suffix: 'k', label: 'Pasien Terlayani', sub: 'di seluruh Indonesia' },
  { value: 99, suffix: '%', label: 'Kepuasan User', sub: 'rata-rata skor NPS 72' },
  { value: 24, suffix: '/7', label: 'Support Teknis', sub: 'respons < 2 menit' },
]

const testimonials = [
  {
    quote: 'DentiCare Pro mengubah cara kami bekerja. Jadwal yang dulu kacau sekarang rapi seperti gigi baru dipasang behel.',
    name: 'drg. Amelia S.',
    clinic: 'Klinik Senyum Indah, Jakarta',
    stars: 5,
  },
  {
    quote: 'Pendapatan kami naik 40% dalam 6 bulan — bukan karena pasien lebih banyak, tapi karena tidak ada lagi janji yang terlewat.',
    name: 'drg. Reza P.',
    clinic: 'Brightsmile Dental, Surabaya',
    stars: 5,
  },
  {
    quote: 'Sistem notifikasi WhatsApp-nya luar biasa. Tingkat kehadiran pasien kami meningkat dari 68% ke 91%.',
    name: 'drg. Citra W.',
    clinic: 'Denta Prima, Bandung',
    stars: 5,
  },
]

const steps = [
  {
    num: '01',
    title: 'Daftar dalam 3 Menit',
    desc: 'Buat akun, isi profil klinik, dan Anda siap. Tidak ada instalasi, tidak ada IT yang dipanggil.',
  },
  {
    num: '02',
    title: 'Impor Data Pasien',
    desc: 'Migrasikan data dari sistem lama secara otomatis. Tim kami siap membantu jika dibutuhkan.',
  },
  {
    num: '03',
    title: 'Klinik Berjalan Lebih Efisien',
    desc: 'Dalam 7 hari pertama, rata-rata klinik menghemat 12 jam kerja administratif per minggu.',
  },
]

// ── RevealSection wrapper ───────────────────────────────────
function RevealSection({
  children,
  direction = 'up',
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  direction?: 'up' | 'left' | 'right'
  delay?: number
  className?: string
}) {
  const { ref, revealed } = useReveal()
  const cls =
    direction === 'left'
      ? 'reveal-ready-left'
      : direction === 'right'
      ? 'reveal-ready-right'
      : 'reveal-ready'

  return (
    <div
      ref={ref}
      className={`${cls} ${revealed ? 'revealed' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

// ── Stat counter card ───────────────────────────────────────
function StatCard({ value, suffix, label, sub, delay }: (typeof stats)[0] & { delay: number }) {
  const { ref, revealed } = useReveal()
  const count = useCounter(value, 1600, revealed)

  return (
    <div ref={ref} className="text-center group">
      <div
        className={`reveal-ready ${revealed ? 'revealed' : ''}`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        <div className="text-5xl md:text-6xl font-black text-primary font-headline mb-1 tabular-nums">
          {count}
          <span>{suffix}</span>
        </div>
        <div className="text-base font-bold text-on-surface tracking-tight">{label}</div>
        <div className="text-sm text-muted-foreground mt-1">{sub}</div>
      </div>
    </div>
  )
}

// ── Main Landing component ──────────────────────────────────
const Landing = () => {
  const heroBgOffset = useParallax(0.3)
  const heroFloatOffset = useParallax(0.15)
  const blurBlobOffset = useParallax(0.2)

  return (
    <div className="flex flex-col min-h-screen bg-surface text-foreground overflow-x-hidden">
      {/* WCAG: Skip to main content */}
      <a href="#main-content" className="skip-to-content">
        Langsung ke konten utama
      </a>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header
        className="fixed top-0 w-full z-50 glass-nav border-b border-outline-variant/10"
        role="banner"
      >
        <div className="flex justify-between items-center w-full px-6 lg:px-10 py-4 max-w-7xl mx-auto">
          <Link
            to="/"
            className="flex items-center gap-3 focus-ring rounded-lg"
            aria-label="DentiCare Pro — Kembali ke halaman utama"
          >
            <div className="w-10 h-10 rounded-xl medical-gradient flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-white font-black text-sm font-headline">DC</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-xl tracking-tight text-primary font-headline leading-none block">
                DentiCare Pro
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold opacity-70">
                Clinical Curator
              </span>
            </div>
          </Link>

          <nav aria-label="Navigasi utama" className="hidden md:flex items-center gap-8">
            {[
              { href: '#features', label: 'Fitur' },
              { href: '#how-it-works', label: 'Cara Kerja' },
              { href: '#testimonials', label: 'Testimoni' },
              { href: '#pricing', label: 'Harga' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-on-surface-variant hover:text-primary transition-colors text-sm font-semibold focus-ring rounded-md px-1 py-0.5"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Masuk</Link>
            </Button>
            <Button
              variant="medical"
              size="sm"
              className="gap-2 shadow-md shadow-primary/20 animate-pulse-glow"
              asChild
            >
              <Link to="/register">
                <Sparkles className="w-3.5 h-3.5" />
                Mulai Gratis
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="pt-20">
        {/* ═══════════════════════════════════════════════════
            HERO SECTION — Parallax multi-layer
            ═══════════════════════════════════════════════════ */}
        <section
          className="relative min-h-[93vh] flex items-center overflow-hidden"
          aria-labelledby="hero-heading"
        >
          {/* Parallax background blob 1 */}
          <div
            className="absolute inset-0 pointer-events-none select-none"
            aria-hidden="true"
          >
            {/* Large ambient gradient */}
            <div
              className="absolute -top-24 -right-32 w-[700px] h-[700px] rounded-full opacity-[0.06]"
              style={{
                background: 'radial-gradient(circle, hsl(185,100%,30%) 0%, transparent 70%)',
                transform: `translateY(${heroBgOffset * 0.5}px)`,
              }}
            />
            <div
              className="absolute top-40 -left-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
              style={{
                background: 'radial-gradient(circle, hsl(30,80%,60%) 0%, transparent 70%)',
                transform: `translateY(${heroBgOffset * 0.3}px)`,
              }}
            />

            {/* Floating medical icons — parallax layer 1 */}
            <div
              className="absolute top-20 right-[8%] text-primary/8 animate-float"
              style={{ transform: `translateY(${heroFloatOffset * -0.8}px)` }}
            >
              <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5C3.89 3 3 3.9 3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
              </svg>
            </div>
            <div
              className="absolute bottom-32 left-[6%] text-primary/6 animate-float animation-delay-300"
              style={{ transform: `translateY(${heroFloatOffset * -0.6}px)` }}
            >
              <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div
              className="absolute top-48 left-[15%] text-tertiary/8 animate-float-slow"
              style={{ transform: `translateY(${blurBlobOffset * -0.4}px)` }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>

            {/* Geometric accent lines */}
            <div
              className="absolute top-1/3 right-[20%] w-px h-32 bg-gradient-to-b from-primary/20 to-transparent"
              style={{ transform: `translateY(${heroFloatOffset * -0.5}px)` }}
            />
            <div
              className="absolute bottom-1/3 left-[25%] w-24 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
              style={{ transform: `translateY(${heroFloatOffset * -0.3}px)` }}
            />
          </div>

          {/* Hero content grid */}
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full py-20 lg:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left: Copy */}
              <div className="space-y-8">
                <div className="animate-fade-in">
                  <Badge
                    variant="secondary"
                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-fixed/80 text-on-primary-fixed font-bold text-[10px] uppercase tracking-[0.15em] rounded-full border-none"
                  >
                    <Zap className="w-3 h-3" />
                    Platform Klinik Gigi #1 Indonesia
                  </Badge>
                </div>

                <div className="animate-fade-in-up animation-delay-100">
                  <h1
                    id="hero-heading"
                    className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5rem] font-black tracking-tight text-primary leading-[1.05] font-headline"
                  >
                    Open wide
                    <br />
                    <span className="text-on-surface">for your</span>
                    <br />
                    <span className="gradient-text">clinic.</span>
                  </h1>
                </div>

                <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed animate-fade-in-up animation-delay-200">
                  Tingkatkan efisiensi klinik dan kepuasan pasien dengan sistem
                  kurasi klinis yang cerdas, terintegrasi, dan intuitif — mulai
                  dalam 3 menit.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animation-delay-300">
                  <Button
                    variant="medical"
                    size="lg"
                    className="gap-2 shadow-lg shadow-primary/25 text-base font-bold"
                    asChild
                  >
                    <Link to="/register">
                      <Sparkles className="w-4 h-4" />
                      Mulai Gratis — 30 Hari
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 text-base font-bold"
                    asChild
                  >
                    <a href="#features">
                      Lihat Fitur
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </Button>
                </div>

                {/* Social proof mini row */}
                <div className="flex items-center gap-4 animate-fade-in-up animation-delay-400 pt-2">
                  <div className="flex -space-x-2">
                    {['A', 'B', 'C', 'D'].map((l, i) => (
                      <div
                        key={l}
                        className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold flex items-center justify-center ring-2 ring-white"
                        aria-hidden="true"
                      >
                        {l}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex gap-0.5" aria-label="Rating 5 dari 5 bintang">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      500+ klinik percaya kami
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Dashboard preview card */}
              <div
                className="relative animate-fade-in-right animation-delay-200"
                style={{ transform: `translateY(${heroFloatOffset * -0.25}px)` }}
              >
                {/* Ambient glows behind card */}
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/8 rounded-full blur-3xl" aria-hidden="true" />
                <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-tertiary-fixed/15 rounded-full blur-3xl" aria-hidden="true" />

                {/* Mini dashboard mockup */}
                <div className="relative glass-card rounded-3xl p-6 shadow-long-md">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground mb-1">
                        Hari ini
                      </p>
                      <h2 className="text-xl font-black text-primary font-headline">
                        Overview Klinik
                      </h2>
                    </div>
                    <div className="flex items-center gap-1.5 bg-primary-fixed/40 px-3 py-1.5 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-black text-primary uppercase tracking-wider">
                        Live
                      </span>
                    </div>
                  </div>

                  {/* Stat mini cards */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { label: 'Total Pasien', val: '1,248', icon: '👤', color: 'bg-primary-fixed/30' },
                      { label: 'Jadwal Hari Ini', val: '12', icon: '📅', color: 'bg-secondary-fixed/40' },
                      { label: 'Pendapatan', val: 'Rp 45M', icon: '💰', color: 'bg-tertiary-fixed/30' },
                      { label: 'Kasus Aktif', val: '84', icon: '🦷', color: 'bg-primary-fixed/20' },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className={`${s.color} rounded-2xl p-3`}
                      >
                        <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                        <p className="text-lg font-black text-primary font-headline">{s.val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mini appointment row */}
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      Jadwal berikutnya
                    </p>
                    {[
                      { time: '09:00', name: 'Sarah J.', proc: 'Root Canal', status: 'Konfirmasi' },
                      { time: '10:30', name: 'Michael R.', proc: 'Deep Cleaning', status: 'Hadir' },
                    ].map((appt) => (
                      <div
                        key={appt.time}
                        className="flex items-center justify-between bg-surface/60 rounded-xl px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary w-12">{appt.time}</span>
                          <div>
                            <p className="text-xs font-semibold text-on-surface">{appt.name}</p>
                            <p className="text-[10px] text-muted-foreground">{appt.proc}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-primary-fixed/50 text-primary uppercase tracking-wide">
                          {appt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating badge */}
                <div
                  className="absolute -bottom-5 -left-5 glass-card rounded-2xl px-4 py-3 shadow-long flex items-center gap-3 animate-float animation-delay-500"
                  aria-hidden="true"
                >
                  <div className="w-8 h-8 bg-primary-fixed rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-on-surface">Pasien baru ditambahkan</p>
                    <p className="text-[10px] text-muted-foreground">2 menit yang lalu</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce" aria-hidden="true">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Scroll</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            MARQUEE / LOGO STRIP
            ═══════════════════════════════════════════════════ */}
        <section
          className="py-8 border-y border-outline-variant/10 bg-surface-container-low overflow-hidden"
          aria-label="Klien dan mitra"
        >
          <div className="flex">
            <div className="flex gap-12 items-center animate-marquee whitespace-nowrap">
              {[
                'Senyum Indah Group',
                'Brightsmile Dental',
                'Denta Prima Network',
                'SmileCare Clinic',
                'Oral Health Centers',
                'PerfectTeeth Co.',
                'DrGigi Franchise',
                'Klinik Bersama',
              ]
                .concat([
                  'Senyum Indah Group',
                  'Brightsmile Dental',
                  'Denta Prima Network',
                  'SmileCare Clinic',
                  'Oral Health Centers',
                  'PerfectTeeth Co.',
                  'DrGigi Franchise',
                  'Klinik Bersama',
                ])
                .map((name, i) => (
                  <span
                    key={i}
                    className="text-sm font-bold text-muted-foreground/50 uppercase tracking-[0.15em] flex-shrink-0"
                  >
                    {name}
                  </span>
                ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            FEATURES SECTION
            ═══════════════════════════════════════════════════ */}
        <section id="features" className="py-24 md:py-36 px-6 max-w-7xl mx-auto" aria-labelledby="features-heading">
          <RevealSection className="text-center mb-20">
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-muted-foreground mb-4">
              Fitur Unggulan
            </p>
            <h2
              id="features-heading"
              className="text-4xl md:text-5xl font-black text-primary tracking-tight mb-4 font-headline"
            >
              Semua yang dibutuhkan<br />klinik modern.
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Tidak ada fitur yang terlewat. Tidak ada pasien yang terlupakan.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const direction = i % 3 === 0 ? 'left' : i % 3 === 2 ? 'right' : 'up'
              return (
                <RevealSection
                  key={feature.title}
                  direction={direction as 'up' | 'left' | 'right'}
                  delay={i * 80}
                >
                  <div className="group bg-surface-container-lowest rounded-3xl p-8 hover:shadow-long transition-all duration-500 hover:-translate-y-1 relative overflow-hidden h-full">
                    {/* Background accent */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `radial-gradient(circle at top left, ${feature.accent} 0%, transparent 60%)`,
                        opacity: 0,
                      }}
                    />
                    <div className={`w-14 h-14 rounded-2xl ${feature.color} mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                      <feature.icon className="w-7 h-7" aria-hidden="true" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-lg font-bold text-on-surface">{feature.title}</h3>
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-2 py-0.5 bg-surface-container text-muted-foreground font-bold uppercase tracking-wider rounded-full border-none"
                        >
                          {feature.tag}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-sm">{feature.description}</p>
                    </div>
                  </div>
                </RevealSection>
              )
            })}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            STATS / SOCIAL PROOF
            ═══════════════════════════════════════════════════ */}
        <section
          className="py-24 md:py-32 bg-surface-container-low relative overflow-hidden"
          aria-labelledby="stats-heading"
        >
          {/* Parallax bg element */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{ transform: `translateY(${heroBgOffset * 0.15}px)` }}
          >
            <div className="absolute top-10 right-10 w-80 h-80 bg-primary/4 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-10 w-64 h-64 bg-tertiary-fixed/10 rounded-full blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <RevealSection className="text-center mb-16">
              <p className="text-xs uppercase tracking-[0.25em] font-bold text-muted-foreground mb-4">
                Dalam Angka
              </p>
              <h2
                id="stats-heading"
                className="text-3xl md:text-4xl font-black text-on-surface font-headline mb-2"
              >
                Dipercaya klinik di seluruh Indonesia.
              </h2>
            </RevealSection>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
              {stats.map((stat, i) => (
                <StatCard key={stat.label} {...stat} delay={i * 100} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            HOW IT WORKS
            ═══════════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-24 md:py-36 px-6 max-w-7xl mx-auto" aria-labelledby="how-heading">
          <RevealSection className="text-center mb-20">
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-muted-foreground mb-4">
              Cara Kerja
            </p>
            <h2
              id="how-heading"
              className="text-4xl md:text-5xl font-black text-primary tracking-tight font-headline"
            >
              Semudah cabut gigi susu.
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div
              className="hidden md:block absolute top-12 left-[calc(16.67%)] right-[calc(16.67%)] h-px bg-gradient-to-r from-primary-fixed via-primary/30 to-primary-fixed"
              aria-hidden="true"
            />

            {steps.map((step, i) => (
              <RevealSection key={step.num} direction="up" delay={i * 150}>
                <div className="flex flex-col items-center text-center relative">
                  <div className="w-24 h-24 rounded-full medical-gradient flex items-center justify-center mb-6 shadow-long relative z-10">
                    <span className="text-2xl font-black text-white font-headline">{step.num}</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">{step.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            TESTIMONIALS
            ═══════════════════════════════════════════════════ */}
        <section
          id="testimonials"
          className="py-24 md:py-36 bg-surface-container-low relative overflow-hidden"
          aria-labelledby="testimonials-heading"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{ transform: `translateY(${heroBgOffset * 0.1}px)` }}
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/4 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <RevealSection className="text-center mb-16">
              <p className="text-xs uppercase tracking-[0.25em] font-bold text-muted-foreground mb-4">
                Testimoni
              </p>
              <h2
                id="testimonials-heading"
                className="text-4xl md:text-5xl font-black text-on-surface font-headline"
              >
                Kata mereka yang sudah<br />open wide.
              </h2>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <RevealSection key={t.name} direction="up" delay={i * 120}>
                  <blockquote className="bg-surface-container-lowest rounded-3xl p-8 shadow-long h-full flex flex-col">
                    <div
                      className="flex gap-0.5 mb-5"
                      aria-label={`${t.stars} bintang dari 5`}
                    >
                      {[...Array(t.stars)].map((_, si) => (
                        <Star
                          key={si}
                          className="w-4 h-4 fill-amber-400 text-amber-400"
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <p className="text-on-surface font-medium leading-relaxed flex-1 mb-6 italic">
                      "{t.quote}"
                    </p>
                    <footer>
                      <p className="font-bold text-primary text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.clinic}</p>
                    </footer>
                  </blockquote>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            CTA SECTION
            ═══════════════════════════════════════════════════ */}
        <section
          id="pricing"
          className="py-24 md:py-36 px-6"
          aria-labelledby="cta-heading"
        >
          <RevealSection>
            <div className="max-w-5xl mx-auto medical-gradient rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
              {/* Abstract wave */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                </svg>
              </div>
              {/* Floating circle accents */}
              <div
                className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full animate-float"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/5 rounded-full animate-float animation-delay-400"
                aria-hidden="true"
              />

              <div className="relative z-10 space-y-6">
                <Badge className="bg-white/15 text-white border-none text-xs font-bold uppercase tracking-widest px-4 py-1.5">
                  30 Hari Gratis · Tidak Butuh Kartu Kredit
                </Badge>
                <h2
                  id="cta-heading"
                  className="text-3xl md:text-5xl font-black text-white leading-tight font-headline"
                >
                  Siap mengoptimalkan<br />klinik Anda?
                </h2>
                <p className="text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
                  Bergabunglah dengan 500+ klinik yang telah beralih ke efisiensi digital. Setup 3 menit, hemat 12 jam per minggu.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button
                    size="lg"
                    className="bg-white text-primary hover:bg-primary-fixed transition-colors font-black shadow-xl rounded-xl text-base gap-2"
                    asChild
                  >
                    <Link to="/register">
                      <Sparkles className="w-4 h-4" />
                      Buat Akun Gratis
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-xl font-bold text-base gap-2"
                    asChild
                  >
                    <Link to="/login">
                      Masuk ke Akun
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </RevealSection>
        </section>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer
        className="w-full py-16 bg-surface-container-low border-t border-outline-variant/10"
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl medical-gradient flex items-center justify-center shadow-md">
                  <span className="text-white font-black text-sm font-headline">DC</span>
                </div>
                <div>
                  <span className="font-black text-lg text-primary font-headline leading-none block">
                    DentiCare Pro
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold opacity-70">
                    Clinical Curator
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Platform manajemen klinik gigi terdepan di Indonesia. Klinis dalam presisi, editorial dalam pengalaman.
              </p>
            </div>

            {/* Links */}
            <nav aria-label="Footer — Produk">
              <h3 className="font-bold text-on-surface text-sm mb-4 uppercase tracking-wider">Produk</h3>
              <ul className="space-y-3">
                {['Fitur', 'Harga', 'Demo', 'Blog', 'Changelog'].map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors focus-ring rounded-sm"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Footer — Perusahaan">
              <h3 className="font-bold text-on-surface text-sm mb-4 uppercase tracking-wider">Perusahaan</h3>
              <ul className="space-y-3">
                {['Tentang Kami', 'Karir', 'Kontak', 'Privasi', 'Syarat & Ketentuan'].map(
                  (l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors focus-ring rounded-sm"
                      >
                        {l}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </nav>
          </div>

          <div className="border-t border-outline-variant/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} DentiCare Pro. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground italic">
              "Keeping smiles bright, schedules tight."
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
