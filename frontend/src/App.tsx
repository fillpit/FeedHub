import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import AdminPanel from "@/components/AdminPanel";
import AIChatPanel from "@/components/AIChatPanel";
import LoginPage from "@/components/LoginPage";
import DynamicRoutePanel from "@/components/DynamicRoutePanel";
import WebsiteRssPanel from "@/components/WebsiteRssPanel";
import AuthCredentialPanel from "@/components/AuthCredentialPanel";
import NpmPackagePanel from "@/components/NpmPackagePanel";
import { AppProvider, useApp, useAppActions, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH } from "@/store/AppContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SiteSettingsProvider, useSiteSettings } from "@/hooks/useSiteSettings";
import { TooltipProvider } from "@/components/ui/tooltip";
import { User } from "@/types";
import { getServerUrl, clearServerUrl } from "@/lib/api";
import { useBackButton, hideSplashScreen, useStatusBarSync, useKeyboardLayout } from "@/hooks/useCapacitor";

function SidebarResizeHandle() {
  const { state } = useApp();
  const actions = useAppActions();
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = state.sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = startWidth.current + (ev.clientX - startX.current);
      actions.setSidebarWidth(Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [state.sidebarWidth, actions]);

  if (state.sidebarCollapsed) return null;

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={() => actions.setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
      className="hidden md:flex w-1 cursor-col-resize items-center justify-center hover:bg-accent-primary/30 active:bg-accent-primary/50 transition-colors shrink-0 group"
      title="拖拽调整侧边栏宽度 / 双击恢复默认"
    >
      <div className="w-[2px] h-8 rounded-full bg-transparent group-hover:bg-accent-primary/60 transition-colors" />
    </div>
  );
}

function useSwipeGesture({
  onSwipeRight,
  onSwipeLeft,
  mobileSidebarOpen,
}: {
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  mobileSidebarOpen: boolean;
}) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    const EDGE_THRESHOLD = 30; 
    const SWIPE_MIN_DISTANCE = 60; 
    const SWIPE_MAX_Y_RATIO = 0.6; 

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      isSwiping.current = touch.clientX <= EDGE_THRESHOLD || mobileSidebarOpen;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwiping.current) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      if (deltaY > Math.abs(deltaX) * SWIPE_MAX_Y_RATIO) return;

      if (deltaX > SWIPE_MIN_DISTANCE && touchStartX.current <= EDGE_THRESHOLD && !mobileSidebarOpen) {
        onSwipeRight();
      } else if (deltaX < -SWIPE_MIN_DISTANCE && mobileSidebarOpen) {
        onSwipeLeft();
      }

      isSwiping.current = false;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [mobileSidebarOpen, onSwipeRight, onSwipeLeft]);
}

function AppLayout({ user }: { user: User }) {
  const { state } = useApp();
  const actions = useAppActions();

  useEffect(() => {
    if (user) {
      actions.setUser(user);
    }
  }, [user, actions]);

  const isAIChatView = state.viewMode === "ai-chat";

  const handleBackToList = useCallback(() => {
    actions.setMobileView("list");
  }, [actions]);
  const handleCloseSidebar = useCallback(() => {
    actions.setMobileSidebar(false);
  }, [actions]);

  useBackButton({
    mobileView: state.mobileView,
    mobileSidebarOpen: state.mobileSidebarOpen,
    onBackToList: handleBackToList,
    onCloseSidebar: handleCloseSidebar,
  });

  useStatusBarSync();
  useKeyboardLayout();

  const handleSwipeOpen = useCallback(() => {
    actions.setMobileSidebar(true);
  }, [actions]);

  useSwipeGesture({
    onSwipeRight: handleSwipeOpen,
    onSwipeLeft: handleCloseSidebar,
    mobileSidebarOpen: state.mobileSidebarOpen,
  });

  return (
    <div className="flex h-[100dvh] w-screen bg-app-bg overflow-hidden transition-colors duration-200">
      <AnimatePresence>
        {state.mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => actions.setMobileSidebar(false)}
              className="fixed inset-0 z-40 bg-zinc-900/60 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-[340px] md:hidden shadow-2xl"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div
        className="hidden md:flex shrink-0"
        style={{ width: state.sidebarCollapsed ? undefined : `${state.sidebarWidth}px` }}
      >
        <Sidebar />
      </div>
      <SidebarResizeHandle />

      {isAIChatView ? (
        <div className="flex-1 flex flex-col">
          <MobileTopBar />
          <AIChatPanel
            onClose={() => actions.setViewMode("dashboard")}
            onNavigateToNote={async () => { /* no-op */ }}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <MobileTopBar />
          {state.viewMode === "admin" ? (
            <AdminPanel />
          ) : state.viewMode === "feed-routes" ? (
            <DynamicRoutePanel />
          ) : state.viewMode === "feed-websites" ? (
            <WebsiteRssPanel />
          ) : state.viewMode === "feed-credentials" ? (
            <AuthCredentialPanel />
          ) : state.viewMode === "feed-npm" ? (
            <NpmPackagePanel />
          ) : (
            <Dashboard />
          )}
        </div>
      )}
    </div>
  );
}

function MobileTopBar() {
  const actions = useAppActions();
  const { siteConfig } = useSiteSettings();
  return (
    <header className="flex items-center px-4 py-3 border-b border-app-border bg-app-surface/50 md:hidden" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}>
      <button
        onClick={() => actions.setMobileSidebar(true)}
        className="p-2 -ml-2 rounded-lg text-tx-secondary hover:bg-app-hover active:bg-app-active"
      >
        <Menu size={24} />
      </button>
      <span className="ml-3 text-sm font-semibold text-tx-primary">{siteConfig.title}</span>
    </header>
  );
}

function AuthGate() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (isAuthenticated !== null) {
      hideSplashScreen();
    }
  }, [isAuthenticated]);

  const isCapacitor = Capacitor.isNativePlatform() 
    || (Capacitor.getPlatform() !== "web");
  const isClientMode = window.location.protocol === "file:"
    || window.location.protocol === "capacitor:"
    || isCapacitor
    || !!getServerUrl();

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem("nowen-token");
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    const serverUrl = getServerUrl();
    const baseUrl = serverUrl ? `${serverUrl}/api` : "/api";

    fetch(`${baseUrl}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Invalid token");
      })
      .then((data) => {
        setUser(data.user);
        setIsAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem("nowen-token");
        setIsAuthenticated(false);
      });
  }, []);

  useEffect(() => {
    if (isClientMode && !getServerUrl()) {
      setIsAuthenticated(false);
      return;
    }
    checkAuth();
  }, [checkAuth, isClientMode]);

  const handleDisconnect = () => {
    clearServerUrl();
    localStorage.removeItem("nowen-token");
    setIsAuthenticated(false);
    setUser(null);
  };

  const handleLogin = (token: string, userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-400 dark:text-zinc-500">{t('auth.verifying')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLogin={handleLogin}
        isClientMode={isClientMode}
        onDisconnect={isClientMode ? handleDisconnect : undefined}
      />
    );
  }

  if (!user) return null;

  return (
    <AppProvider>
      <TooltipProvider>
        <AppLayout user={user} />
      </TooltipProvider>
    </AppProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SiteSettingsProvider>
        <AuthGate />
      </SiteSettingsProvider>
    </ThemeProvider>
  );
}

export default App;
