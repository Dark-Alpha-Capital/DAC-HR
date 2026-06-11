import { createServerFn } from "@tanstack/react-start";

type ServerFnCallable<TInput, TResult> = ((
  input: TInput,
) => Promise<TResult>) & {
  handler: (options: { data: TInput }) => Promise<TResult>;
};

export function defineAction<TInput, TResult>(
  handler: (input: TInput) => Promise<TResult>,
): ServerFnCallable<TInput, TResult> {
  const serverFn = createServerFn({ method: "POST" })
    .validator((data: TInput) => data)
    .handler(async ({ data }) => handler(data));

  const callable = ((input: TInput) =>
    serverFn({ data: input })) as ServerFnCallable<TInput, TResult>;

  Object.assign(callable, serverFn);

  return callable;
}

type ArgsServerFnCallable<TArgs extends unknown[], TResult> = ((
  ...args: TArgs
) => Promise<TResult>) & {
  handler: (options: { data: TArgs }) => Promise<TResult>;
};

export function defineArgsAction<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => Promise<TResult>,
): ArgsServerFnCallable<TArgs, TResult> {
  const serverFn = createServerFn({ method: "POST" })
    .validator((data: TArgs) => data)
    .handler(async ({ data }) => handler(...data));

  const callable = ((...args: TArgs) =>
    serverFn({ data: args })) as ArgsServerFnCallable<TArgs, TResult>;

  Object.assign(callable, serverFn);

  return callable;
}

export function defineQuery<TResult>(
  handler: () => Promise<TResult>,
): (() => Promise<TResult>) & { handler: () => Promise<TResult> } {
  const serverFn = createServerFn({ method: "GET" }).handler(async () =>
    handler(),
  );

  const callable = (() => serverFn()) as (() => Promise<TResult>) & {
    handler: () => Promise<TResult>;
  };

  Object.assign(callable, serverFn);

  return callable;
}

export function defineArgsQuery<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => Promise<TResult>,
): ArgsServerFnCallable<TArgs, TResult> {
  const serverFn = createServerFn({ method: "GET" })
    .validator((data: TArgs) => data)
    .handler(async ({ data }) => handler(...data));

  const callable = ((...args: TArgs) =>
    serverFn({ data: args })) as ArgsServerFnCallable<TArgs, TResult>;

  Object.assign(callable, serverFn);

  return callable;
}

export function defineQueryWithInput<TInput, TResult>(
  handler: (input: TInput) => Promise<TResult>,
): ServerFnCallable<TInput, TResult> {
  const serverFn = createServerFn({ method: "GET" })
    .validator((data: TInput) => data)
    .handler(async ({ data }) => handler(data));

  const callable = ((input: TInput) =>
    serverFn({ data: input })) as ServerFnCallable<TInput, TResult>;

  Object.assign(callable, serverFn);

  return callable;
}
