// MEGA64 — Entry-Point für TipTap-Bundle
// Exports werden als window.TipTapBundle.* verfügbar (esbuild IIFE-Format).
// Build via: node scripts/build-editor-bundle.js
// Output: lib/editor-tiptap-bundle.js (DSGVO-konform lokal)

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import FloatingMenu from '@tiptap/extension-floating-menu';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Suggestion from '@tiptap/suggestion';
import Mention from '@tiptap/extension-mention';
import commandScore from 'command-score';
import { computePosition, autoUpdate, offset, flip, shift, arrow } from '@floating-ui/dom';

// Mark + Node-Builder aus @tiptap/core für Custom-Extensions
import { Mark, Node, mergeAttributes } from '@tiptap/core';

export {
  // Editor-Core
  Editor,
  Mark,
  Node,
  mergeAttributes,

  // Extensions
  StarterKit,
  BubbleMenu,
  FloatingMenu,
  Table,
  TableRow,
  TableCell,
  TableHeader,
  Image,
  Link,
  Placeholder,
  CharacterCount,
  Highlight,
  TextAlign,
  Underline,
  TextStyle,
  Suggestion,
  Mention,
  commandScore,

  // Floating-UI
  computePosition,
  autoUpdate,
  offset,
  flip,
  shift,
  arrow
};
