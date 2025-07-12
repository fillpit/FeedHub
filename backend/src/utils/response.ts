import { Response } from "express";

interface ResponseData {
  code?: number; // 业务状态码
  message?: string;
  data?: any;
}

export const sendSuccess = (res: Response, response: ResponseData, businessCode: number = 0) => {
  response.code = businessCode;
  res.status(200).json(response);
};

export const sendError = (res: Response, response: ResponseData, businessCode: number = 10000) => {
  response.code = businessCode;
  res.status(200).json(response);
};
