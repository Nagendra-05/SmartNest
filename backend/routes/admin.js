const express = require("express");
const db = require("../db");

const router = express.Router();


// Get all residents

router.get("/residents", async(req,res)=>{

    try{

        const [users] = await db.query(

            `SELECT user_id,name,email,phone
             FROM users
             WHERE role='resident'`

        );

        res.json(users);

    }
    catch(error){

        console.log(error);

        res.status(500).json({
            message:"Server error"
        });

    }

});


// Get all service providers

router.get("/providers", async(req,res)=>{

    try{

        const [providers] = await db.query(

            `SELECT sp.provider_id,
            sp.name,
            sp.service_type,
            sp.availability,
            u.email,
            u.phone
            FROM service_providers sp
            JOIN users u
            ON sp.user_id = u.user_id;`

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


router.get("/stats", async(req,res)=>{

    try{


        const [residents] = await db.query(
            "SELECT COUNT(*) AS count FROM users WHERE role='resident'"
        );


        const [providers] = await db.query(
            "SELECT COUNT(*) AS count FROM service_providers"
        );


        const [requests] = await db.query(
            "SELECT COUNT(*) AS count FROM service_requests"
        );


        res.json({

            residents: residents[0].count,

            providers: providers[0].count,

            requests: requests[0].count

        });


    }
    catch(error){

        res.status(500).json({
            message:"Server error"
        });

    }

});


// Get all service requests

router.get("/requests", async(req,res)=>{

    try{


        const [requests] = await db.query(

        `
        SELECT

        sr.request_id,
        sr.complaint_no,
        sr.service_type,
        sr.description,
        sr.priority,
        sr.status,
        sr.created_at,

        u.name AS resident_name,

        sp.name AS provider_name


        FROM service_requests sr


        JOIN users u

        ON sr.user_id=u.user_id


        LEFT JOIN bookings b

        ON sr.request_id=b.request_id


        LEFT JOIN service_providers sp

        ON b.provider_id=sp.provider_id


        ORDER BY sr.created_at DESC

        `

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


// Get all service requests with complete details

router.get("/service-requests", async(req,res)=>{

    try{


        const [requests] = await db.query(

        `

        SELECT

        sr.request_id,
        sr.complaint_no,
        sr.service_type,
        sr.description,
        sr.priority,
        sr.status,
        sr.created_at,
        sr.assigned_at,
        sr.completed_at,


        u.name AS resident_name,


        sp.name AS provider_name,


        ts.slot_date,
        ts.start_time,
        ts.end_time


        FROM service_requests sr



        JOIN users u

        ON sr.user_id = u.user_id



        LEFT JOIN bookings b

        ON sr.request_id = b.request_id



        LEFT JOIN service_providers sp

        ON b.provider_id = sp.provider_id



        LEFT JOIN time_slots ts

        ON b.slot_id = ts.slot_id



        ORDER BY sr.created_at DESC


        `

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

// Admin request analytics

router.get("/analytics", async(req,res)=>{

    try{


        const [total] = await db.query(

            `SELECT COUNT(*) AS count
             FROM service_requests`

        );


        const [pending] = await db.query(

            `SELECT COUNT(*) AS count
             FROM service_requests
             WHERE status='Pending'`

        );


        const [assigned] = await db.query(

            `SELECT COUNT(*) AS count
             FROM service_requests
             WHERE status='Assigned'`

        );


        const [progress] = await db.query(

            `SELECT COUNT(*) AS count
             FROM service_requests
             WHERE status='In Progress'`

        );


        const [completed] = await db.query(

            `SELECT COUNT(*) AS count
             FROM service_requests
             WHERE status='Completed'`

        );



        res.json({

            total: total[0].count,

            pending: pending[0].count,

            assigned: assigned[0].count,

            progress: progress[0].count,

            completed: completed[0].count

        });



    }

    catch(error){


        console.log(error);


        res.status(500).json({

            message:"Server error"

        });


    }

});

// Provider Performance

router.get("/provider-performance", async(req,res)=>{

    try{


        const [providers] = await db.query(

        `

        SELECT

        sp.provider_id,
        sp.name,
        sp.service_type,


        COUNT(DISTINCT sr.request_id) 
        AS completed_jobs,


        AVG(r.rating)
        AS average_rating


        FROM service_providers sp


        LEFT JOIN bookings b

        ON sp.provider_id=b.provider_id



        LEFT JOIN service_requests sr

        ON b.request_id=sr.request_id

        AND sr.status='Completed'



        LEFT JOIN ratings r

        ON sp.provider_id=r.provider_id



        GROUP BY sp.provider_id


        `

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