const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gaxw2ro.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  console.log(authorization)
  if (!authorization) {
    return res.status(401).send({error: true, message: 'unauthorized user'});
  }
  const token = authorization.split(' ')[1];
  // console.log('token inside verify jwt', token)
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=> {
    if (err) {
      return res.status(401).send({error: true, message: 'unauthorized user'});
    }
    req.decoded = decoded;
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    const checkOutCollection = client.db("carDoctor").collection("checkOut");

    // jwt
    app.post('/jwt', async(req, res)=> {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
    res.send({token})
    })

    //services routes
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    // checkout routes
    app.get("/checkOut", verifyJWT, async (req, res) => {
      // console.log(req.headers.authorization)
      const decoded = req.decoded;
      console.log('came back after verify', decoded)

      if (decoded.email !== req.query.email) {
        return res.status(403).send({ error: 1, message: 'forbidden access' })
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await checkOutCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/checkOut", async (req, res) => {
      const checkOut = req.body;
      console.log(checkOut);
      const result = await checkOutCollection.insertOne(checkOut);
      res.send(result);
    });
    app.delete("/checkOut/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await checkOutCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/checkOut/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
      console.log(updatedBooking);
      const updateStatus = {
        $set: {
          status: updatedBooking.status,
        },
      };
      const result = await checkOutCollection.updateOne(query, updateStatus);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Car doctor is running");
});

app.listen(port, () => {
  console.log(`The server is running on: ${port}`);
});
