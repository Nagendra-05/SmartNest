const express = require("express");
const db = require("../db");
const router = express.Router();
const validId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;

// Show only future, available appointments.
router.get("/slots", async (req, res) => {
    if (!validId(req.query.provider_id)) {
        return res.status(400).json({ message: "Select a valid provider" });
    }
    try {
        const [slots] = await db.query(
            `SELECT * FROM time_slots
             WHERE provider_id=? AND status='Available'
             AND TIMESTAMP(slot_date,start_time) > NOW()
             ORDER BY slot_date,start_time`, [req.query.provider_id]
        );
        res.json(slots);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to load slots" });
    }
});

router.post("/book", async (req, res) => {
    let connection;
    const { request_id, provider_id, slot_id } = req.body;
    if (![request_id, provider_id, slot_id].every(validId)) {
        return res.status(400).json({ message: "Select a request, provider and slot" });
    }
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        // Lock the request first: simultaneous bookings for different slots
        // must still result in only one booking for this maintenance request.
        const [requests] = await connection.query(
            "SELECT * FROM service_requests WHERE request_id=? FOR UPDATE", [request_id]
        );
        if (!requests.length || requests[0].status !== "Pending") {
            await connection.rollback();
            return res.status(409).json({ message: "This request is no longer pending" });
        }
        const [existing] = await connection.query(
            "SELECT booking_id FROM bookings WHERE request_id=?", [request_id]
        );
        if (existing.length) {
            await connection.rollback();
            return res.status(409).json({ message: "This request is already booked" });
        }
        const [providers] = await connection.query(
            "SELECT * FROM service_providers WHERE provider_id=? AND availability='Available'",
            [provider_id]
        );
        const categories = {
            Plumbing: "Plumber", Electrical: "Electrician",
            Cleaning: "Cleaner", Carpentry: "Carpenter"
        };
        const providerType = providers[0]?.service_type === "Cleaning"
            ? "Cleaner" : providers[0]?.service_type;
        if (!providers.length || categories[requests[0].service_type] !== providerType) {
            await connection.rollback();
            return res.status(400).json({ message: "Choose an available provider for this service" });
        }
        const [slots] = await connection.query(
            `SELECT * FROM time_slots WHERE slot_id=? AND provider_id=?
             AND status='Available' AND TIMESTAMP(slot_date,start_time) > NOW()
             FOR UPDATE`, [slot_id, provider_id]
        );
        if (!slots.length) {
            await connection.rollback();
            return res.status(409).json({ message: "This slot is no longer available" });
        }
        const [booking] = await connection.query(
            "INSERT INTO bookings (request_id,provider_id,slot_id) VALUES(?,?,?)",
            [request_id, provider_id, slot_id]
        );
        await connection.query("UPDATE time_slots SET status='Booked' WHERE slot_id=?", [slot_id]);
        await connection.query(
            "UPDATE service_requests SET status='Assigned',assigned_at=NOW() WHERE request_id=?",
            [request_id]
        );
        await connection.commit();
        res.status(201).json({ message: "Service booked successfully", booking_id: booking.insertId });
    } catch (error) {
        if (connection) await connection.rollback().catch(() => {});
        console.error(error);
        res.status(500).json({ message: "Booking failed" });
    } finally {
        if (connection) connection.release();
    }
});

router.get("/provider-jobs", async (req, res) => {
    if (!validId(req.query.provider_id)) {
        return res.status(400).json({ message: "Invalid provider" });
    }
    try {
        const [jobs] = await db.query(
            `SELECT b.booking_id,sr.request_id,sr.service_type,sr.description,
                    sr.priority,sr.status,ts.slot_date,ts.start_time,ts.end_time
             FROM bookings b
             JOIN service_requests sr ON b.request_id=sr.request_id
             JOIN time_slots ts ON b.slot_id=ts.slot_id
             WHERE b.provider_id=? ORDER BY ts.slot_date,ts.start_time`,
            [req.query.provider_id]
        );
        res.json(jobs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to load jobs" });
    }
});

router.put("/update-status", async (req, res) => {
    const { request_id, status } = req.body;
    if (!validId(request_id) || !["In Progress", "Completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid request or job status" });
    }
    try {
        const previous = status === "Completed" ? "In Progress" : "Assigned";
        const [result] = await db.query(
            `UPDATE service_requests SET status=?${status === "Completed" ? ",completed_at=NOW()" : ""}
             WHERE request_id=? AND status=?`, [status, request_id, previous]
        );
        if (!result.affectedRows) {
            return res.status(409).json({ message: "Job status has changed. Refresh your jobs." });
        }
        res.json({ message: "Status updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Status update failed" });
    }
});

module.exports = router;
