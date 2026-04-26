import { shouldUseCorepackForVersionSpec } from "../../Tasks/YarnInstaller/yarnToolInstallerTask";

describe("Yarn Installer version routing", () => {
  describe("Corepack version routing", () => {
    it("keeps Yarn Classic requests on the classic installer path", () => {
      expect(shouldUseCorepackForVersionSpec("1.x")).toBeFalse();
      expect(shouldUseCorepackForVersionSpec("1.22.22")).toBeFalse();
      expect(shouldUseCorepackForVersionSpec("^1.22.0")).toBeFalse();
    });

    it("routes Yarn 2+ requests through Corepack", () => {
      expect(shouldUseCorepackForVersionSpec("2.x")).toBeTrue();
      expect(shouldUseCorepackForVersionSpec("4.6.0")).toBeTrue();
      expect(shouldUseCorepackForVersionSpec(">=2.0.0")).toBeTrue();
      expect(shouldUseCorepackForVersionSpec("berry")).toBeTrue();
      expect(shouldUseCorepackForVersionSpec("stable")).toBeTrue();
    });
  });
});
