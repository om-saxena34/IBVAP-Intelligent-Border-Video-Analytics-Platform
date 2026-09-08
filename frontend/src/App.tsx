import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useHealth } from './hooks/useHealth';
import { useStreams } from './hooks/useStreams';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ConnectCameraModal from './components/ConnectCameraModal';

// Modular Pages
import DashboardPage from './pages/DashboardPage';
import LiveSurveillancePage from './pages/LiveSurveillancePage';
import LiveCamerasPage from './pages/LiveCamerasPage';
import AlertsPage from './pages/AlertsPage';
import EventsPage from './pages/EventsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ZonesPage from './pages/ZonesPage';
import SystemHealthPage from './pages/SystemHealthPage';
import SettingsPage from './pages/SettingsPage';

import './App.css';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export default function App() {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const {
    health,
    loading: healthLoading,
    error: healthError,
    refresh: refreshHealth,
  } = useHealth(10000);

  const { refresh: refreshStreams } = useStreams(8000);

  const notify = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const handleConnectSuccess = useCallback(
    (cameraId: string) => {
      notify(`Camera "${cameraId}" connected and ingestion worker started.`, 'success');
      refreshStreams();
      refreshHealth();
    },
    [notify, refreshStreams, refreshHealth]
  );

  const isBackendOffline = Boolean(healthError || (!healthLoading && !health));

  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* Left Navigation Sidebar */}
        <Sidebar onOpenConnectModal={() => setIsConnectModalOpen(true)} />

        {/* Main Application Area */}
        <div className="app-main">
          {/* Top Header */}
          <Topbar
            health={health}
            loading={healthLoading}
            error={healthError}
            onRefresh={refreshHealth}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
          />

          {/* Backend Offline Warning Banner */}
          {isBackendOffline && (
            <div className="backend-offline-banner" role="alert">
              <div className="banner-content">
                <span className="banner-icon">⚠</span>
                <span className="banner-text">
                  <strong>Backend unavailable:</strong> Unable to connect to IBVAP backend. Is the server running?
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={refreshHealth}
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Router Outlet */}
          <main>
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardPage
                    onOpenConnectModal={() => setIsConnectModalOpen(true)}
                    onNotify={notify}
                  />
                }
              />
              <Route
                path="/surveillance"
                element={
                  <LiveSurveillancePage
                    onOpenConnectModal={() => setIsConnectModalOpen(true)}
                    onNotify={notify}
                  />
                }
              />
              <Route
                path="/cameras"
                element={
                  <LiveCamerasPage
                    onOpenConnectModal={() => setIsConnectModalOpen(true)}
                    onNotify={notify}
                  />
                }
              />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/zones" element={<ZonesPage onNotify={notify} />} />
              <Route path="/health" element={<SystemHealthPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>

        {/* Global Camera Connect Modal */}
        <ConnectCameraModal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          onSuccess={handleConnectSuccess}
        />

        {/* Toast Notifications */}
        {toast && (
          <div
            className={`toast-notification ${toast.type}`}
            role="status"
            aria-live="polite"
          >
            <span className="toast-icon">
              {toast.type === 'success' ? '✓' : '⚠'}
            </span>
            <span className="toast-text">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => setToast(null)}
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}
