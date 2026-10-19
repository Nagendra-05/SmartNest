const express = require("express");
const db = require("../db");

const router = express.Router();


// Add provider availability

router.post("/availability", async(req,res)=>{

    try{

        const {
            provider_id,
            slot_date,
            start_time,
            end_time
        } = req.body;


        if(!provider_id || !slot_date || !start_time || !end_time){

            return res.status(400).json({

                message:"All fields are required"

            });

        }


        // Check date is today or future

        const today = new Date();

        today.setHours(0,0,0,0);


        const selectedDate = new Date(slot_date);

        selectedDate.setHours(0,0,0,0);



        if(selectedDate < today){

            return res.status(400).json({

                message:"You can only add availability from today onwards"

            });

        }



        // Check time range

        if(start_time >= end_time){

            return res.status(400).json({

                message:"End time must be after start time"

            });

        }



        await db.query(

            `INSERT INTO time_slots
            (provider_id,slot_date,start_time,end_time,status)
            VALUES(?,?,?,?,?)`,

            [
                provider_id,
                slot_date,
                start_time,
                end_time,
                "Available"
            ]

        );


        res.json({

            message:"Availability added successfully"

        });


    }

    catch(error){

        console.log(error);


        res.status(500).json({

            message:"Server error"

        });

    }

});



// Get provider future available slots

router.get("/:id/availability", async(req,res)=>{

    try{

        const provider_id = req.params.id;


        const [slots] = await db.query(

        `
        SELECT *
        FROM time_slots
        WHERE provider_id=?
        AND status='Available'
        AND TIMESTAMP(slot_date,end_time) > NOW()
        ORDER BY slot_date,start_time
        `,

        [
            provider_id
        ]

        );


        res.json(slots);


    }
    catch(error){

        console.log(error);

        res.status(500).json({

            message:"Server error"

        });

    }

});



// Get provider details using user_id

router.get("/:user_id", async(req,res)=>{

    try{

        const user_id = req.params.user_id;


        const [provider] = await db.query(

            `
            SELECT *
            FROM service_providers
            WHERE user_id=?
            `,

            [
                user_id
            ]

        );


        if(provider.length === 0){

            return res.status(404).json({

                message:"Provider not found"

            });

        }


        res.json(provider[0]);


    }

    catch(error){

        console.log(error);


        res.status(500).json({

            message:"Server error"

        });

    }

});


module.exports = router;