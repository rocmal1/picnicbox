import React, { useState, useEffect } from "react";

const CountdownTimer = ({ initialTime, onTimeout }) => {
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prevTime) => Math.max(0, prevTime - 1));
    }, 1000);

    return () => {
      clearInterval(timer);
      if (time === 0 && onTimeout) {
        onTimeout();
      }
    };
  }, [time, onTimeout]);

  const calculateOpacity = () => {
    // Adjust the opacity based on the time remaining
    return time / initialTime;
  };

  const timerStyle = {
    fontSize: "2rem",
    opacity: calculateOpacity(),
    transition: "opacity 0.5s ease-in-out",
  };

  return (
    <div style={timerStyle}>
      {time === 0 ? "Time's up!" : `Time remaining: ${time} seconds`}
    </div>
  );
};

export default CountdownTimer;
