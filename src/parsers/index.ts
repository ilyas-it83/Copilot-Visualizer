/**
 * Parser Registry
 * Factory for selecting the correct parser based on log source type.
 */

import { CopilotEvent, LogSource } from '../types/events';
import { CopilotSession } from '../types/session';
import { CliParser } from './cliParser';
import { ChatParser } from './chatParser';
import { InlineParser } from './inlineParser';

const cliParser = new CliParser();
const chatParser = new ChatParser();
const inlineParser = new InlineParser();

/**
 * Parse a session's log file into normalized events.
 * Selects the appropriate parser based on the session source.
 */
export async function parseSession(session: CopilotSession): Promise<CopilotEvent[]> {
  switch (session.source) {
    case 'cli':
      return parseCliSession(session);
    case 'chat':
      return chatParser.parse(session.logPath, session.id);
    case 'inline':
      return inlineParser.parse(session.logPath, session.id);
    default:
      console.warn(`[ParserRegistry] Unknown source: ${session.source}`);
      return [];
  }
}

async function parseCliSession(session: CopilotSession): Promise<CopilotEvent[]> {
  if (session.logPath.endsWith('.jsonl')) {
    return cliParser.parse(session.logPath, session.id);
  } else {
    return cliParser.parseConversation(session.logPath, session.id);
  }
}

export { CliParser, ChatParser, InlineParser };
