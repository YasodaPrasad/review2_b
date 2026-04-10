const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors());

// MATCHING YOUR WORKBENCH SETTINGS
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root', // <--- ENTER YOUR WORKBENCH PASSWORD HERE
    database: 'student_performance'  // <--- MATCHES YOUR SCREENSHOT
});

db.connect(err => {
    if (err) console.error("Database Connection Failed:", err);
    else console.log("Connected to MySQL: student_performance");
});

// ==========================================
// 🌟 NEW: ADDED ROOT ROUTE TO FIX "Cannot GET /"
// ==========================================
app.get('/', (req, res) => {
    res.send('Student Performance API is running successfully!');
});

// API: SIGN IN (Registration)
app.post('/api/register', async (req, res) => {
    const { name, college_id, email, password, role, dob, college, faculty } = req.body;
    try {
        const hashedPass = await bcrypt.hash(password, 10);
        // Using 'custom_id' to match your SQL column name
        const sql = "INSERT INTO users (name, custom_id, email, password, role, dob, college, faculty) VALUES (?,?,?,?,?,?,?,?)";
        db.query(sql, [name, college_id, email, hashedPass, role, dob, college, faculty], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: err.sqlMessage });
            }
            res.status(201).json({ message: "User Registered" });
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// API: LOGIN
app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body;
    db.query("SELECT * FROM users WHERE email = ? AND role = ?", [email, role], async (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: "User not found" });
        const match = await bcrypt.compare(password, results[0].password);
        if (!match) return res.status(401).json({ error: "Wrong password" });
        res.json({ user: results[0] });
    });
});

// API: ADMIN (Save Performance)
app.post('/api/reports', (req, res) => {
    const { student_id, course, marks, attendance, className, facultyName, recommendation } = req.body;
    const sql = "INSERT INTO performance_reports (student_id, course_name, marks, attendance, class_name, faculty_name, recommendation) VALUES (?,?,?,?,?,?,?)";
    db.query(sql, [student_id, course, marks, attendance, className, facultyName, recommendation], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Report Saved" });
    });
});

// API: STUDENT (View Report)
app.get('/api/student-report/:id', (req, res) => {
    db.query("SELECT * FROM performance_reports WHERE student_id = ?", [req.params.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 1. Get all registered students (Teacher can see who is in the system)
app.get('/api/admin/students', (req, res) => {
    db.query("SELECT id, name, custom_id, email, faculty FROM users WHERE role = 'student'", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. Get ALL performance reports (Global View for Teacher)
app.get('/api/admin/all-reports', (req, res) => {
    const sql = `
        SELECT p.*, u.name as student_name, u.custom_id 
        FROM performance_reports p 
        JOIN users u ON p.student_id = u.id`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 3. Delete a report (Operation)
app.delete('/api/admin/report/:id', (req, res) => {
    db.query("DELETE FROM performance_reports WHERE report_id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Report deleted" });
    });
});

// ==========================================
// 🌟 MOVED TO THE BOTTOM: SERVER LISTENER
// ==========================================
app.listen(5000, () => console.log("Backend running on http://localhost:5000"));