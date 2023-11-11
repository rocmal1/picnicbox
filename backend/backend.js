// Load environment variables from './.env' into process.env variables
const dotenv = require("dotenv").config();
// socket.io websocket server
const { Server } = require("socket.io");
const { createServer } = require("node:http");
// Create express server
const express = require("express");
const app = express();
const httpServer = createServer(app);
// Use json middleware to attach POST request json as request.body
app.use(express.json());

// Import MongoDB for use with MongoDB Atlas database
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Use cors package middleware to allow cross-origin resource sharing
const cors = require("cors");
app.use(cors());

// DATABASE SETUP
//////////////////////
// MongoDB Atlas URI includes the username and password.  Set this using an environment variable.
const mongoUri =
  "mongodb+srv://" +
  process.env.MONGO_USER +
  ":" +
  process.env.MONGO_PW +
  "@picnicbox.6plwhts.mongodb.net/?retryWrites=true&w=majority";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const mongoClient = new MongoClient(mongoUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Connect to the MongoDB Atlas cluster
async function mongoConnect() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await mongoClient.connect();
    // Send a ping to confirm a successful connection
    await mongoClient.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (err) {
    console.log("Error connecting to MongoDB Atlas: ", err);
  }
}
mongoConnect();
const db = mongoClient.db("picnicbox_db");

// ** ROUTES **
/////////////////////////////////////
app.get("/", (req, res) => {
  res.send("Successful response.");
});

app.post("/user", (req, res) => {
  let collection = db.collection("users");
  console.debug("Recieved request to add user name", req.body.name);
  collection
    .insertOne({
      timestamp: Date.now(),
      name: req.body.name,
      roomID: null,
      socketID: null,
      debug: true,
    })
    .then((result) => {
      res.status(200);
      res.send({
        userID: result.insertedId,
      });
    })
    .catch((error) => {
      res.status(500);
      res.send(error);
    });
});

// A post request to /newroom will create a new room and return the room code to the client
app.post("/newroom", (req, res) => {
  // The collection we'll be working in
  let collection = db.collection("rooms");

  // Post body contains userID of the owner
  let leaderUserID = req.body.userID;

  // Generate a 4-character sequence of capital letters
  // Used to create room code
  function generateRandomLetters(length) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * letters.length);
      result += letters.charAt(randomIndex);
    }
    return result;
  }

  // Generate a room code then query the DB to see if it exists
  // If it already exists, generate another and try again up to maxRequests
  async function tryToCreateRoom(leaderID) {
    let newRoomCode = "";
    let maxRequests = 10;
    let countRequests = 0;
    while (!newRoomCode && countRequests <= maxRequests) {
      countRequests++;
      let tryRoomCode = generateRandomLetters(4);
      let query = { code: tryRoomCode };
      console.debug("Searching for room code:", newRoomCode);
      try {
        let results = await collection.find(query).toArray();
        if (results.length > 0) {
          continue;
        }
        newRoomCode = tryRoomCode;
      } catch (error) {
        console.error(error);
      }
    }

    // Throw an error if the newRoomCode is still = ""
    if (newRoomCode === "") {
      console.error(
        "Error: Could not create a room after",
        countRequests,
        "attempts"
      );
      res.status(500);
      res.send(
        "Error: Could not create a room after",
        countRequests,
        "attempts"
      );
    }
    // Create the room object and add it to the database
    collection
      .insertOne({
        timestamp: Date.now(),
        roomCode: newRoomCode,
        leaderID: leaderID,
        debug: true,
      })
      .then((result) => {
        console.debug(result);
        // Send the roomCode of the object to the client
        // TODO:  Optimize this to use the unique _id instead of the roomCode.
        //        Requires frontend to send join request using _id.
        res.status(200);
        res.send({ roomCode: newRoomCode });
      })
      .catch((error) => {
        console.error("Error: Unable to create new room in database:", error);
        res.status(500);
        res.send("Error: Unable to create new room in database:", error);
      });
  }
  tryToCreateRoom(leaderUserID);
});

// When a client requests to join a room, they specify a room code in the GET uri
app.get("/joinroom/:roomCode", (req, res) => {
  // Grab the room code from the URL parameters
  let roomCode = req.params.roomCode;
  console.debug("Recieved request to join room:", roomCode);

  // Query if the room exists
  let collection = db.collection("rooms");
  let query = { roomCode: roomCode };
  (async () => {
    try {
      let results = await collection.find(query).toArray();

      // If there is only one result, this was successful.
      // A client is going to join the room.
      if (results.length === 1) {
        console.debug("Found room: ", results[0]);
        res.status(200);
        res.send({ roomCode: roomCode });
      }

      // If there are no results, the room does not exist.
      else if (results.length === 0) {
        console.debug("Could not find room:", roomCode);
        res.status(404);
        res.send();
      }

      // If there are multiple results, this is an error.
      else {
        console.error(
          "Error: Multiple rooms found when trying join on",
          roomCode,
          "\nSee:",
          results
        );
        res.status(500);
        res.send("Error: Multiple rooms found. This is a database error.");
      }
    } catch (e) {
      // If there is an actual error of some other kind
      console.error("Error: Unable to query the database for rooms - see: ", e);
      res.status(500);
      res.send("Error: Unable to query the database for rooms.");
    }
  })();
});

const io = new Server(httpServer, {
  // Required for cross-origin resource sharing
  cors: {
    origin: "http://localhost:3000",
  },
});

// When websocket connection is established with client
io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    console.log("user disconnected");
    // We need to find the roomCode of the disconnected socket and alert the rest of the room they left
    // First, find the userID based on socketID
    const collection = db.collection("users");
    const query = { socketID: socket.id };
    collection.findOne(query).then((usersDoc) => {
      try {
        // Remove the user from the array of userIDs in the rooms doc
        const roomCollection = db.collection("rooms");
        const roomQuery = { _id: new ObjectId(usersDoc.roomID) };
        roomCollection.updateOne(roomQuery, {
          $pull: { userIDs: usersDoc.userID },
        });
      } catch (error) {
        console.debug(error);
      }
    });

    // Remove the room and the socket from the user doc
    collection.updateOne(query, {
      $set: { socketID: null },
      $set: { roomID: null },
    });
  });

  // This signal is emitted by the client on pageload
  // It contains the roomCode and userID of the client
  // We store the userID in the room associated with the roomCode and store the socketID in the
  // user associated with the userID
  socket.on("sendUserInfo", (data) => {
    // If we don't have complete data, do nothing
    if (!data.userID || !data.roomCode) {
      return;
    }
    console.debug("UserID", data.userID, "connected to room", data.roomCode);
    // Attach the socket (client) to a room for future broadcasting
    socket.join(data.roomCode);

    // ** Add the user to the room in the database and vice-versa
    // Check if the user is already in the room in the database
    const collection = db.collection("rooms");
    const query = { roomCode: data.roomCode };
    collection.findOne(query).then((doc) => {
      // If the userIDs field does not exist or if the userIDs array
      // in the database does not already contains this userID, add the new userID to the room
      if (!doc.userIDs || !doc.userIDs.includes(data.userID)) {
        collection.updateOne(query, {
          $push: { userIDs: data.userID },
        });
      }

      // ** Add the roomID to the user in the database
      // ** Add the socketID to the user in the database
      const userCollection = db.collection("users");
      const userQuery = { _id: new ObjectId(data.userID) };
      userCollection.updateOne(userQuery, {
        $set: { roomID: doc._id },
        $set: { socketID: socket.id },
      });
    });
  });

  // askLeaderID gets response tellLeaderID
  socket.on("askLeaderID", (userID, roomCode) => {
    console.debug("UserID", userID, "requests leader of room", roomCode);

    // Query the leaderID of the room and send it to the client
    let collection = db.collection("rooms");
    let query = { roomCode: roomCode };

    collection
      .findOne(query)
      .then((results) => {
        socket.emit("tellLeaderID", results.leaderID);
      })
      .catch((error) => {
        socket.emit("tellLeaderID", null);
        console.error(error);
      });
  });
});

setInterval(() => {
  io.to("HJME").emit("hello");
}, 5000);

// io.on("sendUserInfo", (userID, roomCode) => {
//   console.debug("UserID", userID, "connected to room", roomCode);
// });

httpServer.listen(3001, () => {
  console.log("Example app is listening on port 3001.");
});
