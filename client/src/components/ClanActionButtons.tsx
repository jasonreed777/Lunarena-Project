import styled from "@emotion/styled";
import React, { useState } from "react";
import { hexToRGB } from "../util/utils";
import type { ClanRole, ClanInviteType } from "@gamenite/shared";
import {
  joinClan,
  kickMember,
  respondToInvite,
  cancelClanInvite,
  updateMemberRole,
} from "../services/clanService";

const COLORS = {
  accept: "#22c55e",
  reject: "#ef4444",
  join: "#22c55e",
  kick: "#ef4444",
  promote: "#22c55e",
  demote: "#f59e0b",
} as const;

const ButtonRow = styled.div<{ compact?: boolean }>`
  display: flex;
  gap: ${({ compact }) => (compact ? "6px" : "8px")};
  align-items: center;
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{ color: string; compact?: boolean; disabled?: boolean }>`
  color: white;
  background-color: rgba(
    ${({ color }) => {
      const rgb = hexToRGB(color);
      return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
    }},
    ${({ disabled }) => (disabled ? "0.1" : "0.2")}
  );
  border: ${({ compact }) => (compact ? "2px" : "3px")} solid ${({ color }) => color};
  border-bottom: ${({ compact }) => (compact ? "2px" : "4px")} solid ${({ color }) => color};
  border-radius: 8px;
  padding: ${({ compact }) => (compact ? "3px 10px" : "5px 16px")};
  font-family: "filson-pro", sans-serif;
  font-weight: 700;
  font-size: ${({ compact }) => (compact ? "13px" : "16px")};
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  transition: all 0.1s;
  white-space: nowrap;

  :hover {
    border-bottom-width: ${({ compact, disabled }) =>
      disabled ? undefined : compact ? "2px" : "3px"};
  }
`;

const ErrorText = styled.span<{ compact?: boolean }>`
  color: ${COLORS.reject};
  font-size: ${({ compact }) => (compact ? "12px" : "14px")};
  font-family: "filson-pro", sans-serif;
`;

// ── Join Clan Button ──

interface JoinClanButtonProps {
  clanId: string;
  isPublic: boolean;
  compact?: boolean;
  onActionComplete: () => void;
}

export const JoinClanButton: React.FC<JoinClanButtonProps> = ({
  clanId,
  isPublic,
  compact,
  onActionComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setLoading(true);
    setError(null);
    const result = await joinClan(clanId);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onActionComplete();
  };

  return (
    <ButtonRow compact={compact} onClick={(e) => e.stopPropagation()}>
      <ActionButton color={COLORS.join} compact={compact} disabled={loading} onClick={handleJoin}>
        {loading ? "Joining..." : isPublic ? "Join" : "Request to Join"}
      </ActionButton>
      {error && <ErrorText compact={compact}>{error}</ErrorText>}
    </ButtonRow>
  );
};

// ── Invite Response Buttons ──

interface InviteResponseButtonsProps {
  inviteId: string;
  type: ClanInviteType;
  compact?: boolean;
  onActionComplete: () => void;
}

export const InviteResponseButtons: React.FC<InviteResponseButtonsProps> = ({
  inviteId,
  type,
  compact,
  onActionComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRespond = async (action: "accept" | "reject") => {
    setLoading(true);
    setError(null);
    const result = await respondToInvite(inviteId, action);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onActionComplete();
  };

  return (
    <ButtonRow compact={compact} onClick={(e) => e.stopPropagation()}>
      <ActionButton
        color={COLORS.accept}
        compact={compact}
        disabled={loading}
        onClick={() => handleRespond("accept")}
      >
        Accept
      </ActionButton>
      <ActionButton
        color={COLORS.reject}
        compact={compact}
        disabled={loading}
        onClick={() => handleRespond("reject")}
      >
        {type === "invite" ? "Decline" : "Reject"}
      </ActionButton>
      {error && <ErrorText compact={compact}>{error}</ErrorText>}
    </ButtonRow>
  );
};

// ── Cancel Invite Button ──

interface CancelInviteButtonProps {
  inviteId: string;
  compact?: boolean;
  onActionComplete: () => void;
}

export const CancelInviteButton: React.FC<CancelInviteButtonProps> = ({
  inviteId,
  compact,
  onActionComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    const result = await cancelClanInvite(inviteId);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onActionComplete();
  };

  return (
    <ButtonRow compact={compact} onClick={(e) => e.stopPropagation()}>
      <ActionButton color="#f59e0b" compact={compact} disabled={loading} onClick={handleCancel}>
        {loading ? "Canceling..." : "Cancel"}
      </ActionButton>
      {error && <ErrorText compact={compact}>{error}</ErrorText>}
    </ButtonRow>
  );
};

// ── Kick Button ──

interface KickButtonProps {
  clanId: string;
  username: string;
  compact?: boolean;
  onActionComplete: () => void;
}

export const KickButton: React.FC<KickButtonProps> = ({
  clanId,
  username,
  compact,
  onActionComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setLoading(true);
    setError(null);
    const result = await kickMember(clanId, username);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onActionComplete();
  };

  return (
    <ButtonRow compact={compact} onClick={(e) => e.stopPropagation()}>
      <ActionButton
        color={COLORS.kick}
        compact={compact}
        disabled={loading}
        onClick={handleClick}
        onBlur={() => setConfirming(false)}
      >
        {loading ? "Kicking..." : confirming ? "Sure?" : "Kick"}
      </ActionButton>
      {error && <ErrorText compact={compact}>{error}</ErrorText>}
    </ButtonRow>
  );
};

// ── Role Toggle Button ──

interface RoleToggleButtonProps {
  clanId: string;
  username: string;
  currentRole: ClanRole;
  compact?: boolean;
  onActionComplete: () => void;
}

export const RoleToggleButton: React.FC<RoleToggleButtonProps> = ({
  clanId,
  username,
  currentRole,
  compact,
  onActionComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newRole = currentRole === "member" ? "admin" : "member";
  const label = currentRole === "member" ? "Promote" : "Demote";
  const color = currentRole === "member" ? COLORS.promote : COLORS.demote;

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    const result = await updateMemberRole(clanId, username, newRole);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onActionComplete();
  };

  return (
    <ButtonRow compact={compact} onClick={(e) => e.stopPropagation()}>
      <ActionButton color={color} compact={compact} disabled={loading} onClick={handleToggle}>
        {loading ? "Updating..." : label}
      </ActionButton>
      {error && <ErrorText compact={compact}>{error}</ErrorText>}
    </ButtonRow>
  );
};
