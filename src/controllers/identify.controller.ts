import { Request, Response } from "express";
import { handleIdentify } from "../services/contact.service";

export async function processIdentify(req: Request, res: Response) {
    try {
        const { email, phoneNumber } = req.body;

        // at least one of email or phoneNumber must be provided
        if (!email && !phoneNumber) {
            return res.status(400).json({
                error: "At least one of email or phoneNumber must be provided",
            });
        }

        // normalize phoneNumber to string
        const phoneStr = phoneNumber ? String(phoneNumber) : null;
        const emailStr = email ? String(email) : null;

        const result = await handleIdentify(emailStr, phoneStr);

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error in /identify:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
