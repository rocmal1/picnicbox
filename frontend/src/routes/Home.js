// *** Package Imports
import { useState, useRef, useEffect } from "react";
// Axios is used to handle HTTP requests
import axios from "axios";
// useNavigate is used to push URLs to the user
import { useNavigate } from "react-router-dom";

// *** Component & Style Imports
import ErrorComponent from "../components/ErrorComponent";
import "./Home.css";
import { setCookie, getCookie } from "../helpers";

// *** Environment Variables
// const apiUrl = process.env.REACT_APP_BACKEND_URL;
const apiUrl = "http://localhost:3001";

function Home() {
  // ** STATE
  // Room Code and Player Name are input to text boxes which are tracked as state
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  // Error message is tracked as state and displayed in the ErrorComponent
  const [errorText, setErrorText] = useState("");

  // ** REF
  // Used to track characters remaining in name
  const charCounter = useRef(null);

  // ** Constant values
  const NAME_MAX_LENGTH = 12;

  // ** USE EFFECT
  // Update remaining characters when name changes
  useEffect(() => {
    charCounter.current.innerText = NAME_MAX_LENGTH - name.length;
  }, [name]);

  // useNavigate is used to push URLs to the user in React Router
  const navigate = useNavigate();

  const handleRoomCodeInputChange = (e) => {
    // Validate inputs, only latin alphabet uppercase
    let val = e.target.value;
    val = val.replace(/[^a-zA-Z]/g, "").toUpperCase();
    e.target.value = val;
    // Update state to reflect new input
    setRoomCode(e.target.value);
  };

  const handleNameInputChange = (e) => {
    // Validate inputs, only latin alphabet uppercase
    let val = e.target.value;
    val = val.replace(/[^a-zA-Z]/g, "").toUpperCase();
    e.target.value = val;
    // Update state to reflect new input
    setName(e.target.value);
  };

  // Query the server to find if the room exists. If it does, try to join the room.
  const handleJoinRoomSubmit = (e) => {
    // Reset the error text
    setErrorText("");

    // Ensure the room code exists
    if (!roomCode) {
      return;
    }
    // Ensure a name has been entered
    if (!name) {
      setErrorText("Error: Please enter a name");
      return;
    }
    console.log("Attempting to join room: ", roomCode);

    // Send a GET request to get the room data
    axios
      .get(apiUrl + "/joinroom/" + roomCode)
      .then((response) => {
        // If the room is found
        if (response.data.roomCode) {
          // Request a userID cookie
          getUserID().then(() => navigate("/room/" + response.data.roomCode));
        }
      })
      .catch((error) => {
        // Per Axios documentation: https://github.com/axios/axios#handling-errors
        if (error.response) {
          // The request was made and the server responded with status code that is not in 2XX
          // If it is 404 we know the room was not found
          if (error.response.status === 404) {
            console.error("Room code", roomCode, "does not exist");
            setErrorText("Room " + roomCode + " does not exist");
            return;
          }
        } else if (error.request) {
          // No response was recieved from the server
          console.error(error.request);
          setErrorText("Unable to contact server");
        } else {
          // Something happened when setting up the request which triggered an error
          console.error("An error occurred while joining room ", roomCode);
          setErrorText("An error occurred while joining room " + roomCode);
        }
      });
  };

  const handleCreateRoomSubmit = (e) => {
    // Ensure a name has been entered
    if (!name) {
      setErrorText("Error: Please enter a name");
      return;
    }

    console.log("Attempting to create room");
    getUserID().then((userID) => {
      axios.post(apiUrl + "/newroom", { userID: userID }).then((response) => {
        if (response.status === 200) {
          console.debug("Entering room", response.data.roomCode);
          navigate("/room/" + response.data.roomCode);
        } else {
          // On server error, display the error text
          setErrorText(response.data);
        }
      });
    });
  };

  // TODO: Make it so that when a user already has a cookie with a UserID, but has a
  // different name than the user in the database, the user name in the database is updated
  function getUserID() {
    // This function returns the userID as a resolved promise - either from the cookie or newly created
    return new Promise((resolve, reject) => {
      // If we cannot get the userID cookie, tell the server to create a new user and provide the ID
      // Then set the cookie
      try {
        // Try to get the userID from the cookie
        // If this doesn't work, error is thrown
        let userID = getCookie("userID");
        // Assuming cookie is found:
        // 1. Send a GET req to the server to check if it exists in the DB
        // 2. Server will response with STATUS 200 if exists and STATUS 404 if DNE
        // 3. If STATUS 200, resolve this promise with the userID, otherwise create newUserID()
        axios
          .get(apiUrl + "/user", { userID: userID })
          .then(() => {
            resolve(userID);
          })
          .catch((innerError) => {
            newUserID();
          });
      } catch (error) {
        newUserID();
      }

      // Sub-function which requests a new userID from the server
      function newUserID() {
        // Request a new userID from the server
        // Expect: response containing a userID
        axios
          .post(apiUrl + "/user", { name: name })
          .then((res) => {
            // Set a cookie with the unique userID provided by the server
            if (res.data.userID) {
              setCookie("userID", res.data.userID, 300000);
              resolve(res.data.userID);
            }
          })
          .catch((error) => {
            console.error(error);
            setErrorText("Error creating user");
            reject(error);
          });
      }
    });
  }

  return (
    <div className="Home">
      <input
        type="text"
        placeholder="ROOM CODE"
        onChange={handleRoomCodeInputChange}
        maxLength="4"
      />
      <div>
        <input
          type="text"
          placeholder="NAME"
          onChange={handleNameInputChange}
          maxLength={NAME_MAX_LENGTH}
        />
        <div className="charCounter" ref={charCounter}>
          {NAME_MAX_LENGTH}
        </div>
      </div>
      <button id="joinRoomSubmit" onClick={handleJoinRoomSubmit}>
        Join
      </button>

      <button id="createRoomSubmit" onClick={handleCreateRoomSubmit}>
        Create Room
      </button>

      <ErrorComponent text={errorText} />
    </div>
  );
}

export default Home;
