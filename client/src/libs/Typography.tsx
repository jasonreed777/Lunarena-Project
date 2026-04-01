import styled from "@emotion/styled";

export const WelcomeText = styled.h1`
  font-family: "apparat-semicond", sans-serif;
  font-size: 30px;
  font-weight: 400;
  font-style: italic;
  font-variant: all-small-caps;
`;

/**
 * Title to be used in the main login page
 */
export const LoginTitle = styled.h1`
  font-family: "Righteous", sans-serif;
  font-size: 75px;
  font-weight: 400;
  font-style: normal;
`;
/**
 * Small title for the header
 */
export const SmallTitle = styled.h1`
  font-family: "Righteous", sans-serif;
  font-size: 24px;
  font-weight: 400;
  font-style: normal;
`;
/**
 * The title of each page
 */
export const PageTitle = styled.h1`
  font-family: "Righteous", sans-serif;
  font-size: 75px;
  font-weight: 400;
  font-style: normal;
`;

export const NavBar = styled.h2`
  font-family: "filson-pro", sans-serif;
  font-size: 16px;
  font-weight: 300;
  font-style: normal;
`;

/**
 * Large Subtitle
 */
export const Subtitle = styled.h2`
  font-family: "apparat-semicond", sans-serif;
  font-weight: 700;
  font-size: 18px;
  font-style: normal;
  font-variant: all-small-caps;
`;
/**
 * Small Subtitle
 */
export const SubtitleSmall = styled.h5`
  font-family: "apparat-semicond", sans-serif;
  font-weight: 500;
  font-size: 16px;
  font-style: normal;
  font-variant: all-small-caps;
`;

/**
 * Text input from a user
 */
export const InputText = styled.p`
  font-family: "filson-pro", sans-serif;
  font-weight: 700;
  font-style: normal;
  font-size: 16px;
`;

/**
 * Small text to be used as captions and warnings
 */
export const SmallText = styled.p`
  font-family: "avenir", sans-serif;
  font-weight: 500;
  font-style: normal;
  font-size: 0.75rem;
`;

export const ProfileText = styled.h4`
  font-family: "filson-pro", sans-serif;
  font-weight: 700;
  font-style: normal;
  font-size: 16px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const Code = styled.p`
  font-family: "fira-code", serif;
  font-weight: 700;
  font-style: normal;
  font-size: 16px;
`;

export const LargeStat = styled.p`
  font-family: "Fugaz One", serif;
  font-weight: 700;
  font-style: normal;
  font-size: 26px;
`;

/**
 * Recently played game text.
 */
export const RecentlyPlayedText = styled.p`
  font-family: "fira-sans", "avenir", sans-serif;
  font-weight: 500;
  font-style: normal;
  font-size: 16px;
  opacity: 0.75;
`;

export const LargeParagraph = styled.p<{ color?: string }>`
  font-family: "fira-sans", "avenir", sans-serif;
  font-weight: 500;
  font-style: normal;
  font-size: 20px;
  color: ${({ color }) => color ?? "white"};
`;

export const Paragraph = styled.p<{ color?: string }>`
  font-family: "fira-sans", "avenir", sans-serif;
  font-weight: 500;
  font-style: normal;
  font-size: 14px;
  color: ${({ color }) => color ?? "white"};
`;

/**
 * Streaks and points in the header.
 */
export const HeaderStats = styled.p`
  font-family: "avenir", sans-serif;
  font-weight: 500;
  font-style: italic;
  font-size: 16px;
`;
