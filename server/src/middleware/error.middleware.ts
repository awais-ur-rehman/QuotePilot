import { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      ...(err instanceof ValidationError && err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  // Unexpected error — log it
  logger.error("Unexpected error", { message: err.message, stack: err.stack, url: req.url });

  const message =
    process.env.NODE_ENV === "production" ? "Internal server error" : err.message;

  res.status(500).json({ status: "error", message });
}

/** Wraps async route handlers to forward errors to Express error middleware */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
