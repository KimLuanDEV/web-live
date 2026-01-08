const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "users.json");

function loadAll() {
  if (!fs.existsSync(FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveAll(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getUser(uid) {
  const all = loadAll();
  return all[uid] || null;
}

function saveUser(uid, profile) {
  if (!uid) return;
  const all = loadAll();
  all[uid] = profile;
  saveAll(all);
}

module.exports = { getUser, saveUser };
