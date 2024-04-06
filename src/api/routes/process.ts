import express, { Router, Request, Response } from "express";
import ProcessManager from "../../processes/ProcessManager";

const router: Router = express.Router();

const processManager = new ProcessManager();

router.get("/", async (req: Request, res: Response): Promise<Response> => {
    const processes = await processManager.getAll();
    return res.json(processes);
});

router.get("/:id", async (req: Request, res: Response): Promise<Response> => {
    const id = req.params.id;
    const process = await processManager.getProcess(id);

    return res.json(process);
});

export default router;