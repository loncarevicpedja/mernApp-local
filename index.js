const express = require("express");
const cors = require("cors");
const { default: mongoose } = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const Exhibition = require("./models/Exhibition");
const News = require("./models/News");
const bcrypt = require("bcrypt");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
// const multer = require("multer");
// const uploadMiddleware = multer({ dest: "uploads/" });
const fs = require("fs");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const salt = bcrypt.genSaltSync(10);
const secret = "dsad32dq";

app.use(cors());

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

mongoose.connect(
  "mongodb+srv://loncarevicpedja:predrag21.07.2000.@cluster0.sedu4sh.mongodb.net/?retryWrites=true&w=majority"
);

const transporter = nodemailer.createTransport({
  service: "Gmail", // Možete koristiti drugi servis ili podešavanja
  auth: {
    user: "onlineizlozba@gmail.com",
    pass: "itsagqlnhszuitgr",
  },
});

const sendVerificationEmail = (email, userId) => {
  const verificationLink = `http://localhost:3000/verify/${userId}`;

  // Slanje e-maila
  const mailOptions = {
    from: "onlineizlozba@gmail.com",
    to: email,
    subject: "Verifikacija naloga",
    html: `<p>Kliknite na sledeći link kako biste verifikovali vaš nalog: <a href="${verificationLink}">Verifikuj se</a></p>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Greška pri slanju e-maila:", error);
    } else {
      console.log("E-mail poslat:", info.response);
    }
  });
};

app.post("/register", async (req, res) => {
  const { username, password, phone, name } = req.body;

  try {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ error: "Uneti email vec postoji." });
    }

    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
      phone,
      name,
      isVerified: false,
    });

    sendVerificationEmail(username, userDoc._id);
    res.status(200).json({ message: "Uspesna registracija." });
  } catch (e) {
    console.log(e);
    res.status(400).json({ error: "Neuspesna registracija." });
  }
});

app.get("/verify/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Verifikacija je uspešna, ažurirajte isVerified svojstvo korisnika u bazi
    await User.findByIdAndUpdate(userId, { isVerified: true });
    res.json({ message: "Korisnik je uspešno verifikovan." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Greška pri ažuriranju korisnika." });
  }
});

app.post("/exhibition", async (req, res) => {
  const { title, duration, description } = req.body;
  try {
    const exhibitionDoc = await Exhibition.create({
      title,
      duration,
      description,
    });
    res.json(exhibitionDoc);
  } catch (e) {
    console.log(e);
    res.status(400).json(e);
  }
});

app.get("/exhibition", async (req, res) => {
  res.json(await Exhibition.find().sort({ createdAt: -1 }).limit(20));
});

app.get("/endexibition/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await Exhibition.findByIdAndUpdate(id, { isActual: false });
    res.json({ message: "Izlozba je zavrsena." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Greška pri zakljucivanju izlozbe." });
  }
});

app.delete("/deleteexhibiton/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const exhibition = await Exhibition.findById(id);

    if (!exhibition) {
      return res.status(404).json({ error: "Exhibition not found." });
    }

    // Prvo obrišite sve postove gde je autor isti kao korisnik koji se briše
    await Post.deleteMany({ exhibition: id });

    // Onda obrišite samog korisnika
    await Exhibition.findByIdAndDelete(id);

    res.json({ message: "Exhibition and their posts deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });

  if (!userDoc || !userDoc.isVerified) {
    return res.status(401).json({ message: "Niste verifikovani." });
  }

  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).json({ id: userDoc._id, username });
    });
  } else {
    res.status(400).json("wrong credentials");
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ message: "Token missing." });
  }

  jwt.verify(token, secret, {}, (err, info) => {
    if (err) {
      console.error("Error verifying token:", err);
      return res.status(401).json({ message: "Token invalid." });
    }
    res.json(info);
  });
});

app.get("/profile/:id", async (req, res) => {
  const { id } = req.params;
  const userDoc = await User.findById(id).populate("username", ["username"]);
  res.json(userDoc);
});

// app.put("/updateuser/:id", uploadMiddleware.none(), async (req, res) => {
//   const { id } = req.params;
//   const { username, phone, name } = req.body;

//   try {
//     const existingUser = await User.findOne({ username }); // Provera postojanja korisničkog imena

//     if (existingUser && existingUser._id.toString() !== id) {
//       return res.status(400).json({ error: "Username already exists." });
//     }

//     const updatedUser = await User.findByIdAndUpdate(
//       id,
//       {
//         username,
//         phone,
//         name,
//       },
//       { new: true }
//     );

//     if (!updatedUser) {
//       return res.status(404).json({ error: "User not found." });
//     }

//     res.json(updatedUser);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Server error." });
//   }
// });

app.put("/changepassword/:id", async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const isCurrentPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordCorrect) {
      return res.status(400).json({ error: "Trenutna lozinka je neispravna." });
    }

    const hashedNewPassword = bcrypt.hashSync(newPassword, salt);

    await User.findByIdAndUpdate(id, { password: hashedNewPassword });

    res.json({ message: "Uspesna izmena lozinke." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

app.get("/users", async (req, res) => {
  res.json(
    await User.find().populate("username", ["username"]).sort({ createdAt: -1 })
  );
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

// app.post("/news", uploadMiddleware.single("file"), async (req, res) => {
//   const { originalname, path } = req.file;
//   const parts = originalname.split(".");
//   const ext = parts[parts.length - 1];
//   const newPath = path + "." + ext;
//   fs.renameSync(path, newPath);

//   const { token } = req.cookies;
//   jwt.verify(token, secret, {}, async (err, info) => {
//     if (err) throw err;
//     const { title, summary, content } = req.body;
//     const newsDoc = await News.create({
//       title,
//       summary,
//       content,
//       cover: newPath,
//     });
//     res.json(newsDoc);
//   });
// });

app.get("/news", async (req, res) => {
  res.json(await News.find().sort({ createdAt: -1 }));
});

app.get("/news/:id", async (req, res) => {
  const { id } = req.params;
  const newsDoc = await News.findById(id).populate("title", ["title"]);
  res.json(newsDoc);
});

// app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
//   const { originalname, path } = req.file;
//   const parts = originalname.split(".");
//   const ext = parts[parts.length - 1];
//   const newPath = path + "." + ext;
//   fs.renameSync(path, newPath);

//   const { token } = req.cookies;
//   jwt.verify(token, secret, {}, async (err, info) => {
//     if (err) throw err;
//     const { title, summary, content, exhibition } = req.body;
//     const postDoc = await Post.create({
//       title,
//       summary,
//       content,
//       cover: newPath,
//       author: info.id,
//       exhibition,
//     });
//     res.json(postDoc);
//   });
// });

// app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
//   let newPath = null;
//   if (req.file) {
//     const { originalname, path } = req.file;
//     const parts = originalname.split(".");
//     const ext = parts[parts.length - 1];
//     const newPath = path + "." + ext;
//     fs.renameSync(path, newPath);
//   }

//   const { token } = req.cookies;
//   jwt.verify(token, secret, {}, async (err, info) => {
//     if (err) throw err;
//     const { id, title, summary, content, exhibition } = req.body;
//     const postDoc = await Post.findById(id);
//     const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
//     if (!isAuthor) {
//       return res.status(400).json("you are not the author");
//     }
//     await postDoc.updateOne({
//       title,
//       summary,
//       content,
//       cover: newPath ? newPath : postDoc.cover,
//       exhibition,
//     });
//     res.json(postDoc);
//   });
// });

app.get("/post-two", async (req, res) => {
  res.status(200).send({ message: "RADI" });
});

app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

app.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Prvo pronađite post koji želite da obrišete
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }
    // Ako je sve u redu, obrišite post
    await Post.findByIdAndDelete(id);
    res.json({ message: "Post successfully deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

app.delete("/deletenews/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Prvo pronađite post koji želite da obrišete
    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({ error: "News not found." });
    }
    // Ako je sve u redu, obrišite post
    await News.findByIdAndDelete(id);
    res.json({ message: "News successfully deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

app.delete("/deleteuser/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Prvo obrišite sve postove gde je autor isti kao korisnik koji se briše
    await Post.deleteMany({ author: id });

    // Onda obrišite samog korisnika
    await User.findByIdAndDelete(id);

    res.json({ message: "User and their posts deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

app.get("/exhibition/:id", async (req, res) => {
  const { id } = req.params;
  const exhibitionDoc = await Exhibition.findById(id).populate("title", [
    "title",
  ]);
  res.json(exhibitionDoc);
});

app.get("/post/:exhibition", async (req, res) => {
  const { exhibition } = req.params;
  const postDoc = await Post.findById(exhibition);
  res.json(postDoc);
});

app.post("/like/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;
  try {
    const postDoc = await Post.findById(postId);
    if (!postDoc || !userId) {
      return res.status(404).json({ error: "User ID problem: " + userId });
    }
    postDoc.likes.push(userId);
    await postDoc.save();
    const numLikes = postDoc.likes.length;
    res.json({ message: `${numLikes}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

app.post("/dislike/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  try {
    const postDoc = await Post.findById(postId);
    if (!postDoc || !userId) {
      return res.status(404).json({ error: "User ID problem: " + userId });
    }

    // Pronađite indeks korisnikovog ID-ja u nizu likes
    const userIndex = postDoc.likes.indexOf(userId);

    if (userIndex === -1) {
      return res.status(400).json({ error: "User hasn't liked this post." });
    }

    // Uklonite korisnikov ID iz niza likes i sačuvajte izmene
    postDoc.likes.splice(userIndex, 1);
    await postDoc.save();
    const numLikes = postDoc.likes.length;
    res.json({ message: `${numLikes}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

app.get("/users/search", async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ error: "Niste naveli ime za pretragu." });
  }

  try {
    const results = await User.find({
      name: { $regex: name, $options: "i" }, // "i" označava da je pretraga case-insensitive
    });

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Greška pri pretrazi korisnika." });
  }
});

app.listen(4015);

module.exports = app;

//predrag21.07.2000.
//mongodb+srv://loncarevicpedja:predrag21.07.2000.@cluster0.sedu4sh.mongodb.net/?retryWrites=true&w=majority
//mongodb+srv://loncarevicpedja:predrag21.07.2000.@cluster0.sedu4sh.mongodb.net/?retryWrites=true&w=majority
