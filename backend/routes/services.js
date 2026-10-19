const express = require("express");
const db = require("../db");

const router = express.Router();


// Create Service Request

router.post("/request", async(req,res)=>{

    try{

        const {
            user_id,
            service_type,
            description,
            priority
        } = req.body;


       const complaint_no =
"SN-" +
Date.now();


const [result] = await db.query(

`INSERT INTO service_requests
(user_id, service_type, description, priority, complaint_no, status)
VALUES(?,?,?,?,?,'Pending')`,

           [
user_id,
service_type,
description,
priority,
complaint_no
]

        );


        res.status(201).json({

message:"Service request created",

request_id:result.insertId,

complaint_no:complaint_no

});


    }
    catch(error){

        console.log(error);

        res.status(500).json({
            message:"Server error"
        });

    }

});

// Get resident service requests

// Get resident service requests

router.get("/my-requests", async(req,res)=>{

    try{


        const user_id = req.query.user_id;



        const [requests] = await db.query(

        `SELECT 
            sr.request_id,
            sr.service_type,
            sr.description,
            sr.priority,
            sr.status,
            sr.complaint_no,
            sr.created_at,
            sr.assigned_at,
            sr.completed_at,

            b.provider_id,
            EXISTS(SELECT 1 FROM ratings r WHERE r.request_id=sr.request_id) AS has_rating

        FROM service_requests sr

        LEFT JOIN bookings b

        ON sr.request_id = b.request_id

        WHERE sr.user_id = ?

        ORDER BY sr.created_at DESC`,

        [user_id]

        );



        res.json(requests);


    }

    catch(error){


        console.log(error);


        res.status(500).json({

            message:"Server error"

        });


    }

});

// Add service provider

router.post("/add-provider", async(req,res)=>{

    try{

        const {
            name,
            service_type,
            phone
        } = req.body;


        const [result] = await db.query(

            `INSERT INTO service_providers
            (name,service_type,phone)
            VALUES(?,?,?)`,

            [
                name,
                service_type,
                phone
            ]

        );


        res.status(201).json({

            message:"Provider added successfully",

            provider_id:result.insertId

        });


    }
    catch(error){

        console.log(error);

        res.status(500).json({
            message:"Server error"
        });

    }

});

// Get available providers

router.get("/providers", async(req,res)=>{

    try{

        const service_type=req.query.service_type;


        const [providers]=await db.query(

            `SELECT *
             FROM service_providers
             WHERE service_type IN (?, ?)
             AND availability='Available'`,

            [
                service_type,
                service_type === "Cleaner" ? "Cleaning" : service_type
            ]

        );


        res.json(providers);


    }
    catch(error){

        console.log(error);

        res.status(500).json({
            message:"Server error"
        });

    }

});


module.exports = router;