export type MockSession = {
  email: string;
  name: string;
  workspace: string;
  token: string;
  provider: "password" | "sso";
  createdAt: string;
};

const SESSION_KEY = "askdata-auth:v1";

function parseSession(value: string | null): MockSession | null {
  if (!value) {
    return null;
  }

  try {
    const session = JSON.parse(value) as Partial<MockSession>;
    if (
      typeof session.email !== "string" ||
      typeof session.name !== "string" ||
      typeof session.workspace !== "string" ||
      typeof session.token !== "string"
    ) {
      return null;
    }

    return {
      email: session.email,
      name: session.name,
      workspace: session.workspace,
      token: session.token,
      provider: session.provider === "sso" ? "sso" : "password",
      createdAt: typeof session.createdAt === "string" ? session.createdAt : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export function loadMockSession(): MockSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return parseSession(window.localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function saveMockSession(session: Omit<MockSession, "createdAt">) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        email: session.email,
        name: session.name,
        workspace: session.workspace,
        token: session.token,
        provider: session.provider,
        createdAt: new Date().toISOString()
      })
    );
  } catch {
    // localStorage can be disabled or full; the app still works without a saved demo session.
  }
}

export function clearMockSession() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function getAuthHeaders(): Record<string, string> {
  const session = loadMockSession();
  if (!session) {
    return {};
  }

  return {
    Authorization: `Bearer ${session.token}`
  };
}
