// Import Express
const express = require('express') // nhung express vao project
const app = express()   // tao mot ung dung express
const port = 3000

// Define a route
app.get('/', (req, res) => {
    res.send('Trang chu cua Do Minh Khoi')
})

app.get('/tours', (req, res) => {
    res.send('Danh sach tour du lịch')
})

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})