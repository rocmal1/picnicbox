import { useEffect, useState } from "react";
import { getCookie } from "../helpers";

import { useParams } from "react-router-dom";

function Room(props) {
  // Grab the roomCode from the react router path /room/:roomCode
  const { roomCode } = useParams();

  const [userID, setUserID] = useState("");

  // On loading the page
  useEffect(() => {
    // Get the userID cookie
    try {
      setUserID(getCookie("userID"));
    } catch (error) {
      return (
        <div>
          Could not find userID cookie. This website depends on use of cookies.
          Please make sure to disable any extensions/browser features which may
          be blocking cookies.
        </div>
      );
    }
  }, []);

  // Validate the roomcode when it is changed (incl. on initial page load)
  useEffect(() => {
    // REGEXP pattern: 4 characters, a-z and/or A-Z
    const pattern = /^[a-zA-Z]{4}$/;
    if (!pattern.test(roomCode)) {
      return <div>{roomCode} is not a valid room code.</div>;
    }
  });

  return (
    <div>
      Room Code is: {roomCode}, User ID is: {userID}
    </div>
  );
}

export default Room;
