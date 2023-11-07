import { useState, useRef } from "react";
// Axios is used to handle HTTP requests
import axios from "axios";

import "./App.css";

// Components
import ErrorComponent from "./Home/ErrorComponent";

const apiUrl = "http://localhost:3001";

function App() {
  // ** STATE
  // Room Code is input to a text box which is tracked as state
  const [roomCode, setRoomCode] = useState("");
  // Error message is tracked as state and displayed in the ErrorComponent
  const [errorText, setErrorText] = useState("");

  // ** REF
  const joinRoomInputRef = useRef(null);

  const handleRoomCodeInputChange = (e) => {
    let val = e.target.value;
    val = val.replace(/[^a-zA-Z]/g, "").toUpperCase();
    e.target.value = val;
    console.log("Current Room Code: ", e.target.value);
    setRoomCode(e.target.value);
  };

  // Query the server to find if the room exists. If it does, try to join the room.
  const handleJoinRoomSubmit = (e) => {
    // Reset the error text
    setErrorText("");

    // Do not query the server if there is no room code entered
    if (roomCode) {
      console.log("Attempting to join room: ", roomCode);

      // Send a GET request to get the room data
      axios
        .get(apiUrl + "/joinroom/" + roomCode)
        .then((response) => {
          console.log(response.status);
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
    }
  };

  const handleCreateRoomSubmit = (e) => {
    console.log("Attempting to create room");
    // axios.get(apiUrl)
    //   .then(response => {
    //     console.log(response.data);
    //   })
    //   .catch(error => {
    //     console.error('Error:', error);
    //   });
    axios.post(apiUrl + "/newroom").then((response) => {
      console.log(response.data.firstName);
    });
  };

  return (
    <div className="App">
      <input
        type="text"
        placeholder="Room Code"
        onChange={handleRoomCodeInputChange}
        ref={joinRoomInputRef}
        maxLength="4"
      />

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

export default App;
