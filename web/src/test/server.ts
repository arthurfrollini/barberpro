import { setupServer } from 'msw/node';
import { api, gqlData } from './graphql';

/**
 * Tests declare the API responses they need. The one default is what every signed-in screen
 * asks for in its header: the unread notification count.
 */
export const server = setupServer(
  api.query('UnreadNotificationCount', () => gqlData({ unreadNotificationCount: 0 })),
);
