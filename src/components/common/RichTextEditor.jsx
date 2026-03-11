import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Table as TableIcon, Minus, Pilcrow,
  Heading1, Heading2, Heading3, Baseline, Plus, Trash2,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, RotateCcw,
  ScanText
} from 'lucide-react';
import BatchOcrModal from './BatchOcrModal';

const PRESET_COLORS = [
  '#000000', '#374151', '#6b7280', '#9ca3af', '#e5e7eb', '#ffffff',
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#16a34a',
  '#0284c7', '#2563eb', '#4f46e5', '#7c3aed', '#c026d3', '#db2777',
];

const STORAGE_KEY = 'editor_custom_colors';

function loadCustomColors() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveCustomColors(colors) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors.slice(0, 8)));
}

const tableToolbarPluginKey = new PluginKey('tableToolbar');

export default function RichTextEditor({ content, onChange, isDark }) {
  const colorInputRef = useRef(null);
  const [customColors, setCustomColors] = useState(loadCustomColors);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const colorPanelRef = useRef(null);
  const [inTable, setInTable] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);

  // Stable DOM element — ProseMirror decoration inserts it before the table,
  // React portal renders toolbar content into it.
  const toolbarElRef = useRef(null);
  if (!toolbarElRef.current) {
    const el = document.createElement('div');
    el.setAttribute('contenteditable', 'false');
    toolbarElRef.current = el;
  }

  const TableToolbarExtension = useMemo(() => {
    const toolbarEl = toolbarElRef.current;
    return Extension.create({
      name: 'tableToolbar',
      addProseMirrorPlugins() {
        return [
          new Plugin({
            key: tableToolbarPluginKey,
            props: {
              decorations(state) {
                const { $from } = state.selection;
                let tablePos = null;
                for (let d = $from.depth; d > 0; d--) {
                  if ($from.node(d).type.name === 'table') {
                    tablePos = $from.before(d);
                    break;
                  }
                }
                if (tablePos === null) return DecorationSet.empty;
                return DecorationSet.create(state.doc, [
                  Decoration.widget(tablePos, () => toolbarEl, {
                    side: -1,
                    key: 'table-toolbar-widget',
                  }),
                ]);
              },
            },
          }),
        ];
      },
    });
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TableToolbarExtension,
    ],
    content: content || '',
    editorProps: {
      attributes: { class: 'rich-editor focus:outline-none' },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', false);
    }
  }, [content]);

  useEffect(() => {
    if (!editor) return;
    const update = () => setInTable(editor.isActive('table'));
    editor.on('selectionUpdate', update);
    return () => editor.off('selectionUpdate', update);
  }, [editor]);

  // Close color panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (colorPanelRef.current && !colorPanelRef.current.contains(e.target)) {
        setShowColorPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!editor) return null;

  const applyColor = (color) => {
    editor.chain().focus().setColor(color).run();
    setShowColorPanel(false);
    if (!PRESET_COLORS.includes(color)) {
      const updated = [color, ...customColors.filter(c => c !== color)];
      setCustomColors(updated);
      saveCustomColors(updated);
    }
  };

  const handleOcrInsert = (html) => {
    if (html && editor) {
      editor.chain().focus().insertContent(html).run();
    }
  };

  const btn = (active, onClick, title, children) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded-lg transition-colors ${
        active
          ? 'bg-pink-vibrant text-white'
          : isDark
            ? 'text-white/60 hover:text-white hover:bg-white/10'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );

  const tbtn = (onClick, title, children, danger = false) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
        danger
          ? isDark ? 'text-red-400 hover:bg-red-500/20' : 'text-red-500 hover:bg-red-50'
          : isDark ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );

  const divider = () => (
    <span className={`w-px h-5 self-center mx-0.5 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
  );

  const sep = <span className={`w-px h-4 self-center mx-0.5 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />;
  const currentColor = editor.getAttributes('textStyle').color;

  return (
    <div className={`rounded-xl border overflow-visible ${
      isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-white'
    }`}>
      {/* Main toolbar */}
      <div className={`flex flex-wrap items-center gap-0.5 p-2 border-b ${
        isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'
      }`}>
        {btn(!editor.isActive('heading'), () => editor.chain().focus().setParagraph().run(), 'Paragraph', <Pilcrow size={16} />)}
        {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', <Heading1 size={16} />)}
        {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', <Heading2 size={16} />)}
        {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', <Heading3 size={16} />)}

        {divider()}

        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Bold', <Bold size={16} />)}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Italic', <Italic size={16} />)}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'Underline', <UnderlineIcon size={16} />)}
        {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'Strike', <Strikethrough size={16} />)}

        {divider()}

        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Bullet List', <List size={16} />)}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Numbered List', <ListOrdered size={16} />)}
        {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), 'Blockquote', <Quote size={16} />)}

        {divider()}

        {/* Color picker */}
        <div className="relative" ref={colorPanelRef}>
          <button
            type="button"
            title="Text color"
            onMouseDown={e => { e.preventDefault(); setShowColorPanel(v => !v); }}
            className={`flex items-center gap-1 p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Baseline size={16} />
            <span
              className="w-4 h-1.5 rounded-sm border border-white/20"
              style={{ background: currentColor || (isDark ? '#fff' : '#000') }}
            />
          </button>

          {showColorPanel && (
            <div className={`absolute left-0 top-full mt-1 z-50 p-3 rounded-xl shadow-xl border w-[212px] ${
              isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-white border-gray-200'
            }`}>
              <div className="grid grid-cols-6 gap-1.5 mb-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onMouseDown={e => { e.preventDefault(); applyColor(c); }}
                    className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110"
                    style={{
                      background: c,
                      borderColor: currentColor === c ? '#ec4899' : c === '#ffffff' ? '#d1d5db' : 'transparent',
                    }}
                  />
                ))}
              </div>

              {customColors.length > 0 && (
                <>
                  <div className={`text-xs font-medium mb-1.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Recent</div>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {customColors.map(c => (
                      <button
                        key={c}
                        type="button"
                        title={c}
                        onMouseDown={e => { e.preventDefault(); applyColor(c); }}
                        className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110"
                        style={{
                          background: c,
                          borderColor: currentColor === c ? '#ec4899' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); colorInputRef.current?.click(); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium flex-1 ${
                    isDark ? 'bg-white/[0.05] text-white/70 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Plus size={12} /> Custom color
                </button>
                {currentColor && (
                  <button
                    type="button"
                    title="Remove color"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetColor().run(); setShowColorPanel(false); }}
                    className={`p-1.5 rounded-lg text-xs ${isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-gray-100 text-gray-400'}`}
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
              <input
                ref={colorInputRef}
                type="color"
                className="absolute opacity-0 w-0 h-0"
                defaultValue={currentColor || '#000000'}
                onChange={e => applyColor(e.target.value)}
              />
            </div>
          )}
        </div>

        {divider()}

        {btn(false, () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), 'Insert Table', <TableIcon size={16} />)}
        {btn(false, () => editor.chain().focus().setHorizontalRule().run(), 'Horizontal Rule', <Minus size={16} />)}

        {divider()}

        <button
          type="button"
          title="OCR: scan images to text"
          onClick={() => setShowOcrModal(true)}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isDark
              ? 'text-white/60 hover:text-white hover:bg-white/10'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <ScanText size={14} />
          <span>OCR</span>
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className={`rich-editor-wrap ${isDark ? 'dark' : 'light'}`} />

      {/* Table toolbar — rendered via React portal into toolbarElRef.current,
          which ProseMirror's Decoration.widget inserts directly before the active table */}
      {inTable && createPortal(
        <div className={`flex items-center gap-1 px-3 py-1.5 mb-1 rounded-lg border text-xs ${
          isDark ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-gray-50'
        }`}>
          {tbtn(() => editor.chain().focus().addRowBefore().run(), 'Add row above', <><ChevronUp size={12} /><span>Row above</span></>)}
          {tbtn(() => editor.chain().focus().addRowAfter().run(), 'Add row below', <><ChevronDown size={12} /><span>Row below</span></>)}
          {tbtn(() => editor.chain().focus().deleteRow().run(), 'Delete row', <><Trash2 size={12} /><span>Del row</span></>, true)}
          {sep}
          {tbtn(() => editor.chain().focus().addColumnBefore().run(), 'Add col left', <><ChevronLeft size={12} /><span>Col left</span></>)}
          {tbtn(() => editor.chain().focus().addColumnAfter().run(), 'Add col right', <><ChevronRight size={12} /><span>Col right</span></>)}
          {tbtn(() => editor.chain().focus().deleteColumn().run(), 'Delete col', <><Trash2 size={12} /><span>Del col</span></>, true)}
          {sep}
          {tbtn(() => editor.chain().focus().deleteTable().run(), 'Delete table', <><Trash2 size={12} /><span>Delete table</span></>, true)}
        </div>,
        toolbarElRef.current
      )}

      {showOcrModal && (
        <BatchOcrModal
          isDark={isDark}
          onInsert={handleOcrInsert}
          onClose={() => setShowOcrModal(false)}
        />
      )}

      <style>{`
        .rich-editor-wrap .rich-editor {
          min-height: 220px;
          padding: 16px;
          color: ${isDark ? 'rgba(255,255,255,0.85)' : '#1e293b'};
          font-size: 15px;
          line-height: 1.7;
        }
        .rich-editor-wrap .rich-editor p { margin: 0 0 0.75em; }
        .rich-editor-wrap .rich-editor p:last-of-type { margin-bottom: 0; }
        .rich-editor-wrap .rich-editor h1 { font-size: 1.75em; font-weight: 700; margin: 0.5em 0; }
        .rich-editor-wrap .rich-editor h2 { font-size: 1.35em; font-weight: 600; margin: 0.5em 0; }
        .rich-editor-wrap .rich-editor h3 { font-size: 1.1em; font-weight: 600; margin: 0.5em 0; }
        .rich-editor-wrap .rich-editor ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
        .rich-editor-wrap .rich-editor ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        .rich-editor-wrap .rich-editor li { margin: 0.25em 0; }
        .rich-editor-wrap .rich-editor blockquote {
          border-left: 3px solid ${isDark ? 'rgba(139,92,246,0.6)' : '#8b5cf6'};
          padding: 0.4em 0 0.4em 1em;
          margin: 0.75em 0;
          background: ${isDark ? 'rgba(139,92,246,0.08)' : '#f5f3ff'};
          border-radius: 0 8px 8px 0;
        }
        .rich-editor-wrap .rich-editor hr { border: none; border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}; margin: 1em 0; }
        .rich-editor-wrap .rich-editor table { border-collapse: collapse; width: 100%; margin: 0.75em 0; table-layout: fixed; }
        .rich-editor-wrap .rich-editor th,
        .rich-editor-wrap .rich-editor td {
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'};
          padding: 6px 10px;
          text-align: left;
          position: relative;
          vertical-align: top;
          min-width: 40px;
          overflow: hidden;
        }
        .rich-editor-wrap .rich-editor th {
          background: ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
          font-weight: 600;
        }
        .rich-editor-wrap .rich-editor .selectedCell {
          background: ${isDark ? 'rgba(236,72,153,0.15)' : 'rgba(236,72,153,0.08)'};
        }
        .rich-editor-wrap .rich-editor .column-resize-handle {
          position: absolute;
          right: 0;
          top: 0;
          height: 9999px;
          width: 4px;
          background: #ec4899;
          cursor: col-resize;
          z-index: 20;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .rich-editor-wrap .rich-editor td:hover .column-resize-handle,
        .rich-editor-wrap .rich-editor th:hover .column-resize-handle {
          opacity: 1;
        }
        .rich-editor-wrap .rich-editor.resize-cursor,
        .rich-editor-wrap .rich-editor.resize-cursor * { cursor: col-resize !important; }
        .rich-editor-wrap .rich-editor .tableWrapper { overflow: hidden; }
      `}</style>
    </div>
  );
}
