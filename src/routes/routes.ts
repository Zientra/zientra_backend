import { Router } from "express";
import { Pool } from "pg";

const router = Router();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

router.post("/", async (req, res) => {

    const { email } = req.body;

    if (!email || !email.trim()) {
        return res.status(400).json({
            success: false,
            message: "Email is required"
        });
    }

    try {

        await pool.query(
            `
            INSERT INTO waitlist (email)
            VALUES ($1)
            `,
            [email.trim().toLowerCase()]
        );

        return res.status(201).json({
            success: true,
            message: "Added to waitlist"
        });

    } catch (error: any) {

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Email is already on the waitlist"
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
});

export default router;