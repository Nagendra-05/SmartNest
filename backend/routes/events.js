const express=require("express");
const db=require("../db");

const router=express.Router();


// Create Event

router.post("/",async(req,res)=>{

    try{

        const {
            title,
            description,
            event_date,
            event_time,
            venue
        }=req.body;


        const [result]=await db.query(

        `INSERT INTO events
        (title,description,event_date,event_time,venue)
        VALUES(?,?,?,?,?)`,

        [
            title,
            description,
            event_date,
            event_time,
            venue
        ]

        );


        res.json({

            message:"Event created",
            id:result.insertId

        });


    }
    catch(error){

        res.status(500).json({
            message:"Server error"
        });

    }

});



// View Events

router.get("/", async (req, res) => {
    try {
        const [events] = await db.query("SELECT * FROM events ORDER BY event_date");
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to load events" });
    }
});

module.exports = router;
