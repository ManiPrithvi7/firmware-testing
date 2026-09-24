export function safeError(error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://…");
}
