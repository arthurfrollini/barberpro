// Ports for the stack Playwright starts; they differ from dev and from the dashboard's suite,
// so a dev server and the other suite can keep running.
export const API_PORT = 4200;
export const APP_PORT = 8090;
export const API = { url: `http://localhost:${API_PORT}` };
