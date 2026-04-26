import * as https from "https";
import * as q from "q";
import { IncomingMessage } from "http";

async function httpsGet(
  url: string,
  headers?: Record<string, string>,
): Promise<IncomingMessage> {
  const deferred = q.defer<IncomingMessage>();

  const options: https.RequestOptions = {};

  const proxy = // Azure DevOps transforms all variables to uppercase
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;

  if (proxy !== null && proxy !== undefined) {
    const { HttpsProxyAgent } = await import("https-proxy-agent");
    options.agent = new HttpsProxyAgent(
      proxy,
    ) as unknown as https.RequestOptions["agent"];
  }

  options.headers = {
    accept: "application/octet-stream, application/json",
    "user-agent": "yarn-ado",
    ...headers,
  };

  https
    .get(url, options, (response: IncomingMessage) => {
      deferred.resolve(response);
    })
    .on("error", (err: Error) => {
      deferred.reject(err);
    });

  return await deferred.promise;
}

export async function downloadFrom(
  url: string,
  logRedirect?: (location: string) => void,
  headers?: Record<string, string>,
): Promise<IncomingMessage> {
  let response = await httpsGet(url, headers);
  let statusCode = response.statusCode ?? 0;
  while ((statusCode >= 301 && statusCode <= 303) || statusCode == 307) {
    const location = response.headers["location"] as string;
    if (logRedirect) {
      logRedirect(location);
    }
    response = await httpsGet(location, headers);
    statusCode = response.statusCode ?? 0;
  }

  return response;
}
