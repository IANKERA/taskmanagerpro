const GENERIC_MESSAGE_KEYS = ["error", "title"];
const COLLECTION_KEYS = ["errors", "validationErrors", "violations", "fieldErrors", "messages"];

function collectMessages(value) {
    if (typeof value === "string") {
        const message = value.trim();
        return message ? [message] : [];
    }

    if (Array.isArray(value)) {
        return value.flatMap(collectMessages);
    }

    if (!value || typeof value !== "object") {
        return [];
    }

    if (typeof value.detail === "string") {
        return collectMessages(value.detail);
    }

    for (const key of ["defaultMessage", "reason"]) {
        if (typeof value[key] === "string") {
            return collectMessages(value[key]);
        }
    }

    const validationMessages = COLLECTION_KEYS.flatMap((key) =>
        value[key] === undefined ? [] : collectMessages(value[key])
    );
    if (validationMessages.length > 0) {
        return validationMessages;
    }

    if (typeof value.message === "string") {
        return collectMessages(value.message);
    }

    const genericMessages = GENERIC_MESSAGE_KEYS.flatMap((key) =>
        typeof value[key] === "string" ? collectMessages(value[key]) : []
    );
    if (genericMessages.length > 0) {
        return genericMessages;
    }

    return Object.values(value).flatMap((entry) => {
        if (typeof entry === "string" || Array.isArray(entry) || (entry && typeof entry === "object")) {
            return collectMessages(entry);
        }
        return [];
    });
}

function uniqueMessages(messages) {
    return [...new Set(messages)];
}

export function formatApiError(error, fallback = "Request failed. Please try again.") {
    const response = error?.response;
    const data = response?.data ?? error?.data;
    const status = response?.status ?? error?.status;
    if (typeof status === "number" && status >= 500) {
        return "The server could not complete the request. Please try again later.";
    }
    const messages = uniqueMessages(collectMessages(data));
    const responseMessage = messages.join("; ");
    const rawErrorMessage = typeof error === "string"
        ? error.trim()
        : typeof error?.message === "string"
            ? error.message.trim()
            : "";
    const errorMessage = rawErrorMessage === "[object Object]" ? "" : rawErrorMessage;
    const message = responseMessage || errorMessage;

    if (status === 404 && message && /\buser not found\b/i.test(message)) {
        return "User not found. The user must register before being added to this project.";
    }

    if (
        status === 403 &&
        (!message || /^(forbidden|access denied|request failed with status code 403)$/i.test(message))
    ) {
        return "You do not have permission to manage members for this project.";
    }

    if (status === 404 && !message) {
        return "The requested resource was not found.";
    }

    if (
        !response &&
        !status &&
        (error?.isAxiosError ||
            error?.code === "ERR_NETWORK" ||
            /^(network error|failed to fetch)$/i.test(errorMessage || ""))
    ) {
        return "Unable to connect to the server. Check your connection and try again.";
    }

    return message || fallback;
}
