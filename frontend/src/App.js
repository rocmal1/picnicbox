import { useState } from 'react';
// Axios is used to handle HTTP requests
import axios from 'axios';

import './App.css';

const apiUrl = 'http://localhost:3001';


function App() {
  const [roomCode, setRoomCode] = useState('');

  const handleRoomCodeInputChange = (e) => {
    console.log('Current Room Code: ', e.target.value);
    setRoomCode(e.target.value);
  };

  // Query the server to find if the room exists. If it does, try to join the room.
  const handleJoinRoomSubmit = (e) => {
    // Do not query the server if there is no room code entered
    if(roomCode) {
      console.log('Attempting to join room: ', roomCode);
      axios.get(apiUrl + "/joinroom/" + roomCode)
        .then((response) => {
          console.log(response.data)
        })
    }
  };

  const handleCreateRoomSubmit = (e) => {
    console.log('Attempting to create room');
    // axios.get(apiUrl)
    //   .then(response => {
    //     console.log(response.data);
    //   })
    //   .catch(error => {
    //     console.error('Error:', error);
    //   });
    axios.post(apiUrl + "/newroom")
      .then((response) => {
        console.log(response.data.firstName);
      })
    
  };

  return (
    <div className="App">
      <input 
        type="text" 
        placeholder='Room Code' 
        onChange={handleRoomCodeInputChange}
      />
      <button 
        id="joinRoomSubmit"
        onClick={handleJoinRoomSubmit}  
      >Join</button>
      <button 
        id="createRoomSubmit"
        onClick={handleCreateRoomSubmit}
      >Create Room</button>
    </div>
  );
}

export default App;
