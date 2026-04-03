import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { FiRefreshCw } from "react-icons/fi";
import { db } from "../services/firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";



console.log("Firebase connected:", db);


function Transport() {
  const [owner, setOwner] = useState("SW");
  const [date, setDate] = useState("");
  const [billNo, setBillNo] = useState("");
  const [msName, setMsName] = useState("");
  const [account, setAccount] = useState("");

  const [jobNo, setJobNo] = useState("");

  const [vehicles, setVehicles] = useState([]);

  const chargeOptions = ["TEA", "UNLOADING", "FREIGHT", "LOADING", "PARKING", "OTHER"];

  // auto fetch bill no /////

  const fetchNextBillNoByOwner = async (selectedOwner) => {
    try {
      const q = query(
        collection(db, "bills"),
        where("owner", "==", selectedOwner),
        orderBy("createdAt", "desc"),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return "1"; // first bill
      }

      const lastBill = snapshot.docs[0].data();

      // extract number from billNo (first part)
      const lastNo = parseInt(lastBill.billNo.split(" ")[0]) || 0;

      return (lastNo + 1).toString();

    } catch (err) {
      console.error("Fetch bill no error:", err);
      return "";
    }
  };


  // auto fetch bill no /////

  /// 🚀 STEP 2: Auto Set Bill No on Owner Change



  useEffect(() => {
    if (!owner) return;

    const loadBillNo = async () => {
      const nextNo = await fetchNextBillNoByOwner(owner);
      setBillNo(nextNo);
    };

    loadBillNo();
  }, [owner]);


  useEffect(() => {
    fetchNextBillNoByOwner(owner).then(setBillNo);
  }, []);

  /// 🚀 STEP 2: Auto Set Bill No on Owner Change


  // -------- AUTOSUGGEST STORAGE --------
  function saveFieldValue(key, value) {
    if (!value) return;

    let list = JSON.parse(localStorage.getItem(key)) || [];

    if (!list.includes(value)) {
      list.push(value);

      // keep last 50 values only
      if (list.length > 50) {
        list = list.slice(-50);
      }

      localStorage.setItem(key, JSON.stringify(list));
    }
  }

  function getSuggestions(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
  }




  // ---------- VEHICLE ----------
  const addVehicle = () => {
    setVehicles([
      ...vehicles,
      {
        id: Date.now(),
        rowDate: date,
        truckNo: "",
        containerNo: "",
        from: "",
        to: "",
        mtYard: "",
        kgs: "",
        size: "",
        note: "",
        advance: "",
        mt: "",
        kata: "",
        rate: "",
        charges: [],
        expanded: true,
      },
    ]);
  };

  const updateVehicle = (id, field, value) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, [field]: value } : v
      )
    );
  };

  const addCharge = (id) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === id && v.charges.length < 5
          ? { ...v, charges: [...v.charges, { label: "", amount: "" }] }
          : v
      )
    );
  };

  const updateCharge = (vehicleId, index, field, value) => {
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === vehicleId) {
          const updated = [...v.charges];
          updated[index][field] = value;
          return { ...v, charges: updated };
        }
        return v;
      })
    );
  };

  const removeCharge = (vehicleId, index) => {
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === vehicleId) {
          return {
            ...v,
            charges: v.charges.filter((_, i) => i !== index),
          };
        }
        return v;
      })
    );
  };

  const toggleExpand = (id) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, expanded: !v.expanded } : v
      )
    );
  };

  const removeVehicle = (id) => {
    if (window.confirm("Remove this vehicle?")) {
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    }
  };

  const getRowTotal = (v) => {
    const chargeTotal = v.charges.reduce(
      (sum, c) => sum + Number(c.amount || 0),
      0
    );
    return (
      Number(v.rate || 0) +
      Number(v.kata || 0) +
      Number(v.mt || 0) +
      chargeTotal
    );
  };

  const grandTotal = vehicles.reduce(
    (sum, v) => sum + getRowTotal(v),
    0
  );

  const totalAdvance = vehicles.reduce(
    (sum, v) => sum + Number(v.advance || 0),
    0
  );

  const netBalance = grandTotal - totalAdvance;


  const handleReset = () => {

    if (!window.confirm("Clear all entered data?")) return;

    setOwner("SW");
    setDate("");
    setBillNo("");
    setMsName("");
    setAccount("");
    setJobNo("");
    setVehicles([]);

  };


  const saveBillToFirebase = async (fileId) => {
    try {

      let finalBillNo = billNo;

      if (!finalBillNo || finalBillNo.trim() === "") {
        toast.error("Enter bill number ❌");
        return;
      }

      // 🔍 Duplicate check (ONLY NUMBER PART)
      const newBillNumber = parseInt(finalBillNo.split(" ")[0]);

      const snapshot = await getDocs(collection(db, "bills"));

      let isDuplicate = false;

      snapshot.forEach(doc => {
        const existing = doc.data().billNo;
        const existingNumber = parseInt(existing.split(" ")[0]);

        if (existingNumber === newBillNumber && doc.data().owner === owner) {
          isDuplicate = true;
        }
      });

      if (isDuplicate) {
        toast.error("Bill number already exists ❌");
        return;
      }

      // ✅ Save as it is
      await addDoc(collection(db, "bills"), {
        billNo: finalBillNo,
        owner,
        date,
        msName,
        account,
        netBalance,

        paymentDate: "",     // ✅ NEW
        paymentMode: "",     // ✅ NEW
        paidAmount: 0,

        status: "UNPAID",

        fileId,

        createdAt: new Date()
      });

      toast.success("Saved ✅");

    } catch (error) {
      console.error("Save error:", error);
      toast.error("Save failed ❌");
    }
  };

  const handleDownloadPDF = async () => {
    let fileId = null;   // ✅ ADD THIS LINE

    try {

      // SAVE AUTOSUGGEST VALUES
      saveFieldValue("msList", msName);
      saveFieldValue("acList", account);

      vehicles.forEach(v => {
        saveFieldValue("truckList", v.truckNo);
        saveFieldValue("fromList", v.from);
        saveFieldValue("toList", v.to);
        saveFieldValue("yardList", v.mtYard);
        saveFieldValue("noteList", v.note);
      });

  

      // 🔥 ADD THIS (MISSING PART)
      //const response = await fetch("http://localhost:5000/generate-pdf", {
      const response = await fetch("https://transport-v2.onrender.com/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner,
          billNo,
          date,
          msName,
          account,
          jobNo,
          vehicles: vehicles.map(v => ({
            ...v,
            charges: v.charges.map(c => ({
              label:
                c.label === "OTHER"
                  ? (c.customLabel && c.customLabel.trim() !== ""
                    ? c.customLabel
                    : "OTHER")
                  : (c.label || "CHARGE"),
              amount: Number(c.amount || 0)
            })),
            total: getRowTotal(v)
          })),
          grandTotal,
          totalAdvance,
          netBalance,
        }),
      });

      if (!response.ok) {
        throw new Error("PDF failed");
      }

      const result = await response.json();
      fileId = result.fileId;

      console.log("✅ PDF generated + uploaded to Drive");

    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast.error("Failed to generate or upload bill");
    }

    return fileId;
  };







  return (
    <div className="container">

      <div className="flying-bill">📄</div>


      <div className="floating-bar">

        <button
        className="ledger-btn"
          onClick={() => window.open("/ledger", "_blank")}>
          Ledger
        </button>

        <button className="reset-btn" onClick={() => window.location.reload()} title="Reset Form">
          <FiRefreshCw />
        </button>




        <button
          className="add-btn"
          onClick={() => {
            const btn = document.querySelector(".add-btn");
            btn.classList.add("engine-start");

            setTimeout(() => {
              btn.classList.remove("engine-start");
            }, 600);

            addVehicle();
          }}
        >
          <span className="key-icon">🔑</span>
          New Vehicle
          <span className="smoke"></span>
        </button>




        <button
          className="save-btn"
          onClick={async () => {

            const bill = document.querySelector(".flying-bill");

            if (bill) {
              bill.classList.add("fly");

              setTimeout(() => {
                bill.classList.remove("fly");
              }, 1000);
            }


            // 🔥 STEP 1: VALIDATE FIRST
            let finalBillNo = billNo;

            if (!finalBillNo || finalBillNo.trim() === "") {
              toast.error("Enter bill number ❌");
              return;
            }

            // 🔍 Duplicate check (same logic from Issue 1)
            const newBillNumber = parseInt(finalBillNo.split(" ")[0]);

            const snapshot = await getDocs(collection(db, "bills"));

            let isDuplicate = false;

            snapshot.forEach(doc => {
              const existing = doc.data().billNo;
              const existingNumber = parseInt(existing.split(" ")[0]);

              if (existingNumber === newBillNumber && doc.data().owner === owner) {
                isDuplicate = true;
              }
            });

            if (isDuplicate) {
              toast.error("Bill number already exists ❌");
              return;
            }

            // 🔥 STEP 2: GENERATE PDF ONLY IF VALID
            const fileId = await handleDownloadPDF();

            if (!fileId) {
              toast.error("PDF failed ❌");
              return;
            }

            // 🔥 STEP 3: SAVE TO FIREBASE
            await saveBillToFirebase(fileId);





          }}
        >
          🖨 Save
        </button>








      </div>








      {/* PRINT INVOICE LAYOUT */}
      <div className="print-invoice">

        <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
          {owner === "SG" ? "SG Transport" : "Siddheshwar Transport"}
        </h2>
        <div className="print-company">
          <div>Address: Your Company Address Here</div>
          <div>Contact: 9876543210</div>
          <div>Email: example@email.com</div>
        </div>

        <div className="print-header">
          <div><strong>Bill No:</strong> {billNo}</div>
          <div><strong>Date:</strong> {date}</div>
          <div><strong>M/s:</strong> {msName}</div>
          <div><strong>A/c:</strong> {account}</div>

          <div><strong>JOB NO:</strong> {jobNo}</div>
        </div>





        <div className="print-vehicles">
          {vehicles.map((v, index) => (
            <div key={index} className="vehicle-block">

              {/* LEFT */}
              <div className="vehicle-left">
                <div><strong>Date:</strong> {v.rowDate}</div>
                <div><strong>Truck No:</strong> {v.truckNo}</div>
              </div>

              {/* MIDDLE */}
              <div className="vehicle-middle">
                <div><strong>Container No:</strong> {v.containerNo}</div>
                <div><strong>Route:</strong> {v.from} → {v.to}</div>
                <div><strong>MT YARD:</strong> {v.mtYard}</div>
                <div><strong>Weight:</strong> {v.kgs}</div>
                <div><strong>Size:</strong> {v.size}</div>
              </div>

              {/* RIGHT */}
              <div className="vehicle-right">

                <div className="finance-row bold">
                  <span>Advance:</span>
                  <span>₹{v.advance}</span>
                </div>



                <div className="finance-row charges-label">
                  <span>Charges:</span>
                  <span></span>
                </div>

                {v.charges.map((c, i) => (
                  <div key={i} className="finance-row">
                    <span>{c.label}:</span>
                    <span>₹{c.amount}</span>
                  </div>
                ))}

                <div className="rate-dotted-line"></div>

                <div className="finance-row">
                  <span>Rate:</span>
                  <span>₹{v.rate}</span>
                </div>

                <div className="rate-solid-line"></div>

                <div className="finance-row total-row">
                  <span>Vehicle Total:</span>
                  <span>₹{getRowTotal(v)}</span>
                </div>

              </div>

              <div className="vehicle-separator"></div>
            </div>
          ))}

        </div>




        <div className="print-footer-summary">
          <div className="footer-row">
            <span>Grand Total:</span>
            <span>₹{grandTotal}</span>
          </div>
          <div className="footer-row">
            <span>Total Advance:</span>
            <span>₹{totalAdvance}</span>
          </div>
          <div className="footer-row net-balance">
            <span>Net Balance:</span>
            <span>₹{netBalance}</span>
          </div>
        </div>



      </div>


      {/* HEADER */}
      <div className="header-grid">





        <div className="field">


          <div className="company-slider">

            <div
              className={`slider-bg ${owner === "SG" ? "right" : "left"}`}
            ></div>

            <div
              className={`truck ${owner === "SG" ? "move-right" : "move-left"}`}
            >
              🚚
            </div>

            <button
              type="button"
              className="slider-btn"
              onClick={() => setOwner("SW")}
            >
              Laxman
            </button>

            <button
              type="button"
              className="slider-btn"
              onClick={() => setOwner("SG")}
            >
              Saurabh
            </button>

          </div>
        </div>



















        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="field">
          <label>Bill No</label>
          <input value={billNo} onChange={(e) => setBillNo(e.target.value)} />
        </div>

        <div className="field">
          <label>M/s</label>
          <input
            autoComplete="on"
            list="msList"
            value={msName}
            onChange={(e) => setMsName(e.target.value.toUpperCase())}
            onInput={(e) => setMsName(e.target.value.toUpperCase())}
          />

          <datalist id="msList">
            {getSuggestions("msList").map((v, i) => (
              <option key={i} value={v} />
            ))}
          </datalist>
        </div>

        <div className="field">
          <label>A/c</label>
          <input
            autoComplete="on"
            list="acList"
            value={account}
            onChange={(e) => setAccount(e.target.value.toUpperCase())}
            onInput={(e) => setAccount(e.target.value.toUpperCase())}
          />

          <datalist id="acList">
            {getSuggestions("acList").map((v, i) => (
              <option key={i} value={v} />
            ))}
          </datalist>
        </div>

        <div className="field">
          <label>JOB NO</label>
          <input value={jobNo} onChange={(e) => setJobNo(e.target.value)} />
        </div>
      </div>

      {/* <div style={{ marginTop: "25px" }}>
        <button className="primary-btn" onClick={addVehicle}>
          ➕ Add Vehicle
        </button>
      </div> */}

      {vehicles.map((v, index) => (
        <div key={v.id} className="vehicle-card">
          <div className="vehicle-header">
            <strong>SR {index + 1}</strong>
            <span>{v.truckNo || "No Truck No"}</span>
            <span>₹{getRowTotal(v)}</span>
            <div>
              <button onClick={() => toggleExpand(v.id)}>
                {v.expanded ? "▲" : "▼"}
              </button>
              <button onClick={() => removeVehicle(v.id)}>🗑</button>
            </div>
          </div>

          {v.expanded && (
            <>
              {/* BASIC GRID */}
              <div className="vehicle-body">

                <div className="field">
                  <label>Date</label>
                  <input type="date" value={v.rowDate}
                    onChange={(e) => updateVehicle(v.id, "rowDate", e.target.value)} />
                </div>

                <div className="field">
                  <label>Truck No</label>
                  <input
                    autoComplete="on"
                    list="truckList"
                    value={v.truckNo}
                    onChange={(e) => updateVehicle(v.id, "truckNo", e.target.value.toUpperCase())}
                    onInput={(e) => updateVehicle(v.id, "truckNo", e.target.value.toUpperCase())}
                  />

                  <datalist id="truckList">
                    {getSuggestions("truckList").map((v, i) => (
                      <option key={i} value={v} />
                    ))}
                  </datalist>
                </div>

                <div className="field">
                  <label>Container No</label>
                  <input value={v.containerNo}
                    onChange={(e) => updateVehicle(v.id, "containerNo", e.target.value.toUpperCase())} />
                </div>

                <div className="field">
                  <label>From</label>
                  <input
                    autoComplete="on"
                    list="fromList"
                    value={v.from}
                    onChange={(e) => updateVehicle(v.id, "from", e.target.value.toUpperCase())}
                    onInput={(e) => updateVehicle(v.id, "from", e.target.value.toUpperCase())}
                  />

                  <datalist id="fromList">
                    {getSuggestions("fromList").map((v, i) => (
                      <option key={i} value={v} />
                    ))}
                  </datalist>
                </div>

                <div className="field">
                  <label>To</label>
                  <input
                    autoComplete="on"
                    list="toList"
                    value={v.to}
                    onChange={(e) => updateVehicle(v.id, "to", e.target.value.toUpperCase())}
                    onInput={(e) => updateVehicle(v.id, "to", e.target.value.toUpperCase())}
                  />

                  <datalist id="toList">
                    {getSuggestions("toList").map((v, i) => (
                      <option key={i} value={v} />
                    ))}
                  </datalist>
                </div>

                <div className="field">
                  <label>MT YARD</label>
                  <input
                    autoComplete="on"
                    list="yardList"
                    value={v.mtYard}
                    onChange={(e) => updateVehicle(v.id, "mtYard", e.target.value.toUpperCase())}
                    onInput={(e) => updateVehicle(v.id, "mtYard", e.target.value.toUpperCase())}
                  />

                  <datalist id="yardList">
                    {getSuggestions("yardList").map((v, i) => (
                      <option key={i} value={v} />
                    ))}
                  </datalist>
                </div>

                <div className="field">
                  <label>KGS</label>
                  <input value={v.kgs}
                    onChange={(e) => updateVehicle(v.id, "kgs", e.target.value)} />
                </div>

                <div className="field">
                  <label>Size</label>
                  <input
                    autoComplete="on"
                    value={v.size}
                    onChange={(e) => updateVehicle(v.id, "size", e.target.value)}
                    onInput={(e) => updateVehicle(v.id, "size", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Note</label>
                  <input
                    autoComplete="on"
                    list="noteList"
                    value={v.note}
                    onChange={(e) => updateVehicle(v.id, "note", e.target.value.toUpperCase())}
                    onInput={(e) => updateVehicle(v.id, "note", e.target.value.toUpperCase())}
                  />

                  <datalist id="noteList">
                    {(JSON.parse(localStorage.getItem("noteList")) || []).map((n, i) => (
                      <option key={i} value={n} />
                    ))}
                  </datalist>
                </div>

                <div className="field">
                  <label>Advance</label>
                  <input
                    type="number"
                    value={v.advance}
                    onChange={(e) => updateVehicle(v.id, "advance", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>MT</label>
                  <input
                    type="number"
                    value={v.mt}
                    onChange={(e) => updateVehicle(v.id, "mt", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>KATA</label>
                  <input
                    type="number"
                    value={v.kata}
                    onChange={(e) => updateVehicle(v.id, "kata", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Rate</label>
                  <input
                    type="number"
                    value={v.rate}
                    onChange={(e) => updateVehicle(v.id, "rate", e.target.value)}
                  />
                </div>

              </div>

              {/* CHARGES */}
              <div className="charges-section">
                <h4>Charges</h4>

                {v.charges.map((charge, i) => (
                  <div key={i} className="charge-row">

                    {/* Dropdown */}
                    <select
                      value={charge.label}
                      onChange={(e) =>
                        updateCharge(v.id, i, "label", e.target.value)
                      }
                    >
                      <option value="">Select</option>
                      {chargeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>

                    {/* Custom Label Input (only when OTHER selected) */}
                    {charge.label === "OTHER" && (
                      <input
                        type="text"
                        placeholder="Enter Charge Name"
                        value={charge.customLabel || ""}
                        onChange={(e) =>
                          updateCharge(
                            v.id,
                            i,
                            "customLabel",
                            e.target.value.toUpperCase()
                          )
                        }
                      />
                    )}

                    {/* Amount Input */}
                    <input
                      type="number"
                      value={charge.amount}
                      onChange={(e) =>
                        updateCharge(v.id, i, "amount", e.target.value)
                      }
                    />

                    {/* Remove Button */}
                    <button
                      className="remove-charge-btn"
                      onClick={() => removeCharge(v.id, i)}
                    >
                      ✖
                    </button>
                  </div>
                ))}

                {v.charges.length < 5 && (
                  <button
                    className="add-charge-btn"
                    onClick={() => addCharge(v.id)}
                  >
                    ➕ Add Charge
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      {vehicles.length > 0 && (
        <div className="summary-card">

          <h2>Grand Total: ₹{grandTotal}</h2>
          <h3>Total Advance: ₹{totalAdvance}</h3>
          <h2 style={{ color: netBalance < 0 ? "red" : "white" }}>
            Net Balance: ₹{netBalance}
          </h2>
        </div>
      )}
    </div>
  );
}


export default Transport;
