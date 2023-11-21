import { useState, useEffect, useRef } from "react";
import LmsCSS from "./LeaderModeSelect.module.css";
import axios from "axios";

// const apiUrl = "http://localhost:3001";
const apiUrl = process.env.REACT_APP_BACKEND_URL;

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
      <div className={LmsCSS.leaderModeSelectContent}>
        <div className={LmsCSS.loading}>
          👑 {props.leaderName} is configuring the game
        </div>

        <ul className={LmsCSS.usernames}>
          <div className={LmsCSS.usernamesTitle}>Players:</div>
          {props.usernames.map((name, index) => {
            if (name === props.leaderName)
              return <li key={index}>👑 {name}</li>;
            return <li key={index}>{name}</li>;
          })}
        </ul>
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

      setActiveGameLists([]);
      setGameLists(dbLists);
      setDisplayedGameLists(dbLists);
      setSetupState(1);
    })();
  };

  switch (setupState) {
    case 0:
      return (
        <div className={LmsCSS.leaderModeSelectContent}>
          <div className={LmsCSS.wrapper}>
            <div className={LmsCSS.instructions}>Select a gamemode:</div>
            <select
              className={LmsCSS.gamemodeSelect}
              value={gamemode}
              onChange={handleGamemodeSelectChange}
            >
              <option value="Quippage">Quippage</option>
              <option value="other" disabled="true">
                Coming soon...
              </option>
            </select>
            <button onClick={gamemodeLockedIn}>Next</button>
          </div>
          <ul className={LmsCSS.usernames}>
            <div className={LmsCSS.usernamesTitle}>Players:</div>
            {props.usernames.map((name, index) => {
              if (name === props.leaderName)
                return <li key={index}>👑 {name}</li>;
              return <li key={index}>{name}</li>;
            })}
          </ul>
        </div>
      );

    case 1:
      return (
        <div className={LmsCSS.wrapper}>
          <div>Gamemode: {gamemode}</div>
          <div>Select question pack(s) to play with:</div>
          <div className={LmsCSS.quippageListsWrapper}>
            <div className={LmsCSS.activeListWrapper}>
              <div className={LmsCSS.quippageListTitle}>Selected Packs</div>
              <ul className={LmsCSS.activeListItems}>
                {activeGameLists.map((gameList, index) => {
                  return (
                    <li
                      className={LmsCSS.listSelectorItem}
                      key={index}
                      onMouseEnter={() =>
                        handleListItemMouseEnter(index, "active")
                      }
                      onMouseLeave={() =>
                        handleListItemMouseLeave(index, "active")
                      }
                      onClick={() => handleActiveListItemClick(gameList)}
                    >
                      {gameList.name}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className={LmsCSS.listWrapper}>
              <div className={LmsCSS.quippageListTitle}>Available Packs</div>
              <input
                type="text"
                className={LmsCSS.gameListSearchInput}
                onChange={handleGameListSearch}
                placeholder="Search"
                ref={gameListSearchRef}
              ></input>
              <ul className={LmsCSS.listItems}>
                {displayedGameLists.map((gameList, index) => {
                  return (
                    <li
                      className={LmsCSS.listSelectorItem}
                      key={index}
                      onMouseEnter={() =>
                        handleListItemMouseEnter(index, "inactive")
                      }
                      onMouseLeave={() =>
                        handleListItemMouseLeave(index, "inactive")
                      }
                      onClick={() => handleListItemClick(gameList)}
                    >
                      {gameList.name}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div className={LmsCSS.buttonBar}>
            <button
              className={LmsCSS.backButton}
              onClick={() => setSetupState(0)}
            >
              <img
                className={LmsCSS.backButtonImage}
                src="/arrow-left-black.svg"
              ></img>
            </button>
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
