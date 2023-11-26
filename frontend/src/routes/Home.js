// *** Package Imports
import { useState, useRef, useEffect } from "react";
// Axios is used to handle HTTP requests
import axios from "axios";
// useNavigate is used to push URLs to the user
import { useNavigate } from "react-router-dom";

// *** Component & Style Imports
import ErrorComponent from "../components/ErrorComponent";
import style from "./Home.module.css";
import { setCookie, getCookie } from "../helpers";

// *** Environment Variables
const apiUrl = process.env.REACT_APP_BACKEND_URL;
// const apiUrl = "http://localhost:3001";

function Home() {
  // *** HOOKS
  // ** STATE
  // Room Code and Player Name are input to text boxes which are tracked as state
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");

  const [inputStage, setInputStage] = useState(0);
  // Error message is tracked as state and displayed in the ErrorComponent
  const [errorText, setErrorText] = useState("");

  // Used to prevent scrolling to focus on input on mobile devices
  const [scrollPosition, setScrollPosition] = useState(null);

  // Used to track characters remaining in name
  const charCounter = useRef();
  // useNavigate is used to push URLs to the user in React Router
  const navigate = useNavigate();

  const NAME_MAX_LENGTH = 10;

  // *** ON PAGE LOAD
  useEffect(() => {}, []);

  // ** USE EFFECT
  // Update remaining characters when name changes
  useEffect(() => {
    if (charCounter.current)
      charCounter.current.innerText = NAME_MAX_LENGTH - name.length;
  }, [name]);

  const handleRoomCodeInputChange = (e) => {
    // Validate inputs, only latin alphabet uppercase
    let val = e.target.value;
    val = val.replace(/[^a-zA-Z]/g, "").toUpperCase();
    e.target.value = val;
    // Update state to reflect new input
    setRoomCode(e.target.value);
    setErrorText("");
  };

  const handleNameInputChange = (e) => {
    // Validate inputs, only latin alphabet uppercase
    let val = e.target.value;
    val = val.replace(/[^a-zA-Z]/g, "").toUpperCase();
    e.target.value = val;
    // Update state to reflect new input
    setName(e.target.value);
  };

  const handleJoinRoomSubmit = (e) => {
    // Reset the error text
    setErrorText("");

    // Ensure the room code exists
    if (!roomCode) {
      setErrorText("Please enter a room code.");
      return;
    }

    console.log("Attempting to join room: ", roomCode);
    // If no name input yet, check to see if the room exists
    if (!name) {
      (async () => {
        try {
          // If it exists, proceed to name input
          let res = await axios.get(apiUrl + "/room/" + roomCode);
          setInputStage(2);
        } catch (e) {
          setErrorText("Room '" + roomCode + "' does not exist.");
        }
      })();
      return;
    }

    // If the name has been entered (second time this function has run)
    (async () => {
      try {
        let res = await axios.post(apiUrl + "/join/" + roomCode, {
          name: name,
          userId: userId,
        });
        if (res.data.userId) setCookie("userId", res.data.userId, 300000);
        navigate("/room/" + res.data.code);
      } catch (e) {
        setErrorText(e.message);
        console.log(e);
      }
    })();
  };

  const handleCreateRoomSubmit = (e) => {
    setErrorText("");
    if (!name) {
      // Go to name entry stage
      setInputStage(1);
      return;
    }
    // Send POST to /room/new with user's name
    axios
      .post(apiUrl + "/room/new", { name: name })
      .then((res) => {
        // Response includes: userId of the new user (this client) and room code of the new room
        // Set the userId as a cookie
        setCookie("userId", res.data.userId, 300000);
        // Navigate to the new room
        navigate("/room/" + res.data.code);
      })
      .catch((error) => {
        console.error(error);
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
            // If the cookie does not match a db entry
            newUserID();
          });
      } catch (error) {
        // If there is no cookie
        newUserID();
      }

      // Sub-function which requests a new userID from the server and sets it as a cookie
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

  const handleBackButton = (event) => {
    setName("");
    setRoomCode("");
    setInputStage(0);
  };

  return (
    <div className={style.home}>
      <div className={style.header}>picnicbox.tv</div>
      <div className={style.main}>
        <div className={style.content}>
          {(() => {
            switch (inputStage) {
              case 0:
                return (
                  <>
                    <div className={style.inputWrapper}>
                      <div className={style.inputTitle}>Room Code</div>
                      <input
                        type="text"
                        placeholder="ENTER 4-LETTER CODE"
                        onChange={handleRoomCodeInputChange}
                        maxLength="4"
                        className={style.input}
                        id={style.roomCodeInput}
                      />
                    </div>
                    <div className={style.buttonWrapper}>
                      <button
                        id={style.joinRoomSubmit}
                        className={style.button}
                        onClick={handleJoinRoomSubmit}
                      >
                        Join
                      </button>
                    </div>
                    <ErrorComponent text={errorText} />
                    <div className={style.orWrapper}>
                      <div className={style.horizontalRule}></div>OR
                      <div className={style.horizontalRule}></div>
                    </div>

                    <div className={style.buttonWrapper}>
                      <button
                        id={style.createRoomSubmit}
                        className={style.button}
                        onClick={handleCreateRoomSubmit}
                      >
                        Create Room
                      </button>
                    </div>
                  </>
                );
              // Create room "play" submit
              case 1:
                return (
                  <>
                    <div className={style.inputWrapper}>
                      <div className={style.inputTitle}>
                        <div>Name</div>
                        <div
                          className={style.charCounter}
                          ref={charCounter}
                        ></div>
                      </div>
                      <div className={style.backButtonNameInputWrapper}>
                        <input
                          type="text"
                          placeholder="ENTER YOUR NAME"
                          onChange={handleNameInputChange}
                          maxLength={NAME_MAX_LENGTH}
                          className={style.input}
                          id={style.nameInput}
                        />
                      </div>
                    </div>
                    <div className={style.playButtonWrapper}>
                      <button
                        className={`${style.backButton} ${style.button}`}
                        onClick={handleBackButton}
                      >
                        ←
                      </button>
                      <button
                        className={`${style.playButton} ${style.button}`}
                        onClick={handleCreateRoomSubmit}
                      >
                        Play
                      </button>
                    </div>
                  </>
                );
              // Join room "play" submit
              case 2:
                return (
                  <>
                    <div className={style.inputWrapper}>
                      <div className={style.inputTitle}>
                        <div>Name</div>
                        <div
                          className={style.charCounter}
                          ref={charCounter}
                        ></div>
                      </div>
                      <div className={style.backButtonNameInputWrapper}>
                        <input
                          type="text"
                          placeholder="ENTER YOUR NAME"
                          onChange={handleNameInputChange}
                          maxLength={NAME_MAX_LENGTH}
                          className={style.input}
                          id={style.nameInput}
                        />
                      </div>
                    </div>
                    <div className={style.playButtonWrapper}>
                      <button
                        className={`${style.backButton} ${style.button}`}
                        onClick={handleBackButton}
                      >
                        ←
                      </button>
                      <button
                        className={`${style.playButton} ${style.button}`}
                        onClick={handleJoinRoomSubmit}
                      >
                        Play
                      </button>
                    </div>
                  </>
                );
              default:
                return null; // or some default content if needed
            }
          })()}
        </div>
      </div>
    </div>
  );
}

export default Home;
