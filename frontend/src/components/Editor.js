import style from "./Editor.module.css";
import { useState } from "react";
const Editor = () => {
  const [newItemText, setNewItemText] = useState("");
  const handleNewItemChange = (event) => {
    const newText = event.target.value;
    if (newText) setNewItemText(event.target.value);
    console.log(event.target.value);
  };
  return (
    <div>
      <div className={style.listNameWrapper}>
        <input
          className={style.listNameInput}
          type="text"
          placeholder="PLAYLIST NAME"
        ></input>
      </div>
      <div className={style.itemListWrapper}>
        <div className={style.itemWrapper}>
          <div className={style.item}>test item</div>
          <img src="/red-trash-can-icon.svg" className={style.itemDelete}></img>
        </div>
        <div className={style.itemWrapper}>
          <input
            onChange={handleNewItemChange}
            className={`${style.item} ${style.newItem}`}
            type="text"
          ></input>
        </div>
      </div>
    </div>
  );
};

export default Editor;
