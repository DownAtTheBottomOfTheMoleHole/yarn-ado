const fs = require("fs");

const env = process.env;

const configuration = {
  environments: [
    {
      Name: "production",
      VssExtensionIdSuffix: "",
      VssExtensionGalleryFlags: ["Public"],
      DisplayNamesSuffix: "",
      TaskIds: {
        Yarn: env.PUBLIC_TASK_ID_YARN || "50f72d42-5995-4ba8-827a-4bef952f4801",
        YarnInstaller:
          env.PUBLIC_TASK_ID_YARN_INSTALLER ||
          "1270a551-c293-4d09-bee4-9677503abd9c",
      },
    },
    {
      Name: "dev",
      VssExtensionIdSuffix: "-dev",
      VssExtensionGalleryFlags: [],
      DisplayNamesSuffix: " (Development)",
      TaskIds: {
        Yarn:
          env.PRIVATE_TASK_ID_YARN || "a1b30675-f862-45ce-9cee-0011811f1351",
        YarnInstaller:
          env.PRIVATE_TASK_ID_YARN_INSTALLER ||
          "c104074a-6f03-45e6-ac24-817f6cf91028",
      },
    },
  ],
};

fs.writeFileSync(
  "configuration.json",
  JSON.stringify(configuration, null, 2) + "\n",
);
console.log("Generated configuration.json");
