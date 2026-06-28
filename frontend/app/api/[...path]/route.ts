import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

type RouteContext = {
  params: {
    path?: string[];
  };
};

type StreamingRequestInit = RequestInit & {
  duplex?: "half";
};

function getBackendBaseUrl() {
  return (process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, "");
}

function getTargetUrl(request: NextRequest, context: RouteContext) {
  const path = context.params.path?.join("/") ?? "";
  const target = new URL(`/api/${path}`, getBackendBaseUrl());
  target.search = request.nextUrl.search;
  return target;
}

function getForwardHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", request.nextUrl.host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
  headers.delete("host");

  return headers;
}

function getResponseHeaders(response: Response) {
  const headers = new Headers(response.headers);
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
  return headers;
}

async function proxy(request: NextRequest, context: RouteContext) {
  const init: StreamingRequestInit = {
    method: request.method,
    headers: getForwardHeaders(request),
    redirect: "manual",
    cache: "no-store"
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  const response = await fetch(getTargetUrl(request, context), init);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: getResponseHeaders(response)
  });
}

export {
  proxy as DELETE,
  proxy as GET,
  proxy as HEAD,
  proxy as OPTIONS,
  proxy as PATCH,
  proxy as POST,
  proxy as PUT
};
