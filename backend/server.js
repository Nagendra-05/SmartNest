require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const serviceRoutes = require("./routes/services");
const bookingRoutes=require("./routes/bookings");
const adminRoutes = require("./routes/admin");
const announcementRoutes=require("./routes/announcements");
const eventRoutes=require("./routes/events");
const providerRoutes=require("./routes/providers");
const ratingRoutes =require("./routes/ratings");


const app = express();

const db = require("./db");

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings",bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/announcements",announcementRoutes);
app.use("/api/events",eventRoutes);
app.use("/api/providers",providerRoutes);
app.use("/api/ratings",ratingRoutes);

// Test Route
app.get("/", (req, res) => {
    res.send("Welcome to SmartNest Server");
});

app.get("/test-db", async (req,res)=>{

    try{

        const [result] = await db.query(
            "SELECT 1"
        );

        res.send("Database Connected Successfully");

    }
    catch(error){

        console.log(error);

        res.send("Database Connection Failed");

    }

});

// Server Port
const PORT = process.env.PORT || 5000;


// Start Server
app.listen(PORT, () => {
    console.log(`SmartNest Server running on port ${PORT}`);
});