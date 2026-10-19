const express = require("express");
const db = require("../db");

const router = express.Router();


// Create announcement

router.post("/", async(req,res)=>{

    try{

        const {
            title,
            message,
            priority
        } = req.body;

        if(!title || !message){

    return res.status(400).json({

        message:"Title and message are required"

    });

}

        const [result]=await db.query(

            `INSERT INTO announcements
            (title,message,priority)
            VALUES(?,?,?)`,

            [
                title,
                message,
                priority
            ]

        );


        res.status(201).json({

            message:"Announcement created",

            id:result.insertId

        });


    }
    catch(error){

        console.log(error);

        res.status(500).json({
            message:"Server error"
        });

    }

});



// Get announcements

router.get("/", async(req,res)=>{

    try{

        const [data]=await db.query(

            `SELECT *
             FROM announcements
             ORDER BY created_at DESC`

        );


        res.json(data);


    }
    catch(error){

        res.status(500).json({
            message:"Server error"
        });

    }

});




module.exports = router;
