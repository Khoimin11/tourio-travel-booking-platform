// Import Express
const express = require('express') // nhung express vao project
const path = require('path')

const app = express()   // tao mot ung dung express
const port = 3000

// Thiết lập views
app.set('views', path.join(__dirname, 'views')); // __dirname chinh la thu muc goc, chỉ định phải đi vào thư mục gốc trước khi vào views
app.set('view engine', 'pug');

// Thiết lập thư mục tĩnh của frontend
app.use(express.static(path.join(__dirname, 'public')));


// Define a route
app.get('/', (req, res) => {
    res.render('client/pages/home', {
        pageTitle: 'Home Page 123'
    })  // home.pug hoặc home thôi cũng được vì đã có views và view engine là pug rồi
})

app.get('/tours', (req, res) => {
    res.render('client/pages/tour-list', {
        pageTitle: 'Tour List 123'
    })
})

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})