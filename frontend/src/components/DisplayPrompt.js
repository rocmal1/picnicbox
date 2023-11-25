import style from "./DisplayPrompt.module.css";

function DisplayPrompt(props) {
  // const currentPrompt = props.currentPrompt;
  // const handleDisplayPromptFinish = props.handleDisplayPromptFinish;
  // const numPrompts = props.prompts.length;
  return (
    <div>
      <div className={style.mainCard}>
        Bring a bag of McDonalds in to the movie theater.
      </div>
    </div>
  );
}

export default DisplayPrompt;
