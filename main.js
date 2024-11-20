const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const cors = require("cors");
const bodyParser = require('body-parser');
const multer = require('multer');

dotenv.config();
const app = express();
const PORT = 3000;

app.use(express.json());  // To parse JSON bodies

app.use(cors({ origin: '*' }));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() }); // Memory storage keeps files in memory as buffers


// MySQL Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database');
});




app.post('/user/register', async (req, res) => {
    const { username, email, password ,userType} = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please provide username, email, and password' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = 'INSERT INTO registration (username, email, password,user_type ) VALUES (?, ?, ?, ?)';
        db.query(query, [username, email, hashedPassword,userType], (err, results) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Email already exists' });
                } else {
                    return res.status(500).json({ message: 'Database error', error: err });
                }
            }
            res.status(201).json({ message: 'User registered successfully', userid: results.insertId });
        });
    } catch (error) {
        res.status(500).json({ message: 'Error hashing password', error });
    }

});


app.post('/add-artwork', upload.single('artwork_image'), (req, res) => {
    console.log('Request Body:', req.body);
    console.log('Uploaded File:', req.file);
  
    if (!req.file) {
      return res.status(400).send({ error: 'Artwork Image is required' });
    }
  
    const { artwork_name, price, about_artwork, artist_email } = req.body; // Use artist_email from the request body
    const artwork_image = req.file;
  
    // Step 1: Find artist_id based on the provided email
    const findArtistQuery = `
      SELECT userid 
      FROM registration 
      WHERE email = ?
    `;
  
    db.query(findArtistQuery, [artist_email], (err, results) => {
      if (err) {
        console.error('Database Error (Finding Artist):', err);
        return res.status(500).send({ error: 'Database error occurred while finding artist' });
      }
  
      if (results.length === 0) {
        return res.status(404).send({ error: 'Artist not found with the given email' });
      }
  
      const artist_id = results[0].userid;
  
      // Step 2: Insert the artwork using the found artist_id
      const insertArtworkQuery = `
        INSERT INTO Artworks (artwork_name, artwork_image, price, about_artwork, userid)
        VALUES (?, ?, ?, ?, ?)
      `;
  
      db.query(
        insertArtworkQuery,
        [artwork_name, artwork_image.buffer, price, about_artwork, artist_id],
        (err, results) => {
          if (err) {
            console.error('Database Error (Inserting Artwork):', err);
            return res.status(500).send({ error: 'Database error occurred while saving artwork' });
          }
  
          res.send({ success: true, message: 'Artwork saved successfully!' });
        }
      );
    });
  });

  app.get('/artworks', (req, res) => {
    const query = 'SELECT * FROM Artworks';
  
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching data:', err);
        return res.status(500).json({ error: 'Failed to fetch data' });
      }

      // Transform the blob data into readable formats if necessary
      const transformedResults = results.map((artwork) => {
        // console.log(artwork)
        return {
          ...artwork,
          artwork_image: artwork.artwork_image ? artwork.artwork_image.toString('base64') : null, // Convert blob to Base64
        };
      });
    
    //   console.log(transformedResults)
      res.json(transformedResults);
    });
  });
  
app.delete("/artworks/:artworkId", (req, res) => {
    const { artworkId } = req.params;

    const query = "DELETE FROM Artworks WHERE artwork_id = ?";
    db.query(query, [artworkId], (err, result) => {
        if (err) {
            console.error("Error deleting artwork:", err);
            return res.status(500).json({ error: "Failed to delete artwork" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Artwork not found" });
        }

        res.status(200).json({ message: "Artwork deleted successfully" });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    const query = 'SELECT * FROM registration WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = results[0];

        console.log(password)
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.status(200).json({
            message: 'Login successful',
            user: {
                userid: user.userid,
                username: user.username,
                email: user.email,
                user_type:user.user_type
            }
        });
    });
});



// I USED JOIN

app.get('/profile', (req, res) => {
  const { email } = req.query;
  const sql = `SELECT r.userid, r.username, r.email, p.phone_number, p.user_image
               FROM registration r
               LEFT JOIN profile p ON r.userid = p.userid
               WHERE r.email = ?`;

  db.query(sql, [email], (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
          const profile = result[0];
          if (profile.user_image) {
              profile.user_image = Buffer.from(profile.user_image).toString('base64'); // Convert to base64
          }
          res.json(profile);
      } else {
          res.status(404).send("Profile not found");
      }
  });
});


app.put('/profile', upload.single('user_image'), (req, res) => {
  const { email, phone_number } = req.body; // Extract email and phone_number from the request body
  const userImage = req.file ? req.file.buffer : null; // Extract the uploaded image, if provided

  // Step 1: Find the user by email in the `registration` table
  const findUserQuery = `SELECT userid FROM registration WHERE email = ?`;

  db.query(findUserQuery, [email], (err, userResult) => {
      if (err) {
          console.error('Error finding user by email:', err);
          return res.status(500).send({ message: 'Internal server error' });
      }

      if (userResult.length === 0) {
          return res.status(404).send({ message: 'User not found' });
      }

      const userId = userResult[0].userid;

      // Step 2: Check if a profile already exists for the user in the `profile` table
      const findProfileQuery = `SELECT * FROM profile WHERE userid = ?`;

      db.query(findProfileQuery, [userId], (err, profileResult) => {
          if (err) {
              console.error('Error finding profile:', err);
              return res.status(500).send({ message: 'Internal server error' });
          }

          if (profileResult.length === 0) {
              // Step 3a: If no profile exists, insert a new profile
              const insertProfileQuery = `
                  INSERT INTO profile (userid, phone_number, user_image)
                  VALUES (?, ?, ?)
              `;
              db.query(insertProfileQuery, [userId, phone_number, userImage], (err, insertResult) => {
                  if (err) {
                      console.error('Error inserting profile:', err);
                      return res.status(500).send({ message: 'Error creating profile' });
                  }

                  return res.status(201).send({ message: 'Profile created successfully' });
              });
          } else {
              // Step 3b: If a profile exists, update the existing profile
              const updateProfileQuery = `
                  UPDATE profile
                  SET phone_number = ?, user_image = ?
                  WHERE userid = ?
              `;
              db.query(updateProfileQuery, [phone_number, userImage, userId], (err, updateResult) => {
                  if (err) {
                      console.error('Error updating profile:', err);
                      return res.status(500).send({ message: 'Error updating profile' });
                  }

                  return res.status(200).send({ message: 'Profile updated successfully' });
              });
          }
      });
  });
});



// I USED TRIGGER OVER HERE 
app.get('/artworkss', (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    // Query to get userId
    const getUserIdQuery = 'SELECT userid FROM registration WHERE email = ?';

    db.query(getUserIdQuery, [email], (err, results) => {
        if (err) {
            console.error('Error fetching userId:', err);
            return res.status(500).json({ error: 'Database error while fetching userId' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = results[0].userid;
        console.log(`UserId for email ${email}:`, userId);

        // Stored procedure or function query
        const getArtworksQuery = 'SELECT GetArtworksByUserId(?) AS user_artworks';

        db.query(getArtworksQuery, [userId], (err, artworkResults) => {
            if (err) {
                console.error('Error fetching artworks:', err);
                return res.status(500).json({ error: 'Database error while fetching artworks' });
            }

            console.log('Artwork Query Results:', artworkResults);

            if (!artworkResults || artworkResults.length === 0 || !artworkResults[0].user_artworks) {
                return res.status(404).json({ error: 'No artworks found for this user' });
            }

            // Use the object directly
            const artworks = artworkResults[0].user_artworks;

            // Transform the artworks and convert binary data to Base64
            const transformedResults = artworks.map((artwork) => ({
                ...artwork,
                artwork_image: artwork.artwork_image
                    ? `data:image/jpeg;base64,${Buffer.from(artwork.artwork_image, 'binary').toString('base64')}`
                    : null,
            }));

            // console.log('Transformed Artworks:', transformedResults);

            return res.json(transformedResults);
        });
    });
});


app.get('/api/artworks/count', (req, res) => {
    db.query('SELECT total_artworks FROM ArtworkSummary WHERE id = 1', (err, results) => {
      if (err) {
        console.error('Error fetching artwork count:', err);
        return res.status(500).json({ error: 'Failed to fetch artwork count' });
      }
  
      if (results.length === 0) {
        return res.status(404).json({ error: 'No artwork count found' });
      }
  
      res.json({ total_artworks: results[0].total_artworks });
    });
  });
  

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});






