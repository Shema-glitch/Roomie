import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Card } from './Card';
import {
  Pulse,
  Bug,
  CheckCircle,
  Copy,
  ArrowsClockwise,
  ShieldCheck,
  Trash,
  Warning,
  XCircle,
} from '@phosphor-icons/react';
import { DEBUG_MODULES, DebugEntry, DebugLevel, DebugModule, debugLog } from '../../utils/debugLog';
import { outbox } from '../../services/outbox';
import { api } from '../../services/api';
import { useToast } from './Toast';

interface DebugInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProbeResult = Awaited<ReturnType<typeof api.pingSupabaseHealth>>;

export const DebugInspectorModal: React.FC<DebugInspectorModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [selectedModule, setSelectedModule] = useState<DebugModule | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<DebugLevel | 'all'>('all');
  const [, setTick] = useState(0);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [probing, setProbing] = useState(false);
  const [flushing, setFlushing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    return debugLog.subscribe(() => setTick((t) => t + 1));
  }, [isOpen]);

  const stats = debugLog.getModuleStats();
  const entries = useMemo(
    () => debugLog.getEntries({ module: selectedModule, level: selectedLevel }),
    [selectedModule, selectedLevel, stats]
  );
  const outboxItems = outbox.getItems();
  const pendingCount = outbox.getPendingCount();
  const isDemo = api.isDemoMode();

  const handleProbe = async () => {
    setProbing(true);
    try {
      const result = await api.pingSupabaseHealth();
      setProbe(result);
      showToast('Live Supabase health probe updated', 'info');
    } catch {
      showToast('Health probe failed', 'error');
    } finally {
      setProbing(false);
    }
  };

  const handleFlushOutbox = async () => {
    setFlushing(true);
    try {
      await outbox.flush();
      setTick((t) => t + 1);
      showToast('Outbox flush finished', 'info');
    } finally {
      setFlushing(false);
    }
  };

  const handleCopyReport = () => {
    const report = debugLog.exportReport({
      demoMode: isDemo,
      pendingOutbox: pendingCount,
      outboxItems: outboxItems.map((i) => ({ id: i.id, type: i.type, status: i.status, retryCount: i.retryCount })),
      probe,
    });
    navigator.clipboard?.writeText(report).catch(() => {});
    showToast('Debug report copied to clipboard', 'success');
  };

  const renderLevelBadge = (level: DebugLevel) => {
    if (level === 'error') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-[#FFF0ED] text-[#E5484D] border border-[#FFD7CF]">
          <XCircle weight="fill" className="w-3 h-3" /> ERROR
        </span>
      );
    }
    if (level === 'warn') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-[#FFF8E6] text-[#8A6200] border border-[#FFE8A3]">
          <Warning weight="fill" className="w-3 h-3" /> WARN
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-[#E6FAF8] text-[#149689] border border-[#97E5DE]">
        <CheckCircle weight="fill" className="w-3 h-3" /> OK
      </span>
    );
  };

  const renderEntry = (entry: DebugEntry) => {
    const timeLabel = entry.timestamp.slice(11, 19);
    return (
      <div
        key={entry.id}
        className="p-2.5 rounded-xl bg-white border border-[#E6E8EE] text-xs space-y-1"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            {renderLevelBadge(entry.level)}
            <span className="px-1.5 py-0.5 rounded-md bg-[#EEF0FD] text-[#5B5BD6] font-extrabold text-[11px]">
              {entry.module}
            </span>
            <span className="font-bold text-[#1F2430] truncate">{entry.action}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#64748B] shrink-0">
            {typeof entry.durationMs === 'number' && (
              <span className="font-bold text-[#475569]">{entry.durationMs}ms</span>
            )}
            <span>{timeLabel}</span>
          </div>
        </div>
        <p className="text-[#475569] font-medium break-words">{entry.summary}</p>
        {entry.meta && Object.keys(entry.meta).length > 0 && (
          <pre className="mt-1 p-2 rounded-lg bg-[#F7F8FB] border border-[#E6E8EE] text-[10px] text-[#334155] overflow-x-auto">
            {JSON.stringify(entry.meta, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phase 1 Debug Layer"
      subtitle={isDemo ? 'Demo Sandbox Mode (Isolated)' : 'Live Supabase + Offline Outbox Telemetry'}
    >
      <div className="space-y-4">
        {/* Top Controls & Status */}
        <Card padding="sm" className="bg-[#F7F8FB] border border-[#E6E8EE] space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#EEF0FD] text-[#5B5BD6]">
                <Bug weight="duotone" className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-[#1F2430]">
                  {isDemo ? 'Demo Mode Active' : 'Live Backend Mode'}
                </p>
                <p className="text-[11px] text-[#64748B]">
                  Outbox queued: <strong>{pendingCount}</strong> • Total logs: <strong>{debugLog.getEntries().length}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleProbe}
                disabled={probing}
                icon={<ShieldCheck weight="duotone" className={`w-3.5 h-3.5 ${probing ? 'animate-pulse' : ''}`} />}
              >
                {probing ? 'Probing...' : 'Probe RLS'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFlushOutbox}
                disabled={flushing || pendingCount === 0}
                icon={<ArrowsClockwise weight="duotone" className={`w-3.5 h-3.5 ${flushing ? 'animate-spin' : ''}`} />}
              >
                Flush ({pendingCount})
              </Button>
            </div>
          </div>

          {probe && (
            <div className="pt-2 border-t border-[#E6E8EE] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#475569]">
                <span>
                  RLS & Auth Probe ({probe.latencyMs}ms)
                </span>
                <span>{probe.authenticated ? 'Authenticated' : 'Signed Out'}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {probe.checks.map((c) => (
                  <div
                    key={c.name}
                    className={`px-2 py-1 rounded-lg border text-[11px] flex items-center justify-between gap-1 ${
                      c.ok
                        ? 'bg-[#E6FAF8] border-[#97E5DE] text-[#149689]'
                        : 'bg-[#FFF0ED] border-[#FFD7CF] text-[#E5484D]'
                    }`}
                  >
                    <span className="font-bold truncate">{c.name}</span>
                    <span className="shrink-0 font-mono">{c.ms}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Per-Module Health Matrix */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="type-label text-[#64748B]">Per-Module Channels</span>
            <button
              type="button"
              onClick={() => setSelectedModule('all')}
              className="text-[11px] font-extrabold text-[#5B5BD6] cursor-pointer"
            >
              Show all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
            {DEBUG_MODULES.map((mod) => {
              const s = stats[mod.id];
              const isSelected = selectedModule === mod.id;
              const hasErr = s.errors > 0;
              const hasWarn = s.warnings > 0;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setSelectedModule(isSelected ? 'all' : mod.id)}
                  className={`text-left p-2 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#EEF0FD] border-[#5B5BD6]'
                      : 'bg-white border-[#E6E8EE] hover:bg-[#F7F8FB]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-black text-[#1F2430] truncate">{mod.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        hasErr
                          ? 'bg-[#FFF0ED] text-[#E5484D]'
                          : hasWarn
                          ? 'bg-[#FFF8E6] text-[#8A6200]'
                          : 'bg-[#F1F5F9] text-[#475569]'
                      }`}
                    >
                      {s.total}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748B] truncate mt-0.5">
                    {s.lastSummary || mod.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Level Filter & Actions */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            {(['all', 'info', 'warn', 'error'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold capitalize cursor-pointer border ${
                  selectedLevel === lvl
                    ? 'bg-[#1F2430] text-white border-[#1F2430]'
                    : 'bg-white text-[#475569] border-[#E6E8EE]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={handleCopyReport} icon={<Copy weight="duotone" className="w-3.5 h-3.5" />}>
              Copy JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => debugLog.clear(selectedModule === 'all' ? undefined : selectedModule)}
              icon={<Trash weight="duotone" className="w-3.5 h-3.5 text-[#E5484D]" />}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Event Stream */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
          {entries.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#64748B] bg-[#F7F8FB] rounded-2xl border border-dashed border-[#CBD5E1]">
              <Pulse weight="duotone" className="w-5 h-5 mx-auto mb-1.5 text-[#94A3B8]" />
              No debug events recorded yet for this filter. Interact with expenses, chores, QR, chat, or run Probe RLS.
            </div>
          ) : (
            entries.map(renderEntry)
          )}
        </div>
      </div>
    </Modal>
  );
};
