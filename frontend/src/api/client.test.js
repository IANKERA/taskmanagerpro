import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import api, { resolveApiBaseUrl, SESSION_EXPIRED_EVENT } from "./client";

const originalAdapter = api.defaults.adapter;

function rejectWithStatus(status) {
    api.defaults.adapter = (config) => Promise.reject({
        config,
        message: `Request failed with status code ${status}`,
        response: { status, data: { message: "Request denied" }, config },
    });
}

describe("API authentication interceptor", () => {
    beforeEach(() => {
        localStorage.clear();
        window.history.replaceState({}, "", "/login");
    });

    afterEach(() => {
        api.defaults.adapter = originalAdapter;
        vi.restoreAllMocks();
    });

    it("clears the stored token and notifies auth state on 401", async () => {
        localStorage.setItem("token", "test-token");
        const onExpired = vi.fn();
        window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
        rejectWithStatus(401);

        await expect(api.get("/api/users/me")).rejects.toMatchObject({ status: 401 });

        expect(localStorage.getItem("token")).toBeNull();
        expect(onExpired).toHaveBeenCalledOnce();
        window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    });

    it("does not clear authentication or emit expiration on 403", async () => {
        localStorage.setItem("token", "test-token");
        const onExpired = vi.fn();
        window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
        rejectWithStatus(403);

        await expect(api.get("/api/admin/users")).rejects.toMatchObject({ status: 403 });

        expect(localStorage.getItem("token")).toBe("test-token");
        expect(onExpired).not.toHaveBeenCalled();
        window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    });
});

describe("API base URL selection", () => {
    it("uses same-origin API paths instead of falling back to a hosted backend", () => {
        expect(resolveApiBaseUrl(undefined)).toBe("");
    });

    it("normalizes the explicitly configured API origin", () => {
        expect(resolveApiBaseUrl(" https://backend.example.test/// "))
            .toBe("https://backend.example.test");
    });
});
