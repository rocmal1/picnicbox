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

// // GET request to /user
// app.get("/user", (req, res) => {
//   let collection = db.collection("users");
//   let userID = req.body.userID;
//   let query = { userID: userID };
//   collection
//     .findOne(query)
//     .then((doc) => {
//       // If the user exists response CODE 200 (OK)
//       res.status(200);
//       res.send();
//     })
//     .catch((error) => {
//       // Otherwise tell the client that user does not exist
//       res.status(404);
//       res.send(error);
//     });
// });

// // A post request to /newroom will create a new room and return the room code to the client
// app.post("/newroom", (req, res) => {
//   // The collection we'll be working in
//   let collection = db.collection("rooms");

//   // Post body contains userID of the owner
//   let leaderUserID = req.body.userID;

//   // Generate a 4-character sequence of capital letters
//   // Used to create room code
//   function generateRandomLetters(length) {
//     const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
//     let result = "";
//     for (let i = 0; i < length; i++) {
//       const randomIndex = Math.floor(Math.random() * letters.length);
//       result += letters.charAt(randomIndex);
//     }
//     return result;
//   }

//   // Generate a room code then query the DB to see if it exists
//   // If it already exists, generate another and try again up to maxRequests
//   async function tryToCreateRoom(leaderID) {
//     let newRoomCode = "";
//     let maxRequests = 10;
//     let countRequests = 0;
//     while (!newRoomCode && countRequests <= maxRequests) {
//       countRequests++;
//       let tryRoomCode = generateRandomLetters(4);
//       let query = { code: tryRoomCode };
//       console.debug("Searching for room code:", newRoomCode);
//       try {
//         let results = await collection.find(query).toArray();
//         if (results.length > 0) {
//           continue;
//         }
//         newRoomCode = tryRoomCode;
//       } catch (error) {
//         console.error(error);
//       }
//     }

//     // Throw an error if the newRoomCode is still = ""
//     if (newRoomCode === "") {
//       console.error(
//         "Error: Could not create a room after",
//         countRequests,
//         "attempts"
//       );
//       res.status(500);
//       res.send(
//         "Error: Could not create a room after",
//         countRequests,
//         "attempts"
//       );
//     }
//     // Create the room object and add it to the database
//     collection
//       .insertOne({
//         timestamp: Date.now(),
//         roomCode: newRoomCode,
//         leaderID: leaderID,
//         userIDs: [],
//         debug: debug,
//       })
//       .then((result) => {
//         console.debug(result);
//         // Send the roomCode of the object to the client
//         // TODO:  Optimize this to use the unique _id instead of the roomCode.
//         //        Requires frontend to send join request using _id.
//         res.status(200);
//         res.send({ roomCode: newRoomCode });
//       })
//       .catch((error) => {
//         console.error("Error: Unable to create new room in database:", error);
//         res.status(500);
//         res.send("Error: Unable to create new room in database:", error);
//       });
//   }
//   tryToCreateRoom(leaderUserID);
// });

// // When a client requests to join a room, they specify a room code in the GET uri
// app.get("/joinroom/:roomCode", (req, res) => {
//   // Grab the room code from the URL parameters
//   let roomCode = req.params.roomCode;
//   console.debug("Recieved request to join room:", roomCode);

//   // Query if the room exists
//   let collection = db.collection("rooms");
//   let query = { roomCode: roomCode };
//   (async () => {
//     try {
//       let results = await collection.find(query).toArray();

//       // If there is only one result, this was successful.
//       // A client is going to join the room.
//       if (results.length === 1) {
//         console.debug("Found room: ", results[0]);
//         res.status(200);
//         res.send({ roomCode: roomCode });
//       }

//       // If there are no results, the room does not exist.
//       else if (results.length === 0) {
//         console.debug("Could not find room:", roomCode);
//         res.status(404);
//         res.send();
//       }

//       // If there are multiple results, this is an error.
//       else {
//         console.error(
//           "Error: Multiple rooms found when trying join on",
//           roomCode,
//           "\nSee:",
//           results
//         );
//         res.status(500);
//         res.send("Error: Multiple rooms found. This is a database error.");
//       }
//     } catch (e) {
//       // If there is an actual error of some other kind
//       console.error("Error: Unable to query the database for rooms - see: ", e);
//       res.status(500);
//       res.send("Error: Unable to query the database for rooms.");
//     }
//   })();
// });

const io = new Server(httpServer, {
  // Required for cross-origin resource sharing
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection", (socket) => {
  console.log("User connected");
  socket.on("cSendUserInfo", (data) => {
    (async () => {
      // Update the user's socketId db entry
      if (!data.code || !data.userId) {
        return;
      }
      console.log("Recieved userInfo: ", data);
      let thisUserId = new ObjectId(data.userId);
      let query = { code: data.code, "users._id": thisUserId };
      await roomColl.updateOne(query, {
        $set: { "users.$.socketId": socket.id },
      });

      // Add the user to the socket room
      socket.join(data.code);

      // Get all users that have socketIds and update the room with their usernames
      let roomDoc = await roomColl.findOne({
        code: data.code,
      });
      let usersArray = roomDoc.users;
      let userNamesArray = [];
      let leaderUser = usersArray.find(
        (user) => user._id.toString() === roomDoc.leaderId.toString()
      );
      let leaderName = leaderUser.name;
      io.to(data.code).emit("sUpdateConnectedUsers", {
        users: roomDoc.users,
        leaderName: leaderName,
      });
    })();
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    // Remove socketId from db entry
    let query = { "users.socketId": socket.id };
    roomColl.updateOne(query, { $set: { "users.$.socketId": "" } });
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
