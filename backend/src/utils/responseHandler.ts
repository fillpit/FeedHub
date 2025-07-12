import { Response } from "express";

export const handleResponse = (res: Response, data: any, success: boolean) => {
  res.json({ success, data });
};
