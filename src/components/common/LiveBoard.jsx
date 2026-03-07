import { useState, useEffect, useCallback, useRef } from 'react';
import { Tldraw, createTLStore, defaultShapeUtils } from 'tldraw';
import 'tldraw/tldraw.css';
import { supabase } from '../../supabaseClient';
import {
  Users, Radio, Square, Save, ArrowLeft, Share2, Copy, Check
} from 'lucide-react';

export default function LiveBoard({
  boardId,
  userId,
  isTeacher = false,
  onClose,
  isDark = true
}) {
  const [board, setBoard] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [presences, setPresences] = useState({});

  const editorRef = useRef(null);
  const channelRef = useRef(null);
  const lastSyncRef = useRef(null);

  // Load board data
  useEffect(() => {
    loadBoard();
    return () => {
      // Cleanup channel on unmount
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
    channel.on('broadcast', { event: 'draw' }, ({ payload }) => {
      if (editorRef.current && payload.senderId !== userId) {
        applyRemoteChanges(payload.changes);
      }
    });

    // Handle presence (cursors, who's online)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setPresences(state);
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

    // Load participants
    const { data: parts } = await supabase
      .from('board_participants')
      .select('user_id, role')
      .eq('board_id', boardId);

    setParticipants(parts || []);
  };

  // Apply remote changes to local editor
  const applyRemoteChanges = (changes) => {
    const editor = editorRef.current;
    if (!editor || !changes) return;

    try {
      // Batch update to avoid multiple re-renders
      editor.store.mergeRemoteChanges(() => {
        for (const [id, record] of Object.entries(changes.added || {})) {
          editor.store.put([record]);
        }
        for (const [id, [_from, to]] of Object.entries(changes.updated || {})) {
          editor.store.put([to]);
        }
        for (const id of Object.keys(changes.removed || {})) {
          editor.store.remove([id]);
        }
      });
    } catch (err) {
      console.error('Error applying remote changes:', err);
    }
  };

  // Broadcast local changes to others
  const broadcastChanges = useCallback((changes) => {
    if (!channelRef.current || !changes) return;

    // Throttle broadcasts
    const now = Date.now();
    if (lastSyncRef.current && now - lastSyncRef.current < 50) {
      return;
    }
    lastSyncRef.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'draw',
      payload: {
        senderId: userId,
        changes,
        timestamp: now
      }
    });
  }, [userId]);

  // Handle editor mount
  const handleMount = useCallback((editor) => {
    editorRef.current = editor;

    // Load saved document if exists
    if (board?.document && Object.keys(board.document).length > 0) {
      try {
        const snapshot = board.document;
        if (snapshot.store) {
          editor.store.loadSnapshot(snapshot);
        }
      } catch (err) {
        console.error('Error loading document:', err);
      }
    }

    // Listen to store changes
    const unsubscribe = editor.store.listen(
      ({ changes }) => {
        broadcastChanges(changes);
      },
      { source: 'user', scope: 'document' }
    );

    return () => {
      unsubscribe();
    };
  }, [board, broadcastChanges]);

  // Save board to database
  const saveBoard = async () => {
    if (!editorRef.current || !isTeacher) return;

    setIsSaving(true);
    try {
      const snapshot = editorRef.current.store.getSnapshot();

      await supabase
        .from('lesson_boards')
        .update({
          document: snapshot,
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

  // Copy board link
  const copyLink = () => {
    const link = `${window.location.origin}/board/${boardId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Count online users
  const onlineCount = Object.keys(presences).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
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

          {/* Live indicator */}
          {isLive && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-sm">
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
            <span className="text-sm">{onlineCount}</span>
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
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : isDark
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {isLive ? <Square size={16} /> : <Radio size={16} />}
                <span className="text-sm">{isLive ? 'End' : 'Go Live'}</span>
              </button>

              <button
                onClick={saveBoard}
                disabled={isSaving}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isDark
                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <Save size={16} className={isSaving ? 'animate-spin' : ''} />
                <span className="text-sm">{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tldraw canvas */}
      <div className="flex-1 relative">
        <Tldraw
          onMount={handleMount}
          autoFocus
        />
      </div>
    </div>
  );
}
