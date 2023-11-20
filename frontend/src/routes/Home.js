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

  const NAME_MAX_LENGTH = 12;

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
      return;
    }
    // // Ensure a name has been entered
    // if (!name) {
    //   setErrorText("Error: Please enter a name");
    //   return;
    // }

    console.log("Attempting to join room: ", roomCode);

    (async () => {
      try {
        let res = await axios.get(apiUrl + "/room/" + roomCode);
        setInputStage(1);
      } catch (e) {
        setErrorText("Room '" + roomCode + "' does not exist.");
      }
    })();

    // (async () => {
    //   try {
    //     let res = await axios.post(apiUrl + "/join/" + roomCode, {
    //       name: name,
    //       userId: userId,
    //     });
    //     if (res.data.userId) setCookie("userId", res.data.userId, 300000);
    //     navigate("/room/" + res.data.code);
    //   } catch (e) {
    //     setErrorText(e.message);
    //     console.log(e);
    //   }
    // })();
  };

  const handleCreateRoomSubmit = (e) => {
    // Ensure a name has been entered
    if (!name) {
      setErrorText("Error: Please enter a name");
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

  // Used to prevent scrolling to focus on input on mobile devices
  const handleInputFocus = (event) => {
    // setScrollPosition(window.scrollY);
    // event.target.blur();
    // setTimeout(() => {
    //   window.scrollTo(0, scrollPosition);
    // }, 0);
  };

  return (
    <div className="home">
      <div className="header">picnicbox.tv</div>
      <div className="main">
        <div className="content">
          {(() => {
            switch (inputStage) {
              case 0:
                return (
                  <>
                    <div className="inputWrapper">
                      <div className="inputTitle">Room Code</div>
                      <input
                        type="text"
                        placeholder="ENTER 4-LETTER CODE"
                        onChange={handleRoomCodeInputChange}
                        onFocus={handleInputFocus}
                        maxLength="4"
                        className="homeInput"
                        id="roomCodeInput"
                      />
                    </div>
                    <div className="buttonWrapper">
                      <button
                        id="joinRoomSubmit"
                        className="button"
                        onClick={handleJoinRoomSubmit}
                      >
                        Join
                      </button>
                    </div>
                    <ErrorComponent text={errorText} />
                    <div className="orWrapper">
                      <div className="horizontalRule"></div>OR
                      <div className="horizontalRule"></div>
                    </div>

                    <div className="buttonWrapper">
                      <button
                        id="createRoomSubmit"
                        className="button"
                        onClick={handleCreateRoomSubmit}
                      >
                        Create Room
                      </button>
                    </div>
                  </>
                );
              case 1:
                return (
                  <>
                    <div className="inputWrapper">
                      <div className="inputTitle">
                        <div>Name</div>
                        <div className="charCounter" ref={charCounter}></div>
                      </div>
                      <input
                        type="text"
                        placeholder="NAME"
                        onChange={handleNameInputChange}
                        onFocus={handleInputFocus}
                        maxLength={NAME_MAX_LENGTH}
                        className="homeInput"
                        id="nameInput"
                      />
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
