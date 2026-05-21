module.exports.home = (req, res) => {
    res.render('client/pages/home', {    // home.pug hoặc home thôi cũng được vì đã có views và view engine là pug rồi
        pageTitle: 'Trang chủ'
    }) 
}