const express = require('express');
// const mysql = require('mysql2');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const cors = require("cors");
const bodyParser = require('body-parser');
const multer = require('multer');
const mysql = require('mysql2/promise');

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
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Example query to verify connection
(async () => {
  try {
      const connection = await db.getConnection();
      console.log('Connected to MySQL database');
      connection.release(); // Release connection back to the pool
  } catch (err) {
      console.error('Error connecting to the database:', err);
  }
})();


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
        return {
          ...artwork,
          artwork_image: artwork.artwork_image ? artwork.artwork_image.toString('base64') : null, // Convert blob to Base64
        };
      });
  
      res.json(transformedResults);
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


app.get('/api/artworks/:userid', async (req, res) => {
  const userId = req.params.userid;

  try {
      // Query the SQL function
      const [rows] = await db.query('SELECT GetArtworksByUser(?) AS artworks', [userId]);

      // Check if the result is already an object
      const artworks = typeof rows[0].artworks === 'string' 
          ? JSON.parse(rows[0].artworks) 
          : rows[0].artworks;

      // Respond with the result
      res.json({
          success: true,
          data: artworks,
      });
  } catch (error) {
      console.error('Error:', error.message);
      res.status(500).json({
          success: false,
          message: 'Error fetching artworks',
      });
  }
});

app.delete('/api/artworks/:artwork_id', async (req, res) => {
  const artworkId = req.params.artwork_id; // Extract artwork_id from URL parameters

  try {
      // SQL query to delete the artwork
      const [result] = await db.query('DELETE FROM Artworks WHERE artwork_id = ?', [artworkId]);

      // Check if any rows were affected (if an artwork was deleted)
      if (result.affectedRows > 0) {
          res.json({
              success: true,
              message: `Artwork with ID ${artworkId} deleted successfully.`,
          });
      } else {
          res.status(404).json({
              success: false,
              message: `Artwork with ID ${artworkId} not found.`,
          });
      }
  } catch (error) {
      console.error('Error deleting artwork:', error.message);
      res.status(500).json({
          success: false,
          message: 'Error deleting artwork',
      });
  }
});
  



app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});







