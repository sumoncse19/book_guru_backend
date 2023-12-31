const express = require("express");
const app = express();
require("dotenv").config();

const port = process.env.PORT || 5000;
const cors = require("cors");
// const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const path = require("path");

app.use(cors());
/* 
const corsConfig = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
};
app.use(cors(corsConfig));
app.options("*", cors(corsConfig));
 */
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yi4wr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Define an asynchronous hash function
const bcrypt = require("bcrypt");
const saltRounds = 10;
const hashPassword = async (password) => {
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (err) {
    console.error(err);
    // Handle error appropriately
  }
};

const run = async () => {
  try {
    const dataBase = client.db("book_guru");

    const usersCollection = dataBase.collection("users");
    const allBooksCollection = dataBase.collection("allBooks");
    const reviewsCollection = dataBase.collection("reviews");

    // For register new user
    app.post("/signup", async (req, res) => {
      let user = "";
      let isExist = "";
      req.body.authKey = Math.floor(Math.random() * 10000000000);

      // Hash a password:
      const hashedPassword = await hashPassword(req.body.password);
      req.body.password = hashedPassword;

      user = req.body;
      isExist = await usersCollection.find({ email: req.body.email }).toArray();
      if (isExist.length === 0) {
        const result = await usersCollection.insertOne(user);
        result.message = "Account created successfully";
        result.name = req.body.name;
        result.email = req.body.email;
        res.send(result);
      } else {
        res.send({ message: "User already exist" });
      }
    });

    // For login
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      try {
        const user = await usersCollection.findOne({ email: email });
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        // Compare provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).send({ message: "Invalid credentials" });
        } else {
          const { password, ...userWithoutPassword } = user;
          res.send({
            message: "Login successful",
            user: userWithoutPassword,
          });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred" });
      }
    });

    app.get("/books", async (req, res) => {
      const cursor = allBooksCollection.find({});
      const books = await cursor.toArray();

      res.send({ status: true, data: books });
    });

    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;
      const book = await allBooksCollection.findOne({ _id: new ObjectId(id) });
      res.send({ status: true, data: book });
    });

    app.post("/book", async (req, res) => {
      const book = req.body;

      const result = await allBooksCollection.insertOne(book);

      res.send(result);
    });

    app.put("/book", async (req, res) => {
      const { _id, title, author, genre, publicationDate, image } = req.body;
      const result = await allBooksCollection.updateOne(
        { _id: new ObjectId(_id) },
        { $set: { title, author, genre, publicationDate, image } },
        { upsert: true }
      );

      res.send(result);
    });

    app.delete("/book/:id", async (req, res) => {
      const id = req.params.id;
      const result = await allBooksCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    app.get("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const reviews = await reviewsCollection.find({ bookId: id }).toArray();
      await Promise.all(
        reviews.map(async (review) => {
          const user = await usersCollection.findOne({
            _id: new ObjectId(review.userId),
          });
          review.user = user;
          return review;
        })
      );
      res.send(reviews);
    });
    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);

      res.send(result);
    });
  } finally {
  }
};

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});
