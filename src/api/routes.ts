import express, { Response, Request, Router } from "express";

const router: Router = express.Router();

router.get("/", async (req: Request, res: Response): Promise<Response> => {
    return res.status(200).send('Version: 3.0');
});

export default router;