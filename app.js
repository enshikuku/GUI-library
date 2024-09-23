import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Routes
app.get('/', async (req, res) => {
    const searchTerm = req.query.search || '';
    const query = `SELECT * FROM books WHERE title LIKE ?`;
    const values = [`%${searchTerm}%`];

    try {
        db.query(query, values, (err, results) => {
            if (err) throw err;
            res.render('index', { books: results, searchTerm });
        });
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});


app.post('/borrow', async (req, res) => {
    const bookId = req.body.bookId;
    try {
        db.query('UPDATE books SET available = FALSE WHERE id = ?', [bookId], err => {
            if (err) throw err;
            res.redirect('/');
        });
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
