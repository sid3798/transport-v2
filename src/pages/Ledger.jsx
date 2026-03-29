import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { collection, getDocs } from "firebase/firestore";

import { doc, updateDoc, deleteDoc } from "firebase/firestore";



function Ledger() {

    const [selectedBill, setSelectedBill] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const [bills, setBills] = useState([]);
    const [search, setSearch] = useState("");

    // 🔥 Fetch all bills
    useEffect(() => {
        const fetchBills = async () => {
            const snapshot = await getDocs(collection(db, "bills"));
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBills(data);
        };

        fetchBills();
    }, []);

    // 🔍 Filter by party name
    const filteredBills = bills.filter(b =>
        b.msName?.toLowerCase().includes(search.toLowerCase())
    );


    const formatDate = (dateStr) => {
  if (!dateStr) return "-";

  const date = new Date(dateStr);

  const day = date.getDate();
  const year = date.getFullYear();

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const month = monthNames[date.getMonth()];

  return `${day} ${month} ${year}`;
};

    return (
        <div className="ledger-container">

            <h2 className="ledger-title">📋 Bill Ledger</h2>

            {/* 🔍 Search */}
            <input
                className="ledger-search"
                type="text"
                placeholder="Search by party..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            {/* 📊 Table */}
            <div className="ledger-table-wrapper">
                <table className="ledger-table">

                    <thead>
                        <tr>
                            <th>Owner</th>
                            <th>Bill No</th>
                            <th>Date</th>
                            <th>M/s Name</th>
                            <th>A/c</th>
                            <th>Net Balance</th>
                            <th>Status</th>


                            <th>Payment Date</th>
                            <th>Mode</th>
                            <th>Paid Amount</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredBills.map((bill) => (
                            <tr
                                key={bill.id}
                                onClick={() => {
                                    setSelectedBill(bill);
                                    setShowModal(true);
                                }}
                                style={{ cursor: "pointer" }}
                            >
                                <td>
                                    <span className={`owner-tag ${bill.owner === "SG" ? "sg" : "sw"}`}>
                                        {bill.owner}
                                    </span>
                                </td>

                                <td>{bill.billNo}</td>
                                <td>{formatDate(bill.date)}</td>
                                <td>{bill.msName}</td>
                                <td>{bill.account}</td>

                                <td className="amount">
                                    ₹{bill.netBalance}
                                </td>

                                <td>
                                    <span className={
                                        bill.status === "PAID" ? "status paid" : "status unpaid"
                                    }>
                                        {bill.status || "UNPAID"}
                                    </span>
                                </td>

                                <td>{bill.paymentDate || "-"}</td>
                                <td>{bill.paymentMode || "-"}</td>
                                <td className="amount">₹{bill.paidAmount || 0}</td>

                            </tr>
                        ))}
                    </tbody>

                </table>

                {showModal && selectedBill && (
                    <div className="modal-overlay">

                        <div className="modal">

                            <h3>Edit Bill</h3>

                            <label>Bill No</label>
                            <input
                                value={selectedBill.billNo}
                                onChange={(e) =>
                                    setSelectedBill({ ...selectedBill, billNo: e.target.value })
                                }
                            />

                            <label>Date</label>
                            <input
                                type="date"
                                value={selectedBill.date}
                                onChange={(e) =>
                                    setSelectedBill({ ...selectedBill, date: e.target.value })
                                }
                            />

                            <label>M/s</label>
                            <input
                                value={selectedBill.msName}
                                onChange={(e) =>
                                    setSelectedBill({ ...selectedBill, msName: e.target.value })
                                }
                            />

                            <label>A/c</label>
                            <input
                                value={selectedBill.account}
                                onChange={(e) =>
                                    setSelectedBill({ ...selectedBill, account: e.target.value })
                                }
                            />

                            <label>Net Balance</label>
                            <input
                                value={selectedBill.netBalance}
                                disabled
                            />

                            <label>Status</label>
                            <select
                                value={selectedBill.status || "UNPAID"}
                                onChange={(e) =>
                                    setSelectedBill({
                                        ...selectedBill,
                                        status: e.target.value
                                    })
                                }
                            >
                                <option value="UNPAID">UNPAID</option>
                                <option value="PAID">PAID</option>
                            </select>

                            <label>Payment Date</label>
                            <input
                                type="date"
                                value={selectedBill.paymentDate || ""}
                                onChange={(e) =>
                                    setSelectedBill({ ...selectedBill, paymentDate: e.target.value })
                                }
                            />

                            <label>Payment Mode</label>
                            <input
                                value={selectedBill.paymentMode || ""}
                                onChange={(e) =>
                                    setSelectedBill({ ...selectedBill, paymentMode: e.target.value })
                                }
                            />

                            <label>Paid Amount</label>
                            <input
                                type="number"
                                value={selectedBill.paidAmount || ""}
                                onChange={(e) =>
                                    setSelectedBill({
                                        ...selectedBill,
                                        paidAmount: e.target.value === "" ? "" : Number(e.target.value)
                                    })
                                }
                            />

                            {/* 🔥 ACTION BUTTONS */}
                            <div className="modal-actions">

                                <button
                                    className="save-btn"
                                    onClick={async () => {
                                        try {
                                            const ref = doc(db, "bills", selectedBill.id);

                                            await updateDoc(ref, selectedBill);

                                            setShowModal(false);
                                            alert("Updated ✅");

                                            window.location.reload(); // simple refresh
                                        } catch (err) {
                                            console.error(err);
                                        }
                                    }}
                                >
                                    Save
                                </button>

                                <button
                                    className="delete-btn"
                                    onClick={async () => {
                                        if (!window.confirm("Delete this bill?")) return;

                                        try {
                                            const ref = doc(db, "bills", selectedBill.id);
                                            await deleteDoc(ref);

                                            setShowModal(false);
                                            alert("Deleted ❌");

                                            window.location.reload();
                                        } catch (err) {
                                            console.error(err);
                                        }
                                    }}
                                >
                                    Delete
                                </button>

                                <button
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>

                            </div>

                        </div>

                    </div>
                )}

            </div>

        </div>
    );
}



export default Ledger;