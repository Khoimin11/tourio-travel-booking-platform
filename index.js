const express = require('express') // nhung express vao project
const path = require('path');
require('dotenv').config(); // nhung dotenv vao project de doc duoc file .env
const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE);

const clientRoutes = require('./routes/client/index.route');

const app = express()   // tao mot ung dung express
const port = 3000

// Thiết lập views
app.set('views', path.join(__dirname, 'views')); // __dirname chinh la thu muc goc, chỉ định phải đi vào thư mục gốc trước khi vào views
app.set('view engine', 'pug');

// Thiết lập thư mục tĩnh của frontend
app.use(express.static(path.join(__dirname, 'public')));

// Thiết lập đường dẫn
app.use('/', clientRoutes);


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})

