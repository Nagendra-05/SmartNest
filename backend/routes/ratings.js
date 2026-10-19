const express = require("express");
const db = require("../db");

const router = express.Router();


// Add Rating

router.post("/", async (req, res) => {
    let connection;
    const { request_id, provider_id, user_id, rating, comment } = req.body;
    if (![request_id, provider_id, user_id].every(v => Number.isSafeInteger(Number(v)) && Number(v) > 0) ||
        !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5 ||
        (comment != null && (typeof comment !== "string" || comment.length > 2000))) {
        return res.status(400).json({ message: "Enter a rating from 1 to 5 and valid request details" });
    }
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [requests] = await connection.query(
            "SELECT user_id,status FROM service_requests WHERE request_id=? FOR UPDATE", [request_id]
        );
        const [bookings] = await connection.query(
            "SELECT provider_id FROM bookings WHERE request_id=? AND provider_id=?", [request_id, provider_id]
        );
        if (!requests.length || requests[0].status !== "Completed" ||
            Number(requests[0].user_id) !== Number(user_id) || !bookings.length) {
            await connection.rollback();
            return res.status(400).json({ message: "Only a completed service for this resident can be rated" });
        }
        const [existing] = await connection.query(
            "SELECT request_id FROM ratings WHERE request_id=?", [request_id]
        );
        if (existing.length) {
            await connection.rollback();
            return res.status(409).json({ message: "You have already rated this service" });
        }
        await connection.query(
            "INSERT INTO ratings (request_id,provider_id,user_id,rating,comment) VALUES(?,?,?,?,?)",
            [request_id, provider_id, user_id, Number(rating), comment || ""]
        );
        await connection.commit();
        res.status(201).json({ message: "Rating submitted successfully" });
    } catch (error) {
        if (connection) await connection.rollback().catch(() => {});
        console.error(error);
        res.status(500).json({ message: "Unable to save rating" });
    } finally {
        if (connection) connection.release();
    }
});

// Get provider ratings

router.get("/provider/:provider_id", async(req,res)=>{

    try{


        const provider_id =
        req.params.provider_id;



        const [ratings] = await db.query(

        `SELECT 
            r.rating,
            r.comment,
            r.created_at,
            u.name AS resident_name

        FROM ratings r

        JOIN users u

        ON r.user_id = u.user_id

        WHERE r.provider_id=?

        ORDER BY r.created_at DESC`,

        [provider_id]

        );



        res.json(ratings);


    }

    catch(error){


        console.log(error);


        res.status(500).json({

            message:"Server error"

        });


    }

});





module.exports = router;