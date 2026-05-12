const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Cog,
  ClipboardCheck,
  Settings,
  Zap,
  AlertTriangle,
  Building2,
  LogOut,
  ChevronDown,
  LogIn,
  Wrench,
  FileBarChart,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button"; // Added Button import
// Keep this import, although db.auth is used, User entity might be used elsewhere.
import { base44 } from "@/api/base44Client"; // Added base44 import
import InitialAccessModal from "./components/auth/InitialAccessModal";
import CasinoSelectionModal from "./components/auth/CasinoSelectionModal";
import AnonymousBanner from "./components/auth/AnonymousBanner";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showInitialModal, setShowInitialModal] = useState(false);
  const [showCasinoModal, setShowCasinoModal] = useState(false);
  const [selectedCasino, setSelectedCasino] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check for persistent anonymous session (localStorage instead of sessionStorage)
      const anonCasino = localStorage.getItem('anonymous_casino');
      if (anonCasino) {
        setIsAnonymous(true);
        setSelectedCasino(JSON.parse(anonCasino));
        setLoading(false);
        return;
      }

      // Check for authenticated user
      // Assuming db.auth.me() is the new way to get the current user
      const currentUser = await db.auth.me();
      setUser(currentUser);

      // Check for previously selected casino (localStorage instead of sessionStorage)
      const storedCasino = localStorage.getItem('selected_casino');
      if (storedCasino) {
        // Auto-select the previously selected casino
        setSelectedCasino(JSON.parse(storedCasino));
      } else {
        // Only show casino selection modal if no casino was previously selected
        setShowCasinoModal(true);
      }

    } catch (error) {
      // Not authenticated and no anonymous session - show initial modal
      setShowInitialModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAnonymous = () => {
    setShowInitialModal(false);
    setShowCasinoModal(true);
  };

  const handleCasinoSelected = (casino) => {
    setSelectedCasino(casino);

    if (isAnonymous || !user) {
      // Use localStorage for persistence across browser sessions
      localStorage.setItem('anonymous_casino', JSON.stringify(casino));
      // Also clear sessionStorage just in case an old anonymous session existed there
      sessionStorage.removeItem('anonymous_casino');
      setIsAnonymous(true);
      // Redirect Site Staff to Issues page
      window.location.href = createPageUrl("Issues");
    } else {
      // Use localStorage for persistence across browser sessions
      localStorage.setItem('selected_casino', JSON.stringify(casino));
      // Also clear sessionStorage just in case an old selected casino existed there
      sessionStorage.removeItem('selected_casino');
      // Redirect logged-in users to Dashboard
      window.location.href = createPageUrl("Dashboard");
    }

    setShowCasinoModal(false);
  };

  const handleSignInClick = () => {
    // Clear anonymous session from both local and session storage
    localStorage.removeItem('anonymous_casino');
    sessionStorage.removeItem('anonymous_casino');
    setIsAnonymous(false);
    setSelectedCasino(null);
    setShowInitialModal(true);
  };

  const handleSignOut = async () => {
    // Assuming db.auth.logout() is the new way to log out
    await db.auth.logout();
    // Clear all stored casino selections from both local and session storage
    localStorage.removeItem('selected_casino');
    sessionStorage.removeItem('selected_casino');
    localStorage.removeItem('anonymous_casino');
    sessionStorage.removeItem('anonymous_casino');

    window.location.reload();
  };

  const handleSwitchCasino = () => {
    setShowCasinoModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Anonymous users only see Issues page
  const navigationItems = isAnonymous ? [
    {
      title: "Issues",
      url: createPageUrl("Issues"),
      icon: AlertTriangle,
    }
  ] : [
    {
      title: "Dashboard",
      url: createPageUrl("Dashboard"),
      icon: LayoutDashboard,
    },
    {
      title: "Issues",
      url: createPageUrl("Issues"),
      icon: AlertTriangle,
    },

    {
      title: "PM Tracker",
      url: createPageUrl("Maintenance"),
      icon: ClipboardCheck,
    },

    {
      title: "RTP Tracker",
      url: createPageUrl("RamClears"),
      icon: FileBarChart,
    },
    {
      title: "Equipment Tracker",
      url: createPageUrl("EquipmentMaintenance"),
      icon: Wrench,
    },
    {
      title: "Manage Casinos",
      url: createPageUrl("ManageCasinos"),
      icon: Building2,
    },
  ];

  return (
    <>
      <InitialAccessModal
        open={showInitialModal}
        onContinueAnonymous={handleContinueAnonymous}
      />
      <CasinoSelectionModal
        open={showCasinoModal}
        onSelectCasino={handleCasinoSelected}
      />

      <SidebarProvider>
        <style>{`
          :root {
            --casino-primary: #3b82f6;
            --casino-secondary: #60a5fa;
            --casino-accent: #fbbf24;
            --casino-gold: #ffd700;
            --casino-dark: #0f172a;
            --casino-darker: #020617;
            --casino-light: #1e293b;
            --casino-lighter: #334155;
            --casino-gray: #94a3b8;
            --casino-border: #475569;
          }

          body {
            background-color: var(--casino-dark);
          }

          @media (max-width: 768px) {
            html {
              font-size: 14px;
            }

            body {
              zoom: 0.9;
              -moz-transform: scale(0.9);
              -moz-transform-origin: 0 0;
            }

            .sidebar {
              font-size: 0.9rem;
            }

            h1 {
              font-size: 1.5rem !important;
            }

            h2 {
              font-size: 1.25rem !important;
            }

            .card {
              padding: 0.75rem !important;
            }

            button {
              padding: 0.5rem 0.75rem !important;
              font-size: 0.875rem !important;
            }
          }
        `}</style>

        <div className="min-h-screen flex w-full bg-slate-900">
          <Sidebar className="border-r border-slate-700 bg-slate-900">
            <SidebarHeader className="border-b border-slate-700 p-6 bg-slate-900">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--casino-primary), var(--casino-secondary))'
                  }}
                >
                  <Zap className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-white">
                    SlotTracker Pro
                  </h2>
                  <p className="text-sm text-slate-400">
                    Maintenance Management
                  </p>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent className="p-3 bg-slate-900">
              {selectedCasino && (
                <div className="mb-4 px-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-white truncate">{selectedCasino.name}</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-700 border-slate-600 text-white">
                      <DropdownMenuItem onClick={handleSwitchCasino} className="hover:bg-slate-600">
                        <Building2 className="w-4 h-4 mr-2" />
                        Switch Casino
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              <SidebarGroup>
                <SidebarGroupLabel
                  className="text-xs font-semibold uppercase tracking-wider px-3 py-2 text-slate-400"
                >
                  Navigation
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigationItems.map((item) => {
                      const isActive = location.pathname === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            className={`mb-1 transition-all duration-200 rounded-lg ${
                              isActive
                                ? 'text-white shadow-lg bg-gradient-to-r from-blue-600 to-blue-500'
                                : 'hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <Link to={item.url} className="flex items-center gap-3 px-3 py-3">
                              <item.icon className="w-5 h-5" />
                              <span className="font-medium">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-slate-700 p-4 bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-700"
                  >
                    <Settings className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-white">
                      {isAnonymous ? 'Site Staff' : user?.full_name || 'User'}
                    </p>
                    <p className="text-xs truncate text-slate-400">
                      {isAnonymous ? 'Limited Access' : user?.email || ''}
                    </p>
                  </div>
                </div>
                {!isAnonymous && (
                  <button
                    onClick={handleSignOut}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4 text-slate-400" />
                  </button>
                )}
                {isAnonymous && (
                  <Button
                    variant="ghost"
                    onClick={handleSignInClick}
                    className="flex items-center gap-2 text-slate-300 hover:bg-slate-700 hover:text-white"
                    size="sm"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                )}
              </div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col bg-slate-900">
            <header
              className="bg-slate-800 border-b border-slate-700 px-6 py-4 md:hidden shadow-sm"
            >
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-slate-700 p-2 rounded-lg transition-colors duration-200 text-white" />
                <h1 className="text-xl font-semibold text-white">
                  SlotTracker Pro
                </h1>
              </div>
            </header>

            {isAnonymous && <AnonymousBanner onSignIn={handleSignInClick} />}

            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </>
  );
}