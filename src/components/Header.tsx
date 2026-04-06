import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import { useRoleDisplay } from '@/hooks/useRoleDisplay';
import { useClinicUser } from '@/hooks/useClinicUser';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Settings,
  User,
  ExternalLink,
  Bell,
  HelpCircle,
  Search,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export const Header = () => {
  const { user, logout } = useAuth();
  const { settings } = useClinicSettings();
  const { clinicUser } = useClinicUser();
  const clinicName = settings?.clinic_name || 'DentiCare Pro';
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Use role from clinic_users table, fallback to user_metadata
  const userRole = clinicUser?.role || user?.user_metadata?.role || user?.user_metadata?.role_name;
  const roleDisplay = useRoleDisplay(userRole);
  const displayRole = roleDisplay?.label || 'Staf';

  const handleLogout = async () => {
    try { await logout(); } catch (e) { console.error(e); }
  };

  const userName =
    user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Dokter';

  return (
    <header
      className="sticky top-0 z-40 h-20 flex items-center px-4 md:px-8 bg-surface/80 backdrop-blur-md shadow-long border-b border-outline-variant/[0.07]"
      role="banner"
    >
      <div className="flex items-center justify-between w-full gap-4">

        {/* ── Left: Clinic name (mobile) + Search + tagline ── */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Clinic name — mobile only (sidebar hidden) */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 font-bold text-primary font-headline lg:hidden flex-shrink-0 focus-ring rounded-lg"
            aria-label={`${clinicName} — Dasbor`}
          >
            <div className="w-8 h-8 rounded-lg medical-gradient flex items-center justify-center">
              <span className="text-white font-black text-xs">DC</span>
            </div>
            <span className="hidden sm:block text-base">{clinicName}</span>
          </Link>

          {/* Search bar */}
          <div className="relative hidden sm:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="header-search" className="sr-only">
              Cari pasien atau rekam medis
            </label>
            <input
              id="header-search"
              ref={searchRef}
              type="search"
              placeholder="Cari pasien atau rekam medis…"
              className={cn(
                'pl-9 pr-4 py-2 text-sm bg-surface-container-low rounded-full w-56 md:w-72',
                'border-none outline-none transition-all duration-200',
                'focus:ring-2 focus:ring-primary/20 focus:w-72 md:focus:w-80',
                'placeholder:text-muted-foreground/60'
              )}
              aria-label="Cari pasien atau rekam medis"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* ── Right: Notification, Help, Divider, User ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Notification bell */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-surface-container-low hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
          </Button>

          {/* Help */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-surface-container-low hover:text-primary focus-visible:ring-2 focus-visible:ring-primary hidden sm:inline-flex"
            aria-label="Bantuan"
          >
            <HelpCircle className="w-5 h-5" aria-hidden="true" />
          </Button>

          {/* Divider */}
          <div className="h-8 w-px bg-outline-variant/20 mx-1 hidden sm:block" aria-hidden="true" />

          {/* User info + dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="rounded-xl h-12 px-2 gap-3 hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Menu akun: ${userName}`}
                aria-haspopup="true"
              >
                {/* Name + role — desktop only */}
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-on-surface leading-none">{userName}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 uppercase tracking-wide">
                    {displayRole}
                  </p>
                </div>

                {/* Avatar */}
                <Avatar className="h-9 w-9 ring-2 ring-surface-container ring-offset-1">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url}
                    alt={`Foto profil ${userName}`}
                  />
                  <AvatarFallback className="bg-primary-fixed text-primary text-sm font-black">
                    {(() => {
                      const name = user?.user_metadata?.full_name || user?.email || 'U';
                      const parts = name.split(' ').filter(Boolean);
                      if (parts.length >= 2) {
                        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                      }
                      return name.charAt(0).toUpperCase();
                    })()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56 shadow-long-md rounded-2xl border-none bg-surface-container-lowest p-1"
            >
              {/* User header inside dropdown */}
              <div className="px-3 py-3 border-b border-outline-variant/10 mb-1">
                <p className="text-sm font-bold text-on-surface">{userName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
              </div>

              <DropdownMenuItem asChild>
                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium focus:bg-surface-container-low"
                >
                  <User className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <span>Profil Saya</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  to="/settings"
                  className="flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium focus:bg-surface-container-low"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <span>Pengaturan</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 bg-outline-variant/10" />

              <DropdownMenuItem asChild>
                <a
                  href="/portal/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium focus:bg-surface-container-low"
                  aria-label="Buka Patient Portal di tab baru"
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <span>Patient Portal</span>
                </a>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 bg-outline-variant/10" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium text-destructive focus:bg-destructive/5 focus:text-destructive"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Keluar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </header>
  );
};
