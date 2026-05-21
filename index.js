// Import Express
const express = require('express') // nhung express vao project
const path = require('path');
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://maildominhkhoi_db_user:zIy0iSpkLzXDrgri@cluster0.a4qwbbe.mongodb.net/tour-du-lich');

// Tạo model Tour để thao tác vơi collection tours trong MongoDB như thêm, sửa, xóa, tìm kiếm dữ liệu
const Tour = mongoose.model('Tour', {
    name: String,
    vehicle: String
});

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
        pageTitle: 'Trang chủ'
    })  // home.pug hoặc home thôi cũng được vì đã có views và view engine là pug rồi
})

app.get('/tours', async (req, res) => {
    const tourList = await Tour.find({}); // await để chờ kết quả trả về rồi mới tiếp tục chạy code phía sau, muốn dùng await thì phải có async ở trước function

    console.log(tourList);

    res.render('client/pages/tour-list', {
        pageTitle: 'Danh sách tour',
        tourList: tourList
    })
})

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})

