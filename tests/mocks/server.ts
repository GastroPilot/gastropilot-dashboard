import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server with the predefined handlers
export const server = setupServer(...handlers);
