import { useEffect, useState } from "react";
import { getCookie } from "../helpers";

import { useParams } from "react-router-dom";

import ErrorComponent from "../components/ErrorComponent";

function Room(props) {
  // Grab the roomCode from the react router path /room/:roomCode
  const { roomCode } = useParams();

  const [userID, setUserID] = useState("");

  // Error message is tracked as state and displayed in the ErrorComponent
  const [errorText, setErrorText] = useState("");

  // On loading the page
  useEffect(() => {
    // Get the userID cookie
    try {
      setUserID(getCookie("userID"));
      setErrorText("");
    } catch (error) {
      setErrorText(
        "Could not find userID cookie." +
          " This website relies on same-site cookies (for gameplay, not tracking)." +
          " Please disable any extensions/browser features which may be blocking cookies."
      );
    }
  }, []);

  // Validate the roomcode when it is changed (incl. on initial page load)
  useEffect(() => {
    // REGEXP pattern: 4 characters, a-z and/or A-Z
    const pattern = /^[a-zA-Z]{4}$/;
    if (!pattern.test(roomCode)) {
      setErrorText(`${roomCode} is not a valid room code.`);
    }
  }, [roomCode]);

  // If we have an error, display it rather than rendering the page
  if (errorText) {
    return (
      <>
        <ErrorComponent text={errorText} />
      </>
    );
  }

  return (
    <div>
      Room Code is: {roomCode}, User ID is: {userID}
    </div>
  );
}

export default Room;
