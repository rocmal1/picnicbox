import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Home from "./routes/Home";
import Room from "./routes/Room";
// React Router is used to provide routing
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    // roomCode param is passed to <Room /> using the useParams hook
    path: "/room/:roomCode",
    element: <Room />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  // Logo font
  <>
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css?family=Bubblegum+Sans"
    ></link>
    <link rel="preconnect" href="https://fonts.googleapis.com"></link>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin></link>
    <link
      href="https://fonts.googleapis.com/css2?family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap"
      rel="stylesheet"
    ></link>
    <RouterProvider router={router} />
  </>
);
