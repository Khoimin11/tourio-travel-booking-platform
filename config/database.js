const mongoose = require('mongoose');
module.exports.connectDB = async () => {
    try {
        await mongoose.connect(process.env.DATABASE);
        console.log('Connected to database successfully');
    } catch (error) {
        console.error('Error connecting to database:', error);
    }
};  