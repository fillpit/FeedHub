export type RequestErrorCode = -1 | 400 | 401 | 402 | 403 | 500 | 501;

export interface RequestSuccess<T> {
  code: 0;
  data: T;
  message: string;
}

export interface RequestError<T> {
  code: RequestErrorCode;
  message: string;
  data?: T;
}

export type RequestResult<T> = RequestSuccess<T> | RequestError<T>;
