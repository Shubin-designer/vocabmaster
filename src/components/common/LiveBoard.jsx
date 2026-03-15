import { useState, useEffect, useCallback, useRef } from 'react';
import { Stage, Layer, Rect, Text, Line, Circle, Group, Transformer, Shape } from 'react-konva';
import { supabase } from '../../supabaseClient';
import {
  Users, Radio, Square, Save, ArrowLeft, Copy, Check,
  Pencil, Type, StickyNote, ImagePlus, MessageSquare,
  Circle as CircleIcon, Minus, MousePointer, Trash2, Palette,
  Bold, Italic, Underline, Strikethrough, ChevronDown,
  ArrowUpToLine, ArrowDownToLine, ArrowUp, ArrowDown
} from 'lucide-react';

const COLORS = ['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];
const SIZES = [2, 4, 8, 12];
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 32];
// Rotation snap angles (every 15 degrees) for Shift+rotate
const ROTATION_SNAPS = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345];
const FONTS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times' },
  { value: 'Courier New, monospace', label: 'Courier' },
  { value: 'Comic Sans MS, cursive', label: 'Comic Sans' },
];

// Generate unique ID
const genId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Sticky Note component
function StickyNoteShape({ shapeProps, isSelected, onSelect, onChange, onEdit, isEditing }) {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current && !isEditing) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, isEditing]);

  const { x, y, width, height, text, bgColor, fontSize } = shapeProps;
  const padding = 14;
  const radius = 8;

  return (
    <>
      <Group
        ref={shapeRef}
        x={x}
        y={y}
        width={width}
        height={height}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={onEdit}
        onDblTap={onEdit}
        onDragEnd={(e) => {
          onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            width: Math.max(100, width * scaleX),
            height: Math.max(60, height * scaleY),
          });
        }}
      >
        <Rect
          width={width}
          height={height}
          fill={bgColor}
          cornerRadius={radius}
          shadowColor="rgba(0,0,0,0.15)"
          shadowBlur={10}
          shadowOffsetY={4}
        />
        {!isEditing && (
          <Text
            x={padding}
            y={padding}
            width={width - padding * 2}
            height={height - padding * 2}
            text={text || 'Double-click to edit'}
            fontSize={fontSize || 16}
            fontFamily={shapeProps.fontFamily || 'Inter, sans-serif'}
            fontStyle={shapeProps.fontStyle || 'normal'}
            textDecoration={shapeProps.textDecoration || ''}
            fill={text ? (shapeProps.textColor || '#1a1a1a') : '#9ca3af'}
            verticalAlign="top"
          />
        )}
      </Group>
      {isSelected && !isEditing && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 100 || newBox.height < 60) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

// Comment component
function CommentShape({ shapeProps, isSelected, onSelect, onChange, onEdit, isEditing }) {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current && !isEditing) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, isEditing]);

  const { x, y, width, height, text, bgColor, fontSize } = shapeProps;
  const padding = 10;
  const radius = 6;

  return (
    <>
      <Group
        ref={shapeRef}
        x={x}
        y={y}
        width={width}
        height={height}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={onEdit}
        onDblTap={onEdit}
        onDragEnd={(e) => {
          onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            width: Math.max(80, width * scaleX),
            height: Math.max(40, height * scaleY),
          });
        }}
      >
        <Rect
          width={width}
          height={height}
          fill={bgColor}
          cornerRadius={radius}
          stroke="#e5e7eb"
          strokeWidth={1}
          shadowColor="rgba(0,0,0,0.08)"
          shadowBlur={6}
          shadowOffsetY={2}
        />
        {/* Speech bubble tail */}
        <Shape
          sceneFunc={(context, shape) => {
            context.beginPath();
            context.moveTo(16, height);
            context.lineTo(24, height + 10);
            context.lineTo(32, height);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          fill={bgColor}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        {/* Cover the line between rect and tail */}
        <Line
          points={[17, height, 31, height]}
          stroke={bgColor}
          strokeWidth={2}
        />
        {!isEditing && (
          <Text
            x={padding}
            y={padding}
            width={width - padding * 2}
            height={height - padding * 2}
            text={text || 'Double-click to edit'}
            fontSize={fontSize || 14}
            fontFamily={shapeProps.fontFamily || 'Inter, sans-serif'}
            fontStyle={shapeProps.fontStyle || 'normal'}
            textDecoration={shapeProps.textDecoration || ''}
            fill={text ? (shapeProps.textColor || '#1e3a5f') : '#9ca3af'}
            verticalAlign="top"
          />
        )}
      </Group>
      {isSelected && !isEditing && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 80 || newBox.height < 40) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

// Editable Text component
function EditableText({ shapeProps, isSelected, onSelect, onChange, stageRef }) {
  const textRef = useRef();
  const trRef = useRef();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isSelected && trRef.current && textRef.current && !isEditing) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, isEditing]);

  const handleDblClick = () => {
    setIsEditing(true);
    const textNode = textRef.current;
    const stage = stageRef.current;
    const stageBox = stage.container().getBoundingClientRect();
    const textPosition = textNode.absolutePosition();

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    textarea.value = shapeProps.text;
    textarea.style.position = 'absolute';
    textarea.style.top = `${stageBox.top + textPosition.y}px`;
    textarea.style.left = `${stageBox.left + textPosition.x}px`;
    textarea.style.width = `${Math.max(200, textNode.width())}px`;
    textarea.style.fontSize = `${shapeProps.fontSize || 18}px`;
    textarea.style.fontFamily = 'Inter, sans-serif';
    textarea.style.border = '2px solid #3b82f6';
    textarea.style.borderRadius = '4px';
    textarea.style.padding = '4px';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.background = 'white';
    textarea.style.zIndex = '1000';
    textarea.style.color = shapeProps.fill || '#000';

    textarea.focus();

    const removeTextarea = () => {
      textarea.remove();
      setIsEditing(false);
    };

    textarea.addEventListener('blur', () => {
      onChange({ ...shapeProps, text: textarea.value });
      removeTextarea();
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        onChange({ ...shapeProps, text: textarea.value });
        removeTextarea();
      }
      if (e.key === 'Escape') {
        removeTextarea();
      }
    });
  };

  return (
    <>
      <Text
        ref={textRef}
        x={shapeProps.x}
        y={shapeProps.y}
        text={shapeProps.text}
        fontSize={shapeProps.fontSize || 18}
        fill={shapeProps.fill || '#000'}
        fontFamily={shapeProps.fontFamily || 'Inter, sans-serif'}
        fontStyle={shapeProps.fontStyle || 'normal'}
        textDecoration={shapeProps.textDecoration || ''}
        rotation={shapeProps.rotation || 0}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        onDragEnd={(e) => {
          onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = textRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          // Convert scale to fontSize change
          const newFontSize = Math.max(10, Math.round((shapeProps.fontSize || 18) * Math.max(scaleX, scaleY)));
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            fontSize: newFontSize,
            rotation: node.rotation(),
          });
        }}
        visible={!isEditing}
      />
      {isSelected && !isEditing && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          rotationSnaps={ROTATION_SNAPS}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

// Transformable Rectangle component
function TransformableRect({ shapeProps, isSelected, onSelect, onChange }) {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Rect
        ref={shapeRef}
        x={shapeProps.x}
        y={shapeProps.y}
        width={shapeProps.width}
        height={shapeProps.height}
        rotation={shapeProps.rotation || 0}
        fill={shapeProps.fill || 'transparent'}
        stroke={shapeProps.stroke || '#000'}
        strokeWidth={shapeProps.strokeWidth || 2}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(20, shapeProps.width * scaleX),
            height: Math.max(20, shapeProps.height * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          rotationSnaps={ROTATION_SNAPS}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

// Transformable Circle component
function TransformableCircle({ shapeProps, isSelected, onSelect, onChange }) {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Circle
        ref={shapeRef}
        x={shapeProps.x}
        y={shapeProps.y}
        radius={shapeProps.radius}
        rotation={shapeProps.rotation || 0}
        fill={shapeProps.fill || 'transparent'}
        stroke={shapeProps.stroke || '#000'}
        strokeWidth={shapeProps.strokeWidth || 2}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const avgScale = (scaleX + scaleY) / 2;
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            radius: Math.max(10, shapeProps.radius * avgScale),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          rotationSnaps={ROTATION_SNAPS}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

// Transformable Line component - uses Group wrapper for proper rotation
function TransformableLine({ shapeProps, isSelected, onSelect, onChange }) {
  const groupRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Use stored position/rotation or calculate from points
  const points = shapeProps.points || [];
  if (points.length < 4) return null;

  // If we have stored center position, use it; otherwise calculate
  let centerX, centerY, localPoints;

  if (shapeProps.lineX !== undefined && shapeProps.lineY !== undefined && shapeProps.localPoints) {
    // Use stored local coordinate system
    centerX = shapeProps.lineX;
    centerY = shapeProps.lineY;
    localPoints = shapeProps.localPoints;
  } else {
    // First time or legacy: calculate from absolute points
    const xs = points.filter((_, i) => i % 2 === 0);
    const ys = points.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    centerX = (minX + maxX) / 2;
    centerY = (minY + maxY) / 2;

    localPoints = [];
    for (let i = 0; i < points.length; i += 2) {
      localPoints.push(points[i] - centerX);
      localPoints.push(points[i + 1] - centerY);
    }
  }

  // Calculate width/height for the group (needed for transformer)
  const lxs = localPoints.filter((_, i) => i % 2 === 0);
  const lys = localPoints.filter((_, i) => i % 2 === 1);
  const width = Math.max(...lxs) - Math.min(...lxs) || 1;
  const height = Math.max(...lys) - Math.min(...lys) || 1;

  return (
    <>
      <Group
        ref={groupRef}
        x={centerX}
        y={centerY}
        width={width}
        height={height}
        rotation={shapeProps.rotation || 0}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          const node = e.target;
          onChange({
            ...shapeProps,
            lineX: node.x(),
            lineY: node.y(),
            localPoints: localPoints,
          });
        }}
        onTransformEnd={() => {
          const node = groupRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Scale local points
          const newLocalPoints = [];
          for (let i = 0; i < localPoints.length; i += 2) {
            newLocalPoints.push(localPoints[i] * scaleX);
            newLocalPoints.push(localPoints[i + 1] * scaleY);
          }

          // Reset scale, keep rotation
          node.scaleX(1);
          node.scaleY(1);

          onChange({
            ...shapeProps,
            lineX: node.x(),
            lineY: node.y(),
            rotation: node.rotation(),
            localPoints: newLocalPoints,
          });
        }}
      >
        <Line
          points={localPoints}
          stroke={shapeProps.stroke || '#000'}
          strokeWidth={shapeProps.strokeWidth || 2}
          lineCap="round"
          lineJoin="round"
          tension={0.5}
          hitStrokeWidth={Math.max(20, (shapeProps.strokeWidth || 2) + 10)}
        />
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          rotationSnaps={ROTATION_SNAPS}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

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
  const [tool, setTool] = useState('select');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [showColors, setShowColors] = useState(false);

  const [shapes, setShapes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState(null);
  const [selectionRect, setSelectionRect] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const channelRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const toolbarRef = useRef(null);

  // Pan & Zoom state
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });

  const MIN_SCALE = 0.1;
  const MAX_SCALE = 5;
  const ZOOM_SENSITIVITY = 0.001;

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setShowColors(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Delete key and Space (for panning) handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space for panning mode
      if (e.code === 'Space' && !isSpacePressed) {
        if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') return;
        e.preventDefault();
        setIsSpacePressed(true);
      }
      // Delete/Backspace to delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0 && !editingId) {
        if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') return;
        updateShapes(shapes.filter(s => !selectedIds.includes(s.id)));
        setSelectedIds([]);
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedIds, shapes, editingId, isSpacePressed]);

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale,
    };

    // Determine zoom direction
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * (1 + direction * ZOOM_SENSITIVITY * Math.abs(e.evt.deltaY))));

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePosition(newPos);
  };

  // Zoom controls
  const zoomIn = () => {
    const newScale = Math.min(MAX_SCALE, stageScale * 1.2);
    const center = { x: stageSize.width / 2, y: stageSize.height / 2 };
    const mousePointTo = {
      x: (center.x - stagePosition.x) / stageScale,
      y: (center.y - stagePosition.y) / stageScale,
    };
    setStageScale(newScale);
    setStagePosition({
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    });
  };

  const zoomOut = () => {
    const newScale = Math.max(MIN_SCALE, stageScale / 1.2);
    const center = { x: stageSize.width / 2, y: stageSize.height / 2 };
    const mousePointTo = {
      x: (center.x - stagePosition.x) / stageScale,
      y: (center.y - stagePosition.y) / stageScale,
    };
    setStageScale(newScale);
    setStagePosition({
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    });
  };

  const resetZoom = () => {
    setStageScale(1);
    setStagePosition({ x: 0, y: 0 });
  };

  // Resize handler
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setStageSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Load board
  useEffect(() => {
    loadBoard();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      clearTimeout(autoSaveTimerRef.current);
    };
  }, [boardId]);

  // Load shapes from board document
  useEffect(() => {
    if (board?.document?.shapes) {
      setShapes(board.document.shapes);
    }
  }, [board]);

  // Realtime channel
  useEffect(() => {
    if (!boardId || !userId) return;

    const channel = supabase.channel(`board:${boardId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: userId }
      }
    });

    channel.on('broadcast', { event: 'shapes' }, ({ payload }) => {
      if (payload.senderId !== userId) {
        setShapes(payload.shapes);
      }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setOnlineUsers(Object.keys(state).length);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          identifier: userId,
          isTeacher,
          online_at: new Date().toISOString()
        });
      }
    });

    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [boardId, userId, isTeacher]);

  const loadBoard = async () => {
    const { data, error } = await supabase
      .from('lesson_boards')
      .select('*')
      .eq('id', boardId)
      .single();

    if (error) {
      console.error('loadBoard error:', error);
      return;
    }

    if (data) {
      setBoard(data);
      setIsLive(data.is_live);
    }
  };

  const broadcastShapes = useCallback((newShapes) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'shapes',
        payload: { senderId: userId, shapes: newShapes }
      });
    }
  }, [userId]);

  const scheduleAutoSave = useCallback(() => {
    if (!isTeacher) return;
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const doc = { shapes };
      await supabase
        .from('lesson_boards')
        .update({ document: doc, updated_at: new Date().toISOString() })
        .eq('id', boardId);
    }, 2000);
  }, [isTeacher, boardId, shapes]);

  const updateShapes = (newShapes) => {
    setShapes(newShapes);
    broadcastShapes(newShapes);
    scheduleAutoSave();
  };

  const handleChange = (id, newAttrs) => {
    const newShapes = shapes.map((s) => (s.id === id ? { ...s, ...newAttrs } : s));
    updateShapes(newShapes);
  };

  const saveBoard = async () => {
    if (!isTeacher) return;
    setIsSaving(true);
    try {
      const doc = { shapes };
      await supabase
        .from('lesson_boards')
        .update({ document: doc, updated_at: new Date().toISOString() })
        .eq('id', boardId);
    } finally {
      setIsSaving(false);
    }
  };

  const saveTitle = async (newTitle) => {
    if (!isTeacher || !newTitle.trim()) return;
    const trimmed = newTitle.trim();
    await supabase
      .from('lesson_boards')
      .update({ title: trimmed, updated_at: new Date().toISOString() })
      .eq('id', boardId);
    setBoard(prev => ({ ...prev, title: trimmed }));
    setEditingTitle(false);
  };

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

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/board/${boardId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteSelected = () => {
    if (selectedIds.length > 0) {
      updateShapes(shapes.filter((s) => !selectedIds.includes(s.id)));
      setSelectedIds([]);
    }
  };

  // Layer order functions
  const bringToFront = () => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    const idx = shapes.findIndex(s => s.id === id);
    if (idx === -1 || idx === shapes.length - 1) return;
    const newShapes = shapes.filter(s => s.id !== id);
    newShapes.push(shapes[idx]);
    updateShapes(newShapes);
  };

  const sendToBack = () => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    const idx = shapes.findIndex(s => s.id === id);
    if (idx === -1 || idx === 0) return;
    const newShapes = shapes.filter(s => s.id !== id);
    newShapes.unshift(shapes[idx]);
    updateShapes(newShapes);
  };

  const bringForward = () => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    const idx = shapes.findIndex(s => s.id === id);
    if (idx === -1 || idx === shapes.length - 1) return;
    const newShapes = [...shapes];
    [newShapes[idx], newShapes[idx + 1]] = [newShapes[idx + 1], newShapes[idx]];
    updateShapes(newShapes);
  };

  const sendBackward = () => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    const idx = shapes.findIndex(s => s.id === id);
    if (idx === -1 || idx === 0) return;
    const newShapes = [...shapes];
    [newShapes[idx], newShapes[idx - 1]] = [newShapes[idx - 1], newShapes[idx]];
    updateShapes(newShapes);
  };

  // Stage click handlers
  const handleStageMouseDown = (e) => {
    const stage = e.target.getStage();
    const clickedOnEmpty = e.target === stage;
    const pos = stage.getPointerPosition();

    // Middle mouse button (button 1) or Space pressed = panning
    if (e.evt.button === 1 || isSpacePressed) {
      e.evt.preventDefault();
      setIsPanning(true);
      lastPanPosition.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    // Transform pointer position to canvas coordinates
    const canvasPos = {
      x: (pos.x - stagePosition.x) / stageScale,
      y: (pos.y - stagePosition.y) / stageScale,
    };

    if (clickedOnEmpty && tool === 'select') {
      // Start selection rectangle
      setSelectedIds([]);
      setIsSelecting(true);
      setSelectionRect({ x: canvasPos.x, y: canvasPos.y, width: 0, height: 0, startX: canvasPos.x, startY: canvasPos.y });
      return;
    }

    if (tool === 'draw') {
      setIsDrawing(true);
      setCurrentLine({
        id: genId(),
        type: 'line',
        points: [canvasPos.x, canvasPos.y],
        stroke: color,
        strokeWidth: brushSize,
      });
      return;
    }

    if (clickedOnEmpty && tool !== 'select' && tool !== 'draw') {
      let newShape = null;

      if (tool === 'note') {
        newShape = {
          id: genId(),
          type: 'note',
          x: canvasPos.x - 100,
          y: canvasPos.y - 75,
          width: 200,
          height: 150,
          text: '',
          bgColor: '#fef9c3',
          fontSize: 16,
        };
      } else if (tool === 'comment') {
        newShape = {
          id: genId(),
          type: 'comment',
          x: canvasPos.x - 100,
          y: canvasPos.y - 30,
          width: 200,
          height: 60,
          text: '',
          bgColor: '#dbeafe',
          fontSize: 14,
        };
      } else if (tool === 'text') {
        newShape = {
          id: genId(),
          type: 'text',
          x: canvasPos.x,
          y: canvasPos.y,
          text: 'Type here',
          fontSize: 18,
          fill: color,
        };
      } else if (tool === 'rect') {
        newShape = {
          id: genId(),
          type: 'rect',
          x: canvasPos.x - 50,
          y: canvasPos.y - 30,
          width: 100,
          height: 60,
          stroke: color,
          strokeWidth: brushSize,
          fill: 'transparent',
        };
      } else if (tool === 'circle') {
        newShape = {
          id: genId(),
          type: 'circle',
          x: canvasPos.x,
          y: canvasPos.y,
          radius: 40,
          stroke: color,
          strokeWidth: brushSize,
          fill: 'transparent',
        };
      } else if (tool === 'line') {
        newShape = {
          id: genId(),
          type: 'line',
          points: [canvasPos.x - 50, canvasPos.y, canvasPos.x + 50, canvasPos.y],
          stroke: color,
          strokeWidth: brushSize,
        };
      }

      if (newShape) {
        updateShapes([...shapes, newShape]);
        setSelectedIds([newShape.id]);
        setTool('select');
      }
    }
  };

  const handleStageMouseMove = (e) => {
    // Handle panning
    if (isPanning) {
      const dx = e.evt.clientX - lastPanPosition.current.x;
      const dy = e.evt.clientY - lastPanPosition.current.y;
      lastPanPosition.current = { x: e.evt.clientX, y: e.evt.clientY };
      setStagePosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      return;
    }

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    // Transform pointer position to canvas coordinates
    const canvasPos = {
      x: (pos.x - stagePosition.x) / stageScale,
      y: (pos.y - stagePosition.y) / stageScale,
    };

    if (isDrawing && currentLine) {
      setCurrentLine({
        ...currentLine,
        points: [...currentLine.points, canvasPos.x, canvasPos.y],
      });
      return;
    }

    if (isSelecting && selectionRect) {
      const newRect = {
        ...selectionRect,
        x: Math.min(canvasPos.x, selectionRect.startX),
        y: Math.min(canvasPos.y, selectionRect.startY),
        width: Math.abs(canvasPos.x - selectionRect.startX),
        height: Math.abs(canvasPos.y - selectionRect.startY),
      };
      setSelectionRect(newRect);
    }
  };

  const handleStageMouseUp = (e) => {
    // Stop panning
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing && currentLine) {
      updateShapes([...shapes, currentLine]);
      setCurrentLine(null);
      setIsDrawing(false);
    }

    if (isSelecting && selectionRect) {
      // Find shapes inside selection rectangle
      const selected = shapes.filter(shape => {
        let shapeX, shapeY, shapeW, shapeH;

        if (shape.type === 'line' && shape.points) {
          // Calculate bounding box for line from points
          const xs = shape.points.filter((_, i) => i % 2 === 0);
          const ys = shape.points.filter((_, i) => i % 2 === 1);
          shapeX = Math.min(...xs);
          shapeY = Math.min(...ys);
          shapeW = Math.max(...xs) - shapeX;
          shapeH = Math.max(...ys) - shapeY;
        } else {
          shapeX = shape.x || 0;
          shapeY = shape.y || 0;
          shapeW = shape.width || shape.radius * 2 || 100;
          shapeH = shape.height || shape.radius * 2 || 50;
        }

        return (
          shapeX < selectionRect.x + selectionRect.width &&
          shapeX + shapeW > selectionRect.x &&
          shapeY < selectionRect.y + selectionRect.height &&
          shapeY + shapeH > selectionRect.y
        );
      });

      setSelectedIds(selected.map(s => s.id));
      setSelectionRect(null);
      setIsSelecting(false);
    }
  };

  // Edit note/comment text
  const handleShapeDblClick = (id, type) => {
    const shape = shapes.find((s) => s.id === id);
    if (!shape || (type !== 'note' && type !== 'comment')) return;

    setEditingId(id);

    const stage = stageRef.current;
    const stageBox = stage.container().getBoundingClientRect();
    const padding = type === 'note' ? 14 : 10;

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    textarea.value = shape.text || '';
    textarea.style.position = 'absolute';
    textarea.style.top = `${stageBox.top + shape.y + padding}px`;
    textarea.style.left = `${stageBox.left + shape.x + padding}px`;
    textarea.style.width = `${shape.width - padding * 2}px`;
    textarea.style.height = `${shape.height - padding * 2}px`;
    textarea.style.fontSize = `${shape.fontSize || (type === 'note' ? 16 : 14)}px`;
    textarea.style.fontFamily = 'Inter, sans-serif';
    textarea.style.border = 'none';
    textarea.style.padding = '0';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.background = 'transparent';
    textarea.style.zIndex = '1000';
    textarea.style.color = shape.textColor || (type === 'note' ? '#1a1a1a' : '#1e3a5f');
    textarea.style.lineHeight = '1.4';

    textarea.focus();

    const finishEditing = () => {
      handleChange(id, { text: textarea.value });
      textarea.remove();
      setEditingId(null);
    };

    textarea.addEventListener('blur', finishEditing);
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        textarea.remove();
        setEditingId(null);
      }
    });
  };

  // Get selected shape for formatting panel (only show if single selection)
  const selectedShape = selectedIds.length === 1 ? shapes.find(s => s.id === selectedIds[0]) : null;
  const showFormatPanel = selectedShape && (selectedShape.type === 'note' || selectedShape.type === 'comment' || selectedShape.type === 'text');
  const showShapePanel = selectedShape && (selectedShape.type === 'rect' || selectedShape.type === 'circle' || selectedShape.type === 'line');

  const updateSelectedStyle = (updates) => {
    if (selectedIds.length !== 1) return;
    handleChange(selectedIds[0], updates);
  };

  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'draw', icon: Pencil, label: 'Draw' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'rect', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: CircleIcon, label: 'Circle' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'note', icon: StickyNote, label: 'Note' },
    { id: 'comment', icon: MessageSquare, label: 'Comment' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#fff' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b shrink-0"
        style={{
          height: '56px',
          background: isDark ? '#111' : '#fff',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'
        }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
            <ArrowLeft size={20} />
          </button>
          {editingTitle && isTeacher ? (
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={() => saveTitle(titleValue)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle(titleValue);
                if (e.key === 'Escape') {
                  setTitleValue(board?.title || '');
                  setEditingTitle(false);
                }
              }}
              autoFocus
              className={`font-semibold px-3 py-1.5 rounded-lg border-2 outline-none transition-colors ${
                isDark
                  ? 'bg-white/5 text-white border-purple-500/50 focus:border-purple-400'
                  : 'bg-gray-50 text-gray-900 border-purple-300 focus:border-purple-500'
              }`}
            />
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {board?.title || 'Loading...'}
              </h2>
              {isTeacher && (
                <button
                  onClick={() => {
                    setTitleValue(board?.title || '');
                    setEditingTitle(true);
                  }}
                  className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                    isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-400'
                  }`}
                  title="Rename board"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          )}
          {isLive && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 text-red-500 text-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/5 text-white/70' : 'bg-gray-100 text-gray-600'}`}>
            <Users size={16} />
            <span className="text-sm">{onlineUsers}</span>
          </div>

          <button onClick={copyLink} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            <span className="text-sm">{copied ? 'Copied!' : 'Link'}</span>
          </button>

          {isTeacher && (
            <>
              <button onClick={toggleLive} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${isLive ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}>
                {isLive ? <Square size={16} /> : <Radio size={16} />}
                <span className="text-sm">{isLive ? 'End' : 'Go Live'}</span>
              </button>
              <button onClick={saveBoard} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 transition-colors">
                <Save size={16} className={isSaving ? 'animate-spin' : ''} />
                <span className="text-sm">{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div ref={toolbarRef} className="flex items-center gap-1 px-4 py-2 border-b bg-gray-50 shrink-0" style={{ borderColor: '#e5e7eb' }}>
        {tools.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTool(id)}
            title={label}
            className={`p-2 rounded-lg transition-colors ${tool === id ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 text-gray-600'}`}
          >
            <Icon size={18} />
          </button>
        ))}

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button onClick={() => fileInputRef.current?.click()} title="Add Image" className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors">
          <ImagePlus size={18} />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />

        <button onClick={deleteSelected} title="Delete Selected" className="p-2 rounded-lg hover:bg-red-100 text-gray-600 hover:text-red-500 transition-colors">
          <Trash2 size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Color picker */}
        <div className="relative">
          <button onClick={() => setShowColors(showColors === true ? false : true)} title="Color" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <Palette size={18} style={{ color }} />
          </button>
          {showColors === true && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border flex gap-1 z-10">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setShowColors(false); }}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: color === c ? '#3b82f6' : '#d1d5db' }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Brush size */}
        <div className="flex items-center gap-1 ml-1">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setBrushSize(s)}
              title={`${s}px`}
              className={`p-1.5 rounded transition-colors ${brushSize === s ? 'bg-blue-100' : 'hover:bg-gray-200'}`}
            >
              <div className="rounded-full bg-current" style={{ width: Math.max(s, 4), height: Math.max(s, 4), color: brushSize === s ? '#3b82f6' : '#9ca3af' }} />
            </button>
          ))}
        </div>

        {/* Format panel for selected note/comment/text */}
        {showFormatPanel && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-2" />

            {/* Font size dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowColors(showColors === 'fontSize' ? false : 'fontSize')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                title="Font size"
              >
                <span>{selectedShape.fontSize || 16}px</span>
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showColors === 'fontSize' && (
                <div className="absolute top-full left-0 mt-1 py-1 bg-white rounded-lg shadow-lg border z-20 min-w-[80px]">
                  {FONT_SIZES.map(size => (
                    <button
                      key={size}
                      onClick={() => {
                        updateSelectedStyle({ fontSize: size });
                        setShowColors(false);
                      }}
                      className={`w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 transition-colors ${
                        (selectedShape.fontSize || 16) === size ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Font family dropdown */}
            <div className="relative ml-1">
              <button
                onClick={() => setShowColors(showColors === 'font' ? false : 'font')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors min-w-[90px]"
                title="Font"
              >
                <span className="truncate">{FONTS.find(f => f.value === (selectedShape.fontFamily || 'Inter, sans-serif'))?.label || 'Inter'}</span>
                <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
              </button>
              {showColors === 'font' && (
                <div className="absolute top-full left-0 mt-1 py-1 bg-white rounded-lg shadow-lg border z-20 min-w-[120px]">
                  {FONTS.map(font => (
                    <button
                      key={font.value}
                      onClick={() => {
                        updateSelectedStyle({ fontFamily: font.value });
                        setShowColors(false);
                      }}
                      className={`w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 transition-colors ${
                        (selectedShape.fontFamily || 'Inter, sans-serif') === font.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                      style={{ fontFamily: font.value }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Text color */}
            <div className="relative ml-1">
              <button
                onClick={() => setShowColors(showColors === 'text' ? false : 'text')}
                className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-colors"
                title="Text color"
              >
                <span className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: selectedShape.fill || selectedShape.textColor || '#1a1a1a' }} />
                <span className="text-gray-600 font-medium">A</span>
              </button>
              {showColors === 'text' && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border flex gap-1 z-20">
                  {COLORS.filter(c => c !== '#ffffff').map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        if (selectedShape.type === 'text') {
                          updateSelectedStyle({ fill: c });
                        } else {
                          updateSelectedStyle({ textColor: c });
                        }
                        setShowColors(false);
                      }}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: '#d1d5db' }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Text style buttons */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => {
                  const current = selectedShape.fontStyle || 'normal';
                  const isBold = current.includes('bold');
                  const isItalic = current.includes('italic');
                  const newStyle = isBold
                    ? (isItalic ? 'italic' : 'normal')
                    : (isItalic ? 'bold italic' : 'bold');
                  updateSelectedStyle({ fontStyle: newStyle });
                }}
                className={`p-1.5 rounded transition-colors ${
                  (selectedShape.fontStyle || '').includes('bold')
                    ? 'bg-blue-100 text-blue-600'
                    : 'hover:bg-gray-200 text-gray-600'
                }`}
                title="Bold"
              >
                <Bold size={16} />
              </button>
              <button
                onClick={() => {
                  const current = selectedShape.fontStyle || 'normal';
                  const isBold = current.includes('bold');
                  const isItalic = current.includes('italic');
                  const newStyle = isItalic
                    ? (isBold ? 'bold' : 'normal')
                    : (isBold ? 'bold italic' : 'italic');
                  updateSelectedStyle({ fontStyle: newStyle });
                }}
                className={`p-1.5 rounded transition-colors ${
                  (selectedShape.fontStyle || '').includes('italic')
                    ? 'bg-blue-100 text-blue-600'
                    : 'hover:bg-gray-200 text-gray-600'
                }`}
                title="Italic"
              >
                <Italic size={16} />
              </button>
              <button
                onClick={() => {
                  const current = selectedShape.textDecoration || '';
                  const hasUnderline = current.includes('underline');
                  const hasStrike = current.includes('line-through');
                  const newDeco = hasUnderline
                    ? (hasStrike ? 'line-through' : '')
                    : (hasStrike ? 'underline line-through' : 'underline');
                  updateSelectedStyle({ textDecoration: newDeco });
                }}
                className={`p-1.5 rounded transition-colors ${
                  (selectedShape.textDecoration || '').includes('underline')
                    ? 'bg-blue-100 text-blue-600'
                    : 'hover:bg-gray-200 text-gray-600'
                }`}
                title="Underline"
              >
                <Underline size={16} />
              </button>
              <button
                onClick={() => {
                  const current = selectedShape.textDecoration || '';
                  const hasUnderline = current.includes('underline');
                  const hasStrike = current.includes('line-through');
                  const newDeco = hasStrike
                    ? (hasUnderline ? 'underline' : '')
                    : (hasUnderline ? 'underline line-through' : 'line-through');
                  updateSelectedStyle({ textDecoration: newDeco });
                }}
                className={`p-1.5 rounded transition-colors ${
                  (selectedShape.textDecoration || '').includes('line-through')
                    ? 'bg-blue-100 text-blue-600'
                    : 'hover:bg-gray-200 text-gray-600'
                }`}
                title="Strikethrough"
              >
                <Strikethrough size={16} />
              </button>
            </div>
          </>
        )}

        {/* Shape format panel */}
        {showShapePanel && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-2" />

            {/* Fill color */}
            <div className="relative">
              <button
                onClick={() => setShowColors(showColors === 'fill' ? false : 'fill')}
                className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-colors"
                title="Fill color"
              >
                <span
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: selectedShape.fill === 'transparent' ? '#fff' : (selectedShape.fill || '#fff') }}
                >
                  {(selectedShape.fill === 'transparent' || !selectedShape.fill) && (
                    <svg viewBox="0 0 16 16" className="w-full h-full text-red-500">
                      <line x1="0" y1="16" x2="16" y2="0" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  )}
                </span>
                <span className="text-gray-600 text-xs">Fill</span>
              </button>
              {showColors === 'fill' && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border z-20 flex gap-1">
                  <button
                    onClick={() => {
                      updateSelectedStyle({ fill: 'transparent' });
                      setShowColors(false);
                    }}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-transform hover:scale-110 ${
                      selectedShape.fill === 'transparent' ? 'border-blue-500' : 'border-gray-300'
                    }`}
                    title="No fill"
                  >
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-red-500">
                      <line x1="0" y1="16" x2="16" y2="0" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        updateSelectedStyle({ fill: c });
                        setShowColors(false);
                      }}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: selectedShape.fill === c ? '#3b82f6' : '#d1d5db' }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Stroke color */}
            <div className="relative ml-1">
              <button
                onClick={() => setShowColors(showColors === 'stroke' ? false : 'stroke')}
                className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-colors"
                title="Stroke color"
              >
                <span
                  className="w-4 h-4 rounded border-2"
                  style={{ borderColor: selectedShape.stroke || '#000', backgroundColor: 'transparent' }}
                />
                <span className="text-gray-600 text-xs">Stroke</span>
              </button>
              {showColors === 'stroke' && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border z-20 flex gap-1">
                  {COLORS.filter(c => c !== '#ffffff').map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        updateSelectedStyle({ stroke: c });
                        setShowColors(false);
                      }}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: selectedShape.stroke === c ? '#3b82f6' : '#d1d5db' }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Stroke width */}
            <div className="flex items-center gap-1 ml-2">
              {[1, 2, 4, 6, 8].map((w) => (
                <button
                  key={w}
                  onClick={() => updateSelectedStyle({ strokeWidth: w })}
                  title={`${w}px`}
                  className={`p-1.5 rounded transition-colors ${
                    (selectedShape.strokeWidth || 2) === w ? 'bg-blue-100' : 'hover:bg-gray-200'
                  }`}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: Math.max(w + 2, 6),
                      height: Math.max(w + 2, 6),
                      backgroundColor: (selectedShape.strokeWidth || 2) === w ? '#3b82f6' : '#9ca3af'
                    }}
                  />
                </button>
              ))}
            </div>
          </>
        )}

        {/* Layer controls - show for any selected shape */}
        {selectedIds.length === 1 && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-2" />
            <div className="flex items-center gap-0.5">
              <button
                onClick={bringToFront}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                title="Bring to Front"
              >
                <ArrowUpToLine size={16} />
              </button>
              <button
                onClick={bringForward}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                title="Bring Forward"
              >
                <ArrowUp size={16} />
              </button>
              <button
                onClick={sendBackward}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                title="Send Backward"
              >
                <ArrowDown size={16} />
              </button>
              <button
                onClick={sendToBack}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                title="Send to Back"
              >
                <ArrowDownToLine size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        style={{
          background: '#f8f9fa',
          backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
          backgroundSize: `${20 * stageScale}px ${20 * stageScale}px`,
          backgroundPosition: `${stagePosition.x}px ${stagePosition.y}px`,
          cursor: isSpacePressed || isPanning ? 'grab' : (isPanning ? 'grabbing' : 'default'),
        }}
      >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePosition.x}
          y={stagePosition.y}
          onWheel={handleWheel}
          onMouseDown={handleStageMouseDown}
          onMousemove={handleStageMouseMove}
          onMouseup={handleStageMouseUp}
          onTouchStart={handleStageMouseDown}
          onTouchMove={handleStageMouseMove}
          onTouchEnd={handleStageMouseUp}
        >
          <Layer>
            {/* Render all shapes */}
            {shapes.map((shape) => {
              if (shape.type === 'note') {
                return (
                  <StickyNoteShape
                    key={shape.id}
                    shapeProps={shape}
                    isSelected={selectedIds.includes(shape.id)}
                    isEditing={shape.id === editingId}
                    onSelect={() => {
                      setSelectedIds([shape.id]);
                      setTool('select');
                    }}
                    onChange={(newAttrs) => handleChange(shape.id, newAttrs)}
                    onEdit={() => handleShapeDblClick(shape.id, 'note')}
                  />
                );
              }
              if (shape.type === 'comment') {
                return (
                  <CommentShape
                    key={shape.id}
                    shapeProps={shape}
                    isSelected={selectedIds.includes(shape.id)}
                    isEditing={shape.id === editingId}
                    onSelect={() => {
                      setSelectedIds([shape.id]);
                      setTool('select');
                    }}
                    onChange={(newAttrs) => handleChange(shape.id, newAttrs)}
                    onEdit={() => handleShapeDblClick(shape.id, 'comment')}
                  />
                );
              }
              if (shape.type === 'text') {
                return (
                  <EditableText
                    key={shape.id}
                    shapeProps={shape}
                    isSelected={selectedIds.includes(shape.id)}
                    onSelect={() => {
                      setSelectedIds([shape.id]);
                      setTool('select');
                    }}
                    onChange={(newAttrs) => handleChange(shape.id, newAttrs)}
                    stageRef={stageRef}
                  />
                );
              }
              if (shape.type === 'rect') {
                return (
                  <TransformableRect
                    key={shape.id}
                    shapeProps={shape}
                    isSelected={selectedIds.includes(shape.id)}
                    onSelect={() => {
                      setSelectedIds([shape.id]);
                      setTool('select');
                    }}
                    onChange={(newAttrs) => handleChange(shape.id, newAttrs)}
                  />
                );
              }
              if (shape.type === 'circle') {
                return (
                  <TransformableCircle
                    key={shape.id}
                    shapeProps={shape}
                    isSelected={selectedIds.includes(shape.id)}
                    onSelect={() => {
                      setSelectedIds([shape.id]);
                      setTool('select');
                    }}
                    onChange={(newAttrs) => handleChange(shape.id, newAttrs)}
                  />
                );
              }
              if (shape.type === 'line') {
                return (
                  <TransformableLine
                    key={shape.id}
                    shapeProps={shape}
                    isSelected={selectedIds.includes(shape.id)}
                    onSelect={() => {
                      setSelectedIds([shape.id]);
                      setTool('select');
                    }}
                    onChange={(newAttrs) => handleChange(shape.id, newAttrs)}
                  />
                );
              }
              return null;
            })}
            {/* Current drawing line */}
            {currentLine && (
              <Line
                points={currentLine.points}
                stroke={currentLine.stroke}
                strokeWidth={currentLine.strokeWidth}
                lineCap="round"
                lineJoin="round"
                tension={0.5}
              />
            )}
            {/* Selection rectangle */}
            {selectionRect && (
              <Rect
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="#3b82f6"
                strokeWidth={1}
                dash={[4, 4]}
              />
            )}
          </Layer>
        </Stage>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
          <button
            onClick={zoomOut}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 text-lg font-medium"
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={resetZoom}
            className="px-2 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 text-sm font-medium min-w-[60px]"
            title="Reset Zoom"
          >
            {Math.round(stageScale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 text-lg font-medium"
            title="Zoom In"
          >
            +
          </button>
        </div>

        {/* Pan mode indicator */}
        {isSpacePressed && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm">
            Drag to pan
          </div>
        )}
      </div>
    </div>
  );
}
