let snapshot;
let generation = 0;
const listeners = new Set();

export function getSessionSnapshot() {
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");

  if (snapshot && token !== snapshot.token) generation += 1;

  if (!snapshot || token !== snapshot.token || email !== snapshot.email || generation !== snapshot.generation) {
    snapshot = Object.freeze({ token, email, generation });
  }

  return snapshot;
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function handleStorage(event) {
  if (event.storageArea !== localStorage || ![null, "token", "email"].includes(event.key)) return;

  // Read the latest values: a queued event may describe an older session.
  getSessionSnapshot();
  notifyListeners();
}

export function subscribeToSession(listener) {
  if (listeners.size === 0) window.addEventListener("storage", handleStorage);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", handleStorage);
  };
}

export function establishSession(token, email) {
  getSessionSnapshot();
  localStorage.setItem("token", token);
  localStorage.setItem("email", email);
  generation += 1;
  snapshot = Object.freeze({ token: localStorage.getItem("token"), email: localStorage.getItem("email"), generation });
  notifyListeners();
}

export function clearSession() {
  getSessionSnapshot();
  localStorage.removeItem("token");
  localStorage.removeItem("email");
  generation += 1;
  snapshot = Object.freeze({ token: null, email: null, generation });
  notifyListeners();
}

export function invalidateSession(requestSession) {
  const current = getSessionSnapshot();
  if (!requestSession?.token || requestSession.token !== current.token || requestSession.generation !== current.generation) return false;

  clearSession();
  return true;
}
