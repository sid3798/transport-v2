const express = require("express");
const cors = require("cors");
const PDFDocument = require("pdfkit");

const authorize = require("./config/driveAuth");
const { google } = require("googleapis");
const streamifier = require("streamifier");


let drive;

async function initDrive() {
  const auth = await authorize();

  drive = google.drive({
    version: "v3",
    auth,
  });
}

//initDrive();

const DRIVE_FOLDERS = {
  SW: "13rXGURqcFtgfuGcEALg538qvqQuMbHK4",
  SG: "1ZWqbYBsUNcUv3eEYR0x58Kvw417KsPoK",
};







const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const companyDetails = {
  SG: {
    name: "SG TRANSPORT",
    subtitle: "TRANSPORT CONTRACTOR & CONTAINER SUPPLIERS",
    address: "Office: 03, Neelkanth Deep Plot No.196 Sector 23, Ulwe, Navi Mumbai 410206",
    mobile: "8291471842/8108585807",
    email: "saurabhgadge444@gmail.com",
    bankName: "SARASWAT BANK",
    accountNo: "610000000012951",
    ifsc: "SRCB0000446",
    pan: "DDAPG6320P",
  },
  SW: {
    name: "SIDDHESHWAR TRANSPORT",
    subtitle: "TRANSPORT CONTRACTOR & CONTAINER SUPPLIERS",
    address: "Office: 03, Neelkanth Deep Plot No.196 Sector 23, Ulwe, Navi Mumbai 410206",
    mobile: "9820795569/8108585807",
    email: "laxmangadge1234@gmail.com",
    bankName: "IDBI Bank",
    accountNo: "0306653800000064",
    ifsc: "IBKL0000306",
    pan: "AIGPG3412N",
  },
};



function convertNumberToWords(num) {

  num = Number(String(num).replace(/,/g, "")) || 0;

  if (num === 0) return "Zero";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six",
    "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
    "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];

  const b = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + " " + a[n % 10];
    if (n < 1000)
      return a[Math.floor(n / 100)] + " Hundred " + inWords(n % 100);
    if (n < 100000)
      return inWords(Math.floor(n / 1000)) + " Thousand " + inWords(n % 1000);
    if (n < 10000000)
      return inWords(Math.floor(n / 100000)) + " Lakh " + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + " Crore " + inWords(n % 10000000);
  }

  return (inWords(num) || "").trim();
}


/* ------------------------
   FOOTER FUNCTION
-------------------------*/

function drawFooter(doc, data, company) {

  const startX = 20;
  const startY = doc.page.height - 160;

const totalPageWidth = doc.page.width - 40;

const bankWidth = totalPageWidth * 0.30;
const gstWidth = totalPageWidth * 0.40;
const totalWidth = totalPageWidth - bankWidth - gstWidth;

  const boxHeight = 65;

  const gstX = startX + bankWidth;
  const totalX = gstX + gstWidth;

  // ===== TOP THREE BOXES =====

// ===== FOOTER BOXES =====

doc.rect(startX, startY, bankWidth, boxHeight).stroke();

doc.rect(gstX, startY, gstWidth, boxHeight).stroke();

doc.rect(totalX, startY, totalWidth, boxHeight).stroke();

  // ===== BANK DETAILS =====

  doc.text(`Bank Name: ${company.bankName}`, startX + 6, startY + 10);

  doc.text(`A/C No: ${company.accountNo}`, startX + 6, startY + 25);

  doc.text(`IFSC Code: ${company.ifsc}`, startX + 6, startY + 40);


  // ===== GST BOX =====

doc.text(`GST PAYABLE   E. & O. E`, gstX + 6, startY + 10);
doc.text(`CONSIGNOR`, gstX + 6, startY + 28);
doc.text(`CONSIGNEE`, gstX + 6, startY + 45);
doc.text(`PAN NO- ${company.pan}`, gstX + 80, startY + 45);


  // ===== TOTAL BOX =====

const labelX = totalX + 8;
const valueX = totalX + totalWidth - 90;



doc.text("TOTAL", labelX, startY + 10);

doc.text(
  `${Number(data.grandTotal).toLocaleString("en-IN")}`,
  valueX,
  startY + 10,
  { width: 70, align: "right" }
);

doc.text("ADVANCE", labelX, startY + 28);

doc.text(
  `${Number(data.totalAdvance).toLocaleString("en-IN")}`,
  valueX,
  startY + 28,
  { width: 70, align: "right" }
);

doc.font("Helvetica-Bold");

doc.text("NETT.BAL", labelX, startY + 46);

doc.text(
  `${Number(data.netBalance).toLocaleString("en-IN")}`,
  valueX,
  startY + 46,
  { width: 70, align: "right" }
);

doc.font("Helvetica");


  // ===== AMOUNT IN WORDS BOX =====

  const wordsY = startY + boxHeight +2;



  doc.text(
    `Rupees ${convertNumberToWords(data.netBalance)} Only`,
    startX + 8,
    wordsY + 8
  );


  // ===== SIGNATURE =====

  doc.fontSize(10);



const signX = doc.page.width - 220;  // right side
const signY = wordsY + 8;            // reduce gap

doc.text(
  `For ${company.name}`,
  signX,
  signY,
  { width: 190, align: "right" }
);

doc.text(
  "Proprietor",
  signX,
  signY + 30,
  { width: 190, align: "right" }
);



}


function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  const options = {
    day: "2-digit",
    month: "short",
    year: "numeric"
  };

  return date.toLocaleDateString("en-GB", options);
}



app.post("/generate-pdf", (req, res) => {

  console.log("PDF received");

  const data = req.body;
  
  const company = companyDetails[data.owner];

  

  const billText = data.billNo;            // full text for pdf name
  const billNo = data.billNo.split(" ")[0]; // only first word for printing

  const doc = new PDFDocument({
    size: "A4",
    margin: 40
  });




  // PAGE BORDER
doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();

//   res.setHeader("Content-Type", "application/pdf");
//   res.setHeader(
//   "Content-Disposition",
//   `attachment; filename=${billText}.pdf`
// );



const buffers = [];

doc.on("data", buffers.push.bind(buffers));

doc.on("end", async () => {
  const pdfBuffer = Buffer.concat(buffers);

  // Send PDF to browser
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${billText}.pdf`
  );
  res.send(pdfBuffer);

  // Upload to Google Drive
  try {
    const folderId = DRIVE_FOLDERS[data.owner];




await drive.files.create({
  requestBody: {
    name: `${billText}.pdf`,
    parents: [folderId]
  },
  media: {
    mimeType: "application/pdf",
    body: streamifier.createReadStream(pdfBuffer)
  },
  fields: "id",
  supportsAllDrives: true,
  supportsTeamDrives: true
});



    

    console.log("PDF uploaded to Google Drive");

  } catch (err) {
    console.error("Drive Upload Error:", err);
  }
});

  // HEADER//////////////////////////////////////////




// COMPANY NAME
doc.font("Helvetica-Bold")
   .fontSize(22)
   .text(company.name, {
     align: "center"
   });

// SUBTITLE
doc.moveDown(0.2);

doc.font("Helvetica-Bold")
   .fontSize(11)
   .text(company.subtitle, {
     align: "center"
   });

// ADDRESS
doc.moveDown(0.2);

doc.font("Helvetica")
   .fontSize(9)
   .text(company.address, {
     align: "center"
   });

// CONTACT DETAILS
doc.moveDown(0.1);

doc.font("Helvetica")
   .fontSize(9)
   .text(
     `Mob: ${company.mobile}   Email: ${company.email}`,
     {
       align: "center"
     }
   );

doc.moveDown(0.6);




  //TITLE///////////////////////


doc.moveDown(0.6);

// top dotted line
doc.strokeColor("#888")
   .dash(2, { space: 2 })
   .moveTo(40, doc.y)
   .lineTo(doc.page.width - 40, doc.y)
   .stroke()
   .undash();

// spacing between line and title
const titleY = doc.y + 8;

// title
doc.strokeColor("black")
   .fontSize(14)
   .text("TRANSPORTATION INVOICE", 0, titleY, { align: "center" });

// bottom dotted line (same gap as top)
const bottomLineY = titleY + 14;

doc.strokeColor("#888")
   .dash(2, { space: 2 })
   .moveTo(40, bottomLineY)
   .lineTo(doc.page.width - 40, bottomLineY)
   .stroke()
   .undash();

doc.strokeColor("black");

// move cursor below section
doc.y = bottomLineY + 10;



  // BILL INFO



doc.fontSize(9);

const leftX = 40;
const middleX = 170;
const rightX =450;

const infoY = doc.y;

// LEFT
doc.text(`M/s : ${data.msName}`, leftX, infoY);
doc.text(`A/c : ${data.account}`, leftX, infoY + 15);

// MIDDLE (JOB NO)
if (data.jobNo) {
  doc.text(`JOB NO : ${data.jobNo}`, middleX, infoY);
}

// RIGHT
doc.text(
  `BILL NO : ${billNo}`,
  doc.page.width - 200,
  infoY,
  { width: 160, align: "right" }
);

doc.text(
  `DATE : ${formatDate(data.date)}`,
  doc.page.width - 200,
  infoY + 15,
  { width: 160, align: "right" }
);

doc.moveDown();



// line separator
doc.moveTo(20, doc.y).lineTo(doc.page.width - 20, doc.y).stroke();
doc.moveDown(0.5);

// VEHICLES
(data.vehicles || []).forEach((v, i) => {

  doc.moveDown(0.5);

  const y = doc.y;

  // ================= LEFT COLUMN =================
let leftY = y;

function drawLeft(text) {

  const h = doc.heightOfString(text, {
    width: 200
  });

  doc.text(text, leftX, leftY, {
    width: 200
  });

  leftY += h + 2;
}

drawLeft(`DATE: ${formatDate(v.rowDate)}`);
drawLeft(`TRUCK: ${v.truckNo}`);

if (v.containerNo) {
  drawLeft(`CONT NO: ${v.containerNo}`);
}

const leftEndY = leftY;

  // ================= MIDDLE COLUMN =================
  let middleY = y;

  if (v.from || v.to) {
    doc.text(`ROUTE: ${v.from || ""} ---> ${v.to || ""}`, middleX, middleY);
    middleY += 15;
  }

  if (v.mtYard) {
    doc.text(`MT YARD: ${v.mtYard}`, middleX, middleY);
    middleY += 15;
  }

  if (v.kgs) {
    doc.text(`WEIGHT: ${v.kgs}`, middleX, middleY);
    middleY += 15;
  }

  if (v.size) {
    doc.text(`SIZE: ${v.size}`, middleX, middleY);
    middleY += 15;
  }

  if (v.note) {
  doc.text(`NOTE: ${v.note}`, middleX, middleY);
  middleY += 15;
}

  const middleEndY = middleY;


  // ================= RIGHT COLUMN =================
  let chargeY = y;

  const chargeLabelX = rightX - 20;
  const chargeValueX = 525;

  const labelWidth = 90;
  const valueWidth = 40;

  function drawCharge(label, value) {

    const labelText = `${label}:`;

    const labelHeight = doc.heightOfString(labelText, {
      width: labelWidth
    });

    doc.text(labelText, chargeLabelX, chargeY, {
      width: labelWidth,
      align: "right"
    });

    doc.text(
      Number(value || 0).toLocaleString(),
      chargeValueX,
      chargeY,
      { width: valueWidth, align: "right" }
    );

    chargeY += Math.max(labelHeight, 13);
  }

  // RATE FIRST
  drawCharge("RATE", v.rate);

  if (v.kata) drawCharge("KATA", v.kata);
  if (v.mt) drawCharge("MT", v.mt);

  if (Array.isArray(v.charges)) {
    v.charges.forEach((c) => {
      drawCharge(c.label, c.amount);
    });
  }

  if (v.advance) {
    doc.font("Helvetica-Bold");
    drawCharge("ADVANCE", v.advance);
    doc.font("Helvetica");
  }

  const rightEndY = chargeY;


  // ================= VEHICLE HEIGHT =================

  const vehicleBottom = Math.max(leftEndY, middleEndY, rightEndY);

  doc
    .strokeColor("#bfbfbf")
    .dash(2, { space: 2 })
    .moveTo(20, vehicleBottom + 5)
    .lineTo(doc.page.width - 20, vehicleBottom + 5)
    .stroke()
    .undash()
    .strokeColor("black");

  doc.y = vehicleBottom + 15;

});

  // FOOTER POSITION CHECK

  if (doc.y > doc.page.height - 220) {
    doc.addPage();
  }

drawFooter(doc, data, company);



doc.end();


});


// ===============================
// GET NEXT BILL NUMBER API
// ===============================

app.get("/next-bill-number", async (req, res) => {

  try {

    const owner = req.query.owner;
    const folderId = DRIVE_FOLDERS[owner];

    //console.log("OWNER:", owner);
    //console.log("FOLDER ID USED:", folderId);

    console.log("Cliked on refresh, fetching bill number...");
const test = await drive.files.list({ pageSize: 10, fields: "files(name)" });
//console.log("Drive test files:", test.data.files);

const response = await drive.files.list({
  q: `'${folderId}' in parents and trashed=false`,
  orderBy: "createdTime desc",
  pageSize: 1000,
  fields: "files(name)",
  spaces: "drive"
});



//console.log("FILES FROM API:", response.data.files);
// console.log("FILES FOUND:", response.data.files.length);

    let maxBill = 0;

    response.data.files.forEach(file => {

      //console.log("FILE NAME:", file.name);

      const match = file.name.match(/^\d+/);

      if (match) {
        const billNo = parseInt(match[0]);
        if (billNo > maxBill) maxBill = billNo;
      }

    });

    //console.log("MAX BILL FOUND:", maxBill);

    res.json({ nextBillNo: maxBill + 1 });

  } catch (err) {

    console.error("Bill number fetch error:", err);

    res.status(500).json({ error: "Failed to fetch bill number" });

  }

});

// end of fetch bill no section

const PORT = process.env.PORT || 5000;

initDrive()
  .then(() => {
    console.log("Google Drive connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  })
  .catch((err) => {
    console.error("Drive initialization failed:", err);
  });