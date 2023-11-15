import { useEffect, useState } from "react";

import { getCookie } from "../helpers";

import { useParams } from "react-router-dom";

import { socket } from "../socket.js";

import "./Room.css";

import ErrorComponent from "../components/ErrorComponent";
import LeaderModeSelect from "../components/LeaderModeSelect";

const apiUrl = process.env.REACT_APP_BACKEND_URL;

function Room(props) {
  // Only connect the socket when inside a room
  // if (window.location.pathname.includes("/room/")) {
  //   // Connect to the server websocket
  //   socket = io(apiUrl, {
  //     reconnectionDelayMax: 10000,
  //   });
  // }

  // Grab the roomCode from the react router path /room/:roomCode
  const { roomCode } = useParams();

  const [userId, setUserId] = useState("");

  const [leaderUser, setLeaderUser] = useState("");

  const [usernames, setUsernames] = useState([]);

  const [currentPrompt, setCurrentPrompt] = useState("What to call your dog?");

  // Error message is tracked as state and displayed in the ErrorComponent
  const [errorText, setErrorText] = useState("");

  // On loading the page
  useEffect(() => {
    // Get the userId cookie
    try {
      setUserId(getCookie("userId"));
      setErrorText("");
    } catch (error) {
      setErrorText(
        "Could not find userId cookie." +
          " This website relies on same-site cookies (for gameplay, not tracking)." +
          " Please disable any extensions/browser features which may be blocking cookies."
      );
    }

    // Set up websocket connection
    socket.connect();
    socket.emit("cSendUserInfo", { userId: userId, code: roomCode });
  }, [userId, roomCode]);

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

  socket.on("sUpdateConnectedUsers", (data) => {
    if (!data.leaderUser || !data.users) return;
    // Update usernames
    let newUsernames = [];
    for (let i = 0; i < data.users.length; i++) {
      newUsernames.push(data.users[i].name);
    }
    setUsernames(newUsernames);
    console.log("New Usernames", newUsernames);
    console.log("Leader User", leaderUser);

    // TODO: Switch from leaderId to leaderName for ease of displaying crown
    // Update leaderId
    if (data.leaderUser !== leaderUser) setLeaderUser(data.leaderUser);
  });

  // Once the leader finished setup, take the setup options (incl. lists)
  // and add them to the room in the db
  const handleLeaderFinishSetup = (options) => {
    // Options: { gamemode: "quippage", lists: []}
    console.log("options:", options);
    const gamemode = options.gamemode;
    const gameLists = options.gameLists;

    const emitData = {
      code: roomCode,
      gamemode: gamemode,
      gameLists: gameLists,
    };
    socket.emit("cSetupComplete");
  };

  return (
    <div>
      <div>
        Room Code is: {roomCode}, User ID is: {userId}
      </div>
      <LeaderModeSelect
        isLeader={userId === leaderUser._id}
        leaderName={leaderUser.name}
        handleLeaderFinishSetup={handleLeaderFinishSetup}
      />
      <ul>
        {usernames.map((name, index) => {
          if (name === leaderUser.name) return <li key={index}>👑 {name}</li>;
          return <li key={index}>{name}</li>;
        })}
      </ul>
      <div className="promptWrapper">
        <div className="promptCard">{currentPrompt}</div>
        <input type="text" placeholder="response"></input>
      </div>
      <div className="responseWrapper">
        <div className="responseCard"></div>
      </div>
      <button>test</button>
    </div>
  );
}

export default Room;
