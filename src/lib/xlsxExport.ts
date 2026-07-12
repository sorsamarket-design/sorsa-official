type XlsxCell = string | number | null | undefined;

const encoder = new TextEncoder();
let crcTable: Uint32Array | null = null;

function getCrcTable() {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  crcTable = table;
  return table;
}

function crc32(bytes: Uint8Array) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosDate, dosTime };
}

function concatBytes(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function createZip(files: Array<{ path: string; content: string }>) {
  const { dosDate, dosTime } = getDosDateTime();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.path);
    const content = encoder.encode(file.content);
    const checksum = crc32(content);
    const localHeader: number[] = [];

    writeUint32(localHeader, 0x04034b50);
    writeUint16(localHeader, 20);
    writeUint16(localHeader, 0x0800);
    writeUint16(localHeader, 0);
    writeUint16(localHeader, dosTime);
    writeUint16(localHeader, dosDate);
    writeUint32(localHeader, checksum);
    writeUint32(localHeader, content.length);
    writeUint32(localHeader, content.length);
    writeUint16(localHeader, name.length);
    writeUint16(localHeader, 0);

    const localFile = concatBytes([new Uint8Array(localHeader), name, content]);
    localParts.push(localFile);

    const centralHeader: number[] = [];
    writeUint32(centralHeader, 0x02014b50);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, 0x0800);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, dosTime);
    writeUint16(centralHeader, dosDate);
    writeUint32(centralHeader, checksum);
    writeUint32(centralHeader, content.length);
    writeUint32(centralHeader, content.length);
    writeUint16(centralHeader, name.length);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint32(centralHeader, 0);
    writeUint32(centralHeader, offset);
    centralParts.push(concatBytes([new Uint8Array(centralHeader), name]));

    offset += localFile.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const endRecord: number[] = [];
  writeUint32(endRecord, 0x06054b50);
  writeUint16(endRecord, 0);
  writeUint16(endRecord, 0);
  writeUint16(endRecord, files.length);
  writeUint16(endRecord, files.length);
  writeUint32(endRecord, centralDirectory.length);
  writeUint32(endRecord, offset);
  writeUint16(endRecord, 0);

  return concatBytes([...localParts, centralDirectory, new Uint8Array(endRecord)]);
}

function escapeXml(value: XlsxCell) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index: number) {
  let name = '';
  let cursor = index + 1;
  while (cursor > 0) {
    const remainder = (cursor - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    cursor = Math.floor((cursor - 1) / 26);
  }
  return name;
}

function buildSheetXml(rows: XlsxCell[][]) {
  const sheetRows = rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const cells = row.map((cell, cellIndex) => {
      const ref = `${columnName(cellIndex)}${rowNumber}`;
      return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
    }).join('');
    return `<row r="${rowNumber}">${cells}</row>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
}

function workbookXml(sheetName: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName).slice(0, 31) || 'Sheet1'}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

export function createXlsxBlob(sheetName: string, rows: XlsxCell[][]) {
  const files = [
    {
      path: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`
    },
    {
      path: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
    },
    {
      path: 'xl/workbook.xml',
      content: workbookXml(sheetName)
    },
    {
      path: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`
    },
    {
      path: 'xl/worksheets/sheet1.xml',
      content: buildSheetXml(rows)
    }
  ];

  return new Blob([createZip(files)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
