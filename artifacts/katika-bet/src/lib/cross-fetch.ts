// Safe shim for cross-fetch to prevent "Cannot set property fetch of #<Window> which has only a getter"
const nativeFetch =
  typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : typeof window !== 'undefined' && typeof window.fetch === 'function'
    ? window.fetch.bind(window)
    : (...args: Parameters<typeof fetch>) => fetch(...args);

const HeadersShim =
  typeof globalThis !== 'undefined' && globalThis.Headers
    ? globalThis.Headers
    : typeof window !== 'undefined'
    ? window.Headers
    : Headers;

const RequestShim =
  typeof globalThis !== 'undefined' && globalThis.Request
    ? globalThis.Request
    : typeof window !== 'undefined'
    ? window.Request
    : Request;

const ResponseShim =
  typeof globalThis !== 'undefined' && globalThis.Response
    ? globalThis.Response
    : typeof window !== 'undefined'
    ? window.Response
    : Response;

export default nativeFetch;
export const fetch = nativeFetch;
export { HeadersShim as Headers, RequestShim as Request, ResponseShim as Response };
