import React from "react";
import style from "./UsernameSubheader.module.css";

// Expect:
// props.disabled
// props.users
// props.leaderName
function UsernameSubheader(props) {
  if (props.disabled) {
    return;
  }
  return (
    <ul className={LmsCSS.usernames}>
      <div className={LmsCSS.usernamesTitle}>Players:</div>
      {props.usernames.map((name, index) => {
        if (name === props.leaderName) return <li key={index}>👑 {name}</li>;
        return <li key={index}>{name}</li>;
      })}
    </ul>
  );
}

export default UsernameSubheader;
