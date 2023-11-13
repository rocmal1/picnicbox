function dbCreateUser(_user) {
  const col = db.collection("users");

  col
    .insertOne({ _user })
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
