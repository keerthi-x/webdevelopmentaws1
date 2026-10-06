export function errorMessage(err: unknown, fallback = "Something went wrong. Try again.") {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: unknown }).message ?? "");
    if (message === "Unauthorized") {
      return "Sign in with your campus account to continue.";
    }
    if (message) return message;
  }
  return fallback;
}
