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

async function getRoomConnectedUsersAndLeader(roomQuery) {
  const roomDoc = await roomColl.findOne(roomQuery);
  // Get all users that have socketIds and update the room with their usernames
  // Filter out users with empty socketIds
  let usersArray = roomDoc.users.filter((user) => user.socketId);
  let leaderUser = usersArray.find(
    (user) => user._id.toString() === roomDoc.leaderId.toString()
  );

  return { usersArray, leaderUser };
}

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
      let leaderUser = usersArray.find(
        (user) => user._id.toString() === roomDoc.leaderId.toString()
      );

      io.to(roomCode).emit("sUpdateConnectedUsers", {
        users: usersArray,
        leaderName: leaderUser.name,
      });
    })();
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    try {
      (async () => {
        const query = { "users.socketId": socket.id };
        const roomDoc = await roomColl.findOne(query);
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
          leaderName: leaderUser.name,
        });
      })();
    } catch (e) {
      console.log(e);
    }
  });
});
// // When websocket connection is established with client
// io.on("connection", (socket) => {
//   socket.on("disconnect", () => {
//     // console.log("user disconnected");
//     // We need to find the roomCode of the disconnected socket and alert the rest of the room they left
//     // First, find the userID based on socketID
//     const userCollection = db.collection("users");
//     const userQuery = { socketID: socket.id };

//     // Find the userDoc associated with the dc socket
//     userCollection.findOne(userQuery).then((usersDoc) => {
//       // Remove the user's userID from the array of userIDs in the rooms doc
//       try {
//         const roomCollection = db.collection("rooms");
//         const roomQuery = { _id: usersDoc.roomID };

//         roomCollection.findOne(roomQuery).then((roomDoc) => {
//           // Emit to the socket room that the userName has disconnected
//           io.to(roomDoc.roomCode).emit("userDisconnect", usersDoc.name);
//         });

//         roomCollection.updateOne(roomQuery, {
//           $pull: { userIDs: usersDoc._id.toString() },
//         });
//       } catch (error) {}
//     });

//     // Remove the room and the socket from the user doc
//     userCollection.updateOne(userQuery, {
//       $set: { socketID: "", roomID: "" },
//     });
//   });

//   // This signal is emitted by the client on pageload
//   // It contains the roomCode and userID of the client
//   // We store the userID in the room associated with the roomCode and store the socketID in the
//   // user associated with the userID
//   socket.on("sendUserInfo", (data) => {
//     // If we don't have complete data, do nothing
//     if (!data.userID || !data.roomCode) {
//       return;
//     }
//     console.debug("UserID", data.userID, "connected to room", data.roomCode);

//     // Attach the socket (client) to a room for future broadcasting
//     socket.join(data.roomCode);

//     // ** Add the user to the room document and vice-versa

//     const roomCollection = db.collection("rooms");
//     const roomQuery = { roomCode: data.roomCode };
//     const userCollection = db.collection("users");
//     const userQuery = { _id: new ObjectId(data.userID) };

//     roomCollection.findOne(roomQuery).then((roomDoc) => {
//       (async () => {
//         // Retrieve the room doc from the database
//         let roomDoc = await roomCollection.findOne(roomQuery);

//         let userNames = [];
//         let currentlyConnectedUserIDs = roomDoc.userIDs;

//         // If the current userID is not listed in the room, add it
//         if (!roomDoc.userIDs.includes(data.userID)) {
//           await roomCollection.updateOne(roomQuery, {
//             $push: { userIDs: data.userID },
//           });
//           currentlyConnectedUserIDs = [
//             ...currentlyConnectedUserIDs,
//             data.userID,
//           ];
//         }

//         // Retrieve the updated room doc from the database
//         roomDoc = await roomCollection.findOne(roomQuery);

//         // Get usernames and send to the clients as emit("updateUserNames")
//         console.log("currentlyConnectedUserIDs", currentlyConnectedUserIDs);
//         for (let i = 0; i < currentlyConnectedUserIDs.length; i++) {
//           // Loop through the currentlyConnecetedUserIDs and get each's username
//           let curUserDoc = await userCollection.findOne(
//             new ObjectId(currentlyConnectedUserIDs[i])
//           );
//           let curUserName = curUserDoc.name;
//           // // console.log(
//           //   "UserID: ",
//           //   currentlyConnectedUserIDs[i],
//           //   "User Name:",
//           //   curUserName
//           // );
//           userNames = [...userNames, curUserName];
//           // console.log(i);
//           if (i === currentlyConnectedUserIDs.length - 1) {
//             console.log(":: Usernames:", userNames);
//             io.to(data.roomCode).emit("updateUserNames", userNames);
//           }
//         }
//       })();
//     });
//   });

//   // askLeaderID gets response tellLeaderID
//   socket.on("askLeaderID", (userID, roomCode) => {
//     // console.debug("UserID", userID, "requests leader of room", roomCode);

//     // Query the leaderID of the room and send it to the client
//     let collection = db.collection("rooms");
//     let query = { roomCode: roomCode };

//     collection
//       .findOne(query)
//       .then((results) => {
//         socket.emit("tellLeaderID", results.leaderID);
//       })
//       .catch((error) => {
//         socket.emit("tellLeaderID", null);
//         console.error(error);
//       });
//   });
// });

// setInterval(() => {
//   io.to("HJME").emit("hello");
// }, 5000);

// io.on("sendUserInfo", (userID, roomCode) => {
//   console.debug("UserID", userID, "connected to room", roomCode);
// });

httpServer.listen(3001, () => {
  console.log("Example app is listening on port 3001.");
});
