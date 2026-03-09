import { createRepo } from "./keyv.ts";
import type {
  AuthRecord,
  ChatRecord,
  CommentRecord,
  GameRecord,
  MessageRecord,
  ThreadRecord,
  UserRecord,
  UserProfileRecord,
  TitleRecord,
  UploadedImageRecord,
} from "./models.ts";

export const AuthRepo = createRepo<AuthRecord>("auth");
export const ChatRepo = createRepo<ChatRecord>("chat");
export const CommentRepo = createRepo<CommentRecord>("comment");
export const GameRepo = createRepo<GameRecord>("game");
export const MessageRepo = createRepo<MessageRecord>("message");
export const ThreadRepo = createRepo<ThreadRecord>("thread");
export const UserRepo = createRepo<UserRecord>("user");
// Added repos for profile customization
export const UserProfileRepo = createRepo<UserProfileRecord>("userProfile");
export const TitleRepo = createRepo<TitleRecord>("title");
// Added for pfp upload
export const UploadedImageRepo = createRepo<UploadedImageRecord>("uploaded_image");
