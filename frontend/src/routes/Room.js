import React from "react";

import { useParams } from "react-router-dom";

function Room(props) {
  // Grab the roomCode from the react router path /room/:roomCode
  const { roomCode } = useParams();
  // On loading the page, validate the room code
  // REGEXP pattern: 4 characters, a-z and/or A-Z
  const pattern = /^[a-zA-Z]{4}$/;
  if (!pattern.test(roomCode)) {
    return <div>{roomCode} is not a valid room code.</div>;
  }

  return <div>Room Code is: {roomCode}</div>;
}

export default Room;
