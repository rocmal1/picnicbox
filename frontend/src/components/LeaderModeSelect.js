import { useState, useEffect, useRef } from "react";
import "./LeaderModeSelect.css";
import axios from "axios";

const apiUrl = "http://localhost:3001";

function LeaderModeSelect(props) {
  const [setupState, setSetupState] = useState(0);
  const [gamemode, setGamemode] = useState("Quippage");
  const [gameLists, setGameLists] = useState([]);
  const [activeGameLists, setActiveGameLists] = useState([]);
  const [displayedGameLists, setDisplayedGameLists] = useState([]);
  const gameListSearchRef = useRef();

  const [hoveredListItem, setHoveredListItem] = useState(null);
  const [hoveredActiveListItem, setHoveredActiveListItem] = useState(null);

  useEffect(() => {
    setDisplayedGameLists(gameLists);
  }, [gameLists]);

  // If the leader changes while configuring, reset options
  useEffect(() => {
    setSetupState(0);
  }, [props.leaderName]);

  // If user is not the leader display nothing
  if (!props.isLeader)
    return (
      <div className="loading">
        👑 {props.leaderName} is configuring the game
      </div>
    );

  const handleGamemodeSelectChange = (e) => {
    console.log("Selected mode:", e.target.value);
    setGamemode(e.target.value);
  };

  const handleListItemMouseEnter = (index, whichList) => {
    if (hoveredListItem !== index && whichList === "inactive") {
      setHoveredListItem(index);
    } else if (hoveredActiveListItem !== index && whichList === "active") {
      console.log("Set hovered active list item");
      setHoveredActiveListItem(index);
    }
  };

  const handleListItemMouseLeave = (index, whichList) => {
    if (hoveredListItem === index && whichList === "inactive") {
      setHoveredListItem(null);
    } else if (hoveredActiveListItem === index && whichList === "active") {
      setHoveredActiveListItem(null);
    }
  };

  const handleListItemClick = (clickedList) => {
    // Remove entry from gameLists and add to activeGameLists
    const newGameLists = gameLists.filter((list) => list !== clickedList);
    const newActiveGameLists = [...activeGameLists, clickedList];
    setGameLists(newGameLists);
    setActiveGameLists(newActiveGameLists);
    setHoveredListItem(null);
    setHoveredActiveListItem(null);
    // Reset search
    gameListSearchRef.current.value = "";
  };

  const handleActiveListItemClick = (clickedList) => {
    // Remove entry from activeGameLists and add to gameLists
    const newActiveGameLists = activeGameLists.filter(
      (list) => list !== clickedList
    );
    const newGameLists = [...gameLists, clickedList];
    setActiveGameLists(newActiveGameLists);
    setGameLists(newGameLists);
  };

  const handleGameListSearch = (event) => {
    const search = event.target.value.toUpperCase();
    if (search === "") {
      setDisplayedGameLists(gameLists);
      return;
    }
    const filteredGameLists = gameLists.filter((list) =>
      list.name.toUpperCase().includes(search)
    );
    setDisplayedGameLists(filteredGameLists);
  };

  const gamemodeLockedIn = () => {
    (async () => {
      // Get the available lists for the selected gamemode
      const dbLists = (await axios.get(apiUrl + "/lists/quippage")).data;
      console.log("dbLists:", dbLists);
      setGameLists(dbLists);
      setDisplayedGameLists(dbLists);
      setSetupState(1);
    })();
  };

  switch (setupState) {
    case 0:
      return (
        <div className="wrapper">
          <div>Select a gamemode:</div>
          <select value={gamemode} onChange={handleGamemodeSelectChange}>
            <option value="Quippage">Quippage</option>
            <option value="Other Mode">Other Mode</option>
          </select>
          <button onClick={gamemodeLockedIn}>next</button>
        </div>
      );

    case 1:
      return (
        <div className="wrapper">
          <div>Gamemode: {gamemode}</div>
          <div>Select a list of questions:</div>
          <div className="quippage-list-selector">
            <h2>Selected Game Lists</h2>
            <ul className="active-list-items">
              {activeGameLists.map((gameList, index) => {
                return (
                  <li
                    className="list-selector-item"
                    key={index}
                    onMouseEnter={() =>
                      handleListItemMouseEnter(index, "active")
                    }
                    onMouseLeave={() =>
                      handleListItemMouseLeave(index, "active")
                    }
                    onClick={() => handleActiveListItemClick(gameList)}
                  >
                    {hoveredActiveListItem === index && <div>(-)</div>}
                    {gameList.name}
                  </li>
                );
              })}
            </ul>
            <h2>Game Lists</h2>
            <ul className="list-items">
              <input
                type="text"
                onChange={handleGameListSearch}
                placeholder="Search"
                ref={gameListSearchRef}
              ></input>
              {displayedGameLists.map((gameList, index) => {
                return (
                  <li
                    className="list-selector-item"
                    key={index}
                    onMouseEnter={() =>
                      handleListItemMouseEnter(index, "inactive")
                    }
                    onMouseLeave={() =>
                      handleListItemMouseLeave(index, "inactive")
                    }
                    onClick={() => handleListItemClick(gameList)}
                  >
                    {hoveredListItem === index && <div>(+)</div>}
                    {gameList.name}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <button onClick={() => setSetupState(0)}>back</button>
            <button onClick={() => setSetupState(2)}>next</button>
          </div>
        </div>
      );

    case 2:
      const options = {
        gamemode: gamemode,
        gameLists: activeGameLists,
      };
      props.handleLeaderFinishSetup(options);
      return;

    default:
      return <div>Error</div>;
  }
}

export default LeaderModeSelect;
