const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const cors = require("cors");



dotenv.config();
const app = express();
const PORT = 3000;

app.use(express.json());  // To parse JSON bodies

app.use(cors({ origin: '*' }));



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




app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});







