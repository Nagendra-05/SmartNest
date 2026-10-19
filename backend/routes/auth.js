const jwt = require("jsonwebtoken");
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");

const router = express.Router();


// Login API

router.post("/login", async (req,res)=>{

    try{

        const {
            email,
            password
        } = req.body;


        // Find user by email
        const [users] = await db.query(
            "SELECT * FROM users WHERE email=?",
            [email]
        );


        if(users.length === 0){

            return res.status(404).json({
                message:"User not found"
            });

        }


        const user = users[0];


        // Compare password

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );


        if(!passwordMatch){

            return res.status(401).json({
                message:"Invalid password"
            });

        }


        // Create JWT Token

        const token = jwt.sign(

            {
                user_id:user.user_id,
                role:user.role
            },

            process.env.JWT_SECRET,

            {
                expiresIn:"1d"
            }

        );


        res.json({

            message:"Login successful",

            token:token,

            user:{
                id:user.user_id,
                name:user.name,
                email:user.email,
                role:user.role
            }

        });


    }
    catch(error){

        console.log(error);

        res.status(500).json({
            message:"Server error"
        });

    }

});


// Create both records in one transaction so provider accounts stay consistent.
router.post("/register", async (req, res) => {
    let connection;
    try {
        const { name, email, phone, password, role, service_type } = req.body;
        const services = ["Plumber", "Electrician", "Cleaner", "Carpenter"];
        if (typeof name !== "string" || !name.trim() ||
            typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
            typeof phone !== "string" || !phone.trim() ||
            typeof password !== "string" || !password ||
            !["resident", "provider"].includes(role) ||
            (role === "provider" && !services.includes(service_type))) {
            return res.status(400).json({ message: "Enter valid account details and service category." });
        }
        const hash = await bcrypt.hash(password, 10);
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [existing] = await connection.query(
            "SELECT user_id FROM users WHERE email=?", [email.trim()]
        );
        if (existing.length) {
            await connection.rollback();
            return res.status(409).json({ message: "Email already registered" });
        }
        const [result] = await connection.query(
            `INSERT INTO users (name,email,password,phone,role) VALUES(?,?,?,?,?)`,
            [name.trim(), email.trim(), hash, phone.trim(), role]
        );
        if (role === "provider") {
            await connection.query(
                `INSERT INTO service_providers (user_id,name,service_type,phone,availability)
                 VALUES(?,?,?,?,?)`,
                [result.insertId, name.trim(), service_type, phone.trim(), "Available"]
            );
        }
        await connection.commit();
        res.status(201).json({ message: "Registration successful", userId: result.insertId });
    } catch (error) {
        if (connection) await connection.rollback().catch(() => {});
        console.error(error);
        res.status(error.code === "ER_DUP_ENTRY" ? 409 : 500).json({
            message: error.code === "ER_DUP_ENTRY" ? "Email already registered" : "Registration failed"
        });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
