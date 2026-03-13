import { describe, expect, it } from "vitest";
import { updateUser } from "../../src/services/user.service.ts";

// updateUser can't be fully tested by current integration tests; part of its
// contract is that it throws if updateUser is called with an invalid user id,
// but a well-behaved controller won't ever invoke updateUser with an invalid
// user id
describe("updateUser", () => {
  it("should throw if given an invalid user id", async () => {
    await expect(updateUser("fake", { display: "Stacey Fakename" })).rejects.toThrow();
  });
});
