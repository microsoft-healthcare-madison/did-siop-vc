export let serverBase = process.env.SERVER_BASE || 'relative';
if (serverBase === 'relative') {
    serverBase = window.location.origin + '/api';
}
export const resolveUrl = `${serverBase}/did/`;
export const ALLOW_INVALID_SIGNATURES=false;

console.log('SERVER base', process.env, process.env.SERVER_BASE, serverBase);
