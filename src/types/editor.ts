export type EditorMode = 'SOURCE' | 'LIVE_EDIT' | 'PREVIEW';

export interface EditorState {
  content: string;
  mode: EditorMode;
}
