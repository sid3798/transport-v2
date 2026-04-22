import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { collection, getDocs } from "firebase/firestore";

import { doc, updateDoc, deleteDoc } from "firebase/firestore";



function Ledger() {

    const [selectedBill, setSelectedBill] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const [bills, setBills] = useState([]);
    const [search, setSearch] = useState("");

    const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

    const [sortConfig, setSortConfig] = useState({
        key: "billNo",
        direction: "desc"
    });

    const handleSort = (key) => {
        let direction = "asc";

        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }

        setSortConfig({ key, direction });
    };

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

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


    // date formatting helper

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
    // date formatting helper

    const [ownerFilter, setOwnerFilter] = useState("ALL");

    // 🔍 Filter by party name
    const filteredBills = bills.filter(b => {

        const searchText = search.toLowerCase();

        // 🔥 Combine all fields into one string
        const fullText = `
    ${b.billNo}
    ${b.msName}
    ${b.account}
    ${b.owner}
    ${b.status}
    ${b.paymentMode}
    ${b.netBalance}
    ${b.paidAmount}
    ${formatDate(b.date)}
    ${b.paymentDate ? formatDate(b.paymentDate) : ""}
  `.toLowerCase();

        // 🔍 search match
        const matchSearch = fullText.includes(searchText);

        // 📅 date filter
        const billDate = new Date(b.date);

        const matchFrom = fromDate ? billDate >= new Date(fromDate) : true;
        const matchTo = toDate ? billDate <= new Date(toDate) : true;

        // 🔥 status filter
        const matchStatus = showUnpaidOnly
            ? b.status !== "PAID"
            : true;

        const matchOwner =
            ownerFilter === "ALL" ? true : b.owner === ownerFilter;

        return matchSearch && matchFrom && matchTo && matchStatus && matchOwner;
    });




    //// sorting
    const sortedBills = [...filteredBills].sort((a, b) => {

        if (!sortConfig.key) return 0;

        let valA = a[sortConfig.key] || "";
        let valB = b[sortConfig.key] || "";

        // 👉 If sorting by DATE
        if (sortConfig.key === "date" || sortConfig.key === "paymentDate") {
            valA = new Date(valA);
            valB = new Date(valB);
        }

        // 👉 If sorting by BILL NO (like "1 vishal")
        if (sortConfig.key === "billNo") {
            valA = parseInt(valA.split(" ")[0]) || 0;
            valB = parseInt(valB.split(" ")[0]) || 0;
        }

        // 👉 Normal comparison
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;

        return 0;
    });

    //// sorting



    return (
        <div className="ledger-container">

            <h2 className="ledger-title">📋 Bill Ledger</h2>

            <div className="filters-container">

                {/* 🔍 Search */}
                <input
                    className="filter-input search-box"
                    type="text"
                    placeholder="Search anything..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                {/* owner filter */}
                <div className="owner-filter">

                    <select
                        className="filter-input"
                        value={ownerFilter}
                        onChange={(e) => setOwnerFilter(e.target.value)}
                    >
                        <option value="ALL">All</option>
                        <option value="SG">SG</option>
                        <option value="SW">SW</option>
                    </select>
                </div>
                {/* 📅 Date Filters */}
                <div className="date-group">
                    <input
                        type="date"
                        className="filter-input"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                    />

                    <span>to</span>

                    <input
                        type="date"
                        className="filter-input"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                    />

                    <button
                        className="clear-btn"
                        onClick={() => {
                            setFromDate("");
                            setToDate("");
                        }}
                    >
                        Clear
                    </button>
                </div>

                {/* ✅ Checkbox */}
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={showUnpaidOnly}
                        onChange={(e) => setShowUnpaidOnly(e.target.checked)}
                    />
                    Unpaid Only
                </label>

            </div>



            {/* 📊 Table */}
            <div className="ledger-table-wrapper">
                <table className="ledger-table">

                    <thead>
                        <tr>
                            <th>Print</th>

                            <th>Owner</th>
                            <th onClick={() => handleSort("billNo")}>
                                Bill No {sortConfig.key === "billNo" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </th><th onClick={() => handleSort("date")}>
                                Date {sortConfig.key === "date" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th onClick={() => handleSort("msName")}>
                                M/s {sortConfig.key === "msName" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </th>

                            <th onClick={() => handleSort("account")}>
                                A/c {sortConfig.key === "account" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th>Net Balance</th>
                            <th onClick={() => handleSort("status")}>
                                Status {sortConfig.key === "status" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </th>


                            <th onClick={() => handleSort("paymentDate")}>
                                Payment Date {sortConfig.key === "paymentDate" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th>Mode</th>
                            <th>Paid Amount</th>

                        </tr>
                    </thead>

                    <tbody>
                        {sortedBills.map((bill) => (
                            <tr


                                key={bill.id}
                                className="ledger-row fade-in"
                                onClick={() => {
                                    setSelectedBill(bill);
                                    setShowModal(true);
                                }}

                                style={{ cursor: "pointer" }}
                            >
                                <td>
                                    <button
                                        className={`print-btn ${!bill.fileId ? "disabled" : ""}`}
                                        onClick={(e) => {
                                            e.stopPropagation();

                                            if (!bill.fileId) {
                                                alert("PDF not available");
                                                return;
                                            }

                                            const url = `https://drive.google.com/file/d/${bill.fileId}/view`;
                                            window.open(url, "_blank");
                                        }}
                                    >
                                        🖨 Print
                                    </button>
                                </td>

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