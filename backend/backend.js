// TODO:
// Rewrite user-tracking system to emit the list of all connected users on disconnect/reconnect instead of just the one connecting/disconnecting
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
const { rmSync } = require("node:fs");
app.use(cors());

// This will add "debug: true" to all new DB entries
const debug = true;

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
const roomColl = db.collection("rooms");
// ** ROUTES **
/////////////////////////////////////
app.get("/", (req, res) => {
  res.send("Successful response.");
});

// DELETE ALL DOCUMENTS WITH "debug: true" IN THE DATABASE
app.delete("/debug", (req, res) => {
  let responseArray = [];
  db.collections().then((collections) => {
    for (let i = 0; i < collections.length; i++) {
      collections[i].deleteMany({ debug: true }).then((result) => {
        responseArray[i] =
          "Deleted " +
          result.deletedCount.toString() +
          " documents from " +
          collections[i].collectionName;
        console.debug(responseArray[i]);
        if (i === collections.length) {
          res.status(200);
          res.send(responseArray);
        }
      });
    }
  });
});

// *** Client requests available gamelists for quippage
app.get("/lists/quippage", (req, res) => {
  const quippageListsColl = db.collection("gamelists_quippage");
  quippageListsColl
    .find()
    .toArray()
    .then((gamelists) => {
      console.log("Sending", gamelists);
      res.status(200);
      res.send(gamelists);
    });
});

// *** Client requests to join a room
app.post("/join/:roomCode/", (req, res) => {
  const roomCode = req.params.roomCode;
  console.log("Recieved request to join", roomCode);
  const name = req.body.name;
  const userId = req.body.userId;

  (async () => {
    // If the requested room DNE then respond 404
    const roomDoc = await roomColl.findOne({ code: roomCode });
    console.log("roomDoc is", roomDoc);
    if (!roomDoc) {
      console.log("Room", roomCode, "DNE");
      res.status(404).send("Room '", roomCode, "' does not exist");
    }

    // If the client has a userId cookie, check if they are re-joining the room
    if (userId) {
      const thisUserIfInRoom = roomDoc.users.find(
        (user) => user._id.toString() === req.body.userId
      );
      if (thisUserIfInRoom) {
        // Update their name in db if they are submitting a different one
        if (thisUserIfInRoom.name !== name) {
          let query = { code: roomCode, "users._id": thisUserIfInRoom._id };
          await roomColl.updateOne(query, {
            $set: { "users.$.name": socket.id },
          });
        }
        // Tell client it's OK to re-join the room
        res.status(200);
        res.send({ code: roomCode, userId: userId });
      }
    }

    // No cookie sent means we must create a user for that room before the client may join
    let newUser = {
      _id: new ObjectId(),
      name: name,
      socketId: "",
    };
    // Add the new user to the room
    const query = { code: roomCode };
    const update = {
      $push: {
        users: {
          $each: [newUser],
        },
      },
    };
    await roomColl.updateOne(query, update);

    res.status(200);
    res.send({ code: roomCode, userId: newUser._id.toString() });
  })();
});

// Client checks if a room exists
app.get("/room/:roomCode", (req, res) => {
  const roomCode = req.params.roomCode;
  (async () => {
    const roomDoc = await roomColl.findOne({ code: roomCode });
    if (roomDoc) res.status(200).send();
    res.status(404).send();
  })();
});

// *** Client requests to make a new room
app.post("/room/new", (req, res) => {
  (async () => {
    // ** Create new empty user
    let newUser = {
      _id: new ObjectId(),
      name: "",
      socketId: "",
    };

    // ** Create new empty room
    let newRoom = {
      code: "",
      users: [],
      leaderId: "",
      debug: debug,
    };

    let responseData = {
      userId: "",
      code: "",
    };

    // The client always sends a name, assign it as user.name
    newUser.name = req.body.name;

    // Add newUser to the room
    newRoom.users = [...newRoom.users, newUser];

    // Add newUser as room leader
    newRoom.leaderId = newUser._id;

    // Add newUser's ObjectId to the response
    responseData.userId = newUser._id.toString();

    // * Function to generate code letter combinations
    function generateRandomLetters(length) {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let result = "";
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * letters.length);
        result += letters.charAt(randomIndex);
      }
      return result;
    }

    // * Generate an unused code and assign it to newRoom.code
    try {
      let maxAttempts = 100;
      let countAttempts = 0;
      while (!newRoom.code && countAttempts <= maxAttempts) {
        countAttempts++;
        let tryCode = generateRandomLetters(4);
        // Return an empty array if there is no room with the same code
        let roomDoc = await roomColl.find({ code: tryCode }).toArray();
        // If a room with the same code exists, repeat loop to generate another
        if (roomDoc.length > 0) {
          continue;
        }
        // Set room and response codes
        newRoom.code = tryCode;
        responseData.code = tryCode;
      }
      if (!newRoom.code) {
        throw new Error(
          "Unable to generate a unique room code after",
          countAttempts,
          "attempts."
        );
      }
    } catch (e) {
      console.error(e);
      res.status(500);
      res.send("Server error:", e.message);
    }

    try {
      // Create the new room in the db
      await roomColl.insertOne(newRoom);
      // Send a CREATED response with new userId and new room code
      res.status(201);
      res.send(responseData);
      console.log("Created Room", newRoom);
    } catch (e) {
      console.error(e);
    }
  })();
});

///
/// ************************ WEBSOCKET ************************
///
const io = new Server(httpServer, {
  // Required for cross-origin resource sharing
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection", (socket) => {
  console.log("User connected");
  socket.on("cSendUserInfo", (data) => {
    let roomCode = data.code;
    let userId = data.userId;
    (async () => {
      // Update the user's socketId db entry
      if (!roomCode || !userId) {
        return;
      }
      console.log("Recieved userInfo: ", data);
      const thisUserId = new ObjectId(userId);
      const query = { code: data.code, "users._id": thisUserId };
      // Update the user's socketId & join socket room
      await roomColl.updateOne(query, {
        $set: { "users.$.socketId": socket.id },
      });
      socket.join(roomCode);

      const roomDoc = await roomColl.findOne({ code: roomCode });
      // Get all users that have socketIds and update the room with their usernames
      // Filter out users with empty socketIds
      let usersArray = roomDoc.users.filter((user) => user.socketId);
      // let leaderUser = usersArray.find(
      //   (user) => user._id.toString() === roomDoc.leaderId.toString()
      // );
      let leaderId = roomDoc.leaderId;
      let leaderUser = usersArray.find(
        (user) => user._id.toString() === leaderId.toString()
      );
      if (!leaderUser) leaderUser = usersArray[0];
      io.to(roomCode).emit("sUpdateConnectedUsers", {
        users: usersArray,
        leaderUser: leaderUser,
      });
    })();
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    try {
      (async () => {
        const query = { "users.socketId": socket.id };
        const roomDoc = await roomColl.findOne(query);
        if (!roomDoc) return;
        const roomCode = roomDoc.code;

        // Remove socketId from db entry
        await roomColl.updateOne(query, {
          $set: { "users.$.socketId": "" },
        });
        const roomDocAfterDisconnect = await roomColl.findOne({
          code: roomCode,
        });

        // Get all users that have socketIds and update the room with their usernames
        // Filter out users with empty socketIds
        let usersArray = roomDocAfterDisconnect.users.filter(
          (user) => user.socketId !== ""
        );
        let leaderUser = usersArray.find(
          (user) => user._id.toString() === roomDoc.leaderId.toString()
        );
        // If the leaderUser is the one who disconnected, set leader to the next user
        if (!leaderUser) leaderUser = usersArray[0];

        console.debug("usersArrayAfterFilter:", usersArray);

        io.to(roomCode).emit("sUpdateConnectedUsers", {
          users: usersArray,
          leaderUser: leaderUser,
        });
      })();
    } catch (e) {
      console.log(e);
    }
  });

  socket.on("cRequestGameLists", (data) => {
    switch (data.gamemode) {
      case "Quippage":
        (async () => {
          const coll = db.collection("quippage_gamelists");
          const gameLists = coll.find().toArray();
          io.emit;
        })();

      default:
        return;
    }
  });
});

httpServer.listen(3001, () => {
  console.log("Example app is listening on port 3001.");
});
