const xlsx = require('xlsx');
try {
    const wb = xlsx.readFile('C:\\Users\\geovanny.sanchez\\Documents\\LISTADO DE PROCEDIMIENTOS.xlsx');
    const sheetName = wb.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
    console.log("Total rows:", data.length);
    console.log("First 10 rows:");
    console.log(JSON.stringify(data.slice(0, 10), null, 2));
} catch (e) { console.error(e) }
