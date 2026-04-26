import * as https from "https";
import { EventEmitter } from "events";
import { ClientRequest, IncomingMessage } from "http";
import { downloadFrom } from "../../Tasks/YarnInstaller/download";

const httpsModule = require("https") as typeof https;

describe("Yarn Installer", () => {
  describe("Donwloader", () => {
    const previousTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;

    beforeAll(() => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    });

    afterAll(() => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = previousTimeout;
    });

    it("Successfully downloads from Github", async () => {
      console.log("downloading from github");
      const response = await downloadFrom(
        "https://github.com/yarnpkg/yarn/releases/download/v1.17.0/yarn-v1.17.0.tar.gz",
        console.log,
      );
      expect(response.statusCode).toBe(200);
    });

    it("adds a proxy agent when HTTPS_PROXY is set", async () => {
      const previousHttpsProxy = process.env.HTTPS_PROXY;
      const previousHttpProxy = process.env.HTTP_PROXY;
      const previousLowercaseHttpsProxy = process.env.https_proxy;
      const previousLowercaseHttpProxy = process.env.http_proxy;
      let capturedOptions: https.RequestOptions | undefined;

      const fakeResponse = {
        statusCode: 200,
        headers: {},
      } as IncomingMessage;
      const fakeRequest = new EventEmitter();

      try {
        process.env.HTTPS_PROXY = "http://proxy.internal:8080";
        delete process.env.HTTP_PROXY;
        delete process.env.https_proxy;
        delete process.env.http_proxy;

        spyOn(httpsModule, "get").and.callFake(
          (
            requestUrlOrOptions: string | URL | https.RequestOptions,
            optionsOrCallback?:
              | https.RequestOptions
              | ((response: IncomingMessage) => void),
            callback?: (response: IncomingMessage) => void,
          ): ClientRequest => {
            const responseHandler =
              typeof optionsOrCallback === "function"
                ? optionsOrCallback
                : callback;

            capturedOptions =
              typeof requestUrlOrOptions === "object" &&
              !(requestUrlOrOptions instanceof URL)
                ? requestUrlOrOptions
                : typeof optionsOrCallback === "function"
                  ? undefined
                  : optionsOrCallback;
            responseHandler?.(fakeResponse);

            return fakeRequest as unknown as ClientRequest;
          },
        );

        const response = await downloadFrom("https://example.test/package.tgz");

        expect(response.statusCode).toBe(200);
        expect(capturedOptions?.agent).toBeDefined();
      } finally {
        if (previousHttpsProxy === undefined) {
          delete process.env.HTTPS_PROXY;
        } else {
          process.env.HTTPS_PROXY = previousHttpsProxy;
        }

        if (previousHttpProxy === undefined) {
          delete process.env.HTTP_PROXY;
        } else {
          process.env.HTTP_PROXY = previousHttpProxy;
        }

        if (previousLowercaseHttpsProxy === undefined) {
          delete process.env.https_proxy;
        } else {
          process.env.https_proxy = previousLowercaseHttpsProxy;
        }

        if (previousLowercaseHttpProxy === undefined) {
          delete process.env.http_proxy;
        } else {
          process.env.http_proxy = previousLowercaseHttpProxy;
        }
      }
    });
  });
});
