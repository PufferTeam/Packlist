const fs = require('fs');
const { https } = require("follow-redirects");
const crypto = require('crypto');
const cf = require("curseforge-api");

console.log("Running pack.js..");
const client = new cf.CurseForgeClient('$2a$10$bL4bIL5pUWqfcO7KQtnMReakwtfHbNKh6v1uTpKlzhwoueEJQnPnm');

const file = JSON.parse(fs.readFileSync('./mods.json', 'utf8'));

async function getCurseDownloadLink(pID, fID) {
  let file = await client.getModFileDownloadURL(pID, fID);
  return file;
}

async function getModrinthDownloadLink(fID) {
  let url0 = await getJsonFromUrl(`https://api.modrinth.com/v2/version/${fID}`)
  let file;
  url0.files.forEach(e => {
    if (!e.url.endsWith("-dev.jar") && !e.url.endsWith("-api.jar") && !e.url.endsWith("-sources.jar")) {
      file = e.url;
    }
  });
  return file;
}


async function getJsonFromUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Request failed with status ${response.statusCode}`));
        return;
      }

      let data = "";
      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });

      response.on("error", reject);
    }).on("error", reject);
  });
}


function getFileNameFromUrl(url) {
  if (!url) {
    return null;
  }
  let cleanUrl = url.split('?')[0].split('#')[0];
  let fileName = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
  return fileName;
}

async function getFileSha256FromUrl(fileUrl) {
  return new Promise((resolve, reject) => {
    https.get(fileUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Request failed with status ${response.statusCode}`));
        return;
      }

      const hash = crypto.createHash("sha256");
      response.on("data", (chunk) => hash.update(chunk));
      response.on("end", () => resolve(hash.digest("hex")));
      response.on("error", reject);
    }).on("error", reject);
  });
}

function write(filePath, fileContent) {
  if (Array.isArray(fileContent)) {
    fileContent = fileContent.join("\n");
  }
  fs.writeFile(filePath, fileContent, { flag: 'w' }, function (err) {
    if (err)
      return console.error(err);
    fs.readFile(filePath, 'utf-8', function (err, data) {
      if (err)
        return console.error(err);
    });
  });
}

const mods = [];
const packwizFolder = "./mods";
const fileDirectorFolder = "/config/mod-director"

function parseFile() {
  Object.entries(file.mods).forEach(([key, mod]) => {
    let isClientMod = false;
    if (mod.client != undefined) {
      isClientMod = mod.client;
    }
    if (mod.type == "github") {
      mods.push({ key: key, name: mod.name, type: mod.type, link: mod.link, client: isClientMod });
    } else if (mod.type == "curseforge" || mod.type == "modrinth") {
      mods.push({ key: key, name: mod.name, type: mod.type, pID: mod["project-id"], fID: mod["file-id"], client: isClientMod });
    }
  });
}
parseFile();


async function generatePackwiz() {
  for (const mod of mods) {
    let clientString = "both";
    let fileC = [];

    if (mod.client) {
      clientString = "client";
    }

    fileC.push(`name = "${mod.name}"`);

    let url = "";
    if (mod.type === "github") {
      url = mod.link;
    } else if (mod.type === "curseforge") {
      url = await getCurseDownloadLink(mod.pID, mod.fID);
    } else {
      url = await getModrinthDownloadLink(mod.fID);
    }

    let fileName = await getFileNameFromUrl(url);
    let hash = await getFileSha256FromUrl(url);

    fileC.push(`filename = "${fileName}"`);
    fileC.push(`side = "${clientString}"`);
    fileC.push('');
    fileC.push('[download]')
    fileC.push('hash-format = "sha256"')
    fileC.push(`hash = "${hash}"`)
    if (mod.type == "github" || mod.type == "modrinth") {
      fileC.push(`url = "${url}"`)
    } else if (mod.type == "curseforge") {
      fileC.push('mode = "metadata:curseforge"')
    }
    if (mod.type == "curseforge" || mod.type == "modrinth") {
      fileC.push('')
      fileC.push('[update]')
      fileC.push(`[update.${mod.type}]`)
      if(mod.type == "curseforge") {
        fileC.push(`file-id = ${mod.fID}`)
        fileC.push(`project-id = ${mod.pID}`)
      } else {
        fileC.push(`mod-id = ${mod.pID}`)
        fileC.push(`version = ${mod.fID}`)
      }

    }
    await write(`${packwizFolder}/${mod.key}.pw.toml`, fileC.join("\n"));
  }
}
generatePackwiz();
