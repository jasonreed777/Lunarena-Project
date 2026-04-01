import type { ClanDetailInfo, ClanInfo, ClanRole } from "@gamenite/shared";
import type { ColorTheme } from "../util/types";
import React, { useState } from "react";
import * as Typography from "../libs/Typography";
import { InviteResponseButtons, CancelInviteButton } from "./ClanActionButtons";
import { Divider } from "./Divider";
import { EmptyState } from "./EmptyState";
import { FriendPill } from "./FriendPill";
import { InputWithLabel } from "./Input";
import { TranslucentButton as Button } from "./Buttons";
import { inviteUser, transferOwnership, updateClan } from "../services/clanService";
import useClanInvites from "../hooks/useClanInvites";

/**
 * Modal that appears for users to manage their clan.
 *
 * @param theme Color theme of GameNite
 * @param setShowManage fires to hide the modal.
 * @param clan Clan info to display
 * @param role User's role in the clan
 * @param handleActionComplete runs after the user completes an action.
 * @param clanDetail Clan detail info as rendered in the clan page
 * @param refetchKey key to help refetch the clan and associated information
 *
 * @returns modal that allows an admin/owner to manage a clan
 */
const ManageClanModal: React.FC<{
  theme: ColorTheme;
  setShowManage: React.Dispatch<React.SetStateAction<boolean>>;
  clan: ClanInfo;
  role: ClanRole;
  handleActionComplete: () => void;
  clanDetail: ClanDetailInfo | null;
  refetchKey: number;
}> = ({ theme, setShowManage, clan, role, handleActionComplete, clanDetail, refetchKey }) => {
  const clanInvites = useClanInvites(clan.clanId, refetchKey);

  // Transfer ownership form
  const [transferUsername, setTransferUsername] = useState("");
  const [transferError, setTransferError] = useState("");

  const [settingsInitialized, setSettingsInitialized] = useState(false);

  // Invite user form
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Clan settings form
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editError, setEditError] = useState("");

  const handleUpdateClan = async () => {
    if (!clan.clanId) return;
    setEditError("");
    const result = await updateClan(clan.clanId, {
      name: editName,
      bio: editBio,
      color: editColor,
      isPublic: editIsPublic,
    });
    if ("error" in result) {
      setEditError(result.error);
      return;
    }
    setSettingsInitialized(false);
    handleActionComplete();
  };

  const handleTransfer = async () => {
    if (!clan.clanId || !transferUsername.trim()) return;
    if (!window.confirm(`Transfer ownership to ${transferUsername}? This cannot be undone.`))
      return;
    setTransferError("");
    const result = await transferOwnership(clan.clanId, transferUsername.trim());
    if ("error" in result) {
      setTransferError(result.error);
      return;
    }
    setTransferUsername("");
    handleActionComplete();
  };

  const handleInviteUser = async () => {
    if (!clan.clanId || !inviteUsername.trim()) return;
    setInviteError("");
    setInviteSuccess("");
    const result = await inviteUser(clan.clanId, inviteUsername.trim());
    if ("error" in result) {
      setInviteError(result.error);
      return;
    }
    setInviteSuccess(`Invited ${inviteUsername}`);
    setInviteUsername("");
    handleActionComplete();
  };

  React.useEffect(() => {
    // Pre-fill settings form once when clan detail loads (render-time state adjustment)
    if (clanDetail && !settingsInitialized) {
      setEditName(clanDetail.name);
      setEditBio(clanDetail.bio);
      setEditColor(clanDetail.color);
      setEditIsPublic(clanDetail.isPublic);
      setSettingsInitialized(true);
    }
  }, [clanDetail, settingsInitialized]);

  return (
    <div className="manage-dialog-overlay" onClick={() => setShowManage(false)}>
      <div
        className="manage-dialog"
        style={{
          backgroundColor: theme.primary,
          color: theme.text,
          borderTop: `4px solid ${clan.color}`,
          backgroundImage: `linear-gradient(${clan.color}22, transparent 200px)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="manage-dialog-close" onClick={() => setShowManage(false)}>
          &times;
        </button>

        <Typography.PageTitle style={{ marginBottom: 20, fontSize: "1.5rem" }}>
          Manage Clan
        </Typography.PageTitle>

        {/* Invite User */}
        <div className="manage-subsection">
          <Typography.Subtitle style={{ color: theme.secondaryText }}>
            Invite User
          </Typography.Subtitle>
          <Divider color={theme.text} style={{ marginBottom: 15 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <InputWithLabel
              borderColor={theme.secondary}
              label=""
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder="Enter username to invite"
            />
            <Button color={theme.secondary} onClick={handleInviteUser}>
              Send Invite
            </Button>
            {inviteSuccess && (
              <Typography.SmallText style={{ color: "#22c55e", margin: 0 }}>
                {inviteSuccess}
              </Typography.SmallText>
            )}
            {inviteError && (
              <Typography.SmallText style={{ color: "#e01313", margin: 0 }}>
                {inviteError}
              </Typography.SmallText>
            )}
          </div>
        </div>

        {/* Pending Invites & Requests */}
        <div className="manage-subsection">
          <Typography.Subtitle style={{ color: theme.secondaryText }}>
            Pending Invites & Requests
          </Typography.Subtitle>
          <Divider color={theme.text} style={{ marginBottom: 15 }} />
          {"message" in clanInvites ? (
            <EmptyState message={clanInvites.message} themeId={theme._id} />
          ) : clanInvites.length === 0 ? (
            <EmptyState message="No pending invites or requests" themeId={theme._id} />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              {clanInvites.map((invite) => (
                <FriendPill
                  key={invite.inviteId}
                  to={`/profile/${invite.user.username}`}
                  name={invite.user.display}
                  detail={invite.type === "invite" ? "Invited" : "Requested to join"}
                  color={clan.color}
                  themeId={theme._id}
                >
                  {invite.type === "request" ? (
                    <InviteResponseButtons
                      inviteId={invite.inviteId}
                      type={invite.type}
                      compact
                      onActionComplete={handleActionComplete}
                    />
                  ) : (
                    <CancelInviteButton
                      inviteId={invite.inviteId}
                      compact
                      onActionComplete={handleActionComplete}
                    />
                  )}
                </FriendPill>
              ))}
            </div>
          )}
        </div>

        {/* Clan Settings */}
        <div className="manage-subsection">
          <Typography.Subtitle style={{ color: theme.secondaryText }}>
            Clan Settings
          </Typography.Subtitle>
          <Divider color={theme.text} style={{ marginBottom: 15 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <InputWithLabel
              borderColor={theme.secondary}
              label="Clan Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Clan name (3-32 chars)"
            />
            <InputWithLabel
              borderColor={theme.secondary}
              label="Bio"
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Describe your clan..."
            />
            <div>
              <Typography.SmallText style={{ margin: 0, marginBottom: 4, opacity: 0.7 }}>
                Color
              </Typography.SmallText>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                />
                <span style={{ fontFamily: "'filson-pro', sans-serif" }}>{editColor}</span>
              </div>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "'filson-pro', sans-serif",
              }}
            >
              <input
                type="checkbox"
                checked={editIsPublic}
                onChange={(e) => setEditIsPublic(e.target.checked)}
              />
              Public Clan
            </label>
            {editError && (
              <Typography.SmallText style={{ color: "#ff6b6b", margin: 0 }}>
                {editError}
              </Typography.SmallText>
            )}
            <Button color={theme.secondary} onClick={handleUpdateClan}>
              Save Changes
            </Button>
          </div>
        </div>

        {/* Transfer Ownership (owner only) */}
        {role === "owner" && (
          <div className="manage-subsection">
            <Typography.Subtitle style={{ color: theme.secondaryText }}>
              Transfer Ownership
            </Typography.Subtitle>
            <Divider color={theme.text} style={{ marginBottom: 15 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <InputWithLabel
                borderColor="#ef4444"
                label=""
                value={transferUsername}
                onChange={(e) => setTransferUsername(e.target.value)}
                placeholder="Enter new owner's username"
              />
              <Button color="#ef4444" onClick={handleTransfer}>
                Transfer Ownership
              </Button>
              {transferError && (
                <Typography.SmallText style={{ color: "#ff6b6b", margin: 0 }}>
                  {transferError}
                </Typography.SmallText>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default ManageClanModal;
