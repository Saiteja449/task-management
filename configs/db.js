import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => {
            console.log('Mongoose connected to db');
        });

        mongoose.connection.on('error', (err) => {
            console.error(`Mongoose connection error: ${err.message}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Mongoose connection is disconnected');
        });

        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
