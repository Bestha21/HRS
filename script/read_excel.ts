import * as XLSX from 'xlsx';
import * as fs from 'fs';

try {
  const buf = fs.readFileSync('attached_assets/Modules_(1)_1766253719373.xlsx');
  const wb = XLSX.read(buf);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(JSON.stringify(data, null, 2));
} catch (e) {
  console.error("Error reading excel:", e);
}
