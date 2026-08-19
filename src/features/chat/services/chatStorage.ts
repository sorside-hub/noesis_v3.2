import { db, ChatSessionRecord, ChatMessageRecord } from '../../../lib/db';

export async function getAllChatSessions(): Promise<ChatSessionRecord[]> {
  try {
    const sessions = await db.chat_sessions.orderBy('updatedAt').reverse().toArray();
    return sessions;
  } catch (err) {
    console.error('Failed to get chat sessions:', err);
    return [];
  }
}

export async function createChatSession(title: string = 'Percakapan Baru'): Promise<ChatSessionRecord> {
  const now = new Date().toISOString();
  const session: ChatSessionRecord = {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    createdAt: now,
    updatedAt: now,
  };

  await db.chat_sessions.add(session);
  return session;
}

export async function renameChatSession(sessionId: string, newTitle: string): Promise<void> {
  await db.chat_sessions.update(sessionId, {
    title: newTitle,
    updatedAt: new Date().toISOString(),
  });
}

export async function togglePinChatSession(sessionId: string, isPinned: boolean): Promise<void> {
  await db.chat_sessions.update(sessionId, {
    isPinned,
  });
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await db.transaction('rw', [db.chat_sessions, db.chat_messages], async () => {
    await db.chat_sessions.delete(sessionId);
    await db.chat_messages.where('sessionId').equals(sessionId).delete();
  });
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessageRecord[]> {
  try {
    const messages = await db.chat_messages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('createdAt');
    return messages;
  } catch (err) {
    console.error(`Failed to get messages for session ${sessionId}:`, err);
    return [];
  }
}

export async function saveChatMessage(msg: ChatMessageRecord): Promise<void> {
  await db.chat_messages.put(msg);
  await db.chat_sessions.update(msg.sessionId, {
    updatedAt: new Date().toISOString(),
  });
}

export async function updateChatMessage(
  id: string,
  updates: Partial<ChatMessageRecord>
): Promise<void> {
  await db.chat_messages.update(id, updates);
}
