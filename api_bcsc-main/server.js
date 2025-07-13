const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Setup multer
const upload = multer({ dest: 'uploads/' });

// Setup Cloudinary
cloudinary.config({
  cloud_name: 'dwmp7qmqw',
  api_key: '626243926695359',
  api_secret: 'uUlBkPN4LYnflr_I5dDtV-RedUk'
});

// Connect MySQL (XAMPP)
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',  // ถ้ามีรหัสผ่านใส่ตรงนี้
  database: 'movie',
  port: 3306
});

db.connect((err) => {
  if (err) {
    console.error("❌ Cannot connect to MySQL:", err);
    return;
  }
  console.log("✅ Connected to MySQL");
});

// Upload Poster to Cloudinary
app.post('/uploadPoster', upload.single('poster'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  cloudinary.uploader.upload(req.file.path, { folder: "posters" }, (err, result) => {
    fs.unlinkSync(req.file.path); // ลบไฟล์ temp
    if (err) return res.status(500).json({ error: err.message || err });
    res.status(200).json({
      url: result.secure_url,
      public_id: result.public_id
    });
  });
});


// CREATE movie
app.post("/movie", (req, res) => {
  const {
    mv_name, description, duration, genre,
    release_date, posterURL, status,
    price, theaters, seat
  } = req.body;

  const sql = `
    INSERT INTO moviee 
    (mv_name, description, duration, genre, release_date, posterURL, status, price, theaters, seat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    mv_name, description, duration, genre,
    release_date, posterURL, status || 'active',
    price, theaters, seat
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(200).json({ msg: "✅ Movie saved", movie_id: result.insertId });
  });
});


// READ all movies
app.get("/movie", (req, res) => {
  db.query("SELECT * FROM moviee", (err, result) => {
    if (err) return res.status(400).send(err);
    res.status(200).json(result);
  });
});

// SEARCH movie by keyword
app.get("/movie/:keyword", (req, res) => {
  const keyword = req.params.keyword;
  const sql = `
    SELECT * FROM moviee
    WHERE mv_id LIKE ? OR mv_name LIKE ? OR genre LIKE ? OR theaters LIKE ? OR price LIKE ? OR seat LIKE ?
  `;
  const val = Array(6).fill(`%${keyword}%`);
  db.query(sql, val, (err, result) => {
    if (err) return res.status(400).send(err);
    res.status(200).json(result);
  });
});

// UPDATE movie
app.put("/movie/:mv_id", (req, res) => {
  const mv_id = req.params.mv_id;
  const { mv_name, description, duration, genre, relese_date, posterURL, status, price, theaters, seat } = req.body;

  const sql = `
    UPDATE moviee 
    SET mv_name=?, description=?, duration=?, genre=?, relese_date=?, posterURL=?, status=?, price=?, theaters=?, seat=?
    WHERE mv_id=?
  `;
  const val = [mv_name, description, duration, genre, relese_date, posterURL, status, price, theaters, seat, mv_id];

  db.query(sql, val, err => {
    if (err) return res.status(400).send(err);
    res.status(200).send({ msg: "✅ Movie updated" });
  });
});

// DELETE movie
app.delete("/movie/:mv_id", (req, res) => {
  const mv_id = req.params.mv_id;
  db.query("DELETE FROM moviee WHERE mv_id=?", [mv_id], err => {
    if (err) return res.status(400).send(err);
    res.status(200).send({ msg: "🗑️ Movie deleted" });
  });
});





//////////////////// theater


app.post("/theaters", (req, res) => {
  const { theaters_name, theater_num, total_seat } = req.body;

  const sql = `INSERT INTO theaters (theaters_name, theater_num, total_seat)
               VALUES (?, ?, ?)`;
  const val = [theaters_name, theater_num, total_seat];

  db.query(sql, val, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(200).json({ msg: "✅ Theater created" });
  });
});


app.get("/theaters", (req, res) => {
  const sql = "SELECT * FROM theaters";
  db.query(sql, (err, result) => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(200).json(result);
  });
});


app.get("/theaters/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM theaters WHERE theaters_id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(400).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ msg: "Not found" });
    res.status(200).json(result[0]);
  });
});


app.put("/theaters/:id", (req, res) => {
  const id = req.params.id;
  const { theaters_name, theater_num, total_seat } = req.body;

  const sql = `UPDATE theaters 
               SET theaters_name = ?, theater_num = ?, total_seat = ?
               WHERE theaters_id = ?`;
  const val = [theaters_name, theater_num, total_seat, id];

  db.query(sql, val, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(200).json({ msg: "✅ Theater updated" });
  });
});

app.delete("/theaters/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM theaters WHERE theaters_id = ?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(200).json({ msg: "🗑️ Theater deleted" });
  });
});


///////// showtime

// CREATE showtime
app.post("/showtime", (req, res) => {
  const { movie_id, theaters_id, show_date, showt_ime, availableSeat } = req.body;
  const sql = `
    INSERT INTO showtime (movie_id, theaters_id, show_date, showt_ime, availableSeat)
    VALUES (?, ?, ?, ?, ?)
  `;
  const val = [movie_id, theaters_id, show_date, showt_ime, availableSeat];
  db.query(sql, val, err => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(200).json({ msg: "✅ Showtime created" });
  });
});

// READ all showtimes
app.get("/showtime", (req, res) => {
  db.query("SELECT * FROM showtime", (err, result) => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(200).json(result);
  });
});

// READ one showtime
app.get("/showtime/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM showtime WHERE showtime_id = ?", [id], (err, result) => {
    if (err) return res.status(400).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ msg: "❌ Showtime not found" });
    res.status(200).json(result[0]);
  });
});

// UPDATE showtime
app.put("/showtime/:id", (req, res) => {
  const id = req.params.id;
  const { movie_id, theaters_id, show_date, showt_ime, availableSeat } = req.body;

  const sql = `
    UPDATE showtime 
    SET movie_id = ?, theaters_id = ?, show_date = ?, showt_ime = ?, availableSeat = ?
    WHERE showtime_id = ?
  `;
  const val = [movie_id, theaters_id, show_date, showt_ime, availableSeat, id];

  db.query(sql, val, err => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(200).json({ msg: "✅ Showtime updated" });
  });
});

// DELETE showtime
app.delete("/showtime/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM showtime WHERE showtime_id = ?", [id], err => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(200).json({ msg: "🗑️ Showtime deleted" });
  });
});
//////// user



app.post("/user", (req, res) => {
  const { u_name, u_email, u_gender, u_tel, u_password, u_profile } = req.body;

  const sql = `INSERT INTO user (u_name, u_email, u_gender, u_tel, u_password, u_profile)
               VALUES (?, ?, ?, ?, ?, ?)`;
  const val = [u_name, u_email, u_gender, u_tel, u_password, u_profile];

  db.query(sql, val, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(201).json({ msg: "✅ User created" });
  });
});


app.get("/user", (req, res) => {
  const sql = "SELECT * FROM user";
  db.query(sql, (err, result) => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(200).json(result);
  });
});


app.get("/user/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM user WHERE u_id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(400).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ msg: "User not found" });
    res.status(200).json(result[0]);
  });
});


app.put("/user/:id", (req, res) => {
  const id = req.params.id;
  const { u_name, u_email, u_gender, u_tel, u_password, u_profile } = req.body;

  const sql = `UPDATE user 
               SET u_name = ?, u_email = ?, u_gender = ?, u_tel = ?, u_password = ?, u_profile = ?
               WHERE u_id = ?`;
  const val = [u_name, u_email, u_gender, u_tel, u_password, u_profile, id];

  db.query(sql, val, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(200).json({ msg: "✅ User updated" });
  });
});


app.delete("/user/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM user WHERE u_id = ?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(200).json({ msg: "🗑️ User deleted" });
  });
});

app.post('/login', (req, res) => {
  const { u_email, u_password } = req.body;
  const sql = 'SELECT * FROM user WHERE u_email = ? AND u_password = ?';
  db.query(sql, [u_email, u_password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json(results[0]); // returns user object
  });
});

app.post('/register', (req, res) => {
  const { u_name, u_email, u_password } = req.body;

  const sql = 'INSERT INTO user (u_name, u_email, u_password) VALUES (?, ?, ?)';
  db.query(sql, [u_name, u_email, u_password], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Register success', u_id: result.insertId });
  });
});

///// admin

app.post('/admin/login', (req, res) => {
  const { admin_email, admin_password } = req.body;

  const sql = "SELECT * FROM admin WHERE admin_email = ? AND admin_password = ?";
  db.query(sql, [admin_email, admin_password], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }
    res.status(200).json(result[0]);
  });
});

app.post('/admin', (req, res) => {
  const { admin_name, admin_gender, admin_tel, admin_email, admin_salary, work_date, admin_password } = req.body;
  const sql = `INSERT INTO admin 
               (admin_name, admin_gender, admin_tel, admin_email, admin_salary, work_date, admin_password)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const val = [admin_name, admin_gender, admin_tel, admin_email, admin_salary, work_date, admin_password];

  db.query(sql, val, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    res.status(201).json({ msg: '✅ Admin created' });
  });
});


app.get('/admin', (req, res) => {
  const sql = 'SELECT * FROM admin';
  db.query(sql, (err, results) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(results);
  });
});


app.get('/admin/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'SELECT * FROM admin WHERE admin_id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(400).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ msg: 'Admin not found' });
    res.json(results[0]);
  });
});


app.put('/admin/:id', (req, res) => {
  const id = req.params.id;
  const { admin_name, admin_gender, admin_tel, admin_email, admin_salary, work_date, admin_password } = req.body;
  const sql = `UPDATE admin SET
               admin_name = ?, admin_gender = ?, admin_tel = ?, admin_email = ?,
               admin_salary = ?, work_date = ?, admin_password = ?
               WHERE admin_id = ?`;
  const val = [admin_name, admin_gender, admin_tel, admin_email, admin_salary, work_date, admin_password, id];

  db.query(sql, val, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ msg: '✅ Admin updated' });
  });
});


app.delete('/admin/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM admin WHERE admin_id = ?';
  db.query(sql, [id], (err) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ msg: '🗑️ Admin deleted' });
  });
});



app.get('/admin/email/:email', (req, res) => {
  const email = req.params.email;

  const sql = 'SELECT * FROM admin WHERE admin_email = ? LIMIT 1';
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ msg: 'Admin not found' });
    }

  
    res.json(results[0]);
  });
});



//////// ticket


// CREATE ticket
app.post('/ticket', (req, res) => {
  const {
    u_id,
    showtime_id,
    seat_num,
    price,
    booking_date,
    name,
    time_b,
    theaters,
    selectedTime,
    image,
    mv_name,
    show_date,
    status,
    posterURL  // ✅ add this line
  } = req.body;

  const sql = `
    INSERT INTO ticket (
      u_id, showtime_id, seat_num, price, booking_date,
      name, time_b, theaters, selectedTime,
      image, mv_name, show_date, status, posterURL
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    u_id, showtime_id, seat_num, price, booking_date,
    name, time_b, theaters, selectedTime,
    image, mv_name, show_date, status, posterURL // ✅ added
  ], (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(201).send({ message: 'Ticket created', ticket_id: result.insertId });
  });
});



// READ all tickets
app.get('/tickets', (req, res) => {
  db.query('SELECT * FROM ticket', (err, results) => {
    if (err) return res.status(500).send(err);
    res.send(results);
  });
});

// READ one ticket by ID
app.get('/ticket/:id', (req, res) => {
  const ticketId = req.params.id;
  db.query('SELECT * FROM ticket WHERE ticket_id = ?', [ticketId], (err, result) => {
    if (err) return res.status(500).send(err);
    res.send(result[0]);
  });
});


// UPDATE ticket
app.put('/ticket/:id', (req, res) => {
  const ticketId = req.params.id;
  const {
    u_id,
    showtime_id,
    seat_num,
    price,
    booking_date,
    name,
    time_b,
    theaters,
    selectedTime,
    image,
    mv_name,
    show_date,
    status,
    posterURL  // ✅ add this
  } = req.body;

  const sql = `
    UPDATE ticket SET
      u_id = ?, showtime_id = ?, seat_num = ?, price = ?, booking_date = ?,
      name = ?, time_b = ?, theaters = ?, selectedTime = ?,
      image = ?, mv_name = ?, show_date = ?, status = ?, posterURL = ?
    WHERE ticket_id = ?
  `;

  db.query(sql, [
    u_id, showtime_id, seat_num, price, booking_date,
    name, time_b, theaters, selectedTime,
    image, mv_name, show_date, status, posterURL, ticketId // ✅ added
  ], (err, result) => {
    if (err) return res.status(500).send(err);
    res.send({ message: 'Ticket updated' });
  });
});


// DELETE ticket
app.delete('/ticket/:id', (req, res) => {
  const ticketId = req.params.id;
  db.query('DELETE FROM ticket WHERE ticket_id = ?', [ticketId], (err, result) => {
    if (err) return res.status(500).send(err);
    res.send({ message: 'Ticket deleted' });
  });
});

app.get('/tickets', (req, res) => {
  const uid = req.query.uid;
  let sql = 'SELECT * FROM ticket';
  let params = [];
  if (uid) {
    sql += ' WHERE u_id = ?';
    params.push(uid);
  }
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).send(err);
    res.send(results);
  });
});

// check status booking ticket
app.get('/api/booked-seats/:showtimeId', (req, res) => {
  const showtimeId = req.params.showtimeId;

  const sql = `
    SELECT seat_num FROM ticket 
    WHERE showtime_id = ? AND status IN ('paid', 'pending')
  `;

  db.query(sql, [showtimeId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    const bookedSeats = results.map(row => row.seat_num);
    res.json({ bookedSeats });
  });
});




app.delete('/ticket/:id', (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM ticket WHERE ticket_id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: "Delete failed" });
    res.json({ success: true });
  });
});

////////////////////point


// ▶️ CREATE - เพิ่มรายการแต้ม
app.post('/points', (req, res) => {
  const { u_id, col_points } = req.body;
  const sql = `INSERT INTO points (u_id, col_points) VALUES (?, ?)`;
  db.query(sql, [u_id, col_points], (err, result) => {
    if (err) return res.status(500).send(err);
    res.send({ message: 'เพิ่มแต้มสำเร็จ', point_id: result.insertId });
  });
});

// 📥 READ - แสดงแต้มทั้งหมด
app.get('/points', (req, res) => {
  db.query('SELECT * FROM points ORDER BY point_id DESC', (err, results) => {
    if (err) return res.status(500).send(err);
    res.send(results);
  });
});

// 📄 READ - แสดงแต้มเฉพาะ user
app.get('/points/user/:u_id', (req, res) => {
  db.query('SELECT * FROM points WHERE u_id = ? ORDER BY point_id DESC',
    [req.params.u_id], (err, results) => {
      if (err) return res.status(500).send(err);
      res.send(results);
  });
});

// ✏️ UPDATE - แก้ไขคะแนน (แค่ col_points)
app.put('/points/:id', (req, res) => {
  const { col_points } = req.body;
  const sql = `UPDATE points SET col_points = ? WHERE point_id = ?`;
  db.query(sql, [col_points, req.params.id], (err, result) => {
    if (err) return res.status(500).send(err);
    res.send({ message: 'อัปเดตรายการแต้มเรียบร้อย' });
  });
});

// 🗑️ DELETE - ลบรายการแต้ม
app.delete('/points/:id', (req, res) => {
  db.query('DELETE FROM points WHERE point_id = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).send(err);
    res.send({ message: 'ลบรายการแต้มแล้ว' });
  });
});

// 📄 READ - ดึงคะแนนเฉพาะ user (ดึงคะแนนล่าสุดถ้ามีหลายรายการ)
app.get('/points/:u_id', (req, res) => {
  const { u_id } = req.params;
  const sql = 'SELECT col_points FROM points WHERE u_id = ? ORDER BY point_id DESC LIMIT 1';
  db.query(sql, [u_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json([{ u_id, col_points: result[0].col_points }]); // ส่งเป็น array ตามที่ Flutter ต้องการ
  });
});

app.post('/redeem', (req, res) => {
  const { u_id, points, items } = req.body;

  // ตรวจสอบว่าคะแนนพอหรือไม่ จาก DB
  // ถ้าพอ ให้ -points แล้วบันทึก transaction แลกของ

  db.query(
    'UPDATE user_points SET col_points = col_points - ? WHERE u_id = ?',
    [points, u_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      // บันทึก reward log (optional)
      db.query(
        'INSERT INTO reward_log (u_id, items, points) VALUES (?, ?, ?)',
        [u_id, JSON.stringify(items), points]
      );

      res.json({ message: 'Redeemed successfully' });
    }
  );
});

///////////reward

// ✅ CREATE - เพิ่ม reward ใหม่ (เพิ่ม r_point)
app.post('/reward', (req, res) => {
  const { re_type, re_name, image_reward, r_point } = req.body;
  const sql = 'INSERT INTO reward (re_type, re_name, image_reward, r_point) VALUES (?, ?, ?, ?)';
  db.query(sql, [re_type, re_name, image_reward, r_point], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '✅ Created reward', id: result.insertId });
  });
});

// ✅ READ ALL - ดึง reward ทั้งหมด
app.get('/reward', (req, res) => {
  const uid = req.query.uid; // ถ้ามี query uid ให้ filter ด้วย

  let sql = 'SELECT * FROM reward';
  const values = [];

  if (uid) {
    sql += ' WHERE u_id = ?';
    values.push(uid);
  }

  sql += ' ORDER BY re_id DESC';

  db.query(sql, values, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ✅ READ ONE - ดึง reward ตาม id
app.get('/reward/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM reward WHERE re_id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: '❌ Reward not found' });
    res.json(results[0]);
  });
});

// ✅ UPDATE - แก้ไข reward ตาม id (เพิ่ม r_point)
app.put('/reward/:id', (req, res) => {
  const { id } = req.params;
  const { re_type, re_name, image_reward, r_point } = req.body;

  const sql = 'UPDATE reward SET re_type = ?, re_name = ?, image_reward = ?, r_point = ? WHERE re_id = ?';
  db.query(sql, [re_type, re_name, image_reward, r_point, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: '❌ Reward not found' });
    res.json({ message: '✅ Updated reward' });
  });
});

// ✅ DELETE - ลบ reward ตาม id
app.delete('/reward/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM reward WHERE re_id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: '❌ Reward not found' });
    res.json({ message: '✅ Deleted reward' });
  });
});

/////// about web buy ticket

app.post('/api/book', (req, res) => {
  const { u_id, showtime_id, mv_name, selectedSeats, price, name, ...otherFields } = req.body;

  const values = selectedSeats.map(seat => [
    u_id,
    showtime_id,
    seat,
    price,
    new Date(),
    name,
    otherFields.time_b,
    otherFields.theaters,
    otherFields.selectedTime,
    otherFields.image,
    mv_name,
    otherFields.show_date,
    'pending',
    otherFields.posterURL
  ]);

  const sql = `
    INSERT INTO ticket (
      u_id, showtime_id, seat_num, price, booking_date, name,
      time_b, theaters, selectedTime, image, mv_name,
      show_date, status, posterURL
    ) VALUES ?
  `;

  db.query(sql, [values], (err, result) => {
    if (err) return res.status(500).json({ error: 'Insert error' });
    res.json({ success: true });
  });
});
//////////

// Get all active movies
app.get('/api/movies', (req, res) => {
  const sql = 'SELECT mv_id, mv_name FROM moviee WHERE status = "active"';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// Get booked seats for a specific showtime
app.get('/api/booked-seats/:showtimeId', (req, res) => {
  const showtimeId = req.params.showtimeId;
  const sql = `
    SELECT seat_num FROM ticket 
    WHERE showtime_id = ? AND status IN ('paid', 'pending')
  `;
  db.query(sql, [showtimeId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const bookedSeats = results.map(row => row.seat_num);
    res.json({ bookedSeats });
  });
});

// Insert new bookings
app.post('/api/book', (req, res) => {
  const {
    u_id, showtime_id, mv_name, selectedSeats,
    price, name, time_b, theaters,
    selectedTime, image, show_date, posterURL
  } = req.body;

  const values = selectedSeats.map(seat => [
    u_id, showtime_id, seat, price, new Date(), name,
    time_b, theaters, selectedTime, image, mv_name,
    show_date, 'pending', posterURL
  ]);

  const sql = `
    INSERT INTO ticket (
      u_id, showtime_id, seat_num, price, booking_date, name,
      time_b, theaters, selectedTime, image, mv_name,
      show_date, status, posterURL
    ) VALUES ?
  `;

  db.query(sql, [values], (err, result) => {
    if (err) return res.status(500).json({ error: 'Insert error' });
    res.json({ success: true });
  });
});
app.listen(8000, () => console.log("🚀 Server running on http://localhost:8000"));
