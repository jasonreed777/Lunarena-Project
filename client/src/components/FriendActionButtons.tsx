import styled from "@emotion/styled";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useFriendshipStatus from "../hooks/useFriendshipStatus";
import { hexToRGB } from "../util/utils";

const COLORS = {
  accept: "#22c55e",
  reject: "#ef4444",
  addFriend: "#22c55e",
  remove: "#ef4444",
  pending: "#6b7280",
  cancel: "#f59e0b",
  message: "#3b82f6",
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

const StatusLabel = styled.span`
  font-family: "filson-pro", sans-serif;
  font-weight: 500;
  font-size: 14px;
  opacity: 0.7;
`;

const ErrorText = styled.span<{ compact?: boolean }>`
  color: ${COLORS.reject};
  font-size: ${({ compact }) => (compact ? "12px" : "14px")};
  font-family: "filson-pro", sans-serif;
`;

interface FriendActionButtonsProps {
  targetUsername: string;
  compact?: boolean;
  onActionComplete?: () => void;
}

/**
 * Renders the appropriate friend action buttons (Add, Accept/Reject, Remove, etc.)
 * based on the current friendship status with the target user.
 * Follows the TranslucentButton visual pattern from the component library.
 */
export const FriendActionButtons: React.FC<FriendActionButtonsProps> = ({
  targetUsername,
  compact,
  onActionComplete,
}) => {
  const navigate = useNavigate();
  const state = useFriendshipStatus(targetUsername);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    setActionError(null);
    try {
      await action();
      onActionComplete?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (state.status === "loading" || state.status === "self") return null;

  if (state.status === "error") {
    return <ErrorText compact={compact}>{state.message}</ErrorText>;
  }

  return (
    <ButtonRow compact={compact} onClick={(e) => e.stopPropagation()}>
      {state.status === "none" && (
        <ActionButton
          color={COLORS.addFriend}
          compact={compact}
          disabled={loading}
          onClick={() => handleAction(state.sendRequest)}
        >
          {loading ? "Sending..." : "Add Friend"}
        </ActionButton>
      )}

      {state.status === "incoming_request" && (
        <>
          {!compact && <StatusLabel>Friend request received —</StatusLabel>}
          <ActionButton
            color={COLORS.accept}
            compact={compact}
            disabled={loading}
            onClick={() => handleAction(state.accept)}
          >
            Accept
          </ActionButton>
          <ActionButton
            color={COLORS.reject}
            compact={compact}
            disabled={loading}
            onClick={() => handleAction(state.reject)}
          >
            Reject
          </ActionButton>
        </>
      )}

      {state.status === "outgoing_request" && (
        <>
          {!compact && <StatusLabel>Friend request sent —</StatusLabel>}
          <ActionButton color={COLORS.pending} compact={compact} disabled>
            Pending
          </ActionButton>
          <ActionButton
            color={COLORS.cancel}
            compact={compact}
            disabled={loading}
            onClick={() => handleAction(state.cancel)}
          >
            Cancel
          </ActionButton>
        </>
      )}

      <ActionButton
        color={COLORS.message}
        compact={compact}
        onClick={() => navigate("/messages", { state: { username: targetUsername } })}
      >
        Message
      </ActionButton>

      {state.status === "friends" && (
        <ActionButton
          color={COLORS.remove}
          compact={compact}
          disabled={loading}
          onClick={() => {
            if (window.confirm(`Are you sure you want to remove this friend?`)) {
              handleAction(state.removeFriend);
            }
          }}
        >
          {loading ? "Removing..." : "Remove Friend"}
        </ActionButton>
      )}

      {actionError && <ErrorText compact={compact}>{actionError}</ErrorText>}
    </ButtonRow>
  );
};
