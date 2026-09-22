import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenConnectModal: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onOpenConnectModal,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const commands: CommandItem[] = [
    {
      id: 'cmd-live',
      title: 'Jump to Live Operations (Surveillance Grid)',
      category: 'Navigation',
      shortcut: 'G S',
      action: () => {
        navigate('/surveillance');
        onClose();
      },
    },
    {
      id: 'cmd-overview',
      title: 'Jump to Overview Dashboard',
      category: 'Navigation',
      shortcut: 'G O',
      action: () => {
        navigate('/');
        onClose();
      },
    },
    {
      id: 'cmd-cameras',
      title: 'Manage Camera Nodes & Streams',
      category: 'Navigation',
      shortcut: 'G C',
      action: () => {
        navigate('/cameras');
        onClose();
      },
    },
    {
      id: 'cmd-alerts',
      title: 'Review Active Threat Alerts',
      category: 'Navigation',
      shortcut: 'G A',
      action: () => {
        navigate('/alerts');
        onClose();
      },
    },
    {
      id: 'cmd-events',
      title: 'Inspect Telemetry & Event Stream',
      category: 'Navigation',
      shortcut: 'G E',
      action: () => {
        navigate('/events');
        onClose();
      },
    },
    {
      id: 'cmd-analytics',
      title: 'View Intelligence Analytics & Detections',
      category: 'Navigation',
      action: () => {
        navigate('/analytics');
        onClose();
      },
    },
    {
      id: 'cmd-zones',
      title: 'Configure Perimeter Zones & Virtual Fences',
      category: 'Navigation',
      action: () => {
        navigate('/zones');
        onClose();
      },
    },
    {
      id: 'cmd-health',
      title: 'Check System Diagnostics & Gateway Health',
      category: 'Navigation',
      action: () => {
        navigate('/health');
        onClose();
      },
    },
    {
      id: 'cmd-settings',
      title: 'Open Platform Settings',
      category: 'Navigation',
      action: () => {
        navigate('/settings');
        onClose();
      },
    },
    {
      id: 'cmd-add-cam',
      title: 'Deploy New Camera Stream / Upload Video',
      category: 'Actions',
      shortcut: 'N C',
      action: () => {
        onClose();
        onOpenConnectModal();
      },
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          // handled by parent or opened
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="forge-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="forge-command-palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="palette-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="palette-input font-mono"
            placeholder="Search command, node, or route..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="palette-esc" onClick={onClose}>ESC</kbd>
        </div>

        <div className="palette-list">
          {filteredCommands.length === 0 ? (
            <div className="palette-empty font-mono">
              No matching mission commands found
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                className={`palette-item ${idx === selectedIndex ? 'selected' : ''}`}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={cmd.action}
              >
                <div className="palette-item-left">
                  <span className="palette-item-category font-mono">{cmd.category}</span>
                  <span className="palette-item-title">{cmd.title}</span>
                </div>
                {cmd.shortcut && (
                  <kbd className="palette-item-shortcut font-mono">{cmd.shortcut}</kbd>
                )}
              </div>
            ))
          )}
        </div>

        <div className="palette-footer font-mono">
          <span>↑↓ Navigate</span>
          <span>↵ Execute</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
