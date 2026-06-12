'use client';

import { useNavigationStore } from '@/store/navigation-store';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

type SidebarSection = 'my-stuff' | 'layout-pick' | 'plan-picks';

interface NavItem {
  id: SidebarSection;
  label: string;
  icon: React.ReactNode;
  color: {
    active: string;
    text: string;
    dot: string;
    shadow: string;
  };
}

const navItems: NavItem[] = [
  {
    id: 'my-stuff',
    label: 'My Stuff',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="2" width="14" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 7h6M7 10h4M7 13h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    color: {
      active: 'from-[#4EDBA1]/10 to-[#4EDBA1]/5',
      text: 'text-[#2A9D6E]',
      dot: 'bg-[#4EDBA1]',
      shadow: 'shadow-[#4EDBA1]/10',
    },
  },
  {
    id: 'layout-pick',
    label: 'Layout Pick',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="16" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    color: {
      active: 'from-[#F5A6C8]/10 to-[#F5A6C8]/5',
      text: 'text-[#D4749A]',
      dot: 'bg-[#F5A6C8]',
      shadow: 'shadow-[#F5A6C8]/10',
    },
  },
  {
    id: 'plan-picks',
    label: 'Plan Picks',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.3-4.9-2.6L5.1 18l.9-5.3-4-3.9 5.5-.8L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    color: {
      active: 'from-[#F5C872]/10 to-[#F5C872]/5',
      text: 'text-[#C9993D]',
      dot: 'bg-[#F5C872]',
      shadow: 'shadow-[#F5C872]/10',
    },
  },
];

export function Sidebar() {
  const activeSection = useNavigationStore((state) => state.activeSection);
  const setSection = useNavigationStore((state) => state.setSection);

  return (
    <aside className="w-[260px] flex-shrink-0 border-r border-gray-100/80 bg-white/70 backdrop-blur-xl flex flex-col relative overflow-hidden">
      {/* Decorative gradient at top */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#4EDBA1]/8 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="relative px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4EDBA1] via-[#F5C872] to-[#F5A6C8] flex items-center justify-center shadow-lg shadow-[#4EDBA1]/20">
            <span className="text-white text-lg">✦</span>
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-gray-900 tracking-tight">BushyBeaver</h1>
            <p className="text-[11px] text-gray-400 font-medium">Digital Journal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          const c = item.color;

          return (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? `bg-gradient-to-r ${c.active} ${c.text} shadow-sm ${c.shadow}`
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/80'
              }`}
            >
              <span
                className={`transition-transform duration-200 ${
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                }`}
              >
                {item.icon}
              </span>
              {item.label}
              {isActive && (
                <div className={`ml-auto w-1.5 h-1.5 rounded-full ${c.dot}`} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile section */}
      <div className="relative px-4 py-4 border-t border-gray-100/80">
        <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-[#4EDBA1] via-[#F5C872] to-[#F5A6C8] rounded-full" />
        <ProfileCard />
      </div>
    </aside>
  );
}

function ProfileCard() {
  const { data: session } = useSession();
  const [showMenu, setShowMenu] = useState(false);

  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Guest';
  const userEmail = session?.user?.email || '';
  const initial = userName.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-gray-50/80 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5A6C8] to-[#E88DB4] flex items-center justify-center shadow-md shadow-[#F5A6C8]/20">
          <span className="text-white text-sm font-bold">{initial}</span>
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-semibold text-gray-700 truncate">{userName}</p>
          <p className="text-[10px] text-gray-400 truncate">{userEmail || 'Not signed in'}</p>
        </div>
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-800">{userName}</p>
            <p className="text-xs text-gray-400">{userEmail}</p>
          </div>
          {session ? (
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <a
              href="/auth/signin"
              className="block w-full px-4 py-2.5 text-left text-sm text-[#4EDBA1] hover:bg-[#4EDBA1]/5 transition-colors"
            >
              Sign in
            </a>
          )}
        </div>
      )}
    </div>
  );
}
