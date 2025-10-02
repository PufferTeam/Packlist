const fs = require('fs');
const https = require('https');
const path = require('path');
const crypto = require('crypto');

console.log("Running pack.js..");

const file = JSON.parse(fs.readFileSync('./mods.json', 'utf8'));

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
    } else if (mod.type == "curseforge") {
      mods.push({ key: key, name: mod.name, type: mod.type, pID: mod["project-id"], fID: mod["file-id"], client: isClientMod });
    }
  });
}
parseFile();


function generatePackwiz() {
  mods.forEach(mod => {
    let clientString = "both";
    let fileC = [];
    if (mod.client) {
      clientString = "client";
    }
    fileC.push(`name = ${mod.name}`);
    if (mod.type == "github") {
    }
    write(`${packwizFolder}/${mod.key}.pw.toml`, fileC);
  });
}
generatePackwiz();
console.log(mods);