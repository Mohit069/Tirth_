/**
 * Bafna Tirth yatri app -> this Google Sheet.
 *
 * Right after a yatri submits the form, the app sends the entry here. This script writes it as one
 * row in a tab per month ("2026-10", "2026-11", ...) and saves the optional ID photo in a private
 * Google Drive folder ("Tirth ID photos"), with the photo's link in the "ID फोटो" column.
 * A cancellation (or a retry) rewrites the same row, found by token number, so rows never repeat.
 *
 * Setup (also in the app's README, "Google Sheet setup"):
 *   1. In the sheet: Extensions -> Apps Script. Delete what is there and paste this whole file.
 *   2. Replace PASTE-YOUR-SECRET-HERE below with the app's GOOGLE_SCRIPT_SECRET. Save.
 *   3. Deploy -> New deployment -> type "Web app". Execute as: Me. Who has access: Anyone.
 *      Deploy, allow the access Google asks for, and copy the "Web app" URL (ends in /exec)
 *      into the app's GOOGLE_SCRIPT_URL.
 * After changing this file later: Deploy -> Manage deployments -> edit -> Version: New version.
 */

const SECRET = "PASTE-YOUR-SECRET-HERE";
const PHOTO_FOLDER = "Tirth ID photos";

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: "Request is not JSON" });
  }
  if (SECRET === "PASTE-YOUR-SECRET-HERE" || !req || req.secret !== SECRET) {
    return reply({ ok: false, error: "Wrong secret: check SECRET in the script and GOOGLE_SCRIPT_SECRET in the app" });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // one entry at a time, so two entries never take the same row
  try {
    const sheet = monthTab(req.tab, req.headers);
    const row = req.row.map(asText);
    let photoUrl = "";
    if (req.photo && req.photo.data) {
      photoUrl = savePhoto(req.photo);
      row[req.photoColumn - 1] = photoUrl;
    }
    const at = findRow(sheet, String(req.token)) || sheet.getLastRow() + 1;
    sheet.getRange(at, 1, 1, row.length).setNumberFormat("@").setValues([row]);
    return reply({ ok: true, range: "'" + sheet.getName() + "'!A" + at, photoUrl: photoUrl });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** The month's tab, created with a bold, frozen header row the first time. Newest month first. */
function monthTab(name, headers) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const existing = book.getSheetByName(name);
  if (existing) return existing;
  const sheet = book.insertSheet(name, 0);
  sheet
    .getRange(1, 1, 1, headers.length)
    .setNumberFormat("@")
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground("#fdf1e7");
  sheet.setFrozenRows(1);
  return sheet;
}

/** Row number of a token in column A, or 0. */
function findRow(sheet, token) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const hit = sheet.getRange(2, 1, last - 1, 1).createTextFinder(token).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : 0;
}

/** Everything is stored as plain text; a value starting like a formula is kept as text. */
function asText(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** Saves the photo in the private folder and returns its link. A retry reuses the saved file. */
function savePhoto(photo) {
  const folder = photoFolder();
  const found = folder.getFilesByName(photo.name);
  if (found.hasNext()) return found.next().getUrl();
  const blob = Utilities.newBlob(Utilities.base64Decode(photo.data), photo.mime || "image/jpeg", photo.name);
  return folder.createFile(blob).getUrl();
}

function photoFolder() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("PHOTO_FOLDER_ID");
  if (id) {
    try {
      return DriveApp.getFolderById(id);
    } catch (err) {
      // folder was deleted: make a new one
    }
  }
  const folder = DriveApp.createFolder(PHOTO_FOLDER);
  props.setProperty("PHOTO_FOLDER_ID", folder.getId());
  return folder;
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
