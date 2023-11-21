import React from "react";

function ErrorComponent(props) {
  const style = {
    color: "red",
    fontWeight: "bold",
    marginTop: "6px",
  };

  return <div style={style}>{props.text}</div>;
}

export default ErrorComponent;
