import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql';
import bcrypt from 'bcrypt';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'GUI_library'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
}));

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

// User registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
        if (err) {
            return res.status(500).send('Error registering user.');
        }
        res.redirect('/login');
    });
});

// User login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).send('Invalid username or password.');
        }
        const user = results[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).send('Invalid username or password.');
        }
        req.session.userId = user.id;
        res.redirect('/');
    });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out.');
        }
        res.redirect('/');
    });
});

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
};

// Home route
app.get('/', async (req, res) => {
    const searchTerm = req.query.search || '';
    const query = `SELECT * FROM books WHERE title LIKE ?`;
    const values = [`%${searchTerm}%`];

    try {
        db.query(query, values, (err, results) => {
            if (err) throw err;
            res.render('index', { books: results, searchTerm, userId: req.session.userId });
        });
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

// Borrow book (protected)
app.post('/borrow', isAuthenticated, (req, res) => {
    const bookId = req.body.bookId;
    db.query('UPDATE books SET available = FALSE WHERE id = ?', [bookId], err => {
        if (err) {
            res.status(500).send('Internal Server Error');
        } else {
            res.sendStatus(200);
        }
    });
});

// Return book (protected)
app.post('/return', isAuthenticated, (req, res) => {
    const bookId = req.body.bookId;
    db.query('UPDATE books SET available = TRUE WHERE id = ?', [bookId], err => {
        if (err) {
            res.status(500).send('Internal Server Error');
        } else {
            res.sendStatus(200);
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
