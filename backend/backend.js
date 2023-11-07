// Load environment variables from './.env' into process.env variables
const dotenv = require('dotenv').config();

// Create express server
const express = require('express');
const app = express();

// Import MongoDB for use with MongoDB Atlas database
const { MongoClient, ServerApiVersion } = require('mongodb');

// Use cors package middleware to allow cross-origin resource sharing
const cors = require('cors');
app.use(cors());


// MongoDB Atlas URI includes the username and password.  Set this using an environment variable.
const mongoUri = "mongodb+srv://" + process.env.MONGO_USER + ":" + process.env.MONGO_PW + "@picnicbox.6plwhts.mongodb.net/?retryWrites=true&w=majority";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const mongoClient = new MongoClient(mongoUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect to the MongoDB Atlas cluster
async function mongoConnect() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await mongoClient.connect();
    // Send a ping to confirm a successful connection
    await mongoClient.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    console.log('Error connecting to MongoDB Atlas: ', err)
  }
}
mongoConnect()
const db = mongoClient.db('picnicbox_db');




// ** ROUTES **
/////////////////////////////////////
app.get('/', (req, res) => {
    res.send('Successful response.');
})

// A post request to /newroom will create a new room and return the room code to the client
app.post('/newroom', (req, res) => {

    let collection = db.collection('rooms');
    let query = {};

    async function call() {
        let results = await collection.find(query).toArray();
        console.log(results);
        res.send(results);
    }
    call();
});


// When a client requests to join a room, they specify a room code in the GET uri
app.get('/joinroom/:roomCode', (req, res) => {
    // Grab the room code from the URL parameters
    let roomCode = req.params.roomCode;
    console.debug('Recieved request to join room:', roomCode);

    // Query if the room exists
    let collection = db.collection('rooms');
    let query = { code: roomCode };
    (async () => {
        try {
            let results = await collection.find(query).toArray();

            // If there is only one result, this was successful.
            if(results.length === 1) {
                console.debug("Found room: ", results[0]);
                res.status(200);
                res.send();
            }

            // If there are no results, the room does not exist.
            else if(results.length === 0) {
                console.debug("Could not find room:", roomCode);
                res.status(404);
                res.send();
            }

            // If there are multiple results, this is an error.
            else {
                console.error("Error: Multiple rooms found when trying join on", roomCode, "\nSee:", results);
            }
        } catch (e) {
            console.error("Error: Unable to query the database for rooms - see: ", e);
        }
        
    })();
})


app.listen(3001, () => console.log('Example app is listening on port 3001.'));