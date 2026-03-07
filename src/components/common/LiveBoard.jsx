import { useState, useEffect, useCallback, useRef } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import { supabase } from '../../supabaseClient';
import {
  Users, Radio, Square, Save, ArrowLeft, Copy, Check
} from 'lucide-react';

export default function LiveBoard({
  boardId,
  userId,
  isTeacher = false,
  onClose,
  isDark = true
}) {
  const [board, setBoard] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);

  const excalidrawRef = useRef(null);
  const channelRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);
  const lastBroadcastRef = useRef(0);

  // Load board data
  useEffect(() => {
    loadBoard();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [boardId]);

  // Setup realtime channel
  useEffect(() => {
    if (!boardId || !userId) return;

    const channel = supabase.channel(`board:${boardId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: userId }
      }
    });

    // Handle incoming drawing updates
    channel.on('broadcast', { event: 'scene' }, ({ payload }) => {
      if (excalidrawRef.current && payload.senderId !== userId) {
        isRemoteUpdateRef.current = true;
        excalidrawRef.current.updateScene({
          elements: payload.elements,
          appState: { collaborators: new Map() }
        });
        setTimeout(() => {
          isRemoteUpdateRef.current = false;
        }, 100);
      }
    });

    // Handle presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setOnlineUsers(Object.keys(state).length);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          odentifier: userId,
          isTeacher,
          online_at: new Date().toISOString()
        });
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, userId, isTeacher]);

  const loadBoard = async () => {
    const { data, error } = await supabase
      .from('lesson_boards')
      .select('*')
      .eq('id', boardId)
      .single();

    if (data) {
      setBoard(data);
      setIsLive(data.is_live);
    }
  };

  // Broadcast scene changes
  const broadcastScene = useCallback((elements) => {
    if (!channelRef.current || isRemoteUpdateRef.current) return;

    const now = Date.now();
    if (now - lastBroadcastRef.current < 50) return;
    lastBroadcastRef.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'scene',
      payload: {
        senderId: userId,
        elements,
        timestamp: now
      }
    });
  }, [userId]);

  // Handle Excalidraw changes
  const handleChange = useCallback((elements, appState) => {
    if (!isRemoteUpdateRef.current) {
      broadcastScene(elements);
    }
  }, [broadcastScene]);

  // Save board
  const saveBoard = async () => {
    if (!excalidrawRef.current || !isTeacher) return;

    setIsSaving(true);
    try {
      const elements = excalidrawRef.current.getSceneElements();
      const appState = excalidrawRef.current.getAppState();

      await supabase
        .from('lesson_boards')
        .update({
          document: { elements, appState: { viewBackgroundColor: appState.viewBackgroundColor } },
          updated_at: new Date().toISOString()
        })
        .eq('id', boardId);
    } catch (err) {
      console.error('Error saving board:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle live session
  const toggleLive = async () => {
    if (!isTeacher) return;

    if (isLive) {
      await supabase.rpc('end_board_session', { p_board_id: boardId });
      setIsLive(false);
    } else {
      await supabase.rpc('start_board_session', { p_board_id: boardId });
      setIsLive(true);
    }
  };

  // Copy link
  const copyLink = () => {
    const link = `${window.location.origin}/board/${boardId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Initial data for Excalidraw
  const getInitialData = () => {
    if (board?.document?.elements) {
      return {
        elements: board.document.elements,
        appState: {
          viewBackgroundColor: board.document.appState?.viewBackgroundColor || '#ffffff',
          collaborators: new Map()
        }
      };
    }
    return { elements: [], appState: { collaborators: new Map() } };
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ width: '100vw', height: '100vh' }}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {board?.title || 'Loading...'}
          </h2>

          {isLive && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 text-red-500 text-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Online users */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
            isDark ? 'bg-white/5 text-white/70' : 'bg-gray-100 text-gray-600'
          }`}>
            <Users size={16} />
            <span className="text-sm">{onlineUsers}</span>
          </div>

          {/* Copy link */}
          <button
            onClick={copyLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              isDark ? 'bg-white/5 hover:bg-white/10 text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            <span className="text-sm">{copied ? 'Copied!' : 'Link'}</span>
          </button>

          {/* Teacher controls */}
          {isTeacher && (
            <>
              <button
                onClick={toggleLive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isLive
                    ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                    : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                }`}
              >
                {isLive ? <Square size={16} /> : <Radio size={16} />}
                <span className="text-sm">{isLive ? 'End' : 'Go Live'}</span>
              </button>

              <button
                onClick={saveBoard}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 transition-colors"
              >
                <Save size={16} className={isSaving ? 'animate-spin' : ''} />
                <span className="text-sm">{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Excalidraw canvas */}
      <div className="flex-1 relative" style={{ height: 'calc(100vh - 56px)' }}>
        {board && (
          <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <Excalidraw
              ref={excalidrawRef}
              initialData={getInitialData()}
              onChange={handleChange}
              theme={isDark ? 'dark' : 'light'}
              UIOptions={{
                canvasActions: {
                  saveAsImage: true,
                  loadScene: false,
                  export: false,
                  saveFileToDisk: false
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
