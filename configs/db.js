import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("Mongoose connected to db");
    });

    mongoose.connection.on("error", (err) => {
      console.error(`Mongoose connection error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("Mongoose connection is disconnected");
    });

    let dbUri = process.env.MONGO_URI;

    if (process.env.NODE_ENV === "production") {
      dbUri = process.env.MONGO_URI;
    } else if (process.env.NODE_ENV === "development") {
      dbUri = process.env.MONGO_URI_BETA;
    }

    const conn = await mongoose.connect(dbUri);
    console.log(
      `MongoDB ${process.env.NODE_ENV == "production" ? "Live" : "Beta"} Connected: ${conn.connection.host}`,
    );
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
