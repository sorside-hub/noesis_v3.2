import { useState } from 'react';
import { EditorMode } from '../types/editor';

export const useEditorMode = (initialMode: EditorMode = 'LIVE_EDIT') => {
  const [mode, setMode] = useState<EditorMode>(initialMode);

  return {
    mode,
    setMode,
  };
};
