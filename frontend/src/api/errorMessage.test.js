import { describe, expect, it } from "vitest";
import { formatApiError } from "./errorMessage";

describe("formatApiError", () => {
    it("formats plain string and message/error response bodies", () => {
        expect(formatApiError({ data: "Invalid request" })).toBe("Invalid request");
        expect(formatApiError({ data: { message: "Invalid request" } })).toBe("Invalid request");
        expect(formatApiError({ data: { error: "Invalid request" } })).toBe("Invalid request");
        expect(formatApiError({ response: { data: { message: "Axios error detail" } } }))
            .toBe("Axios error detail");
    });

    it("supports Axios response payloads and multiple validation errors", () => {
        expect(formatApiError({
            response: {
                status: 400,
                data: { errors: [{ defaultMessage: "Title is required" }, { message: "Role is invalid" }] },
            },
        })).toBe("Title is required; Role is invalid");
    });

    it("uses registration guidance only when the response confirms a missing user", () => {
        expect(formatApiError({
            status: 404,
            data: { detail: '404 NOT_FOUND "User not found: Giannis"' },
        })).toBe("User not found. The user must register before being added to this project.");

        expect(formatApiError({ response: { status: 404, data: { error: "Project not found" } } }))
            .toBe("Project not found");
    });

    it("shows a clear authorization message and preserves specific server details", () => {
        expect(formatApiError({ response: { status: 403, data: { error: "Forbidden" } } }))
            .toBe("You do not have permission to manage members for this project.");
        expect(formatApiError({ response: { status: 403, data: { detail: "Project admin required" } } }))
            .toBe("Project admin required");
        expect(formatApiError({ response: { status: 403 }, message: "Request failed with status code 403" }))
            .toBe("You do not have permission to manage members for this project.");
    });

    it("formats network failures and uses a safe fallback", () => {
        expect(formatApiError({ isAxiosError: true, message: "Network Error" }))
            .toBe("Unable to connect to the server. Check your connection and try again.");
        expect(formatApiError(new Error("[object Object]"), "Could not add member"))
            .toBe("Could not add member");
        expect(formatApiError({}, "Could not add member")).toBe("Could not add member");
    });
});
