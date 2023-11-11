import { Component } from "react";

function LeaderModeSelect(props) {
  // If user is not the leader display nothing
  if (!props.isLeader) return;

  return <div>You are the room leader</div>;
}

export default LeaderModeSelect;
