export const AppError = (
  message: string,
  statusCode = 500,
  code = "INTERNAL_SERVER_ERROR",
) => {
  const error = new Error(message) as Error & {
    statusCode: number;
    code: string;
  };

  error.statusCode = statusCode;
  error.code = code;

  return error;
};
