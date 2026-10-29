import { afterEach, describe, expect, it, vi } from "vitest";
import { registerRequest } from "./authApi";

describe("registerRequest", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("surfaces structured registration validation messages from the API", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: false,
            status: 400,
            text: async () => JSON.stringify({ message: "Password must contain at least one number." }),
        }));

        await expect(registerRequest("new-user", "Password!!!"))
            .rejects.toThrow("Password must contain at least one number.");
    });

    it("does not expose internal server error details", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            text: async () => JSON.stringify({ message: "database password rejected at InternalService.java:42" }),
        }));

        await expect(registerRequest("new-user", "Password123!"))
            .rejects.toThrow("Registration failed. Please try again later.");
    });
});
