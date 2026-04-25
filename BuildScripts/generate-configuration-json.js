const fs = require("fs");

const env = process.env;

const readEnv = (...names) => {
  for (const name of names) {
    const value = env[name];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  throw new Error(
    `Missing required environment variable. Expected one of: ${names.join(", ")}`,
  );
};

const configuration = {
  environments: [
    {
      Name: "production",
      VssExtensionIdSuffix: "",
      VssExtensionGalleryFlags: ["Public"],
      DisplayNamesSuffix: "",
      TaskIds: {
        Yarn: readEnv("PUBLIC_TASK_ID_YARN"),
        YarnInstaller: readEnv("PUBLIC_TASK_ID_YARN_INSTALLER"),
      },
    },
    {
      Name: "dev",
      VssExtensionIdSuffix: "-dev",
      VssExtensionGalleryFlags: [],
      DisplayNamesSuffix: " (Development)",
      TaskIds: {
        Yarn: readEnv("PRIVATE_TASK_ID_YARN"),
        YarnInstaller: readEnv("PRIVATE_TASK_ID_YARN_INSTALLER"),
      },
    },
  ],
};

fs.writeFileSync(
  "configuration.json",
  JSON.stringify(configuration, null, 2) + "\n",
);
console.log("Generated configuration.json");
