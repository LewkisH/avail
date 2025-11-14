import { NextRequest } from "next/server";

// Extract the Clerk frontend API URL from the publishable key
function getClerkFrontendApi() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set");
  }
  
  // Extract the instance identifier from the key (e.g., pk_test_xxx -> xxx.clerk.accounts.dev)
  const parts = publishableKey.split("_");
  if (parts.length < 3) {
    throw new Error("Invalid Clerk publishable key format");
  }
  
  // Decode the base64 part to get the domain
  const encoded = parts[2];
  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  
  return `https://${decoded}`;
}

async function handleRequest(request: NextRequest, params: { path: string[] }) {
  const path = params.path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const clerkBaseUrl = getClerkFrontendApi();
  const clerkUrl = `${clerkBaseUrl}/${path}${searchParams ? `?${searchParams}` : ""}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // Skip host header as it should be set to Clerk's domain
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });

  const response = await fetch(clerkUrl, {
    method: request.method,
    headers,
    body: request.body,
    // @ts-ignore - duplex is needed for streaming
    duplex: "half",
  });

  const responseHeaders = new Headers(response.headers);
  // Ensure CORS headers are set
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  responseHeaders.set("Access-Control-Allow-Headers", "*");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params);
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
