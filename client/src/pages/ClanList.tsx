import type { ClanInfo } from "@gamenite/shared";
import React from "react";
import { ProfilePicture } from "../components/ProfilePicture";
import { TranslucentButton as Button } from "../components/Buttons";
import * as Typography from "../libs/Typography";
import { ThemeContext } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import { DefaultIcon } from "../components/StyledSVG";
import { InputWithLabel } from "../components/Input";
import useNewClanForm from "../hooks/useNewClanForm";

const ClanList: React.FC = () => {
  const { theme } = React.useContext(ThemeContext);
  const { error, handleClanUpdate, handleCreateClan, clanInfo } = useNewClanForm();
  const navigate = useNavigate();
  const [clans, setClans] = React.useState<ClanInfo[]>([]);
  const [modalVisible, setModalVisible] = React.useState<boolean>(false);

  React.useEffect(() => {
    getAllClans().then((res) => {
      if (!("error" in res)) {
        setClans(res);
      }
    });
  }, []);

  /**
   * Allows a user to join a clan.
   */
  const handleJoinClan = (clanId: string) => {
    userJoinClan(clanId).then((res) => {
      navigate("/clan");
    });
  };

  return (
    <div className="clan-container" style={{ backgroundColor: theme.primary, color: theme.text }}>
      <div className="title-row">
        <Typography.PageTitle>Clans</Typography.PageTitle>
        <Button
          color="#d193ed"
          style={{ width: "fit-content", height: "50px" }}
          onClick={() => setModalVisible(true)}
        >
          Create Clan
        </Button>
      </div>
      <div className="empty-clan-grid">
        <>
          <div />
          <Typography.Subtitle>Name</Typography.Subtitle>
          <Typography.Subtitle>Bio</Typography.Subtitle>
          <Typography.Subtitle>Member</Typography.Subtitle>
          <Typography.Subtitle>Created At</Typography.Subtitle>
          <div />
        </>
        {clans.map((clan) => (
          <>
            <div>
              <ProfilePicture
                src={clan.pfp}
                style={{ width: "55px", height: "55px", objectFit: "cover" }}
                border
                borderColor={clan.color}
              />
            </div>
            <Typography.Paragraph color={clan.color} className="text">
              {clan.name}
            </Typography.Paragraph>
            <Typography.Paragraph color={clan.color} className="text">
              {clan.bio}
            </Typography.Paragraph>
            <Typography.Paragraph color={clan.color} className="text">
              {clan.memberCount.toString()}
            </Typography.Paragraph>
            <Typography.Paragraph color={clan.color}>
              {new Date(clan.createdAt).toDateString()}
            </Typography.Paragraph>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Button color={clan.color} onClick={() => handleJoinClan(clan.clanId)}>
                Join
              </Button>
            </div>
          </>
        ))}
      </div>
      <CreateClanModal />
    </div>
  );
};

export default ClanList;
