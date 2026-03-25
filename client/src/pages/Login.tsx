import useLoginForm from "../hooks/useLoginForm.ts";
import "./Login.css";
import { useState } from "react";
import { type AuthContext } from "../contexts/LoginContext.ts";
import { InputWithLabel } from "../components/Input.tsx";
import { LogoImage } from "../components/LogoImage.tsx";
import * as Typography from "../libs/Typography.tsx";
import { Divider } from "../components/Divider.tsx";
import { TransluscentButton } from "../components/Buttons.tsx";

interface LoginProps {
  setAuth: (s: AuthContext | null) => void;
}

/**
 * Renders a login form with username and password inputs, password visibility toggle,
 * and error handling.
 */
export default function Login({ setAuth }: LoginProps) {
  const { mode, username, password, confirm, err, handleInputChange, handleSubmit, toggleMode } =
    useLoginForm(setAuth);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="container">
      <div className="login-title">
        <Typography.WelcomeText>Welcome to</Typography.WelcomeText>
        <Typography.LoginTitle style={{ marginTop: -20 }}>GameNite</Typography.LoginTitle>
      </div>
      <form className="login" onSubmit={(e) => handleSubmit(e)}>
        <div>
          <Typography.Subtitle>Log into GameNite</Typography.Subtitle>
          <Divider />
        </div>
        <InputWithLabel
          type="text"
          value={username}
          onChange={(event) => handleInputChange(event, "username")}
          placeholder="Username"
          aria-label="Username"
          label="Username"
          color="#d193ed"
        />
        <InputWithLabel
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => handleInputChange(event, "password")}
          placeholder="Password"
          aria-label="Password"
          label="Password"
          color="#d193ed"
        />
        {mode === "signup" && (
          <InputWithLabel
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(event) => handleInputChange(event, "confirm")}
            placeholder="Confirm Password"
            aria-label="Confirm Password"
            label="Confirm Password"
            color="#d193ed"
          />
        )}
        <div className="labeled-section">
          <input
            type="checkbox"
            id="showPasswordToggle"
            checked={showPassword}
            onChange={() => setShowPassword((prevShowPassword) => !prevShowPassword)}
          />
          <label htmlFor="showPasswordToggle">
            <Typography.SubtitleSmall>Show Password</Typography.SubtitleSmall>
          </label>
        </div>
        <Divider />
        <div>
          <div className="form-btns">
            <TransluscentButton type="submit" color="#43B9C6">
              {mode === "signup" ? "Sign Up" : "Log In"}
            </TransluscentButton>
            <Typography.SmallText className="intertext">or</Typography.SmallText>
            <TransluscentButton
              onClick={(e) => {
                e.preventDefault();
                toggleMode();
              }}
              color="#DE1212"
            >
              {mode === "signup" ? "Use Existing Account" : "Create New Account"}
            </TransluscentButton>
          </div>
          {err && (
            <Typography.Code className="error-message centered" style={{ paddingTop: 10 }}>
              {err}
            </Typography.Code>
          )}
        </div>
      </form>
      <LogoImage />
    </div>
  );
}
