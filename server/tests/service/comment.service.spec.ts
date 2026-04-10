import { describe, it, expect, vi, afterEach } from "vitest";
import * as commentService from "../../src/services/comment.service.ts";
import * as userService from "../../src/services/user.service.ts";
import * as mongooseModels from "../../src/mongoose-models.ts";

const mockSafeUser = { userId: "u1", username: "alice", display: "Alice", createdAt: new Date() };

describe("comment.service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("populateCommentInfo", () => {
    it("should throw when comment doc is not found", async () => {
      vi.spyOn(mongooseModels.CommentModel, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as never);

      await expect(commentService.populateCommentInfo("missing-id")).rejects.toThrow(
        "Failed to find comment missing-id",
      );
    });

    it("should return comment with editedAt when present", async () => {
      const editedAt = "2026-04-05T10:00:00.000Z";
      vi.spyOn(mongooseModels.CommentModel, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          text: "edited comment",
          createdAt: "2026-04-01T00:00:00.000Z",
          createdBy: "u1",
          editedAt,
          score: 5,
        }),
      } as never);
      vi.spyOn(userService, "populateSafeUserInfo").mockResolvedValue(mockSafeUser as never);

      const result = await commentService.populateCommentInfo("c1");

      expect(result.editedAt).toEqual(new Date(editedAt));
    });

    it("should default score to 0 when score is undefined", async () => {
      vi.spyOn(mongooseModels.CommentModel, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          text: "no score",
          createdAt: "2026-04-01T00:00:00.000Z",
          createdBy: "u1",
          editedAt: undefined,
          score: undefined,
        }),
      } as never);
      vi.spyOn(userService, "populateSafeUserInfo").mockResolvedValue(mockSafeUser as never);

      const result = await commentService.populateCommentInfo("c1");

      expect(result.score).toBe(0);
    });

    it("should return userVoted as null when no requestingUserId provided", async () => {
      vi.spyOn(mongooseModels.CommentModel, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          text: "a comment",
          createdAt: "2026-04-01T00:00:00.000Z",
          createdBy: "u1",
          editedAt: undefined,
          score: 3,
        }),
      } as never);
      vi.spyOn(userService, "populateSafeUserInfo").mockResolvedValue(mockSafeUser as never);

      const result = await commentService.populateCommentInfo("c1");

      expect(result.userVoted).toBeNull();
    });
  });

  describe("castVote — toggle downvote", () => {
    it("should remove a downvote and increase score when downvoting again", async () => {
      const mockCommentDoc = { score: -1, save: vi.fn().mockResolvedValue(undefined) };
      const mockVoteDoc = {
        type: "downvote",
        deleteOne: vi.fn().mockResolvedValue(undefined),
      };

      vi.spyOn(mongooseModels.CommentModel, "findById").mockResolvedValue(mockCommentDoc as never);
      vi.spyOn(mongooseModels.CommentVoteModel, "findOne").mockResolvedValue(mockVoteDoc as never);

      const result = await commentService.castVote("u1", "c1", "downvote");

      expect(result).toEqual({ success: true });
      expect(mockVoteDoc.deleteOne).toHaveBeenCalled();
      expect(mockCommentDoc.score).toBe(0); // -1 + 1 = 0
    });
  });
});
